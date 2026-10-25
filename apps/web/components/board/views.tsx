"use client"

import { useState } from "react"
import { TYPE_NAME } from "@/lib/sync/types"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { isLive } from "@/components/board/board"
import { I } from "@/components/common/icons"
import { md } from "@/lib/ui/markdown"
import {
  projectByKey,
  putProject,
  refOf,
  toast,
  useData,
} from "@/lib/store/store"
import { Av, StatusDot } from "@/components/common/badges"
import { count } from "@/lib/ui/format"

/** Todo and Doing across every project, for you and your agents. */
export function Mine({ openId }: { openId: string | null }) {
  const d = useData()
  const { openTask } = useApp()
  const mine = Object.values(d.tasks).filter((t) => {
    if (t.status !== "todo" && t.status !== "doing") return false
    if (!t.assigneeId) return false
    return (
      t.assigneeId === d.me.memberId ||
      d.members[t.assigneeId]?.kind === "agent"
    )
  })
  const groups = Object.values(d.projects)
    .map((p) => ({
      p,
      list: mine
        .filter((t) => t.projectId === p.id)
        .sort((a, b) =>
          a.status === b.status
            ? a.position - b.position
            : a.status === "doing"
              ? -1
              : 1
        ),
    }))
    .filter((g) => g.list.length)
  return (
    <>
      <div className="titlerow">
        <h1>My Tasks</h1>
        <span className="mono">
          Todo and Doing, yours and your agents&apos;, across projects
        </span>
      </div>
      <div className="pad">
        {!groups.length && (
          <div className="empty">
            Nothing on your plate. Assign yourself or an agent a task in Todo.
          </div>
        )}
        {groups.map((g) => (
          <section key={g.p.id}>
            <div className="sechead">
              <span>{g.p.name}</span>
              <span style={{ marginLeft: "auto" }}>{count(g.list.length)}</span>
            </div>
            {g.list.map((t) => (
              <button
                key={t.id}
                className="row"
                style={
                  t.id === openId
                    ? { background: "var(--tint2)" }
                    : isLive(d, t)
                      ? { boxShadow: "inset 0 0 0 1.5px var(--ink)" }
                      : undefined
                }
                onClick={() => openTask(refOf(d, t))}
              >
                <StatusDot s={t.status} />
                <span className="cid" style={{ width: 64, flex: "none" }}>
                  {refOf(d, t)}
                </span>
                <span className="t">{t.title}</span>
                <span className="type hide-s">{TYPE_NAME[t.type]}</span>
                <Av m={d.members[t.assigneeId!]} />
              </button>
            ))}
          </section>
        ))}
      </div>
    </>
  )
}

/** One page per project on what it is and how it works. Agents read it first. */
export function Brief({ projectKey }: { projectKey: string }) {
  const d = useData()
  const p = projectByKey(d, projectKey)!
  const [edit, setEdit] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (edit === null) return
    setBusy(true)
    try {
      putProject(
        await api.projects.update.mutate({ project: p.id, brief: edit })
      )
      setEdit(null)
      toast("Brief saved")
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="titlerow">
        <h1>{p.name}</h1>
        <span className="mono">{p.key} · Brief</span>
        <span className="grow" />
        {edit === null ? (
          <button className="btn" onClick={() => setEdit(p.brief || TEMPLATE)}>
            Edit
          </button>
        ) : (
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn bare" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn primary" onClick={save} disabled={busy}>
              Save
            </button>
          </span>
        )}
      </div>
      <article className="doc">
        <div className="callout">
          {I.info}
          <div>
            Agents read this page before every task, through{" "}
            <span className="mono" style={{ color: "inherit" }}>
              get_brief
            </span>
            .
          </div>
        </div>
        {edit !== null ? (
          <textarea
            className="field"
            autoFocus
            value={edit}
            onChange={(e) => setEdit(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()
            }
          />
        ) : p.brief ? (
          <div
            className="md"
            dangerouslySetInnerHTML={{ __html: md(p.brief) }}
          />
        ) : (
          <p className="muted">
            No brief yet. Write what {p.name} is, how it works, and the rules
            for anyone building it.{" "}
            <button className="btn sm" onClick={() => setEdit(TEMPLATE)}>
              Start one
            </button>
          </p>
        )}
      </article>
    </>
  )
}

const TEMPLATE = `One or two sentences on what this is and who it's for.

## How it works
- 

## Rules for anyone building it
- 

## Where things are
- 
`
