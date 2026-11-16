import { assistant, user, type AgentInputItem } from "@openai/agents";
import type { Message } from "@/lib/generated/prisma/client";

/**
 * Converts saved database messages into the format the OpenAI Agents SDK expects.
 */
export function messagesToAgentInput(messages: Message[]): AgentInputItem[] {
  return messages.map((message) => {
    if (message.role === "USER") {
      return user(message.content);
    }

    return assistant(message.content);
  });
}
