# Leanear

@AGENTS.md

Linear, but leaner: projects and tasks for a small team and its AI agents. Next.js 16 ·
tRPC · Prisma · Postgres · Better Auth. Built the way Provida is; when in doubt, do what
`~/Documents/GitHub/provida` does.

## Where things live

One pnpm workspace:

- **`apps/web`**: the app at cloud.leanear.app, and the MCP server at `/mcp`.
- **`apps/site`**: leanear.app, the landing page and docs.
- **`packages/ui`**: what both apps import (the spring engine, the mark). A module moves
  here when the second app actually imports it, not in advance.

Run `pnpm install` and `pnpm check` from the repo root.

## Read these when they apply

| Read                                            | Before                                            |
| ----------------------------------------------- | ------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md)  | auth, agents and MCP, sync, or the schema         |
| [`docs/data-access.md`](docs/data-access.md)    | reading or writing data; adding a procedure       |
| [`docs/SPEC.md`](docs/SPEC.md)                  | changing what a screen or tool does; keep it true |
| [`BRAND.md`](BRAND.md) and `~/.claude/BRAND.md` | any page, copy or design work, site or app        |

Brand: `BRAND.md` at the repo root (dark only, Bricolage headings, Geist body, one orange accent per view),
on top of `~/.claude/BRAND.md`. Read both before any page or screen.
The motion reference is the prototype at https://claude.ai/artifact/CUwicrRKn5NvpWWkksiVQs.
Motion: layout changes (things moving, resizing, a selection sliding) use Motion
(`motion/react`, `layout` and `layoutId`), Rohit, 25 Oct. Drags, throws and other
hand-driven physics use `@leanear/ui/spring` (damping ratio + response). Nothing else.

## Where a file goes

**Nothing sits loose at the root of `lib/` or `components/`.** Both are grouped by what a
file is _about_ (`lib/tasks/`, `components/board/`), never by what it is (`types/`,
`helpers/`). `common/` is the small catch-all. `lib/prisma.ts` and `lib/utils.ts` stay at
the root of `lib/`. Folders and files are `small-kebab-case`; components are `PascalCase`
in code only.

## Working agreements

- **Git: `main` only.** Never create, switch to or push another branch or worktree.
  Rohit, 25 Oct 2026.
- **Don't commit or push until Rohit asks.** A push to `main` deploys both apps.
  Commits are small and complete, `feat:` / `fix:` / `chore:` like Provida's.
- **Verify before claiming.** `pnpm check` is validate → typecheck → lint → build, for
  both apps. Run it before every commit and say what you ran.
- **Know which database you're pointed at.** Local is Docker (`docker compose up -d`),
  and is disposable. Production is Neon, reached only through `pnpm db:push:prod`, which
  is Rohit's to run.
- **Schema changes:** edit `apps/web/prisma/schema.prisma`, then `pnpm db:push`, then
  restart the dev server (Turbopack doesn't reload a regenerated client). There are no
  migrations; the schema file is the record.
- **`pnpm add`, never npm or yarn.** Prettier formats everything: `pnpm format`.
- **Stage what you changed**, not `git add -A`.
- **Delete rather than disable.** Something out of scope goes entirely. git remembers.
- **Write the rule, not the inventory**, in this file and in `docs/`.
- Deploys: Vercel project `leanear` (root `apps/site`, leanear.app) and `leanear-app`
  (root `apps/web`, cloud.leanear.app), both from `main`.
