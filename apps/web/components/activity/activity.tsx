"use client"

import { useEffect, useState } from "react"
import type { LogEntry, Member, TrashItem } from "@/lib/sync/types"
import {
  liveMembers,
  onFeed,
  putProject,
  putTask,
  toast,
  useData,
} from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Menu } from "@/components/chrome/menu"
import { Av } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { ago } from "@/lib/ui/format"

const KINDS: Record<LogEntry["kind"], string> = {
  task: "Tasks",
  project: "Projects",
  member: "People and agents",
  workspace: "Workspace",
}

/**
 * Everything that happened in the workspace, newest first, and the trash.
 * One history rather than one per screen: "who did that, and when" is one
 * question. Each line is the sentence written when it happened.
 */
export function Activity({
  projectKey,
  trash,
}: {
  /** One project's lines and trash; without it, the whole workspace's. */
  projectKey?: string
  trash: boolean
}) {
  const { go } = useApp()
  const to = (t: boolean) => go({ view: "activity", key: projectKey, trash: t })
  return (
    <div className="set">
      <div className="set-col wide">
        <div className="toolbar">
          <div className="seg" role="tablist" aria-label="Activity or trash">
            <button role="tab" aria-selected={!trash} onClick={() => to(false)}>
              Activity
            </button>
            <button role="tab" aria-selected={trash} onClick={() => to(true)}>
              Trash
            </button>
          </div>
        </div>
        {trash ? (
          <Trash projectKey={projectKey} />
        ) : (
          <History projectKey={projectKey} />
        )}
      </div>
    </div>
  )
}

function History({ projectKey }: { projectKey?: string }) {
  const d = useData()
  const { go } = useApp()
  const [actor, setActor] = useState<string | null>(null)
  const [kind, setKind] = useState<string | null>(null)
  const [rows, setRows] = useState<LogEntry[] | null>(null)
  const [more, setMore] = useState(false)
  const [menu, setMenu] = useState<null | {
    k: "who" | "kind"
    el: HTMLElement
  }>(null)

  // The first page, again whenever the filters change or someone else acts.
  const [tick, setTick] = useState(0)
  useEffect(() => onFeed(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    let live = true
    api.log.list
      .query({ actor, kind, project: projectKey })
      .then((r) => {
        if (!live) return
        setRows(r.entries)
        setMore(r.more)
      })
      .catch((e) => toast((e as Error).message))
    return () => {
      live = false
    }
  }, [actor, kind, tick, projectKey])

  const next = async () => {
    try {
      const r = await api.log.list.query({
        actor,
        kind,
        project: projectKey,
        before: rows?.[rows.length - 1]?.id,
      })
      setRows((cur) => [...(cur ?? []), ...r.entries])
      setMore(r.more)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  const people = liveMembers(d)
  const who = actor ? d.members[actor] : null
  const days = group(rows ?? [])

  const open = (e: LogEntry) => {
    const p = e.projectId ? d.projects[e.projectId] : undefined
    if (e.kind === "task" && e.subjectId && d.tasks[e.subjectId] && p)
      return go({ view: "board", key: p.key, task: e.label })
    if (e.kind === "project" && p) return go({ view: "board", key: p.key })
  }

  return (
    <>
      <div className="filters">
        <button
          className="prop"
          onClick={(e) => setMenu({ k: "who", el: e.currentTarget })}
        >
          {who ? <Av m={who} /> : null}
          {who ? who.name : "Everyone"}
          {I.chev}
        </button>
        <button
          className="prop"
          onClick={(e) => setMenu({ k: "kind", el: e.currentTarget })}
        >
          {kind ? KINDS[kind as LogEntry["kind"]] : "Everything"}
          {I.chev}
        </button>
      </div>

      {rows && !rows.length && (
        <p className="set-note">Nothing has happened here yet.</p>
      )}
      {days.map(([day, list]) => (
        <section key={day}>
          <h4>{day}</h4>
          <div className="set-card">
            {list.map((e) => {
              const m = e.actorId ? d.members[e.actorId] : null
              const p = e.projectId ? d.projects[e.projectId] : undefined
              return (
                <button
                  key={e.id}
                  className="set-row line"
                  onClick={() => open(e)}
                >
                  <Av m={m ?? stand(e)} size="lg" />
                  <div className="who">
                    <div>{e.summary}</div>
                    <div className="sub">
                      {e.actorId === d.me.memberId ? "You" : e.actorName}
                      {p && ` · ${p.key}`}
                    </div>
                  </div>
                  <span
                    className="role"
                    title={new Date(e.createdAt).toLocaleString()}
                    suppressHydrationWarning
                  >
                    {when(e.createdAt)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
      {more && (
        <button
          className="btn bare sm"
          style={{ alignSelf: "center" }}
          onClick={next}
        >
          Show more
        </button>
      )}

      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "who"}
        onClose={() => setMenu(null)}
        width={220}
      >
        {[null, ...people].map((m) => (
          <button
            key={m?.id ?? "all"}
            onClick={() => {
              setMenu(null)
              setActor(m?.id ?? null)
            }}
          >
            {m && <Av m={m} />}
            <span>{m ? m.name : "Everyone"}</span>
            {actor === (m?.id ?? null) && (
              <span className="check">{I.check}</span>
            )}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "kind"}
        onClose={() => setMenu(null)}
        width={220}
      >
        {[null, ...Object.keys(KINDS)].map((k) => (
          <button
            key={k ?? "all"}
            onClick={() => {
              setMenu(null)
              setKind(k)
            }}
          >
            <span>{k ? KINDS[k as LogEntry["kind"]] : "Everything"}</span>
            {kind === k && <span className="check">{I.check}</span>}
          </button>
        ))}
      </Menu>
    </>
  )
}

function Trash({ projectKey }: { projectKey?: string }) {
  const d = useData()
  const [all, setItems] = useState<TrashItem[] | null>(null)
  useEffect(() => {
    api.log.trash
      .query()
      .then(setItems)
      .catch((e) => toast((e as Error).message))
  }, [])
  const items =
    all && projectKey ? all.filter((x) => x.projectKey === projectKey) : all

  const bring = async (it: TrashItem) => {
    try {
      const r = await api.log.restore.mutate({ kind: it.kind, id: it.id })
      if ("task" in r && r.task) putTask(r.task)
      if ("project" in r && r.project) putProject(r.project)
      setItems((list) => list?.filter((x) => x.id !== it.id) ?? null)
      toast(`Restored ${it.label}`)
    } catch (e) {
      toast((e as Error).message)
    }
  }

  if (items && !items.length)
    return <p className="set-note">The trash is empty.</p>
  return (
    <section>
      <div className="set-card">
        {items?.map((it) => {
          const by = it.deletedBy ? d.members[it.deletedBy] : null
          return (
            <div className="set-row" key={`${it.kind}:${it.id}`}>
              <span className="keypill">{it.label}</span>
              <div className="who">
                <div>{it.title}</div>
                <div className="sub" suppressHydrationWarning>
                  {it.kind === "project" ? "Project" : "Task"}
                  {" · deleted "}
                  {by ? `by ${by.id === d.me.memberId ? "you" : by.name} ` : ""}
                  {when(it.deletedAt, true)}
                </div>
              </div>
              <button className="btn sm" onClick={() => bring(it)}>
                Restore
              </button>
            </div>
          )
        })}
      </div>
      <p className="set-note">
        Deleted tasks and projects stay here until you restore them.
      </p>
    </section>
  )
}

/** A face for a line nobody in the workspace did, like Stripe's. */
const stand = (e: LogEntry): Member => ({
  id: e.actorId ?? e.actorName,
  kind: "person",
  name: e.actorName,
  avatarUrl: null,
  role: "member",
  removed: true,
})

/** Lines by day: Today, Yesterday, then the date. */
function group(rows: LogEntry[]) {
  const days = new Map<string, LogEntry[]>()
  for (const r of rows) {
    const k = dayName(r.createdAt)
    days.set(k, [...(days.get(k) ?? []), r])
  }
  return [...days]
}

function dayName(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === y.toDateString()) return "Yesterday"
  return d.toLocaleDateString("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== today.getFullYear() && { year: "numeric" }),
  })
}

/** Today's lines show how long ago; older ones the time of day. */
function when(iso: string, rel = false) {
  const d = new Date(iso)
  if (rel || Date.now() - d.getTime() < 12 * 3600_000) {
    const a = ago(iso)
    return a === "now" ? "just now" : `${a} ago`
  }
  return d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
}
