#!/usr/bin/env node
/**
 * Seeds the local preview RabbitMQ (docker-compose.dev.yml) with fake but
 * realistic exchanges, queues, bindings and messages, so RabbitLens has
 * something to show in screenshots and while developing.
 *
 *   docker compose -f docker-compose.dev.yml up -d
 *   node scripts/seed-rabbitmq.mjs
 *
 * Re-running is safe: queues are purged before they are filled again.
 */

const API = (process.env.RABBITMQ_API_URL ?? "http://localhost:15672").replace(
  /\/$/,
  ""
)
const USER = process.env.RABBITMQ_USERNAME ?? "guest"
const PASS = process.env.RABBITMQ_PASSWORD ?? "guest"
const VHOST = encodeURIComponent(process.env.RABBITMQ_VHOST ?? "/")

const auth = `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}`

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> ${res.status} ${res.statusText}: ${await res.text()}`
    )
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

async function waitForBroker() {
  process.stdout.write("Waiting for RabbitMQ management API")
  for (let i = 0; i < 60; i++) {
    try {
      await api("GET", "/api/overview")
      process.stdout.write(" ready\n")
      return
    } catch {
      process.stdout.write(".")
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  process.stdout.write("\n")
  throw new Error(
    `RabbitMQ management API at ${API} did not come up. Is docker-compose.dev.yml running?`
  )
}

const EXCHANGES = ["app.events", "payments.events", "app.dlx"]

const QUEUES = [
  { name: "orders.created", bindings: [["app.events", "order.created"]] },
  {
    name: "orders.fulfilment",
    bindings: [
      ["app.events", "order.packed"],
      ["app.events", "order.shipped"],
    ],
  },
  { name: "payments.webhooks", bindings: [["payments.events", "payment.#"]] },
  { name: "notifications.email", bindings: [["app.events", "email.#"]] },
  { name: "search.reindex", bindings: [["app.events", "search.#"]] },
  { name: "analytics.stream", bindings: [["app.events", "user.#"]] },
  { name: "orders.dlq", bindings: [["app.dlx", "#"]] },
]

const now = Math.floor(Date.now() / 1000)
let seq = 0

function uuid() {
  return crypto.randomUUID()
}

/** Builds a publish body; `agoSeconds` controls the message timestamp. */
function msg(exchange, routingKey, payload, agoSeconds, extra = {}) {
  const isString = typeof payload === "string"
  seq += 1
  return {
    exchange,
    body: {
      routing_key: routingKey,
      payload: isString ? payload : JSON.stringify(payload, null, 0),
      payload_encoding: "string",
      properties: {
        content_type: isString ? "text/plain" : "application/json",
        content_encoding: "utf-8",
        delivery_mode: 2,
        message_id: uuid(),
        correlation_id: uuid(),
        timestamp: now - agoSeconds,
        app_id: extra.app_id ?? "checkout-service",
        type: routingKey,
        priority: extra.priority,
        reply_to: extra.reply_to,
        expiration: extra.expiration,
        headers: {
          "x-request-id": `req_${(1000 + seq).toString(36)}${seq}`,
          "x-source": extra.app_id ?? "checkout-service",
          ...(extra.headers ?? {}),
        },
      },
    },
  }
}

const MESSAGES = [
  msg(
    "app.events",
    "order.created",
    {
      id: "ord_3Kf91LmQ",
      customer: { id: "cus_81Hq2", email: "lena.hoffmann@example.com" },
      currency: "EUR",
      total: 12960,
      items: [
        { sku: "TZC-HOODIE-M", name: "Zu Hoodie (M)", qty: 1, price: 6900 },
        { sku: "TZC-MUG-01", name: "Enamel Mug", qty: 2, price: 1500 },
        { sku: "TZC-STICKERS", name: "Sticker Pack", qty: 1, price: 900 },
      ],
      shipping: {
        method: "dhl_standard",
        address: {
          line1: "König Str. 51",
          postalCode: "40213",
          city: "Düsseldorf",
          country: "DE",
        },
      },
      createdAt: new Date((now - 42) * 1000).toISOString(),
    },
    42,
    {
      headers: { "x-idempotency-key": "idem_9f2c1a", "x-tenant": "eu-central" },
    }
  ),
  msg(
    "app.events",
    "order.created",
    {
      id: "ord_3Kf8ZpWt",
      customer: { id: "cus_44Kp9", email: "j.novak@example.org" },
      currency: "EUR",
      total: 4900,
      items: [{ sku: "TZC-CAP-01", name: "Logo Cap", qty: 1, price: 4900 }],
      shipping: { method: "pickup", address: null },
      createdAt: new Date((now - 311) * 1000).toISOString(),
    },
    311,
    { headers: { "x-tenant": "eu-central" } }
  ),
  msg(
    "app.events",
    "order.packed",
    {
      orderId: "ord_3Kf7Qa02",
      warehouse: "WH-DUS-02",
      packedBy: "picker-17",
      parcels: [
        { id: "pcl_77120", weightGrams: 780, dimensionsCm: [30, 22, 8] },
      ],
      packedAt: new Date((now - 128) * 1000).toISOString(),
    },
    128,
    { app_id: "fulfilment-service" }
  ),
  msg(
    "app.events",
    "order.shipped",
    {
      orderId: "ord_3Kf7Qa02",
      carrier: "DHL",
      trackingNumber: "00340434161094042557",
      estimatedDelivery: "2026-09-23",
      shippedAt: new Date((now - 96) * 1000).toISOString(),
    },
    96,
    { app_id: "fulfilment-service", headers: { "x-retry-count": 0 } }
  ),
  msg(
    "payments.events",
    "payment.intent.succeeded",
    {
      id: "pi_3Qx81ZbHk2",
      object: "payment_intent",
      amount: 12960,
      currency: "eur",
      status: "succeeded",
      paymentMethod: { type: "card", brand: "visa", last4: "4242" },
      metadata: { orderId: "ord_3Kf91LmQ" },
    },
    38,
    {
      app_id: "payments-gateway",
      priority: 5,
      headers: {
        "x-webhook-signature": "t=1758470400,v1=8a1f…c93",
        "x-attempt": 1,
      },
    }
  ),
  msg(
    "payments.events",
    "payment.intent.payment_failed",
    {
      id: "pi_3Qx7pLmAa9",
      object: "payment_intent",
      amount: 8400,
      currency: "eur",
      status: "requires_payment_method",
      lastPaymentError: {
        code: "card_declined",
        declineCode: "insufficient_funds",
        message: "Your card has insufficient funds.",
      },
      metadata: { orderId: "ord_3Kf6XxPl" },
    },
    204,
    {
      app_id: "payments-gateway",
      priority: 7,
      headers: {
        "x-webhook-signature": "t=1758470100,v1=1bd0…4ff",
        "x-attempt": 2,
      },
    }
  ),
  msg(
    "payments.events",
    "payment.refund.created",
    {
      id: "re_3Qx6Ff12",
      amount: 1500,
      currency: "eur",
      reason: "requested_by_customer",
      metadata: { orderId: "ord_3Kf4Tt88", agent: "support-3" },
    },
    620,
    { app_id: "payments-gateway" }
  ),
  msg(
    "app.events",
    "email.order_confirmation",
    {
      to: "lena.hoffmann@example.com",
      template: "order-confirmation-v3",
      locale: "de-DE",
      variables: {
        firstName: "Lena",
        orderId: "ord_3Kf91LmQ",
        total: "129,60 €",
        trackingUrl: null,
      },
    },
    36,
    { app_id: "notification-service", reply_to: "bounce.handler" }
  ),
  msg(
    "app.events",
    "email.shipping_notification",
    {
      to: "j.novak@example.org",
      template: "shipping-notification-v1",
      locale: "en-GB",
      variables: { firstName: "Jan", trackingNumber: "00340434161094042557" },
    },
    94,
    { app_id: "notification-service" }
  ),
  msg(
    "app.events",
    "search.index.product",
    {
      op: "upsert",
      index: "products_v7",
      documents: [
        {
          id: "TZC-HOODIE-M",
          title: "Zu Hoodie (M)",
          price: 6900,
          inStock: 41,
        },
        { id: "TZC-CAP-01", title: "Logo Cap", price: 4900, inStock: 0 },
      ],
    },
    152,
    { app_id: "catalog-service" }
  ),
  msg(
    "app.events",
    "search.index.rebuild",
    "FULL REBUILD products_v7 requested by admin@thezu.company",
    480,
    { app_id: "catalog-service", headers: { "x-priority-lane": "batch" } }
  ),
  msg(
    "app.events",
    "user.signed_up",
    {
      userId: "usr_7Hn2Qa",
      email: "m.fischer@example.com",
      plan: "free",
      referrer: "producthunt",
      signedUpAt: new Date((now - 58) * 1000).toISOString(),
    },
    58,
    { app_id: "identity-service" }
  ),
  msg(
    "app.events",
    "user.logged_in",
    {
      userId: "usr_2Bq8Vd",
      method: "oauth_github",
      ip: "83.221.14.7",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      at: new Date((now - 21) * 1000).toISOString(),
    },
    21,
    { app_id: "identity-service" }
  ),
  msg(
    "app.events",
    "user.plan_upgraded",
    {
      userId: "usr_2Bq8Vd",
      from: "free",
      to: "team",
      seats: 8,
      mrrDeltaCents: 24000,
      invoiceId: "in_1Qx91Kk",
    },
    167,
    { app_id: "billing-service", priority: 3 }
  ),
  msg(
    "app.events",
    "user.deleted",
    {
      userId: "usr_9Ll0Pz",
      reason: "gdpr_request",
      anonymised: true,
      purgeAfter: "2026-10-21T00:00:00.000Z",
    },
    742,
    { app_id: "identity-service", expiration: "86400000" }
  ),
  msg(
    "app.dlx",
    "order.created",
    {
      id: "ord_3Kf2Bb10",
      customer: { id: "cus_00Zz1", email: "broken-payload@example.com" },
      currency: "EUR",
      total: null,
      items: [],
    },
    900,
    {
      headers: {
        "x-death": [
          {
            count: 3,
            reason: "rejected",
            queue: "orders.created",
            exchange: "app.events",
            "routing-keys": ["order.created"],
            time: new Date((now - 900) * 1000).toISOString(),
          },
        ],
        "x-first-death-reason": "rejected",
        "x-exception": "ValidationError: total must be a positive integer",
        "x-retry-count": 3,
      },
    }
  ),
  msg(
    "app.dlx",
    "payment.intent.succeeded",
    {
      id: "pi_3Qx0Ww77",
      amount: 2400,
      currency: "eur",
      metadata: { orderId: "ord_unknown" },
    },
    1340,
    {
      app_id: "payments-gateway",
      headers: {
        "x-death": [
          {
            count: 5,
            reason: "rejected",
            queue: "payments.webhooks",
            exchange: "payments.events",
            "routing-keys": ["payment.intent.succeeded"],
          },
        ],
        "x-exception": "OrderNotFoundError: ord_unknown",
        "x-retry-count": 5,
      },
    }
  ),
]

async function main() {
  await waitForBroker()

  for (const name of EXCHANGES) {
    await api("PUT", `/api/exchanges/${VHOST}/${encodeURIComponent(name)}`, {
      type: "topic",
      durable: true,
    })
  }
  console.log(`Declared ${EXCHANGES.length} exchanges`)

  for (const queue of QUEUES) {
    const path = `/api/queues/${VHOST}/${encodeURIComponent(queue.name)}`
    // Drop the queue instead of purging it, so stale bindings from an earlier
    // run of this script don't keep routing messages into it.
    await api("DELETE", `${path}?if-unused=false&if-empty=false`).catch(() => {})
    await api("PUT", path, {
      durable: true,
      arguments: queue.name.endsWith(".dlq")
        ? {}
        : { "x-dead-letter-exchange": "app.dlx" },
    })
    for (const [exchange, routingKey] of queue.bindings) {
      await api(
        "POST",
        `/api/bindings/${VHOST}/e/${encodeURIComponent(exchange)}/q/${encodeURIComponent(queue.name)}`,
        { routing_key: routingKey, arguments: {} }
      )
    }
  }
  console.log(`Recreated ${QUEUES.length} queues`)

  let published = 0
  let unrouted = 0
  for (const { exchange, body } of MESSAGES) {
    const result = await api(
      "POST",
      `/api/exchanges/${VHOST}/${encodeURIComponent(exchange)}/publish`,
      body
    )
    published += 1
    if (!result?.routed) unrouted += 1
  }
  console.log(
    `Published ${published} messages${unrouted ? ` (${unrouted} unrouted!)` : ""}`
  )

  // Management statistics are eventually consistent, so give them a moment
  // before printing the summary, otherwise every queue still reads as empty.
  await new Promise((r) => setTimeout(r, 6000))

  const queues = await api("GET", `/api/queues/${VHOST}`)
  console.log("\nQueue                 ready")
  for (const q of queues.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${q.name.padEnd(22)}${q.messages_ready ?? 0}`)
  }
  console.log(`\nManagement UI: ${API} (${USER} / ${PASS})`)
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
