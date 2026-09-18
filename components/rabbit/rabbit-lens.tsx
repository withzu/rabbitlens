"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { RefreshCwIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { QueueMultiSelect } from "@/components/rabbit/queue-multi-select"
import { MessageList } from "@/components/rabbit/message-list"
import {
  MessageDetail,
  MESSAGE_DETAIL_TABS,
  type MessageDetailTab,
} from "@/components/rabbit/message-detail"
import { cn } from "@/lib/utils"
import type { DisplayMessage, RabbitMessage, RabbitQueue } from "@/lib/types"

const SELECTED_QUEUES_STORAGE_KEY = "rabbitlens:selected-queues"
const AUTO_REFRESH_STORAGE_KEY = "rabbitlens:auto-refresh-ms"

const AUTO_REFRESH_OPTIONS = [
  { value: "0", label: "Off" },
  { value: "5000", label: "5s" },
  { value: "10000", label: "10s" },
  { value: "30000", label: "30s" },
  { value: "60000", label: "60s" },
]

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok) {
    throw new Error(body.error ?? "Request failed")
  }
  return body as T
}

function readStoredSelection(): string[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(SELECTED_QUEUES_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === "string")
      : null
  } catch {
    return null
  }
}

function sortByTimestamp(messages: DisplayMessage[]): DisplayMessage[] {
  return [...messages].sort((a, b) => {
    const tsA = a.properties.timestamp
    const tsB = b.properties.timestamp
    if (tsA === undefined && tsB === undefined) return 0
    if (tsA === undefined) return 1
    if (tsB === undefined) return -1
    return tsB - tsA
  })
}

function writeStoredSelection(queues: string[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      SELECTED_QUEUES_STORAGE_KEY,
      JSON.stringify(queues)
    )
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — ignore
  }
}

function readStoredAutoRefresh(): number {
  if (typeof window === "undefined") return 0
  const raw = window.localStorage.getItem(AUTO_REFRESH_STORAGE_KEY)
  const parsed = raw ? Number(raw) : 0
  return AUTO_REFRESH_OPTIONS.some((o) => Number(o.value) === parsed)
    ? parsed
    : 0
}

function writeStoredAutoRefresh(ms: number) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(AUTO_REFRESH_STORAGE_KEY, String(ms))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — ignore
  }
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function messageKey(message: DisplayMessage): string {
  return [
    message.queue,
    message.exchange,
    message.routingKey,
    message.properties.message_id ?? "",
    message.payload,
  ].join("|")
}

export function RabbitLens() {
  const [queues, setQueues] = useState<RabbitQueue[]>([])
  const [selectedQueues, setSelectedQueues] = useState<string[]>([])
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [queuesLoading, setQueuesLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [autoRefreshMs, setAutoRefreshMs] = useState(0)
  const [activeTab, setActiveTab] = useState<MessageDetailTab>("payload")
  const hasHydratedSelection = useRef(false)
  const selectedIndexRef = useRef<number | null>(null)
  const messagesRef = useRef<DisplayMessage[]>([])

  useEffect(() => {
    selectedIndexRef.current = selectedIndex
    messagesRef.current = messages
  }, [selectedIndex, messages])

  useEffect(() => {
    // Reads a client-only persisted value once after mount; the effect
    // itself has no reactive dependencies, so it can't be expressed as a
    // lazy useState initializer without risking a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoRefreshMs(readStoredAutoRefresh())
  }, [])

  const loadQueues = useCallback(async () => {
    setQueuesLoading(true)
    try {
      const data = await fetchJson<{ queues: RabbitQueue[] }>("/api/queues")
      setQueues(data.queues)

      if (!hasHydratedSelection.current) {
        hasHydratedSelection.current = true
        const stored = readStoredSelection()
        if (stored) {
          const valid = stored.filter((name) =>
            data.queues.some((q) => q.name === name)
          )
          setSelectedQueues(valid)
        } else {
          const all = data.queues.map((q) => q.name)
          setSelectedQueues(all)
          writeStoredSelection(all)
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load queues"
      )
    } finally {
      setQueuesLoading(false)
    }
  }, [])

  const loadMessages = useCallback(
    async (queueNames: string[], preserveSelection = false) => {
      if (queueNames.length === 0) {
        setMessages([])
        setSelectedIndex(null)
        return
      }

      setMessagesLoading(true)
      const previousKey =
        preserveSelection && selectedIndexRef.current !== null
          ? messageKey(messagesRef.current[selectedIndexRef.current])
          : null
      if (!preserveSelection) {
        setSelectedIndex(null)
      }

      try {
        const results = await Promise.all(
          queueNames.map(async (queue) => {
            try {
              const data = await fetchJson<{ messages: RabbitMessage[] }>(
                `/api/queues/${encodeURIComponent(queue)}/messages?count=25`
              )
              return data.messages.map((m) => ({ ...m, queue }))
            } catch (error) {
              toast.error(
                `${queue}: ${error instanceof Error ? error.message : "Failed to load messages"}`
              )
              return []
            }
          })
        )
        const next = sortByTimestamp(results.flat())
        setMessages(next)

        if (previousKey) {
          const matchIndex = next.findIndex(
            (m) => messageKey(m) === previousKey
          )
          setSelectedIndex(matchIndex === -1 ? null : matchIndex)
        }
      } finally {
        setMessagesLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    // Initial data fetch on mount — the resulting state updates happen
    // asynchronously inside loadQueues, after this effect has returned.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadQueues()
  }, [loadQueues])

  useEffect(() => {
    if (hasHydratedSelection.current) {
      loadMessages(selectedQueues)
    }
  }, [selectedQueues, loadMessages])

  useEffect(() => {
    if (autoRefreshMs <= 0) return

    const id = window.setInterval(() => {
      if (document.hidden) return
      loadQueues()
      loadMessages(selectedQueues, true)
    }, autoRefreshMs)

    return () => window.clearInterval(id)
  }, [autoRefreshMs, selectedQueues, loadQueues, loadMessages])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest(
          '[data-slot="select-content"], [data-slot="popover-content"]'
        )
      ) {
        return
      }

      if (event.key === "ArrowDown") {
        if (messages.length === 0) return
        event.preventDefault()
        setSelectedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, messages.length - 1)
        )
      } else if (event.key === "ArrowUp") {
        if (messages.length === 0) return
        event.preventDefault()
        setSelectedIndex((prev) => (prev === null ? 0 : Math.max(prev - 1, 0)))
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        setActiveTab((prev) => {
          const index = MESSAGE_DETAIL_TABS.indexOf(prev)
          const nextIndex =
            (index - 1 + MESSAGE_DETAIL_TABS.length) %
            MESSAGE_DETAIL_TABS.length
          return MESSAGE_DETAIL_TABS[nextIndex]
        })
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        setActiveTab((prev) => {
          const index = MESSAGE_DETAIL_TABS.indexOf(prev)
          const nextIndex = (index + 1) % MESSAGE_DETAIL_TABS.length
          return MESSAGE_DETAIL_TABS[nextIndex]
        })
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [messages.length])

  const handleSelectionChange = (next: string[]) => {
    setSelectedQueues(next)
    writeStoredSelection(next)
  }

  const handleAutoRefreshChange = (value: string | null) => {
    const ms = Number(value ?? 0)
    setAutoRefreshMs(ms)
    writeStoredAutoRefresh(ms)
  }

  const selectedMessage =
    selectedIndex !== null ? messages[selectedIndex] : null

  const totalReady = useMemo(
    () =>
      queues
        .filter((q) => selectedQueues.includes(q.name))
        .reduce((sum, q) => sum + q.messagesReady, 0),
    [queues, selectedQueues]
  )

  const handleRefresh = () => {
    loadQueues()
    loadMessages(selectedQueues, true)
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.svg"
            alt="RabbitLens"
            width={30}
            height={26}
            priority
          />
          <h1 className="sr-only">RabbitLens</h1>
          <QueueMultiSelect
            queues={queues}
            selected={selectedQueues}
            onChange={handleSelectionChange}
            isLoading={queuesLoading}
          />
          {selectedQueues.length > 0 && (
            <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
              <span>{totalReady} ready</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(autoRefreshMs)}
            onValueChange={handleAutoRefreshChange}
          >
            <SelectTrigger size="sm" className="min-w-24">
              <SelectValue>
                {(value: string) =>
                  AUTO_REFRESH_OPTIONS.find((o) => o.value === value)?.label ??
                  value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AUTO_REFRESH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCwIcon
              className={cn(
                "size-3.5",
                (queuesLoading || messagesLoading) && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[25%_75%]">
        <div className="min-h-0 border-r border-border">
          <MessageList
            messages={messages}
            selectedIndex={selectedIndex}
            onSelect={setSelectedIndex}
            isLoading={messagesLoading}
            hasQueue={selectedQueues.length > 0}
            showQueueLabel={selectedQueues.length > 1}
          />
        </div>
        <div className="min-h-0">
          <MessageDetail
            message={selectedMessage ?? null}
            activeTab={activeTab}
            onActiveTabChange={setActiveTab}
          />
        </div>
      </div>
    </div>
  )
}
