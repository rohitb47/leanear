"use client"

import { motion } from "motion/react"
import { useId } from "react"

/**
 * A segmented switch: a few capsules in one grey track, the picked one with
 * a pill that slides between them, like the tabs in the bar.
 */
export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  const id = useId()
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="pill-bg" />
          )}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}
