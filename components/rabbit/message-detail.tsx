"use client"

import type { ReactNode } from "react"
import { MailOpenIcon, EyeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { highlightJson } from "@/components/rabbit/json-highlight"
import {
  formatBytes,
  formatDeliveryMode,
  formatTimestamp,
  tryPrettyJson,
} from "@/lib/format"
import type { DisplayMessage } from "@/lib/types"

function PropertyRow({ label, value }: { label: string; value?: ReactNode }) {
  if (value === undefined || value === null || value === "") return null
  return (
    <div className="flex items-start justify-between gap-6 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[65%] text-right font-mono text-xs break-all text-foreground">
        {value}
      </span>
    </div>
  )
}

export const MESSAGE_DETAIL_TABS = ["payload", "properties", "headers"] as const
export type MessageDetailTab = (typeof MESSAGE_DETAIL_TABS)[number]

interface MessageDetailProps {
  message: DisplayMessage | null
  activeTab: MessageDetailTab
  onActiveTabChange: (tab: MessageDetailTab) => void
}

export function MessageDetail({
  message,
  activeTab,
  onActiveTabChange,
}: MessageDetailProps) {
  if (!message) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <MailOpenIcon className="size-7 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select a message to see its details
        </p>
      </div>
    )
  }

  const { formatted, isJson } = tryPrettyJson(message.payload)
  const properties = message.properties ?? {}
  const timestamp = formatTimestamp(properties.timestamp)

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-border px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {message.routingKey || "(no routing key)"}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            {message.redelivered && (
              <Badge variant="secondary">Redelivered</Badge>
            )}
            {isJson && <Badge variant="outline">JSON</Badge>}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" className="gap-1">
                    <EyeIcon data-icon="inline-start" />
                    Not acked
                  </Badge>
                }
              />
              <TooltipContent>
                Browsing peeks messages and immediately requeues them — nothing
                is acknowledged or removed from the queue.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Queue: {message.queue}</span>
          <span>Exchange: {message.exchange || "(default)"}</span>
          <span>{formatBytes(message.payloadBytes)}</span>
          <span>{message.messageCount} remaining in queue</span>
          {timestamp && <span>{timestamp}</span>}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onActiveTabChange(value as MessageDetailTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-6 pt-4">
          <TabsList>
            <TabsTrigger value="payload">Payload</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="payload" className="min-h-0 flex-1 px-6 py-4">
          <ScrollArea className="h-full rounded-2xl border border-border bg-muted/40">
            <pre className="p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-foreground">
              {formatted
                ? isJson
                  ? highlightJson(formatted)
                  : formatted
                : "(empty payload)"}
            </pre>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="properties" className="min-h-0 flex-1 px-6 py-4">
          <ScrollArea className="h-full">
            <div className="divide-y divide-border rounded-2xl border border-border px-4">
              <PropertyRow
                label="Acknowledged"
                value="No (peeked, auto-requeued)"
              />
              <PropertyRow
                label="Redelivered"
                value={message.redelivered ? "Yes" : "No"}
              />
              <PropertyRow
                label="Content type"
                value={properties.content_type}
              />
              <PropertyRow
                label="Content encoding"
                value={properties.content_encoding}
              />
              <PropertyRow
                label="Delivery mode"
                value={formatDeliveryMode(properties.delivery_mode)}
              />
              <PropertyRow label="Priority" value={properties.priority} />
              <PropertyRow
                label="Correlation ID"
                value={properties.correlation_id}
              />
              <PropertyRow label="Reply to" value={properties.reply_to} />
              <PropertyRow label="Expiration" value={properties.expiration} />
              <PropertyRow label="Message ID" value={properties.message_id} />
              <PropertyRow label="Type" value={properties.type} />
              <PropertyRow label="User ID" value={properties.user_id} />
              <PropertyRow label="App ID" value={properties.app_id} />
              <PropertyRow
                label="Payload encoding"
                value={message.payloadEncoding}
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="headers" className="min-h-0 flex-1 px-6 py-4">
          <ScrollArea className="h-full rounded-2xl border border-border bg-muted/40">
            {properties.headers &&
            Object.keys(properties.headers).length > 0 ? (
              <pre className="p-4 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-foreground">
                {JSON.stringify(properties.headers, null, 2)}
              </pre>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No headers
              </p>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
