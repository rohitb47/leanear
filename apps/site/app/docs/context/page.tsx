import type { Metadata } from "next"
import { Code, DocHead, Pager, Steps } from "@/components/docs/parts"

export const metadata: Metadata = { title: "Context" }

export default function ContextDocs() {
  return (
    <>
      <DocHead
        href="/docs/context"
        lead="Keep your agents' .md files in Leanear: CLAUDE.md, AGENTS.md, DESIGN.md, whatever they read. Edit them in one place, and every agent gets the latest."
      />

      <h2>Add a file</h2>
      <Steps>
        <li>
          Open a project and go to <b>Context</b>.
        </li>
        <li>
          Click <b>New file</b> and name it like any Markdown file, such as{" "}
          <code className="inline">CLAUDE.md</code>.
        </li>
        <li>Write it in Markdown. It saves as you type.</li>
      </Steps>

      <h2>How agents read it</h2>
      <p>
        Agents list a project&apos;s files with{" "}
        <code className="inline">list_files</code> and read one with{" "}
        <code className="inline">get_file</code>. When you set up a codebase,
        they write them too with <code className="inline">put_file</code>. Tell
        yours to start there:
      </p>
      <Code
        code="Read the Leanear context, then work through my tasks."
        file="Prompt"
      />

      <h2>Pull into a repo</h2>
      <p>
        Want the files on disk too? Pull a project&apos;s context into the
        folder you&apos;re in. Leanear stays the source, so a pull replaces the
        local copies.
      </p>
      <Code
        code={"export LEANEAR_KEY=lk_your_key\nnpx leanear pull LEA"}
        file="Terminal"
      />
      <Pager href="/docs/context" />
    </>
  )
}
