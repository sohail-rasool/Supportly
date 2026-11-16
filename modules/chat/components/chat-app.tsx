"use client"

import { useState } from "react"
import { Menu, MessagesSquare, Plus, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  useConversations,
  useCreateConversation,
} from "@/modules/conversations/hooks/useConversation"
import { ChatPanel } from "./chat-panel"
import { ConversationSidebar, type ConversationSummary } from "./conversation-sidebar"
import { DeleteConversationDialog } from "./delete-conversation-dialog"
import { RenameConversationDialog } from "./rename-conversation-dialog"

export function ChatApp() {
  const { data: conversations, isLoading, isError, refetch, isRefetching } =
    useConversations()
  const createConversation = useCreateConversation()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [renaming, setRenaming] = useState<ConversationSummary | null>(null)
  const [deleting, setDeleting] = useState<ConversationSummary | null>(null)

  // Fall back to the most recent chat if nothing (or a deleted chat) is selected.
  const active =
    conversations?.find((c) => c.id === selectedId) ?? conversations?.[0] ?? null

  function select(id: string) {
    setSelectedId(id)
    setMobileNavOpen(false)
  }

  function create() {
    createConversation.mutate(undefined, {
      onSuccess: (conversation) => select(conversation.id),
    })
  }

  const sidebar = (
    <ConversationSidebar
      conversations={conversations}
      isLoading={isLoading}
      activeId={active?.id ?? null}
      isCreating={createConversation.isPending}
      createFailed={createConversation.isError}
      onSelect={select}
      onCreate={create}
      onRename={setRenaming}
      onDelete={setDeleting}
    />
  )

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r md:block">{sidebar}</aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Chats</SheetTitle>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu />
            <span className="sr-only">Open chats</span>
          </Button>
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {active?.title ?? "Supportly"}
            </h1>
          )}
        </header>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : isError ? (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TriangleAlert className="text-destructive" />
              </EmptyMedia>
              <EmptyTitle>Couldn&apos;t load your chats</EmptyTitle>
              <EmptyDescription>Something went wrong on our side. Please try again.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
                {isRefetching && <Spinner data-icon="inline-start" />}
                Retry
              </Button>
            </EmptyContent>
          </Empty>
        ) : active ? (
          // Keyed so streaming state never leaks between chats.
          <ChatPanel key={active.id} conversationId={active.id} />
        ) : (
          <Empty className="flex-1">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessagesSquare />
              </EmptyMedia>
              <EmptyTitle>Start your first conversation</EmptyTitle>
              <EmptyDescription>Create a new chat to begin messaging.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={create} disabled={createConversation.isPending}>
                {createConversation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Plus data-icon="inline-start" />
                )}
                New chat
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </main>

      <RenameConversationDialog
        conversation={renaming}
        onOpenChange={(open) => !open && setRenaming(null)}
      />
      <DeleteConversationDialog
        conversation={deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={(id) => {
          if (id === active?.id) setSelectedId(null)
        }}
      />
    </div>
  )
}
