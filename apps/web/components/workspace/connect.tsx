"use client"

import { useState } from "react"
import { toast } from "@/lib/store/store"
import { copy } from "@/lib/ui/format"

const CLIENTS = ["Claude Code", "Codex", "Cursor"] as const

export function commandFor(
  client: (typeof CLIENTS)[number],
  url: string,
  key: string
) {
  if (client === "Claude Code")
    return `claude mcp add --transport http leanear ${url} --header "Authorization: Bearer ${key}"`
  if (client === "Codex")
    return `# ~/.codex/config.toml\n[mcp_servers.leanear]\nurl = "${url}"\nbearer_token_env_var = "LEANEAR_KEY"\n\n# then, in your shell\nexport LEANEAR_KEY=${key}`
  return `// ~/.cursor/mcp.json\n{\n  "mcpServers": {\n    "leanear": {\n      "url": "${url}",\n      "headers": { "Authorization": "Bearer ${key}" }\n    }\n  }\n}`
}

/** The one line (or block) that connects an agent, for the client you use. */
export function Connect({ url, apiKey }: { url: string; apiKey: string }) {
  const [c, setC] = useState<(typeof CLIENTS)[number]>("Claude Code")
  const cmd = commandFor(c, url, apiKey)
  return (
    <>
      <div
        className="seg"
        role="group"
        aria-label="Agent"
        style={{ alignSelf: "center" }}
      >
        {CLIENTS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={c === v}
            onClick={() => setC(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="code">
        <span>{cmd}</span>
        <button
          type="button"
          className="btn"
          onClick={async () =>
            toast((await copy(cmd)) ? "Copied" : "Select the text to copy it")
          }
        >
          Copy
        </button>
      </div>
    </>
  )
}
