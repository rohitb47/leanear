import type Stripe from "stripe"
import { applySubscription, syncSubscription } from "@/lib/billing/billing"
import { stripe } from "@/lib/billing/stripe"

// Stripe's webhook. Point it at <PUBLIC_URL>/api/stripe with these events:
// checkout.session.completed, customer.subscription.created, .updated and
// .deleted, invoice.paid and invoice.payment_failed.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return new Response("No webhook secret", { status: 501 })
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      req.headers.get("stripe-signature") ?? "",
      secret
    )
  } catch {
    return new Response("Bad signature", { status: 400 })
  }
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await applySubscription(event.data.object)
      break
    case "checkout.session.completed": {
      const sub = event.data.object.subscription
      if (sub) await syncSubscription(typeof sub === "string" ? sub : sub.id)
      break
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const sub = event.data.object.parent?.subscription_details?.subscription
      if (sub) await syncSubscription(typeof sub === "string" ? sub : sub.id)
      break
    }
  }
  return Response.json({ received: true })
}
