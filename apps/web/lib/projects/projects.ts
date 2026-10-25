import "server-only"
import type { Project as ProjectRow } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { Project } from "@/lib/sync/types"
import { person, type Ctx } from "@/lib/workspace/context"
import { LeanError, id, text } from "@/lib/utils"

export const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  key: r.key,
  name: r.name,
  brief: r.brief,
  deleted: !!r.deletedAt,
})

/** A live project by id, key ("PRO") or name. */
export async function findProject(c: Ctx, ref: unknown): Promise<ProjectRow> {
  const r = text(ref, "project", 80)
  const p = await prisma.project.findFirst({
    where: {
      workspaceId: c.ws,
      deletedAt: null,
      OR: [
        { id: r },
        { key: r.toUpperCase() },
        { name: { equals: r, mode: "insensitive" } },
      ],
    },
  })
  if (!p)
    throw new LeanError(
      `No project "${r}". Call list_projects to see the keys.`,
      404
    )
  return p
}

const KEY = /^[A-Z]{2,5}$/

/** A key that is 2 to 5 letters and free among the workspace's live projects. */
async function freeKey(c: Ctx, v: unknown) {
  const key = text(v, "Key", 5).toUpperCase()
  if (!KEY.test(key)) throw new LeanError("A key is 2 to 5 letters, like PRO")
  const taken = await prisma.project.findFirst({
    where: { workspaceId: c.ws, key, deletedAt: null },
  })
  if (taken) throw new LeanError(`${key} is already a project here`)
  return key
}

export async function listProjects(c: Ctx) {
  const rows = await prisma.project.findMany({
    where: { workspaceId: c.ws, deletedAt: null },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(toProject)
}

export async function createProject(
  c: Ctx,
  a: { name?: unknown; key?: unknown; brief?: unknown }
) {
  person(c)
  const name = text(a.name, "Name", 60)
  const key = await freeKey(c, a.key)
  const brief = text(a.brief, "Brief", 50_000, false)
  const row = await prisma.project.create({
    data: { id: id(), workspaceId: c.ws, key, name, brief },
  })
  return toProject(row)
}

export async function updateProject(
  c: Ctx,
  a: { project?: unknown; name?: unknown; key?: unknown; brief?: unknown }
) {
  const p = await findProject(c, a.project)
  const data: { name?: string; brief?: string; key?: string } = {}
  if (a.name !== undefined) {
    person(c)
    data.name = text(a.name, "Name", 60)
  }
  if (a.brief !== undefined) data.brief = text(a.brief, "Brief", 50_000, false)
  if (a.key !== undefined) {
    person(c)
    const key = text(a.key, "Key", 5).toUpperCase()
    if (key !== p.key) {
      if (p.seq > 0)
        throw new LeanError("The key is fixed once a project has tasks")
      data.key = await freeKey(c, key)
    }
  }
  const row = await prisma.project.update({
    where: { id: p.id },
    data: { ...data, updatedAt: new Date() },
  })
  return toProject(row)
}

export async function deleteProject(c: Ctx, a: { project?: unknown }) {
  person(c)
  const p = await findProject(c, a.project)
  const live = await prisma.task.findFirst({
    where: { projectId: p.id, deletedAt: null },
  })
  if (live) throw new LeanError("Move or delete its tasks first")
  const now = new Date()
  await prisma.project.update({
    where: { id: p.id },
    data: { deletedAt: now, updatedAt: now },
  })
  return { ok: true }
}

export async function getBrief(c: Ctx, a: { project?: unknown }) {
  const p = await findProject(c, a.project)
  return { project: p.key, name: p.name, brief: p.brief }
}
