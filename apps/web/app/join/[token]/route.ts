import { NextResponse } from "next/server";
import { acceptInvite, origin, rememberWorkspace, signedIn } from "@/lib/auth";
import { db } from "@/lib/db";

// An invite link. Signed out: sign in, then come back here. Signed in: join now.
export async function GET(_req: Request, ctx: RouteContext<"/join/[token]">) {
  const { token } = await ctx.params;
  const base = await origin();
  // Accept before anything else, so a first sign-in doesn't also make an empty workspace.
  const user = await signedIn();
  if (!user) return NextResponse.redirect(`${base}/signin?invite=${encodeURIComponent(token)}`);
  const ws = await acceptInvite(await db(), user, token);
  if (!ws) return NextResponse.redirect(`${base}/signin?invite=${encodeURIComponent(token)}&expired=1`);
  await rememberWorkspace(ws);
  return NextResponse.redirect(`${base}/`);
}
