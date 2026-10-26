import "server-only"
import { prisma, type TxClient } from "@/lib/prisma"
import { withinPlan } from "@/lib/billing/billing"
import { record } from "@/lib/log/log"
import { LeanError, id, sha256, text, token } from "@/lib/utils"
import { person, type Ctx } from "./context"
import { toMember } from "./members"

/** A new `lk_` key. Only its hash is stored, so this is the one time it's seen. */
async function mintKey(db: TxClient, memberId: string) {
  const key = "lk_" + token(24)
  await db.agentKey.create({
    data: { id: id(), memberId, hash: sha256(key), hint: key.slice(-4) },
  })
  return key
}

export async function addAgent(c: Ctx, a: { name?: unknown }) {
  person(c)
  const name = text(a.name, "Name", 40)
  const clash = await prisma.member.findFirst({
    where: {
      workspaceId: c.ws,
      removedAt: null,
      name: { equals: name, mode: "insensitive" },
    },
  })
  if (clash) throw new LeanError(`There's already a member called ${name}`)
  await withinPlan(c, "agents")
  return prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: { id: id(), workspaceId: c.ws, kind: "agent", name },
    })
    const key = await mintKey(tx, m.id)
    await record(tx, c, {
      action: "agent.added",
      kind: "member",
      subject: { id: m.id, label: name },
      summary: `Added ${name} as an agent`,
    })
    return { member: toMember(m), key }
  })
}

export async function newKey(c: Ctx, a: { memberId?: unknown }) {
  person(c)
  const m = await prisma.member.findFirst({
    where: {
      id: String(a.memberId),
      workspaceId: c.ws,
      kind: "agent",
      removedAt: null,
    },
  })
  if (!m) throw new LeanError("No such agent", 404)
  // A new key replaces the ones that were never used: each was shown once and
  // never connected, so nothing depends on it. Keys in use stay until revoked.
  await prisma.agentKey.updateMany({
    where: { memberId: m.id, revokedAt: null, lastUsedAt: null },
    data: { revokedAt: new Date() },
  })
  const key = await mintKey(prisma, m.id)
  await note(
    c,
    m,
    "key.created",
    `Made a new key for ${m.name}, ending ${key.slice(-4)}`
  )
  return { key }
}

/** Revoke an agent's keys: the ones never used, or all of them. */
export async function revokeKeys(
  c: Ctx,
  a: { memberId?: unknown; unused?: unknown }
) {
  person(c)
  const m = await prisma.member.findFirst({
    where: {
      id: String(a.memberId),
      workspaceId: c.ws,
      kind: "agent",
      removedAt: null,
    },
  })
  if (!m) throw new LeanError("No such agent", 404)
  const unused = a.unused === true
  const r = await prisma.agentKey.updateMany({
    where: {
      memberId: m.id,
      revokedAt: null,
      ...(unused && { lastUsedAt: null }),
    },
    data: { revokedAt: new Date() },
  })
  if (r.count)
    await note(
      c,
      m,
      "key.revoked",
      unused
        ? `Revoked ${r.count} of ${m.name}'s unused keys`
        : `Revoked all of ${m.name}'s keys`
    )
  return { count: r.count }
}

function note(
  c: Ctx,
  m: { id: string; name: string },
  action: string,
  summary: string
) {
  return record(prisma, c, {
    action,
    kind: "member",
    subject: { id: m.id, label: m.name },
    summary,
  })
}
