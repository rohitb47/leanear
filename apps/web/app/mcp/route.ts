import { NextResponse } from "next/server";
import { agentCtx, origin } from "@/lib/auth";
import * as core from "@/lib/core";
import { STATUS_NAME, TYPE_NAME, type Activity, type Task } from "@/lib/types";
import { LeanError } from "@/lib/util";

// MCP over Streamable HTTP, stateless, JSON responses. Every tool calls the same
// core functions the app does, as the agent the key belongs to.

const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = `Leanear is this team's single source of truth for what's happening in each product.
You are a member of the workspace. To work through your tasks:
1. Call next_task. If there is none, say so and stop.
2. Read the project's brief with get_brief before you start.
3. move_task to "doing" when you start.
4. Do the work. Keep notes current with update_task if the plan changes.
5. comment what you did and how you checked it, then move_task to "done".
If you're blocked or need a decision, comment the question and update_task the assignee back to a person.
Create tasks for follow-ups you find instead of doing unasked work.`;

type Json = Record<string, unknown>;
const str = (description: string) => ({ type: "string", description });
const STATUS = { type: "string", enum: ["backlog", "todo", "doing", "done", "canceled"] };
const TYPE = { type: "string", enum: ["bug", "feature", "idea"] };

const TOOLS = [
  {
    name: "list_projects",
    description: "Your workspace's projects and their keys.",
    inputSchema: { type: "object", properties: {} },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_brief",
    description: "A project's brief, as Markdown: what it is, how it works, the rules for building it. Read it before working on a task.",
    inputSchema: { type: "object", properties: { project: str("Project key, like PRO") }, required: ["project"] },
    annotations: { readOnlyHint: true },
  },
  {
    name: "next_task",
    description: "The top Todo task assigned to you, with its notes and activity. Empty when there's nothing to do.",
    inputSchema: { type: "object", properties: { project: str("Only this project (key). Optional.") } },
    annotations: { readOnlyHint: true },
  },
  {
    name: "list_tasks",
    description: "Tasks filtered by project, status, type, assignee or words. Canceled tasks are left out unless you ask for that status.",
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
    inputSchema: { type: "object", properties: { id: str("Task id, like PRO-12") }, required: ["id"] },
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
    description: "Change a task's title, notes, type or assignee. Notes edits keep their history.",
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
      properties: { id: str("Task id"), status: STATUS, comment: str("Optional, Markdown") },
      required: ["id", "status"],
    },
  },
  {
    name: "comment",
    description: "Post on a task. Mention a member with @Name to hand the task to them.",
    inputSchema: { type: "object", properties: { id: str("Task id"), body: str("Markdown") }, required: ["id", "body"] },
  },
  {
    name: "attach_image",
    description: "Upload a screenshot (base64) to a task. Returns a Markdown image link to put in notes or a comment.",
    inputSchema: {
      type: "object",
      properties: {
        id: str("Task id"),
        data: str("Base64 image bytes, no data: prefix"),
        mime: { type: "string", enum: ["image/png", "image/jpeg", "image/gif", "image/webp"] },
      },
      required: ["id", "data", "mime"],
    },
  },
];

type C = Awaited<ReturnType<typeof agentCtx>>;
type T = Task & { ref: string };

async function names(c: C, ids: (string | null)[]) {
  return core.memberNames(c, ids);
}
const ago = (iso: string) => iso.slice(0, 16).replace("T", " ") + " UTC";

function line(t: T, who: Map<string, string>) {
  const a = t.assigneeId ? (who.get(t.assigneeId) ?? "someone") : "no one";
  return `${t.ref} · ${STATUS_NAME[t.status]} · ${TYPE_NAME[t.type]} · ${a} · ${t.title}`;
}

function describe(a: Activity, who: Map<string, string>) {
  const d = (a.data ?? {}) as Record<string, string | null>;
  const n = (id: string | null | undefined) => (id ? (who.get(id) ?? "someone") : "no one");
  switch (a.kind) {
    case "created":
      return "created this";
    case "moved":
      return `moved it to ${STATUS_NAME[d.to as Task["status"]] ?? d.to}`;
    case "assigned":
      return `assigned it to ${n(d.to)}`;
    case "renamed":
      return `renamed it from "${d.from}"`;
    case "retyped":
      return `changed the type to ${d.to}`;
    case "notes":
      return "edited the notes";
    case "commented":
      return `commented:\n${a.body}`;
  }
}

async function full(c: C, t: T, act: Activity[]) {
  const who = await names(c, [t.assigneeId, ...act.map((x) => x.actorId), ...act.map((x) => (x.data?.to as string) ?? null)]);
  const base = await origin();
  const notes = t.notes.replace(/\]\(\/i\//g, `](${base}/i/`);
  return [
    `# ${t.ref}: ${t.title}`,
    `Status: ${STATUS_NAME[t.status]} · Type: ${TYPE_NAME[t.type]} · Assignee: ${t.assigneeId ? who.get(t.assigneeId) : "no one"}`,
    "",
    "## Notes",
    notes || "(none)",
    "",
    "## Activity",
    ...act.map((a) => `- ${ago(a.createdAt)} ${who.get(a.actorId) ?? "someone"} ${describe(a, who)}`),
  ].join("\n");
}

async function call(c: C, name: string, a: Json): Promise<string> {
  switch (name) {
    case "list_projects": {
      const ps = await core.listProjects(c);
      if (!ps.length) return "No projects yet.";
      return ps.map((p) => `${p.key} · ${p.name}`).join("\n");
    }
    case "get_brief": {
      const b = await core.getBrief(c, a);
      return `# ${b.name} (${b.project})\n\n${b.brief || "This project has no brief yet."}`;
    }
    case "next_task": {
      const n = await core.nextTask(c, a);
      if (!n) return `Nothing assigned to you in Todo${a.project ? ` in ${a.project}` : ""}. You're done for now.`;
      const { activity } = await core.getTask(c, { id: n.task.id });
      return `${await full(c, n.task, activity)}\n\nProject: ${n.project.name} (${n.project.key}). Read get_brief before you start.`;
    }
    case "list_tasks": {
      const ts = await core.listTasks(c, a);
      if (!ts.length) return "No tasks match.";
      const who = await names(c, ts.map((t) => t.assigneeId));
      return ts.map((t) => line(t, who)).join("\n");
    }
    case "get_task": {
      const { task, activity } = await core.getTask(c, a);
      return full(c, task, activity);
    }
    case "create_task": {
      const t = await core.createTask(c, a);
      return `Created ${t.ref} in ${STATUS_NAME[t.status]}.`;
    }
    case "update_task": {
      const t = await core.updateTask(c, a);
      return `Updated ${t.ref}.`;
    }
    case "move_task": {
      const t = await core.moveTask(c, a);
      return `${t.ref} is now ${STATUS_NAME[t.status]}.`;
    }
    case "comment": {
      const t = await core.comment(c, a);
      return `Commented on ${t.ref}.${t.handedTo ? ` Handed it to ${t.handedTo}.` : ""}`;
    }
    case "attach_image": {
      if (typeof a.data !== "string") throw new LeanError("data must be base64 text");
      const bytes = Buffer.from(a.data.replace(/^data:[^,]+,/, ""), "base64");
      const img = await core.saveImage(c, { taskId: String(a.id ?? ""), mime: String(a.mime ?? ""), bytes });
      return `![screenshot](${await origin()}${img.path})`;
    }
  }
  throw new LeanError(`Unknown tool ${name}`, 404);
}

type Msg = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Json };

async function handle(m: Msg, getCtx: () => Promise<C>): Promise<Json | null> {
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: m.id ?? null, result });
  const error = (code: number, message: string) => ({ jsonrpc: "2.0", id: m.id ?? null, error: { code, message } });
  if (m.id === undefined || m.id === null) return null; // a notification
  switch (m.method) {
    case "initialize": {
      const want = String(m.params?.protocolVersion ?? "");
      return reply({
        protocolVersion: VERSIONS.includes(want) ? want : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "leanear", title: "Leanear", version: "0.1.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call": {
      const name = String(m.params?.name ?? "");
      const args = (m.params?.arguments ?? {}) as Json;
      try {
        const text = await call(await getCtx(), name, args);
        return reply({ content: [{ type: "text", text }] });
      } catch (e) {
        if (e instanceof LeanError && e.status === 401) throw e;
        const msg = e instanceof LeanError ? e.message : "Something went wrong";
        if (!(e instanceof LeanError)) console.error("mcp", e);
        return reply({ content: [{ type: "text", text: msg }], isError: true });
      }
    }
    default:
      return error(-32601, `Method not found: ${m.method}`);
  }
}

export async function POST(req: Request) {
  let ctx: Promise<C> | null = null;
  const getCtx = () => (ctx ??= agentCtx(req));
  try {
    // Check the key up front so clients see a clear 401.
    await getCtx();
    const body = (await req.json()) as Msg | Msg[];
    const list = Array.isArray(body) ? body : [body];
    const out = (await Promise.all(list.map((m) => handle(m, getCtx)))).filter(Boolean);
    if (!out.length) return new NextResponse(null, { status: 202 });
    return NextResponse.json(Array.isArray(body) ? out : out[0]);
  } catch (e) {
    if (e instanceof LeanError) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: null, error: { code: e.status === 429 ? -32000 : -32001, message: e.message } },
        { status: e.status },
      );
    }
    if (e instanceof SyntaxError) {
      return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
    }
    console.error("mcp", e);
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } }, { status: 500 });
  }
}

export function GET() {
  return new NextResponse("Leanear MCP. POST JSON-RPC here with Authorization: Bearer lk_…", {
    status: 405,
    headers: { Allow: "POST" },
  });
}

export const DELETE = GET;
