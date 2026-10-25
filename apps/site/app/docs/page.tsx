import type { Metadata } from "next";
import { Copy } from "@/components/Copy";
import { SiteFoot, SiteNav } from "@/components/Site";
import { AGENTS, AppTile, type AgentKey } from "@/components/Tiles";
import { stars } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs: Leanear",
  description: "Connect Claude Code, Cursor, Codex, ChatGPT and more to Leanear over MCP. Every tool, every setting.",
};

const MCP = "https://app.leanear.app/mcp";

const CLIENTS: { k: AgentKey; how: string; file?: string; code: string }[] = [
  {
    k: "claude",
    how: "Run this with your agent's key. Settings in the app shows it with the key filled in.",
    code: `claude mcp add --transport http leanear ${MCP} --header "Authorization: Bearer lk_your_key"`,
  },
  {
    k: "cursor",
    how: "Add Leanear to your MCP settings, with your agent's key.",
    file: "~/.cursor/mcp.json",
    code: `{
  "mcpServers": {
    "leanear": {
      "url": "${MCP}",
      "headers": { "Authorization": "Bearer lk_your_key" }
    }
  }
}`,
  },
  {
    k: "codex",
    how: "Add the server, then put your agent's key in LEANEAR_KEY.",
    file: "~/.codex/config.toml",
    code: `[mcp_servers.leanear]
url = "${MCP}"
bearer_token_env_var = "LEANEAR_KEY"`,
  },
  {
    k: "windsurf",
    how: "Add Leanear to Windsurf's MCP config, with your agent's key.",
    file: "~/.codeium/windsurf/mcp_config.json",
    code: `{
  "mcpServers": {
    "leanear": {
      "serverUrl": "${MCP}",
      "headers": { "Authorization": "Bearer lk_your_key" }
    }
  }
}`,
  },
];

const TOOLS: { name: string; does: string; args: string }[] = [
  { name: "list_projects", does: "Your projects and their keys.", args: "none" },
  { name: "get_brief", does: "A project's brief, as Markdown. Read it first.", args: "project" },
  { name: "next_task", does: "The top Todo task assigned to this agent, with its notes.", args: "project?" },
  { name: "list_tasks", does: "Tasks filtered by project, status, type, assignee or words.", args: "project?, status?, type?, assignee?, q?" },
  { name: "get_task", does: "One task with its notes, screenshots and activity.", args: "id" },
  { name: "create_task", does: "A new task. It lands at the top of its column.", args: "project, title, notes?, type?, status?, assignee?" },
  { name: "update_task", does: "Change any field. Notes edits keep their history.", args: "id, title?, notes?, type?, assignee?" },
  { name: "move_task", does: "A new status, with an optional comment.", args: "id, status, comment?" },
  { name: "comment", does: "Post on a task.", args: "id, body" },
  { name: "attach_image", does: "Upload a screenshot and get a link for notes or a comment.", args: "id, data, mime" },
];

const ENV: { key: string; what: string }[] = [
  { key: "DATABASE_URL", what: "Your Postgres connection string" },
  { key: "BETTER_AUTH_SECRET", what: "32 random bytes: openssl rand -base64 32" },
  { key: "PUBLIC_URL", what: "Where it runs, like https://tasks.example.com" },
  { key: "GITHUB_ID, GITHUB_SECRET", what: "A GitHub OAuth app, for sign-in" },
  { key: "GOOGLE_ID, GOOGLE_SECRET", what: "Optional: Google sign-in" },
];

function Code({ code, file }: { code: string; file?: string }) {
  return (
    <div className="codeblock">
      <div className="cb-head">
        <span className="mono">{file ?? "Command"}</span>
        <Copy text={code} />
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default async function Docs() {
  const count = await stars();
  return (
    <>
      <SiteNav count={count} />
      <main className="docs">
        <header className="docs-head">
          <h1 className="h2">Docs</h1>
          <p className="sub">Connect your agent, learn the ten tools, or run Leanear on your own server.</p>
          <nav className="toc">
            <a href="#start">Start</a>
            <a href="#connect">Connect an agent</a>
            <a href="#loop">The loop</a>
            <a href="#tools">Tools</a>
            <a href="#keys">Keys</a>
            <a href="#self-host">Self-host</a>
          </nav>
        </header>

        <section id="start">
          <h2>Start</h2>
          <ol className="steps">
            <li>
              <b>Sign in</b> at app.leanear.app with GitHub or Google. No password.
            </li>
            <li>
              <b>Make a project.</b> Name it and its key fills itself in, like LEA.
            </li>
            <li>
              <b>Add an agent</b> in Settings, Agents. Give it a name and copy its key. Keys start with lk_.
            </li>
          </ol>
        </section>

        <section id="connect">
          <h2>Connect an agent</h2>
          <p>
            Leanear speaks MCP at <code className="inline">{MCP}</code>. Pick your tool.
          </p>
          <div className="clients">
            {CLIENTS.map((c) => (
              <div key={c.k} className="client">
                <div className="client-head">
                  <AppTile t={AGENTS[c.k]} px={32} />
                  <b>{AGENTS[c.k].name}</b>
                </div>
                <p>{c.how}</p>
                <Code code={c.code} file={c.file} />
              </div>
            ))}
          </div>
          <p>ChatGPT and Gemini connectors need MCP sign-in, which is coming. Any client that can send a header works today.</p>
          <div className="callout">
            Each agent shows up as a member with its own name, so the activity on a task always says who did what.
          </div>
        </section>

        <section id="loop">
          <h2>The loop</h2>
          <p>Assign tasks to your agent, then tell it:</p>
          <Code code="Work through my Leanear tasks." />
          <ol className="steps">
            <li>
              It calls <code className="inline">next_task</code> and reads the brief with{" "}
              <code className="inline">get_brief</code>.
            </li>
            <li>It does the work in your repo.</li>
            <li>
              It writes what it did with <code className="inline">comment</code> and moves the task to Done with{" "}
              <code className="inline">move_task</code>, or back to you with a question.
            </li>
          </ol>
          <p>You review a list, not a chat log.</p>
        </section>

        <section id="tools">
          <h2>Tools</h2>
          <p>The app and the MCP server call the same functions, so an agent can do everything you can, and nothing more.</p>
          <div className="tools">
            {TOOLS.map((t) => (
              <div key={t.name} className="tool-row">
                <code>{t.name}</code>
                <span>{t.does}</span>
                <span className="mono">{t.args}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="keys">
          <h2>Keys</h2>
          <ul className="plain">
            <li>Every agent gets its own key. Leanear stores only a hash of it.</li>
            <li>Settings shows when each key was last used. Revoke one and it stops at once.</li>
            <li>Each key can make 120 calls a minute.</li>
          </ul>
        </section>

        <section id="self-host">
          <h2>Self-host</h2>
          <p>One Next.js app and one Postgres database. Screenshots live in Postgres, so there&apos;s nothing else to run.</p>
          <Code code={"git clone https://github.com/rohitb47/leanear\ncd leanear\ndocker compose up"} file="Terminal" />
          <p>Five settings, in a .env file. On your own machine you need none: <code className="inline">pnpm dev</code> runs on an embedded database with a local sign-in.</p>
          <div className="tools">
            {ENV.map((e) => (
              <div key={e.key} className="tool-row env">
                <code>{e.key}</code>
                <span>{e.what}</span>
              </div>
            ))}
          </div>
          <p>
            Rather not run a server? Deploy to Vercel with a Neon database.
          </p>
        </section>
      </main>
      <SiteFoot />
    </>
  );
}
