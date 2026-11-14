"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useUpdateConversation } from "@/modules/conversations/hooks/useConversation"

type Props = {
  conversation: { id: string; title: string } | null
  onOpenChange: (open: boolean) => void
}

export function RenameConversationDialog({ conversation, onOpenChange }: Props) {
  return (
    <Dialog open={!!conversation} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so the input resets to the current title each time it opens. */}
        {conversation && (
          <RenameForm
            key={conversation.id}
            conversation={conversation}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  conversation,
  onDone,
}: {
  conversation: { id: string; title: string }
  onDone: () => void
}) {
  const [title, setTitle] = useState(conversation.title)
  const updateConversation = useUpdateConversation()
  const trimmed = title.trim()

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!trimmed) return
    if (trimmed !== conversation.title) {
      // Optimistic: the sidebar updates immediately.
      updateConversation.mutate({ id: conversation.id, title: trimmed })
    }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>Rename chat</DialogTitle>
      </DialogHeader>
      <Input
        autoFocus
        aria-label="Chat title"
        value={title}
        maxLength={100}
        onChange={(event) => setTitle(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
      />
      <DialogFooter>
        <Button type="submit" disabled={!trimmed}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
