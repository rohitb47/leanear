import type { Metadata } from "next"
import { Code, DocHead, Pager, Steps } from "@/components/docs/parts"

export const metadata: Metadata = { title: "Self-host" }

const ENV = `BETTER_AUTH_SECRET=   # openssl rand -base64 32
PUBLIC_URL=http://localhost:3000
GITHUB_ID=
GITHUB_SECRET=`

const SETTINGS: { key: string; what: string }[] = [
  {
    key: "BETTER_AUTH_SECRET",
    what: "Signs sessions. 32 random bytes: openssl rand -base64 32",
  },
  {
    key: "PUBLIC_URL",
    what: "Where shipth.at runs, like https://tasks.example.com. Sign-in and the MCP URL use it.",
  },
  {
    key: "GITHUB_ID, GITHUB_SECRET",
    what: "Your GitHub OAuth app, for sign-in",
  },
  {
    key: "DATABASE_URL",
    what: "Set for you by Compose. Only needed when your Postgres lives somewhere else.",
  },
]

export default function SelfHost() {
  return (
    <>
      <DocHead
        href="/docs/self-host"
        lead="shipth.at is one container and one Postgres database. Docker Compose runs both, on your laptop or any server you like."
      />

      <h2>Run it</h2>
      <Steps>
        <li>
          <b>Get the code.</b>
        </li>
      </Steps>
      <Code
        code={"git clone https://github.com/rohitb47/leanear\ncd leanear"}
        file="Terminal"
      />
      <Steps start={2}>
        <li>
          <b>Make a GitHub OAuth app</b> at github.com/settings/developers. Set
          its callback URL to{" "}
          <code className="inline">
            http://localhost:3000/api/auth/callback/github
          </code>
          .
        </li>
        <li>
          <b>Add your settings</b> to a <code className="inline">.env</code>{" "}
          file next to <code className="inline">docker-compose.yml</code>.
        </li>
      </Steps>
      <Code code={ENV} file=".env" />
      <Steps start={4}>
        <li>
          <b>Start it.</b> Then open localhost:3000 and sign in with GitHub.
        </li>
      </Steps>
      <Code code="docker compose up -d" file="Terminal" />

      <h2>Settings</h2>
      <div className="tools">
        {SETTINGS.map((e) => (
          <div key={e.key} className="tool-row env">
            <code>{e.key}</code>
            <span>{e.what}</span>
          </div>
        ))}
      </div>

      <h2>Deploy anywhere</h2>
      <p>
        Anything that runs a container runs shipth.at. Change{" "}
        <code className="inline">PUBLIC_URL</code> and your GitHub app&apos;s
        callback to the real address, and you&apos;re done.
      </p>

      <h3>Your own server</h3>
      <p>
        A VPS from Hetzner or DigitalOcean, a box under your desk. Run the same
        four steps, then put HTTPS in front with Caddy.
      </p>
      <Code
        code="caddy reverse-proxy --from tasks.example.com --to localhost:3000"
        file="Terminal"
      />

      <h3>Fly.io, Railway or Render</h3>
      <p>
        Point a new app at your fork. They build the Dockerfile for you. Add
        their Postgres, copy its connection string into{" "}
        <code className="inline">DATABASE_URL</code>, and set the other four.
      </p>

      <h3>Vercel</h3>
      <p>
        No Docker needed. Import your fork with{" "}
        <code className="inline">apps/web</code> as the root, add a Neon
        database for <code className="inline">DATABASE_URL</code>, and set the
        other four.
      </p>

      <h2>Update</h2>
      <p>
        Pull and rebuild. The container brings the database up to date when it
        starts.
      </p>
      <Code code={"git pull\ndocker compose up -d --build"} file="Terminal" />

      <h2>Back up</h2>
      <p>
        Everything, screenshots included, lives in Postgres. One file holds it
        all.
      </p>
      <Code
        code="docker compose exec db pg_dump -U postgres postgres > shipthat.sql"
        file="Terminal"
      />

      <Pager href="/docs/self-host" />
    </>
  )
}
