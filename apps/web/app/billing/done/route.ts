import { NextResponse } from "next/server"
import { origin } from "@/lib/auth/session"
import { finishCheckout } from "@/lib/billing/billing"

// Back from Stripe Checkout. Record the plan now, so the app opens unlocked
// even before (or without) the webhook.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams
  const session = q.get("session")
  const want = q.get("back") ?? "/"
  const back = /^\/(?![\/\\])/.test(want) ? want : "/"
  if (session) {
    try {
      await finishCheckout(session)
    } catch (e) {
      console.error("billing", e)
    }
  }
  return NextResponse.redirect(`${await origin()}${back}`)
}
