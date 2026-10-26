"use client"

import { useEffect, useState } from "react"
import { hardGo, projectByKey, toast, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { Button } from "@/components/common/button"

type Stats = Awaited<ReturnType<typeof api.dev.stats.query>>

const n = (k: number, one: string, many: string) =>
  `${k} ${k === 1 ? one : many}`

/**
 * God mode: resets and test data for the local database, as in Provida. It
 * only exists under `next dev` on a local database. Each change reloads the
 * page, since the store underneath is no longer true.
 */
export function GodMode({ projectKey }: { projectKey: string }) {
  const d = useData()
  const p = projectByKey(d, projectKey)
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    api.dev.stats
      .query()
      .then(setStats)
      .catch((e) => toast((e as Error).message))
  }, [])
  if (!p) return null
  const key = p.key
  const paid = d.billing.on && d.billing.active

  return (
    <div className="set">
      <div className="set-col">
        <div className="godhead">
          <h1>God mode</h1>
          <p>Your local database only. None of this exists anywhere else.</p>
        </div>

        <Section title="Quick start">
          <Action
            title="Fill a demo project"
            detail="A new project with an agent and a dozen tasks across the board."
            label="Fill"
            run={async () => {
              const r = await api.dev.fill.mutate()
              return `/${r.key}`
            }}
          />
        </Section>

        <Section title={`This project (${key})`}>
          <Action
            title="Add 10 test tasks"
            detail="Spread over the four columns."
            label="Add"
            run={() => api.dev.addTasks.mutate({ project: p.id })}
          />
          <Action
            title="Delete every task"
            detail={`All of ${key}'s tasks, for good. Numbering starts again at ${key}-1.`}
            label="Delete"
            danger
            run={() => api.dev.clearTasks.mutate({ project: p.id })}
          />
        </Section>

        <Section title="Workspace">
          <Action
            title="Clear the activity"
            detail={
              stats
                ? n(stats.log, "line", "lines") + " of history."
                : "Every line of history."
            }
            label="Clear"
            danger
            run={() => api.dev.clearLog.mutate()}
          />
          <Action
            title="Empty the trash"
            detail={
              stats
                ? n(stats.trash, "thing", "things") + ", deleted for good."
                : "Deleted for good."
            }
            label="Empty"
            danger
            run={() => api.dev.emptyTrash.mutate()}
          />
          <Action
            title="Revoke keys never used"
            detail={
              stats
                ? `${n(stats.unused, "key", "keys")} out of ${stats.keys}, like the ones a failed setup leaves.`
                : "Like the ones a failed setup leaves."
            }
            label="Revoke"
            run={() => api.dev.revokeUnused.mutate()}
          />
          {d.billing.on && (
            <Action
              title={paid ? "Mark the plan unpaid" : "Mark the plan paid"}
              detail={
                paid
                  ? "See the plan screen and the refusals, without touching Stripe."
                  : "Skip Stripe and unlock the workspace."
              }
              label={paid ? "Unpay" : "Pay"}
              run={() => api.dev.setPaid.mutate({ paid: !paid })}
            />
          )}
          <Action
            title="Start over"
            detail="Every project, task, agent, invite and line of history, gone. You stay, and land on onboarding."
            label="Wipe"
            danger
            run={async () => {
              await api.dev.wipe.mutate()
              return "/welcome"
            }}
          />
        </Section>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h4>{title}</h4>
      <div className="set-card">{children}</div>
    </section>
  )
}

/**
 * One reset: what it does, and its button. A dangerous one asks once, by
 * turning into "Sure?" for a few seconds.
 */
function Action({
  title,
  detail,
  label,
  danger,
  run,
}: {
  title: string
  detail: string
  label: string
  danger?: boolean
  /** Returns where to land after, if not here. */
  run: () => Promise<unknown>
}) {
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!asking) return
    const t = setTimeout(() => setAsking(false), 3000)
    return () => clearTimeout(t)
  }, [asking])
  return (
    <div className="set-row">
      <div className="who">
        <div>{title}</div>
        <div className="sub" style={{ whiteSpace: "normal" }}>
          {detail}
        </div>
      </div>
      <Button
        className={`btn sm${danger ? " danger" : ""}`}
        loading={busy}
        onClick={async () => {
          if (danger && !asking) return setAsking(true)
          setBusy(true)
          try {
            const to = await run()
            hardGo(typeof to === "string" ? to : location.pathname)
          } catch (e) {
            toast((e as Error).message)
            setBusy(false)
            setAsking(false)
          }
        }}
      >
        {asking ? "Sure?" : label}
      </Button>
    </div>
  )
}
