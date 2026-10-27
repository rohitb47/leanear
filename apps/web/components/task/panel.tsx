"use client"

import { Copy } from "@shipthat/ui/copy"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
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
import {
  liveMembers,
  putTask,
  refOf,
  toast,
  undoable,
  useData,
  type Data,
} from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { Menu } from "@/components/chrome/menu"
import { Av, StatusIcon } from "@/components/common/avatar"
import { I } from "@/components/common/icons"
import { MdEditor } from "@/components/common/md-editor"
import { Assignees } from "@/components/task/new-task"
import { md } from "@/lib/ui/markdown"
import { ago, copy } from "@/lib/ui/format"
import { Button } from "@/components/common/button"

/**
 * A task, in a dialog over the board. Click outside or press Escape to close
 * it; Escape in a field leaves the field first.
 */
export function Panel({ taskId }: { taskId: string | null }) {
  const { closeTask } = useApp()
  // Keep drawing the task while the dialog fades away.
  const [kept, setKept] = useState(taskId)
  if (taskId && taskId !== kept) setKept(taskId)
  return (
    <Dialog
      open={!!taskId}
      onClose={closeTask}
      label="Task"
      className="taskdlg"
    >
      {kept && <Body key={kept} id={kept} closing={!taskId} />}
    </Dialog>
  )
}

function Body({ id, closing }: { id: string; closing: boolean }) {
  const d = useData()
  const { closeTask } = useApp()
  const t = d.tasks[id]
  const [menu, setMenu] = useState<null | {
    k: "status" | "type" | "who" | "more"
    el: HTMLElement
  }>(null)

  useEffect(() => {
    if (!t && !closing) closeTask()
  }, [t, closing, closeTask])

  if (!t) return null
  const ref = refOf(d, t)
  const assignee = t.assigneeId ? d.members[t.assigneeId] : null
  const toggle =
    (k: "status" | "type" | "who" | "more") =>
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.currentTarget
      setMenu((m) => (m?.k === k ? null : { k, el }))
    }
  const setStatus = (s: Status) => {
    setMenu(null)
    if (s !== t.status)
      void patch(t.id, { status: s }, () =>
        api.tasks.move.mutate({ id: t.id, status: s })
      )
  }

  return (
    <>
      <div className="ptop">
        <span className="cid">{ref}</span>
        <Copy text={ref} />
        <div className="grow" />
        <button className="icon" onClick={toggle("more")} aria-label="More">
          {I.more}
        </button>
        <button className="icon" onClick={closeTask} aria-label="Close">
          {I.close}
        </button>
      </div>

      <div className="pbody">
        <Title t={t} />
        <div className="props">
          <button className="prop" onClick={toggle("status")}>
            <StatusIcon s={t.status} />
            {STATUS_NAME[t.status]}
          </button>
          <button className="prop" onClick={toggle("type")}>
            {TYPE_NAME[t.type]}
          </button>
          <button className="prop" onClick={toggle("who")}>
            <Av m={assignee} />
            {assignee ? assignee.name : "No one"}
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
          <button key={s} onClick={() => setStatus(s)}>
            <StatusIcon s={s} />
            {STATUS_NAME[s]}
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
            {TYPE_NAME[k]}
            {t.type === k && <span className="check">{I.check}</span>}
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
          value={t.assigneeId}
          onPick={(v) => {
            setMenu(null)
            if (v !== t.assigneeId)
              void patch(t.id, { assigneeId: v }, () =>
                api.tasks.update.mutate({ id: t.id, assignee: v ?? "none" })
              )
          }}
        />
      </Menu>
      <Menu
        anchor={menu?.el ?? null}
        open={menu?.k === "more"}
        onClose={() => setMenu(null)}
        align="end"
      >
        <button
          onClick={async () => {
            setMenu(null)
            toast(
              (await copy(location.href))
                ? "Copied the link"
                : "Copy the address bar instead"
            )
          }}
        >
          Copy link
        </button>
        {t.status !== "canceled" && (
          <button onClick={() => setStatus("canceled")}>Cancel task</button>
        )}
        <hr />
        <button
          className="danger"
          onClick={async () => {
            setMenu(null)
            const prev = t
            putTask({ ...t, deleted: true })
            closeTask()
            try {
              await api.tasks.delete.mutate({ id: prev.id })
              toast(
                `Moved ${ref} to the trash`,
                undoable(ref, async () => {
                  const r = await api.log.restore.mutate({
                    kind: "task",
                    id: prev.id,
                  })
                  if ("task" in r && r.task) putTask(r.task)
                })
              )
            } catch (e) {
              putTask(prev)
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
    <h2
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
          e.stopPropagation()
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
    </h2>
  )
}

/** Paste an image into a field: upload it and insert a Markdown link at the cursor. */
function usePasteImage(
  taskId: string,
  onText: (fn: (v: string) => string) => void
) {
  return async (
    e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const file = [...e.clipboardData.items]
      .find((i) => i.type.startsWith("image/"))
      ?.getAsFile()
    if (!file) return
    e.preventDefault()
    const at = e.currentTarget.selectionStart ?? 0
    toast("Uploading the screenshot")
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
      <div className="sec">
        Notes
        {edit === null ? (
          <button className="btn bare sm" onClick={() => setEdit(t.notes)}>
            Edit
          </button>
        ) : (
          <span style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            <button className="btn bare sm" onClick={() => setEdit(null)}>
              Cancel
            </button>
            <button className="btn sm" onClick={save}>
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
          <button className="addnotes" onClick={() => setEdit("")}>
            Add notes
          </button>
        )
      ) : (
        <MdEditor
          box
          autoFocus
          label="Notes"
          value={edit}
          placeholder="Markdown. Paste a screenshot with ⌘V."
          onChange={setEdit}
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
      return <>added this</>
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
            gave it to <b>{name(data.to)}</b>
          </>
        )
      ) : (
        <>unassigned it</>
      )
    case "renamed":
      return <>renamed it</>
    case "retyped":
      return (
        <>
          made it a <b>{TYPE_NAME[data.to as Task["type"]] ?? data.to}</b>
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
  const [prev, setPrev] = useState<number | null>(null)
  return (
    <section>
      <div className="sec">Activity</div>
      <div className="events">
        {!items && <div className="ev">Loading</div>}
        <AnimatePresence initial={false}>
          {items?.map((a) => {
            const who = d.members[a.actorId]
            return (
              <motion.div
                key={a.id}
                className="ev"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Av m={who} />
                <div className="what">
                  <b>{who?.name ?? "Someone"}</b> {describe(a, d)}
                  {a.kind === "notes" && (
                    <>
                      {" "}
                      <button
                        className="linkish"
                        onClick={() => setPrev(prev === a.id ? null : a.id)}
                      >
                        {prev === a.id ? "hide" : "before"}
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
                  suppressHydrationWarning
                >
                  {ago(a.createdAt)}
                </span>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </section>
  )
}

function Composer({ t, d }: { t: Task; d: Data }) {
  const [v, setV] = useState("")
  const [busy, setBusy] = useState(false)
  // An @ being typed: where it starts, the letters after it, the row picked.
  const [at, setAt] = useState<{
    start: number
    q: string
    sel: number
  } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const members = liveMembers(d)
  const agent = members.find((m) => m.kind === "agent")
  const paste = usePasteImage(t.id, (fn) => setV((x) => fn(x)))
  const matches = at
    ? members
        .filter((m) => m.name.toLowerCase().includes(at.q.toLowerCase()))
        .sort(
          (a, b) =>
            Number(!a.name.toLowerCase().startsWith(at.q.toLowerCase())) -
            Number(!b.name.toLowerCase().startsWith(at.q.toLowerCase()))
        )
        .slice(0, 6)
    : []

  const look = (text: string, caret: number) => {
    const m = /(^|\s)@([^\s@]*)$/.exec(text.slice(0, caret))
    setAt(m ? { start: caret - m[2].length - 1, q: m[2], sel: 0 } : null)
  }
  const pick = (name: string) => {
    const el = input.current
    if (!el || !at) return
    const caret = el.selectionStart ?? v.length
    const next = `${v.slice(0, at.start)}@${name} ${v.slice(caret)}`
    const pos = at.start + name.length + 2
    setV(next)
    setAt(null)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

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
      {matches.length > 0 && at && (
        <div className="mentions" role="listbox" aria-label="Members">
          {matches.map((m, i) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={i === at.sel}
              className={i === at.sel ? "active" : ""}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => i !== at.sel && setAt({ ...at, sel: i })}
              onClick={() => pick(m.name)}
            >
              <Av m={m} />
              <span>{m.id === d.me.memberId ? `${m.name} (you)` : m.name}</span>
            </button>
          ))}
        </div>
      )}
      <input
        ref={input}
        className="field"
        value={v}
        onChange={(e) => {
          setV(e.target.value)
          look(e.target.value, e.target.selectionStart ?? e.target.value.length)
        }}
        onSelect={(e) =>
          look(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
        }
        onBlur={() => setAt(null)}
        onPaste={paste}
        onKeyDown={(e) => {
          if (at && matches.length) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault()
              const n = matches.length
              setAt({
                ...at,
                sel: (at.sel + (e.key === "ArrowDown" ? 1 : -1) + n) % n,
              })
              return
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault()
              pick(matches[at.sel].name)
              return
            }
            if (e.key === "Escape") {
              e.preventDefault()
              setAt(null)
              return
            }
          }
          if (e.key === "Escape") e.currentTarget.blur()
        }}
        placeholder={
          agent ? `Comment, or @${agent.name} to hand it over` : "Comment"
        }
        autoComplete="off"
      />
      <Button className="btn" type="submit" loading={busy} disabled={!v.trim()}>
        Send
      </Button>
    </form>
  )
}
