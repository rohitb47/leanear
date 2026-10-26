"use client"

import { useState, type ButtonHTMLAttributes } from "react"
import { Loader } from "@/components/common/loader"

/**
 * The one button. While it's loading, the label stays in place but hidden,
 * so the button never changes width, and the loader sits over it. It loads
 * when told (`loading`), or by itself while an async `onClick` is running.
 */
export function Button({
  loading,
  onClick,
  disabled,
  children,
  type = "button",
  ...rest
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {
  loading?: boolean
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown
}) {
  const [running, setRunning] = useState(false)
  const busy = !!loading || running
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onClick={async (e) => {
        const r = onClick?.(e)
        if (!(r instanceof Promise)) return
        setRunning(true)
        try {
          await r
        } finally {
          setRunning(false)
        }
      }}
    >
      <span className={busy ? "btn-label hide" : "btn-label"}>{children}</span>
      {busy && (
        <span className="btn-spin">
          <Loader />
        </span>
      )}
    </button>
  )
}
