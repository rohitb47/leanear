# Leanear: product spec

Linear, but leaner. A project tool for a small team and its AI agents. This spec covers
the app at **cloud.leanear.app** (`apps/web`) and, in §11, the site at **leanear.app**
(`apps/site`).

The first real customer is us: Rohit, one more person, and Claude Code, running the Provida
(NDIS) product. Leanear is the single source of truth for what is happening in that product:
what's planned, who (or which agent) is on it, and what was done.

## 1. Principles

1. **Five things, nothing else.** Projects, tasks, statuses, activity, agents. No cycles,
   estimates, epics, sub-tasks, custom fields, labels, priorities or due dates. Order in a
   column is the priority: drag a card higher to make it matter more.
2. **Agents are members.** An agent has a name, an avatar and a key. It shows up in
   assignee menus and activity exactly like a person. Agents are free.
3. **One code path.** The app (tRPC) and the MCP server call the same functions in
   `apps/web/lib/` (docs/data-access.md). An agent can do everything a person can do with tasks, and
   nothing more (no settings, no keys, no members).
4. **Leanear brand.** See `DESIGN.md`: Bricolage Grotesque headings, Geist body, Geist Mono for ids and metadata, one orange accent
   per view, hairline columns, ledger rows. Motion comes from one spring engine
   (`packages/ui/src/spring.ts`): interruptible, damping ratio plus response.
5. **Runs on three settings.** `pnpm dev` needs a Postgres (`docker compose up -d`), a secret
   its own URL and a GitHub OAuth app, locally and in production.

## 2. Vocabulary

| Thing      | Rules                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace  | Created on first sign-in. Holds people, agents and projects. A person can belong to several and switch between them.                                              |
| Person     | Signed in with GitHub. Role is `owner` or `member`. Owners manage people; anyone manages agents and projects.                                                     |
| Agent      | A workspace member with a name and one or more keys (`lk_…`). Only a hash of each key is stored. Keys show the last four characters and when they were last used. |
| Project    | A name, a key of 2 to 5 capital letters (unique in the workspace, fixed once tasks exist) and a brief in Markdown.                                                |
| Task       | `KEY-n` id, title, notes (Markdown), type, status, assignee, position.                                                                                            |
| Type       | `bug`, `feature`, `idea`.                                                                                                                                         |
| Status     | `backlog`, `todo`, `doing`, `done`, plus `canceled` (off the board, reachable from the status menu and search).                                                   |
| Activity   | Append-only log per task: created, moved, assigned, renamed, retyped, notes edited (keeps the previous notes), commented. Each entry has an actor.                |
| Screenshot | An image pasted into a task, stored in Postgres, served from `/i/<id>` to workspace members only.                                                                 |

## 3. Screens

All screens share one top bar: wordmark left, tabs centre (Board, My Tasks, Brief,
Settings), search (⌘K), the accent **New task** button (C) and the avatar right. On phones
the tabs drop to a second row and the button shrinks to a plus.

### 3.1 Sign in

Mark, "Sign in to Leanear", Continue with GitHub (accent). That's the only way in; the first
sign-in makes the account. An invite link
(`/join/<token>`) shows the workspace being joined, and sign-in comes back to it.

### 3.2 Onboarding

Two steps, sliding the way you are going, with progress dots.

1. **What are you building?** One field. The key fills itself in (`Provida` → `PRO`,
   `Two Words` → `TW`) and can be edited.
2. **Bring your agent.** Name the agent (default Claude), pick Claude Code, Codex or
   Cursor, copy the one-line command with a freshly minted key. "I've added it" or
   "Skip for now".

### 3.3 Board

Title row: project name, `KEY · n tasks`, and project keys as pills to switch project.
Four hairline columns: Backlog, Todo, Doing, Done, each with a count and a plus.

Cards are ledger rows: id, type, assignee avatar, title. Interactions:

- Click opens the task panel. The card stays highlighted.
- Drag with a mouse after 5px, or long-press 280ms on touch. The card lifts (scale 1.035,
  lifted shadow) and follows the pointer 1:1. A dashed slot shows where it will land and
  the other cards make room with FLIP springs.
- Throw: on release the landing spot is projected from the release velocity, so a flick
  lands where it was heading. Escape cancels and springs the card home.
- The column edges auto-scroll while dragging.
- A card an agent is working on (in Doing and assigned to an agent) carries an ink
  outline, on the board and in My Tasks.

### 3.4 Task panel

Slides in from the right over the board (480px, full width on phones). Drag its top bar to
the right to put it away; it follows the throw. Contents:

- `KEY-n`, type, Copy id, close.
- Title, editable in place.
- Property pills: status, type, assignee. Each opens a menu. Keys 1 to 4 set the status
  while the panel is open, and the card visibly moves on the board behind.
- Notes rendered as Markdown. Edit swaps to a textarea; pasting an image uploads it and
  inserts it. Save writes an activity entry that keeps the old notes.
- Activity feed, newest last, new entries rise in.
- Composer: "Comment, or @Claude to hand it over". Mentioning an agent or person by name
  assigns the task to them.
- Delete task (in a ⋯ menu, with confirm).

### 3.5 New task

Press C or the button: the dialog grows out of whatever opened it. Title (required), notes,
a paste zone for screenshots, type and assignee pickers, status preset by the column's plus.
Created tasks land at the top of their column.

### 3.6 Command menu (⌘K)

Actions (New task, Go to …, Switch theme, Switch project) and tasks matched by id, title or
notes. Arrow keys, Enter, Escape.

### 3.7 My Tasks

Todo and Doing across every project, assigned to you or to any agent, grouped by project,
Doing first.

### 3.8 Brief

One page per project in Markdown, rendered as a document. Edit in place. Agents read it
before every task through `get_brief`.

### 3.9 Settings

Sections in ledger rows:

- **Members**: people with role. Owners create an invite link (valid 7 days, reusable until
  revoked) and remove members.
- **Agents**: add (key shown once with the connect command), new key, revoke key, remove.
- **Projects**: add, rename, change key while empty, delete when empty.
- **Workspace**: rename; switch workspace if you belong to more than one.
- **Appearance**: System, Light, Dark.
- Sign out.

### 3.10 Keyboard

| Key         | Does                                  |
| ----------- | ------------------------------------- |
| C           | New task                              |
| ⌘K / Ctrl K | Command menu                          |
| B, M, R, S  | Board, My Tasks, Brief, Settings      |
| 1 to 4      | Status of the open task               |
| Escape      | Close the top layer, or cancel a drag |

## 4. Live updates

Everyone sees the same board. The client polls `workspace.sync` with the last cursor every 3s while
the tab is visible (and at once on focus). The server returns every project, task and
member row changed since the cursor (deletes come back as tombstones) and the new activity
for the task that is open. Changes from others animate in with the same FLIP springs as
your own. All your own changes are optimistic and reconciled with the server's reply.

## 5. MCP

Endpoint: `https://cloud.leanear.app/mcp`. Streamable HTTP, stateless, JSON responses
(protocol `2025-06-18`, older versions accepted). Auth: `Authorization: Bearer lk_…`.
Requests are rate limited to 120 a minute per key.

```
claude mcp add --transport http leanear https://cloud.leanear.app/mcp --header "Authorization: Bearer lk_…"
```

| Tool            | Does                                                                          | Arguments                                                                |
| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `list_projects` | Projects and their keys                                                       | none                                                                     |
| `get_brief`     | A project's brief as Markdown                                                 | `project`                                                                |
| `next_task`     | Top Todo assigned to this agent, with notes and brief title. Empty when none. | `project?`                                                               |
| `list_tasks`    | Filtered tasks                                                                | `project?`, `status?`, `type?`, `assignee?` (`me` works), `q?`, `limit?` |
| `get_task`      | One task with notes and activity                                              | `id`                                                                     |
| `create_task`   | New task at the top of its column                                             | `project`, `title`, `notes?`, `type?`, `status?`, `assignee?`            |
| `update_task`   | Change title, notes, type or assignee                                         | `id`, `title?`, `notes?`, `type?`, `assignee?`                           |
| `move_task`     | New status, optional comment                                                  | `id`, `status`, `comment?`                                               |
| `comment`       | Post on a task                                                                | `id`, `body`                                                             |
| `attach_image`  | Upload a base64 image; returns a Markdown link                                | `id`, `data`, `mime`                                                     |

The loop: assign tasks to the agent, then tell it "Work through my Leanear tasks." It calls
`next_task`, reads `get_brief`, moves the task to Doing, does the work, comments what it
did, and moves it to Done (or back to a person with a question).

## 6. Data model (Postgres)

```
user, session,
account, verification,
             Better Auth's tables (see prisma/schema.prisma)
workspaces   id, name, created_at
members      id, workspace_id, kind(person|agent), user_id?, name, avatar_url?, role(owner|member),
             removed_at?, updated_at
agent_keys   id, member_id, hash, hint, last_used_at?, revoked_at?, created_at
invites      id, workspace_id, token, created_by, expires_at, revoked_at?
projects     id, workspace_id, key, name, brief, seq, created_at, updated_at, deleted_at?
tasks        id, project_id, workspace_id, number, title, notes, type, status, assignee_id?,
             position(float), created_by, created_at, updated_at, deleted_at?
activity     id, task_id, workspace_id, actor_id, kind, data(jsonb), body?, created_at
images       id, workspace_id, task_id?, mime, bytes(bytea), created_by, created_at
```

`updated_at` on members, projects and tasks drives sync. Positions are floats: a new task
takes `min - 1` in its column and a drop takes the midpoint of its neighbours.

## 7. Auth

- People sign in through [Better Auth](https://better-auth.com), running inside the app
  (`apps/web/lib/auth/server.ts`, served at `/api/auth/*`) with its tables in our Postgres via
  the Prisma adapter. Not Neon Auth: the app must also run on any Postgres for self-hosting.
- GitHub is the only way in. No passwords, no email sign-in.
- Sessions last 30 days and refresh daily. The workspace being viewed is a separate
  httpOnly cookie, `lean_ws`, checked against the person's memberships on every request.
- First sign-in makes a workspace, unless it came through an invite, which is accepted
  first.
- Agents never use Better Auth: their `lk_` keys are hashed in `agent_keys`.
- Every API and MCP call resolves to a member in a workspace, and every query is scoped to
  that workspace.

## 8. Settings (environment)

| Variable                     | Needed | What                                                                                                           |
| ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | Always | Postgres connection string. Locally the Docker one; in production Neon's pooled string.                        |
| `BETTER_AUTH_SECRET`         | Always | 32+ random bytes (`openssl rand -base64 32`). Signs sessions.                                                  |
| `PUBLIC_URL`                 | Always | Where the app runs, like `https://cloud.leanear.app`. Better Auth's base URL and the MCP URL shown in the app. |
| `GITHUB_ID`, `GITHUB_SECRET` | Always | GitHub OAuth app. Callback: `<PUBLIC_URL>/api/auth/callback/github`                                            |

There are no migrations: `pnpm db:push` makes the database match `prisma/schema.prisma`.

## 9. Repository

```
apps/site     leanear.app, the landing page and docs (Vercel project "leanear")
apps/web      cloud.leanear.app, the product (Vercel project "leanear-app")
packages/ui   the spring engine and the mark, shared by both
docs/         this file, architecture.md and data-access.md
```

## 10. Out of scope for now

Billing, email (invites are links), sign-in other than GitHub, notifications, MCP OAuth sign-in (so ChatGPT and Gemini
connectors wait; header-based clients work today), GitHub issue sync, mobile apps, public
boards, file attachments other than images.

## 11. Site (leanear.app)

- **Hero:** pill, headline, one line, one button. The headline is two lines: "Project
  management for" dim, then one ink phrase that cycles (a small team, you and Claude, two
  co-founders, every agent), rolling up with a blur and a soft spring, each phrase centred
  so the line never jumps. The dot grid (34px) frames it and fades before the words.
- **One idea per section:** a heading, a short line, one thing to look at, at most one link.
- **The demo is the product as it is:** no keyboard hints, no chrome that isn't the
  product. A real board (Linear is the reference): columns with no dividers, a status icon
  and count on each head, every task its own card, the active tab a filled pill. A fixed
  height; extra cards fade out at the bottom. Three clickable tabs: Board, Context (the
  project's `.md` files, readable and editable in place, Markdown coloured like a real
  editor) and Settings (name, key, members, agents with masked keys). An action bar on
  the right of the header: New task on Board, New file on Context. No looping morphs.
  "Brief" is retired as a word: it's Context.
- **Agents:** coding agents only (Claude Code, Cursor, Codex, Copilot, Windsurf). ChatGPT,
  Grok and the like wait for MCP sign-in. The heading is "Your agents join the team".
- **Feature cards idle:** each drawing has one quiet loop that acts out its sentence.
- **Pricing:** Cloud is $9 a month, flat: 10 projects, unlimited tasks, up to 20 people, 5
  agents, no trial. Self-host is free (AGPL) with no caps. Nothing else is free; never say
  "free" about Cloud. Three plan cards: Cloud (raised, the only orange button), Self-host,
  and "Bigger than this", a friendly no that sends bigger teams to Linear. No slider.
- **The last call** is a feeling, not a price: "Stay lean. Stay cool." with "Get started"
  and "Self-host". Not a GitHub plea.
- **Docs** follow the Mintlify shape: sidebar, eyebrow, title, grey lead, numbered steps,
  previous and next.
