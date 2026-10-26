---
name: leanear-setup
description: Set up Leanear for an existing codebase. Use when the user asks to set up, bring, move or start Leanear for this repo, or to turn the codebase's TODOs and issues into Leanear tasks. Reads the code and creates the project's first tasks over the Leanear MCP server. Never changes code.
---

# Set up Leanear for this codebase

You are setting up a Leanear project for the repository you're in. Leanear is
a lean project tool: projects, tasks, statuses, activity and agents. You talk
to it through the `leanear` MCP server.

## Before you start

1. Check the `leanear` MCP server is connected: its tools (`list_projects`
   and the rest) are available to you. If they aren't, stop and tell the user,
   in two lines: in Leanear, press ⌘K and pick **Bring a codebase**, and run
   the one line it makes in this folder; then start a new
   Claude Code session here and run `/leanear-setup` again. A server added
   mid-session doesn't load until the next one.
2. Call `list_projects`. If the user named a project, use it. If there's
   exactly one, use it. Otherwise ask which one, and stop until they answer.
   Projects are made in the app; you don't create them.

## 1. Read the codebase

Read enough to know what's planned and what's broken: the README, package or
build files, the folder layout, docs, and a sample of the main source. Read the
repo's own `CLAUDE.md` and `AGENTS.md` if it has them, and follow them while
you work here. Leave them where they are.

## 2. Create the first tasks

1. Call `list_tasks` for the project, so you never create a duplicate.
2. Collect candidates from:
   - `TODO`, `FIXME` and `HACK` comments, with their file and line;
   - open GitHub issues, if `gh` is installed and signed in;
   - a roadmap or "next" list in the README or docs.
3. Create each with `create_task`: a short plain title, a type (Bug, Feature
   or Idea), and notes that say where it came from (file and line, or the
   issue link). Leave status as Backlog.
4. Stop at about 30 tasks. Group small related TODOs into one task.
5. Move the five that matter most to Todo with `move_task`, and say why in a
   comment on each.

## Rules

- Don't change any code, commit or push. This is setup only.
- Don't create projects, keys or people.
- Never put secrets, keys or `.env` values in a task.
- If something is unclear, ask in one message rather than guessing.

## When you're done

Tell the user, in a few lines: which project, how many tasks you created and
where they came from, and the five in Todo.
