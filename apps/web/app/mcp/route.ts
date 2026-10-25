import { NextResponse } from "next/server"
import { agentCtx } from "@/lib/auth/agent"
import { INSTRUCTIONS, TOOLS, call } from "@/lib/mcp/tools"
import type { Ctx } from "@/lib/workspace/context"
import { LeanError } from "@/lib/utils"

// MCP over Streamable HTTP, stateless, JSON responses. The tools are in lib/mcp.

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"]

type Json = Record<string, unknown>
type C = Ctx

type Msg = {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Json
}

async function handle(m: Msg, getCtx: () => Promise<C>): Promise<Json | null> {
  const reply = (result: unknown) => ({
    jsonrpc: "2.0",
    id: m.id ?? null,
    result,
  })
  const error = (code: number, message: string) => ({
    jsonrpc: "2.0",
    id: m.id ?? null,
    error: { code, message },
  })
  if (m.id === undefined || m.id === null) return null // a notification
  switch (m.method) {
    case "initialize": {
      const want = String(m.params?.protocolVersion ?? "")
      return reply({
        protocolVersion: VERSIONS.includes(want) ? want : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "leanear", title: "Leanear", version: "0.1.0" },
        instructions: INSTRUCTIONS,
      })
    }
    case "ping":
      return reply({})
    case "tools/list":
      return reply({ tools: TOOLS })
    case "tools/call": {
      const name = String(m.params?.name ?? "")
      const args = (m.params?.arguments ?? {}) as Json
      try {
        const text = await call(await getCtx(), name, args)
        return reply({ content: [{ type: "text", text }] })
      } catch (e) {
        if (e instanceof LeanError && e.status === 401) throw e
        const msg = e instanceof LeanError ? e.message : "Something went wrong"
        if (!(e instanceof LeanError)) console.error("mcp", e)
        return reply({ content: [{ type: "text", text: msg }], isError: true })
      }
    }
    default:
      return error(-32601, `Method not found: ${m.method}`)
  }
}

export async function POST(req: Request) {
  let ctx: Promise<C> | null = null
  const getCtx = () => (ctx ??= agentCtx(req))
  try {
    // Check the key up front so clients see a clear 401.
    await getCtx()
    const body = (await req.json()) as Msg | Msg[]
    const list = Array.isArray(body) ? body : [body]
    const out = (await Promise.all(list.map((m) => handle(m, getCtx)))).filter(
      Boolean
    )
    if (!out.length) return new NextResponse(null, { status: 202 })
    return NextResponse.json(Array.isArray(body) ? out : out[0])
  } catch (e) {
    if (e instanceof LeanError) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: e.status === 429 ? -32000 : -32001,
            message: e.message,
          },
        },
        { status: e.status }
      )
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        },
        { status: 400 }
      )
    }
    console.error("mcp", e)
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Internal error" },
      },
      { status: 500 }
    )
  }
}

export function GET() {
  return new NextResponse(
    "Leanear MCP. POST JSON-RPC here with Authorization: Bearer lk_…",
    {
      status: 405,
      headers: { Allow: "POST" },
    }
  )
}

export const DELETE = GET
