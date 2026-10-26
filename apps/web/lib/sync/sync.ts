import "server-only"
import { prisma } from "@/lib/prisma"
import { toProject } from "@/lib/projects/projects"
import { toActivity } from "@/lib/tasks/activity"
import { taskActivity } from "@/lib/tasks/activity"
import { toTask } from "@/lib/tasks/tasks"
import type { Ctx } from "@/lib/workspace/context"
import { toMember } from "@/lib/workspace/members"
import { LeanError } from "@/lib/utils"
import type { Sync } from "./types"

/**
 * Everything that changed since the cursor. With no cursor, the whole live
 * workspace. A 10 second overlap covers writes that committed late; the
 * client applies rows idempotently.
 */
export async function sync(
  c: Ctx,
  since: string | null,
  openTask?: string | null
): Promise<Sync> {
  const cursor = new Date().toISOString()
  const after = since ? new Date(new Date(since).getTime() - 10_000) : null
  if (after && Number.isNaN(after.getTime())) throw new LeanError("Bad cursor")

  const changed = after ? { updatedAt: { gt: after } } : { deletedAt: null }
  const [m, p, t, r] = await Promise.all([
    prisma.member.findMany({
      where: { workspaceId: c.ws, ...(after && { updatedAt: { gt: after } }) },
    }),
    prisma.project.findMany({ where: { workspaceId: c.ws, ...changed } }),
    prisma.task.findMany({ where: { workspaceId: c.ws, ...changed } }),
    // Only since the real cursor, not the overlap, so a line shows once.
    since
      ? prisma.activity.findMany({
          where: {
            workspaceId: c.ws,
            actorId: { not: c.me.id },
            createdAt: { gt: new Date(since) },
          },
          orderBy: { id: "asc" },
          take: 20,
        })
      : [],
  ])
  const out: Sync = {
    cursor,
    members: m.map(toMember),
    projects: p.map(toProject),
    tasks: t.map(toTask),
    recent: r.map(toActivity),
  }
  if (openTask && (!after || t.some((x) => x.id === openTask))) {
    out.activity = { taskId: openTask, items: await taskActivity(c, openTask) }
  }
  return out
}
