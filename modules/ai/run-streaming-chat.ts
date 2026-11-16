import {
  InputGuardrailTripwireTriggered,
  OutputGuardrailTripwireTriggered,
  run,
} from "@openai/agents";
import { prisma } from "@/lib/prisma";
import { triageAgent } from "./agents";
import type { SupportContext } from "./context";
import { getGuardrailUserMessage } from "./guardrails";
import { messagesToAgentInput } from "./messages-to-input";

type ChatStreamEvent =
  | { type: "agent"; name: string }
  | { type: "tool"; name: string }
  | { type: "text"; delta: string }
  | { type: "error"; message: string };

/** A user-safe explanation for a failed agent run. */
function getAiErrorMessage(error: unknown) {
  const status =
    error && typeof error === "object" && "status" in error
      ? (error as { status?: number }).status
      : undefined;

  if (status === 401) return "The AI service rejected our API key. Please contact support.";
  if (status === 429) return "The AI service is unavailable right now (quota or rate limit reached). Please try again later.";
  return "The assistant ran into a problem. Please try again.";
}

function getToolName(item: {
  type?: string;
  rawItem?: { type?: string; name?: string };
}) {
  if (
    item.type === "tool_call_item" &&
    item.rawItem?.type === "function_call" &&
    item.rawItem.name
  ) {
    return item.rawItem.name;
  }

  return null;
}

function encodeEvent(event: ChatStreamEvent) {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

async function saveUserMessage(conversationId: string, content: string) {
  await prisma.message.create({
    data: {
      conversationId,
      content,
      role: "USER",
    },
  });
}

async function saveAssistantMessage(
  conversationId: string,
  content: string,
  agentName: string | null,
  toolsUsed: string[],
) {
  await prisma.message.create({
    data: {
      conversationId,
      content,
      role: "ASSISTANT",
      agentName,
      toolsUsed,
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });
}

async function getConversationMessages(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

function isGuardrailError(error: unknown) {
  return (
    error instanceof InputGuardrailTripwireTriggered ||
    error instanceof OutputGuardrailTripwireTriggered
  );
}

/**
 * Saves the user message, runs the triage agent (with handoffs),
 * streams NDJSON events, then saves the full assistant message.
 */
export async function runStreamingSupportChat(
  conversationId: string,
  userMessage: string,
  context: SupportContext,
) {
  await saveUserMessage(conversationId, userMessage);

  const messages = await getConversationMessages(conversationId);

  let agentStream;
  try {
    agentStream = await run(triageAgent, messagesToAgentInput(messages), {
      stream: true,
      context,
    });
  } catch (error) {
    // Input guardrail can trip before streaming even starts.
    if (isGuardrailError(error)) {
      const reply = getGuardrailUserMessage(error);

      return new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(
            encodeEvent({ type: "agent", name: "Support Triage" }),
          );
          controller.enqueue(encodeEvent({ type: "text", delta: reply }));
          await saveAssistantMessage(
            conversationId,
            reply,
            "Support Triage",
            [],
          );
          controller.close();
        },
      });
    }

    console.error("[chat] agent run failed to start:", error);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encodeEvent({ type: "error", message: getAiErrorMessage(error) }),
        );
        controller.close();
      },
    });
  }

  let assistantReply = "";
  let activeAgentName: string | null = "Support Triage";
  const toolsUsed: string[] = [];

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (activeAgentName) {
          controller.enqueue(
            encodeEvent({ type: "agent", name: activeAgentName }),
          );
        }

        for await (const event of agentStream) {
          if (event.type === "agent_updated_stream_event") {
            activeAgentName = event.agent.name;
            controller.enqueue(
              encodeEvent({ type: "agent", name: activeAgentName }),
            );
          }

          if (
            event.type === "run_item_stream_event" &&
            event.name === "tool_called"
          ) {
            const toolName = getToolName(event.item);
            if (toolName && !toolsUsed.includes(toolName)) {
              toolsUsed.push(toolName);
              controller.enqueue(encodeEvent({ type: "tool", name: toolName }));
            }
          }

          if (
            event.type === "raw_model_stream_event" &&
            event.data.type === "output_text_delta"
          ) {
            const delta = event.data.delta;
            assistantReply += delta;
            controller.enqueue(encodeEvent({ type: "text", delta }));
          }
        }

        await agentStream.completed;

        await saveAssistantMessage(
          conversationId,
          assistantReply,
          activeAgentName,
          toolsUsed,
        );

        controller.close();
      } catch (error) {
        if (isGuardrailError(error)) {
          const reply = getGuardrailUserMessage(error);
          controller.enqueue(encodeEvent({ type: "text", delta: reply }));
          await saveAssistantMessage(
            conversationId,
            reply,
            activeAgentName,
            toolsUsed,
          );
          controller.close();
          return;
        }

        // Log the real cause (otherwise Next only shows "failed to pipe response")
        // and tell the client, instead of aborting the stream ("network error").
        console.error("[chat] agent run failed:", error);
        controller.enqueue(
          encodeEvent({ type: "error", message: getAiErrorMessage(error) }),
        );
        controller.close();
      }
    },
  });
}
