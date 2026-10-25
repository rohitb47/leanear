# Data access

**Read before reading or writing data, or adding a procedure or MCP tool.** Paths are
relative to `apps/web`.

The shape in one line: **one function in `lib/`, two doors.** A tRPC procedure for the
app, an MCP tool for agents, and neither touches Prisma itself.

## `lib/<concern>/`

1. **Every operation is a function that takes a `Ctx`** and stays inside `ctx.ws`.
   `createTask(c, args)`, `removeMember(c, args)`.
2. **It checks its own input**, with errors written for a person or an agent to read:
   `text()` in `lib/utils.ts` for strings, and a refusal is a `LeanError` with a status.
   An agent sends loose JSON, so the check has to live here, not only in a zod schema.
3. **Who may do it is checked here too**: `person(c)` for things agents can't do,
   `owner(c)` for things only the owner can. Hiding a button is a courtesy; this is the
   enforcement.
4. **A row id on the wire is looked up inside the workspace first**, and a miss is a 404.
   `findTask`, `findProject` and `findMember` are the pattern, and they also accept what
   an agent would type: `PRO-12`, a project key, a member's name, `me`.

## tRPC (`trpc/`)

- **`workspaceProcedure` for everything** the app calls. It refuses anyone signed out and
  hands the procedure `ctx.c`.
- **Procedures are thin**: a zod schema for the shape, then one call into `lib/`. A
  `LeanError` becomes a tRPC error carrying its message.
- **The client is `api` from `@/trpc/client`.** The board doesn't use a query cache: it
  writes through `patch()` and reads from its own store (see
  [`architecture.md`](./architecture.md), Sync). Screens outside the board call `api`
  directly.
- One router per concern: `tasks`, `projects`, `workspace`.

## MCP (`lib/mcp/`, `app/mcp/route.ts`)

- **A tool is a description, a JSON schema and one call into `lib/`.** Its answer is
  plain text an agent can read, never JSON.
- The route only speaks the protocol (JSON-RPC over HTTP, stateless). Tools live in
  `lib/mcp/tools.ts`.
- **A new task operation usually wants both doors.** Add the function to `lib/`, then the
  procedure and the tool, then the line in `docs/SPEC.md`.

## Uploads

Images are multipart, so they post to `/api/images` rather than through tRPC, and are
served from `/i/<id>` to members and their agents only.
