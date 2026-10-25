import "server-only"
import { prisma, type TxClient } from "@/lib/prisma"
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
  return prisma.$transaction(async (tx) => {
    const m = await tx.member.create({
      data: { id: id(), workspaceId: c.ws, kind: "agent", name },
    })
    return { member: toMember(m), key: await mintKey(tx, m.id) }
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
  return { key: await mintKey(prisma, m.id) }
}

export async function revokeKey(c: Ctx, a: { keyId?: unknown }) {
  person(c)
  const k = await prisma.agentKey.findFirst({
    where: { id: String(a.keyId), member: { workspaceId: c.ws } },
  })
  if (!k) throw new LeanError("No such key", 404)
  await prisma.agentKey.update({
    where: { id: k.id },
    data: { revokedAt: new Date() },
  })
  return { ok: true }
}
