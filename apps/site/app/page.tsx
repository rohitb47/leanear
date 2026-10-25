import Link from "next/link";
import { AgentLoop } from "@/components/AgentLoop";
import { Board } from "@/components/Board";
import { Copy } from "@/components/Copy";
import { Faq } from "@/components/Faq";
import { Logo } from "@/components/Logos";
import { GitHubIcon, Mark } from "@/components/Mark";
import { Rivals } from "@/components/Rivals";
import { SiteFoot, SiteNav } from "@/components/Site";
import { Reveal } from "@/components/Reveal";
import { Saving } from "@/components/Saving";
import { AGENTS, AppTile } from "@/components/Tiles";
import { GITHUB, X, stars } from "@/lib/site";

const FIVE = [
  {
    title: "Projects",
    text: "One per product. A name, a short key and a brief your agents read first.",
    art: (
      <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        <span className="chip">
          <span className="cid">DEC</span> Déclic
        </span>
        <span className="chip">
          <span className="cid">LEA</span> Leanear
        </span>
      </div>
    ),
  },
  {
    title: "Tasks",
    text: "A title, notes and a type: Bug, Feature or Idea. Drag it higher to make it matter more.",
    art: (
      <span className="chip">
        <span className="cid">LEA-12</span>
        <span className="type">Bug</span>
        Login loops on Safari
      </span>
    ),
  },
  {
    title: "Statuses",
    text: "Backlog, Todo, Doing, Done. The same four words for you and every agent.",
    art: (
      <span className="chip" style={{ gap: 14 }}>
        {["Backlog", "Todo", "Doing", "Done"].map((s, i) => (
          <span key={s} className="type" style={i === 2 ? { color: "var(--ink)" } : undefined}>
            {s}
          </span>
        ))}
      </span>
    ),
  },
  {
    title: "Activity",
    text: "Every change and comment, with who made it. Agents and people look the same.",
    art: (
      <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
        <span className="chip">
          <span className="av agent">
            <Logo k="claude" size={11} />
          </span>{" "}
          Claude moved <span className="cid">LEA-9</span> to Done
        </span>
        <span className="chip">
          <span className="av">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/rohit.png" alt="" width={20} height={20} />
          </span>
          Rohit commented
        </span>
      </div>
    ),
  },
  {
    title: "Agents",
    text: "A member with a name, a face and a key. Add as many as you like. They're free.",
    art: (
      <span style={{ display: "flex", gap: 10 }}>
        {(["claude", "chatgpt", "cursor"] as const).map((k) => (
          <AppTile key={k} t={AGENTS[k]} px={40} />
        ))}
      </span>
    ),
  },
];

const MCP = 'claude mcp add --transport http leanear https://app.leanear.app/mcp --header "Authorization: Bearer lk_your_key"';

const CUT = ["Teams", "Cycles", "Sprints", "Estimates", "Priorities", "Sub-issues", "Roadmaps", "Initiatives", "Custom fields", "Triage", "SLAs", "Seats"];

const FAQ = [
  {
    q: "Is it really open source?",
    a: "Yes. Every line is on GitHub under AGPL-3.0. Use it, change it, run it on your own server. The only thing you can't do is sell a closed copy of it.",
  },
  {
    q: "Why not just use Linear?",
    a: "If you have teams, sprints and a roadmap to report on, use Linear. It's great. If you're one person with a few agents, it's a lot of tool, and it's $10 a person.",
  },
  {
    q: "Which agents work with it?",
    a: "Anything that speaks MCP: Claude Code, Codex, Cursor and the rest. Each agent gets its own name and key, so you always know who did what.",
  },
  {
    q: "What does it cost?",
    a: "Free for one person, with no cap on tasks. $9 a month flat for a workspace of up to 10 people. Agents never count. Running it yourself is free.",
  },
  {
    q: "Can I host it myself?",
    a: "Yes. It's one Next.js app and one Postgres database. docker compose up, or a Deploy to Vercel button if you'd rather not run a server.",
  },
  {
    q: "Is the name a joke?",
    a: "A little. Say it out loud. Linear, but leaner.",
  },
];

function Star({ count, className }: { count: number | null; className: string }) {
  return (
    <a className={className} href={GITHUB} target="_blank" rel="noreferrer">
      <GitHubIcon />
      Star on GitHub
      {count !== null && <span className="count">{count.toLocaleString("en")}</span>}
    </a>
  );
}

export default async function Home() {
  const count = await stars();

  return (
    <>
      <SiteNav count={count} />

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <h1 className="h1 rise" style={{ "--i": 0 } as React.CSSProperties}>
              <span className="l1">Run your projects and agents</span>
              <Rivals />
            </h1>
            <p className="sub rise" style={{ "--i": 4 } as React.CSSProperties}>
              Linear, but leaner. The open-source project tool for indie hackers and their AI agents, at one flat $9 a month.
            </p>
            <div className="ctas rise" style={{ "--i": 5 } as React.CSSProperties}>
              <Star count={count} className="btn accent" />
              <span className="mono">Prices for a team of 3, billed yearly</span>
            </div>
          </div>
        </section>

        <section id="product" className="wrap rise" style={{ "--i": 7, scrollMarginTop: 96 } as React.CSSProperties}>
          <Board />
          <div className="alsoline">
            <p>
              Everything you see here, your AI agent can do too. <a href="#agents">See how</a>
            </p>
            <div className="row6">
              {Object.values(AGENTS).map((a) => (
                <AppTile key={a.name} t={a} px={44} />
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Five things. Nothing else.</h2>
              <p className="sub">Linear is built for companies. You&apos;re one person with a few agents.</p>
            </Reveal>
            <div className="grid five">
              {FIVE.map((f, i) => (
                <Reveal key={f.title} className="card" i={i % 3}>
                  <div className="art">{f.art}</div>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </Reveal>
              ))}
            </div>
            <Reveal className="cut">
              <span className="mono">Left out on purpose</span>
              <ul>
                {CUT.map((c, i) => (
                  <li key={c} style={{ "--i": i } as React.CSSProperties}>
                    {c}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section id="agents" className="wrap" style={{ scrollMarginTop: 64 }}>
          <Reveal className="agents">
            <div className="head">
              <h2 className="h2">Your agent can do everything you can</h2>
              <p className="sub">
                Paste one line. Your agent joins as a member, picks its next task, does it and reports back.
              </p>
            </div>
            <AgentLoop />
            <div className="cmd">
              <span className="p">$</span>
              <code>{MCP}</code>
              <Copy text={MCP} />
            </div>
            <p className="foot-note">
              Claude Code, Cursor, Codex and Windsurf connect with one line. ChatGPT, Claude and Gemini connect
              with your Leanear sign-in.
            </p>
            <div className="agent-links">
              <Link href="/docs#connect">MCP setup</Link>
              <Link href="/docs#tools">Tools</Link>
              <Link href="/docs">Read the docs</Link>
            </div>
          </Reveal>
        </section>

        <section id="pricing" className="section" style={{ scrollMarginTop: 0 }}>
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Pay for the workspace, not the seats</h2>
              <p className="sub">Free alone. $9 a month flat for up to 10 people. Agents are always free.</p>
            </Reveal>
            <Reveal>
              <Saving />
            </Reveal>
            <Reveal className="price plans">
              <div>
                <b>Solo</b>
                <span className="p">Free</span>
                <span>One person, unlimited projects, tasks and agents</span>
              </div>
              <div>
                <b>Workspace</b>
                <span className="p">$9 a month</span>
                <span>Up to 10 people, unlimited everything, or $90 a year</span>
              </div>
              <div>
                <b>Self-host</b>
                <span className="p">Free</span>
                <span>Everything, on your own server</span>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal className="letter">
              <h2 className="h2">Why I&apos;m building Leanear</h2>
              <p>
                Hi, I&apos;m{" "}
                <span className="me">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/rohit.png" alt="" width={24} height={24} />
                  Rohit
                </span>
                , a developer in Melbourne with a 9 to 5. I build my own products at night, mostly with Claude Code.
              </p>
              <p>
                Linear is the best tool out there, and it&apos;s built for companies: teams, cycles, roadmaps, seats. I
                needed a tenth of it, and one list that my agents and I both work from.
              </p>
              <p>So I&apos;m building that, in the open, with three things in mind:</p>
              <ol>
                <li>
                  <b>Lean.</b> Five things, nothing else. If it needs more than a line to explain, it&apos;s out.
                </li>
                <li>
                  <b>Open source.</b> Read every line on{" "}
                  <a className="link" href={GITHUB} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                  , or run it on your own server.
                </li>
                <li>
                  <b>Agent first.</b> Your agent is a member with a name, not an integration you have to build.
                </li>
              </ol>
              <p>
                Star it to follow along, or say hi on{" "}
                <a className="link" href={X} target="_blank" rel="noreferrer">
                  X
                </a>
                .
              </p>
              <div className="sig">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/rohit.png" alt="Rohit" width={56} height={56} />
                <div>
                  <div className="name">Rohit</div>
                  <span className="mono">@rohitb47</span>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="faq" className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Questions</h2>
            </Reveal>
            <Reveal>
              <Faq items={FAQ} />
            </Reveal>
          </div>
        </section>

        <section className="section final">
          <Reveal className="wrap">
            <span className="markbig">
              <Mark size={56} />
            </span>
            <h2 className="h2">It&apos;s on GitHub</h2>
            <p className="sub">Every line in the open, under AGPL-3.0. Star it and watch it come together.</p>
            <div className="ctas">
              <Star count={count} className="btn accent" />
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFoot />
    </>
  );
}
