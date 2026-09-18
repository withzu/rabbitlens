"use client"

import { RefreshCwIcon, InboxIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { DisplayMessage } from "@/lib/types"

interface MessageListProps {
  messages: DisplayMessage[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  isLoading: boolean
  hasQueue: boolean
  showQueueLabel: boolean
}

export function MessageList({
  messages,
  selectedIndex,
  onSelect,
  isLoading,
  hasQueue,
  showQueueLabel,
}: MessageListProps) {
  if (!hasQueue) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <InboxIcon className="size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select at least one queue to browse messages
        </p>
      </div>
    )
  }

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl p-3">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <InboxIcon className="size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No messages in the selected queues
        </p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-0.5 p-2">
        {messages.map((message, index) => {
          const selected = index === selectedIndex
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "flex flex-col gap-1 rounded-xl px-3 py-2.5 text-left transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-sm font-medium",
                    selected ? "text-primary-foreground" : "text-foreground"
                  )}
                >
                  {message.routingKey || "(no routing key)"}
                </span>
                {message.redelivered && (
                  <RefreshCwIcon
                    className={cn(
                      "size-3 shrink-0",
                      selected
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              {showQueueLabel && (
                <span
                  className={cn(
                    "truncate text-xs font-medium",
                    selected
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {message.queue}
                </span>
              )}
              <span
                className={cn(
                  "line-clamp-2 text-xs",
                  selected
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                )}
              >
                {message.payload.replace(/\s+/g, " ").trim() ||
                  "(empty payload)"}
              </span>
            </button>
          )
        })}
      </div>
    </ScrollArea>
  )
}
