import "server-only"
import type { Prisma, Activity as ActivityRow } from "@prisma/client"
import { prisma, type TxClient } from "@/lib/prisma"
import type { Activity } from "@/lib/sync/types"
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

/** One line in a task's history, written by whoever is asking. */
export async function log(
  db: TxClient,
  c: Ctx,
  taskId: string,
  kind: Activity["kind"],
  data?: Record<string, unknown>,
  body?: string
) {
  await db.activity.create({
    data: {
      taskId,
      workspaceId: c.ws,
      actorId: c.me.id,
      kind,
      data: (data ?? undefined) as Prisma.InputJsonValue | undefined,
      body: body ?? null,
    },
  })
}

export async function taskActivity(c: Ctx, taskId: string) {
  const rows = await prisma.activity.findMany({
    where: { taskId, workspaceId: c.ws },
    orderBy: { id: "asc" },
  })
  return rows.map(toActivity)
}
