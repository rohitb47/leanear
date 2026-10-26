"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { AGENTS as TILES, AppTile, type AgentKey } from "@leanear/ui/tiles"

// The Settings tab: the project's name and key, and who's in it. Agents are
// members like Rohit, each with its own key; New agent adds the next one.
type Agent = { k: AgentKey; name: string; key: string }

const AGENTS: Agent[] = [
  { k: "claude", name: "Claude", key: "7f3a" },
  { k: "cursor", name: "Cursor", key: "c41e" },
  { k: "copilot", name: "Copilot", key: "09bd" },
  { k: "windsurf", name: "Windsurf", key: "e2a6" },
]

export function useSettings() {
  const [name, setName] = useState("Leanear")
  return { name, setName, agents: AGENTS.slice(0, 2) }
}

export function Settings({ state }: { state: ReturnType<typeof useSettings> }) {
  const { name, setName, agents } = state
  return (
    <div className="set">
      <div className="set-col">
        <section>
          <h4>Project</h4>
          <div className="set-card">
            <label className="set-row">
              <span>Name</span>
              <input
                value={name}
                spellCheck={false}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="set-row">
              <span>Key</span>
              <input className="key" value="LEA" readOnly />
            </label>
          </div>
        </section>
        <section>
          <h4>
            Members <span className="n">{agents.length + 1}</span>
          </h4>
          <div className="set-card">
            <div className="set-row">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="face"
                src="/rohit.png"
                alt=""
                width={24}
                height={24}
              />
              <span className="who">Rohit</span>
              <span className="role">Owner</span>
            </div>
            {agents.map((a) => (
              <motion.div
                key={a.k}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="set-row"
              >
                <AppTile t={TILES[a.k]} px={24} />
                <span className="who">{a.name}</span>
                <span className="role">lk_••••{a.key}</span>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
