"use client"

import type { Member, Status } from "@/lib/sync/types"

export const StatusDot = ({ s }: { s: Status }) => (
  <span className={`st ${s}`} aria-hidden="true" />
)

export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean)
  return (
    (w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 1)) || "?"
  ).toUpperCase()
}

export function Av({ m, lg }: { m?: Member | null; lg?: boolean }) {
  if (!m)
    return (
      <span className={`av none${lg ? " lg" : ""}`} title="No one">
        ·
      </span>
    )
  return (
    <span
      className={`av${m.kind === "agent" ? " agent" : ""}${lg ? " lg" : ""}`}
      title={m.name}
    >
      {m.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials(m.name)
      )}
    </span>
  )
}
