import "server-only"
import { prisma } from "@/lib/prisma"
import { createProject, findProject } from "@/lib/projects/projects"
import { createTask } from "@/lib/tasks/tasks"
import { addAgent } from "@/lib/workspace/agents"
import type { Ctx } from "@/lib/workspace/context"
import { LeanError } from "@/lib/utils"

// God mode, as in Provida: resetting and filling the local database from
// inside the app. It exists only under `next dev` on a local database; every
// door to it (the menu row, the view, each procedure) asks `isGodMode` first.

/** Database hosts God mode may touch. An allowlist: anything else turns it off. */
const LOCAL = ["localhost", "127.0.0.1"]

export function isGodMode() {
  if (process.env.NODE_ENV !== "development") return false
  try {
    return LOCAL.includes(new URL(process.env.DATABASE_URL ?? "").hostname)
  } catch {
    return false
  }
}

export function mustBeGod() {
  if (!isGodMode()) throw new LeanError("Not found", 404)
}

export async function devStats(c: Ctx) {
  const ws = { workspaceId: c.ws }
  const [projects, tasks, log, trash, agents, keys, unused] = await Promise.all(
    [
      prisma.project.count({ where: { ...ws, deletedAt: null } }),
      prisma.task.count({ where: { ...ws, deletedAt: null } }),
      prisma.log.count({ where: ws }),
      Promise.all([
        prisma.task.count({ where: { ...ws, deletedAt: { not: null } } }),
        prisma.project.count({ where: { ...ws, deletedAt: { not: null } } }),
      ]).then((n) => n.reduce((a, b) => a + b, 0)),
      prisma.member.count({ where: { ...ws, kind: "agent", removedAt: null } }),
      prisma.agentKey.count({
        where: { member: { workspaceId: c.ws }, revokedAt: null },
      }),
      prisma.agentKey.count({
        where: {
          member: { workspaceId: c.ws },
          revokedAt: null,
          lastUsedAt: null,
        },
      }),
    ]
  )
  return { projects, tasks, log, trash, agents, keys, unused }
}

// A board that looks like a week of real work: some for you, some for the agent.
const TASKS: [
  string,
  "bug" | "feature" | "idea",
  "backlog" | "todo" | "doing" | "done",
  "me" | "agent",
][] = [
  ["Sign in with GitHub on the landing page", "feature", "done", "me"],
  ["Dark mode follows the system", "feature", "done", "agent"],
  ["Board loads in one request", "feature", "done", "agent"],
  ["Drag cards between columns", "feature", "doing", "me"],
  ["MCP server: next_task", "feature", "doing", "agent"],
  ["Login loops on Safari", "bug", "todo", "agent"],
  ["Paste screenshots into notes", "feature", "todo", "me"],
  ["Search finds tasks by id", "feature", "todo", "agent"],
  ["Comment threads collapse after three", "idea", "backlog", "me"],
  ["Export a project as Markdown", "idea", "backlog", "agent"],
  ["Public changelog from Done tasks", "idea", "backlog", "me"],
  ["Empty states for every column", "feature", "backlog", "agent"],
]

async function agentCtx(c: Ctx): Promise<Ctx> {
  const found = await prisma.member.findFirst({
    where: { workspaceId: c.ws, kind: "agent", removedAt: null },
    orderBy: { updatedAt: "asc" },
  })
  if (found) return { ws: c.ws, me: found }
  const made = await addAgent(c, { name: "Claude" })
  const me = await prisma.member.findUniqueOrThrow({
    where: { id: made.member.id },
  })
  return { ws: c.ws, me }
}

/** A test project with an agent and a dozen tasks. */
export async function fill(c: Ctx) {
  let key = "DEMO"
  for (
    let n = 2;
    await prisma.project.findFirst({
      where: { workspaceId: c.ws, key, deletedAt: null },
    });
    n++
  )
    key = `DEM${String.fromCharCode(64 + n)}`
  const p = await createProject(c, {
    name: key === "DEMO" ? "Demo" : `Demo ${key}`,
    key,
  })
  const agent = await agentCtx(c)
  for (const [title, type, status, who] of [...TASKS].reverse())
    await createTask(who === "agent" ? agent : c, {
      project: p.id,
      title,
      type,
      status,
      assignee: who === "agent" ? agent.me.id : c.me.id,
    })
  return { key: p.key }
}

/** Ten more tasks in a project, spread over the columns. */
export async function addTasks(c: Ctx, a: { project?: unknown }) {
  const p = await findProject(c, a.project)
  const statuses = ["backlog", "todo", "doing", "done"] as const
  for (let i = 0; i < 10; i++)
    await createTask(c, {
      project: p.id,
      title: `Test task ${i + 1}`,
      type: (["bug", "feature", "idea"] as const)[i % 3],
      status: statuses[i % 4],
    })
  return { ok: true }
}

/** Gone for good, not to the trash: the project's tasks and their history. */
export async function clearTasks(c: Ctx, a: { project?: unknown }) {
  const p = await findProject(c, a.project)
  await prisma.task.deleteMany({ where: { projectId: p.id } })
  await prisma.project.update({
    where: { id: p.id },
    data: { seq: 0, updatedAt: new Date() },
  })
  return { ok: true }
}

export async function clearLog(c: Ctx) {
  await prisma.log.deleteMany({ where: { workspaceId: c.ws } })
  return { ok: true }
}

/** Everything in the trash, deleted for good. */
export async function emptyTrash(c: Ctx) {
  const gone = { workspaceId: c.ws, deletedAt: { not: null } }
  await prisma.task.deleteMany({ where: gone })
  await prisma.project.deleteMany({ where: gone })
  return { ok: true }
}

/** Keys that were made and never used, like the ones a failed setup leaves. */
export async function revokeUnused(c: Ctx) {
  const r = await prisma.agentKey.updateMany({
    where: { member: { workspaceId: c.ws }, revokedAt: null, lastUsedAt: null },
    data: { revokedAt: new Date() },
  })
  return { count: r.count }
}

/** Pretend Stripe said yes, or no, to see the plan screen without paying. */
export async function setPaid(c: Ctx, a: { paid: boolean }) {
  await prisma.workspace.update({
    where: { id: c.ws },
    data: a.paid
      ? {
          billingStatus: "active",
          paidUntil: new Date(Date.now() + 30 * 864e5),
          cancelsAtEnd: false,
        }
      : { billingStatus: null, paidUntil: null, subscription: null },
  })
  return { ok: true }
}

/**
 * Back to a first sign-in: every project, task, line of history,
 * screenshot, agent and invite in this workspace, gone. You stay.
 */
export async function wipe(c: Ctx) {
  const ws = { workspaceId: c.ws }
  await prisma.$transaction([
    prisma.project.deleteMany({ where: ws }),
    prisma.log.deleteMany({ where: ws }),
    prisma.image.deleteMany({ where: ws }),
    prisma.invite.deleteMany({ where: ws }),
    prisma.member.deleteMany({ where: { ...ws, kind: "agent" } }),
  ])
  return { ok: true }
}
