"use client"

import { Mark } from "@leanear/ui/mark"
import { useState } from "react"
import { keyFor } from "@/lib/projects/key"
import { liveMembers, putProject, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Flow } from "@/components/chrome/flow"
import { AddAgent } from "@/components/workspace/add-agent"
import { SetupSteps } from "@/components/workspace/setup"
import { PlanCard, usePrice, useStartPlan } from "@/components/workspace/plan"
import { Button } from "@/components/common/button"

export type Step = "project" | "plan" | "agent" | "setup"

/**
 * First run, one thing per screen: what you're building, the plan (Cloud
 * only), your agent, and letting it fill the board from the repo. Each
 * screen's buttons sit in the pinned footer, never below the fold.
 */
export function Onboarding({ step: asked }: { step?: Step }) {
  const d = useData()
  const { go } = useApp()
  const price = usePrice()
  const plan = useStartPlan("/welcome/agent")
  const [making, setMaking] = useState(false)
  const has = Object.keys(d.projects).length > 0
  const unpaid = d.billing.on && !d.billing.active
  const steps: Step[] = d.billing.on
    ? ["project", "plan", "agent", "setup"]
    : ["project", "agent", "setup"]
  const step: Step = !has
    ? "project"
    : asked && steps.includes(asked) && !(asked === "plan" && !unpaid)
      ? asked
      : unpaid
        ? "plan"
        : "agent"
  const at = steps.indexOf(step)

  const key = Object.values(d.projects)[0]?.key ?? ""
  const next = () => {
    const n = steps[at + 1]
    if (n) go({ view: "welcome", step: n })
    else go({ view: "board", key })
  }
  const agent = liveMembers(d).some((m) => m.kind === "agent")

  const foot =
    step === "project" ? (
      <Button
        className="btn accent"
        type="submit"
        form="project-form"
        loading={making}
      >
        Create project
      </Button>
    ) : step === "plan" ? (
      <Button className="btn accent" loading={plan.busy} onClick={plan.start}>
        Start for ${price} a month
      </Button>
    ) : step === "agent" ? (
      <>
        <button className="btn bare" onClick={next}>
          Skip for now
        </button>
        <button className="btn accent" onClick={next} disabled={!agent}>
          Continue
        </button>
      </>
    ) : (
      <button className="btn accent" onClick={next}>
        Open the board
      </button>
    )

  return (
    <Flow foot={foot}>
      <div className="bigmark">
        <Mark size={36} />
      </div>
      <div className="steps" aria-hidden>
        {steps.map((s, i) => (
          <i key={s} className={i <= at ? "on" : ""} />
        ))}
      </div>
      {step === "project" && (
        <>
          <h1>What are you building, {d.me.name.split(/\s+/)[0]}?</h1>
          <p className="lead">
            One project per product. You can add more later.
          </p>
          <div className="card">
            <ProjectForm id="project-form" onDone={next} onBusy={setMaking} />
          </div>
        </>
      )}
      {step === "plan" && (
        <>
          <h1>One price for the whole team</h1>
          <p className="lead">
            ${price} a month for the workspace, not a seat. Pay with your
            company card; the invoice carries its name and tax id.
          </p>
          <PlanCard />
        </>
      )}
      {step === "agent" && (
        <>
          <h1>Bring your agent</h1>
          <p className="lead">
            It joins as a member with a name and a key, picks its next task,
            does it and reports back.
          </p>
          <div className="card" style={{ padding: 0 }}>
            <AddAgent autoFocus />
          </div>
        </>
      )}
      {step === "setup" && (
        <>
          <h1>Let it fill the board</h1>
          <p className="lead">
            Open your agent in the repo. It reads the code and turns TODOs,
            issues and your roadmap into tasks. It never changes code.
          </p>
          <div className="card">
            <SetupSteps projectKey={key} />
          </div>
        </>
      )}
    </Flow>
  )
}

/**
 * Name it; the key fills itself in (Provida → PRO) and can be changed. Its
 * button can live elsewhere, like a pinned footer, through the form's `id`.
 */
export function ProjectForm({
  id,
  onDone,
  onBusy,
  autoFocus = true,
}: {
  id: string
  onDone: (key: string) => void
  /** For a submit button that lives outside the form, like a pinned footer. */
  onBusy?: (busy: boolean) => void
  autoFocus?: boolean
}) {
  const [name, setName] = useState("")
  const [key, setKey] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusyState] = useState(false)
  const setBusy = (b: boolean) => {
    setBusyState(b)
    onBusy?.(b)
  }
  const k = key ?? (name.trim() ? keyFor(name) : "")
  return (
    <form
      id={id}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
      onSubmit={async (e) => {
        e.preventDefault()
        if (busy) return
        if (!name.trim()) return setErr("Give it a name")
        setBusy(true)
        try {
          const p = await api.projects.create.mutate({ name, key: k })
          putProject(p)
          onDone(p.key)
        } catch (x) {
          setErr((x as Error).message)
          setBusy(false)
        }
      }}
    >
      <div>
        <label className="label" htmlFor={`${id}-name`}>
          Project name
          <input
            aria-label="Key"
            value={k}
            placeholder="KEY"
            onChange={(e) =>
              setKey(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, "")
                  .slice(0, 5)
              )
            }
          />
        </label>
        <input
          className="field"
          id={`${id}-name`}
          autoFocus={autoFocus}
          value={name}
          placeholder="Provida"
          maxLength={60}
          autoComplete="off"
          onChange={(e) => {
            setName(e.target.value)
            setErr(null)
          }}
        />
      </div>
      {err && <div className="err">{err}</div>}
    </form>
  )
}
