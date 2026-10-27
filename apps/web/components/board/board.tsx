"use client"

import { project as throwTo, set, spring } from "@shipthat/ui/spring"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ALL_STATUSES,
  STATUS_NAME,
  TYPE_NAME,
  type Activity,
  type Project,
  type Status,
  type Task,
} from "@/lib/sync/types"
import { patch } from "@/lib/store/patch"
import {
  onFeed,
  projectByKey,
  refOf,
  useData,
  type Data,
} from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Av, StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"

const sortCol = (a: Task, b: Task) =>
  a.position - b.position || b.number - a.number

/** Position for a task dropped at index in a column that doesn't hold it. */
function between(list: Task[], index: number) {
  const before = list[index - 1]?.position
  const after = list[index]?.position
  if (before === undefined && after === undefined) return 0
  if (before === undefined) return after! - 1
  if (after === undefined) return before + 1
  return (before + after) / 2
}

/** An agent in Doing is at work on it. */
export const isLive = (d: Data, t: Task) =>
  t.status === "doing" &&
  !!t.assigneeId &&
  d.members[t.assigneeId]?.kind === "agent"

type Slot = { status: Status; index: number }
type Drag = {
  id: string
  ghost: HTMLElement
  x0: number
  y0: number
  dx: number
  dy: number
  x: number
  y: number
  from: Slot
  hist: { t: number; x: number; y: number }[]
  landing: boolean
  raf: number
}

function velocity(h: { t: number; x: number; y: number }[]) {
  if (h.length < 2) return { x: 0, y: 0 }
  const a = h[0]
  const b = h[h.length - 1]
  const dt = (b.t - a.t) / 1000
  if (dt <= 0 || performance.now() - b.t > 80) return { x: 0, y: 0 }
  return { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt }
}

/** A project that was just deleted or re-keyed draws nothing while it leaves. */
export function Board({
  projectKey,
  openId,
}: {
  projectKey: string
  openId: string | null
}) {
  const p = projectByKey(useData(), projectKey)
  return p ? <Columns p={p} openId={openId} /> : null
}

function Columns({ p, openId }: { p: Project; openId: string | null }) {
  const d = useData()
  const { openTask, openNew, openSetup } = useApp()
  const mine = Object.values(d.tasks).filter((t) => t.projectId === p.id)
  const all = mine.filter((t) => t.status !== "canceled")
  const cols = Object.fromEntries(
    ALL_STATUSES.map((s) => [
      s,
      mine.filter((t) => t.status === s).sort(sortCol),
    ])
  ) as Record<Status, Task[]>

  const [slot, setSlot] = useState<(Slot & { id: string }) | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const slotRef = useRef(slot)
  const colsRef = useRef(cols)
  useLayoutEffect(() => {
    slotRef.current = slot
    colsRef.current = cols
  })

  // Cards fade in only when added later; on load the board is simply there.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(t)
  }, [])

  /** The column as drawn: the dragged card sits in its slot. */
  const listFor = (s: Status) => {
    if (!slot) return cols[s]
    const t = d.tasks[slot.id]
    const list = cols[s].filter((x) => x.id !== slot.id)
    if (t && slot.status === s) list.splice(slot.index, 0, t)
    return list
  }

  /** Where would a point drop? Column by x, place by row centres. */
  const slotAt = (px: number, py: number, id: string): Slot | null => {
    const board = boardRef.current
    if (!board) return null
    const els = [...board.querySelectorAll<HTMLElement>("[data-col]")]
    let col = els[0]
    for (const c of els) if (px >= c.getBoundingClientRect().left) col = c
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

  const moveSlot = (id: string, s: Slot) => {
    const cur = slotRef.current
    if (cur && cur.status === s.status && cur.index === s.index) return
    const next = { id, ...s }
    slotRef.current = next
    setSlot(next)
  }

  // A drop: once the slot is drawn, send the ghost to it, then save.
  useLayoutEffect(() => {
    const g = drag.current
    if (!g?.landing || !slot) return
    const el = boardRef.current?.querySelector<HTMLElement>(
      `[data-id="${g.id}"]`
    )
    const finish = () => {
      g.ghost.remove()
      drag.current = null
      const fin = slotRef.current
      if (fin && (fin.status !== g.from.status || fin.index !== g.from.index)) {
        const list = colsRef.current[fin.status].filter((x) => x.id !== g.id)
        const position = between(list, fin.index)
        void patch(g.id, { status: fin.status, position }, () =>
          api.tasks.move.mutate({ id: g.id, status: fin.status, position })
        )
      }
      slotRef.current = null
      setSlot(null)
    }
    if (!el) return finish()
    // Where the slot settles, without the glide Motion may be mid-way through.
    const r = el.getBoundingClientRect()
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    const v = velocity(g.hist)
    spring(
      g.ghost,
      { x: r.left - m.m41 - g.x0, y: r.top - m.m42 - g.y0, s: 1 },
      { z: 0.85, r: 0.3, v: { x: v.x, y: v.y }, keep: true, onRest: finish }
    )
  }, [slot])

  // Escape puts a card back where it came from.
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const g = drag.current
      if (e.key !== "Escape" || !g || g.landing) return
      e.preventDefault()
      e.stopPropagation()
      window.dispatchEvent(new Event("lean-cancel-drag"))
    }
    window.addEventListener("keydown", key, true)
    return () => window.removeEventListener("keydown", key, true)
  }, [])

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
      ghost.classList.remove("on")
      ghost.removeAttribute("data-id")
      Object.assign(ghost.style, {
        left: `${r.left}px`,
        top: `${r.top}px`,
        width: `${r.width}px`,
        height: `${r.height}px`,
        transform: "",
      })
      document.body.appendChild(ghost)
      const t = d.tasks[id]
      const from = {
        status: t.status,
        index: colsRef.current[t.status].findIndex((x) => x.id === id),
      }
      drag.current = {
        id,
        ghost,
        x0: r.left,
        y0: r.top,
        dx: x - r.left,
        dy: y - r.top,
        x,
        y,
        from,
        hist: [{ t: performance.now(), x, y }],
        landing: false,
        raf: requestAnimationFrame(edge),
      }
      spring(ghost, { s: 1.035 }, { z: 0.7, r: 0.2, keep: true })
      moveSlot(id, from)
      document.documentElement.classList.add("dragging")
      try {
        if (touch) navigator.vibrate?.(6)
      } catch {}
    }

    // Near a column's top or bottom, or the board's sides, it scrolls.
    const edge = () => {
      const g = drag.current
      if (!g || g.landing) return
      const board = boardRef.current
      let moved = false
      if (board) {
        const b = board.getBoundingClientRect()
        const v = g.x < b.left + 48 ? -1 : g.x > b.right - 48 ? 1 : 0
        if (v && board.scrollWidth > board.clientWidth) {
          board.scrollLeft += v * 12
          moved = true
        }
        for (const rows of board.querySelectorAll<HTMLElement>(".rows")) {
          const r = rows.getBoundingClientRect()
          if (g.x < r.left || g.x > r.right) continue
          const dy =
            g.y < r.top + 40
              ? -(r.top + 40 - g.y) / 40
              : g.y > r.bottom - 56
                ? (g.y - (r.bottom - 56)) / 56
                : 0
          if (dy) {
            rows.scrollTop += Math.max(-1, Math.min(1, dy)) * 10
            moved = true
          }
        }
      }
      if (moved) {
        const s = slotAt(g.x, g.y, g.id)
        if (s) moveSlot(g.id, s)
      }
      g.raf = requestAnimationFrame(edge)
    }

    const move = (ev: PointerEvent) => {
      if (!started) {
        const far = Math.hypot(ev.clientX - sx, ev.clientY - sy)
        if (touch) {
          if (far > 8) cleanup()
          return
        }
        if (far < 5) return
        start(ev.clientX, ev.clientY)
      }
      const g = drag.current
      if (!g || g.landing) return
      const now = performance.now()
      g.x = ev.clientX
      g.y = ev.clientY
      g.hist.push({ t: now, x: ev.clientX, y: ev.clientY })
      while (g.hist.length > 2 && now - g.hist[0].t > 100) g.hist.shift()
      set(g.ghost, {
        x: ev.clientX - g.dx - g.x0,
        y: ev.clientY - g.dy - g.y0,
        s: 1.035,
      })
      const s = slotAt(ev.clientX, ev.clientY, id)
      if (s) moveSlot(id, s)
    }

    const land = (s: Slot | null) => {
      const g = drag.current!
      cancelAnimationFrame(g.raf)
      g.landing = true
      document.documentElement.classList.remove("dragging")
      // Force the layout effect even when the slot is unchanged.
      const next = { id, ...(s ?? g.from) }
      slotRef.current = next
      setSlot(next)
    }

    const up = (ev: PointerEvent) => {
      const g = drag.current
      cleanup()
      if (!started) {
        if (ev.type === "pointerup") {
          const t = d.tasks[id]
          if (t) openTask(refOf(d, t))
        }
        return
      }
      if (!g) return
      if (ev.type === "pointercancel") return land(g.from)
      // Project the throw: a flick carries on to where it was heading.
      const v = velocity(g.hist)
      const br = boardRef.current!.getBoundingClientRect()
      const px = Math.min(
        Math.max(ev.clientX + throwTo(v.x), br.left + 1),
        br.right - 1
      )
      land(slotAt(px, ev.clientY + throwTo(v.y) * 0.5, id))
    }

    const cancel = () => {
      const g = drag.current
      cleanup()
      if (g && started) land(g.from)
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
      window.removeEventListener("lean-cancel-drag", cancel)
      document.removeEventListener("touchmove", block)
    }

    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    window.addEventListener("lean-cancel-drag", cancel)
    if (touch) {
      document.addEventListener("touchmove", block, { passive: false })
      row.classList.add("press")
      timer = setTimeout(() => start(sx, sy), 280)
    }
  }

  return (
    <>
      <div className="board" ref={boardRef}>
        {ALL_STATUSES.map((s) => {
          const rows = listFor(s)
          return (
            <div className="col" key={s} data-col={s}>
              <div className="colhead">
                <StatusIcon s={s} />
                {STATUS_NAME[s]}
                <span className="n">{rows.length}</span>
                {s !== "canceled" && (
                  <button
                    className="icon"
                    onClick={() => openNew(s)}
                    aria-label={`New task in ${STATUS_NAME[s]}`}
                  >
                    {I.plus}
                  </button>
                )}
              </div>
              <motion.div className="rows" layoutScroll>
                {rows.map((t) => {
                  const who = t.assigneeId ? d.members[t.assigneeId] : null
                  return (
                    <motion.div
                      key={t.id}
                      layout="position"
                      layoutId={t.id}
                      initial={mounted ? { opacity: 0, scale: 0.96 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      data-id={t.id}
                      role="button"
                      tabIndex={0}
                      className={`row${t.status === "done" || t.status === "canceled" ? " done" : ""}${slot?.id === t.id ? " slot" : ""}${t.id === openId ? " on" : ""}`}
                      onPointerDown={(e) => onPointerDown(e, t.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          openTask(refOf(d, t))
                        }
                      }}
                    >
                      <div className="r1">
                        <span className="cid">{refOf(d, t)}</span>
                        <span className="type">{TYPE_NAME[t.type]}</span>
                        <Av m={who} live={isLive(d, t)} />
                      </div>
                      <div className="t">{t.title}</div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </div>
          )
        })}
      </div>
      {!all.length && (
        <div className="empty">
          <div>
            <h2>Nothing on {p.name} yet</h2>
            <p>
              Add the first task, or let your agent read the repo and fill the
              board for you.
            </p>
            <div className="ctas">
              <button className="btn accent" onClick={() => openNew("todo")}>
                New task
              </button>
              <button className="btn" onClick={openSetup}>
                Bring a codebase
              </button>
            </div>
          </div>
        </div>
      )}
      <Feed projectId={p.id} />
    </>
  )
}

/** What someone else just did on this board, for a few seconds. */
function Feed({ projectId }: { projectId: string }) {
  const d = useData()
  const { openTask } = useApp()
  const [item, setItem] = useState<Activity | null>(null)
  const ref = useRef(d)
  useLayoutEffect(() => {
    ref.current = d
  })
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const off = onFeed((list) => {
      const mine = list.filter(
        (a) => ref.current.tasks[a.taskId]?.projectId === projectId
      )
      const last = mine[mine.length - 1]
      if (!last) return
      setItem(last)
      clearTimeout(t)
      t = setTimeout(() => setItem(null), 4500)
    })
    return () => {
      off()
      clearTimeout(t)
    }
  }, [projectId])

  const task = item ? d.tasks[item.taskId] : undefined
  const who = item ? d.members[item.actorId] : undefined
  const line =
    item && task && who ? `${who.name} ${said(item, refOf(d, task), d)}` : null
  return (
    <AnimatePresence>
      {line && task && (
        <motion.button
          className="feed"
          layout
          style={{ borderRadius: 999 }}
          initial={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(4px)" }}
          aria-live="polite"
          onClick={() => openTask(refOf(d, task))}
        >
          <motion.span layout="position" style={{ display: "flex" }}>
            <Av m={who} />
          </motion.span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={line}
              layout="position"
              initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.06, filter: "blur(3px)" }}
            >
              {line}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  )
}

function said(a: Activity, ref: string, d: Data) {
  const data = (a.data ?? {}) as Record<string, string | null>
  switch (a.kind) {
    case "created":
      return `added ${ref}`
    case "moved":
      return a.data?.to === "doing"
        ? `picked up ${ref}`
        : `moved ${ref} to ${STATUS_NAME[data.to as Status] ?? data.to}`
    case "assigned":
      return data.to === a.actorId
        ? `took ${ref}`
        : data.to
          ? `gave ${ref} to ${d.members[data.to]?.name ?? "someone"}`
          : `unassigned ${ref}`
    case "commented":
      return `commented on ${ref}`
    case "notes":
      return `edited the notes on ${ref}`
    case "renamed":
      return `renamed ${ref}`
    case "retyped":
      return `made ${ref} a ${TYPE_NAME[data.to as Task["type"]] ?? data.to}`
  }
}
