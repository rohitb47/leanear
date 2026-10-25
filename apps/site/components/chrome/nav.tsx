"use client"

import { useEffect, useRef } from "react"

// Sticky top bar that gains a hairline once the page scrolls under it.
export function NavShell({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const on = () =>
      ref.current?.setAttribute("data-stuck", String(window.scrollY > 8))
    on()
    window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  return (
    <header ref={ref} className="nav">
      {children}
    </header>
  )
}
