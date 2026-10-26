import "server-only"
import type { Prisma, Activity as ActivityRow } from "@prisma/client"
import { prisma, type TxClient } from "@/lib/prisma"
import { record } from "@/lib/log/log"
import {
  STATUS_NAME,
  TYPE_NAME,
  type Activity,
  type Status,
  type TaskType,
} from "@/lib/sync/types"
import type { Ctx } from "@/lib/workspace/context"

export const toActivity = (r: ActivityRow): Activity => ({
  id: Number(r.id),
  taskId: r.taskId,
  actorId: r.actorId,
  kind: r.kind as Activity["kind"],
  data: (r.data as Record<string, unknown> | null) ?? null,
  body: r.body,
  createdAt: r.createdAt.toISOString(),
})

/** The task a line is about: enough to name it in the workspace's history. */
export type TaskRef = {
  id: string
  projectId: string
  ref: string
  title: string
}

/**
 * One line in a task's history, written by whoever is asking, and the same
 * thing as a sentence in the workspace's history (`lib/log`).
 */
export async function log(
  db: TxClient,
  c: Ctx,
  t: TaskRef,
  kind: Activity["kind"],
  data?: Record<string, unknown>,
  body?: string
) {
  await db.activity.create({
    data: {
      taskId: t.id,
      workspaceId: c.ws,
      actorId: c.me.id,
      kind,
      data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      body: body ?? null,
    },
  })
  await record(db, c, {
    action: `task.${kind}`,
    kind: "task",
    subject: { id: t.id, label: t.ref },
    project: t.projectId,
    summary: await sentence(db, c, t, kind, data ?? {}),
  })
}

async function sentence(
  db: TxClient,
  c: Ctx,
  t: TaskRef,
  kind: Activity["kind"],
  d: Record<string, unknown>
) {
  const name = async (id: unknown) =>
    typeof id === "string"
      ? ((
          await db.member.findFirst({
            where: { id, workspaceId: c.ws },
            select: { name: true },
          })
        )?.name ?? "someone")
      : null
  switch (kind) {
    case "created":
      return `Added ${t.ref} "${t.title}"`
    case "moved":
      return `Moved ${t.ref} to ${STATUS_NAME[d.to as Status] ?? d.to}`
    case "assigned":
      return d.to
        ? d.to === c.me.id
          ? `Took ${t.ref}`
          : `Gave ${t.ref} to ${await name(d.to)}`
        : `Unassigned ${t.ref}`
    case "renamed":
      return `Renamed ${t.ref} to "${d.to}"`
    case "retyped":
      return `Made ${t.ref} a ${TYPE_NAME[d.to as TaskType] ?? d.to}`
    case "notes":
      return `Edited the notes on ${t.ref}`
    case "commented":
      return `Commented on ${t.ref}`
  }
}

export async function taskActivity(c: Ctx, taskId: string) {
  const rows = await prisma.activity.findMany({
    where: { taskId, workspaceId: c.ws },
    orderBy: { id: "asc" },
  })
  return rows.map(toActivity)
}
