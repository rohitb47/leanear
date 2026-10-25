import { NextResponse } from "next/server";
import { origin, providers, signIn } from "@/lib/auth";

// Development only: sign in with a name and email, no provider needed.
export async function POST(req: Request) {
  if (!providers().local) return new NextResponse("Not found", { status: 404 });
  const f = await req.formData();
  const name = String(f.get("name") ?? "").trim().slice(0, 60) || "You";
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 120) || "you@localhost";
  await signIn({ provider: "local", providerId: email, name, email, avatarUrl: null });
  return NextResponse.redirect(`${await origin()}/`, 303);
}
