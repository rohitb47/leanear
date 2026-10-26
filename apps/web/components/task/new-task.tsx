"use client"

import { useState } from "react"
import {
  STATUSES,
  STATUS_NAME,
  TYPES,
  TYPE_NAME,
  type Status,
  type TaskType,
} from "@/lib/sync/types"
import { upload } from "@/lib/store/patch"
import {
  liveMembers,
  projectByKey,
  putTask,
  toast,
  useData,
} from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { Menu } from "@/components/chrome/menu"
import { Av, StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { MdEditor } from "@/components/common/md-editor"

type State = { status: Status; n: number } | null

/** New task, in a dialog in the middle of the screen. */
export function NewTask({
  state,
  onClose,
}: {
  state: State
  onClose: () => void
}) {
  // Keep showing what opened it while it closes.
  const [kept, setKept] = useState(state)
  if (state && state !== kept) setKept(state)
  return (
    <Dialog open={!!state} onClose={onClose} label="New task">
      {kept && <Body key={kept.n} first={kept.status} onClose={onClose} />}
    </Dialog>
  )
}

function Body({ first, onClose }: { first: Status; onClose: () => void }) {
  const d = useData()
  const { project } = useApp()
  // The project in view, or the last one; from Home you can pick another.
  const [key, setKey] = useState(project)
  const p = key ? projectByKey(d, key) : undefined
  const projects = Object.values(d.projects).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState<Status>(first)
  const [type, setType] = useState<TaskType>("feature")
  const [who, setWho] = useState<string | null>(d.me.memberId)
  const [shots, setShots] = useState<
    { hash: string; local: string; path: string | null }[]
  >([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [menu, setMenu] = useState<null | {
    k: "project" | "status" | "type" | "who"
    el: HTMLElement
  }>(null)
  const toggle =
    (k: "project" | "status" | "type" | "who") =>
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget
      setMenu((m) => (m?.k === k ? null : { k, el }))
    }
  const next =
    Object.values(d.tasks)
      .filter((t) => t.projectId === p?.id)
      .reduce((m, t) => Math.max(m, t.number), 0) + 1
  const assignee = who ? d.members[who] : null

  // The same picture pasted twice is kept once; it shows while it uploads.
  const onPaste = async (e: React.ClipboardEvent) => {
    const file = [...e.clipboardData.items]
      .find((i) => i.type.startsWith("image/"))
      ?.getAsFile()
    if (!file) return
    e.preventDefault()
    const hash = await digest(file)
    if (shots.some((s) => s.hash === hash))
      return toast("That screenshot is already here")
    const local = URL.createObjectURL(file)
    setShots((s) => [...s, { hash, local, path: null }])
    try {
      const path = await upload(file)
      setShots((s) => s.map((x) => (x.hash === hash ? { ...x, path } : x)))
    } catch (x) {
      setShots((s) => s.filter((y) => y.hash !== hash))
      toast((x as Error).message)
    }
  }

  // The dialog closes at once; the card lands when the server answers.
  const submit = async () => {
    if (!p || busy) return
    if (!title.trim()) return setErr("Give it a title first")
    if (shots.some((s) => !s.path))
      return setErr("A screenshot is still uploading")
    setBusy(true)
    onClose()
    try {
      const body = [
        notes.trim(),
        ...shots.filter((s) => s.path).map((s) => `![screenshot](${s.path})`),
      ]
        .filter(Boolean)
        .join("\n\n")
      putTask(
        await api.tasks.create.mutate({
          project: p.id,
          title,
          notes: body,
          type,
          status,
          assignee: who ?? "none",
        })
      )
    } catch (x) {
      toast(`Couldn't add "${title.trim()}": ${(x as Error).message}`)
    }
  }

  return (
    <div
      className="dcol"
      onPaste={onPaste}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          void submit()
        }
      }}
    >
      <div className="dh">
        {projects.length > 1 ? (
          <button type="button" className="prop" onClick={toggle("project")}>
            <span className="keypill">{p?.key}</span>
            {p?.name}
            {I.chev}
          </button>
        ) : null}
        <span className="cid muted">
          {p?.key}-{next}
        </span>
      </div>
      <div className="db">
        <input
          className="bigin"
          autoFocus
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setErr(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              void submit()
            }
          }}
          placeholder="What needs doing?"
          maxLength={200}
          autoComplete="off"
        />
        <MdEditor
          box
          label="Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Notes in Markdown. Paste a screenshot with ⌘V."
        />
        {shots.length > 0 && (
          <div className="shots">
            {shots.map((s) => (
              <span key={s.hash} className={`shot${s.path ? "" : " up"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.local} alt="Pasted screenshot" />
                <button
                  type="button"
                  aria-label="Remove screenshot"
                  onClick={() =>
                    setShots((list) => list.filter((x) => x.hash !== s.hash))
                  }
                >
                  {I.close}
                </button>
              </span>
            ))}
          </div>
        )}
        {err && <div className="err">{err}</div>}
      </div>
      <div className="df">
        <button type="button" className="prop" onClick={toggle("status")}>
          <StatusIcon s={status} />
          {STATUS_NAME[status]}
        </button>
        <button type="button" className="prop" onClick={toggle("type")}>
          {TYPE_NAME[type]}
        </button>
        <button type="button" className="prop" onClick={toggle("who")}>
          <Av m={assignee} />
          {assignee
            ? assignee.id === d.me.memberId
              ? "Me"
              : assignee.name
            : "No one"}
        </button>
        <div className="grow" />
        <button
          className="btn accent sm"
          type="button"
          disabled={busy || shots.some((s) => !s.path)}
          onClick={() => void submit()}
        >
          Add task
        </button>
      </div>

      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "project"}
        onClose={() => setMenu(null)}
        width={240}
      >
        {projects.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              setMenu(null)
              setKey(x.key)
            }}
          >
            <span className="keypill">{x.key}</span>
            <span>{x.name}</span>
            {x.key === p?.key && <span className="check">{I.check}</span>}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "status"}
        onClose={() => setMenu(null)}
      >
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => {
              setMenu(null)
              setStatus(s)
            }}
          >
            <StatusIcon s={s} />
            {STATUS_NAME[s]}
            {status === s && <span className="check">{I.check}</span>}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "type"}
        onClose={() => setMenu(null)}
      >
        {TYPES.map((k) => (
          <button
            key={k}
            onClick={() => {
              setMenu(null)
              setType(k)
            }}
          >
            {TYPE_NAME[k]}
            {type === k && <span className="check">{I.check}</span>}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "who"}
        onClose={() => setMenu(null)}
        width={220}
      >
        <Assignees
          value={who}
          onPick={(v) => {
            setMenu(null)
            setWho(v)
          }}
        />
      </Menu>
    </div>
  )
}

/** Everyone a task can go to: you first, then people, then agents. */
export function Assignees({
  value,
  onPick,
}: {
  value: string | null
  onPick: (id: string | null) => void
}) {
  const d = useData()
  const list = liveMembers(d).sort((a, b) =>
    a.id === d.me.memberId
      ? -1
      : b.id === d.me.memberId
        ? 1
        : a.kind === b.kind
          ? a.name.localeCompare(b.name)
          : a.kind === "person"
            ? -1
            : 1
  )
  return (
    <>
      {[null, ...list].map((m) => (
        <button key={m?.id ?? "none"} onClick={() => onPick(m?.id ?? null)}>
          <Av m={m} />
          <span>
            {m
              ? m.id === d.me.memberId
                ? `${m.name} (you)`
                : m.name
              : "No one"}
          </span>
          {(value ?? null) === (m?.id ?? null) && (
            <span className="check">{I.check}</span>
          )}
        </button>
      ))}
    </>
  )
}

/** A short fingerprint of a pasted file, to spot the same one twice. */
async function digest(file: Blob) {
  const buf = await crypto.subtle.digest("SHA-1", await file.arrayBuffer())
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
