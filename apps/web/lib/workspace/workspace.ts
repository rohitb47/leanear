import "server-only"
import { record } from "@/lib/log/log"
import { prisma } from "@/lib/prisma"
import type { SettingsData } from "@/lib/sync/types"
import { id, text } from "@/lib/utils"
import { person, type Ctx } from "./context"

type User = { id: string; name: string; email: string; image?: string | null }

/** GitHub accounts without a display name fall back to the email. */
export const displayName = (user: User) =>
  user.name.trim() || user.email.split("@")[0]

/** A first workspace for someone signing in with nowhere to go. */
export async function newWorkspace(user: User) {
  const ws = id()
  const name = displayName(user)
  const first = name.split(/\s+/)[0]
  await prisma.workspace.create({
    data: {
      id: ws,
      name: `${first}'s workspace`,
      members: {
        create: {
          id: id(),
          kind: "person",
          userId: user.id,
          name,
          avatarUrl: user.image ?? null,
          role: "owner",
        },
      },
    },
  })
  return ws
}

export async function renameWorkspace(c: Ctx, a: { name?: unknown }) {
  person(c)
  const name = text(a.name, "Name", 60)
  await prisma.workspace.update({ where: { id: c.ws }, data: { name } })
  await record(prisma, c, {
    action: "workspace.renamed",
    kind: "workspace",
    subject: { id: c.ws, label: name },
    summary: `Renamed the workspace to ${name}`,
  })
  return { ok: true, name }
}

/** Live agent keys, and the owner's open invites. */
export async function settingsData(c: Ctx): Promise<SettingsData> {
  person(c)
  const keys = await prisma.agentKey.findMany({
    where: { member: { workspaceId: c.ws }, revokedAt: null },
    orderBy: { createdAt: "asc" },
  })
  const invites =
    c.me.role === "owner"
      ? await prisma.invite.findMany({
          where: {
            workspaceId: c.ws,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        })
      : []
  return {
    keys: keys.map((k) => ({
      id: k.id,
      memberId: k.memberId,
      hint: k.hint,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
    invites: invites.map((i) => ({
      id: i.id,
      token: i.token,
      expiresAt: i.expiresAt.toISOString(),
    })),
  }
}
