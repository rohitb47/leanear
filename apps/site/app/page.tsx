import Link from "next/link"
import { Board } from "@/components/landing/board"
import { Copy } from "@/components/common/copy"
import { Compare } from "@/components/landing/compare"
import { DotField } from "@/components/landing/dot-field"
import { Faq } from "@/components/landing/faq"
import { HeroWords } from "@/components/landing/hero-words"
import { Logo } from "@/components/common/logos"
import { Mark } from "@leanear/ui/mark"
import { SiteFoot, SiteNav } from "@/components/chrome/site"
import { Reveal } from "@/components/common/reveal"
import { AGENTS, AppTile } from "@/components/common/tiles"
import { APP, X, stars } from "@/lib/site/links"

// Each card's drawing has a quiet idle loop that acts out its sentence. The
// loops run only once the card is on screen, and not at all for reduced motion.
const FIVE = [
  {
    title: "Projects",
    text: "One per product. A name, a short key and the .md files your agents read first.",
    art: (
      <div className="idle idle-projects">
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
      <div className="idle idle-tasks">
        <span className="chip">
          <span className="cid">LEA-12</span>
          <span className="type">Bug</span>
          Login loops on Safari
        </span>
        <span className="chip">
          <span className="cid">LEA-14</span>
          <span className="type">Feature</span>
          Drag to reorder
        </span>
      </div>
    ),
  },
  {
    title: "Statuses",
    text: "Backlog, Todo, Doing, Done. The same four words for you and every agent.",
    art: (
      <span className="chip idle idle-statuses">
        {["Backlog", "Todo", "Doing", "Done"].map((s) => (
          <span key={s} className="type">
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
      <div className="idle idle-activity">
        <span className="chip">
          <span className="av agent">
            <Logo k="claude" size={11} brand />
          </span>{" "}
          Claude moved
          <span className="ids">
            <span className="cid">LEA-9</span>
            <span className="cid">LEA-12</span>
            <span className="cid">LEA-14</span>
          </span>
          to Done
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
    text: "A member with a name, a face and a key. Five on Cloud, as many as you like when you run it yourself.",
    art: (
      <span className="idle idle-agents">
        {(["claude", "codex", "cursor"] as const).map((k) => (
          <AppTile key={k} t={AGENTS[k]} px={40} />
        ))}
      </span>
    ),
  },
]

const MCP =
  'claude mcp add --transport http leanear https://cloud.leanear.app/mcp --header "Authorization: Bearer lk_your_key"'

const CUT = [
  "Teams",
  "Cycles",
  "Sprints",
  "Estimates",
  "Priorities",
  "Sub-issues",
  "Roadmaps",
  "Initiatives",
  "Custom fields",
  "Triage",
  "SLAs",
  "Seats",
]

const CONTEXT = ["CLAUDE.md", "AGENTS.md", "DESIGN.md", "SPEC.md"]

const PLANS = [
  {
    name: "Cloud",
    price: "$9",
    per: "/month",
    line: "Hosted for you. One flat price.",
    gets: [
      "10 projects, unlimited tasks",
      "Up to 20 people",
      "5 agents",
      "Every MCP tool and your context",
    ],
    cta: "Get started",
    href: APP,
    main: true,
  },
  {
    name: "Self-host",
    price: "Free",
    per: "",
    line: "Everything, no caps, on your own server.",
    gets: ["One container and Postgres", "Your data stays yours", "AGPL-3.0"],
    cta: "Read the guide",
    href: "/docs/self-host",
    main: false,
  },
  {
    name: "Bigger than this",
    price: "Not us",
    per: "",
    line: "More than 20 people? You've outgrown lean. Congrats.",
    gets: [
      "Sprints and roadmaps",
      "Seats to count",
      "Someone whose job is the tool",
    ],
    cta: "Try Linear",
    href: "https://linear.app",
    main: false,
  },
]

const FAQ = [
  {
    q: "Who is it for?",
    a: "A small team, two to five people, building one product with coding agents. Sprints and a roadmap to report on? Linear is the better fit.",
  },
  {
    q: "Which agents work with it?",
    a: "Any coding agent that speaks MCP and can send a key: Claude Code, Cursor, Codex, Copilot, Windsurf. Each gets its own name and key, so you always see who did what.",
  },
  {
    q: "What is Context?",
    a: "Your project's .md files, like CLAUDE.md and AGENTS.md, kept in Leanear instead of every repo. Edit them once and every agent reads the latest. Pull them into a repo when you want them on disk.",
  },
  {
    q: "I already have a codebase. Can I bring it?",
    a: "Yes. Install the setup skill in Claude Code, or paste one prompt into any agent. It reads the repo, writes your context files and turns TODOs and open issues into your first tasks. It never touches your code.",
  },
  {
    q: "What does it cost?",
    a: "$9 a month on Cloud: 10 projects, unlimited tasks, up to 20 people and 5 agents. No trial, no seats. Running it yourself is free.",
  },
  {
    q: "Why not just use Linear?",
    a: "Linear is built for companies: teams, cycles, roadmaps, seats. A few founders with agents need a tenth of that, and it's $10 a person.",
  },
  {
    q: "Can I host it myself?",
    a: "Yes. It's one container and one Postgres database, and docker compose up runs both. No caps when it's yours. Or deploy to Vercel with a Neon database.",
  },
  {
    q: "Is it open source?",
    a: "Yes. Every line is on GitHub under AGPL-3.0. Use it and change it; you just can't sell a closed copy of it.",
  },
]

// X's verified badge, in X's blue, beside the handle that links to it.
function Verified() {
  return (
    <svg className="verified" viewBox="0 0 22 22" aria-label="Verified">
      <path
        d="M20.4 11c0-1.3-.8-2.5-2-3.1.5-1.2.2-2.6-.7-3.6-1-.9-2.4-1.2-3.6-.7C13.5 2.4 12.3 1.6 11 1.6S8.5 2.4 7.9 3.6c-1.2-.5-2.6-.2-3.6.7-.9 1-1.2 2.4-.7 3.6C2.4 8.5 1.6 9.7 1.6 11s.8 2.5 2 3.1c-.5 1.2-.2 2.6.7 3.6 1 .9 2.4 1.2 3.6.7.6 1.2 1.8 2 3.1 2s2.5-.8 3.1-2c1.2.5 2.6.2 3.6-.7.9-1 1.2-2.4.7-3.6 1.2-.6 2-1.8 2-3.1z"
        fill="#1d9bf0"
      />
      <path
        d="M7.3 11.2 9.8 13.6 14.7 8.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default async function Home() {
  const count = await stars()

  return (
    <>
      <SiteNav count={count} />

      <main id="top">
        <section className="hero">
          <DotField />
          <div className="wrap">
            <Link
              href="/docs/self-host"
              className="pill rise"
              style={{ "--i": 0 } as React.CSSProperties}
            >
              Self-host with
              <Logo k="docker" size={18} brand />
              Docker
              <span className="pill-sep" aria-hidden />
              <code>docker compose up</code>
            </Link>
            <h1 className="h1 rise" style={{ "--i": 0 } as React.CSSProperties}>
              <span className="line dim">Project management for</span>{" "}
              <HeroWords />
            </h1>
            <p className="sub rise" style={{ "--i": 4 } as React.CSSProperties}>
              One board where you, your co-founders and every agent see where
              it&apos;s at and what&apos;s next.
            </p>
            <div
              className="ctas rise"
              style={{ "--i": 5 } as React.CSSProperties}
            >
              <a className="btn accent" href={APP}>
                Get started
              </a>
            </div>
          </div>
        </section>

        <section
          id="product"
          className="wrap rise"
          style={{ "--i": 7, scrollMarginTop: 96 } as React.CSSProperties}
        >
          <Board />
        </section>

        <section className="section">
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Five things. Nothing else.</h2>
              <p className="sub">
                Linear is built for companies. You&apos;re a few people and a
                few agents.
              </p>
            </Reveal>
            <div className="five grid">
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

        <section
          id="agents"
          className="section"
          style={{ scrollMarginTop: 64 }}
        >
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Your agents join the team</h2>
              <p className="sub">
                Paste one line. It joins as a member, picks its next task, does
                it and reports back.
              </p>
            </Reveal>
            <Reveal className="agent-row">
              {Object.values(AGENTS).map((a) => (
                <figure key={a.name}>
                  <AppTile t={a} px={56} />
                  <figcaption>{a.name}</figcaption>
                </figure>
              ))}
            </Reveal>
            <Reveal className="cmd-wrap">
              <div className="cmd">
                <span className="p">$</span>
                <code>{MCP}</code>
                <Copy text={MCP} />
              </div>
              <Link className="more" href="/docs/mcp">
                Set up any agent
              </Link>
            </Reveal>
          </div>
        </section>

        <section id="context" className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Your .md files live here now</h2>
              <p className="sub">
                Edit them once in Leanear. Every agent on the team reads the
                latest. No copies to keep in sync.
              </p>
            </Reveal>
            <Reveal className="files">
              {CONTEXT.map((f) => (
                <span key={f} className="file">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                    <path
                      d="M3.5 1.75h4.6l2.4 2.4v8.1H3.5z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {f}
                </span>
              ))}
            </Reveal>
            <Reveal className="cmd-wrap">
              <Link className="more" href="/docs/context">
                How Context works
              </Link>
            </Reveal>
          </div>
        </section>

        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Not a fair comparison</h2>
              <p className="sub">
                Same job, a tenth of the tool. $9 for the whole team.
              </p>
            </Reveal>
            <Reveal>
              <Compare />
            </Reveal>
          </div>
        </section>

        <section
          id="pricing"
          className="section"
          style={{ scrollMarginTop: 0 }}
        >
          <div className="wrap">
            <Reveal className="head">
              <h2 className="h2">Pay for the workspace, not the seats</h2>
              <p className="sub">
                $9 a month for up to 20 people and 5 agents. Or run it yourself
                for free.
              </p>
            </Reveal>
            <div className="plans">
              {PLANS.map((p, i) => (
                <Reveal
                  key={p.name}
                  className={p.main ? "plan main" : "plan"}
                  i={i}
                >
                  <span className="name">{p.name}</span>
                  <div className="amt">
                    {p.price}
                    {p.per && <span className="per">{p.per}</span>}
                  </div>
                  <p>{p.line}</p>
                  <ul>
                    {p.gets.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                  {p.href.startsWith("/") ? (
                    <Link
                      className={p.main ? "btn accent" : "btn ghost"}
                      href={p.href}
                    >
                      {p.cta}
                    </Link>
                  ) : (
                    <a
                      className={p.main ? "btn accent" : "btn ghost"}
                      href={p.href}
                      {...(p.href === APP
                        ? {}
                        : { target: "_blank", rel: "noreferrer" })}
                    >
                      {p.cta}
                    </a>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <Reveal className="letter">
              <h2 className="h2">
                Hello from the{" "}
                <span className="stamp">
                  <Mark />
                  Leanear
                </span>{" "}
                team
              </h2>
              <p>
                Ha, there&apos;s no team. It&apos;s just me,{" "}
                <span className="me">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/rohit.png" alt="" width={24} height={24} />
                  Rohit
                </span>
                .
              </p>
              <p>
                I run a few big codebases, and one simple question gets on my
                nerves every day: where is this at, and what&apos;s next?
              </p>
              <p>
                My co-founder and I could never agree on the answer. Linear was
                too much, and a plain board fell apart once we had a few
                modules.
              </p>
              <p>
                So I built Leanear. One board for us and our agents. Nothing
                else.
              </p>
              <div className="sig">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/rohit.png" alt="Rohit" width={56} height={56} />
                <div>
                  <div className="name">Rohit</div>
                  <a
                    className="handle"
                    href={X}
                    target="_blank"
                    rel="noreferrer"
                  >
                    @rohitb47
                    <Verified />
                  </a>
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
            <h2 className="h2">Stay lean. Stay cool.</h2>
            <p className="sub">
              One board for your team and its agents. Nothing else.
            </p>
            <div className="ctas">
              <a className="btn accent" href={APP}>
                Get started
              </a>
              <Link className="btn ghost" href="/docs/self-host">
                Self-host
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFoot />
    </>
  )
}
