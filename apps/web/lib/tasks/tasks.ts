import "server-only"
import type { Member, Prisma, Task as TaskRow } from "@prisma/client"
import { prisma, type TxClient } from "@/lib/prisma"
import { findProject } from "@/lib/projects/projects"
import {
  ALL_STATUSES,
  TYPES,
  type Activity,
  type Status,
  type Task,
  type TaskType,
} from "@/lib/sync/types"
import { person, type Ctx } from "@/lib/workspace/context"
import { findMember } from "@/lib/workspace/members"
import { LeanError, id, text } from "@/lib/utils"
import { log, taskActivity } from "./activity"

export const toTask = (r: TaskRow): Task => ({
  id: r.id,
  projectId: r.projectId,
  number: r.number,
  title: r.title,
  notes: r.notes,
  type: r.type,
  status: r.status,
  assigneeId: r.assigneeId,
  position: r.position,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
  deleted: !!r.deletedAt,
})

function status(v: unknown): Status {
  const s = String(v ?? "").toLowerCase() as Status
  if (!ALL_STATUSES.includes(s))
    throw new LeanError(`Status must be one of ${ALL_STATUSES.join(", ")}`)
  return s
}

function type(v: unknown): TaskType {
  const s = String(v ?? "").toLowerCase() as TaskType
  if (!TYPES.includes(s))
    throw new LeanError(`Type must be one of ${TYPES.join(", ")}`)
  return s
}

const live = (c: Pick<Ctx, "ws">) => ({
  workspaceId: c.ws,
  deletedAt: null,
  project: { deletedAt: null },
})

/** A live task by its ref ("PRO-12") or its internal id. */
export async function findTask(c: Pick<Ctx, "ws">, ref: unknown) {
  const r = text(ref, "id", 80)
  const m = /^([A-Za-z]{2,5})-(\d+)$/.exec(r)
  const t = await prisma.task.findFirst({
    where: {
      ...live(c),
      ...(m
        ? {
            number: Number(m[2]),
            project: { key: m[1].toUpperCase(), deletedAt: null },
          }
        : { id: r }),
    },
    include: { project: { select: { key: true } } },
  })
  if (!t) throw new LeanError(`No task ${r}`, 404)
  return t
}

const withRef = (t: TaskRow, key: string) => ({
  ...toTask(t),
  ref: `${key}-${t.number}`,
})

/** Just above the top card of a column. */
async function topOf(db: TxClient, projectId: string, s: Status) {
  const r = await db.task.aggregate({
    where: { projectId, status: s, deletedAt: null },
    _min: { position: true },
  })
  return r._min.position === null ? 0 : r._min.position - 1
}

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v)

export async function createTask(
  c: Ctx,
  a: {
    project?: unknown
    title?: unknown
    notes?: unknown
    type?: unknown
    status?: unknown
    assignee?: unknown
    position?: unknown
  }
) {
  const p = await findProject(c, a.project)
  const title = text(a.title, "Title", 200)
  const notes = text(a.notes, "Notes", 50_000, false)
  const ty = a.type === undefined ? "feature" : type(a.type)
  const st = a.status === undefined ? "todo" : status(a.status)
  const who = a.assignee === undefined ? null : await findMember(c, a.assignee)
  return prisma.$transaction(async (tx) => {
    const { seq } = await tx.project.update({
      where: { id: p.id },
      data: { seq: { increment: 1 } },
      select: { seq: true },
    })
    const row = await tx.task.create({
      data: {
        id: id(),
        projectId: p.id,
        workspaceId: c.ws,
        number: seq,
        title,
        notes,
        type: ty,
        status: st,
        assigneeId: who?.id ?? null,
        position: finite(a.position) ? a.position : await topOf(tx, p.id, st),
        createdBy: c.me.id,
      },
    })
    await log(tx, c, row.id, "created", who ? { assignee: who.id } : undefined)
    return withRef(row, p.key)
  })
}

export async function updateTask(
  c: Ctx,
  a: {
    id?: unknown
    title?: unknown
    notes?: unknown
    type?: unknown
    assignee?: unknown
  }
) {
  const t = await findTask(c, a.id)
  const data: Prisma.TaskUncheckedUpdateInput = {}
  const logs: [Activity["kind"], Record<string, unknown>][] = []
  if (a.title !== undefined) {
    const v = text(a.title, "Title", 200)
    if (v !== t.title) {
      data.title = v
      logs.push(["renamed", { from: t.title, to: v }])
    }
  }
  if (a.notes !== undefined) {
    const v = text(a.notes, "Notes", 50_000, false)
    if (v !== t.notes) {
      data.notes = v
      logs.push(["notes", { prev: t.notes }])
    }
  }
  if (a.type !== undefined) {
    const v = type(a.type)
    if (v !== t.type) {
      data.type = v
      logs.push(["retyped", { from: t.type, to: v }])
    }
  }
  if (a.assignee !== undefined) {
    const v = (await findMember(c, a.assignee))?.id ?? null
    if (v !== t.assigneeId) {
      data.assigneeId = v
      logs.push(["assigned", { to: v }])
    }
  }
  if (!logs.length) return withRef(t, t.project.key)
  return prisma.$transaction(async (tx) => {
    const row = await tx.task.update({
      where: { id: t.id },
      data: { ...data, updatedAt: new Date() },
    })
    for (const [k, d] of logs) await log(tx, c, t.id, k, d)
    return withRef(row, t.project.key)
  })
}

export async function moveTask(
  c: Ctx,
  a: { id?: unknown; status?: unknown; position?: unknown; comment?: unknown }
) {
  const t = await findTask(c, a.id)
  const st = a.status === undefined ? t.status : status(a.status)
  const body = text(a.comment, "Comment", 20_000, false)
  return prisma.$transaction(async (tx) => {
    const position = finite(a.position)
      ? a.position
      : st !== t.status
        ? await topOf(tx, t.projectId, st)
        : t.position
    const row = await tx.task.update({
      where: { id: t.id },
      data: { status: st, position, updatedAt: new Date() },
    })
    if (st !== t.status)
      await log(tx, c, t.id, "moved", { from: t.status, to: st })
    if (body) await log(tx, c, t.id, "commented", undefined, body)
    return withRef(row, t.project.key)
  })
}

/** Post on a task. Mentioning a member by name (@Claude) hands the task to them. */
export async function comment(c: Ctx, a: { id?: unknown; body?: unknown }) {
  const t = await findTask(c, a.id)
  const body = text(a.body, "Comment", 20_000)
  const all = await prisma.member.findMany({
    where: { workspaceId: c.ws, removedAt: null },
  })
  const lower = body.toLowerCase()
  let handTo: Member | null = null
  for (const m of [...all].sort((x, y) => y.name.length - x.name.length)) {
    const at = lower.indexOf("@" + m.name.toLowerCase())
    if (at === -1) continue
    const after = lower[at + 1 + m.name.length]
    if (after === undefined || !/[\p{L}\p{N}]/u.test(after)) {
      handTo = m
      break
    }
  }
  return prisma.$transaction(async (tx) => {
    await log(tx, c, t.id, "commented", undefined, body)
    const hand = handTo && handTo.id !== t.assigneeId
    if (hand) await log(tx, c, t.id, "assigned", { to: handTo!.id })
    const row = await tx.task.update({
      where: { id: t.id },
      data: {
        ...(hand && { assigneeId: handTo!.id }),
        updatedAt: new Date(),
      },
    })
    return { ...withRef(row, t.project.key), handedTo: handTo?.name ?? null }
  })
}

export async function deleteTask(c: Ctx, a: { id?: unknown }) {
  person(c)
  const t = await findTask(c, a.id)
  const now = new Date()
  await prisma.task.update({
    where: { id: t.id },
    data: { deletedAt: now, updatedAt: now },
  })
  return { ok: true, ref: `${t.project.key}-${t.number}` }
}

export async function getTask(c: Ctx, a: { id?: unknown }) {
  const t = await findTask(c, a.id)
  return {
    task: withRef(t, t.project.key),
    activity: await taskActivity(c, t.id),
  }
}

/** Doing first, then Todo, Backlog, Done and Canceled. */
const ORDER: Status[] = ["doing", "todo", "backlog", "done", "canceled"]

export async function listTasks(
  c: Ctx,
  a: {
    project?: unknown
    status?: unknown
    type?: unknown
    assignee?: unknown
    q?: unknown
    limit?: unknown
  }
) {
  const where: Prisma.TaskWhereInput = { ...live(c) }
  if (a.project !== undefined && a.project !== null && a.project !== "")
    where.projectId = (await findProject(c, a.project)).id
  where.status = a.status ? status(a.status) : { not: "canceled" }
  if (a.type) where.type = type(a.type)
  if (a.assignee !== undefined && a.assignee !== "")
    where.assigneeId = (await findMember(c, a.assignee))?.id ?? null
  if (typeof a.q === "string" && a.q.trim()) {
    const q = a.q.trim()
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ]
  }
  const limit = Math.min(200, Math.max(1, Number(a.limit) || 50))
  const rows = await prisma.task.findMany({
    where,
    include: { project: { select: { key: true } } },
    orderBy: { position: "asc" },
  })
  return rows
    .sort(
      (x, y) =>
        x.project.key.localeCompare(y.project.key) ||
        ORDER.indexOf(x.status) - ORDER.indexOf(y.status)
    )
    .slice(0, limit)
    .map((r) => withRef(r, r.project.key))
}

/** The top Todo assigned to the caller. */
export async function nextTask(c: Ctx, a: { project?: unknown }) {
  const t = await prisma.task.findFirst({
    where: {
      ...live(c),
      status: "todo",
      assigneeId: c.me.id,
      ...(a.project ? { projectId: (await findProject(c, a.project)).id } : {}),
    },
    include: { project: { select: { key: true, name: true } } },
    orderBy: { position: "asc" },
  })
  if (!t) return null
  return {
    task: withRef(t, t.project.key),
    project: { key: t.project.key, name: t.project.name },
  }
}
