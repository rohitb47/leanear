"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, type ReactNode } from "react"

/**
 * A dialog: a card over a soft dim, opening from the middle.
 * Pressing outside or Escape closes it.
 */
export function Dialog({
  open,
  onClose,
  label,
  className = "",
  children,
  as = "div",
  onSubmit,
  instant,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
  as?: "div" | "form"
  onSubmit?: (e: React.FormEvent) => void
  /** Opened by keyboard all day (⌘K): no motion at all. */
  instant?: boolean
}) {
  const Card = as === "form" ? motion.form : motion.div
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector(".menu")) return
      // In a field, Escape belongs to the field (cancel an edit, step out).
      const el = document.activeElement as HTMLElement | null
      if (
        el?.closest(".dialog") &&
        el.closest("input,textarea,[contenteditable='true']")
      )
        return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener("keydown", key, true)
    return () => window.removeEventListener("keydown", key, true)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={instant ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={
            instant
              ? { opacity: 0, transition: { duration: 0 } }
              : { opacity: 0 }
          }
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onPointerDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <Card
            className={`dialog ${className}`}
            role="dialog"
            aria-label={label}
            onSubmit={onSubmit}
            initial={instant ? false : { opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              instant
                ? { opacity: 0, transition: { duration: 0 } }
                : { opacity: 0, scale: 0.98, transition: { duration: 0.16 } }
            }
            transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
          >
            {children}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
