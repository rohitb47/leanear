"use client"

import { useRef, useState } from "react"
import { motion } from "motion/react"
import { Logo } from "@/components/common/logos"

// The Context tab: a project's .md files, kept in Leanear instead of each repo.
// Pick one to read it; type to edit it, like the real thing.
type File = {
  name: string
  who: "rohit" | "claude"
  when: string
  body: string
}

const START: File[] = [
  {
    name: "CLAUDE.md",
    who: "claude",
    when: "5h",
    body: `# Leanear

## Rules
- Work only on \`main\`. Never push another branch.
- Every task operation lives once in \`lib/core.ts\`.
- Run \`pnpm check\` before you call anything **done**.
`,
  },
  {
    name: "AGENTS.md",
    who: "rohit",
    when: "2d",
    body: `# Agents

## The loop
- Take your next task with \`next_task\`.
- Say what you did in a comment, then move it to **Done**.
- Not sure? Ask in a comment and move it back to me.
`,
  },
  {
    name: "DESIGN.md",
    who: "rohit",
    when: "1d",
    body: `# Design

## Look
- Dark, on pure black. One **orange** accent per view.
- Bricolage for headings, Geist for everything else.
- Nothing heavier than semibold. Space over lines.
`,
  },
  {
    name: "SPEC.md",
    who: "claude",
    when: "3d",
    body: `# Spec

## Five things
- Projects, tasks, statuses, activity, agents.
- Nothing else. **Leanear is built in Leanear.**
`,
  },
]

// State lives with the window so its action bar can add a file.
export function useContextFiles() {
  const [files, setFiles] = useState(START)
  const [sel, setSel] = useState(0)
  const add = () => {
    const n = files.filter((f) => f.name.startsWith("untitled")).length
    const name = n ? `untitled-${n + 1}.md` : "untitled.md"
    setFiles([
      ...files,
      { name, who: "rohit", when: "now", body: "# Untitled\n\n" },
    ])
    setSel(files.length)
  }
  const edit = (body: string) =>
    setFiles(files.map((f, i) => (i === sel ? { ...f, body, when: "now" } : f)))
  return { files, sel, setSel, add, edit }
}

// Markdown, coloured like an editor: headings, list marks, code and bold.
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

function highlight(src: string) {
  return src.split("\n").map((line, i) => {
    const k = String(i)
    const h = line.match(/^(#{1,6} )(.*)$/)
    const li = line.match(/^(\s*[-*] )(.*)$/)
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

function Who({ who }: { who: File["who"] }) {
  return who === "rohit" ? (
    <span className="av" title="Rohit">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/rohit.png" alt="" width={16} height={16} />
    </span>
  ) : (
    <span className="av agent" title="Claude">
      <Logo k="claude" size={9} brand />
    </span>
  )
}

export function Context({
  state,
}: {
  state: ReturnType<typeof useContextFiles>
}) {
  const { files, sel, setSel, edit } = state
  const f = files[sel]
  const layer = useRef<HTMLPreElement>(null)
  return (
    <div className="ctx">
      <div className="ctx-list" role="tablist" aria-label="Context files">
        {files.map((x, i) => (
          <button
            key={x.name}
            role="tab"
            aria-selected={i === sel}
            className={i === sel ? "on" : ""}
            onClick={() => setSel(i)}
          >
            {i === sel && (
              <motion.span layoutId="file-pill" className="pill-bg" />
            )}
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path
                d="M3.5 1.75h4.6l2.4 2.4v8.1H3.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M5.4 7h3.2M5.4 9.2h3.2"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            <span className="fn">{x.name}</span>
            <span className="when">{x.when}</span>
          </button>
        ))}
      </div>
      <div className="ctx-doc">
        <div className="ctx-head">
          <span className="fn">{f.name}</span>
          <span className="by">
            <Who who={f.who} />
            {f.when === "now" ? "Edited just now" : `Edited ${f.when} ago`}
          </span>
        </div>
        <div className="ctx-edit">
          <pre ref={layer} aria-hidden>
            {highlight(f.body)}
          </pre>
          <textarea
            aria-label={f.name}
            spellCheck={false}
            value={f.body}
            onChange={(e) => edit(e.target.value)}
            onScroll={(e) => {
              if (layer.current)
                layer.current.scrollTop = e.currentTarget.scrollTop
            }}
          />
        </div>
      </div>
    </div>
  )
}
