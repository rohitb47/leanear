import Link from "next/link"
import { Copy } from "@/components/common/copy"
import { doc } from "@/lib/site/docs"

// Eyebrow, title and lead at the top of every docs page.
export function DocHead({
  href,
  lead,
}: {
  href: string
  lead: React.ReactNode
}) {
  const { page } = doc(href)
  return (
    <header className="doc-head">
      <span className="eyebrow">{page.group}</span>
      <h1>{page.title}</h1>
      <p className="lead">{lead}</p>
    </header>
  )
}

export function Code({ code, file }: { code: string; file?: string }) {
  return (
    <div className="codeblock">
      <div className="cb-head">
        <span className="mono">{file ?? "Command"}</span>
        <Copy text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}

// Numbered steps. start carries the count on after a code block between them.
export function Steps({
  children,
  start = 1,
}: {
  children: React.ReactNode
  start?: number
}) {
  return (
    <ol
      className="steps"
      start={start}
      style={start > 1 ? { counterReset: `step ${start - 1}` } : undefined}
    >
      {children}
    </ol>
  )
}

// Previous and next, as two equal cards.
export function Pager({ href }: { href: string }) {
  const { prev, next } = doc(href)
  return (
    <nav className="pager" aria-label="More docs">
      {prev ? (
        <Link href={prev.href}>
          <span className="mono">Previous</span>
          {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next.href} className="next">
          <span className="mono">Next</span>
          {next.title}
        </Link>
      )}
    </nav>
  )
}
