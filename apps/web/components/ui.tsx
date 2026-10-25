"use client";

import type { Member, Status } from "@/lib/types";

export const StatusDot = ({ s }: { s: Status }) => <span className={`st ${s}`} aria-hidden="true" />;

export const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? "?").slice(0, 1)) || "?").toUpperCase();
};

export function Av({ m, lg }: { m?: Member | null; lg?: boolean }) {
  if (!m)
    return (
      <span className={`av none${lg ? " lg" : ""}`} title="No one">
        ·
      </span>
    );
  return (
    <span className={`av${m.kind === "agent" ? " agent" : ""}${lg ? " lg" : ""}`} title={m.name}>
      {m.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        initials(m.name)
      )}
    </span>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
export const count = (n: number) => pad(n);

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 45) return "now";
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  if (s < 7 * 86400) return `${Math.round(s / 86400)}d`;
  if (s < 60 * 86400) return `${Math.round(s / (7 * 86400))}w`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

export async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
