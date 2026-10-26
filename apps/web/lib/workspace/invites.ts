import "server-only"
import { withinPlan } from "@/lib/billing/billing"
import { origin } from "@/lib/auth/session"
import { inviteMail, mailOn, sendMail } from "@/lib/email/send"
import { record } from "@/lib/log/log"
import { prisma } from "@/lib/prisma"
import { LeanError, id, text, token } from "@/lib/utils"
import { owner, type Ctx } from "./context"
import { displayName } from "./workspace"

const usable = (tok: string) => ({
  token: tok,
  revokedAt: null,
  expiresAt: { gt: new Date() },
})

/**
 * An invite: a link that works for 7 days. With an email (and Resend set up)
 * it's also sent there; the link is the invite either way.
 */
export async function createInvite(c: Ctx, a: { email?: unknown } = {}) {
  owner(c)
  const email =
    a.email === undefined || a.email === "" ? null : text(a.email, "Email", 200)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new LeanError("That doesn't look like an email address")
  if (email && !mailOn())
    throw new LeanError("Email is off on this server. Copy the link instead.")
  const row = await prisma.invite.create({
    data: {
      id: id(),
      workspaceId: c.ws,
      token: token(18),
      createdBy: c.me.id,
      email,
      expiresAt: new Date(Date.now() + 7 * 864e5),
    },
  })
  const link = `${await origin()}/join/${row.token}`
  // The invite stands even if the email doesn't go; the link is shown either way.
  let mailError: string | null = null
  if (email) {
    const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: c.ws } })
    try {
      await sendMail({
        to: email,
        ...inviteMail({ from: c.me.name, workspace: ws.name, link }),
      })
    } catch (e) {
      mailError =
        e instanceof LeanError
          ? e.message
          : "The email didn't send. The link still works."
      if (!(e instanceof LeanError)) console.error("invite mail", e)
    }
  }
  await record(prisma, c, {
    action: "invite.created",
    kind: "member",
    subject: { id: row.id, label: email ?? "Invite link" },
    summary: email ? `Invited ${email}` : "Made an invite link",
  })
  return {
    id: row.id,
    token: row.token,
    email,
    sent: !!email && !mailError,
    mailError,
    expiresAt: row.expiresAt.toISOString(),
  }
}

export async function revokeInvite(c: Ctx, a: { inviteId?: unknown }) {
  owner(c)
  const r = await prisma.invite.updateMany({
    where: { id: String(a.inviteId), workspaceId: c.ws, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  if (r.count)
    await record(prisma, c, {
      action: "invite.revoked",
      kind: "member",
      subject: { id: String(a.inviteId), label: "Invite link" },
      summary: "Revoked an invite link",
    })
  return { ok: true }
}

/** The workspace an invite link names, for the sign-in page. Null once it's no good. */
export async function inviteInfo(tok: string) {
  const inv = await prisma.invite.findFirst({
    where: usable(tok),
    select: { workspace: { select: { name: true } } },
  })
  return inv ? { name: inv.workspace.name } : null
}

type User = { id: string; name: string; email: string; image?: string | null }

/**
 * Join a workspace by invite. Returns its id, null if the invite is no good,
 * or "full" when Cloud's 20 people are already in.
 */
export async function acceptInvite(user: User, tok: string) {
  const inv = await prisma.invite.findFirst({ where: usable(tok) })
  if (!inv) return null
  const existing = await prisma.member.findFirst({
    where: { workspaceId: inv.workspaceId, userId: user.id },
  })
  if (!existing || existing.removedAt) {
    try {
      await withinPlan({ ws: inv.workspaceId }, "people")
    } catch {
      return "full" as const
    }
  }
  let joined = existing && !existing.removedAt ? null : existing
  if (existing) {
    if (existing.removedAt)
      await prisma.member.update({
        where: { id: existing.id },
        data: { removedAt: null, updatedAt: new Date() },
      })
  } else {
    joined = await prisma.member.create({
      data: {
        id: id(),
        workspaceId: inv.workspaceId,
        kind: "person",
        userId: user.id,
        name: displayName(user),
        avatarUrl: user.image ?? null,
      },
    })
  }
  if (joined)
    await record(
      prisma,
      { ws: inv.workspaceId, me: joined },
      {
        action: "member.joined",
        kind: "member",
        subject: { id: joined.id, label: joined.name },
        summary: "Joined the workspace",
      }
    )
  return inv.workspaceId
}
