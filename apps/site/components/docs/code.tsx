"use client"

import { useState } from "react"
import { Copy } from "@shipthat/ui/copy"

// A code block with a header: its file name, a wrap toggle and Copy. Long
// lines scroll sideways until wrap is on.
export function Code({ code, file }: { code: string; file?: string }) {
  const [wrap, setWrap] = useState(false)
  return (
    <div className="codeblock" data-wrap={wrap}>
      <div className="cb-head">
        <span className="mono">{file ?? "Command"}</span>
        <div className="cb-tools">
          <button
            className="copy"
            aria-pressed={wrap}
            aria-label="Wrap lines"
            title={wrap ? "Don't wrap lines" : "Wrap lines"}
            onClick={() => setWrap((w) => !w)}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M2 3.5h10M2 7h8a2 2 0 0 1 0 4H7m1.5-1.5L7 11l1.5 1.5M2 11h2.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <Copy text={code} />
        </div>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  )
}
