import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { origin, signIn } from "@/lib/auth";
import { exchange, isProvider, profile } from "@/lib/oauth";

export async function GET(req: Request, ctx: RouteContext<"/auth/[provider]/callback">) {
  const { provider } = await ctx.params;
  const base = await origin();
  const fail = (why: string) => NextResponse.redirect(`${base}/signin?error=${encodeURIComponent(why)}`);
  if (!isProvider(provider)) return fail("Unknown sign-in");
  const url = new URL(req.url);
  const jar = await cookies();
  const state = jar.get("lean_oauth")?.value;
  jar.delete("lean_oauth");
  const code = url.searchParams.get("code");
  if (!code || !state || state !== url.searchParams.get("state")) return fail("Sign-in expired. Try again.");
  try {
    const at = await exchange(provider, code, `${base}/auth/${provider}/callback`);
    const p = await profile(provider, at);
    await signIn({ provider, ...p });
  } catch (e) {
    console.error("oauth", e);
    return fail("Couldn't sign you in. Try again.");
  }
  return NextResponse.redirect(`${base}/`);
}
