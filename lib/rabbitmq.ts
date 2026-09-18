import "server-only"

import type { RabbitMessage, RabbitQueue } from "@/lib/types"

interface RabbitEnv {
  apiUrl: string
  username: string
  password: string
  vhost: string
}

function getEnv(): RabbitEnv {
  const apiUrl = process.env.RABBITMQ_API_URL
  const username = process.env.RABBITMQ_USERNAME
  const password = process.env.RABBITMQ_PASSWORD
  const vhost = process.env.RABBITMQ_VHOST ?? "/"

  if (!apiUrl || !username || !password) {
    throw new Error(
      "Missing RabbitMQ configuration. Set RABBITMQ_API_URL, RABBITMQ_USERNAME and RABBITMQ_PASSWORD in your environment."
    )
  }

  return { apiUrl: apiUrl.replace(/\/$/, ""), username, password, vhost }
}

function authHeader(env: RabbitEnv) {
  const token = Buffer.from(`${env.username}:${env.password}`).toString(
    "base64"
  )
  return `Basic ${token}`
}

async function rabbitFetch(path: string, init?: RequestInit) {
  const env = getEnv()
  const res = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(env),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `RabbitMQ API error ${res.status} ${res.statusText} for ${path}${body ? `: ${body}` : ""}`
    )
  }

  return res
}

function encodedVhost(vhost?: string) {
  return encodeURIComponent(vhost ?? getEnv().vhost)
}

interface RawQueue {
  name: string
  vhost: string
  state?: string
  messages?: number
  messages_ready?: number
  messages_unacknowledged?: number
  consumers?: number
  node?: string
}

export async function listQueues(): Promise<RabbitQueue[]> {
  const res = await rabbitFetch(`/api/queues/${encodedVhost()}`)
  const data = (await res.json()) as RawQueue[]

  return data
    .map((q) => ({
      name: q.name,
      vhost: q.vhost,
      state: (q.state ?? "down") as RabbitQueue["state"],
      messages: q.messages ?? 0,
      messagesReady: q.messages_ready ?? 0,
      messagesUnacknowledged: q.messages_unacknowledged ?? 0,
      consumers: q.consumers ?? 0,
      node: q.node ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

interface RawMessage {
  payload: string
  payload_encoding: string
  payload_bytes: number
  redelivered: boolean
  exchange: string
  routing_key: string
  message_count: number
  properties: RabbitMessage["properties"]
}

export async function getMessages(
  queue: string,
  count = 20
): Promise<RabbitMessage[]> {
  const res = await rabbitFetch(
    `/api/queues/${encodedVhost()}/${encodeURIComponent(queue)}/get`,
    {
      method: "POST",
      body: JSON.stringify({
        count,
        ackmode: "ack_requeue_true",
        encoding: "auto",
        truncate: 50000,
      }),
    }
  )

  const data = (await res.json()) as RawMessage[]

  return data.map((m) => ({
    payload: m.payload,
    payloadEncoding: m.payload_encoding,
    payloadBytes: m.payload_bytes,
    redelivered: m.redelivered,
    exchange: m.exchange,
    routingKey: m.routing_key,
    messageCount: m.message_count,
    properties: m.properties ?? {},
  }))
}
