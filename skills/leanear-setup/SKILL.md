---
name: leanear-setup
description: Set up Leanear for an existing codebase. Use when the user asks to set up, bring, move or start Leanear for this repo, or to turn the codebase's TODOs and issues into Leanear tasks. Reads the code, writes the project's context files and creates its first tasks over the Leanear MCP server. Never changes code.
---

# Set up Leanear for this codebase

You are setting up a Leanear project for the repository you're in. Leanear is
a lean project tool: projects, tasks, statuses, activity, agents, and each
project's context (its `.md` files). You talk to it through the `leanear` MCP
server.

## Before you start

1. Check the `leanear` MCP server is connected. If it isn't, stop and tell the
   user to add it (https://leanear.app/docs/mcp), then try again.
2. Call `list_projects`. If the user named a project, use it. If there's
   exactly one, use it. Otherwise ask which one, and stop until they answer.
   Projects are made in the app; you don't create them.

## 1. Read the codebase

Read enough to describe it truthfully: the README, package or build files, the
folder layout, existing `CLAUDE.md`, `AGENTS.md` or other agent files, docs,
and a sample of the main source. Note the stack, how to run and check it, the
conventions the code already follows, and anything the existing docs say
agents must or must not do.

## 2. Write the context

Call `list_files` first. For each file below:

- If it doesn't exist in Leanear, write it with `put_file`.
- If it exists, read it with `get_file`, and only add what's missing. Never
  rewrite or delete what's there without asking.
- If the repo already has the file, start from its content.

Files:

- `CLAUDE.md`: what the project is in two lines, the stack, how to run and
  check it, and the rules an agent must follow here.
- `AGENTS.md`: how agents work on this project in Leanear: take tasks with
  `next_task`, comment what was done, move tasks to Done, ask in a comment when
  unsure.
- `DESIGN.md`: only if the code has a clear look (tokens, a design system, a
  brand file). Describe what's there; don't invent a style.

Keep every file short: rules, not inventories. Only write what's true in the
code today.

## 3. Create the first tasks

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
- Never put secrets, keys or `.env` values in a context file or a task.
- If something is unclear, ask in one message rather than guessing.

## When you're done

Tell the user, in a few lines: which project, which context files you wrote or
added to, how many tasks you created and where they came from, and the five in
Todo.
