import { NextResponse } from "next/server";
import { personCtx } from "@/lib/auth";
import { sync } from "@/lib/core";
import { fail } from "@/lib/respond";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const c = await personCtx();
    const data = await sync(c, url.searchParams.get("since"), url.searchParams.get("task"));
    return NextResponse.json({ data, workspace: c.ws });
  } catch (e) {
    return fail(e);
  }
}
