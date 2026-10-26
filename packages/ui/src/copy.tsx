"use client"

import { useEffect, useState } from "react"

// Copies a line and shows a tick for a moment. A square icon button, so its
// width never changes between the two states. `text` can also be made on
// click (a line holding a key minted then); the tick waits until it's copied.
export function Copy({ text }: { text: string | (() => Promise<string>) }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 1600)
    return () => clearTimeout(t)
  }, [done])
  return (
    <button
      className="copy"
      data-done={done}
      aria-label={done ? "Copied" : "Copy"}
      title={done ? "Copied" : "Copy"}
      onClick={async () => {
        if (typeof text !== "string") {
          const made = text()
          try {
            // Written in the same click, so Safari allows it.
            if (
              typeof ClipboardItem !== "undefined" &&
              navigator.clipboard?.write
            )
              await navigator.clipboard.write([
                new ClipboardItem({
                  "text/plain": made.then(
                    (t) => new Blob([t], { type: "text/plain" })
                  ),
                }),
              ])
            else await navigator.clipboard.writeText(await made)
            setDone(true)
          } catch {
            // Making the text failed and said why; nothing was copied.
          }
          return
        }
        setDone(true)
        navigator.clipboard?.writeText(text).catch(() => {
          const ta = document.createElement("textarea")
          ta.value = text
          document.body.appendChild(ta)
          ta.select()
          document.execCommand("copy")
          ta.remove()
        })
      }}
    >
      <svg
        className="i-copy"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden
      >
        <rect
          x="4.5"
          y="4.5"
          width="7.5"
          height="7.5"
          rx="1.8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M9.5 4.5v-.9A1.6 1.6 0 0 0 7.9 2H3.6A1.6 1.6 0 0 0 2 3.6v4.3a1.6 1.6 0 0 0 1.6 1.6h.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
      <svg
        className="i-done"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        aria-hidden
      >
        <path
          d="M3 7.4 5.8 10 11 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
