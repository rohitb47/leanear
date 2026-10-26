"use client"

import type { AgentKey } from "@leanear/ui/tiles"
import { useRef, useState } from "react"
import { liveMembers, toast, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { agentTile } from "@/components/common/avatar"
import {
  Cmd,
  PickTool,
  claudeSetup,
  connectFor,
  setupPrompt,
} from "@/components/workspace/connect"

/** Bring a codebase: the agent reads the repo and fills the project. */
export function Setup({
  open,
  onClose,
  projectKey,
}: {
  open: boolean
  onClose: () => void
  projectKey: string
}) {
  const d = useData()
  const { addAgent } = useApp()
  const agent = liveMembers(d).some((m) => m.kind === "agent")
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Bring a codebase"
      className="dialog-text"
    >
      <div className="db">
        <h3>Bring a codebase</h3>
        <p>
          Your agent reads the repo and turns TODOs, open issues and your
          roadmap into your first tasks. It never changes code.
        </p>
        <SetupSteps projectKey={projectKey} />
      </div>
      <div className="df">
        <div className="grow" />
        {agent ? (
          <button className="btn sm" onClick={onClose}>
            Done
          </button>
        ) : (
          <button
            className="btn accent sm"
            onClick={() => {
              onClose()
              addAgent()
            }}
          >
            Add an agent
          </button>
        )}
      </div>
    </Dialog>
  )
}

/** How a key shows until you reveal it. Copy always copies the real line. */
const MASK = "lk_••••••••••••"

/**
 * Everything the agent needs in one paste, for whichever tool you pick, shown
 * at once. The line holds a fresh key (keys are shown once), so the key is
 * made the moment you copy, and only then: once per agent per dialog.
 */
export function SetupSteps({ projectKey }: { projectKey: string }) {
  const d = useData()
  const agents = liveMembers(d).filter((m) => m.kind === "agent")
  const [tool, setTool] = useState<AgentKey>("claude")
  const [keys, setKeys] = useState<Record<string, string>>({})
  const making = useRef(new Map<string, Promise<string>>())
  const [open, setOpen] = useState(false)
  const agent =
    agents.find((m) => agentTile(m.name) === tool) ?? agents[0] ?? null

  if (!agent)
    return (
      <div className="callout">
        Add an agent first. It needs its own key to write here.
      </div>
    )

  // One key per agent per dialog, however many times you copy.
  const keyNow = () => {
    const id = agent.id
    let p = making.current.get(id)
    if (!p) {
      p = api.workspace.newKey
        .mutate({ memberId: id })
        .then((r) => {
          setKeys((k) => ({ ...k, [id]: r.key }))
          return r.key
        })
        .catch((e) => {
          making.current.delete(id)
          toast((e as Error).message)
          throw e
        })
      making.current.set(id, p)
    }
    return p
  }
  // Masked until you ask to see it; the eye makes the key first if need be.
  const shown = (open && keys[agent.id]) || MASK
  const reveal = async () => {
    if (open) return setOpen(false)
    try {
      await keyNow()
      setOpen(true)
    } catch {}
  }

  return (
    <>
      <PickTool tool={tool} onPick={setTool} />
      {tool === "claude" ? (
        <>
          <Cmd
            code={claudeSetup(d.mcpUrl, shown)}
            copy={async () => claudeSetup(d.mcpUrl, await keyNow())}
            file="In the repo's folder"
            shown={open}
            onReveal={reveal}
          />
          <p>
            Then start <b>claude</b> there and type <b>/leanear-setup</b>.
          </p>
        </>
      ) : (
        <>
          <Cmd
            {...connectFor(tool, d.mcpUrl, shown)}
            copy={async () => connectFor(tool, d.mcpUrl, await keyNow()).code}
            shown={open}
            onReveal={reveal}
          />
          <p>Restart the agent, then paste this into it, in the repo:</p>
          <Cmd code={setupPrompt(projectKey)} file="Prompt" />
        </>
      )}
    </>
  )
}
