import "server-only"
import { prisma } from "@/lib/prisma"
import { restoreProject } from "@/lib/projects/projects"
import type { TrashItem } from "@/lib/sync/types"
import { restoreTask } from "@/lib/tasks/tasks"
import { person, type Ctx } from "@/lib/workspace/context"
import { LeanError } from "@/lib/utils"

// Deleted tasks and projects stay in the database (that's how a delete
// reaches every open board), so the trash is just them, newest first, with
// a way back. Nothing empties it on its own.

export async function listTrash(c: Ctx): Promise<TrashItem[]> {
  person(c)
  const gone = { workspaceId: c.ws, deletedAt: { not: null } }
  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: gone,
      include: { project: { select: { key: true } } },
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
    prisma.project.findMany({
      where: gone,
      orderBy: { deletedAt: "desc" },
      take: 200,
    }),
  ])
  const items: TrashItem[] = [
    ...tasks.map((t) => ({
      kind: "task" as const,
      id: t.id,
      label: `${t.project.key}-${t.number}`,
      title: t.title,
      projectKey: t.project.key,
      deletedAt: t.deletedAt!.toISOString(),
      deletedBy: t.deletedBy,
    })),
    ...projects.map((p) => ({
      kind: "project" as const,
      id: p.id,
      label: p.key,
      title: p.name,
      projectKey: p.key,
      deletedAt: p.deletedAt!.toISOString(),
      deletedBy: p.deletedBy,
    })),
  ]
  return items.sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
}

export async function restore(c: Ctx, a: { kind?: unknown; id?: unknown }) {
  switch (a.kind) {
    case "task":
      return { task: await restoreTask(c, a) }
    case "project":
      return { project: await restoreProject(c, a) }
  }
  throw new LeanError("Restore a task or a project")
}
