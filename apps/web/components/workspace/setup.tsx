"use client"

import type { AgentKey } from "@leanear/ui/tiles"
import { useState } from "react"
import { liveMembers, toast, useData } from "@/lib/store/store"
import { api } from "@/trpc/client"
import { useApp } from "@/components/chrome/app"
import { Dialog } from "@/components/chrome/dialog"
import { agentTile } from "@/components/common/avatar"
import {
  Cmd,
  Connect,
  PickTool,
  claudeSetup,
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

/**
 * Everything the agent needs in one paste: a fresh key, the connection and
 * the setup. Keys are shown once, so this makes a new one rather than asking
 * for the old.
 */
export function SetupSteps({ projectKey }: { projectKey: string }) {
  const d = useData()
  const agents = liveMembers(d).filter((m) => m.kind === "agent")
  const [tool, setTool] = useState<AgentKey>("claude")
  const [key, setKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const agent =
    agents.find((m) => agentTile(m.name) === tool) ?? agents[0] ?? null

  if (!agent)
    return (
      <div className="callout">
        Add an agent first. It needs its own key to write here.
      </div>
    )

  const make = async () => {
    setBusy(true)
    try {
      setKey((await api.workspace.newKey.mutate({ memberId: agent.id })).key)
    } catch (e) {
      toast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PickTool
        tool={tool}
        onPick={(t) => {
          setTool(t)
          setKey(null)
        }}
      />
      {!key ? (
        <button className="btn" disabled={busy} onClick={make}>
          Make {agent.name}&apos;s setup line
        </button>
      ) : tool === "claude" ? (
        <>
          <Cmd code={claudeSetup(d.mcpUrl, key)} file="In the repo's folder" />
          <p>
            Then start <b>claude</b> there and type <b>/leanear-setup</b>.
          </p>
        </>
      ) : (
        <>
          <Connect tool={tool} url={d.mcpUrl} apiKey={key} />
          <p>Restart the agent, then paste this into it, in the repo:</p>
          <Cmd code={setupPrompt(projectKey)} file="Prompt" />
        </>
      )}
    </>
  )
}
