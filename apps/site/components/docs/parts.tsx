import Link from "next/link"
import { doc } from "@/lib/site/docs"

export { Code } from "@/components/docs/code"

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
