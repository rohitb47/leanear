import "server-only"
import { origin } from "@/lib/auth/session"
import { listProjects } from "@/lib/projects/projects"
import {
  STATUS_NAME,
  TYPE_NAME,
  type Activity,
  type Task,
} from "@/lib/sync/types"
import { saveImage } from "@/lib/tasks/images"
import {
  comment,
  createTask,
  getTask,
  listTasks,
  moveTask,
  nextTask,
  updateTask,
} from "@/lib/tasks/tasks"
import type { Ctx } from "@/lib/workspace/context"
import { memberNames } from "@/lib/workspace/members"
import { LeanError } from "@/lib/utils"

// The tools an agent gets over MCP. Each one calls the same lib/ functions the
// app's procedures do, as the agent the key belongs to.

export const INSTRUCTIONS = `Leanear is this team's single source of truth for what's happening in each product.
You are a member of the workspace. To work through your tasks:
1. Call next_task. If there is none, say so and stop.
2. move_task to "doing" when you start.
3. Do the work, following the repo's own CLAUDE.md. Keep the notes current with update_task if the plan changes.
4. comment what you did and how you checked it, then move_task to "done".
If you're blocked or need a decision, ask in a comment and update_task the assignee back to a person.
Create tasks for follow-ups you find instead of doing unasked work.`

type Json = Record<string, unknown>
const str = (description: string) => ({ type: "string", description })
const STATUS = {
  type: "string",
  enum: ["backlog", "todo", "doing", "done", "canceled"],
}
const TYPE = { type: "string", enum: ["bug", "feature", "idea"] }

export const TOOLS = [
  {
    name: "list_projects",
    description: "Your workspace's projects and their keys.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "next_task",
    description:
      "The top Todo task assigned to you, with its notes and activity. Empty when there's nothing to do.",
    inputSchema: {
      type: "object",
      properties: { project: str("Only this project (key). Optional.") },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_tasks",
    description:
      "Tasks filtered by project, status, type, assignee or words. Canceled tasks are left out unless you ask for that status.",
    inputSchema: {
      type: "object",
      properties: {
        project: str("Project key"),
        status: STATUS,
        type: TYPE,
        assignee: str('A member\'s name, "me", or "none"'),
        q: str("Words in the title or notes"),
        limit: { type: "number", description: "Up to 200, default 50" },
      },
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_task",
    description: "One task with its notes, screenshots and activity.",
    inputSchema: {
      type: "object",
      properties: { id: str("Task id, like PRO-12") },
      required: ["id"],
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "create_task",
    description: "A new task. It lands at the top of its column.",
    inputSchema: {
      type: "object",
      properties: {
        project: str("Project key"),
        title: str("Short and specific"),
        notes: str("Markdown: what and why, steps to reproduce, acceptance"),
        type: TYPE,
        status: { ...STATUS, description: "Default todo" },
        assignee: str('A member\'s name, "me", or "none"'),
      },
      required: ["project", "title"],
    },
  },
  {
    name: "update_task",
    description:
      "Change a task's title, notes, type or assignee. Notes edits keep their history.",
    inputSchema: {
      type: "object",
      properties: {
        id: str("Task id"),
        title: str("New title"),
        notes: str("The whole new notes, Markdown"),
        type: TYPE,
        assignee: str('A member\'s name, "me", or "none"'),
      },
      required: ["id"],
    },
  },
  {
    name: "move_task",
    description: "Give a task a new status, with an optional comment.",
    inputSchema: {
      type: "object",
      properties: {
        id: str("Task id"),
        status: STATUS,
        comment: str("Optional, Markdown"),
      },
      required: ["id", "status"],
    },
  },
  {
    name: "comment",
    description:
      "Post on a task. Mention a member with @Name to hand the task to them.",
    inputSchema: {
      type: "object",
      properties: { id: str("Task id"), body: str("Markdown") },
      required: ["id", "body"],
    },
  },
  {
    name: "attach_image",
    description:
      "Upload a screenshot (base64) to a task. Returns a Markdown image link to put in notes or a comment.",
    inputSchema: {
      type: "object",
      properties: {
        id: str("Task id"),
        data: str("Base64 image bytes, no data: prefix"),
        mime: {
          type: "string",
          enum: ["image/png", "image/jpeg", "image/gif", "image/webp"],
        },
      },
      required: ["id", "data", "mime"],
    },
  },
]

type C = Ctx
type T = Task & { ref: string }

const names = memberNames
const ago = (iso: string) => iso.slice(0, 16).replace("T", " ") + " UTC"

function line(t: T, who: Map<string, string>) {
  const a = t.assigneeId ? (who.get(t.assigneeId) ?? "someone") : "no one"
  return `${t.ref} · ${STATUS_NAME[t.status]} · ${TYPE_NAME[t.type]} · ${a} · ${t.title}`
}

function describe(a: Activity, who: Map<string, string>) {
  const d = (a.data ?? {}) as Record<string, string | null>
  const n = (id: string | null | undefined) =>
    id ? (who.get(id) ?? "someone") : "no one"
  switch (a.kind) {
    case "created":
      return "created this"
    case "moved":
      return `moved it to ${STATUS_NAME[d.to as Task["status"]] ?? d.to}`
    case "assigned":
      return `assigned it to ${n(d.to)}`
    case "renamed":
      return `renamed it from "${d.from}"`
    case "retyped":
      return `changed the type to ${d.to}`
    case "notes":
      return "edited the notes"
    case "commented":
      return `commented:\n${a.body}`
  }
}

async function full(c: C, t: T, act: Activity[]) {
  const who = await names(c, [
    t.assigneeId,
    ...act.map((x) => x.actorId),
    ...act.map((x) => (x.data?.to as string) ?? null),
  ])
  const base = await origin()
  const notes = t.notes.replace(/\]\(\/i\//g, `](${base}/i/`)
  return [
    `# ${t.ref}: ${t.title}`,
    `Status: ${STATUS_NAME[t.status]} · Type: ${TYPE_NAME[t.type]} · Assignee: ${t.assigneeId ? who.get(t.assigneeId) : "no one"}`,
    "",
    "## Notes",
    notes || "(none)",
    "",
    "## Activity",
    ...act.map(
      (a) =>
        `- ${ago(a.createdAt)} ${who.get(a.actorId) ?? "someone"} ${describe(a, who)}`
    ),
  ].join("\n")
}

export async function call(c: C, name: string, a: Json): Promise<string> {
  switch (name) {
    case "list_projects": {
      const ps = await listProjects(c)
      if (!ps.length) return "No projects yet."
      return ps.map((p) => `${p.key} · ${p.name}`).join("\n")
    }
    case "next_task": {
      const n = await nextTask(c, a)
      if (!n)
        return `Nothing assigned to you in Todo${a.project ? ` in ${a.project}` : ""}. You're done for now.`
      const { activity } = await getTask(c, { id: n.task.id })
      return `${await full(c, n.task, activity)}\n\nProject: ${n.project.name} (${n.project.key}).`
    }
    case "list_tasks": {
      const ts = await listTasks(c, a)
      if (!ts.length) return "No tasks match."
      const who = await names(
        c,
        ts.map((t) => t.assigneeId)
      )
      return ts.map((t) => line(t, who)).join("\n")
    }
    case "get_task": {
      const { task, activity } = await getTask(c, a)
      return full(c, task, activity)
    }
    case "create_task": {
      const t = await createTask(c, a)
      return `Created ${t.ref} in ${STATUS_NAME[t.status]}.`
    }
    case "update_task": {
      const t = await updateTask(c, a)
      return `Updated ${t.ref}.`
    }
    case "move_task": {
      const t = await moveTask(c, a)
      return `${t.ref} is now ${STATUS_NAME[t.status]}.`
    }
    case "comment": {
      const t = await comment(c, a)
      return `Commented on ${t.ref}.${t.handedTo ? ` Handed it to ${t.handedTo}.` : ""}`
    }
    case "attach_image": {
      if (typeof a.data !== "string")
        throw new LeanError("data must be base64 text")
      const bytes = Buffer.from(a.data.replace(/^data:[^,]+,/, ""), "base64")
      const img = await saveImage(c, {
        taskId: String(a.id ?? ""),
        mime: String(a.mime ?? ""),
        bytes,
      })
      return `![screenshot](${await origin()}${img.path})`
    }
  }
  throw new LeanError(`Unknown tool ${name}`, 404)
}
