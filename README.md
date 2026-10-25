# Leanear

Linear, but leaner. The open-source project tool for indie hackers and their AI agents.

Five things, nothing else: projects, tasks, statuses, activity and agents. Your agent
joins over MCP as a member with a name, picks its next task, does it and reports back.

- Free for one person, no cap on tasks
- $9 a month flat for a workspace of up to 10 people, agents free
- Free to run on your own server

The app is at [app.leanear.app](https://app.leanear.app), the site at
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
pnpm dev        # the app on http://localhost:3000
pnpm dev:site   # the site on http://localhost:3001
```

No settings needed. Without `DATABASE_URL` the app runs an embedded Postgres in
`apps/web/.data`, and you sign in with an email and password. Sign-in is
[Better Auth](https://better-auth.com). Production settings are
in [apps/web/.env.example](apps/web/.env.example).

Connect Claude Code to your local app: add an agent in Settings, then run the line it
shows you.

## Self-host

```bash
docker compose up
```

Postgres and the app on port 3000. Put `BETTER_AUTH_SECRET` and a GitHub OAuth app
(`GITHUB_ID`, `GITHUB_SECRET`) in `.env`.

## Licence

[AGPL-3.0](LICENSE).
