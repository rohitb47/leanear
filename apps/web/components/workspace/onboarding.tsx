"use client"

import { Mark } from "@leanear/ui/mark"
import { set, spring } from "@leanear/ui/spring"
import { useLayoutEffect, useRef, useState } from "react"
import { keyFor } from "@/lib/projects/key"
import type { Project } from "@/lib/sync/types"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Connect } from "@/components/workspace/connect"
import { putMember, putProject, useData } from "@/lib/store/store"

/** Two steps: name the product, bring the agent. Each slides the way you're going. */
export function Onboarding() {
  const d = useData()
  const { go } = useApp()
  const [step, setStep] = useState<1 | 2>(
    Object.keys(d.projects).length ? 2 : 1
  )
  const [made, setMade] = useState<Project | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef(step)

  useLayoutEffect(() => {
    if (prev.current === step || !ref.current) return
    const dir = step > prev.current ? 1 : -1
    prev.current = step
    set(ref.current, { x: dir * 28, o: 0 })
    spring(ref.current, {}, { r: 0.3 })
  }, [step])

  const finish = () => {
    const key = made?.key ?? Object.values(d.projects)[0]?.key
    if (key) go({ view: "board", key })
  }

  return (
    <div className="center">
      <div className="stack" ref={ref}>
        {step === 1 ? (
          <ProjectStep
            first={d.me.name.split(/\s+/)[0]}
            onDone={(p) => {
              setMade(p)
              setStep(2)
            }}
          />
        ) : (
          <AgentStep url={d.mcpUrl} onDone={finish} />
        )}
      </div>
    </div>
  )
}

function ProjectStep({
  first,
  onDone,
}: {
  first: string
  onDone: (p: Project) => void
}) {
  const [name, setName] = useState("")
  const [key, setKey] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const k = key ?? (name.trim() ? keyFor(name) : "")
  return (
    <>
      <div className="bigmark">
        <Mark size={44} />
      </div>
      <div className="dots">
        <i className="on" />
        <i />
      </div>
      <h2>What are you building, {first}?</h2>
      <p>One project per product. You can add more later.</p>
      <form
        className="formcard"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return setErr("Give it a name")
          setBusy(true)
          try {
            const p = await api.projects.create.mutate({ name, key: k })
            putProject(p)
            onDone(p)
          } catch (x) {
            setErr((x as Error).message)
          } finally {
            setBusy(false)
          }
        }}
      >
        <div>
          <label className="label" htmlFor="pname">
            Project name
            <span>
              Key:{" "}
              <input
                className="mono"
                aria-label="Key"
                value={k}
                placeholder="KEY"
                onChange={(e) =>
                  setKey(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, "")
                      .slice(0, 5)
                  )
                }
                style={{
                  border: 0,
                  background: "none",
                  width: 48,
                  padding: 0,
                  color: "var(--ink)",
                  outline: "none",
                }}
              />
            </span>
          </label>
          <input
            className="field"
            id="pname"
            autoFocus
            value={name}
            placeholder="Provida"
            maxLength={60}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value)
              setErr(null)
            }}
          />
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn accent wide" type="submit" disabled={busy}>
          Create project
        </button>
      </form>
    </>
  )
}

function AgentStep({ url, onDone }: { url: string; onDone: () => void }) {
  const [name, setName] = useState("Claude")
  const [key, setKey] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <>
      <div className="dots">
        <i className="on" />
        <i className="on" />
      </div>
      <h2>Bring your agent</h2>
      <p>
        It joins as a member with its own name and key, and works through the
        tasks you give it.
      </p>
      <div className="formcard">
        {key ? (
          <>
            <Connect url={url} apiKey={key} />
            <p style={{ fontSize: 13, textAlign: "center" }}>
              Then tell it: “Work through my Leanear tasks.”
            </p>
            <button className="btn accent wide" onClick={onDone}>
              I&apos;ve added it
            </button>
          </>
        ) : (
          <form
            style={{ display: "contents" }}
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              try {
                const r = await api.workspace.addAgent.mutate({ name })
                putMember(r.member)
                setKey(r.key)
              } catch (x) {
                setErr((x as Error).message)
              } finally {
                setBusy(false)
              }
            }}
          >
            <div>
              <label className="label" htmlFor="aname">
                Agent name
              </label>
              <input
                className="field"
                id="aname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="off"
              />
            </div>
            {err && <div className="err">{err}</div>}
            <button
              className="btn accent wide"
              type="submit"
              disabled={busy || !name.trim()}
            >
              Make its key
            </button>
          </form>
        )}
      </div>
      {!key && (
        <button
          className="btn bare"
          style={{ alignSelf: "center" }}
          onClick={onDone}
        >
          Skip for now
        </button>
      )}
    </>
  )
}
