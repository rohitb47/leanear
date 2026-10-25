"use client";

import { Mark } from "@leanear/ui/mark";
import { set, spring } from "@leanear/ui/spring";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Snapshot, Status, Sync } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { loadActivity, patch } from "./api";
import { Board } from "./Board";
import { I } from "./icons";
import { NewTask } from "./NewTask";
import { Onboarding } from "./Onboarding";
import { Palette } from "./Palette";
import { Panel } from "./Panel";
import { Settings } from "./Settings";
import { activate, applySync, get, hardGo, makeStore, projectByKey, StoreContext, taskByRef, useData, type Data } from "./store";
import { Toasts } from "./Toast";
import { Av } from "./ui";
import { Brief, Mine } from "./Views";

/* ───────── Routes ───────── */

export type Route =
  | { view: "board"; key: string; task?: string }
  | { view: "brief"; key: string; task?: string }
  | { view: "mine"; task?: string }
  | { view: "settings"; task?: string }
  | { view: "welcome" };

const LAST = "lean-project";
let lastKey: string | null = null;

function remember(key: string) {
  lastKey = key;
  document.cookie = `${LAST}=${encodeURIComponent(key)}; path=/; max-age=31536000; samesite=lax`;
}

function remembered(d: Data, last = lastKey) {
  const ps = Object.values(d.projects);
  return (last && ps.find((p) => p.key === last)?.key) || ps[0]?.key || null;
}

export function parse(d: Data, path: string, search: string, last = lastKey): Route {
  const task = new URLSearchParams(search).get("t") ?? undefined;
  const parts = path.split("/").filter(Boolean);
  if (!Object.keys(d.projects).length) return { view: "welcome" };
  if (parts[0] === "welcome") return { view: "welcome" };
  if (parts[0] === "mine") return { view: "mine", task };
  if (parts[0] === "settings") return { view: "settings", task };
  const key = parts[0]?.toUpperCase();
  if (key && projectByKey(d, key)) return parts[1] === "brief" ? { view: "brief", key, task } : { view: "board", key, task };
  return { view: "board", key: remembered(d, last)!, task };
}

export function href(r: Route) {
  const base =
    r.view === "board" ? `/${r.key}` : r.view === "brief" ? `/${r.key}/brief` : r.view === "welcome" ? "/welcome" : `/${r.view}`;
  return "task" in r && r.task ? `${base}?t=${r.task}` : base;
}

type AppApi = {
  route: Route;
  go: (r: Route, replace?: boolean) => void;
  project: string | null;
  openTask: (ref: string) => void;
  closeTask: () => void;
  openNew: (status?: Status, from?: HTMLElement | null) => void;
  openPalette: () => void;
  setTheme: (v: "system" | "light" | "dark") => void;
  theme: "system" | "light" | "dark";
};

const Ctx = createContext<AppApi | null>(null);
export const useApp = () => useContext(Ctx)!;

/* ───────── Theme ───────── */

type Theme = "system" | "light" | "dark";
const themeSubs = new Set<() => void>();
function readTheme(): Theme {
  try {
    const v = localStorage.getItem("lean-theme");
    if (v === "light" || v === "dark") return v;
  } catch {}
  return "system";
}
const useTheme = () =>
  useSyncExternalStore(
    (f) => {
      themeSubs.add(f);
      return () => themeSubs.delete(f);
    },
    readTheme,
    () => "system" as Theme,
  );

/** The route as asked for, corrected for projects that don't exist (any more). */
function resolve(d: Data, r: Route): Route {
  const has = Object.keys(d.projects).length > 0;
  if (!has) return { view: "welcome" };
  if ("key" in r && !projectByKey(d, r.key)) return { ...r, key: remembered(d)! };
  return r;
}

/* ───────── App ───────── */

export function App({ initial, path, search, last }: { initial: Snapshot; path: string; search: string; last: string | null }) {
  const [store] = useState(() => makeStore(initial));
  if (typeof window !== "undefined") {
    activate(store);
    lastKey ??= last;
  }
  return (
    <StoreContext.Provider value={store}>
      <Shell path={path} search={search} last={last} />
    </StoreContext.Provider>
  );
}

function Shell({ path, search, last }: { path: string; search: string; last: string | null }) {
  const d = useData();
  const [asked, setRoute] = useState<Route>(() => parse(d, path, search, last));
  const route = resolve(d, asked);
  const [newTask, setNewTask] = useState<{ status: Status; origin: { x: number; y: number } | null } | null>(null);
  const [palette, setPalette] = useState(false);
  const theme = useTheme();

  const project = "key" in route ? route.key : remembered(d);

  const go = useCallback((r: Route, replace = false) => {
    if ("key" in r && r.key) remember(r.key);
    const url = href(r);
    if (url !== location.pathname + location.search) history[replace ? "replaceState" : "pushState"](null, "", url);
    setRoute(r);
  }, []);

  useEffect(() => {
    const on = () => setRoute(parse(get(), location.pathname, location.search));
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);

  // Keep the URL honest when the route resolves to something else (e.g. "/" → "/PRO").
  useEffect(() => {
    const url = href(route);
    if (url !== location.pathname + location.search) history.replaceState(null, "", url);
  }, [route]);


  const openTask = useCallback(
    (ref: string) => {
      if (route.view === "welcome") return;
      go({ ...route, task: ref } as Route);
    },
    [route, go],
  );
  const closeTask = useCallback(() => {
    if (!("task" in route) || !route.task) return;
    go({ ...route, task: undefined } as Route);
  }, [route, go]);

  const openNew = useCallback((status: Status = "todo", from?: HTMLElement | null) => {
    const src = from ?? document.querySelector<HTMLElement>(".newtask");
    const r = src?.getBoundingClientRect();
    setPalette(false);
    setNewTask({ status, origin: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null });
  }, []);

  const setTheme = useCallback((v: "system" | "light" | "dark") => {
    const doit = () => {
      if (v === "system") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = v;
      try {
        localStorage.setItem("lean-theme", v);
      } catch {}
      themeSubs.forEach((f) => f());
    };
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (f: () => void) => void };
    if (doc.startViewTransition && !reduced) doc.startViewTransition(doit);
    else doit();
  }, []);

  const openTaskRef = "task" in route ? route.task : undefined;
  const open = openTaskRef ? taskByRef(d, openTaskRef) : undefined;
  const openId = open?.id ?? null;

  /* Sync: every 3s while visible, and at once on focus. */
  const openIdRef = useRef(openId);
  useEffect(() => {
    openIdRef.current = openId;
  }, [openId]);
  useEffect(() => {
    let stop = false;
    let busy = false;
    let timer = 0;
    const tick = async () => {
      if (busy || stop) return;
      if (document.visibilityState !== "visible") return;
      busy = true;
      try {
        const q = new URLSearchParams({ since: get().cursor });
        if (openIdRef.current) q.set("task", openIdRef.current);
        const res = await fetch(`/api/sync?${q}`);
        if (res.status === 401) hardGo("/signin");
        if (res.ok) {
          const j = (await res.json()) as { data: Sync; workspace: string };
          if (j.workspace !== get().workspace.id) location.reload();
          else applySync(j.data);
        }
      } catch {
        // offline: try again next tick
      } finally {
        busy = false;
      }
    };
    timer = window.setInterval(tick, 3000);
    const now = () => void tick();
    window.addEventListener("focus", now);
    document.addEventListener("visibilitychange", now);
    return () => {
      stop = true;
      clearInterval(timer);
      window.removeEventListener("focus", now);
      document.removeEventListener("visibilitychange", now);
    };
  }, []);

  useEffect(() => {
    if (openId) void loadActivity(openId).catch(() => {});
  }, [openId]);

  /* Keyboard */
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t?.closest?.("input,textarea,select,[contenteditable='true']");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (route.view === "welcome") return;
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (e.key === "Escape") {
        if (document.documentElement.classList.contains("dragging")) return;
        if (palette) setPalette(false);
        else if (newTask) setNewTask(null);
        else if (document.querySelector(".menu")) return;
        else if (openId && !typing) closeTask();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey || newTask || palette || route.view === "welcome") return;
      const k = e.key.toLowerCase();
      if (k === "c") {
        e.preventDefault();
        openNew();
      } else if (k === "b" && project) go({ view: "board", key: project, task: openTaskRef });
      else if (k === "m") go({ view: "mine", task: openTaskRef });
      else if (k === "r" && project) go({ view: "brief", key: project, task: openTaskRef });
      else if (k === "s") go({ view: "settings", task: openTaskRef });
      else if (open && ["1", "2", "3", "4"].includes(e.key)) {
        const s = STATUSES[+e.key - 1];
        if (s !== open.status) void patch(open.id, { status: s }, "moveTask", { status: s });
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [route, palette, newTask, open, openId, openTaskRef, project, go, openNew, closeTask]);

  const api = useMemo<AppApi>(
    () => ({ route, go, project, openTask, closeTask, openNew, openPalette: () => setPalette(true), setTheme, theme }),
    [route, go, project, openTask, closeTask, openNew, setTheme, theme],
  );

  /* View changes fade up; onboarding has its own slide. */
  const viewKey = route.view === "board" || route.view === "brief" ? `${route.view}:${route.key}` : route.view;
  const viewRef = useRef<HTMLDivElement>(null);
  const lastView = useRef(viewKey);
  useLayoutEffect(() => {
    if (lastView.current === viewKey) return;
    lastView.current = viewKey;
    const el = viewRef.current;
    if (!el) return;
    set(el, { y: 6, o: 0 });
    spring(el, {}, { r: 0.3 });
  }, [viewKey]);

  if (route.view === "welcome") {
    return (
      <Ctx.Provider value={api}>
        <div className="app">
          <div className="view">
            <Onboarding />
          </div>
        </div>
        <Toasts />
      </Ctx.Provider>
    );
  }

  return (
    <Ctx.Provider value={api}>
      <div className="app">
        <Top />
        <div className="view">
          <div className="content" ref={viewRef}>
            {route.view === "board" && <Board projectKey={route.key} openId={openId} />}
            {route.view === "brief" && <Brief projectKey={route.key} />}
            {route.view === "mine" && <Mine openId={openId} />}
            {route.view === "settings" && <Settings />}
          </div>
          <Panel taskId={openId} />
        </div>
      </div>
      <NewTask state={newTask} onClose={() => setNewTask(null)} />
      <Palette open={palette} onClose={() => setPalette(false)} />
      <Toasts />
    </Ctx.Provider>
  );
}

function Top() {
  const d = useData();
  const { route, go, project, openNew, openPalette } = useApp();
  const me = d.members[d.me.memberId];
  const task = "task" in route ? route.task : undefined;
  const tab = (view: "board" | "mine" | "brief" | "settings", label: string) => {
    const r: Route =
      view === "board" || view === "brief" ? { view, key: project!, task } : ({ view, task } as Route);
    return (
      <a
        className="tab"
        href={href(r)}
        aria-current={route.view === view ? "page" : undefined}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey) return;
          e.preventDefault();
          go(r);
        }}
      >
        {label}
      </a>
    );
  };
  return (
    <header className="top">
      <a
        className="wm"
        href={project ? `/${project}` : "/welcome"}
        onClick={(e) => {
          e.preventDefault();
          if (project) go({ view: "board", key: project });
        }}
      >
        <Mark />
        <span>leanear</span>
        {d.workspaces.length > 1 && <span className="ws hide-s">{d.workspace.name}</span>}
      </a>
      <nav className="tabs" aria-label="Sections">
        {tab("board", "Board")}
        {tab("mine", "My Tasks")}
        {tab("brief", "Brief")}
        {tab("settings", "Settings")}
      </nav>
      <div className="right">
        <button className="btn bare" onClick={openPalette} aria-label="Search">
          {I.search}
          <span className="kbd hide-s">⌘K</span>
        </button>
        <button className="btn accent newtask" onClick={(e) => openNew("todo", e.currentTarget)} aria-label="New task">
          {I.plus}
          <span className="hide-s">New task</span>
          <span className="kbd hide-s">C</span>
        </button>
        <span className="hide-s">
          <Av m={me} />
        </span>
      </div>
    </header>
  );
}
