import "server-only";
import { and, asc, eq, gt, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { schema, type Db, type Tx } from "./db";
import { ALL_STATUSES, TYPES, type Activity, type Member, type Project, type Status, type Sync, type Task, type TaskType } from "./types";
import { LeanError, id, sha256, token } from "./util";

// Every read and write in Leanear goes through here, for people (the app) and
// agents (MCP) alike. Each call is scoped to the caller's workspace.

const { members, projects, tasks, activity, agentKeys, invites, workspaces, images } = schema;

type MemberRow = typeof members.$inferSelect;
type TaskRow = typeof tasks.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

export type Ctx = { db: Db; ws: string; me: MemberRow };

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export const toMember = (r: MemberRow): Member => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  avatarUrl: r.avatarUrl,
  role: r.role,
  removed: !!r.removedAt,
});
export const toProject = (r: ProjectRow): Project => ({
  id: r.id,
  key: r.key,
  name: r.name,
  brief: r.brief,
  deleted: !!r.deletedAt,
});
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
});
const toActivity = (r: typeof activity.$inferSelect): Activity => ({
  id: r.id,
  taskId: r.taskId,
  actorId: r.actorId,
  kind: r.kind as Activity["kind"],
  data: r.data ?? null,
  body: r.body,
  createdAt: r.createdAt.toISOString(),
});

const NOW = sql`now()`;

function person(c: Ctx) {
  if (c.me.kind !== "person") throw new LeanError("Only people can do that", 403);
}
function owner(c: Ctx) {
  person(c);
  if (c.me.role !== "owner") throw new LeanError("Only the workspace owner can do that", 403);
}

function text(v: unknown, name: string, max: number, required = true): string {
  if (v === undefined || v === null) {
    if (required) throw new LeanError(`${name} is required`);
    return "";
  }
  if (typeof v !== "string") throw new LeanError(`${name} must be text`);
  const s = v.trim();
  if (required && !s) throw new LeanError(`${name} is required`);
  if (s.length > max) throw new LeanError(`${name} is longer than ${max} characters`);
  return s;
}
function status(v: unknown): Status {
  const s = String(v ?? "").toLowerCase() as Status;
  if (!ALL_STATUSES.includes(s)) throw new LeanError(`Status must be one of ${ALL_STATUSES.join(", ")}`);
  return s;
}
function type(v: unknown): TaskType {
  const s = String(v ?? "").toLowerCase() as TaskType;
  if (!TYPES.includes(s)) throw new LeanError(`Type must be one of ${TYPES.join(", ")}`);
  return s;
}

/* ───────── Lookups ───────── */

export async function findProject(c: Ctx, ref: unknown): Promise<ProjectRow> {
  const r = text(ref, "project", 80);
  const rows = await c.db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, c.ws),
        isNull(projects.deletedAt),
        or(eq(projects.id, r), eq(projects.key, r.toUpperCase()), ilike(projects.name, r)),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new LeanError(`No project "${r}". Call list_projects to see the keys.`, 404);
  return rows[0];
}

/** A task by its id ("PRO-12") or its internal id. */
export async function findTask(c: Ctx | { db: Db; ws: string }, ref: unknown): Promise<TaskRow & { key: string }> {
  const r = text(ref, "id", 80);
  const m = /^([A-Za-z]{2,5})-(\d+)$/.exec(r);
  const where = m
    ? and(eq(projects.key, m[1].toUpperCase()), eq(tasks.number, Number(m[2])))
    : eq(tasks.id, r);
  const rows = await c.db
    .select({ t: tasks, key: projects.key })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(tasks.workspaceId, c.ws), isNull(tasks.deletedAt), isNull(projects.deletedAt), where))
    .limit(1);
  if (!rows[0]) throw new LeanError(`No task ${r}`, 404);
  return { ...rows[0].t, key: rows[0].key };
}

/** "me", a member's name or id, or null/"none" for no one. */
async function findMember(c: Ctx, ref: unknown): Promise<MemberRow | null> {
  if (ref === null || ref === undefined) return null;
  const r = String(ref).trim();
  if (!r || r.toLowerCase() === "none" || r.toLowerCase() === "no one") return null;
  if (r.toLowerCase() === "me") return c.me;
  const rows = await c.db
    .select()
    .from(members)
    .where(and(eq(members.workspaceId, c.ws), isNull(members.removedAt), or(eq(members.id, r), ilike(members.name, r))))
    .limit(1);
  if (!rows[0]) throw new LeanError(`No member "${r}"`, 404);
  return rows[0];
}

async function log(tx: Tx | Db, c: Ctx, taskId: string, kind: Activity["kind"], data?: Record<string, unknown>, body?: string) {
  await tx.insert(activity).values({ taskId, workspaceId: c.ws, actorId: c.me.id, kind, data: data ?? null, body: body ?? null });
}

/* ───────── Projects ───────── */

export async function listProjects(c: Ctx) {
  const rows = await c.db
    .select()
    .from(projects)
    .where(and(eq(projects.workspaceId, c.ws), isNull(projects.deletedAt)))
    .orderBy(asc(projects.createdAt));
  return rows.map(toProject);
}

const KEY = /^[A-Z]{2,5}$/;

export async function createProject(c: Ctx, a: { name?: unknown; key?: unknown; brief?: unknown }) {
  person(c);
  const name = text(a.name, "Name", 60);
  const key = text(a.key, "Key", 5).toUpperCase();
  if (!KEY.test(key)) throw new LeanError("A key is 2 to 5 letters, like PRO");
  const taken = await c.db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.workspaceId, c.ws), eq(projects.key, key), isNull(projects.deletedAt)));
  if (taken.length) throw new LeanError(`${key} is already a project here`);
  const brief = text(a.brief, "Brief", 50_000, false);
  const [row] = await c.db.insert(projects).values({ id: id(), workspaceId: c.ws, key, name, brief }).returning();
  return toProject(row);
}

export async function updateProject(c: Ctx, a: { project?: unknown; name?: unknown; key?: unknown; brief?: unknown }) {
  const p = await findProject(c, a.project);
  const set: Partial<typeof projects.$inferInsert> = {};
  if (a.name !== undefined) {
    person(c);
    set.name = text(a.name, "Name", 60);
  }
  if (a.brief !== undefined) set.brief = text(a.brief, "Brief", 50_000, false);
  if (a.key !== undefined) {
    person(c);
    const key = text(a.key, "Key", 5).toUpperCase();
    if (!KEY.test(key)) throw new LeanError("A key is 2 to 5 letters, like PRO");
    if (key !== p.key) {
      if (p.seq > 0) throw new LeanError("The key is fixed once a project has tasks");
      const taken = await c.db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.workspaceId, c.ws), eq(projects.key, key), isNull(projects.deletedAt)));
      if (taken.length) throw new LeanError(`${key} is already a project here`);
      set.key = key;
    }
  }
  const [row] = await c.db
    .update(projects)
    .set({ ...set, updatedAt: NOW })
    .where(eq(projects.id, p.id))
    .returning();
  return toProject(row);
}

export async function deleteProject(c: Ctx, a: { project?: unknown }) {
  person(c);
  const p = await findProject(c, a.project);
  const live = await c.db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.projectId, p.id), isNull(tasks.deletedAt)))
    .limit(1);
  if (live.length) throw new LeanError("Move or delete its tasks first");
  await c.db.update(projects).set({ deletedAt: NOW, updatedAt: NOW }).where(eq(projects.id, p.id));
  return { ok: true };
}

export async function getBrief(c: Ctx, a: { project?: unknown }) {
  const p = await findProject(c, a.project);
  return { project: p.key, name: p.name, brief: p.brief };
}

/* ───────── Tasks ───────── */

async function topOf(tx: Tx | Db, projectId: string, s: Status) {
  const [r] = await tx
    .select({ min: sql<number | null>`min(${tasks.position})` })
    .from(tasks)
    .where(and(eq(tasks.projectId, projectId), eq(tasks.status, s), isNull(tasks.deletedAt)));
  return r?.min === null || r?.min === undefined ? 0 : Number(r.min) - 1;
}

export async function createTask(
  c: Ctx,
  a: { project?: unknown; title?: unknown; notes?: unknown; type?: unknown; status?: unknown; assignee?: unknown; position?: unknown },
) {
  const p = await findProject(c, a.project);
  const title = text(a.title, "Title", 200);
  const notes = text(a.notes, "Notes", 50_000, false);
  const ty = a.type === undefined ? "feature" : type(a.type);
  const st = a.status === undefined ? "todo" : status(a.status);
  const who = a.assignee === undefined ? null : await findMember(c, a.assignee);
  return c.db.transaction(async (tx) => {
    const [{ seq }] = await tx
      .update(projects)
      .set({ seq: sql`${projects.seq} + 1` })
      .where(eq(projects.id, p.id))
      .returning({ seq: projects.seq });
    const position = typeof a.position === "number" && Number.isFinite(a.position) ? a.position : await topOf(tx, p.id, st);
    const [row] = await tx
      .insert(tasks)
      .values({
        id: id(),
        projectId: p.id,
        workspaceId: c.ws,
        number: seq,
        title,
        notes,
        type: ty,
        status: st,
        assigneeId: who?.id ?? null,
        position,
        createdBy: c.me.id,
      })
      .returning();
    await log(tx, c, row.id, "created", who ? { assignee: who.id } : undefined);
    return { ...toTask(row), ref: `${p.key}-${seq}` };
  });
}

export async function updateTask(
  c: Ctx,
  a: { id?: unknown; title?: unknown; notes?: unknown; type?: unknown; assignee?: unknown },
) {
  const t = await findTask(c, a.id);
  const set: Partial<typeof tasks.$inferInsert> = {};
  const logs: [Activity["kind"], Record<string, unknown>][] = [];
  if (a.title !== undefined) {
    const v = text(a.title, "Title", 200);
    if (v !== t.title) {
      set.title = v;
      logs.push(["renamed", { from: t.title, to: v }]);
    }
  }
  if (a.notes !== undefined) {
    const v = text(a.notes, "Notes", 50_000, false);
    if (v !== t.notes) {
      set.notes = v;
      logs.push(["notes", { prev: t.notes }]);
    }
  }
  if (a.type !== undefined) {
    const v = type(a.type);
    if (v !== t.type) {
      set.type = v;
      logs.push(["retyped", { from: t.type, to: v }]);
    }
  }
  if (a.assignee !== undefined) {
    const m = await findMember(c, a.assignee);
    const v = m?.id ?? null;
    if (v !== t.assigneeId) {
      set.assigneeId = v;
      logs.push(["assigned", { to: v }]);
    }
  }
  if (!logs.length) return { ...toTask(t), ref: `${t.key}-${t.number}` };
  return c.db.transaction(async (tx) => {
    const [row] = await tx
      .update(tasks)
      .set({ ...set, updatedAt: NOW })
      .where(eq(tasks.id, t.id))
      .returning();
    for (const [k, d] of logs) await log(tx, c, t.id, k, d);
    return { ...toTask(row), ref: `${t.key}-${t.number}` };
  });
}

export async function moveTask(c: Ctx, a: { id?: unknown; status?: unknown; position?: unknown; comment?: unknown }) {
  const t = await findTask(c, a.id);
  const st = a.status === undefined ? t.status : status(a.status);
  const body = text(a.comment, "Comment", 20_000, false);
  return c.db.transaction(async (tx) => {
    const position =
      typeof a.position === "number" && Number.isFinite(a.position)
        ? a.position
        : st !== t.status
          ? await topOf(tx, t.projectId, st)
          : t.position;
    const [row] = await tx
      .update(tasks)
      .set({ status: st, position, updatedAt: NOW })
      .where(eq(tasks.id, t.id))
      .returning();
    if (st !== t.status) await log(tx, c, t.id, "moved", { from: t.status, to: st });
    if (body) await log(tx, c, t.id, "commented", undefined, body);
    return { ...toTask(row), ref: `${t.key}-${t.number}` };
  });
}

/** Post on a task. Mentioning a member by name (@Claude) hands the task to them. */
export async function comment(c: Ctx, a: { id?: unknown; body?: unknown }) {
  const t = await findTask(c, a.id);
  const body = text(a.body, "Comment", 20_000);
  const all = await c.db
    .select()
    .from(members)
    .where(and(eq(members.workspaceId, c.ws), isNull(members.removedAt)));
  const lower = body.toLowerCase();
  let handTo: MemberRow | null = null;
  for (const m of [...all].sort((x, y) => y.name.length - x.name.length)) {
    const at = lower.indexOf("@" + m.name.toLowerCase());
    if (at === -1) continue;
    const after = lower[at + 1 + m.name.length];
    if (after === undefined || !/[\p{L}\p{N}]/u.test(after)) {
      handTo = m;
      break;
    }
  }
  return c.db.transaction(async (tx) => {
    await log(tx, c, t.id, "commented", undefined, body);
    const set: Partial<typeof tasks.$inferInsert> = {};
    if (handTo && handTo.id !== t.assigneeId) {
      set.assigneeId = handTo.id;
      await log(tx, c, t.id, "assigned", { to: handTo.id });
    }
    const [row] = await tx
      .update(tasks)
      .set({ ...set, updatedAt: NOW })
      .where(eq(tasks.id, t.id))
      .returning();
    return { ...toTask(row), ref: `${t.key}-${t.number}`, handedTo: handTo?.name ?? null };
  });
}

export async function deleteTask(c: Ctx, a: { id?: unknown }) {
  person(c);
  const t = await findTask(c, a.id);
  await c.db.update(tasks).set({ deletedAt: NOW, updatedAt: NOW }).where(eq(tasks.id, t.id));
  return { ok: true, ref: `${t.key}-${t.number}` };
}

export async function taskActivity(c: Ctx, taskId: string) {
  const rows = await c.db
    .select()
    .from(activity)
    .where(and(eq(activity.taskId, taskId), eq(activity.workspaceId, c.ws)))
    .orderBy(asc(activity.id));
  return rows.map(toActivity);
}

export async function getTask(c: Ctx, a: { id?: unknown }) {
  const t = await findTask(c, a.id);
  return { task: { ...toTask(t), ref: `${t.key}-${t.number}` }, activity: await taskActivity(c, t.id) };
}

export async function listTasks(
  c: Ctx,
  a: { project?: unknown; status?: unknown; type?: unknown; assignee?: unknown; q?: unknown; limit?: unknown },
) {
  const where = [eq(tasks.workspaceId, c.ws), isNull(tasks.deletedAt), isNull(projects.deletedAt)];
  if (a.project !== undefined && a.project !== null && a.project !== "") where.push(eq(tasks.projectId, (await findProject(c, a.project)).id));
  if (a.status) where.push(eq(tasks.status, status(a.status)));
  else where.push(ne(tasks.status, "canceled"));
  if (a.type) where.push(eq(tasks.type, type(a.type)));
  if (a.assignee !== undefined && a.assignee !== "") {
    const m = await findMember(c, a.assignee);
    where.push(m ? eq(tasks.assigneeId, m.id) : isNull(tasks.assigneeId));
  }
  if (typeof a.q === "string" && a.q.trim()) {
    const q = `%${a.q.trim().replace(/[%_\\]/g, (x) => "\\" + x)}%`;
    where.push(or(ilike(tasks.title, q), ilike(tasks.notes, q))!);
  }
  const limit = Math.min(200, Math.max(1, Number(a.limit) || 50));
  const rows = await c.db
    .select({ t: tasks, key: projects.key })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(...where))
    .orderBy(asc(projects.key), sql`array_position(array['doing','todo','backlog','done','canceled'], ${tasks.status}::text)`, asc(tasks.position))
    .limit(limit);
  return rows.map((r) => ({ ...toTask(r.t), ref: `${r.key}-${r.t.number}` }));
}

/** The top Todo assigned to the caller. */
export async function nextTask(c: Ctx, a: { project?: unknown }) {
  const where = [
    eq(tasks.workspaceId, c.ws),
    isNull(tasks.deletedAt),
    isNull(projects.deletedAt),
    eq(tasks.status, "todo"),
    eq(tasks.assigneeId, c.me.id),
  ];
  if (a.project) where.push(eq(tasks.projectId, (await findProject(c, a.project)).id));
  const rows = await c.db
    .select({ t: tasks, key: projects.key, name: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(...where))
    .orderBy(asc(tasks.position))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return { task: { ...toTask(r.t), ref: `${r.key}-${r.t.number}` }, project: { key: r.key, name: r.name } };
}

/* ───────── Images ───────── */

const MIMES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export async function saveImage(c: Ctx, a: { taskId?: string | null; mime: string; bytes: Buffer }) {
  if (!MIMES.includes(a.mime)) throw new LeanError("Images must be PNG, JPEG, GIF or WebP");
  if (a.bytes.length > 5 * 1024 * 1024) throw new LeanError("Images can be up to 5 MB");
  if (!a.bytes.length) throw new LeanError("The image is empty");
  let taskId: string | null = null;
  if (a.taskId) taskId = (await findTask(c, a.taskId)).id;
  const iid = id();
  await c.db.insert(images).values({ id: iid, workspaceId: c.ws, taskId, mime: a.mime, bytes: a.bytes, createdBy: c.me.id });
  return { id: iid, path: `/i/${iid}` };
}

export async function readImage(d: Db, ws: string, iid: string) {
  const rows = await d
    .select({ mime: images.mime, bytes: images.bytes })
    .from(images)
    .where(and(eq(images.id, iid), eq(images.workspaceId, ws)))
    .limit(1);
  return rows[0] ?? null;
}

/* ───────── Sync ───────── */

/**
 * Everything that changed since the cursor. With no cursor, the whole live
 * workspace. A 10 second overlap covers transactions that committed late;
 * the client applies rows idempotently.
 */
export async function sync(c: Ctx, since: string | null, openTask?: string | null): Promise<Sync> {
  // The database's clock, not ours: updated_at is written with now() too.
  const [{ now }] = await c.db
    .select({ now: sql<string>`now()::text` })
    .from(workspaces)
    .where(eq(workspaces.id, c.ws));
  const cursor = new Date(now).toISOString();
  const after = since ? new Date(new Date(since).getTime() - 10_000) : null;
  if (after && Number.isNaN(after.getTime())) throw new LeanError("Bad cursor");

  const [m, p, t] = await Promise.all([
    c.db
      .select()
      .from(members)
      .where(and(eq(members.workspaceId, c.ws), after ? gt(members.updatedAt, after) : undefined)),
    c.db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, c.ws), after ? gt(projects.updatedAt, after) : isNull(projects.deletedAt))),
    c.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.workspaceId, c.ws), after ? gt(tasks.updatedAt, after) : isNull(tasks.deletedAt))),
  ]);
  const out: Sync = { cursor, members: m.map(toMember), projects: p.map(toProject), tasks: t.map(toTask) };
  if (openTask && (!after || t.some((x) => x.id === openTask))) {
    out.activity = { taskId: openTask, items: await taskActivity(c, openTask) };
  }
  return out;
}

/* ───────── Workspace settings (people only) ───────── */

export async function renameWorkspace(c: Ctx, a: { name?: unknown }) {
  person(c);
  const name = text(a.name, "Name", 60);
  await c.db.update(workspaces).set({ name }).where(eq(workspaces.id, c.ws));
  return { ok: true, name };
}

async function mintKey(d: Db | Tx, memberId: string) {
  const key = "lk_" + token(24);
  await d.insert(agentKeys).values({ id: id(), memberId, hash: sha256(key), hint: key.slice(-4) });
  return key;
}

export async function addAgent(c: Ctx, a: { name?: unknown }) {
  person(c);
  const name = text(a.name, "Name", 40);
  const clash = await c.db
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.workspaceId, c.ws), isNull(members.removedAt), ilike(members.name, name)));
  if (clash.length) throw new LeanError(`There's already a member called ${name}`);
  return c.db.transaction(async (tx) => {
    const [m] = await tx.insert(members).values({ id: id(), workspaceId: c.ws, kind: "agent", name, role: "member" }).returning();
    const key = await mintKey(tx, m.id);
    return { member: toMember(m), key };
  });
}

async function ownAgent(c: Ctx, memberId: unknown) {
  const rows = await c.db
    .select()
    .from(members)
    .where(and(eq(members.id, String(memberId)), eq(members.workspaceId, c.ws), eq(members.kind, "agent"), isNull(members.removedAt)));
  if (!rows[0]) throw new LeanError("No such agent", 404);
  return rows[0];
}

export async function newKey(c: Ctx, a: { memberId?: unknown }) {
  person(c);
  const m = await ownAgent(c, a.memberId);
  return { key: await mintKey(c.db, m.id) };
}

export async function revokeKey(c: Ctx, a: { keyId?: unknown }) {
  person(c);
  const rows = await c.db
    .select({ k: agentKeys.id })
    .from(agentKeys)
    .innerJoin(members, eq(members.id, agentKeys.memberId))
    .where(and(eq(agentKeys.id, String(a.keyId)), eq(members.workspaceId, c.ws)));
  if (!rows[0]) throw new LeanError("No such key", 404);
  await c.db.update(agentKeys).set({ revokedAt: NOW }).where(eq(agentKeys.id, rows[0].k));
  return { ok: true };
}

export async function renameMember(c: Ctx, a: { memberId?: unknown; name?: unknown }) {
  person(c);
  const name = text(a.name, "Name", 40);
  const rows = await c.db
    .select()
    .from(members)
    .where(and(eq(members.id, String(a.memberId)), eq(members.workspaceId, c.ws), isNull(members.removedAt)));
  const m = rows[0];
  if (!m) throw new LeanError("No such member", 404);
  if (m.kind === "person" && m.id !== c.me.id) throw new LeanError("People rename themselves", 403);
  const [row] = await c.db.update(members).set({ name, updatedAt: NOW }).where(eq(members.id, m.id)).returning();
  return toMember(row);
}

export async function removeMember(c: Ctx, a: { memberId?: unknown }) {
  person(c);
  const rows = await c.db
    .select()
    .from(members)
    .where(and(eq(members.id, String(a.memberId)), eq(members.workspaceId, c.ws), isNull(members.removedAt)));
  const m = rows[0];
  if (!m) throw new LeanError("No such member", 404);
  if (m.kind === "person") {
    if (m.id !== c.me.id) owner(c);
    if (m.role === "owner") {
      const owners = await c.db
        .select({ id: members.id })
        .from(members)
        .where(and(eq(members.workspaceId, c.ws), eq(members.role, "owner"), isNull(members.removedAt)));
      if (owners.length <= 1) throw new LeanError("A workspace needs an owner. Make someone else owner first.");
    }
  }
  await c.db.transaction(async (tx) => {
    await tx.update(members).set({ removedAt: NOW, updatedAt: NOW }).where(eq(members.id, m.id));
    await tx.update(agentKeys).set({ revokedAt: NOW }).where(and(eq(agentKeys.memberId, m.id), isNull(agentKeys.revokedAt)));
  });
  return { ok: true };
}

export async function makeOwner(c: Ctx, a: { memberId?: unknown }) {
  owner(c);
  const [row] = await c.db
    .update(members)
    .set({ role: "owner", updatedAt: NOW })
    .where(and(eq(members.id, String(a.memberId)), eq(members.workspaceId, c.ws), eq(members.kind, "person"), isNull(members.removedAt)))
    .returning();
  if (!row) throw new LeanError("No such person", 404);
  return toMember(row);
}

export async function createInvite(c: Ctx) {
  owner(c);
  const [row] = await c.db
    .insert(invites)
    .values({ id: id(), workspaceId: c.ws, token: token(18), createdBy: c.me.id, expiresAt: new Date(Date.now() + 7 * 864e5) })
    .returning();
  return { id: row.id, token: row.token, expiresAt: row.expiresAt.toISOString() };
}

export async function revokeInvite(c: Ctx, a: { inviteId?: unknown }) {
  owner(c);
  await c.db
    .update(invites)
    .set({ revokedAt: NOW })
    .where(and(eq(invites.id, String(a.inviteId)), eq(invites.workspaceId, c.ws)));
  return { ok: true };
}

export async function settingsData(c: Ctx) {
  person(c);
  const keys = await c.db
    .select({ k: agentKeys })
    .from(agentKeys)
    .innerJoin(members, eq(members.id, agentKeys.memberId))
    .where(and(eq(members.workspaceId, c.ws), isNull(agentKeys.revokedAt)))
    .orderBy(asc(agentKeys.createdAt));
  const inv =
    c.me.role === "owner"
      ? await c.db
          .select()
          .from(invites)
          .where(and(eq(invites.workspaceId, c.ws), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
      : [];
  return {
    keys: keys.map(({ k }) => ({ id: k.id, memberId: k.memberId, hint: k.hint, lastUsedAt: iso(k.lastUsedAt), createdAt: k.createdAt.toISOString() })),
    invites: inv.map((i) => ({ id: i.id, token: i.token, expiresAt: i.expiresAt.toISOString() })),
  };
}

/** Members of the workspace, for name lookups in MCP answers. */
export async function memberNames(c: Ctx, ids: (string | null)[]) {
  const want = [...new Set(ids.filter(Boolean))] as string[];
  if (!want.length) return new Map<string, string>();
  const rows = await c.db.select({ id: members.id, name: members.name }).from(members).where(inArray(members.id, want));
  return new Map(rows.map((r) => [r.id, r.name]));
}
