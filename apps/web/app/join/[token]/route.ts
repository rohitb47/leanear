import { NextResponse } from "next/server"
import { origin, rememberWorkspace, signedIn } from "@/lib/auth/session"
import { acceptInvite } from "@/lib/workspace/invites"

// An invite link. Signed out: sign in, then come back here. Signed in: join now.
export async function GET(_req: Request, ctx: RouteContext<"/join/[token]">) {
  const { token } = await ctx.params
  const base = await origin()
  const back = `${base}/signin?invite=${encodeURIComponent(token)}`
  // Accept before anything else, so a first sign-in doesn't also make an empty workspace.
  const user = await signedIn()
  if (!user) return NextResponse.redirect(back)
  const ws = await acceptInvite(user, token)
  if (!ws) return NextResponse.redirect(`${back}&expired=1`)
  await rememberWorkspace(ws)
  return NextResponse.redirect(`${base}/`)
}
