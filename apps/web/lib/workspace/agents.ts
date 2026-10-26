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
  const key = await mintKey(prisma, m.id)
  await note(
    c,
    m,
    "key.created",
    `Made a new key for ${m.name}, ending ${key.slice(-4)}`
  )
  return { key }
}

export async function revokeKey(c: Ctx, a: { keyId?: unknown }) {
  person(c)
  const k = await prisma.agentKey.findFirst({
    where: { id: String(a.keyId), member: { workspaceId: c.ws } },
    include: { member: true },
  })
  if (!k) throw new LeanError("No such key", 404)
  await prisma.agentKey.update({
    where: { id: k.id },
    data: { revokedAt: new Date() },
  })
  await note(
    c,
    k.member,
    "key.revoked",
    `Revoked ${k.member.name}'s key ending ${k.hint}`
  )
  return { ok: true }
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
