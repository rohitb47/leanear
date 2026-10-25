"use client"

import { project as throwTo, rubber, set, spring } from "@leanear/ui/spring"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ALL_STATUSES,
  STATUS_NAME,
  TYPES,
  TYPE_NAME,
  type Activity,
  type Status,
  type Task,
} from "@/lib/sync/types"
import { loadActivity, patch, upload } from "@/lib/store/patch"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { I } from "@/components/common/icons"
import { md } from "@/lib/ui/markdown"
import { Menu } from "@/components/chrome/menu"
import { velocity } from "@/lib/ui/motion"
import {
  liveMembers,
  putTask,
  refOf,
  toast,
  useData,
  type Data,
} from "@/lib/store/store"
import { Av, StatusDot } from "@/components/common/badges"
import { ago, copy } from "@/lib/ui/format"

/** The task panel. Slides in beside the board; throw its top bar right to put it away. */
export function Panel({ taskId }: { taskId: string | null }) {
  const [shown, setShown] = useState<string | null>(taskId)
  const ref = useRef<HTMLElement>(null)
  const isIn = useRef(false)
  const exitVel = useRef(0)
  if (taskId && taskId !== shown) setShown(taskId)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth + 24
    if (taskId) {
      if (!isIn.current) set(el, { x: w })
      isIn.current = true
      spring(el, {}, { r: 0.38 })
    } else if (isIn.current) {
      spring(
        el,
        { x: w },
        {
          r: 0.34,
          v: { x: exitVel.current },
          keep: true,
          onRest: () => {
            isIn.current = false
            exitVel.current = 0
            setShown(null)
          },
        }
      )
    }
  }, [taskId, shown])

  if (!shown) return null
  return (
    <aside
      className="panel"
      ref={ref}
      style={taskId ? undefined : { pointerEvents: "none" }}
    >
      <PanelBody
        key={shown}
        id={shown}
        closing={!taskId}
        onThrow={(v) => (exitVel.current = v)}
      />
    </aside>
  )
}

function PanelBody({
  id,
  closing,
  onThrow,
}: {
  id: string
  closing: boolean
  onThrow: (vx: number) => void
}) {
  const d = useData()
  const { closeTask } = useApp()
  const t = d.tasks[id]
  const [menu, setMenu] = useState<null | {
    k: "status" | "type" | "who" | "more"
    el: HTMLElement
  }>(null)
  const [firstStatus] = useState(t?.status)

  useEffect(() => {
    if (!t && !closing) closeTask()
  }, [t, closing, closeTask])

  /* Drag the top bar to the right to dismiss. */
  const pd = useRef<{
    sx: number
    started: boolean
    hist: [number, number, number][]
    w: number
    el: HTMLElement
  } | null>(null)
  const suppress = useRef(false)
  const down = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return
    const el = e.currentTarget.parentElement as HTMLElement
    pd.current = {
      sx: e.clientX,
      started: false,
      hist: [[e.clientX, 0, performance.now()]],
      w: el.offsetWidth,
      el,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const s = pd.current
    if (!s) return
    const dx = e.clientX - s.sx
    if (!s.started) {
      if (Math.abs(dx) < 4) return
      s.started = true
      suppress.current = true
      document.documentElement.classList.add("dragging")
    }
    set(s.el, { x: dx < 0 ? -rubber(-dx, s.w) : dx })
    s.hist.push([e.clientX, 0, performance.now()])
    if (s.hist.length > 10) s.hist.shift()
  }
  const up = (e: React.PointerEvent) => {
    const s = pd.current
    pd.current = null
    document.documentElement.classList.remove("dragging")
    if (!s?.started) return
    setTimeout(() => (suppress.current = false), 0)
    const { vx } = velocity(s.hist)
    const x = e.clientX - s.sx
    if (x + throwTo(vx) > s.w / 2) {
      onThrow(vx)
      closeTask()
    } else spring(s.el, {}, { r: 0.38, v: { x: vx } })
  }

  if (!t) return null
  const ref = refOf(d, t)
  const assignee = t.assigneeId ? d.members[t.assigneeId] : null
  const toggle =
    (k: "status" | "type" | "who" | "more") =>
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget
      setMenu((m) => (m?.k === k ? null : { k, el }))
    }

  return (
    <>
      <div
        className="ptop"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <span className="handle" aria-hidden="true" />
        <span className="cid">{ref}</span>
        <span className="type">{TYPE_NAME[t.type]}</span>
        <div className="grow" />
        <button
          className="btn bare sm"
          onClick={async () => {
            if (suppress.current) return
            toast(
              (await copy(ref)) ? `Copied ${ref}` : "Select the id to copy it"
            )
          }}
        >
          Copy id
        </button>
        <button className="circle" onClick={toggle("more")} aria-label="More">
          {I.more}
        </button>
        <button
          className="circle"
          onClick={() => !suppress.current && closeTask()}
          aria-label="Close"
        >
          {I.close}
        </button>
      </div>

      <div className="pbody">
        <Title t={t} />
        <div className="props">
          <button className="prop" onClick={toggle("status")}>
            <StatusDot s={t.status} />
            <span
              key={t.status}
              className={`lbl${t.status !== firstStatus ? " morph" : ""}`}
            >
              {STATUS_NAME[t.status]}
            </span>
          </button>
          <button className="prop" onClick={toggle("type")}>
            <span className="type" style={{ color: "inherit" }}>
              {TYPE_NAME[t.type]}
            </span>
          </button>
          <button className="prop" onClick={toggle("who")}>
            <Av m={assignee} />
            <span>{assignee ? assignee.name : "No one"}</span>
          </button>
        </div>
        <Notes t={t} />
        <Feed t={t} d={d} />
      </div>

      <Composer t={t} d={d} />

      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "status"}
        onClose={() => setMenu(null)}
      >
        {ALL_STATUSES.map((s, i) => (
          <button
            key={s}
            onClick={() => {
              setMenu(null)
              if (s !== t.status)
                void patch(t.id, { status: s }, () =>
                  api.tasks.move.mutate({ id: t.id, status: s })
                )
            }}
          >
            <StatusDot s={s} />
            <span>{STATUS_NAME[s]}</span>
            {t.status === s ? (
              <span className="check">{I.check}</span>
            ) : i < 4 ? (
              <span className="check kbd">{i + 1}</span>
            ) : null}
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
              if (k !== t.type)
                void patch(t.id, { type: k }, () =>
                  api.tasks.update.mutate({ id: t.id, type: k })
                )
            }}
          >
            <span>{TYPE_NAME[k]}</span>
            {t.type === k && <span className="check">{I.check}</span>}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "who"}
        onClose={() => setMenu(null)}
      >
        {[null, ...liveMembers(d)].map((m) => (
          <button
            key={m?.id ?? "none"}
            onClick={() => {
              setMenu(null)
              const v = m?.id ?? null
              if (v !== t.assigneeId)
                void patch(t.id, { assigneeId: v }, () =>
                  api.tasks.update.mutate({ id: t.id, assignee: v ?? "none" })
                )
            }}
          >
            <Av m={m} />
            <span>
              {m
                ? m.id === d.me.memberId
                  ? `${m.name} (you)`
                  : m.name
                : "No one"}
            </span>
            {(t.assigneeId ?? null) === (m?.id ?? null) && (
              <span className="check">{I.check}</span>
            )}
          </button>
        ))}
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "more"}
        onClose={() => setMenu(null)}
      >
        <button
          onClick={async () => {
            setMenu(null)
            toast(
              (await copy(location.href))
                ? "Copied link"
                : "Copy the address bar instead"
            )
          }}
        >
          Copy link
        </button>
        {t.status !== "canceled" && (
          <button
            onClick={() => {
              setMenu(null)
              void patch(t.id, { status: "canceled" }, () =>
                api.tasks.move.mutate({ id: t.id, status: "canceled" })
              )
            }}
          >
            Cancel task
          </button>
        )}
        <hr />
        <button
          style={{ color: "var(--red)" }}
          onClick={async () => {
            setMenu(null)
            if (!confirm(`Delete ${ref}? This can't be undone.`)) return
            try {
              const prev = t
              putTask({ ...t, deleted: true })
              closeTask()
              await api.tasks.delete.mutate({ id: prev.id }).catch((e) => {
                putTask(prev)
                throw e
              })
              toast(`Deleted ${ref}`)
            } catch (e) {
              toast((e as Error).message)
            }
          }}
        >
          Delete task
        </button>
      </Menu>
    </>
  )
}

function Title({ t }: { t: Task }) {
  const el = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (el.current && document.activeElement !== el.current)
      el.current.textContent = t.title
  }, [t.title])
  return (
    <h3
      ref={el}
      className="ttl"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          e.currentTarget.blur()
        }
        if (e.key === "Escape") {
          e.currentTarget.textContent = t.title
          e.currentTarget.blur()
        }
      }}
      onBlur={(e) => {
        const v = (e.currentTarget.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim()
        if (!v) e.currentTarget.textContent = t.title
        else if (v !== t.title)
          void patch(t.id, { title: v }, () =>
            api.tasks.update.mutate({ id: t.id, title: v })
          )
      }}
    >
      {t.title}
    </h3>
  )
}

/** Paste an image into a textarea: upload it and insert a Markdown link at the cursor. */
export function usePasteImage(
  taskId: string | null,
  onText: (fn: (v: string) => string) => void
) {
  return async (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const item = [...e.clipboardData.items].find((i) =>
      i.type.startsWith("image/")
    )
    if (!item) return
    e.preventDefault()
    const file = item.getAsFile()
    if (!file) return
    const at = e.currentTarget.selectionStart ?? 0
    toast("Uploading screenshot…")
    try {
      const path = await upload(file, taskId)
      onText((v) => v.slice(0, at) + `![screenshot](${path})` + v.slice(at))
    } catch (err) {
      toast((err as Error).message)
    }
  }
}

function Notes({ t }: { t: Task }) {
  const [edit, setEdit] = useState<string | null>(null)
  const paste = usePasteImage(t.id, (fn) => setEdit((v) => fn(v ?? "")))
  const save = () => {
    if (edit !== null && edit.trim() !== t.notes)
      void patch(t.id, { notes: edit.trim() }, () =>
        api.tasks.update.mutate({ id: t.id, notes: edit.trim() })
      )
    setEdit(null)
  }
  return (
    <section>
      <div className="notes-head">
        <span>Notes</span>
        {edit === null ? (
          <button className="btn bare sm" onClick={() => setEdit(t.notes)}>
            Edit
          </button>
        ) : (
          <span style={{ display: "flex", gap: 4 }}>
            <button className="btn bare sm" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn primary sm" onClick={save}>
              Save
            </button>
          </span>
        )}
      </div>
      {edit === null ? (
        t.notes ? (
          <div
            className="md"
            dangerouslySetInnerHTML={{ __html: md(t.notes) }}
          />
        ) : (
          <button className="muted" onClick={() => setEdit("")}>
            No notes yet. Add some.
          </button>
        )
      ) : (
        <textarea
          className="field"
          rows={8}
          autoFocus
          value={edit}
          placeholder="Markdown. Paste a screenshot with ⌘V."
          onChange={(e) => setEdit(e.target.value)}
          onPaste={paste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save()
            if (e.key === "Escape") {
              e.stopPropagation()
              setEdit(null)
            }
          }}
        />
      )}
    </section>
  )
}

function describe(a: Activity, d: Data) {
  const data = (a.data ?? {}) as Record<string, string | null>
  const name = (id: string | null | undefined) =>
    id ? (d.members[id]?.name ?? "someone") : null
  switch (a.kind) {
    case "created":
      return <>created this</>
    case "moved":
      return (
        <>
          moved it to <b>{STATUS_NAME[data.to as Status] ?? data.to}</b>
        </>
      )
    case "assigned":
      return data.to ? (
        data.to === a.actorId ? (
          <>took it</>
        ) : (
          <>
            assigned it to <b>{name(data.to)}</b>
          </>
        )
      ) : (
        <>removed the assignee</>
      )
    case "renamed":
      return <>renamed it</>
    case "retyped":
      return (
        <>
          changed the type to{" "}
          <b>{TYPE_NAME[data.to as Task["type"]] ?? data.to}</b>
        </>
      )
    case "notes":
      return <>edited the notes</>
    case "commented":
      return <>commented</>
  }
}

function Feed({ t, d }: { t: Task; d: Data }) {
  const items = d.activity[t.id]
  // What was there when the feed first loaded; anything after rises in.
  const [base, setBase] = useState<Set<number> | null>(null)
  const [prev, setPrev] = useState<number | null>(null)
  if (items && !base) setBase(new Set(items.map((a) => a.id)))
  const fresh = (id: number) => !!base && !base.has(id)

  return (
    <div className="feed">
      <h4>Activity</h4>
      {!items && <div className="ev muted">Loading…</div>}
      {items?.length === 0 && <div className="ev muted">Nothing yet.</div>}
      {items?.map((a) => {
        const who = d.members[a.actorId]
        return (
          <div key={a.id} className={`ev${fresh(a.id) ? " enter" : ""}`}>
            <Av m={who} />
            <div className="what">
              <b>{who?.name ?? "Someone"}</b> {describe(a, d)}
              {a.kind === "notes" && (
                <>
                  {" "}
                  <button
                    className="mono"
                    onClick={() => setPrev(prev === a.id ? null : a.id)}
                  >
                    {prev === a.id ? "hide" : "previous"}
                  </button>
                  {prev === a.id && (
                    <div
                      className="bubble md"
                      dangerouslySetInnerHTML={{
                        __html: md(String(a.data?.prev ?? "") || "_Empty_"),
                      }}
                    />
                  )}
                </>
              )}
              {a.body && (
                <div
                  className="bubble md"
                  dangerouslySetInnerHTML={{ __html: md(a.body) }}
                />
              )}
            </div>
            <span
              className="when"
              title={new Date(a.createdAt).toLocaleString()}
            >
              {ago(a.createdAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Composer({ t, d }: { t: Task; d: Data }) {
  const [v, setV] = useState("")
  const [busy, setBusy] = useState(false)
  const agent = liveMembers(d).find((m) => m.kind === "agent")
  const paste = usePasteImage(t.id, (fn) => setV((x) => fn(x)))
  return (
    <form
      className="composer"
      onSubmit={async (e) => {
        e.preventDefault()
        const body = v.trim()
        if (!body || busy) return
        setBusy(true)
        try {
          const r = await api.tasks.comment.mutate({ id: t.id, body })
          putTask(r)
          setV("")
          if (r.handedTo) toast(`Handed to ${r.handedTo}`)
          await loadActivity(t.id)
        } catch (err) {
          toast((err as Error).message)
        } finally {
          setBusy(false)
        }
      }}
    >
      <input
        className="field"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onPaste={paste}
        placeholder={
          agent ? `Comment, or @${agent.name} to hand it over` : "Comment"
        }
        autoComplete="off"
      />
      <button
        className="btn primary"
        type="submit"
        disabled={busy || !v.trim()}
      >
        Send
      </button>
    </form>
  )
}
