import type { Metadata } from "next"
import { Code, DocHead, Pager, Steps } from "@/components/docs/parts"

export const metadata: Metadata = { title: "Bring a codebase" }

const INSTALL = `mkdir -p .claude/skills/leanear-setup
curl -fsSL https://raw.githubusercontent.com/rohitb47/leanear/main/skills/leanear-setup/SKILL.md \\
  -o .claude/skills/leanear-setup/SKILL.md`

const PROMPT = `Set up Leanear for this codebase, in my Leanear project.
1. Read the repo: README, build files, folder layout, its own CLAUDE.md and AGENTS.md, and docs.
2. Turn TODO, FIXME and HACK comments, open GitHub issues and any roadmap into tasks with create_task: a short title, a type, and where it came from. Check list_tasks first so nothing is duplicated. About 30 at most.
3. Move the five that matter most to Todo and say why in a comment.
Don't change any code, commit or push. Tell me what you made.`

export default function Setup() {
  return (
    <>
      <DocHead
        href="/docs/setup"
        lead="Already have a codebase? Let your agent read it and fill your board: its first tasks, from what's really in the code."
      />

      <h2>Before you start</h2>
      <Steps>
        <li>
          Make a project in the app, and connect your agent over{" "}
          <a className="link" href="/docs/mcp">
            MCP
          </a>
          .
        </li>
        <li>Open your agent in the root of the repo.</li>
      </Steps>

      <h2>With Claude Code</h2>
      <p>
        Install the setup skill into the repo. It&apos;s one Markdown file you
        can read first.
      </p>
      <Code code={INSTALL} file="Terminal" />
      <p>
        Then type <code className="inline">/leanear-setup</code>, or just ask
        Claude Code to set up Leanear for this codebase.
      </p>

      <h2>With any other agent</h2>
      <p>
        Paste this into Cursor, Codex, Copilot or Windsurf. It does the same.
      </p>
      <Code code={PROMPT} file="Prompt" />

      <h2>What it does</h2>
      <Steps>
        <li>
          Reads the repo, its docs and its own{" "}
          <code className="inline">CLAUDE.md</code>, and follows it.
        </li>
        <li>
          Turns TODOs, FIXMEs, open GitHub issues and your roadmap into tasks,
          each noting where it came from.
        </li>
        <li>Puts the five that matter most in Todo, with a comment on why.</li>
      </Steps>
      <p className="note">
        It never changes code, commits or pushes, and it never writes secrets
        into a task.
      </p>
      <Pager href="/docs/setup" />
    </>
  )
}
