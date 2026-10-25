import "server-only"
import type { Member } from "@prisma/client"
import { cookies, headers } from "next/headers"
import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { LeanError } from "@/lib/utils"
import { newWorkspace } from "@/lib/workspace/workspace"
import { auth } from "./server"

/** The workspace a person is looking at, when they belong to more than one. */
const WORKSPACE = "lean_ws"

type User = { id: string; name: string; email: string; image?: string | null }

export type Session = {
  user: User
  me: Member
  workspace: { id: string; name: string }
  workspaces: { id: string; name: string }[]
}

/** Where the app lives, for the MCP URL and links back to it. */
export async function origin() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

/** Who Better Auth says is signed in, before any workspace is set up. */
export const signedIn = cache(async (): Promise<User | null> => {
  const s = await auth.api.getSession({ headers: await headers() })
  return s?.user ?? null
})

const memberships = (userId: string) =>
  prisma.member.findMany({
    where: { userId, kind: "person", removedAt: null },
    include: { workspace: true },
    orderBy: { workspace: { createdAt: "asc" } },
  })

/**
 * The signed-in person and the workspace they're in, or null. Someone with
 * no workspace (a first sign-in, or removed from every one) gets a new one.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const user = await signedIn()
  if (!user) return null
  let list = await memberships(user.id)
  if (!list.length) {
    await newWorkspace(user)
    list = await memberships(user.id)
  }
  const want = (await cookies()).get(WORKSPACE)?.value
  const pick = list.find((m) => m.workspaceId === want) ?? list[0]
  return {
    user,
    me: pick,
    workspace: { id: pick.workspace.id, name: pick.workspace.name },
    workspaces: list.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
    })),
  }
})

/** Remember which workspace to show. Route handlers and procedures only. */
export async function rememberWorkspace(workspaceId: string) {
  ;(await cookies()).set(WORKSPACE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 86400,
  })
}

export async function switchWorkspace(s: Session, workspaceId: string) {
  if (!s.workspaces.some((w) => w.id === workspaceId))
    throw new LeanError("Not a member of that workspace", 403)
  await rememberWorkspace(workspaceId)
}
