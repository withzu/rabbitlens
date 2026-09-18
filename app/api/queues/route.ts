import { NextResponse } from "next/server"

import { listQueues } from "@/lib/rabbitmq"

export async function GET() {
  try {
    const queues = await listQueues()
    return NextResponse.json({ queues })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    )
  }
}
