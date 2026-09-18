export type QueueState = "running" | "idle" | "flow" | "down"

export interface RabbitQueue {
  name: string
  vhost: string
  state: QueueState
  messages: number
  messagesReady: number
  messagesUnacknowledged: number
  consumers: number
  node: string
}

export interface RabbitMessageProperties {
  content_type?: string
  content_encoding?: string
  headers?: Record<string, unknown>
  delivery_mode?: number
  priority?: number
  correlation_id?: string
  reply_to?: string
  expiration?: string
  message_id?: string
  timestamp?: number
  type?: string
  user_id?: string
  app_id?: string
}

export interface RabbitMessage {
  payload: string
  payloadEncoding: string
  payloadBytes: number
  redelivered: boolean
  exchange: string
  routingKey: string
  messageCount: number
  properties: RabbitMessageProperties
}

export interface DisplayMessage extends RabbitMessage {
  queue: string
}
