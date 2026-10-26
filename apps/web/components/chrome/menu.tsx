"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"
import { createPortal } from "react-dom"

/**
 * A small menu by its anchor: a card with a hairline and a soft shadow, no
 * dimming behind. Closes on an outside press or Escape.
 */
export function Menu({
  anchor,
  open,
  onClose,
  children,
  width = 200,
  align = "start",
}: {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  children: ReactNode
  width?: number
  align?: "start" | "end"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const client = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  // Placed from the anchor as it opens; an exiting menu keeps where it was.
  const pos = open && anchor ? place(anchor, width, align) : null

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
  }, [open, anchor, onClose])

  // On the page itself, so no dialog or filter around the anchor can clip it.
  if (!client) return null
  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={ref}
          className="menu"
          role="menu"
          style={{
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            width,
            transformOrigin: `${align === "end" ? "100%" : "0"} ${pos.up ? "100%" : "0"}`,
          }}
          initial={{ opacity: 0, scale: 0.96, y: pos.up ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
          transition={{ type: "spring", bounce: 0, duration: 0.22 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function place(anchor: HTMLElement, width: number, align: "start" | "end") {
  const r = anchor.getBoundingClientRect()
  const x = align === "end" ? r.right - width : r.left
  const left = Math.max(8, Math.min(x, window.innerWidth - width - 8))
  const up = r.bottom + 6 + 300 > window.innerHeight && r.top > 320
  return up
    ? { left, top: undefined, bottom: window.innerHeight - r.top + 6, up }
    : { left, top: r.bottom + 6, bottom: undefined, up }
}
