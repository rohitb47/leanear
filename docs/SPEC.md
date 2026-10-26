# Leanear: product spec

Linear, but leaner. A project tool for a small team and its AI agents. This spec covers
the app at **cloud.leanear.app** (`apps/web`) and, in §11, the site at **leanear.app**
(`apps/site`).

The first real customer is us: Rohit, one more person, and Claude Code, running the Provida
(NDIS) product. Leanear is the single source of truth for what is happening in that product:
what's planned, who (or which agent) is on it, and what was done.

## 1. Principles

1. **Five things, nothing else.** Projects, tasks, statuses, activity, agents. No cycles,
   estimates, epics, sub-tasks, custom fields, labels, priorities or due dates. A
   project's rules live in its own repo (its `CLAUDE.md`), never in Leanear. Order in a column is the priority: drag a card
   higher to make it matter more.
2. **Agents are members.** An agent has a name, a face and a key. It shows up in assignee
   menus and activity exactly like a person.
3. **One code path.** The app (tRPC) and the MCP server call the same functions in
   `apps/web/lib/` (docs/data-access.md). An agent can do everything a person can do with
   tasks, and nothing more (no settings, no keys, no members).
4. **The app is the site's demo, for real.** Same window, same bar, same cards. `DESIGN.md` holds the look.
5. **Runs on a few settings.** A Postgres, a secret, its own URL and a GitHub OAuth app.
   Stripe's two keys turn on Cloud billing; without them there's no plan and no caps.

## 2. Vocabulary

| Thing      | Rules                                                                                                                                                             |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace  | Created on first sign-in. Holds people, agents and projects, and on Cloud the plan. A person can belong to several and switch between them.                       |
| Person     | Signed in with GitHub. Role is `owner` or `member`. Owners manage people; anyone manages agents and projects.                                                     |
| Agent      | A workspace member with a name and one or more keys (`lk_…`). Only a hash of each key is stored. Keys show the last four characters and when they were last used. |
| Project    | A name and a key of 2 to 5 capital letters (unique in the workspace, fixed once tasks exist).                                                                     |
| Task       | `KEY-n` id, title, notes (Markdown), type, status, assignee, position.                                                                                            |
| Type       | `bug`, `feature`, `idea`.                                                                                                                                         |
| Status     | `backlog`, `todo`, `doing`, `done`, plus `canceled` (off the board, reachable from the status menu and search).                                                   |
| Activity   | Append-only log per task: created, moved, assigned, renamed, retyped, notes edited (keeps the previous notes), commented. Each entry has an actor.                |
| Screenshot | An image pasted into a task, stored in Postgres, served from `/i/<id>` to workspace members only.                                                                 |
| Plan       | Cloud only: $9 a month for the workspace, through Stripe. 10 projects, 20 people, 5 agents. No trial. Self-hosted has no plan and no caps.                        |

## 3. Screens

The app is black like the site, edge to edge, with no framed panel around it. Cards,
dialogs and menus on it are the one darker shade with a hairline.

Two levels: the workspace, and a project in it. Leanear opens at Home, the workspace's.
The bar says where you are on the left (the workspace's name, or a project's name and
key), with a menu to Home and every project. Its three tabs, with a pill that slides
between them, are Home, Activity and Settings for the workspace, and Board, Activity and
Settings for a project. On the right: search (⌘K) and your face. The bar carries no
action: things are made where they live (a column's plus, C, ⌘K, a row in Settings).

Anything that can't be undone asks first in a designed dialog, never the browser's.
Multi-step flows (adding an agent, a new key, inviting someone) finish in a dialog of
their own.

Motion is for things that happen now and then. What's done all day doesn't animate:
switching tabs, ⌘K, keyboard status changes and counts change at once. Forms keep their
buttons in a pinned footer, so the next step is never below the fold.

### 3.1 Sign in

Mark, "Sign in to Leanear", Continue with GitHub (accent). That's the only way in; the
first sign-in makes the account. An invite link (`/join/<token>`) shows the workspace
being joined, and sign-in comes back to it. A full Cloud workspace says so.

### 3.2 Onboarding

One thing per screen, sliding the way you're going, with progress dots.

1. **What are you building?** One field. The key fills itself in (`Provida` → `PRO`,
   `Two Words` → `TW`) and can be edited.
2. **The plan** (Cloud only): the $9 card from the site's pricing. Stripe Checkout takes
   the company's name, address and tax id for the invoice, then comes back to step 3.
3. **Bring your agent.** Pick the tool (Claude Code, Cursor, Codex, Copilot, Windsurf),
   name it, make its key, copy the line for that tool. It then waits, and says the
   moment the agent first calls in.
4. **Let it fill the board.** The setup skill for Claude Code and the prompt for any other
   agent: it reads the repo and makes the first tasks.

### 3.3 Home

Two lists, in the grey rows Settings uses. **Projects**: each one's key and name, the
faces of whoever has something in Doing (agents with their ring) and how many tasks are
open; New project last. **On your plate**: Todo and Doing across every project, yours and
your agents', Doing first; each opens its task.

### 3.4 Board

Five columns with no dividers, always: Backlog, Todo, Doing, Done and Canceled. A status
mark, name and count on each head, and a plus on hover (except Canceled). Every task is
its own card: id, type, assignee's face, title.

- Click opens the task. The card keeps an outline.
- Drag with a mouse after 5px, or long-press 280ms on touch. The card lifts (scale 1.035,
  lifted shadow) and follows the pointer 1:1. A dashed slot shows where it will land and
  the other cards glide out of the way.
- Throw: on release the landing spot is projected from the release velocity, so a flick
  lands where it was heading. Escape cancels and springs the card home.
- Columns scroll on their own; near an edge they scroll while dragging.
- An agent in Doing has a quiet ring turning round its face.
- What someone else just did shows for a few seconds as a line at the bottom ("Claude
  picked up LEA-12"); click it to open the task.
- An empty project offers New task and Bring a codebase.

### 3.5 Task

Opens as a dialog over the board, the board dimmed behind (720px wide, a steady
height; full screen on phones). Click outside or press Escape to close it; Escape in a
field leaves the field first. Contents:

- `KEY-n`, Copy, a ⋯ menu (Copy link, Cancel task, Delete task), close. Delete moves it
  to the trash at once, with Undo on the toast.
- Title, editable in place.
- Property pills: status, type, assignee. Each opens a menu. Keys 1 to 4 set the status
  while the task is open.
- Notes rendered as Markdown. Edit swaps to the coloured editor; pasting an image uploads
  it and inserts it. Save writes an activity entry that keeps the old notes.
- Activity, newest last; new entries rise in.
- Composer: "Comment, or @Claude to hand it over". Typing @ lists the members to pick
  (arrows and Enter, or a click); mentioning one hands the task to them.

### 3.6 New task

C or New task opens a dialog in the middle of the screen. Its project (the one in view,
or the last), title, notes in the coloured editor, pasted screenshots, and the status,
type and assignee pills. With more than one project, the project is a pill too. Enter or ⌘Enter adds
it at the top of its column.

### 3.7 Activity

At Home, everything that happened in the workspace; in a project, only its lines. Newest first, grouped by day: each line the
doer's face, the sentence written when it happened ("Moved LEA-12 to Done"), who and
which project under it, and when. Filter by who and by kind (tasks, projects, people and
agents, workspace). Clicking a line opens what it's about. Agents' lines
look like everyone's.

**Trash**, beside it (a project's, or all of it at Home): deleted tasks and projects, who deleted them and when, each with
Restore. A task comes back once its project is back; a project once its key is free. Nothing empties the trash on its own.

### 3.8 Settings

A project's Settings is just the project: name, key (fixed once there are tasks), Archive
and Delete (when empty), both asking first. Archiving keeps everything but takes the
project out of Home, the menus and the plan's count, and its tasks out of agents' reach,
until it's unarchived. You can't archive the last open project. The workspace's Settings, at Home, is one column of grey cards:

- **Members**: people with role, agents with their masked key and when they last called
  in, open invites (the email they went to, or the link). Add an agent opens a dialog (the
  same flow as onboarding), and so does Invite someone (owners): with Resend set up you
  type one email and it's sent, the link shown too; without, it makes a link. Either works
  7 days. A ⋯ menu per agent: new key (shown once in a dialog; it retires that agent's
  keys never used), revoke unused keys, revoke all keys, remove. Per person: make owner,
  remove. Revoking and removing ask first.
- **Archived projects**, when there are some, each with Unarchive.
- **Plan** (Cloud): price, renewal date, how full the workspace is, Billing (Stripe's
  portal for the card, invoices and cancelling).
- **Workspace**: name. **You**: sign out. Switching workspace is in your face's menu.

### 3.9 Command menu (⌘K)

Actions (New task, Go to Home, the board, a project's or all activity, Open the trash,
Workspace settings, Add an agent, New project, Bring a codebase, Switch project), and while typing, tasks by id, title or notes.

### 3.10 The plan screen

A Cloud workspace without a running plan sees only its plan card (and sign out). Agents
get the same refusal over MCP. Past due still works while Stripe retries.

### 3.11 God mode

For working on Leanear itself: resets and test data, in your face's menu. It exists
only under `next dev` on a local database (`lib/dev/god-mode.ts`); anywhere else the
menu row is gone and every procedure is a 404. Fill a demo project, add or clear
tasks, clear the activity, empty the trash, revoke keys never used, mark the
plan paid or unpaid, start over.

### 3.12 Keyboard

| Key            | Does                                                      |
| -------------- | --------------------------------------------------------- |
| C              | New task                                                  |
| ⌘K / Ctrl K    | Command menu                                              |
| G then H/B/A/S | Home, Board, Activity, Settings (at the level you are on) |
| 1 to 4         | Status of the open task                                   |
| Escape         | Close the top layer, or cancel a drag                     |

## 4. Live updates

Everyone sees the same board. The client polls `workspace.sync` with the last cursor every
3s while the tab is visible (and at once on focus). The server returns every project,
task and member row changed since the cursor (deletes come back as
tombstones), what other members just did, and the new activity for the open task. Your
own changes are optimistic and reconciled with the server's reply.

## 5. MCP

Endpoint: `https://cloud.leanear.app/mcp`. Streamable HTTP, stateless, JSON responses
(protocol `2025-06-18`, older versions accepted). Auth: `Authorization: Bearer lk_…`.
Requests are rate limited to 120 a minute per key.

```
claude mcp add --scope user --transport http leanear https://cloud.leanear.app/mcp --header "Authorization: Bearer lk_…"
```

| Tool            | Does                                                                     | Arguments                                                                |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `list_projects` | Projects and their keys                                                  | none                                                                     |
| `next_task`     | Top Todo assigned to this agent, with notes and activity. Empty if none. | `project?`                                                               |
| `list_tasks`    | Filtered tasks                                                           | `project?`, `status?`, `type?`, `assignee?` (`me` works), `q?`, `limit?` |
| `get_task`      | One task with notes and activity                                         | `id`                                                                     |
| `create_task`   | New task at the top of its column                                        | `project`, `title`, `notes?`, `type?`, `status?`, `assignee?`            |
| `update_task`   | Change title, notes, type or assignee                                    | `id`, `title?`, `notes?`, `type?`, `assignee?`                           |
| `move_task`     | New status, optional comment                                             | `id`, `status`, `comment?`                                               |
| `comment`       | Post on a task                                                           | `id`, `body`                                                             |
| `attach_image`  | Upload a base64 image; returns a Markdown link                           | `id`, `data`, `mime`                                                     |

The loop: assign tasks to the agent, then tell it "Work through my Leanear tasks." It calls
`next_task`, moves the task to Doing, does the work (following the repo's own
`CLAUDE.md`), comments what it did and how it checked it, and moves it to Done, or asks
in a comment and hands it back to a person when it's blocked.

## 6. Data model (Postgres)

```
user, session,
account, verification,
             Better Auth's tables (see prisma/schema.prisma)
workspaces   id, name, created_at, stripe_customer?, subscription?, billing_status?,
             paid_until?, cancels_at_end
members      id, workspace_id, kind(person|agent), user_id?, name, avatar_url?, role(owner|member),
             removed_at?, updated_at
agent_keys   id, member_id, hash, hint, last_used_at?, revoked_at?, created_at
invites      id, workspace_id, token, email?, created_by, expires_at, revoked_at?
projects     id, workspace_id, key, name, seq, created_at, updated_at, deleted_at?,
             deleted_by?, archived_at?, archived_by?
tasks        id, project_id, workspace_id, number, title, notes, type, status, assignee_id?,
             position(float), created_by, created_at, updated_at, deleted_at?, deleted_by?
activity     id, task_id, workspace_id, actor_id, kind, data(jsonb), body?, created_at
log          id, workspace_id, actor_id?, actor_name, action, subject_type, subject_id?,
             subject_label, project_id?, summary, created_at
images       id, workspace_id, task_id?, mime, bytes(bytea), created_by, created_at
```

`updated_at` on members, projects and tasks drives sync. Positions are floats: a
new task takes `min - 1` in its column and a drop takes the midpoint of its neighbours.

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

## 8. Billing (Cloud)

- On when `STRIPE_SECRET_KEY` is set. The app makes its own price the first time
  (lookup key `leanear_cloud_monthly`, $9 USD a month), so there's nothing to set up in
  Stripe but the keys, the webhook and the customer portal's settings.
- Starting the plan is Stripe Checkout in subscription mode, collecting the billing
  address and tax id so a company card gets a proper invoice. The return page records the
  subscription at once; the webhook (`/api/stripe`) keeps it true after that.
- A workspace runs while its subscription is active, trialing or past due. Otherwise the
  app shows the plan screen, and task writes and MCP calls are refused.
- Caps (10 projects, 20 people, 5 agents) are checked where each is made.

## 9. Settings (environment)

| Variable                       | Needed   | What                                                                                                           |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Always   | Postgres connection string. Locally the Docker one; in production Neon's pooled string.                        |
| `BETTER_AUTH_SECRET`           | Always   | 32+ random bytes (`openssl rand -base64 32`). Signs sessions.                                                  |
| `PUBLIC_URL`                   | Always   | Where the app runs, like `https://cloud.leanear.app`. Better Auth's base URL and the MCP URL shown in the app. |
| `GITHUB_ID`, `GITHUB_SECRET`   | Always   | GitHub OAuth app. Callback: `<PUBLIC_URL>/api/auth/callback/github`                                            |
| `STRIPE_SECRET_KEY`            | Cloud    | Stripe secret or restricted key. Turns on the plan and the caps.                                               |
| `STRIPE_WEBHOOK_SECRET`        | Cloud    | Signing secret of the webhook at `<PUBLIC_URL>/api/stripe`.                                                    |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional | Resend, for invites by email. Without them invites are links to copy.                                          |

There are no migrations: `pnpm db:push` makes the database match `prisma/schema.prisma`.

## 10. Out of scope for now

Email beyond invites, sign-in other than GitHub, notifications, MCP OAuth sign-in (so
ChatGPT and Gemini connectors wait; header-based clients work today), GitHub issue sync,
mobile apps, public boards, file attachments other than images, a light theme.

## 11. Site (leanear.app)

- **Hero:** pill, headline, one line, one button. The headline is two lines: "Project
  management for" dim, then one ink phrase that cycles (a small team, you and Claude, two
  co-founders, every agent), rolling up with a blur and a soft spring, each phrase centred
  so the line never jumps. The dot grid (34px) frames it and fades before the words.
- **One idea per section:** a heading, a short line, one thing to look at, at most one link.
- **The demo is the product as it is:** no keyboard hints, no chrome that isn't the
  product. A real board (Linear is the reference): columns with no dividers, a status icon
  and count on each head, every task its own card, the active tab a filled pill. A fixed
  height; extra cards fade out at the bottom. Two clickable tabs: Board and Settings (name,
  key, members, agents with masked keys). No action button in its bar, like the app. No looping morphs.
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
