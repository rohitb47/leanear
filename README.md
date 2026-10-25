# Leanear

Linear, but leaner. One open-source board for a small team and all its agents.

Five things, nothing else: projects, tasks, statuses, activity and agents. Your agent
joins over MCP as a member with a name, picks its next task, does it and reports back.

- $9 a month flat on Cloud: 10 projects, unlimited tasks, up to 20 people, 5 agents
- Free to run on your own server, no caps

The app is at [cloud.leanear.app](https://cloud.leanear.app), the site at
[leanear.app](https://leanear.app). What it does, screen by screen, is in
[docs/SPEC.md](docs/SPEC.md).

## Repo

```
apps/web      the app: board, tasks, briefs, settings, and the MCP server at /mcp
apps/site     leanear.app: landing page and docs
packages/ui   the spring engine and the mark, shared by both
```

## Run it

```bash
pnpm install
docker compose up -d   # Postgres on localhost:5432
cp apps/web/.env.example apps/web/.env.local
pnpm db:push
pnpm dev               # the app on http://localhost:3000
pnpm dev:site          # the site on http://localhost:3001
```

Fill in `apps/web/.env.local` from the example. Sign-in is GitHub only, so make a GitHub
OAuth app for local use, with the callback `http://localhost:3000/api/auth/callback/github`.

Connect Claude Code to your local app: add an agent in Settings, then run the line it
shows you.

## Self-host

One Next.js app and one Postgres database. Fill in `apps/web/.env.local` from the example,
then:

```bash
pnpm install
pnpm db:push
pnpm build && pnpm --filter @leanear/web start
```

Or deploy `apps/web` to Vercel with a Neon database.

## Licence

[AGPL-3.0](LICENSE).
