import "server-only";
import { NextResponse } from "next/server";
import { LeanError } from "./util";

export function fail(e: unknown) {
  if (e instanceof LeanError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
