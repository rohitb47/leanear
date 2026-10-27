import type { Metadata } from "next"
import { AGENTS, AppTile, type AgentKey } from "@shipthat/ui/tiles"
import { Code, DocHead, Pager } from "@/components/docs/parts"
import { MCP } from "@/lib/site/docs"

export const metadata: Metadata = { title: "MCP" }

const CLIENTS: { k: AgentKey; how: string; file?: string; code: string }[] = [
  {
    k: "claude",
    how: "Run this with your agent's key. Settings in the app shows it with the key filled in.",
    code: `claude mcp add --scope user --transport http shipthat ${MCP} --header "Authorization: Bearer lk_your_key"`,
  },
  {
    k: "cursor",
    how: "Add shipth.at to your MCP settings, with your agent's key.",
    file: "~/.cursor/mcp.json",
    code: `{
  "mcpServers": {
    "shipthat": {
      "url": "${MCP}",
      "headers": { "Authorization": "Bearer lk_your_key" }
    }
  }
}`,
  },
  {
    k: "codex",
    how: "Add the server, then put your agent's key in SHIPTHAT_KEY.",
    file: "~/.codex/config.toml",
    code: `[mcp_servers.shipthat]
url = "${MCP}"
bearer_token_env_var = "SHIPTHAT_KEY"`,
  },
  {
    k: "copilot",
    how: "Add shipth.at to VS Code's MCP config, with your agent's key. Copilot picks it up in agent mode.",
    file: ".vscode/mcp.json",
    code: `{
  "servers": {
    "shipthat": {
      "type": "http",
      "url": "${MCP}",
      "headers": { "Authorization": "Bearer lk_your_key" }
    }
  }
}`,
  },
  {
    k: "windsurf",
    how: "Add shipth.at to Windsurf's MCP config, with your agent's key.",
    file: "~/.codeium/windsurf/mcp_config.json",
    code: `{
  "mcpServers": {
    "shipthat": {
      "serverUrl": "${MCP}",
      "headers": { "Authorization": "Bearer lk_your_key" }
    }
  }
}`,
  },
]

export default function Mcp() {
  return (
    <>
      <DocHead
        href="/docs/mcp"
        lead={
          <>
            shipth.at speaks MCP at <code>{MCP}</code>. Every agent connects
            with its own key, so the activity on a task always says who did
            what.
          </>
        }
      />
      <Code code={MCP} file="Server URL" />
      {CLIENTS.map((c) => (
        <section key={c.k}>
          <h2 className="client-head">
            <AppTile t={AGENTS[c.k]} px={28} />
            {AGENTS[c.k].name}
          </h2>
          <p>{c.how}</p>
          <Code code={c.code} file={c.file} />
        </section>
      ))}
      <p className="note">
        Any other coding agent that speaks MCP and can send a header connects
        the same way.
      </p>
      <Pager href="/docs/mcp" />
    </>
  )
}
