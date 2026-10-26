"use client"

import { Logo, type LogoKey } from "@leanear/ui/logos"
import { AGENTS, type AgentKey } from "@leanear/ui/tiles"
import type { Member, Status } from "@/lib/sync/types"

/** Tools with a mark of their own; the rest wear their initials. */
const MARKS = { claude: 1, cursor: 1, copilot: 1, windsurf: 1 }

/** The tool an agent is, from its name: "Claude" wears Claude's tile. */
export function agentTile(name: string): AgentKey | null {
  const n = name.toLowerCase()
  return (Object.keys(AGENTS) as AgentKey[]).find((k) => n.includes(k)) ?? null
}

export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean)
  return (
    (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 1)) || "?"
  ).toUpperCase()
}

/** A face. People and agents look the same: a name and a face, no tag. */
export function Av({
  m,
  size,
  live,
}: {
  m?: Member | null
  size?: "lg" | "xl"
  live?: boolean
}) {
  const cls = `av${size ? ` ${size}` : ""}${live ? " live" : ""}`
  if (!m)
    return <span className={`${cls} none`} title="No one" aria-label="No one" />
  const tile = m.kind === "agent" ? agentTile(m.name) : null
  return (
    <span
      className={`${cls}${m.kind === "agent" ? " agent" : ""}`}
      title={m.name}
    >
      {m.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
        />
      ) : tile && tile in MARKS ? (
        // As on the site: the tool's small mark on a grey disc, not its tile.
        <Logo
          k={tile as LogoKey}
          size={size === "xl" ? 20 : size === "lg" ? 14 : 11}
          brand={tile === "claude"}
        />
      ) : (
        initials(m.name)
      )}
    </span>
  )
}

/** The status mark: dashed, empty, half, done, and struck out for canceled. */
export function StatusIcon({ s }: { s: Status }) {
  const ring = (dash?: string) => (
    <circle
      cx="7"
      cy="7"
      r="5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeDasharray={dash}
    />
  )
  return (
    <svg
      className={`st ${s}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden
    >
      {s === "backlog" && ring("2.2 2.1")}
      {s === "todo" && ring()}
      {s === "doing" && (
        <>
          {ring()}
          <path d="M7 3.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
        </>
      )}
      {s === "done" && (
        <>
          <circle cx="7" cy="7" r="6.25" fill="currentColor" />
          <path
            d="M4.4 7.2 6.2 9l3.4-3.8"
            fill="none"
            stroke="var(--paper)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {s === "canceled" && (
        <>
          {ring()}
          <path
            d="M5 5l4 4M9 5l-4 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
