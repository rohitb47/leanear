import { Mark } from "@leanear/ui/mark"
import { AppTile, RIVALS } from "@leanear/ui/tiles"

// Paid prices are each tool's cheapest paid plan, a person a month, billed
// yearly. MCP means an official server from the tool's own team. Recheck both
// against their pricing and docs pages when they change.
const THEM = ["linear", "asana", "trello", "notion"] as const

const ROWS: { label: string; us: Cell; them: Cell | Cell[] }[] = [
  {
    label: "Built for",
    us: "A small team",
    them: ["Product teams", "Companies", "Teams", "Docs and wikis"],
  },
  {
    label: "Set up first",
    us: "Nothing",
    them: [
      "Teams, cycles",
      "Workspaces",
      "Boards, Power-Ups",
      "Your own database",
    ],
  },
  {
    label: "Price, a month",
    us: "$9, whole team",
    them: ["$10 each", "$10.99 each", "$5 each", "$10 each"],
  },
  {
    label: "Agents over MCP",
    us: true,
    them: [true, true, false, true],
  },
  {
    label: "Your data",
    us: "Your Postgres",
    them: ["Their cloud", "Their cloud", "Their cloud", "Their cloud"],
  },
  { label: "Open source", us: "AGPL-3.0", them: false },
  { label: "Run it yourself", us: "Node + Postgres", them: false },
]

type Cell = string | boolean

function Value({ v, us }: { v: Cell; us?: boolean }) {
  if (typeof v === "string") return <span className="v">{v}</span>
  return v ? (
    <svg className={us ? "yes us" : "yes"} viewBox="0 0 16 16" aria-label="Yes">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg className="no" viewBox="0 0 16 16" aria-label="No">
      <path
        d="M5 5l6 6M11 5l-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Leanear's column is a raised card over the table; the rest sit flat. Phones
// keep Linear alone, so the table never scrolls sideways.
export function Compare() {
  return (
    <div className="compare-scroll">
      <div className="compare" role="table" aria-label="Leanear compared">
        <span className="lift" aria-hidden />
        <div className="c-row c-head" role="row" style={{ gridRow: 1 }}>
          <span role="columnheader" />
          <span role="columnheader" className="c-us">
            <span className="c-mark">
              <Mark size={36} />
            </span>
            Leanear
          </span>
          {THEM.map((k, i) => (
            <span key={k} role="columnheader" className={i ? "c-more" : ""}>
              <AppTile t={RIVALS[k]} px={36} />
              {RIVALS[k].name}
            </span>
          ))}
        </div>
        {ROWS.map((r, row) => (
          <div
            key={r.label}
            className="c-row"
            role="row"
            style={{ gridRow: row + 2 }}
          >
            <span role="rowheader" className="c-label">
              {r.label}
            </span>
            <span role="cell" className="c-us">
              <Value v={r.us} us />
            </span>
            {THEM.map((k, i) => (
              <span key={k} role="cell" className={i ? "c-more" : ""}>
                <Value v={Array.isArray(r.them) ? r.them[i] : r.them} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
