import { NextResponse, type NextRequest } from "next/server"

import { getMessages } from "@/lib/rabbitmq"

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ queue: string }> }
) {
  const { queue } = await ctx.params
  const count = Number(request.nextUrl.searchParams.get("count") ?? 20)

  try {
    const messages = await getMessages(decodeURIComponent(queue), count)
    return NextResponse.json({ messages })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 }
    )
  }
}
