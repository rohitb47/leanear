"use client"

import { Copy } from "@leanear/ui/copy"
import { AGENTS, AppTile, type AgentKey } from "@leanear/ui/tiles"

// How each coding agent connects, the same lines as leanear.app/docs/mcp.

export const TOOLS = Object.keys(AGENTS) as AgentKey[]

/** What an agent is called by default, from the tool it runs in. */
export const AGENT_NAME: Record<AgentKey, string> = {
  claude: "Claude",
  cursor: "Cursor",
  codex: "Codex",
  copilot: "Copilot",
  windsurf: "Windsurf",
}

export function connectFor(tool: AgentKey, url: string, key: string) {
  switch (tool) {
    case "claude":
      return {
        code: `claude mcp add --scope user --transport http leanear ${url} --header "Authorization: Bearer ${key}"`,
      }
    case "cursor":
      return {
        file: "~/.cursor/mcp.json",
        code: `{\n  "mcpServers": {\n    "leanear": {\n      "url": "${url}",\n      "headers": { "Authorization": "Bearer ${key}" }\n    }\n  }\n}`,
      }
    case "codex":
      return {
        file: "~/.codex/config.toml, then your shell",
        code: `[mcp_servers.leanear]\nurl = "${url}"\nbearer_token_env_var = "LEANEAR_KEY"\n\nexport LEANEAR_KEY=${key}`,
      }
    case "copilot":
      return {
        file: ".vscode/mcp.json",
        code: `{\n  "servers": {\n    "leanear": {\n      "type": "http",\n      "url": "${url}",\n      "headers": { "Authorization": "Bearer ${key}" }\n    }\n  }\n}`,
      }
    case "windsurf":
      return {
        file: "~/.codeium/windsurf/mcp_config.json",
        code: `{\n  "mcpServers": {\n    "leanear": {\n      "serverUrl": "${url}",\n      "headers": { "Authorization": "Bearer ${key}" }\n    }\n  }\n}`,
      }
  }
}

/**
 * One grey box with Copy. Copy takes all of it, or `copy` when what's shown
 * isn't what's copied (a masked key, made on click).
 */
export function Cmd({
  code,
  file,
  copy,
  shown,
  onReveal,
}: {
  code: string
  file?: string
  copy?: () => Promise<string>
  /** With `onReveal`: an eye beside Copy that shows or masks the secret. */
  shown?: boolean
  onReveal?: () => void
}) {
  return (
    <div className="cmd">
      <pre>
        {file && <span className="file">{file}</span>}
        {code}
      </pre>
      <div className="cmd-tools">
        {onReveal && (
          <button
            type="button"
            className="copy"
            aria-pressed={shown}
            aria-label={shown ? "Hide the key" : "Show the key"}
            title={shown ? "Hide the key" : "Show the key"}
            onClick={onReveal}
          >
            {shown ? EYE_OFF : EYE}
          </button>
        )}
        <Copy text={copy ?? code} />
      </div>
    </div>
  )
}

const EYE = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M1.2 7S3.3 3 7 3s5.8 4 5.8 4-2.1 4-5.8 4-5.8-4-5.8-4Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" />
  </svg>
)
const EYE_OFF = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
    <path
      d="M1.2 7S3.3 3 7 3s5.8 4 5.8 4-2.1 4-5.8 4-5.8-4-5.8-4Z"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    />
    <circle cx="7" cy="7" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M2 12 12 2"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
)

/** The row of agent tiles; the picked one carries a ring. */
export function PickTool({
  tool,
  onPick,
}: {
  tool: AgentKey
  onPick: (t: AgentKey) => void
}) {
  return (
    <div className="agents-pick" role="radiogroup" aria-label="Agent">
      {TOOLS.map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={tool === k}
          aria-label={AGENTS[k].name}
          title={AGENTS[k].name}
          onClick={() => onPick(k)}
        >
          <AppTile t={AGENTS[k]} px={40} />
        </button>
      ))}
    </div>
  )
}

/** The line that connects an agent, for the tool it runs in. */
export function Connect({
  tool,
  url,
  apiKey,
}: {
  tool: AgentKey
  url: string
  apiKey: string
}) {
  return <Cmd {...connectFor(tool, url, apiKey)} />
}

// Bringing a codebase: the agent reads the repo and fills the project. The
// same words as leanear.app/docs/setup and skills/leanear-setup.

export const SKILL_INSTALL = `mkdir -p .claude/skills/leanear-setup
curl -fsSL https://raw.githubusercontent.com/rohitb47/leanear/main/skills/leanear-setup/SKILL.md \\
  -o .claude/skills/leanear-setup/SKILL.md`

/**
 * Claude Code, all in one paste: connect this agent for every repo (replacing
 * an old connection), then install the setup skill into this repo.
 */
export const claudeSetup = (url: string, key: string) =>
  `claude mcp remove leanear --scope user 2>/dev/null; claude mcp add --scope user --transport http leanear ${url} --header "Authorization: Bearer ${key}" && ${SKILL_INSTALL.replace(/ \\\n\s*/g, " ").replace("\n", " && ")}`

export const setupPrompt = (key: string) =>
  `Set up Leanear for this codebase, in my Leanear project ${key}.
1. Read the repo: README, build files, folder layout, its own CLAUDE.md and AGENTS.md, and docs.
2. Turn TODO, FIXME and HACK comments, open GitHub issues and any roadmap into tasks with create_task: a short title, a type, and where it came from. Check list_tasks first so nothing is duplicated. About 30 at most.
3. Move the five that matter most to Todo and say why in a comment.
Don't change any code, commit or push. Tell me what you made.`
