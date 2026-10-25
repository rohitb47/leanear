"use client"

import { useEffect, useRef, useState } from "react"
import { useApp } from "@/components/chrome/app"
import { I } from "@/components/common/icons"
import { usePresence } from "@/lib/ui/motion"
import { refOf, useData } from "@/lib/store/store"
import { StatusDot } from "@/components/common/badges"
import type { Status } from "@/lib/sync/types"

type Item = {
  label: string
  hint?: string
  ref?: string
  status?: Status
  run: () => void
}

/** ⌘K: every action, every task. */
export function Palette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { mounted, ref, closing } = usePresence<HTMLDivElement>(
    open,
    { s: 0.96, o: 0, y: -6, b: 4 },
    { s: 0.97, o: 0, y: -6, b: 3 },
    0.28,
    0.22
  )
  if (!mounted) return null
  return (
    <div
      className={`overlay${closing ? " closing" : ""}`}
      onPointerDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="dialog palette"
        ref={ref}
        role="dialog"
        aria-label="Command menu"
        style={{ transformOrigin: "50% 0" }}
      >
        <Body onClose={onClose} />
      </div>
    </div>
  )
}

function Body({ onClose }: { onClose: () => void }) {
  const d = useData()
  const app = useApp()
  const [q, setQ] = useState("")
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  const ql = q.toLowerCase().trim()
  const projects = Object.values(d.projects)
  const run = (f: () => void) => () => {
    onClose()
    f()
  }
  const acts: Item[] = [
    { label: "New task", hint: "C", run: run(() => app.openNew()) },
    ...(app.project
      ? [
          {
            label: "Go to Board",
            hint: "B",
            run: run(() => app.go({ view: "board", key: app.project! })),
          },
        ]
      : []),
    {
      label: "Go to My Tasks",
      hint: "M",
      run: run(() => app.go({ view: "mine" })),
    },
    ...(app.project
      ? [
          {
            label: "Go to Brief",
            hint: "R",
            run: run(() => app.go({ view: "brief", key: app.project! })),
          },
        ]
      : []),
    {
      label: "Go to Settings",
      hint: "S",
      run: run(() => app.go({ view: "settings" })),
    },
    ...projects.map((p) => ({
      label: `Switch to ${p.name}`,
      hint: p.key,
      run: run(() => app.go({ view: "board", key: p.key })),
    })),
    { label: "Switch to dark", run: run(() => app.setTheme("dark")) },
    { label: "Switch to light", run: run(() => app.setTheme("light")) },
    { label: "Match the system theme", run: run(() => app.setTheme("system")) },
  ].filter((x) => !ql || x.label.toLowerCase().includes(ql))

  const tasks: Item[] = Object.values(d.tasks)
    .map((t) => ({ t, ref: refOf(d, t) }))
    .filter(
      ({ t, ref }) =>
        !ql ||
        ref.toLowerCase().includes(ql) ||
        t.title.toLowerCase().includes(ql) ||
        t.notes.toLowerCase().includes(ql)
    )
    .sort((a, b) => b.t.updatedAt.localeCompare(a.t.updatedAt))
    .slice(0, 8)
    .map(({ t, ref }) => ({
      label: t.title,
      ref,
      status: t.status,
      run: run(() => app.openTask(ref)),
    }))

  const all = [...acts, ...tasks]
  const cur = Math.min(sel, Math.max(0, all.length - 1))

  useEffect(() => {
    list.current?.querySelector(".active")?.scrollIntoView({ block: "nearest" })
  }, [cur])

  let i = 0
  const btn = (x: Item) => {
    const n = i++
    return (
      <button
        key={`${n}-${x.label}`}
        className={n === cur ? "active" : ""}
        onMouseMove={() => setSel(n)}
        onClick={x.run}
      >
        {x.ref && (
          <>
            <StatusDot s={x.status!} />
            <span className="cid" style={{ width: 60, flex: "none" }}>
              {x.ref}
            </span>
          </>
        )}
        <span>{x.label}</span>
        {x.hint && <span className="hint kbd">{x.hint}</span>}
      </button>
    )
  }

  return (
    <>
      <div className="pin">
        {I.search}
        <input
          autoFocus
          value={q}
          placeholder="Search tasks or type a command"
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value)
            setSel(0)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              const n = Math.max(1, all.length)
              setSel((cur + (e.key === "ArrowDown" ? 1 : -1) + n) % n)
            } else if (e.key === "Enter") {
              e.preventDefault()
              all[cur]?.run()
            }
          }}
        />
      </div>
      <div className="res" ref={list}>
        {acts.length > 0 && <div className="sec">Actions</div>}
        {acts.map(btn)}
        {tasks.length > 0 && <div className="sec">Tasks</div>}
        {tasks.map(btn)}
        {!all.length && <div className="sec">Nothing matches</div>}
      </div>
    </>
  )
}
