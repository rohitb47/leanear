import "server-only"
import type { Member } from "@prisma/client"
import { LeanError } from "@/lib/utils"

/**
 * Who is asking, and in which workspace: a person through tRPC or an agent
 * through MCP. Every operation in `lib/` takes one and stays inside `ws`.
 */
export type Ctx = { ws: string; me: Member }

export function person(c: Ctx) {
  if (c.me.kind !== "person")
    throw new LeanError("Only people can do that", 403)
}

export function owner(c: Ctx) {
  person(c)
  if (c.me.role !== "owner")
    throw new LeanError("Only the workspace owner can do that", 403)
}
