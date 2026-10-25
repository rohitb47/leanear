"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { DOCS, GROUPS } from "@/lib/site/docs"

function Groups() {
  const path = usePathname()
  return GROUPS.map((g) => (
    <div key={g} className="side-group">
      <span className="side-label">{g}</span>
      {DOCS.filter((d) => d.group === g).map((d) => (
        <Link
          key={d.href}
          href={d.href}
          aria-current={path === d.href ? "page" : undefined}
        >
          {d.title}
        </Link>
      ))}
    </div>
  ))
}

// A sticky list on desktop; on phones, a card that opens in place.
export function Sidebar() {
  const path = usePathname()
  const menu = useRef<HTMLDetailsElement>(null)
  const current = DOCS.find((d) => d.href === path)
  useEffect(() => {
    menu.current?.removeAttribute("open")
  }, [path])
  return (
    <>
      <nav className="side" aria-label="Docs">
        <Groups />
      </nav>
      <details ref={menu} className="side-menu">
        <summary>
          {current?.title ?? "Docs"}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <path
              d="M3 4.5 6 7.5 9 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <nav aria-label="Docs">
          <Groups />
        </nav>
      </details>
    </>
  )
}
