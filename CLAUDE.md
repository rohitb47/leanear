# Leanear

@AGENTS.md

- Brand: Ledger (Switzer, Geist Mono for ids, one orange accent per view, hairline columns).
  The global rules are in ~/.claude/BRAND.md; the motion reference is the prototype at
  https://claude.ai/artifact/CUwicrRKn5NvpWWkksiVQs.
- Monorepo (pnpm): `apps/site` is leanear.app, `apps/web` is the product at app.leanear.app,
  `packages/ui` holds what both share. The product spec is `docs/SPEC.md`; keep it true.
- Springs come from `packages/ui/src/spring.ts` (`@leanear/ui/spring`, damping ratio +
  response). Reuse it; no second engine.
- Every task operation lives once in `apps/web/lib/core.ts`. The app (`/api/rpc`) and MCP
  (`/mcp`) both call it; don't fork logic into a route.
- Schema changes: edit `apps/web/lib/schema.ts`, then `pnpm --filter @leanear/web db:generate`.
- `pnpm dev` needs no env vars (PGlite in `apps/web/.data`, local sign-in).
- Deploys: Vercel project `leanear` (root `apps/site`, leanear.app) and a second project for
  `apps/web` (app.leanear.app).
