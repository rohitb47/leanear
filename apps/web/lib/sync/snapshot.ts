import "server-only"
import { getSession, origin } from "@/lib/auth/session"
import { sync } from "./sync"
import type { Snapshot } from "./types"

/** Everything the app needs on first paint. Null when signed out. */
export async function snapshot(): Promise<Snapshot | null> {
  const s = await getSession()
  if (!s) return null
  const data = await sync({ ws: s.workspace.id, me: s.me }, null)
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
  }
}
