"use client"

import type { AgentKey } from "@shipthat/ui/tiles"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import type { Member } from "@/lib/sync/types"
import { putMember, toast, useData } from "@/lib/store/store"
import { Dialog } from "@/components/chrome/dialog"
import { api } from "@/trpc/client"
import { AGENT_NAME, Connect, PickTool } from "@/components/workspace/connect"
import { Button } from "@/components/common/button"

/**
 * Bring an agent: pick its tool, name it, get its key and the one line to
 * paste. Then it waits, and says so the moment the agent first calls in.
 */
export function AddAgent({
  onAdded,
  autoFocus,
}: {
  onAdded?: (m: Member) => void
  autoFocus?: boolean
}) {
  const d = useData()
  const [tool, setTool] = useState<AgentKey>("claude")
  const [name, setName] = useState<string | null>(null)
  const [made, setMade] = useState<{ member: Member; key: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const shown = name ?? AGENT_NAME[tool]

  return (
    <div className="connect">
      <PickTool
        tool={tool}
        onPick={(t) => {
          setTool(t)
          if (made) return
          setErr(null)
        }}
      />
      {made ? (
        <>
          <Connect tool={tool} url={d.mcpUrl} apiKey={made.key} />
          <Listening member={made.member} />
        </>
      ) : (
        <form
          style={{ display: "flex", gap: 8 }}
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setErr(null)
            try {
              const r = await api.workspace.addAgent.mutate({ name: shown })
              putMember(r.member)
              setMade(r)
              onAdded?.(r.member)
            } catch (x) {
              setErr((x as Error).message)
            } finally {
              setBusy(false)
            }
          }}
        >
          <input
            className="field"
            aria-label="Agent name"
            value={shown}
            autoFocus={autoFocus}
            maxLength={40}
            autoComplete="off"
            onChange={(e) => setName(e.target.value)}
          />
          <Button
            className="btn"
            type="submit"
            loading={busy}
            disabled={!shown.trim()}
          >
            Make its key
          </Button>
        </form>
      )}
      {err && <div className="err">{err}</div>}
    </div>
  )
}

/** Waits for the agent's first call, then says it's in. */
export function Listening({ member }: { member: Member }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (on) return
    let stop = false
    const tick = async () => {
      try {
        const s = await api.workspace.settings.query()
        if (stop) return
        if (s.keys.some((k) => k.memberId === member.id && k.lastUsedAt)) {
          setOn(true)
          toast(`${member.name} is connected`)
        }
      } catch {}
    }
    const t = setInterval(tick, 2500)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [on, member])
  return (
    <div className={`status${on ? " on" : ""}`} aria-live="polite">
      <span className="dot" />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(on)}
          initial={{ opacity: 0, scale: 0.86, filter: "blur(4px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.1, filter: "blur(3px)" }}
        >
          {on
            ? `${member.name} is connected`
            : `Waiting for ${member.name} to connect`}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

/** Settings listens for this, to show a new agent's key and status. */
export const changedMembers = () =>
  window.dispatchEvent(new Event("lean-members"))

/** Add an agent, start to finish, in one dialog over wherever you are. */
export function AddAgentDialog({
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
      label="Add an agent"
      className="dialog-text"
    >
      <div className="db">
        <h3>Add an agent</h3>
        <p>
          It joins as a member with its own name and key, picks its next task,
          does it and reports back.
        </p>
      </div>
      {/* A fresh flow each time it opens. */}
      {open && <AddAgent autoFocus onAdded={changedMembers} />}
      <div className="df">
        <div className="grow" />
        <button className="btn sm" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}

/**
 * A new key for an agent that's already here: shown once, with the line to
 * connect it for whichever tool it runs in.
 */
export function KeyDialog({
  agent,
  apiKey,
  onClose,
}: {
  agent: Member | null
  apiKey: string | null
  onClose: () => void
}) {
  const d = useData()
  const [tool, setTool] = useState<AgentKey>("claude")
  return (
    <Dialog
      open={!!agent && !!apiKey}
      onClose={onClose}
      label="New key"
      className="dialog-text"
    >
      <div className="db">
        <h3>A new key for {agent?.name}</h3>
        <p>
          It won&apos;t be shown again. Its old keys keep working until you
          revoke them.
        </p>
        <PickTool tool={tool} onPick={setTool} />
        {apiKey && <Connect tool={tool} url={d.mcpUrl} apiKey={apiKey} />}
      </div>
      <div className="df">
        <div className="grow" />
        <button className="btn sm" onClick={onClose}>
          Done
        </button>
      </div>
    </Dialog>
  )
}
