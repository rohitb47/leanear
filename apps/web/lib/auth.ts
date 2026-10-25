import "server-only";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { auth } from "./better";
import type { Ctx } from "./core";
import { db, schema, type Db } from "./db";
import { LeanError, id, sha256 } from "./util";

// Who's asking: a person signed in through Better Auth, or an agent with a key.

const { members, workspaces, agentKeys, invites } = schema;

/** The workspace a person is looking at, when they belong to more than one. */
export const WORKSPACE = "lean_ws";

/** Where the app lives, for the MCP URL shown in the app. */
export async function origin() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type User = { id: string; name: string; email: string; image?: string | null };

type Session = {
  user: User;
  me: typeof members.$inferSelect;
  workspace: { id: string; name: string };
  workspaces: { id: string; name: string }[];
};

async function memberships(d: Db, userId: string) {
  return d
    .select({ m: members, w: workspaces })
    .from(members)
    .innerJoin(workspaces, eq(workspaces.id, members.workspaceId))
    .where(and(eq(members.userId, userId), eq(members.kind, "person"), isNull(members.removedAt)))
    .orderBy(asc(workspaces.createdAt));
}

async function newWorkspace(d: Db, user: User) {
  const ws = id();
  const first = user.name.split(/\s+/)[0] || "My";
  await d.transaction(async (tx) => {
    await tx.insert(workspaces).values({ id: ws, name: `${first}'s workspace` });
    await tx.insert(members).values({
      id: id(),
      workspaceId: ws,
      kind: "person",
      userId: user.id,
      name: user.name,
      avatarUrl: user.image ?? null,
      role: "owner",
    });
  });
  return ws;
}

/** Who Better Auth says is signed in, with no workspace set up yet. */
export async function signedIn(): Promise<User | null> {
  const s = await (await auth()).api.getSession({ headers: await headers() });
  return s?.user ?? null;
}

/** The signed-in person and their current workspace, or null. */
export async function session(): Promise<Session | null> {
  const user = await signedIn();
  if (!user) return null;
  const d = await db();
  let list = await memberships(d, user.id);
  if (!list.length) {
    // First sign-in, or removed from every workspace: start a fresh one.
    await newWorkspace(d, user);
    list = await memberships(d, user.id);
  }
  const want = (await cookies()).get(WORKSPACE)?.value;
  const pick = list.find((x) => x.w.id === want) ?? list[0];
  return {
    user,
    me: pick.m,
    workspace: { id: pick.w.id, name: pick.w.name },
    workspaces: list.map((x) => ({ id: x.w.id, name: x.w.name })),
  };
}

export async function personCtx(): Promise<Ctx & { session: Session }> {
  const s = await session();
  if (!s) throw new LeanError("Sign in first", 401);
  return { db: await db(), ws: s.workspace.id, me: s.me, session: s };
}

/** Remember which workspace to show. Route handlers only (it sets a cookie). */
export async function rememberWorkspace(workspaceId: string) {
  (await cookies()).set(WORKSPACE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 86400,
  });
}

export async function switchWorkspace(s: Session, workspaceId: string) {
  if (!s.workspaces.some((w) => w.id === workspaceId)) throw new LeanError("Not a member of that workspace", 403);
  await rememberWorkspace(workspaceId);
}

/** Join a workspace by invite. Returns the workspace id, or null if the invite is no good. */
export async function acceptInvite(d: Db, user: User, tok: string) {
  const rows = await d
    .select()
    .from(invites)
    .where(and(eq(invites.token, tok), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  const inv = rows[0];
  if (!inv) return null;
  const existing = await d
    .select()
    .from(members)
    .where(and(eq(members.workspaceId, inv.workspaceId), eq(members.userId, user.id)))
    .limit(1);
  if (existing[0]) {
    if (existing[0].removedAt)
      await d.update(members).set({ removedAt: null, updatedAt: new Date() }).where(eq(members.id, existing[0].id));
  } else {
    await d.insert(members).values({
      id: id(),
      workspaceId: inv.workspaceId,
      kind: "person",
      userId: user.id,
      name: user.name,
      avatarUrl: user.image ?? null,
      role: "member",
    });
  }
  return inv.workspaceId;
}

export async function inviteInfo(tok: string) {
  const d = await db();
  const rows = await d
    .select({ name: workspaces.name })
    .from(invites)
    .innerJoin(workspaces, eq(workspaces.id, invites.workspaceId))
    .where(and(eq(invites.token, tok), isNull(invites.revokedAt), gt(invites.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
}

/* ───────── Agents ───────── */

const hits = new Map<string, number[]>();

/** Resolve a bearer key to its agent. Rate limited to 120 calls a minute per key. */
export async function agentCtx(req: Request): Promise<Ctx> {
  const header = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(header);
  if (!m) throw new LeanError("Missing key. Send Authorization: Bearer lk_…", 401);
  const hash = sha256(m[1]);

  const now = Date.now();
  const recent = (hits.get(hash) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 120) throw new LeanError("Too many requests. Wait a minute.", 429);
  recent.push(now);
  hits.set(hash, recent);

  const d = await db();
  const rows = await d
    .select({ k: agentKeys, m: members })
    .from(agentKeys)
    .innerJoin(members, eq(members.id, agentKeys.memberId))
    .where(and(eq(agentKeys.hash, hash), isNull(agentKeys.revokedAt), isNull(members.removedAt)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new LeanError("That key isn't valid. It may have been revoked.", 401);
  if (!row.k.lastUsedAt || now - row.k.lastUsedAt.getTime() > 60_000) {
    await d.update(agentKeys).set({ lastUsedAt: new Date() }).where(eq(agentKeys.id, row.k.id));
  }
  return { db: d, ws: row.m.workspaceId, me: row.m };
}

/** A session or an agent key, for images. */
export async function anyCtx(req: Request): Promise<{ db: Db; ws: string } | null> {
  const s = await session();
  if (s) return { db: await db(), ws: s.workspace.id };
  if (req.headers.get("authorization")) {
    try {
      const c = await agentCtx(req);
      return { db: c.db, ws: c.ws };
    } catch {
      return null;
    }
  }
  return null;
}
