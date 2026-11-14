"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp } from "lucide-react"

import { Bubble, BubbleContent } from "@/components/ui/bubble"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group"
import { Message, MessageContent } from "@/components/ui/message"
import { Skeleton } from "@/components/ui/skeleton"
import { useCreateMessage, useMessages } from "@/modules/messages/hooks/userMessages"

/** Messages + composer for one conversation. */
export function ChatPanel({ conversationId }: { conversationId: string }) {
  const { data: messages, isLoading } = useMessages(conversationId)
  const createMessage = useCreateMessage(conversationId)
  const endRef = useRef<HTMLDivElement>(null)

  // Keep the newest message in view.
  const count = messages?.length ?? 0
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" })
  }, [count])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-4 py-6">
          {isLoading ? (
            <MessagesSkeleton />
          ) : count === 0 ? (
            <p className="m-auto text-sm text-muted-foreground">
              Send a message to start the chat
            </p>
          ) : (
            messages!.map((message) => {
              const isUser = message.role === "USER"
              return (
                <Message key={message.id} align={isUser ? "end" : "start"}>
                  <MessageContent>
                    <Bubble
                      align={isUser ? "end" : "start"}
                      variant={isUser ? "default" : "muted"}
                      // Optimistic messages are slightly faded until saved.
                      className={message.id.startsWith("temp-") ? "opacity-70" : undefined}
                    >
                      <BubbleContent className="whitespace-pre-wrap">
                        {message.content}
                      </BubbleContent>
                    </Bubble>
                  </MessageContent>
                </Message>
              )
            })
          )}
          <div ref={endRef} />
        </div>
      </div>

      <div className="shrink-0 border-t bg-background/80 px-4 py-4 backdrop-blur">
        <Composer
          // Reset the draft when switching chats.
          key={conversationId}
          onSend={(content) => createMessage.mutate(content)}
        />
        {createMessage.isError && (
          <p role="alert" className="mx-auto mt-2 max-w-3xl text-xs text-destructive">
            Message failed to send. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}

function Composer({ onSend }: { onSend: (content: string) => void }) {
  const [draft, setDraft] = useState("")
  const canSend = draft.trim().length > 0

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
            <ArrowUp />
            <span className="sr-only">Send</span>
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
