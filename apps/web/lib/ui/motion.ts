"use client"

import { current, set, shift, spring } from "@leanear/ui/spring"
import { useLayoutEffect, useRef, useState, type RefObject } from "react"

type V = { x?: number; y?: number; s?: number; o?: number; b?: number }

/**
 * Mount a layer, spring it in from `from`, and spring it out to `exit` before
 * unmounting. Opening again mid-exit turns it around from where it is.
 */
export function usePresence<T extends HTMLElement>(
  open: boolean,
  from: V,
  exit: V = from,
  r = 0.32,
  rExit = 0.24
) {
  const [mounted, setMounted] = useState(open)
  const ref = useRef<T>(null)
  const shown = useRef(false)
  if (open && !mounted) setMounted(true)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (open) {
      if (!shown.current) set(el, from)
      shown.current = true
      spring(el, {}, { r })
    } else if (shown.current) {
      spring(el, exit, {
        r: rExit,
        keep: true,
        onRest: () => {
          shown.current = false
          setMounted(false)
        },
      })
    }
    // from/exit are literals at call sites; only open matters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted])
  return { mounted, ref, closing: mounted && !open }
}

/**
 * FLIP for every [data-flip] inside root: when a card's layout moves between
 * renders it springs from where it was. Positions are relative to root, so
 * scrolling doesn't count as movement. New ids in `enter` rise in.
 */
export function useFlip(
  root: RefObject<HTMLElement | null>,
  enter?: (id: string) => boolean
) {
  const last = useRef(new Map<string, { x: number; y: number }>())
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const base = el.getBoundingClientRect()
    const next = new Map<string, { x: number; y: number }>()
    el.querySelectorAll<HTMLElement>("[data-flip]").forEach((n) => {
      const id = n.dataset.flip!
      const r = n.getBoundingClientRect()
      const c = current(n)
      const lx = r.left - base.left - c.x
      const ly = r.top - base.top - c.y
      next.set(id, { x: lx, y: ly })
      const p = last.current.get(id)
      if (p) {
        const dx = p.x - lx
        const dy = p.y - ly
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          shift(n, { x: dx, y: dy })
          spring(n, {}, { z: 1, r: 0.42 })
        }
      } else if (last.current.size && enter?.(id)) {
        set(n, { s: 0.94, o: 0, y: -8 })
        spring(n, {}, { r: 0.42 })
      }
    })
    last.current = next
  })
}

/** Velocity from the last 100ms of pointer samples, in px/s. */
export function velocity(hist: [number, number, number][]) {
  const now = performance.now()
  const h = hist.filter((p) => now - p[2] < 100)
  if (h.length < 2) return { vx: 0, vy: 0 }
  const a = h[0]
  const b = h[h.length - 1]
  const d = (b[2] - a[2]) / 1000 || 0.016
  return { vx: (b[0] - a[0]) / d, vy: (b[1] - a[1]) / d }
}
