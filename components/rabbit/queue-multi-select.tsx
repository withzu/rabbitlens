"use client"

import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { RabbitQueue } from "@/lib/types"

interface QueueMultiSelectProps {
  queues: RabbitQueue[]
  selected: string[]
  onChange: (queues: string[]) => void
  isLoading: boolean
}

export function QueueMultiSelect({
  queues,
  selected,
  onChange,
  isLoading,
}: QueueMultiSelectProps) {
  const toggle = (name: string) => {
    if (selected.includes(name)) {
      onChange(selected.filter((q) => q !== name))
    } else {
      onChange([...selected, name])
    }
  }

  const label =
    isLoading && queues.length === 0
      ? "Loading queues…"
      : queues.length === 0
        ? "No queues"
        : selected.length === 0
          ? "No queues selected"
          : selected.length === queues.length
            ? "All queues"
            : `${selected.length} of ${queues.length} queues`

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="min-w-56 justify-between"
          >
            <span className="truncate">{label}</span>
            <ChevronDownIcon className="size-3.5 text-muted-foreground" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">
            {queues.length} {queues.length === 1 ? "queue" : "queues"}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => onChange(queues.map((q) => q.name))}
            >
              Select all
            </Button>
            <Button variant="ghost" size="xs" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col gap-0.5 p-2">
            {queues.map((queue) => {
              const checked = selected.includes(queue.name)
              return (
                <label
                  key={queue.name}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(queue.name)}
                  />
                  <span className="flex-1 truncate">{queue.name}</span>
                  <Badge variant="secondary">{queue.messages}</Badge>
                </label>
              )
            })}
            {queues.length === 0 && !isLoading && (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No queues found
              </p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
