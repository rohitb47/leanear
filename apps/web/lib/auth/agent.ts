import "server-only"
import { prisma } from "@/lib/prisma"
import type { Ctx } from "@/lib/workspace/context"
import { LeanError, sha256 } from "@/lib/utils"
import { getSession } from "./session"

const hits = new Map<string, number[]>()

/** Resolve a bearer key to its agent. Rate limited to 120 calls a minute per key. */
export async function agentCtx(req: Request): Promise<Ctx> {
  const header = req.headers.get("authorization") ?? ""
  const m = /^Bearer\s+(\S+)$/i.exec(header)
  if (!m)
    throw new LeanError("Missing key. Send Authorization: Bearer lk_…", 401)
  const hash = sha256(m[1])

  const now = Date.now()
  const recent = (hits.get(hash) ?? []).filter((t) => now - t < 60_000)
  if (recent.length >= 120)
    throw new LeanError("Too many requests. Wait a minute.", 429)
  recent.push(now)
  hits.set(hash, recent)

  const key = await prisma.agentKey.findFirst({
    where: { hash, revokedAt: null, member: { removedAt: null } },
    include: { member: true },
  })
  if (!key)
    throw new LeanError("That key isn't valid. It may have been revoked.", 401)
  if (!key.lastUsedAt || now - key.lastUsedAt.getTime() > 60_000) {
    await prisma.agentKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
  }
  return { ws: key.member.workspaceId, me: key.member }
}

/** A person's session or an agent's key, for images. */
export async function anyCtx(req: Request): Promise<{ ws: string } | null> {
  const s = await getSession()
  if (s) return { ws: s.workspace.id }
  if (!req.headers.get("authorization")) return null
  try {
    return { ws: (await agentCtx(req)).ws }
  } catch {
    return null
  }
}
