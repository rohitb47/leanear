"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { MotionConfig } from "motion/react"
import type { Snapshot, Status } from "@/lib/sync/types"
import { STATUSES } from "@/lib/sync/types"
import { loadActivity, patch } from "@/lib/store/patch"
import { api as trpc } from "@/trpc/client"
import { Bar } from "@/components/chrome/bar"
import { Palette } from "@/components/chrome/palette"
import { ConfirmHost } from "@/components/chrome/confirm"
import { Toasts } from "@/components/chrome/toast"
import { AddAgentDialog } from "@/components/workspace/add-agent"
import { Activity } from "@/components/activity/activity"
import { Board } from "@/components/board/board"
import { GodMode } from "@/components/dev/god-mode"
import { ProjectSettings, Settings } from "@/components/settings/settings"
import { Home } from "@/components/home/home"
import { NewProject } from "@/components/workspace/new-project"
import { Onboarding, type Step } from "@/components/workspace/onboarding"
import { Paywall } from "@/components/workspace/plan"
import { Setup } from "@/components/workspace/setup"
import { NewTask } from "@/components/task/new-task"
import { Panel } from "@/components/task/panel"
import {
  activate,
  applySync,
  get,
  makeStore,
  projectByKey,
  StoreContext,
  taskByRef,
  useData,
  type Data,
} from "@/lib/store/store"

/* ───────── Routes ───────── */

/**
 * The views inside the window. Home is the workspace's; Board is a project's;
 * Activity and Settings are either, by whether the route names a project.
 * God mode is one too, but never in the tab bar.
 */
export type Tab = "home" | "board" | "activity" | "settings" | "god"

export type Route =
  | { view: Tab; key?: string; trash?: boolean; task?: string }
  | { view: "welcome"; step?: Step }
  | { view: "plan" }

/** Paths of the workspace's own pages. Project keys are capitals, so never these. */
const OWN = ["activity", "settings", "god", "welcome"]

const LAST = "lean-project"
let lastKey: string | null = null

function remember(key: string) {
  lastKey = key
  document.cookie = `${LAST}=${encodeURIComponent(key)}; path=/; max-age=31536000; samesite=lax`
}

function remembered(d: Data, last = lastKey) {
  const ps = Object.values(d.projects)
  return (last && ps.find((p) => p.key === last)?.key) || ps[0]?.key || null
}

export function parse(d: Data, path: string, search: string): Route {
  const task = new URLSearchParams(search).get("t") ?? undefined
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent)
  if (parts[0] === "welcome")
    return { view: "welcome", step: parts[1] as Step | undefined }
  if (!parts.length) return { view: "home", task }
  if (OWN.includes(parts[0])) {
    const view = parts[0] as Tab
    return { view, trash: parts[1] === "trash", task }
  }
  const key = parts[0].toUpperCase()
  if (!projectByKey(d, key)) return { view: "home", task }
  if (parts[1] === "settings") return { view: "settings", key, task }
  if (parts[1] === "activity")
    return { view: "activity", key, trash: parts[2] === "trash", task }
  return { view: "board", key, task }
}

export function href(r: Route) {
  if (r.view === "welcome") return r.step ? `/welcome/${r.step}` : "/welcome"
  if (r.view === "plan") return "/"
  const at = r.key ? `/${r.key}` : ""
  const base =
    r.view === "home"
      ? "/"
      : r.view === "board"
        ? at || "/"
        : r.view === "activity"
          ? `${at}/activity${r.trash ? "/trash" : ""}`
          : `${at}/${r.view}`
  return r.task ? `${base}?t=${r.task}` : base
}

/** The route as asked for, corrected for what exists and what's paid for. */
function resolve(d: Data, r: Route): Route {
  const has = Object.keys(d.projects).length > 0
  if (!has) return { view: "welcome", step: "project" }
  if (r.view === "welcome") return r
  if (d.billing.on && !d.billing.active) return { view: "plan" }
  if (r.view === "plan") return { view: "home" }
  if (r.view === "god")
    return d.god ? { ...r, key: undefined } : { view: "home" }
  if (r.view === "home") return { ...r, key: undefined }
  if (r.key && !projectByKey(d, r.key))
    return r.view === "board" ? { view: "home" } : { ...r, key: undefined }
  if (r.view === "board" && !r.key) return { view: "home", task: r.task }
  return r
}

type AppApi = {
  route: Route
  go: (r: Route, replace?: boolean) => void
  project: string | null
  openTask: (ref: string) => void
  closeTask: () => void
  openNew: (status?: Status) => void
  openPalette: () => void
  newProject: () => void
  /** Bring a codebase: the one paste that connects an agent and fills the project. */
  openSetup: () => void
  /** Add an agent, in a dialog over wherever you are. */
  addAgent: () => void
}

const Ctx = createContext<AppApi | null>(null)
export const useApp = () => useContext(Ctx)!

/* ───────── App ───────── */

export function App({
  initial,
  path,
  search,
  last,
}: {
  initial: Snapshot
  path: string
  search: string
  last: string | null
}) {
  const [store] = useState(() => makeStore(initial))
  if (typeof window !== "undefined") {
    activate(store)
    lastKey ??= last
  }
  return (
    <StoreContext.Provider value={store}>
      <MotionConfig
        reducedMotion="user"
        // Things that move glide there in about a third of a second and settle.
        transition={{ type: "spring", bounce: 0.08, duration: 0.35 }}
      >
        <Shell path={path} search={search} last={last} />
      </MotionConfig>
    </StoreContext.Provider>
  )
}

function Shell({
  path,
  search,
  last,
}: {
  path: string
  search: string
  last: string | null
}) {
  const d = useData()
  const [asked, setRoute] = useState<Route>(() => parse(d, path, search))
  const route = resolve(d, asked)
  const [newTask, setNewTask] = useState<{ status: Status; n: number } | null>(
    null
  )
  const [palette, setPalette] = useState(false)
  const [newProject, setNewProject] = useState(false)
  const [setup, setSetup] = useState(false)
  const [agent, setAgent] = useState(false)

  // The project in view, or the last one, for New task and the like.
  const project = ("key" in route && route.key) || remembered(d, last)

  const go = useCallback((r: Route, replace = false) => {
    if ("key" in r && r.key) remember(r.key)
    const url = href(r)
    if (url !== location.pathname + location.search)
      history[replace ? "replaceState" : "pushState"](null, "", url)
    setRoute(r)
  }, [])

  useEffect(() => {
    const on = () => setRoute(parse(get(), location.pathname, location.search))
    window.addEventListener("popstate", on)
    return () => window.removeEventListener("popstate", on)
  }, [])

  // Keep the URL honest when the route resolves to something else ("/" → "/PRO").
  useEffect(() => {
    if (route.view === "plan") return
    const url = href(route)
    if (url !== location.pathname + location.search)
      history.replaceState(null, "", url)
  }, [route])

  const openTask = useCallback(
    (ref: string) => {
      if (!("key" in route)) return
      go({ ...route, task: ref })
    },
    [route, go]
  )
  const closeTask = useCallback(() => {
    if (!("task" in route) || !route.task) return
    go({ ...route, task: undefined })
  }, [route, go])

  const openNew = useCallback((status: Status = "todo") => {
    setPalette(false)
    setNewTask({ status, n: Date.now() })
  }, [])

  const openTaskRef = "task" in route ? route.task : undefined
  const open = openTaskRef ? taskByRef(d, openTaskRef) : undefined
  const openId = open?.id ?? null

  /* Sync: every 3s while visible, and at once on focus. */
  const openIdRef = useRef(openId)
  useEffect(() => {
    openIdRef.current = openId
  }, [openId])
  useEffect(() => {
    let stop = false
    let busy = false
    const tick = async () => {
      if (busy || stop) return
      if (document.visibilityState !== "visible") return
      busy = true
      try {
        const j = await trpc.workspace.sync.query({
          since: get().cursor,
          task: openIdRef.current,
        })
        if (j.workspace !== get().workspace.id) location.reload()
        else applySync(j.data)
      } catch {
        // offline: try again next tick
      } finally {
        busy = false
      }
    }
    const timer = window.setInterval(tick, 3000)
    const now = () => void tick()
    window.addEventListener("focus", now)
    document.addEventListener("visibilitychange", now)
    return () => {
      stop = true
      clearInterval(timer)
      window.removeEventListener("focus", now)
      document.removeEventListener("visibilitychange", now)
    }
  }, [])

  useEffect(() => {
    if (openId) void loadActivity(openId).catch(() => {})
  }, [openId])

  /* Keyboard: C new task, ⌘K, G then B, X or S, 1 to 4 for the open task. */
  const gAt = useRef(0)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = !!t?.closest?.(
        "input,textarea,select,[contenteditable='true']"
      )
      const inApp = route.view !== "welcome" && route.view !== "plan"
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (!inApp) return
        e.preventDefault()
        setPalette((p) => !p)
        return
      }
      if (e.key === "Escape") {
        if (document.documentElement.classList.contains("dragging")) return
        if (palette) setPalette(false)
        else if (newTask) setNewTask(null)
        else if (document.querySelector(".menu")) return
        else if (openId && !typing) closeTask()
        return
      }
      if (
        typing ||
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        newTask ||
        palette ||
        newProject ||
        setup ||
        agent ||
        !inApp
      )
        return
      const k = e.key.toLowerCase()
      if (Date.now() - gAt.current < 900) {
        gAt.current = 0
        // H is home; B the project's board; A and S stay at the level you're on.
        const here = "key" in route ? route.key : undefined
        if (k === "h") go({ view: "home", task: openTaskRef })
        else if (k === "b" && project)
          go({ view: "board", key: project, task: openTaskRef })
        else if (k === "a")
          go({ view: "activity", key: here, task: openTaskRef })
        else if (k === "s")
          go({ view: "settings", key: here, task: openTaskRef })
        return
      }
      if (k === "g") gAt.current = Date.now()
      else if (k === "c") {
        e.preventDefault()
        openNew()
      } else if (open && ["1", "2", "3", "4"].includes(e.key)) {
        const s = STATUSES[+e.key - 1]
        if (s !== open.status)
          void patch(open.id, { status: s }, () =>
            trpc.tasks.move.mutate({ id: open.id, status: s })
          )
      }
    }
    window.addEventListener("keydown", on)
    return () => window.removeEventListener("keydown", on)
  }, [
    route,
    palette,
    newTask,
    newProject,
    setup,
    agent,
    open,
    openId,
    openTaskRef,
    project,
    go,
    openNew,
    closeTask,
  ])

  const api = useMemo<AppApi>(
    () => ({
      route,
      go,
      project,
      openTask,
      closeTask,
      openNew,
      openPalette: () => setPalette(true),
      newProject: () => setNewProject(true),
      openSetup: () => setSetup(true),
      addAgent: () => setAgent(true),
    }),
    [route, go, project, openTask, closeTask, openNew]
  )

  if (route.view === "welcome" || route.view === "plan") {
    return (
      <Ctx.Provider value={api}>
        <div className="app">
          <div className="frame">
            {route.view === "welcome" ? (
              <Onboarding step={route.step} />
            ) : (
              <Paywall />
            )}
          </div>
        </div>
        <Toasts />
      </Ctx.Provider>
    )
  }

  return (
    <Ctx.Provider value={api}>
      <div className="app">
        <div className="frame">
          <Bar />
          <div className="view">
            {/* A tab fades up quickly, so a switch never looks like a jump. */}
            <div key={`${route.view}:${route.key}`} className="view enter">
              {route.view === "home" && <Home />}
              {route.view === "board" && route.key && (
                <Board projectKey={route.key} openId={openId} />
              )}
              {route.view === "activity" && (
                <Activity projectKey={route.key} trash={!!route.trash} />
              )}
              {route.view === "settings" &&
                (route.key ? (
                  <ProjectSettings projectKey={route.key} />
                ) : (
                  <Settings />
                ))}
              {route.view === "god" && project && (
                <GodMode projectKey={project} />
              )}
            </div>
            <Panel taskId={openId} />
          </div>
        </div>
      </div>
      <NewTask state={newTask} onClose={() => setNewTask(null)} />
      <NewProject open={newProject} onClose={() => setNewProject(false)} />
      {project && (
        <Setup
          open={setup}
          onClose={() => setSetup(false)}
          projectKey={project}
        />
      )}
      <Palette open={palette} onClose={() => setPalette(false)} />
      <AddAgentDialog open={agent} onClose={() => setAgent(false)} />
      <ConfirmHost />
      <Toasts />
    </Ctx.Provider>
  )
}
