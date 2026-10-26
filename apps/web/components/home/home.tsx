"use client"

import { useEffect, useState } from "react"
import {
  STATUSES,
  STATUS_NAME,
  type LogEntry,
  type Project,
  type Task,
} from "@/lib/sync/types"
import { onFeed, refOf, toast, useData, type Data } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Av, StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { isLive } from "@/components/board/board"
import { ago } from "@/lib/ui/format"

/**
 * The workspace at a glance, above any one project: every project and where
 * it's at, what's on your plate and your agents' across all of them, and
 * the latest few things that happened.
 */
export function Home() {
  const d = useData()
  const { go, openTask, newProject } = useApp()
  const projects = Object.values(d.projects).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  // Yours and your agents': Doing first, then Todo, each in board order.
  const plate = Object.values(d.tasks)
    .filter(
      (t) =>
        (t.status === "doing" || t.status === "todo") &&
        t.assigneeId &&
        (t.assigneeId === d.me.memberId ||
          d.members[t.assigneeId]?.kind === "agent")
    )
    .sort(
      (a, b) =>
        Number(a.status === "todo") - Number(b.status === "todo") ||
        a.position - b.position
    )

  return (
    <div className="set">
      <div className="set-col wide">
        <div className="godhead">
          <h1>{d.workspace.name}</h1>
          <p>
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </p>
        </div>

        <section>
          <h4>Projects</h4>
          <div className="projects">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                p={p}
                d={d}
                onOpen={() => go({ view: "board", key: p.key })}
              />
            ))}
            <button className="pcard add" onClick={newProject}>
              <span className="plus">{I.plus}</span>
              New project
            </button>
          </div>
        </section>

        <section>
          <h4>
            On your plate <span className="n">{plate.length}</span>
          </h4>
          {plate.length ? (
            <div className="set-card">
              {plate.map((t) => {
                const who = t.assigneeId ? d.members[t.assigneeId] : null
                return (
                  <button
                    key={t.id}
                    className="set-row line"
                    onClick={() => openTask(refOf(d, t))}
                  >
                    <StatusIcon s={t.status} />
                    <span className="cid" style={{ width: 64, flex: "none" }}>
                      {refOf(d, t)}
                    </span>
                    <div className="who">
                      <div>{t.title}</div>
                    </div>
                    <Av m={who} live={isLive(d, t)} />
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="set-note">
              Nothing in Todo or Doing for you or your agents.
            </p>
          )}
        </section>

        <Lately />
      </div>
    </div>
  )
}

function ProjectCard({
  p,
  d,
  onOpen,
}: {
  p: Project
  d: Data
  onOpen: () => void
}) {
  const tasks = Object.values(d.tasks).filter((t) => t.projectId === p.id)
  const count = (s: Task["status"]) =>
    tasks.filter((t) => t.status === s).length
  // Who's on it now: the faces of everyone with something in Doing.
  const doing = [
    ...new Set(
      tasks
        .filter((t) => t.status === "doing" && t.assigneeId)
        .map((t) => t.assigneeId!)
    ),
  ]
  return (
    <button className="pcard" onClick={onOpen}>
      <div className="r1">
        <span className="keypill">{p.key}</span>
        <span className="pc-name">{p.name}</span>
      </div>
      <div className="pc-counts">
        {STATUSES.map((s) => (
          <span key={s} title={STATUS_NAME[s]}>
            <StatusIcon s={s} />
            {count(s)}
          </span>
        ))}
      </div>
      <div className="pc-faces">
        {doing.length ? (
          doing.map((id) => (
            <Av
              key={id}
              m={d.members[id]}
              live={d.members[id]?.kind === "agent"}
            />
          ))
        ) : (
          <span className="muted">Nobody in Doing</span>
        )}
      </div>
    </button>
  )
}

/** The last few lines of the workspace's history. */
function Lately() {
  const d = useData()
  const { go } = useApp()
  const [rows, setRows] = useState<LogEntry[] | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => onFeed(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    let live = true
    api.log.list
      .query({})
      .then((r) => live && setRows(r.entries.slice(0, 6)))
      .catch((e) => toast((e as Error).message))
    return () => {
      live = false
    }
  }, [tick])
  if (!rows?.length) return null
  return (
    <section>
      <h4>
        Lately
        <button
          className="linkish lately-all"
          onClick={() => go({ view: "activity" })}
        >
          All activity
        </button>
      </h4>
      <div className="set-card">
        {rows.map((e) => {
          const m = e.actorId ? d.members[e.actorId] : null
          const p = e.projectId ? d.projects[e.projectId] : undefined
          return (
            <div key={e.id} className="set-row">
              <Av m={m} size="lg" />
              <div className="who">
                <div>{e.summary}</div>
                <div className="sub">
                  {e.actorId === d.me.memberId ? "You" : e.actorName}
                  {p && ` · ${p.key}`}
                </div>
              </div>
              <span className="role" suppressHydrationWarning>
                {ago(e.createdAt) === "now"
                  ? "just now"
                  : `${ago(e.createdAt)} ago`}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
