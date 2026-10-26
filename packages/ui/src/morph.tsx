"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

// The signature morph: the old value blurs and swells away while the new one
// sharpens in from smaller, in place. Kept for one thing taking a new value.
export function Morph({
  value,
  big = false,
  render = (v) => v,
}: {
  value: string
  big?: boolean
  render?: (v: string) => ReactNode
}) {
  const [items, setItems] = useState([{ key: 0, text: value, out: false }])
  const n = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    n.current += 1
    const key = n.current
    setItems((list) => [
      ...list.filter((i) => !i.out).map((i) => ({ ...i, out: true })),
      { key, text: value, out: false },
    ])
    const t = setTimeout(
      () => setItems((list) => list.filter((i) => !i.out)),
      big ? 440 : 360
    )
    return () => clearTimeout(t)
  }, [value, big])

  return (
    <span className={big ? "morph big" : "morph"}>
      {items.map((i) => (
        <span
          key={i.key}
          className={i.key === 0 && !i.out ? "" : i.out ? "out" : "in"}
          aria-hidden={i.out}
        >
          {render(i.text)}
        </span>
      ))}
    </span>
  )
}
