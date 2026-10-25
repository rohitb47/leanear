"use client"

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react"
import { usePresence } from "@/lib/ui/motion"

/** A small menu under its anchor. Springs open, closes on outside press or Escape. */
export function Menu({
  anchor,
  open,
  onClose,
  children,
  width = 200,
}: {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
}) {
  const { mounted, ref, closing } = usePresence<HTMLDivElement>(
    open,
    { s: 0.96, o: 0, y: -4 },
    { s: 0.97, o: 0, y: -4 },
    0.22,
    0.18
  )
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) return
    const r = anchor.getBoundingClientRect()
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    const below = r.bottom + 6
    const top =
      below + 320 > window.innerHeight && r.top > 340
        ? r.top - 6 - Math.min(320, ref.current?.offsetHeight ?? 200)
        : below
    setPos({ left, top })
  }, [open, anchor, width, ref])

  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener("pointerdown", down, true)
    window.addEventListener("keydown", key, true)
    return () => {
      document.removeEventListener("pointerdown", down, true)
      window.removeEventListener("keydown", key, true)
    }
  }, [open, anchor, onClose, ref])

  if (!mounted) return null
  return (
    <div
      ref={ref}
      className="menu"
      role="menu"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        minWidth: width,
        pointerEvents: closing ? "none" : undefined,
      }}
    >
      {children}
    </div>
  )
}
