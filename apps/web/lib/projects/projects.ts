import "server-only"
import type { Project as ProjectRow } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import type { Project } from "@/lib/sync/types"
import { person, type Ctx } from "@/lib/workspace/context"
import { withinPlan } from "@/lib/billing/billing"
import { record } from "@/lib/log/log"
import { LeanError, id, text } from "@/lib/utils"

export const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  key: r.key,
  name: r.name,
  archived: !!r.archivedAt,
  deleted: !!r.deletedAt,
})

/** A live, open project by id, key ("PRO") or name. Archived ones are out of reach. */
export async function findProject(c: Ctx, ref: unknown): Promise<ProjectRow> {
  const r = text(ref, "project", 80)
  const p = await prisma.project.findFirst({
    where: {
      workspaceId: c.ws,
      deletedAt: null,
      archivedAt: null,
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
    where: { workspaceId: c.ws, deletedAt: null, archivedAt: null },
    orderBy: { createdAt: "asc" },
  })
  return rows.map(toProject)
}

export async function createProject(
  c: Ctx,
  a: { name?: unknown; key?: unknown }
) {
  person(c)
  const name = text(a.name, "Name", 60)
  const key = await freeKey(c, a.key)
  await withinPlan(c, "projects")
  const row = await prisma.project.create({
    data: { id: id(), workspaceId: c.ws, key, name },
  })
  await note(c, row, "created", `Made the ${name} project (${key})`)
  return toProject(row)
}

export async function updateProject(
  c: Ctx,
  a: { project?: unknown; name?: unknown; key?: unknown }
) {
  person(c)
  const p = await findProject(c, a.project)
  const data: { name?: string; key?: string } = {}
  if (a.name !== undefined) data.name = text(a.name, "Name", 60)
  if (a.key !== undefined) {
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
  if (data.name && data.name !== p.name)
    await note(c, row, "renamed", `Renamed ${p.name} to ${data.name}`)
  if (data.key && data.key !== p.key)
    await note(
      c,
      row,
      "rekeyed",
      `Changed ${row.name}'s key from ${p.key} to ${data.key}`
    )
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
  const row = await prisma.project.update({
    where: { id: p.id },
    data: { deletedAt: now, deletedBy: c.me.id, updatedAt: now },
  })
  await note(c, row, "deleted", `Deleted the ${p.name} project (${p.key})`)
  return { ok: true }
}

/**
 * Archive: the project leaves Home and the menus, stops counting toward the
 * plan, and its tasks stop reaching agents. Everything stays, to bring back.
 */
export async function archiveProject(c: Ctx, a: { project?: unknown }) {
  person(c)
  const p = await findProject(c, a.project)
  const open = await prisma.project.count({
    where: { workspaceId: c.ws, deletedAt: null, archivedAt: null },
  })
  if (open <= 1)
    throw new LeanError("Keep one project open. Make another first.")
  const now = new Date()
  const row = await prisma.project.update({
    where: { id: p.id },
    data: { archivedAt: now, archivedBy: c.me.id, updatedAt: now },
  })
  await note(c, row, "archived", `Archived the ${p.name} project (${p.key})`)
  return toProject(row)
}

export async function unarchiveProject(c: Ctx, a: { id?: unknown }) {
  person(c)
  const p = await prisma.project.findFirst({
    where: {
      id: String(a.id),
      workspaceId: c.ws,
      deletedAt: null,
      archivedAt: { not: null },
    },
  })
  if (!p) throw new LeanError("That project isn't archived", 404)
  await withinPlan(c, "projects")
  const row = await prisma.project.update({
    where: { id: p.id },
    data: { archivedAt: null, archivedBy: null, updatedAt: new Date() },
  })
  await note(
    c,
    row,
    "unarchived",
    `Brought back the ${p.name} project (${p.key})`
  )
  return toProject(row)
}

/** Back from the trash, if no live project has taken its key since. */
export async function restoreProject(c: Ctx, a: { id?: unknown }) {
  person(c)
  const p = await prisma.project.findFirst({
    where: { id: String(a.id), workspaceId: c.ws, deletedAt: { not: null } },
  })
  if (!p) throw new LeanError("That project isn't in the trash", 404)
  const taken = await prisma.project.findFirst({
    where: { workspaceId: c.ws, key: p.key, deletedAt: null },
  })
  if (taken)
    throw new LeanError(
      `${p.key} is another project's key now. Change that one first.`
    )
  await withinPlan(c, "projects")
  const row = await prisma.project.update({
    where: { id: p.id },
    data: { deletedAt: null, deletedBy: null, updatedAt: new Date() },
  })
  await note(c, row, "restored", `Restored the ${p.name} project (${p.key})`)
  return toProject(row)
}

function note(
  c: Ctx,
  p: { id: string; key: string },
  action: string,
  summary: string
) {
  return record(prisma, c, {
    action: `project.${action}`,
    kind: "project",
    subject: { id: p.id, label: p.key },
    project: p.id,
    summary,
  })
}
