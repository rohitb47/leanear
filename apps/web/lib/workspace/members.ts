import "server-only"
import type { Member as MemberRow } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { Member } from "@/lib/sync/types"
import { LeanError, text } from "@/lib/utils"
import { owner, person, type Ctx } from "./context"

export const toMember = (r: MemberRow): Member => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  avatarUrl: r.avatarUrl,
  role: r.role,
  removed: !!r.removedAt,
})

/** "me", a member's name or id, or null/"none" for no one. */
export async function findMember(
  c: Ctx,
  ref: unknown
): Promise<MemberRow | null> {
  if (ref === null || ref === undefined) return null
  const r = String(ref).trim()
  const lower = r.toLowerCase()
  if (!r || lower === "none" || lower === "no one") return null
  if (lower === "me") return c.me
  const m = await prisma.member.findFirst({
    where: {
      workspaceId: c.ws,
      removedAt: null,
      OR: [{ id: r }, { name: { equals: r, mode: "insensitive" } }],
    },
  })
  if (!m) throw new LeanError(`No member "${r}"`, 404)
  return m
}

/** Names by member id, for MCP answers. */
export async function memberNames(c: Ctx, ids: (string | null)[]) {
  const want = [...new Set(ids.filter(Boolean))] as string[]
  if (!want.length) return new Map<string, string>()
  const rows = await prisma.member.findMany({
    where: { workspaceId: c.ws, id: { in: want } },
    select: { id: true, name: true },
  })
  return new Map(rows.map((r) => [r.id, r.name]))
}

async function live(c: Ctx, memberId: unknown) {
  const m = await prisma.member.findFirst({
    where: { id: String(memberId), workspaceId: c.ws, removedAt: null },
  })
  if (!m) throw new LeanError("No such member", 404)
  return m
}

export async function renameMember(
  c: Ctx,
  a: { memberId?: unknown; name?: unknown }
) {
  person(c)
  const name = text(a.name, "Name", 40)
  const m = await live(c, a.memberId)
  if (m.kind === "person" && m.id !== c.me.id)
    throw new LeanError("People rename themselves", 403)
  const row = await prisma.member.update({
    where: { id: m.id },
    data: { name, updatedAt: new Date() },
  })
  return toMember(row)
}

export async function removeMember(c: Ctx, a: { memberId?: unknown }) {
  person(c)
  const m = await live(c, a.memberId)
  if (m.kind === "person") {
    if (m.id !== c.me.id) owner(c)
    if (m.role === "owner") {
      const owners = await prisma.member.count({
        where: { workspaceId: c.ws, role: "owner", removedAt: null },
      })
      if (owners <= 1)
        throw new LeanError(
          "A workspace needs an owner. Make someone else owner first."
        )
    }
  }
  const now = new Date()
  await prisma.$transaction([
    prisma.member.update({
      where: { id: m.id },
      data: { removedAt: now, updatedAt: now },
    }),
    prisma.agentKey.updateMany({
      where: { memberId: m.id, revokedAt: null },
      data: { revokedAt: now },
    }),
  ])
  return { ok: true }
}

export async function makeOwner(c: Ctx, a: { memberId?: unknown }) {
  owner(c)
  const m = await prisma.member.findFirst({
    where: {
      id: String(a.memberId),
      workspaceId: c.ws,
      kind: "person",
      removedAt: null,
    },
  })
  if (!m) throw new LeanError("No such person", 404)
  const row = await prisma.member.update({
    where: { id: m.id },
    data: { role: "owner", updatedAt: new Date() },
  })
  return toMember(row)
}
