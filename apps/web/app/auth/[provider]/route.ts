import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { origin, secure } from "@/lib/auth";
import { CONF, isProvider } from "@/lib/oauth";
import { token } from "@/lib/util";

export async function GET(_req: Request, ctx: RouteContext<"/auth/[provider]">) {
  const { provider } = await ctx.params;
  if (!isProvider(provider) || !CONF[provider].id()) return new NextResponse("Not configured", { status: 404 });
  const c = CONF[provider];
  const state = token(16);
  (await cookies()).set("lean_oauth", state, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: 600 });
  const url = new URL(c.authorize);
  url.searchParams.set("client_id", c.id()!);
  url.searchParams.set("redirect_uri", `${await origin()}/auth/${provider}/callback`);
  url.searchParams.set("scope", c.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  return NextResponse.redirect(url);
}
