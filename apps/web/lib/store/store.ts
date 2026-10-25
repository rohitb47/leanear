"use client"

import { createContext, useContext, useSyncExternalStore } from "react"
import type {
  Activity,
  Member,
  Project,
  Snapshot,
  Sync,
  Task,
} from "@/lib/sync/types"

// One small store for the workspace. Rows from the server and from our own
// optimistic writes land here; components read it with useData().
// Each App mount makes its own store, so server renders never share state.

export type Data = Omit<
  Snapshot,
  "members" | "projects" | "tasks" | "activity"
> & {
  members: Record<string, Member>
  projects: Record<string, Project>
  tasks: Record<string, Task>
  activity: Record<string, Activity[]>
}

export type Store = { state: Data; subs: Set<() => void> }
export const StoreContext = createContext<Store | null>(null)

/** The store event handlers and effects write to: the one mounted in the browser. */
let active: Store | null = null
export function activate(s: Store) {
  active = s
}
const emit = () => active!.subs.forEach((f) => f())

/** Tasks with a write in flight, so a sync can't undo an optimistic change. */
const inflight = new Map<string, number>()

const byId = <T extends { id: string }>(rows: T[]) =>
  Object.fromEntries(rows.map((r) => [r.id, r]))

export function makeStore(s: Snapshot): Store {
  return {
    subs: new Set(),
    state: {
      ...s,
      members: byId(s.members),
      projects: byId(s.projects),
      tasks: byId(s.tasks),
      activity: s.activity ? { [s.activity.taskId]: s.activity.items } : {},
    },
  }
}

export const get = () => active!.state

function update(fn: (d: Data) => Data) {
  active!.state = fn(active!.state)
  emit()
}

export function useData() {
  const s = useContext(StoreContext)!
  return useSyncExternalStore(
    (f) => {
      s.subs.add(f)
      return () => s.subs.delete(f)
    },
    () => s.state,
    () => s.state
  )
}

export function applySync(s: Sync) {
  update((d) => {
    const tasks = { ...d.tasks }
    for (const t of s.tasks) {
      if (inflight.has(t.id)) continue
      if (t.deleted) delete tasks[t.id]
      else tasks[t.id] = t
    }
    const projects = { ...d.projects }
    for (const p of s.projects) {
      if (p.deleted) delete projects[p.id]
      else projects[p.id] = p
    }
    const members = { ...d.members, ...byId(s.members) }
    const activity = s.activity
      ? { ...d.activity, [s.activity.taskId]: s.activity.items }
      : d.activity
    return { ...d, cursor: s.cursor, tasks, projects, members, activity }
  })
}

export function putTask(t: Task) {
  update((d) => {
    const tasks = { ...d.tasks }
    if (t.deleted) delete tasks[t.id]
    else tasks[t.id] = t
    return { ...d, tasks }
  })
}
export function putProject(p: Project) {
  update((d) => {
    const projects = { ...d.projects }
    if (p.deleted) delete projects[p.id]
    else projects[p.id] = p
    return { ...d, projects }
  })
}
export function putMember(m: Member) {
  update((d) => ({ ...d, members: { ...d.members, [m.id]: m } }))
}
export function putActivity(taskId: string, items: Activity[]) {
  update((d) => ({ ...d, activity: { ...d.activity, [taskId]: items } }))
}
export function setWorkspaceName(name: string) {
  update((d) => ({
    ...d,
    workspace: { ...d.workspace, name },
    workspaces: d.workspaces.map((w) =>
      w.id === d.workspace.id ? { ...w, name } : w
    ),
  }))
}

export function hold(id: string) {
  inflight.set(id, (inflight.get(id) ?? 0) + 1)
}
export function release(id: string) {
  const n = (inflight.get(id) ?? 1) - 1
  if (n <= 0) inflight.delete(id)
  else inflight.set(id, n)
}

/* ───────── Toasts ───────── */

const toastSubs = new Set<(m: string) => void>()
export const toast = (m: string) => toastSubs.forEach((f) => f(m))
export const onToast = (f: (m: string) => void) => {
  toastSubs.add(f)
  return () => {
    toastSubs.delete(f)
  }
}

/* ───────── Derived ───────── */

export const refOf = (d: Data, t: Task) =>
  `${d.projects[t.projectId]?.key ?? "?"}-${t.number}`
export const projectByKey = (d: Data, key: string) =>
  Object.values(d.projects).find((p) => p.key === key)
export function taskByRef(d: Data, ref: string) {
  const m = /^([A-Za-z]{2,5})-(\d+)$/.exec(ref)
  if (!m) return undefined
  const p = projectByKey(d, m[1].toUpperCase())
  if (!p) return undefined
  const n = Number(m[2])
  return Object.values(d.tasks).find(
    (t) => t.projectId === p.id && t.number === n
  )
}
export const liveMembers = (d: Data) =>
  Object.values(d.members).filter((m) => !m.removed)

/** A full page load, for when the whole store is stale (signed out, switched workspace). */
export function hardGo(path: string) {
  location.assign(path)
}
