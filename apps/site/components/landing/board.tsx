"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { Mark } from "@shipthat/ui/mark"
import { AnimatePresence, MotionConfig, motion } from "motion/react"
import { Logo } from "@shipthat/ui/logos"
import { Settings, useSettings } from "@/components/landing/settings"
import { Morph } from "@shipthat/ui/morph"
import { project, set, spring } from "@shipthat/ui/spring"

type Status = "backlog" | "todo" | "doing" | "done"
type Task = {
  id: string
  title: string
  type: "Bug" | "Feature" | "Idea"
  status: Status
  who: "rohit" | "claude"
}

const COLS: { key: Status; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "doing", label: "Doing" },
  { key: "done", label: "Done" },
]

// shipth.at is built in shipth.at, so the board shows its own tasks.
const START: Task[] = [
  {
    id: "SHI-21",
    title: "Paste screenshots into notes",
    type: "Feature",
    status: "backlog",
    who: "rohit",
  },
  {
    id: "SHI-24",
    title: "Docker compose for self-hosting",
    type: "Feature",
    status: "backlog",
    who: "claude",
  },
  {
    id: "SHI-26",
    title: "Public changelog from Done tasks",
    type: "Idea",
    status: "backlog",
    who: "rohit",
  },
  {
    id: "SHI-27",
    title: "Mention a teammate in a comment",
    type: "Idea",
    status: "backlog",
    who: "rohit",
  },
  {
    id: "SHI-28",
    title: "Export a project as Markdown",
    type: "Feature",
    status: "backlog",
    who: "claude",
  },
  {
    id: "SHI-20",
    title: "Comment threads collapse after three",
    type: "Feature",
    status: "todo",
    who: "claude",
  },
  {
    id: "SHI-12",
    title: "Agent keys, hashed and revocable",
    type: "Feature",
    status: "todo",
    who: "claude",
  },
  {
    id: "SHI-17",
    title: "J and K skip the Done column",
    type: "Bug",
    status: "todo",
    who: "claude",
  },
  {
    id: "SHI-19",
    title: "⌘K finds tasks by id",
    type: "Feature",
    status: "todo",
    who: "rohit",
  },
  {
    id: "SHI-9",
    title: "MCP server: next_task",
    type: "Feature",
    status: "doing",
    who: "claude",
  },
  {
    id: "SHI-14",
    title: "Drag to reorder, with momentum",
    type: "Feature",
    status: "doing",
    who: "rohit",
  },
  {
    id: "SHI-3",
    title: "Dark mode, the Apple way",
    type: "Feature",
    status: "done",
    who: "rohit",
  },
  {
    id: "SHI-5",
    title: "Board loads in one request",
    type: "Feature",
    status: "done",
    who: "claude",
  },
]

// The status mark in each column head: dashed, empty, half and done.
function StatusIcon({ s }: { s: Status }) {
  return (
    <svg
      className={`st ${s}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden
    >
      {s === "backlog" && (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2.2 2.1"
        />
      )}
      {s === "todo" && (
        <circle
          cx="7"
          cy="7"
          r="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      )}
      {s === "doing" && (
        <>
          <circle
            cx="7"
            cy="7"
            r="5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
        </>
      )}
      {s === "done" && (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path
            d="M4.4 7.2 6.2 9l3.4-3.8"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  )
}

function Avatar({ who, live }: { who: Task["who"]; live?: boolean }) {
  if (who === "rohit")
    return (
      <span className="av" title="Rohit">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/rohit.png" alt="" width={20} height={20} draggable={false} />
      </span>
    )
  return (
    <span className={`av agent ${live ? "live" : ""}`} title="Claude">
      <Logo k="claude" size={11} brand />
    </span>
  )
}

type Drag = {
  id: string
  ghost: HTMLElement
  x0: number
  y0: number
  dx: number
  dy: number
  hist: { t: number; x: number; y: number }[]
  landing: boolean
}

const LABEL = { board: "Board", settings: "Settings" }

export function Board() {
  const [tasks, setTasks] = useState(START)
  const [dragId, setDragId] = useState<string | null>(null)
  const [liveId, setLiveId] = useState<string | null>(null)
  const [feed, setFeed] = useState<string | null>(null)
  const [view, setView] = useState<"board" | "settings">("board")
  const settings = useSettings()
  // Cards fade in only when added later; on load the board rises as one.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const boardRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const tasksRef = useRef(tasks)

  // Motion animates every layout change (layoutId on each card), so an update
  // is just a state change.
  const update = useCallback((fn: (t: Task[]) => Task[]) => setTasks(fn), [])

  useLayoutEffect(() => {
    tasksRef.current = tasks
    // A drop: send the ghost to the slot it now belongs to.
    const g = drag.current
    if (g?.landing) {
      const slot = boardRef.current?.querySelector<HTMLElement>(
        `[data-id="${g.id}"]`
      )
      if (!slot) return
      // Where the slot settles, without the glide Motion may be mid-way through.
      const r = slot.getBoundingClientRect()
      const m = new DOMMatrixReadOnly(getComputedStyle(slot).transform)
      const at = { left: r.left - m.m41, top: r.top - m.m42 }
      const v = velocity(g.hist)
      spring(
        g.ghost,
        { x: at.left - g.x0, y: at.top - g.y0, s: 1 },
        {
          z: 0.8,
          r: 0.4,
          v: { x: v.x, y: v.y },
          keep: true,
          onRest: () => {
            g.ghost.remove()
            drag.current = null
            setDragId(null)
          },
        }
      )
    }
  }, [tasks])

  // Where would a point drop? Column by x, place by row centres.
  const slotAt = (
    px: number,
    py: number,
    id: string
  ): { status: Status; index: number } | null => {
    const board = boardRef.current
    if (!board) return null
    const cols = [...board.querySelectorAll<HTMLElement>("[data-col]")]
    let col = cols[0]
    for (const c of cols) {
      const r = c.getBoundingClientRect()
      if (px >= r.left) col = c
    }
    const status = col.dataset.col as Status
    const rows = [...col.querySelectorAll<HTMLElement>("[data-id]")].filter(
      (r) => r.dataset.id !== id
    )
    let index = rows.length
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].getBoundingClientRect()
      if (py < r.top + r.height / 2) {
        index = i
        break
      }
    }
    return { status, index }
  }

  const moveTo = (id: string, status: Status, index: number) => {
    const list = tasksRef.current
    const t = list.find((x) => x.id === id)
    if (!t) return
    const rest = list.filter((x) => x.id !== id)
    const inCol = rest.filter((x) => x.status === status)
    const cur = list.filter((x) => x.status === status).indexOf(t)
    if (t.status === status && cur === index) return
    const anchor = inCol[index]
    const moved = { ...t, status }
    const at = anchor ? rest.indexOf(anchor) : rest.length
    const next = [...rest.slice(0, at), moved, ...rest.slice(at)]
    update(() => next)
  }

  // Pointer handling: mouse lifts after a small move, touch after a long press.
  const onPointerDown = (e: React.PointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0 || drag.current) return
    const row = e.currentTarget
    const sx = e.clientX
    const sy = e.clientY
    const touch = e.pointerType !== "mouse"
    let started = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const start = (x: number, y: number) => {
      started = true
      row.classList.remove("press")
      const r = row.getBoundingClientRect()
      const ghost = row.cloneNode(true) as HTMLElement
      ghost.classList.add("lifted")
      ghost.removeAttribute("data-id")
      Object.assign(ghost.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
      })
      document.body.appendChild(ghost)
      drag.current = {
        id,
        ghost,
        x0: r.left,
        y0: r.top,
        dx: x - r.left,
        dy: y - r.top,
        hist: [{ t: performance.now(), x, y }],
        landing: false,
      }
      spring(ghost, { s: 1.035 }, { z: 0.7, r: 0.3, keep: true })
      setDragId(id)
      document.documentElement.style.cursor = "grabbing"
    }

    const move = (ev: PointerEvent) => {
      if (!started) {
        const far = Math.hypot(ev.clientX - sx, ev.clientY - sy)
        if (touch) {
          if (far > 8) cleanup()
          return
        }
        if (far < 4) return
        start(ev.clientX, ev.clientY)
      }
      const g = drag.current
      if (!g || g.landing) return
      const now = performance.now()
      g.hist.push({ t: now, x: ev.clientX, y: ev.clientY })
      while (g.hist.length > 2 && now - g.hist[0].t > 100) g.hist.shift()
      const s = { s: 1.035 }
      set(g.ghost, {
        x: ev.clientX - g.dx - g.x0,
        y: ev.clientY - g.dy - g.y0,
        ...s,
      })
      const slot = slotAt(ev.clientX, ev.clientY, id)
      if (slot) moveTo(id, slot.status, slot.index)
    }

    const up = (ev: PointerEvent) => {
      const g = drag.current
      cleanup()
      if (!started || !g) return
      // Project the throw: a flick carries on to where it was heading.
      const v = velocity(g.hist)
      const px = ev.clientX + project(v.x)
      const py = ev.clientY + project(v.y)
      const br = boardRef.current!.getBoundingClientRect()
      const slot = slotAt(
        Math.min(Math.max(px, br.left + 1), br.right - 1),
        py,
        id
      )
      g.landing = true
      document.documentElement.style.cursor = ""
      if (slot) moveTo(id, slot.status, slot.index)
      // Force the layout effect even when the order is unchanged.
      setTasks((t) => [...t])
    }

    const block = (ev: TouchEvent) => {
      if (started) ev.preventDefault()
    }

    const cleanup = () => {
      clearTimeout(timer)
      row.classList.remove("press")
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      document.removeEventListener("touchmove", block)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    if (touch) {
      document.addEventListener("touchmove", block, { passive: false })
      row.classList.add("press")
      timer = setTimeout(() => start(sx, sy), 280)
    }
  }

  // The agent run: Claude takes its top Todo task, works on it, ships it.
  useEffect(() => {
    let visible = false
    let t: ReturnType<typeof setTimeout>
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), {
      threshold: 0.3,
    })
    if (frameRef.current) io.observe(frameRef.current)

    const run = (step: number) => {
      const wait = (ms: number, next: number) =>
        (t = setTimeout(() => run(next), ms))
      if (!visible || drag.current || viewRef.current !== "board")
        return wait(1200, step)
      const list = tasksRef.current
      if (step === 0) {
        const pick = list.find((x) => x.status === "todo" && x.who === "claude")
        if (!pick) {
          setFeed(null)
          update(() => START)
          return wait(3600, 0)
        }
        moveTop(pick.id, "doing")
        setLiveId(pick.id)
        setFeed(`Claude picked up ${pick.id}`)
        return wait(3400, 1)
      }
      const id = list.find(
        (x) => x.status === "doing" && x.who === "claude" && x.id !== "SHI-9"
      )?.id
      if (id) {
        moveTop(id, "done")
        setFeed(`Claude moved ${id} to Done`)
      }
      setLiveId(null)
      return wait(4200, 0)
    }

    const moveTop = (id: string, status: Status) =>
      update((list) => {
        const t = list.find((x) => x.id === id)!
        const rest = list.filter((x) => x.id !== id)
        const at = rest.findIndex((x) => x.status === status)
        const moved = { ...t, status }
        return at < 0
          ? [...rest, moved]
          : [...rest.slice(0, at), moved, ...rest.slice(at)]
      })

    t = setTimeout(() => run(0), 2200)
    return () => {
      clearTimeout(t)
      io.disconnect()
    }
  }, [update])

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", bounce: 0.12, duration: 0.5 }}
    >
      <div className="frame" ref={frameRef} data-view={view}>
        <div className="bar">
          <div className="proj">
            <Mark size={18} />
            <span className="pname">{settings.name || "Untitled"}</span>
            <span className="mono">SHI</span>
          </div>
          <div className="tabs" role="tablist">
            {(["board", "settings"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                className={view === v ? "on" : ""}
                onClick={() => setView(v)}
              >
                {view === v && (
                  <motion.span layoutId="tab-pill" className="pill-bg" />
                )}
                <span className="lbl">{LABEL[v]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="board" ref={boardRef} hidden={view !== "board"}>
          {COLS.map((c) => {
            const rows = tasks.filter((t) => t.status === c.key)
            return (
              <div className="col" key={c.key} data-col={c.key}>
                <div className="colhead">
                  <StatusIcon s={c.key} />
                  {c.label}
                  <span className="n">
                    <Morph value={String(rows.length)} />
                  </span>
                </div>
                <div className="rows">
                  {rows.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      layoutId={t.id}
                      initial={mounted ? { opacity: 0, scale: 0.96 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      data-id={t.id}
                      className={`row ${t.status === "done" ? "done" : ""} ${dragId === t.id ? "slot" : ""}`}
                      onPointerDown={(e) => onPointerDown(e, t.id)}
                    >
                      <div className="r1">
                        <span className="cid">{t.id}</span>
                        <span className="type">{t.type}</span>
                        <Avatar
                          who={t.who}
                          live={
                            liveId === t.id ||
                            (t.id === "SHI-9" && t.status === "doing")
                          }
                        />
                      </div>
                      <div className="t">{t.title}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        {view === "settings" && <Settings state={settings} />}
        <AnimatePresence>
          {feed && view === "board" && (
            <motion.div
              className="feed"
              layout
              style={{ borderRadius: 999 }}
              initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
              aria-live="polite"
            >
              <motion.span layout="position" className="feed-av">
                <Avatar who="claude" />
              </motion.span>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={feed}
                  layout="position"
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.06, filter: "blur(3px)" }}
                >
                  {feed}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}

function velocity(h: { t: number; x: number; y: number }[]) {
  if (h.length < 2) return { x: 0, y: 0 }
  const a = h[0]
  const b = h[h.length - 1]
  const dt = (b.t - a.t) / 1000
  if (dt <= 0 || performance.now() - b.t > 80) return { x: 0, y: 0 }
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
}
