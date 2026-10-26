# Leanear

@AGENTS.md

Linear, but leaner: projects and tasks for a small team and its AI agents. Next.js 16 ·
tRPC · Prisma · Postgres · Better Auth. Built the way Provida is; when in doubt, do what
`~/Documents/GitHub/provida` does.

## Where things live

One pnpm workspace:

- **`apps/web`**: the app at cloud.leanear.app, and the MCP server at `/mcp`.
- **`apps/site`**: leanear.app, the landing page and docs.
- **`packages/ui`**: what both apps import (the spring engine, the mark, logos, Copy). A
  module moves here when the second app actually imports it, not in advance.

Run `pnpm install` and `pnpm check` from the repo root.

## Read these when they apply

| Read                                           | Before                                                  |
| ---------------------------------------------- | ------------------------------------------------------- |
| [`docs/architecture.md`](docs/architecture.md) | auth, agents and MCP, sync, billing, or the schema      |
| [`docs/data-access.md`](docs/data-access.md)   | reading or writing data; adding a procedure             |
| [`docs/SPEC.md`](docs/SPEC.md)                 | changing what a screen, page or tool does; keep it true |
| [`DESIGN.md`](DESIGN.md)                       | any page, screen or component, site or app              |

## Design

- Load the **row-taste** skill before any page, screen, copy or design work: it's
  Rohit's taste across every project.
- `DESIGN.md` at the root is Leanear's own look: tokens on top, the why underneath,
  in [Google's DESIGN.md format](https://github.com/google-labs-code/design.md). It
  wins over row-taste where they differ. Tokens go there, never in this file.
- The site (`apps/site`) is the reference, and the app is its product window made real.
  A token change goes in both apps' `globals.css` and `DESIGN.md` together; check it with
  `npx @google/design.md lint DESIGN.md`.
- Motion: layout changes (things moving, resizing, a selection sliding) and things
  appearing use Motion (`motion/react`). Drags, throws and other hand-driven physics use
  `@leanear/ui/spring` (damping ratio + response). Nothing else. The reference is the
  site's demo board (`apps/site/components/landing/board.tsx`).

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
- **Know which database you're pointed at.** Local is Docker (`docker compose up -d db`;
  without `db` it also builds and runs the self-host container), and is disposable. Production is Neon, reached only through `pnpm db:push:prod`, which
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
