import { NextResponse } from "next/server";
import { origin, signOut } from "@/lib/auth";

export async function POST() {
  await signOut();
  return NextResponse.redirect(`${await origin()}/signin`, 303);
}
