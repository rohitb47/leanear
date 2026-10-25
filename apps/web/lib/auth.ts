import "server-only";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import type { Ctx } from "./core";
import { db, schema, type Db } from "./db";
import { LeanError, id, sha256, token } from "./util";

const { users, sessions, members, workspaces, agentKeys, invites } = schema;

export const SESSION = "lean_session";
export const INVITE = "lean_invite";
const DAYS = 30;

export const providers = () => ({
  github: !!(process.env.GITHUB_ID && process.env.GITHUB_SECRET),
  google: !!(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET),
  local: process.env.NODE_ENV !== "production",
});

/** Where the app lives, for OAuth callbacks and the MCP URL shown in the app. */
export async function origin() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const secure = () => process.env.NODE_ENV === "production";

type Session = {
  tokenHash: string;
  user: typeof users.$inferSelect;
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

async function newWorkspace(d: Db, user: typeof users.$inferSelect) {
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
      avatarUrl: user.avatarUrl,
      role: "owner",
    });
  });
  return ws;
}

/** The signed-in person and their current workspace, or null. */
export async function session(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION)?.value;
  if (!raw) return null;
  const d = await db();
  const tokenHash = sha256(raw);
  const rows = await d
    .select({ s: sessions, u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  let list = await memberships(d, row.u.id);
  if (!list.length) {
    // Removed from every workspace: start a fresh one rather than lock them out.
    await newWorkspace(d, row.u);
    list = await memberships(d, row.u.id);
  }
  const pick = list.find((x) => x.w.id === row.s.workspaceId) ?? list[0];
  return {
    tokenHash,
    user: row.u,
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

export async function switchWorkspace(s: Session, workspaceId: string) {
  if (!s.workspaces.some((w) => w.id === workspaceId)) throw new LeanError("Not a member of that workspace", 403);
  const d = await db();
  await d.update(sessions).set({ workspaceId }).where(eq(sessions.tokenHash, s.tokenHash));
}

/** Join a workspace by invite. Returns the workspace id, or null if the invite is no good. */
export async function acceptInvite(d: Db, user: typeof users.$inferSelect, tok: string) {
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
      avatarUrl: user.avatarUrl,
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

type Profile = {
  provider: "github" | "google" | "local";
  providerId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
};

/** Find or create the user, join any pending invite, start a session. */
export async function signIn(p: Profile) {
  const d = await db();
  const col = p.provider === "github" ? users.githubId : p.provider === "google" ? users.googleId : null;
  let user = col ? (await d.select().from(users).where(eq(col, p.providerId)).limit(1))[0] : undefined;
  if (!user && p.email) user = (await d.select().from(users).where(eq(users.email, p.email.toLowerCase())).limit(1))[0];
  if (!user) {
    [user] = await d
      .insert(users)
      .values({
        id: id(),
        name: p.name,
        email: p.email?.toLowerCase() ?? null,
        avatarUrl: p.avatarUrl,
        githubId: p.provider === "github" ? p.providerId : null,
        googleId: p.provider === "google" ? p.providerId : null,
      })
      .returning();
  } else {
    const set: Partial<typeof users.$inferInsert> = {};
    if (p.provider === "github" && !user.githubId) set.githubId = p.providerId;
    if (p.provider === "google" && !user.googleId) set.googleId = p.providerId;
    if (p.avatarUrl && !user.avatarUrl) set.avatarUrl = p.avatarUrl;
    if (Object.keys(set).length) [user] = await d.update(users).set(set).where(eq(users.id, user.id)).returning();
  }

  const jar = await cookies();
  let wsId: string | null = null;
  const inv = jar.get(INVITE)?.value;
  if (inv) {
    wsId = await acceptInvite(d, user, inv);
    jar.delete(INVITE);
  }
  if (!wsId && !(await memberships(d, user.id)).length) wsId = await newWorkspace(d, user);

  const raw = token(32);
  await d.insert(sessions).values({
    tokenHash: sha256(raw),
    userId: user.id,
    workspaceId: wsId,
    expiresAt: new Date(Date.now() + DAYS * 864e5),
  });
  jar.set(SESSION, raw, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: DAYS * 86400 });
}

export async function signOut() {
  const jar = await cookies();
  const raw = jar.get(SESSION)?.value;
  if (raw) {
    const d = await db();
    await d.delete(sessions).where(eq(sessions.tokenHash, sha256(raw)));
  }
  jar.delete(SESSION);
}

/* ───────── Agents ───────── */

const hits = new Map<string, number[]>();

/** Resolve a bearer key to its agent. Rate limited to 120 calls a minute per key. */
export async function agentCtx(req: Request): Promise<Ctx> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(auth);
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

