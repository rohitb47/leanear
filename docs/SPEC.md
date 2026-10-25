# Leanear: product spec

Linear, but leaner. A project tool for indie hackers and their AI agents. This spec covers
the app at **app.leanear.app** (`apps/web`). The marketing site at **leanear.app** is
`apps/site`.

The first real customer is us: Rohit, one more person, and Claude Code, running the Provida
(NDIS) product. Leanear is the single source of truth for what is happening in that product:
what's planned, who (or which agent) is on it, and what was done.

## 1. Principles

1. **Five things, nothing else.** Projects, tasks, statuses, activity, agents. No cycles,
   estimates, epics, sub-tasks, custom fields, labels, priorities or due dates. Order in a
   column is the priority: drag a card higher to make it matter more.
2. **Agents are members.** An agent has a name, an avatar and a key. It shows up in
   assignee menus and activity exactly like a person. Agents are free.
3. **One code path.** The app and the MCP server call the same core functions
   (`apps/web/lib/core.ts`). An agent can do everything a person can do with tasks, and
   nothing more (no settings, no keys, no members).
4. **Ledger brand.** Switzer for text, Geist Mono for ids and metadata, one orange accent
   per view, hairline columns, ledger rows. Motion comes from one spring engine
   (`packages/ui/src/spring.ts`): interruptible, damping ratio plus response.
5. **Runs with no settings.** `pnpm dev` works with zero environment variables: an embedded
   Postgres (PGlite) on disk and a local sign-in. Production adds a database URL and OAuth.

## 2. Vocabulary

| Thing | Rules |
|---|---|
| Workspace | Created on first sign-in. Holds people, agents and projects. A person can belong to several and switch between them. |
| Person | Signed in with GitHub or Google. Role is `owner` or `member`. Owners manage people; anyone manages agents and projects. |
| Agent | A workspace member with a name and one or more keys (`lk_…`). Only a hash of each key is stored. Keys show the last four characters and when they were last used. |
| Project | A name, a key of 2 to 5 capital letters (unique in the workspace, fixed once tasks exist) and a brief in Markdown. |
| Task | `KEY-n` id, title, notes (Markdown), type, status, assignee, position. |
| Type | `bug`, `feature`, `idea`. |
| Status | `backlog`, `todo`, `doing`, `done`, plus `canceled` (off the board, reachable from the status menu and search). |
| Activity | Append-only log per task: created, moved, assigned, renamed, retyped, notes edited (keeps the previous notes), commented. Each entry has an actor. |
| Screenshot | An image pasted into a task, stored in Postgres, served from `/i/<id>` to workspace members only. |

## 3. Screens

All screens share one top bar: wordmark left, tabs centre (Board, My Tasks, Brief,
Settings), search (⌘K), the accent **New task** button (C) and the avatar right. On phones
the tabs drop to a second row and the button shrinks to a plus.

### 3.1 Sign in
Mark, "Sign in to Leanear", Continue with GitHub (accent), Continue with Google. Only the
providers that are configured are shown. In development with no providers configured a
**Continue locally** form takes a name and email. An invite link (`/join/<token>`) shows the
workspace being joined above the buttons.

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
| Key | Does |
|---|---|
| C | New task |
| ⌘K / Ctrl K | Command menu |
| B, M, R, S | Board, My Tasks, Brief, Settings |
| 1 to 4 | Status of the open task |
| Escape | Close the top layer, or cancel a drag |

## 4. Live updates

Everyone sees the same board. The client polls `GET /api/sync?since=<cursor>` every 3s while
the tab is visible (and at once on focus). The server returns every project, task and
member row changed since the cursor (deletes come back as tombstones) and the new activity
for the task that is open. Changes from others animate in with the same FLIP springs as
your own. All your own changes are optimistic and reconciled with the server's reply.

## 5. MCP

Endpoint: `https://app.leanear.app/mcp`. Streamable HTTP, stateless, JSON responses
(protocol `2025-06-18`, older versions accepted). Auth: `Authorization: Bearer lk_…`.
Requests are rate limited to 120 a minute per key.

```
claude mcp add --transport http leanear https://app.leanear.app/mcp --header "Authorization: Bearer lk_…"
```

| Tool | Does | Arguments |
|---|---|---|
| `list_projects` | Projects and their keys | none |
| `get_brief` | A project's brief as Markdown | `project` |
| `next_task` | Top Todo assigned to this agent, with notes and brief title. Empty when none. | `project?` |
| `list_tasks` | Filtered tasks | `project?`, `status?`, `type?`, `assignee?` (`me` works), `q?`, `limit?` |
| `get_task` | One task with notes and activity | `id` |
| `create_task` | New task at the top of its column | `project`, `title`, `notes?`, `type?`, `status?`, `assignee?` |
| `update_task` | Change title, notes, type or assignee | `id`, `title?`, `notes?`, `type?`, `assignee?` |
| `move_task` | New status, optional comment | `id`, `status`, `comment?` |
| `comment` | Post on a task | `id`, `body` |
| `attach_image` | Upload a base64 image; returns a Markdown link | `id`, `data`, `mime` |

The loop: assign tasks to the agent, then tell it "Work through my Leanear tasks." It calls
`next_task`, reads `get_brief`, moves the task to Doing, does the work, comments what it
did, and moves it to Done (or back to a person with a question).

## 6. Data model (Postgres)

```
users        id, name, email, avatar_url, github_id, google_id, created_at
sessions     token_hash pk, user_id, expires_at
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

- OAuth 2 authorization code flow for GitHub (`read:user user:email`) and Google
  (`openid email profile`), with a random `state` in a short-lived httpOnly cookie.
- Accounts link by provider id first, then by verified email.
- Sessions: a random 32-byte token in an httpOnly, SameSite=Lax cookie `lean_session`,
  30 days, stored as a SHA-256 hash.
- Every API and MCP call resolves to a member in a workspace, and every query is scoped to
  that workspace.
- Local sign-in exists only when `NODE_ENV` is not production.

## 8. Settings (environment)

| Variable | Needed | What |
|---|---|---|
| `DATABASE_URL` | Production | Postgres connection string (Neon works). Without it the app uses PGlite in `apps/web/.data`. |
| `PUBLIC_URL` | Production | Where the app runs, like `https://app.leanear.app`. Used for OAuth callbacks and the MCP URL shown in the app. Falls back to the request origin. |
| `GITHUB_ID`, `GITHUB_SECRET` | One provider | GitHub OAuth app. Callback: `<PUBLIC_URL>/auth/github/callback` |
| `GOOGLE_ID`, `GOOGLE_SECRET` | Optional | Google OAuth client. Callback: `<PUBLIC_URL>/auth/google/callback` |

Migrations run before `next build` when `DATABASE_URL` is set, and on first use with PGlite.

## 9. Repository

```
apps/site     leanear.app, the landing page and docs (Vercel project "leanear")
apps/web      app.leanear.app, the product (Vercel project "leanear-app")
packages/ui   the spring engine and the mark, shared by both
docs/SPEC.md  this file
```

## 10. Out of scope for now

Billing, email (invites are links), notifications, MCP OAuth sign-in (so ChatGPT and Gemini
connectors wait; header-based clients work today), GitHub issue sync, mobile apps, public
boards, file attachments other than images.
