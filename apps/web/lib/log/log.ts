import "server-only"
import type { Log as LogRow, Prisma } from "@prisma/client"
import { prisma, type TxClient } from "@/lib/prisma"
import { findProject } from "@/lib/projects/projects"
import type { LogEntry } from "@/lib/sync/types"
import type { Ctx } from "@/lib/workspace/context"

// The workspace's history (Provida's activity table, the lean version). Every
// write that matters records one line here, through `record`.

/** What a line is about, for the Activity tab's filter. */
export const KINDS = {
  task: "Tasks",
  project: "Projects",
  member: "People and agents",
  workspace: "Workspace",
} as const
export type Kind = keyof typeof KINDS

export const toEntry = (r: LogRow): LogEntry => ({
  id: Number(r.id),
  actorId: r.actorId,
  actorName: r.actorName,
  action: r.action,
  kind: r.subjectType as Kind,
  subjectId: r.subjectId,
  label: r.subjectLabel,
  projectId: r.projectId,
  summary: r.summary,
  createdAt: r.createdAt.toISOString(),
})

/**
 * **Write one line of history.** Pass the transaction the write runs in, so
 * a write that rolls back takes its line with it.
 *
 *     await record(tx, c, {
 *       action: "task.deleted",
 *       kind: "task",
 *       subject: { id: t.id, label: "LEA-12" },
 *       project: t.projectId,
 *       summary: `Deleted LEA-12 "Fix sign in"`,
 *     })
 *
 * The sentence is frozen here, never rebuilt from `action` later: a line
 * should still read true after the code that wrote it has changed.
 */
export async function record(
  db: TxClient,
  /** `me` is null when nobody did it; `by` names what did, like Stripe. */
  c: Pick<Ctx, "ws"> & { me: { id: string; name: string } | null; by?: string },
  e: {
    action: string
    kind: Kind
    subject: { id?: string | null; label: string }
    project?: string | null
    summary: string
  }
) {
  await db.log.create({
    data: {
      workspaceId: c.ws,
      actorId: c.me?.id ?? null,
      actorName: c.me?.name ?? c.by ?? "Leanear",
      action: e.action,
      subjectType: e.kind,
      subjectId: e.subject.id ?? null,
      subjectLabel: e.subject.label,
      projectId: e.project ?? null,
      summary: e.summary,
    },
  })
}

/**
 * Newest first, 50 at a time: `before` is the last id of the page you have.
 * Filter by who did it, what kind of thing it was about, and the project.
 */
export async function listLog(
  c: Ctx,
  a: {
    before?: number | null
    actor?: string | null
    kind?: string | null
    project?: string | null
  }
) {
  const where: Prisma.LogWhereInput = { workspaceId: c.ws }
  if (a.project) where.projectId = (await findProject(c, a.project)).id
  if (a.before) where.id = { lt: BigInt(a.before) }
  if (a.actor) where.actorId = a.actor
  if (a.kind && a.kind in KINDS) where.subjectType = a.kind
  const rows = await prisma.log.findMany({
    where,
    orderBy: { id: "desc" },
    take: 51,
  })
  return {
    entries: rows.slice(0, 50).map(toEntry),
    more: rows.length > 50,
  }
}
