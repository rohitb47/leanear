import "server-only";
import { origin, session } from "./auth";
import { sync } from "./core";
import { db } from "./db";
import type { Snapshot } from "./types";

/** Everything the app needs on first paint. Null when signed out. */
export async function snapshot(): Promise<Snapshot | null> {
  const s = await session();
  if (!s) return null;
  const d = await db();
  const data = await sync({ db: d, ws: s.workspace.id, me: s.me }, null);
  return {
    ...data,
    me: {
      memberId: s.me.id,
      userId: s.user.id,
      name: s.me.name,
      email: s.user.email,
      avatarUrl: s.me.avatarUrl,
      role: s.me.role,
    },
    workspace: s.workspace,
    workspaces: s.workspaces,
    mcpUrl: `${await origin()}/mcp`,
  };
}
