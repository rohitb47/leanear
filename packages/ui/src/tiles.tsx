import { Logo, type LogoKey } from "./logos"

// App-icon tiles for the agents that work with Leanear, in their own colours.
type Tile = {
  name: string
  bg: string
  fg: string
  logo?: LogoKey
  size?: number
}
export const AGENTS = {
  claude: {
    name: "Claude Code",
    bg: "#f1ede5",
    fg: "#d97757",
    logo: "claude",
  },
  cursor: {
    name: "Cursor",
    bg: "#14120b",
    fg: "#edecec",
    logo: "cursor",
  },
  codex: { name: "Codex", bg: "#ffffff", fg: "#7b83f6" },
  copilot: {
    name: "Copilot",
    bg: "#0d1117",
    fg: "#ffffff",
    logo: "copilot",
  },
  windsurf: {
    name: "Windsurf",
    bg: "#0b100f",
    fg: "#ffffff",
    logo: "windsurf",
  },
} satisfies Record<string, Tile>
export type AgentKey = keyof typeof AGENTS

// Rivals, for the comparison.
export const RIVALS = {
  linear: {
    name: "Linear",
    bg: "#5e6ad2",
    fg: "#ffffff",
    logo: "linear",
    size: 0.56,
  },
  asana: {
    name: "Asana",
    bg: "#ffffff",
    fg: "#f06a6a",
    logo: "asana",
    size: 0.6,
  },
  trello: {
    name: "Trello",
    bg: "#0052cc",
    fg: "#ffffff",
    logo: "trello",
    size: 0.56,
  },
  notion: {
    name: "Notion",
    bg: "#ffffff",
    fg: "#0a0a0a",
    logo: "notion",
    size: 0.62,
  },
} satisfies Record<string, Tile>

function Codex({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.2 19.5a5 5 0 0 1-1.4-9.8 6.4 6.4 0 0 1 12.1-1.5 4.9 4.9 0 0 1 .4 9.8l-.4.1-.2 1.4z"
      />
      <path
        d="M8.6 11.2l2.4 2-2.4 2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 15.3h3.2"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function AppTile({
  t,
  px,
  className = "",
}: {
  t: Tile
  px: number
  className?: string
}) {
  // px 0 means "size me in CSS", for tiles that scale with a headline.
  const inner = Math.round((px || 24) * (t.size ?? 0.5))
  return (
    <span
      className={`tile ${className}`}
      title={t.name}
      style={
        px
          ? {
              width: px,
              height: px,
              background: t.bg,
              color: t.fg,
              borderRadius: px * 0.24,
            }
          : { background: t.bg, color: t.fg }
      }
    >
      {t.logo ? (
        <Logo k={t.logo} size={inner} />
      ) : (
        <Codex size={Math.round((px || 24) * 0.62)} />
      )}
    </span>
  )
}
