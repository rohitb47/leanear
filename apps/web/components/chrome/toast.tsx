"use client"

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useState } from "react"
import { onToast, type ToastAction } from "@/lib/store/store"

/** One short line at the bottom, for a moment. An Undo keeps it up longer. */
export function Toasts() {
  const [msg, setMsg] = useState<{
    text: string
    action?: ToastAction
    n: number
  } | null>(null)
  useEffect(() => {
    let t = 0
    let n = 0
    const off = onToast((text, action) => {
      setMsg({ text, action, n: ++n })
      clearTimeout(t)
      t = window.setTimeout(() => setMsg(null), action ? 6000 : 2400)
    })
    return () => {
      off()
      clearTimeout(t)
    }
  }, [])
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        >
          <span>{msg.text}</span>
          {msg.action && (
            <button
              onClick={() => {
                msg.action!.run()
                setMsg(null)
              }}
            >
              {msg.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
