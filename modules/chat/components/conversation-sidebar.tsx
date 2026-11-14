"use client"

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"

import { ModeToggle } from "@/components/common/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { SignOutButton } from "@/modules/auth/components/sign-out-button"

export type ConversationSummary = { id: string; title: string }

type Props = {
  conversations: ConversationSummary[] | undefined
  isLoading: boolean
  activeId: string | null
  isCreating: boolean
  createFailed: boolean
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (conversation: ConversationSummary) => void
  onDelete: (conversation: ConversationSummary) => void
}

export function ConversationSidebar({
  conversations,
  isLoading,
  activeId,
  isCreating,
  createFailed,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
        <span className="text-lg font-semibold tracking-tight">Supportly</span>
        <div className="flex items-center gap-1">
          <ModeToggle />
          <SignOutButton variant="ghost" size="sm" label="Sign out" showIcon={false} />
        </div>
      </div>

      <div className="p-3">
        <Button className="w-full" onClick={onCreate} disabled={isCreating}>
          {isCreating ? <Spinner data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
          New chat
        </Button>
        {createFailed && (
          <p role="alert" className="mt-2 text-center text-xs text-destructive">
            Couldn&apos;t create a chat. Please try again.
          </p>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav aria-label="Chats" className="flex flex-col gap-1 px-3 pb-3">
          {isLoading &&
            Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}

          {conversations?.map((conversation) => {
            const isActive = conversation.id === activeId
            return (
              <div
                key={conversation.id}
                className={cn(
                  "group/item flex items-center rounded-xl transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/60"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={isActive ? "page" : undefined}
                  className="min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {conversation.title}
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "mr-1 shrink-0 text-muted-foreground",
                          // Only show on hover/focus unless this chat is open.
                          !isActive &&
                            "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
                        )}
                      />
                    }
                  >
                    <MoreHorizontal />
                    <span className="sr-only">Chat options for {conversation.title}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 min-w-40">
                    <DropdownMenuItem onClick={() => onRename(conversation)}>
                      <Pencil />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => onDelete(conversation)}>
                      <Trash2 />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </nav>
      </ScrollArea>
    </div>
  )
}
