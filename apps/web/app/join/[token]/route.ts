import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { acceptInvite, INVITE, origin, secure, session, switchWorkspace } from "@/lib/auth";
import { db } from "@/lib/db";

// An invite link. Signed in: join now. Signed out: remember it through sign-in.
export async function GET(_req: Request, ctx: RouteContext<"/join/[token]">) {
  const { token } = await ctx.params;
  const base = await origin();
  const s = await session();
  if (!s) {
    (await cookies()).set(INVITE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: 3600 });
    return NextResponse.redirect(`${base}/signin?invite=${encodeURIComponent(token)}`);
  }
  const ws = await acceptInvite(await db(), s.user, token);
  if (!ws) return NextResponse.redirect(`${base}/?error=${encodeURIComponent("That invite has expired")}`);
  await switchWorkspace({ ...s, workspaces: [...s.workspaces, { id: ws, name: "" }] }, ws);
  return NextResponse.redirect(`${base}/`);
}
