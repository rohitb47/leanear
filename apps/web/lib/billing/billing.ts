import "server-only"
import Stripe from "stripe"
import { record } from "@/lib/log/log"
import { prisma } from "@/lib/prisma"
import type { Billing } from "@/lib/sync/types"
import { person, type Ctx } from "@/lib/workspace/context"
import { LeanError } from "@/lib/utils"
import { PLAN, billingOn, cloudPrice, stripe } from "./stripe"

/** Statuses that keep a workspace running. Past due gets Stripe's retries. */
const RUNNING = ["active", "trialing", "past_due"]

const running = (status: string | null) => !!status && RUNNING.includes(status)

async function workspace(ws: string) {
  const w = await prisma.workspace.findUnique({ where: { id: ws } })
  if (!w) throw new LeanError("No such workspace", 404)
  return w
}

async function usage(ws: string) {
  const [projects, people, agents] = await Promise.all([
    prisma.project.count({
      where: { workspaceId: ws, deletedAt: null, archivedAt: null },
    }),
    prisma.member.count({
      where: { workspaceId: ws, kind: "person", removedAt: null },
    }),
    prisma.member.count({
      where: { workspaceId: ws, kind: "agent", removedAt: null },
    }),
  ])
  return { projects, people, agents }
}

export async function billing(ws: string): Promise<Billing> {
  if (!billingOn()) return { on: false }
  const w = await workspace(ws)
  return {
    on: true,
    active: running(w.billingStatus),
    status: w.billingStatus,
    paidUntil: w.paidUntil?.toISOString() ?? null,
    cancelsAtEnd: w.cancelsAtEnd,
    cents: PLAN.cents,
    limits: {
      projects: PLAN.projects,
      people: PLAN.people,
      agents: PLAN.agents,
    },
    usage: await usage(ws),
  }
}

/** Refuse work in a Cloud workspace that hasn't paid. */
export async function mustBePaid(ws: string) {
  if (!billingOn()) return
  const w = await workspace(ws)
  if (!running(w.billingStatus))
    throw new LeanError(
      "This workspace's Leanear Cloud plan isn't active. Open Leanear to start it.",
      402
    )
}

const NOUN = { projects: "projects", people: "people", agents: "agents" }

/** Cloud's caps: 10 projects, 20 people, 5 agents. Self-hosted has none. */
export async function withinPlan(c: Pick<Ctx, "ws">, what: keyof typeof NOUN) {
  if (!billingOn()) return
  const n = (await usage(c.ws))[what]
  if (n >= PLAN[what])
    throw new LeanError(
      `Leanear Cloud has room for ${PLAN[what]} ${NOUN[what]}. Remove one first, or run Leanear yourself for no caps.`
    )
}

/** Stripe's refusal, in words a person can act on. */
async function asked<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (e) {
    if (e instanceof Stripe.errors.StripeError)
      throw new LeanError(`Stripe said: ${e.message}`)
    throw e
  }
}

/** A Stripe Checkout page for the $9 plan. Returns its URL. */
export async function checkout(
  c: Ctx,
  a: { email: string; origin: string; back?: string }
) {
  return asked(() => startCheckout(c, a))
}

async function startCheckout(
  c: Ctx,
  a: { email: string; origin: string; back?: string }
) {
  person(c)
  if (!billingOn()) throw new LeanError("Billing is off on this server")
  const w = await workspace(c.ws)
  if (running(w.billingStatus))
    throw new LeanError("This workspace is already on Leanear Cloud")
  // Only a path in this app, never somewhere else.
  const back = a.back && /^\/(?![\/\\])/.test(a.back) ? a.back : "/"
  const s = stripe()
  let customer = w.stripeCustomer
  if (!customer) {
    const made = await s.customers.create({
      name: w.name,
      email: a.email,
      metadata: { workspace: w.id },
    })
    customer = made.id
    await prisma.workspace.update({
      where: { id: w.id },
      data: { stripeCustomer: customer },
    })
  }
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: w.id,
    line_items: [{ price: await cloudPrice(), quantity: 1 }],
    subscription_data: { metadata: { workspace: w.id } },
    // A company card: its legal name, address and tax id go on the invoice.
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { name: "auto", address: "auto" },
    allow_promotion_codes: true,
    integration_identifier: "leanear_cloud_qvhmzrkt",
    success_url: `${a.origin}/billing/done?session={CHECKOUT_SESSION_ID}&back=${encodeURIComponent(back)}`,
    cancel_url: `${a.origin}${back}`,
  })
  if (!session.url) throw new LeanError("Stripe didn't return a checkout page")
  return { url: session.url }
}

/** Stripe's own page for the card, invoices and cancelling. */
export async function portal(c: Ctx, a: { origin: string }) {
  return asked(() => openPortal(c, a))
}

async function openPortal(c: Ctx, a: { origin: string }) {
  person(c)
  if (!billingOn()) throw new LeanError("Billing is off on this server")
  const w = await workspace(c.ws)
  if (!w.stripeCustomer) throw new LeanError("Start the plan first")
  const session = await stripe().billingPortal.sessions.create({
    customer: w.stripeCustomer,
    return_url: `${a.origin}/settings`,
  })
  return { url: session.url }
}

/** Mirror a subscription onto its workspace. Safe to run twice. */
export async function applySubscription(sub: Stripe.Subscription) {
  const customer =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id
  // The customer is the workspace; metadata only covers a race on the first one.
  const w =
    (await prisma.workspace.findFirst({
      where: { stripeCustomer: customer },
    })) ??
    (sub.metadata?.workspace
      ? await prisma.workspace.findFirst({
          where: { id: sub.metadata.workspace },
        })
      : null)
  if (!w) return
  // An old, ended subscription mustn't overwrite the one that replaced it.
  if (w.subscription && w.subscription !== sub.id && sub.status === "canceled")
    return
  const end = sub.items.data[0]?.current_period_end
  const was = running(w.billingStatus)
  const now = running(sub.status)
  if (
    was !== now ||
    (sub.status === "past_due") !== (w.billingStatus === "past_due")
  )
    await record(
      prisma,
      { ws: w.id, me: null, by: "Stripe" },
      {
        action: `plan.${sub.status}`,
        kind: "workspace",
        subject: { id: sub.id, label: "Leanear Cloud" },
        summary:
          sub.status === "past_due"
            ? "A payment for Leanear Cloud didn't go through"
            : now
              ? "Leanear Cloud started"
              : "Leanear Cloud ended",
      }
    )
  await prisma.workspace.update({
    where: { id: w.id },
    data: {
      stripeCustomer: customer,
      subscription: sub.id,
      billingStatus: sub.status,
      paidUntil: end ? new Date(end * 1000) : null,
      cancelsAtEnd: sub.cancel_at_period_end,
    },
  })
}

/** Re-read a subscription from Stripe and mirror it, from any event that names one. */
export async function syncSubscription(id: string) {
  await applySubscription(await stripe().subscriptions.retrieve(id))
}

/** Back from Checkout: record the plan now rather than wait for the webhook. */
export async function finishCheckout(sessionId: string) {
  const s = stripe()
  const session = await s.checkout.sessions.retrieve(sessionId)
  if (!session.subscription) return
  const id =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id
  await applySubscription(await s.subscriptions.retrieve(id))
}
