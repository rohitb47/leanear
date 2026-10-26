"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { Status } from "@/lib/sync/types"
import { refOf, useData } from "@/lib/store/store"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"

type Item = {
  label: string
  hint?: string
  lead?: ReactNode
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Command menu"
      className="palette"
      instant
    >
      <Body onClose={onClose} />
    </Dialog>
  )
}

function Body({ onClose }: { onClose: () => void }) {
  const d = useData()
  const app = useApp()
  const [q, setQ] = useState("")
  const [sel, setSel] = useState(0)
  const list = useRef<HTMLDivElement>(null)
  const ql = q.toLowerCase().trim()
  const key = app.project
  const run = (f: () => void) => () => {
    onClose()
    f()
  }
  const has = (s: string) => !ql || s.toLowerCase().includes(ql)

  // The project in view, if any: its tabs come first, then the workspace's.
  const here = "key" in app.route ? app.route.key : undefined
  const pname = here
    ? Object.values(d.projects).find((p) => p.key === here)?.name
    : null
  const acts: Item[] = [
    { label: "New task", hint: "C", run: run(() => app.openNew()) },
    {
      label: "Go to Home",
      hint: "G H",
      run: run(() => app.go({ view: "home" })),
    },
    ...(key
      ? [
          {
            label: `Go to the ${Object.values(d.projects).find((p) => p.key === key)?.name} board`,
            hint: "G B",
            run: run(() => app.go({ view: "board", key })),
          },
        ]
      : []),
    ...(here
      ? [
          {
            label: `${pname} activity`,
            run: run(() => app.go({ view: "activity", key: here })),
          },
          {
            label: `${pname} settings`,
            run: run(() => app.go({ view: "settings", key: here })),
          },
        ]
      : []),
    {
      label: "All activity",
      hint: here ? undefined : "G A",
      run: run(() => app.go({ view: "activity" })),
    },
    {
      label: "Open the trash",
      run: run(() => app.go({ view: "activity", key: here, trash: true })),
    },
    {
      label: "Workspace settings",
      hint: here ? undefined : "G S",
      run: run(() => app.go({ view: "settings" })),
    },
    {
      label: "Add an agent",
      run: run(app.addAgent),
    },
    { label: "New project", run: run(app.newProject) },
    { label: "Bring a codebase", run: run(app.openSetup) },
    ...Object.values(d.projects)
      .filter((p) => p.key !== here)
      .map((p) => ({
        label: `Switch to ${p.name}`,
        hint: p.key,
        run: run(() => app.go({ view: "board", key: p.key })),
      })),
  ].filter((x) => has(x.label))

  const tasks: Item[] = ql
    ? Object.values(d.tasks)
        .map((t) => ({ t, ref: refOf(d, t) }))
        .filter(({ t, ref }) => has(ref) || has(t.title) || has(t.notes))
        .sort((a, b) => b.t.updatedAt.localeCompare(a.t.updatedAt))
        .slice(0, 8)
        .map(({ t, ref }) => ({
          label: t.title,
          lead: (
            <>
              <StatusIcon s={t.status as Status} />
              <span className="cid" style={{ width: 64, flex: "none" }}>
                {ref}
              </span>
            </>
          ),
          run: run(() => app.openTask(ref)),
        }))
    : []

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
        {x.lead}
        <span>{x.label}</span>
        {x.hint && <span className="kbd">{x.hint}</span>}
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
          placeholder="Search tasks, or type a command"
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
        {acts.length > 0 && <div className="grp">Actions</div>}
        {acts.map(btn)}
        {tasks.length > 0 && <div className="grp">Tasks</div>}
        {tasks.map(btn)}
        {!all.length && <div className="grp">Nothing matches</div>}
      </div>
    </>
  )
}
