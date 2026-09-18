<p align="center">
  <img src=".github/banner.png" width="100%" alt="RabbitLens" />
</p>

<p align="center">
  <strong>A modern, open source RabbitMQ web interface built for debugging.</strong>
</p>

<p align="center">
  Browse queues, peek messages non-destructively, and inspect payloads, properties and headers — all in a clean UI.
</p>

<p align="center">
  <a href="https://github.com/withzu/rabbitlens/releases">Releases</a>
  ·
  <a href="https://github.com/withzu/rabbitlens/issues">Issues</a>
</p>

<p align="center">
  <a href="https://github.com/withzu/rabbitlens/releases">
    <img alt="Latest release" src="https://img.shields.io/github/v/release/withzu/rabbitlens?display_name=tag" />
  </a>
  <a href="https://github.com/withzu/rabbitlens/stargazers">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/withzu/rabbitlens" />
  </a>
  <a href="LICENSE">
    <img alt="MIT License" src="https://img.shields.io/github/license/withzu/rabbitlens" />
  </a>
</p>

## Features

- **Multi-queue selection** — watch several queues at once, merged into a single, timestamp-sorted list. Selection is remembered per browser via `localStorage` and defaults to all queues.
- **Non-destructive browsing** — messages are fetched with `ackmode=ack_requeue_true`, so peeking never consumes anything from the queue. Every message view is clearly marked "Not acked".
- **Syntax-highlighted JSON payloads** with automatic pretty-printing.
- **Auto-refresh** with a configurable interval (5s–60s), persisted per browser, paused while the tab is hidden.
- **Light and dark mode**, following the system theme.
- Credentials stay on the server — the RabbitMQ Management API is only ever called from Next.js route handlers, never from the browser.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/) 10 or newer
- A RabbitMQ broker with the [management plugin](https://www.rabbitmq.com/docs/management) enabled

### Installation

```bash
git clone https://github.com/withzu/rabbitlens.git
cd rabbitlens
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your RabbitMQ connection details (see below), then start the dev server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

RabbitLens talks to the RabbitMQ [HTTP Management API](https://www.rabbitmq.com/docs/management#http-api), not the AMQP port. All variables are required unless noted otherwise.

| Variable             | Description                                                                                          | Example                 |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------ |
| `RABBITMQ_API_URL`    | Base URL of the RabbitMQ Management API. This is the management UI port, **not** the AMQP port (5672). | `http://localhost:15672` |
| `RABBITMQ_USERNAME`   | Username for a user with management API access.                                                       | `guest`                  |
| `RABBITMQ_PASSWORD`   | Password for that user.                                                                                | `guest`                  |
| `RABBITMQ_VHOST`      | Virtual host to browse. Defaults to `/` if omitted.                                                    | `/`                      |

## Running with Docker

Images are published to GitHub Container Registry on every release.

```bash
docker run -p 3000:3000 \
  -e RABBITMQ_API_URL=http://your-rabbitmq-host:15672 \
  -e RABBITMQ_USERNAME=guest \
  -e RABBITMQ_PASSWORD=guest \
  -e RABBITMQ_VHOST=/ \
  ghcr.io/withzu/rabbitlens:latest
```

## Tech stack

- [Next.js](https://nextjs.org/) (App Router, route handlers)
- [React](https://react.dev/) & TypeScript
- [Tailwind CSS](https://tailwindcss.com/) with [Base UI](https://base-ui.com/) primitives and [shadcn](https://ui.shadcn.com/)-style components

## License

RabbitLens is licensed under the [MIT License](LICENSE).

RabbitLens is developed by [The Zu Company](https://thezucompany.com).
