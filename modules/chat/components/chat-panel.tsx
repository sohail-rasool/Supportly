"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ArrowUp, Headset, Wrench } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { conversationKeys } from "@/modules/conversations/hooks/useConversation"
import { useChatStream } from "@/modules/messages/hooks/use-chat-stream"
import {
  messageKeys,
  useMessages,
  type ChatMessage,
} from "@/modules/messages/hooks/userMessages"
import { useOpenTicket } from "@/modules/tickets/hooks/use-open-ticket"

/** Messages + composer for one conversation, with streamed AI replies. */
export function ChatPanel({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient()
  const queryKey = messageKeys.list(conversationId)
  const { data: messages, isLoading } = useMessages(conversationId)
  const { data: openTicket } = useOpenTicket(conversationId)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Refetch saved messages (replaces the optimistic one) and re-sort the sidebar.
  const syncMessages = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: conversationKeys.all }),
    ])

  const {
    sendMessage,
    isStreaming,
    streamingContent,
    streamingAgentName,
    streamingTools,
    lockedNotice,
  } = useChatStream(syncMessages)

  async function send(content: string) {
    const trimmed = content.trim()
    if (!trimmed || isStreaming) return
    setSendError(null)

    // Show the user's message right away; the server saves it.
    await queryClient.cancelQueries({ queryKey })
    const now = new Date()
    const optimistic: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      conversationId,
      role: "USER",
      content: trimmed,
      agentName: null,
      toolsUsed: [],
      createdAt: now,
      updatedAt: now,
    }
    queryClient.setQueryData<ChatMessage[]>(queryKey, (old = []) => [...old, optimistic])

    try {
      await sendMessage({ conversationId, content: trimmed })
    } catch (error) {
      setSendError(error instanceof Error && error.message ? error.message : "Message failed to send.")
      // Drop the optimistic message unless the server already saved it.
      await syncMessages()
    }
  }

  // Keep the newest content in view, including while the reply streams in.
  const count = messages?.length ?? 0
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [count, streamingContent, streamingTools.length, isStreaming])

  const escalated = !!openTicket || !!lockedNotice

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-6">
          {isLoading ? (
            <MessagesSkeleton />
          ) : count === 0 && !isStreaming ? (
            <p className="m-auto text-sm text-muted-foreground">
              Ask a question about billing, shipping or a technical issue
            </p>
          ) : (
            messages!.map((message) =>
              message.role === "USER" ? (
                <UserMessage key={message.id} message={message} />
              ) : (
                <AssistantMessage
                  key={message.id}
                  agentName={message.agentName}
                  tools={message.toolsUsed}
                  content={message.content}
                />
              )
            )
          )}

          {/* The reply being streamed. Once done it's saved and arrives with the messages. */}
          {isStreaming && (
            <AssistantMessage
              agentName={streamingAgentName}
              tools={streamingTools}
              content={streamingContent}
              streaming
            />
          )}

          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/80 px-4 py-4 backdrop-blur">
        {escalated && (
          <Alert className="mx-auto mb-3 max-w-3xl">
            <Headset />
            <AlertTitle>Escalated to a human agent</AlertTitle>
            <AlertDescription>
              {openTicket
                ? `Ticket ${openTicket.id} · ${formatEnum(openTicket.priority)} priority · ${formatEnum(openTicket.status)}. `
                : ""}
              The AI assistant is paused. Your messages are saved for the support team.
            </AlertDescription>
          </Alert>
        )}
        <Composer
          // Reset the draft when switching chats.
          key={conversationId}
          disabled={isStreaming}
          onSend={send}
        />
        {sendError && (
          <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs text-destructive">
            {sendError}
          </p>
        )}
      </div>
    </div>
  )
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <Message align="end">
      <MessageContent>
        <Bubble
          align="end"
          variant="default"
          // Optimistic messages are slightly faded until saved.
          className={message.id.startsWith("temp-") ? "opacity-70" : undefined}
        >
          <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
        </Bubble>
      </MessageContent>
    </Message>
  )
}

function AssistantMessage({
  agentName,
  tools,
  content,
  streaming = false,
}: {
  agentName: string | null
  tools: string[]
  content: string
  streaming?: boolean
}) {
  return (
    <Message align="start" aria-busy={streaming || undefined}>
      <MessageContent>
        {agentName && <MessageHeader>{agentName}</MessageHeader>}
        <Bubble align="start" variant="muted">
          <BubbleContent className="whitespace-pre-wrap">
            {content ? (
              content
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Spinner className="size-3.5" />
                {tools.length > 0 ? "Working…" : "Thinking…"}
              </span>
            )}
          </BubbleContent>
        </Bubble>
        {tools.length > 0 && (
          <MessageFooter className="flex-wrap gap-1.5">
            {tools.map((tool) => (
              <Badge key={tool} variant="outline">
                <Wrench data-icon="inline-start" />
                {formatToolName(tool)}
              </Badge>
            ))}
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  )
}

function Composer({
  onSend,
  disabled,
}: {
  onSend: (content: string) => void
  disabled: boolean
}) {
  const [draft, setDraft] = useState("")
  const canSend = draft.trim().length > 0 && !disabled

  function send() {
    if (!canSend) return
    onSend(draft)
    setDraft("")
  }

  return (
    <form
      className="mx-auto w-full max-w-3xl"
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          autoFocus
          aria-label="Message"
          placeholder="Send a message..."
          rows={1}
          className="max-h-48 min-h-11"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter adds a new line. Ignore while composing
            // with an IME (e.g. Japanese/Chinese input).
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
        />
        <InputGroupAddon align="inline-end" className="self-end">
          <InputGroupButton
            type="submit"
            size="icon-sm"
            variant="default"
            className="rounded-full"
            disabled={!canSend}
          >
            {disabled ? <Spinner /> : <ArrowUp />}
            <span className="sr-only">{disabled ? "Waiting for reply" : "Send"}</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Enter to send · Shift + Enter for a new line
      </p>
    </form>
  )
}

function MessagesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-2/5 self-end rounded-3xl" />
      <Skeleton className="h-16 w-3/5 rounded-3xl" />
      <Skeleton className="h-10 w-1/3 self-end rounded-3xl" />
    </div>
  )
}

/** "create_human_escalation_ticket" → "Create human escalation ticket" */
function formatToolName(name: string) {
  const words = name.replace(/[_-]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** "IN_PROGRESS" → "In progress" */
function formatEnum(value: string) {
  return formatToolName(value.toLowerCase())
}
