# Architecture

**Read before touching auth, agents and MCP, sync, or the schema.** Paths are relative to
`apps/web`.

## Two kinds of member

A workspace has **members**, and a member is a person or an agent. Both can be assigned
tasks, comment and move cards; the difference is only how they prove who they are.

- **People** sign in with GitHub, through Better Auth (`lib/auth/server.ts`). Nothing
  else: everyone using Leanear has a GitHub account. Locally that means a second GitHub
  OAuth app whose callback is localhost.
- **Agents** send `Authorization: Bearer lk_…` to `/mcp` (`lib/auth/agent.ts`). Only the
  key's hash is stored. Agents never touch Better Auth, and people never use keys.

Both arrive at the same `Ctx` (`lib/workspace/context.ts`): the workspace and the member
asking. Everything in `lib/` takes one and stays inside its workspace.

**The workspace comes from the session, never the input.** A person in several workspaces
picks one with a cookie (`lib/auth/session.ts`); an agent's key belongs to exactly one.
Someone signing in with nowhere to go gets a workspace of their own.

## One operation, two doors

Every read and write lives once, in `lib/<concern>/`. The app reaches it through a tRPC
procedure (`trpc/routers/`), an agent through an MCP tool (`lib/mcp/tools.ts`). Neither
door holds logic of its own. See [`data-access.md`](./data-access.md).

## Sync

The board is local-first. It renders from a small client store (`lib/store/store.ts`),
writes land there before the server answers (`patch()` in `lib/store/patch.ts`), and a
refusal puts the card back with a toast.

Everyone sees the same board by polling `workspace.sync` every 3 seconds with the cursor
from the last answer. It returns every row whose `updatedAt` is after the cursor, minus a
10 second overlap for writes that committed late; the client applies rows idempotently and
skips any task with a write of its own in flight.

**That is why tasks and projects are soft-deleted.** A deleted row has to reach every open
board as a change, so it keeps `deletedAt` and a fresh `updatedAt`. It's the one exception
to Provida's "nothing is soft-deleted", and it lives in the data layer: every read in
`lib/` filters live rows itself.

## Schema

`prisma/schema.prisma` is short; read it rather than assuming a shape. Tables and columns
are snake_case in Postgres and camelCase in Prisma. Better Auth owns `user`, `session`,
`account` and `verification`.

Screenshots are stored in Postgres (`images`), so a workspace is one database to back up
and self-hosting needs nothing else.
