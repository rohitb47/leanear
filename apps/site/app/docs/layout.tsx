import type { Metadata } from "next"
import { SiteFoot, SiteNav } from "@/components/chrome/site"
import { Sidebar } from "@/components/docs/sidebar"
import { stars } from "@/lib/site/links"

export const metadata: Metadata = {
  title: { template: "%s: Leanear docs", default: "Docs: Leanear" },
  description:
    "Connect Claude Code, Cursor, Codex and more to Leanear over MCP. Every tool, every setting.",
}

export default async function DocsLayout({ children }: LayoutProps<"/docs">) {
  const count = await stars()
  return (
    <>
      <SiteNav count={count} />
      <div className="wrap docs">
        <Sidebar />
        <main className="doc">{children}</main>
      </div>
      <SiteFoot />
    </>
  )
}
