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
  "members" | "projects" | "tasks" | "recent" | "activity"
> & {
  members: Record<string, Member>
  /** Open projects only. Archived ones wait in `archived`, out of every list. */
  projects: Record<string, Project>
  archived: Record<string, Project>
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
      projects: byId(s.projects.filter((p) => !p.archived)),
      archived: byId(s.projects.filter((p) => p.archived)),
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

/**
 * A sync asked before our own save landed can answer after it. Its row is
 * older than the one we hold, so it mustn't win.
 */
const older = (row: { updatedAt: string }, have?: { updatedAt: string }) =>
  !!have && row.updatedAt < have.updatedAt

export function applySync(s: Sync) {
  const d = active!.state
  // Most ticks change nothing. Then nothing re-renders: the board's cards
  // aren't re-measured every three seconds.
  const tasks = merge(
    d.tasks,
    s.tasks,
    (t) => inflight.has(t.id) || older(t, d.tasks[t.id])
  )
  // A project is in one of the two maps; the other sees it as gone.
  const projects = merge(d.projects, s.projects.map(open))
  const archived = merge(d.archived, s.projects.map(shut))
  const members = merge(d.members, s.members)
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b)
  const activity =
    s.activity && !same(d.activity[s.activity.taskId], s.activity.items)
      ? { ...d.activity, [s.activity.taskId]: s.activity.items }
      : d.activity
  if (
    tasks === d.tasks &&
    projects === d.projects &&
    archived === d.archived &&
    members === d.members &&
    activity === d.activity
  )
    active!.state = { ...d, cursor: s.cursor }
  else
    update(() => ({
      ...d,
      cursor: s.cursor,
      tasks,
      projects,
      archived,
      members,
      activity,
    }))
  if (s.recent.length) feedSubs.forEach((f) => f(s.recent))
}

/** A project as the open map sees it, and as the archived one does. */
const open = (p: Project) => (p.archived ? { ...p, deleted: true } : p)
const shut = (p: Project) => (p.archived ? p : { ...p, deleted: true })

/**
 * Rows from the server laid over what we hold: the same object back when
 * nothing differs. `skip` keeps rows we're writing ourselves.
 */
function merge<T extends { id: string; deleted?: boolean; removed?: boolean }>(
  have: Record<string, T>,
  rows: T[],
  skip?: (row: T) => boolean
) {
  let next: Record<string, T> | null = null
  for (const r of rows) {
    if (skip?.(r)) continue
    const cur = have[r.id]
    if (r.deleted) {
      if (!cur) continue
      next ??= { ...have }
      delete next[r.id]
    } else if (!cur || JSON.stringify(cur) !== JSON.stringify(r)) {
      next ??= { ...have }
      next[r.id] = r
    }
  }
  return next ?? have
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
  update((d) => ({
    ...d,
    projects: merge(d.projects, [open(p)]),
    archived: merge(d.archived, [shut(p)]),
  }))
}
export function setBilling(billing: Data["billing"]) {
  update((d) => ({ ...d, billing }))
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

/** A button on a toast, like Undo. */
export type ToastAction = { label: string; run: () => void }
const toastSubs = new Set<(m: string, a?: ToastAction) => void>()
export const toast = (m: string, a?: ToastAction) =>
  toastSubs.forEach((f) => f(m, a))
export const onToast = (f: (m: string, a?: ToastAction) => void) => {
  toastSubs.add(f)
  return () => {
    toastSubs.delete(f)
  }
}

/** Undo a delete: bring it back from the trash and put it where it was. */
export function undoable(
  label: string,
  restore: () => Promise<unknown>
): ToastAction {
  return {
    label: "Undo",
    run: () => {
      restore().then(
        () => toast(`Restored ${label}`),
        (e) => toast((e as Error).message)
      )
    },
  }
}

/* ───────── What others just did ───────── */

const feedSubs = new Set<(a: Activity[]) => void>()
export const onFeed = (f: (a: Activity[]) => void) => {
  feedSubs.add(f)
  return () => {
    feedSubs.delete(f)
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
