// The docs, in reading order. The sidebar groups them; the pager walks them.
export const MCP = "https://cloud.shipth.at/mcp"

export type DocPage = { href: string; title: string; group: string }

export const DOCS: DocPage[] = [
  { href: "/docs", title: "Getting started", group: "Guides" },
  { href: "/docs/setup", title: "Bring a codebase", group: "Guides" },
  { href: "/docs/mcp", title: "MCP", group: "Guides" },
  { href: "/docs/loop", title: "The loop", group: "Guides" },
  { href: "/docs/tools", title: "Tools", group: "Reference" },
  { href: "/docs/keys", title: "Keys", group: "Reference" },
  { href: "/docs/self-host", title: "Self-host", group: "Run it yourself" },
]

export const GROUPS = [...new Set(DOCS.map((d) => d.group))]

export function doc(href: string) {
  const i = DOCS.findIndex((d) => d.href === href)
  return { page: DOCS[i], prev: DOCS[i - 1], next: DOCS[i + 1] }
}
