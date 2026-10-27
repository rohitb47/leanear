"use client"

import { Mark } from "@shipthat/ui/mark"
import { useState } from "react"
import { authClient } from "@/lib/auth/client"
import { hardGo, toast, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { Flow } from "@/components/chrome/flow"
import { I } from "@/components/common/icons"
import { Button } from "@/components/common/button"

const GETS = [
  "10 projects, unlimited tasks",
  "Up to 20 people",
  "5 agents",
  "Every MCP tool",
]

/** Off to Stripe Checkout for the plan, coming back to `back`. */
export function useStartPlan(back = "/") {
  const [busy, setBusy] = useState(false)
  const start = async () => {
    setBusy(true)
    try {
      location.assign((await api.billing.checkout.mutate({ back })).url)
    } catch (e) {
      toast((e as Error).message)
      setBusy(false)
    }
  }
  return { busy, start }
}

export const usePrice = () => {
  const d = useData()
  return (d.billing.on ? d.billing.cents : 900) / 100
}

/**
 * The Cloud plan, as the site prices it: one flat $9 for the workspace.
 * Without `back` it has no button; the page's footer carries it.
 */
export function PlanCard({ back }: { back?: string }) {
  const price = usePrice()
  const { busy, start } = useStartPlan(back)
  return (
    <div className="plan">
      <span className="name">shipth.at Cloud</span>
      <div className="amt">
        ${price}
        <span className="per">/month</span>
      </div>
      <ul>
        {GETS.map((g) => (
          <li key={g}>
            {I.tick}
            {g}
          </li>
        ))}
      </ul>
      {back !== undefined && (
        <Button className="btn accent wide" loading={busy} onClick={start}>
          Start for ${price} a month
        </Button>
      )}
      <p className="fine">
        For the whole workspace, not a seat. Cancel any time in Settings.
      </p>
    </div>
  )
}

/** A Cloud workspace that isn't paid for yet: the plan, and nothing else. */
export function Paywall() {
  const d = useData()
  const price = usePrice()
  const { busy, start } = useStartPlan("/")
  const lapsed = d.billing.on && !!d.billing.status
  return (
    <Flow
      foot={
        <>
          <Button
            className="btn bare"
            onClick={async () => {
              await authClient.signOut()
              hardGo("/signin")
            }}
          >
            Sign out
          </Button>
          <Button className="btn accent" loading={busy} onClick={start}>
            Start for ${price} a month
          </Button>
        </>
      }
    >
      <div className="bigmark">
        <Mark size={40} />
      </div>
      <h1>
        {lapsed ? `${d.workspace.name} is paused` : `Start ${d.workspace.name}`}
      </h1>
      <p className="lead">
        {lapsed
          ? "The plan ended. Start it again and everything is where you left it."
          : "Your board and your agents, for a small team."}
      </p>
      <PlanCard />
    </Flow>
  )
}
