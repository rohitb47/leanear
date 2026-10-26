"use client"

import type { ReactNode } from "react"

// Markdown, coloured like an editor: headings, list marks, code and bold. A
// clear textarea shares one grid cell with the coloured layer, so it stretches
// to the layer's height and the two never drift, whatever the font or width.

function inline(text: string, key: string) {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("`") && part.endsWith("`") && part.length > 1 ? (
      <span key={`${key}-${i}`} className="md-code">
        {part}
      </span>
    ) : part.startsWith("**") && part.endsWith("**") && part.length > 3 ? (
      <span key={`${key}-${i}`} className="md-bold">
        {part}
      </span>
    ) : (
      part
    )
  )
}

function highlight(src: string): ReactNode[] {
  return src.split("\n").map((line, i) => {
    const k = String(i)
    const h = line.match(/^(#{1,6} )(.*)$/)
    const li = line.match(/^(\s*(?:[-*]|\d+[.)]) )(.*)$/)
    const body = h ? (
      <span className="md-h">
        <span className="md-mark">{h[1]}</span>
        {h[2]}
      </span>
    ) : li ? (
      <>
        <span className="md-li">{li[1]}</span>
        {inline(li[2], k)}
      </>
    ) : (
      inline(line, k)
    )
    return (
      <span key={k}>
        {body}
        {"\n"}
      </span>
    )
  })
}

export function MdEditor({
  value,
  onChange,
  box,
  label,
  placeholder,
  autoFocus,
  onKeyDown,
  onPaste,
  onBlur,
}: {
  value: string
  onChange: (v: string) => void
  box?: boolean
  label: string
  placeholder?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onBlur?: () => void
}) {
  return (
    <div className={`mdedit${box ? " box" : ""}`}>
      <pre aria-hidden>
        {value ? highlight(value) : <span className="ph">{placeholder}</span>}
        {"\n"}
      </pre>
      <textarea
        aria-label={label}
        spellCheck={false}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={onBlur}
      />
    </div>
  )
}
