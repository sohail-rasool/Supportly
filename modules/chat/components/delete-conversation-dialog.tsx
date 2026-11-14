"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useDeleteConversation } from "@/modules/conversations/hooks/useConversation"

type Props = {
  conversation: { id: string; title: string } | null
  onOpenChange: (open: boolean) => void
  onDeleted: (id: string) => void
}

export function DeleteConversationDialog({ conversation, onOpenChange, onDeleted }: Props) {
  const deleteConversation = useDeleteConversation()

  function handleDelete() {
    if (!conversation) return
    // Optimistic: removed from the sidebar immediately, restored on failure.
    deleteConversation.mutate(conversation.id)
    onDeleted(conversation.id)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={!!conversation} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete chat?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{conversation?.title}&rdquo; and all its messages will be permanently
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
