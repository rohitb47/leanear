import "server-only"
import Stripe from "stripe"

/**
 * Billing is on when there's a Stripe key, which is shipth.at Cloud. A
 * self-hosted copy leaves it out and gets everything with no caps.
 */
export const billingOn = () => !!process.env.STRIPE_SECRET_KEY

let client: Stripe | null = null
export function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("No STRIPE_SECRET_KEY")
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY)
  return client
}

/** Cloud: one flat price for the whole workspace. */
export const PLAN = {
  name: "shipth.at Cloud",
  cents: 900,
  currency: "usd",
  lookup: "leanear_cloud_monthly",
  projects: 10,
  people: 20,
  agents: 5,
}

/** shipth.at Cloud's monthly price, made the first time it's needed. */
export async function cloudPrice() {
  const s = stripe()
  const found = await s.prices.list({ lookup_keys: [PLAN.lookup], limit: 1 })
  if (found.data[0]) return found.data[0].id
  const price = await s.prices.create({
    lookup_key: PLAN.lookup,
    currency: PLAN.currency,
    unit_amount: PLAN.cents,
    recurring: { interval: "month" },
    product_data: { name: PLAN.name },
  })
  return price.id
}
