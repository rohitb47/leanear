import type { ReactNode } from "react"

/**
 * A full-screen form: the content scrolls, and its buttons stay pinned at
 * the bottom, always in view.
 */
export function Flow({
  children,
  foot,
}: {
  children: ReactNode
  foot: ReactNode
}) {
  return (
    <div className="flow">
      <div className="flow-body">
        <div className="stack">{children}</div>
      </div>
      <div className="flow-foot">{foot}</div>
    </div>
  )
}
