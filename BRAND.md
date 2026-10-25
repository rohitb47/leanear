# Leanear Brand

> How Leanear looks and sounds, on the site (leanear.app) and in the app
> (cloud.leanear.app). It builds on Rohit's global brand (`~/.claude/BRAND.md`:
> voice, layout, interface rules, motion); this file adds what is Leanear's own
> and wins where they differ. Read both before any page, screen, copy or design
> work.
>
> When Rohit corrects something Leanear-only, change the rule here the same
> day. Anything true of every project goes in the global file instead.

**Version 1.0 · 25 Oct 2026** · Lives at the root of the `leanear` repo.

---

## 1. The brand

- **What it is:** one board for a small team and all its agents. Linear, but
  leaner. Said plainly, never as a pitch.
- **Who it's for:** two to five people (co-founders, a contractor) building one
  product with coding agents (Claude Code, Cursor, Codex, Copilot, Windsurf).
  The pain is nobody, human or agent, knowing where it's at and what's next.
  Lead with that pain, in Rohit's words; Linear is the exit for bigger teams,
  not the enemy. Rohit, 25 Oct, office hours.
- **Feel:** dark, calm, spacious, confident by restraint. It sits next to
  Linear and Claude: black like them, but sparser and lighter in weight.
- **Mark:** a soft square with a round hole, one solid shape, symmetric on
  every axis. Corners round at about a quarter of the side; the hole is 77%
  of the width. Drawn in code: `MARK_PATH` in `packages/ui/src/mark.tsx`, used
  by the nav, footer, favicon, share image and the app. Ink on dark; never
  in the accent.

## 2. Colour

- **Dark only, on pure black.** Rohit, 25 Oct: "I liked the dark website by
  default." This overrides the global System, Light, Dark rule for Leanear.
- **Three steps, never more:** black `#000` page, `#101011` panels with one
  hairline edge, `#1b1b1d` pieces inside them. Ink `#ededed`, muted `#a1a1a1`,
  pale `#5c5c60`. A raised card (the Leanear column, the main plan) is
  `#1b1b1d` with a soft shadow.
- **Accent:** orange `#ff6a3d`, **once per view**: the main button. Ticks,
  spinners, links and active states are ink or muted.
- **Other products' logos keep their own colours** (agents, rivals, Docker,
  the Claude mark on the board). Rohit, 25 Oct: "bring the original colors".

## 3. Type

- **Bricolage Grotesque** for headings, at 520. **Geist** for body, at 400 and
  480 for emphasis. Nothing heavier than 520. (Hanken Grotesk was tried on
  25 Oct and rejected: "The font that we picked before for headers was good.")
- **Geist Mono** for ids (`LEA-12`), commands, keys and small labels.
- **Mrs Saint Delafield** only for Rohit's signature.
- **Headlines:** two lines, tapering. Dim the first line or the connector
  words (pale), keep the line that matters in ink.

## 4. Pages

- **The hero is the words.** Pill, headline, one line, one button. The headline
  is two lines, never three: "Project management for" dim, then one ink phrase
  that cycles (a small team, you and Claude, two co-founders, every agent) rolling
  up (the old phrase out the top, the next in from below, a soft spring),
  each phrase centred so the line never jumps. The morph is too much at
  headline size. The brand's
  dot grid (34px, seeded, mirrored on both axes) frames it and fades out
  before it reaches the words.
- **One idea per section.** A heading, a short line, one thing to look at, at
  most one link. No footnotes under footnotes, no rows of links.
- **Show the product as it is.** The board demo is the hero art, without
  decoration: no keyboard hints, no chrome that isn't the product. It looks
  like a real board (Linear is the reference): columns with no dividers, a
  status icon and count on each head, every task its own card with space
  between, the active tab a filled pill. A fixed height that never grows:
  extra cards fade out at the bottom edge.
- **State changes glide, never jump.** In the demo every layout change uses
  Motion's `layout` and `layoutId`: cards between columns, the activity pill
  resizing to its text, the tab and file selection sliding, the action
  button's label. Drags and throws stay on our spring engine.
- **The demo window has an action bar** on the right of its header: New task
  on Board, New file on Context. The editor colours Markdown like a real one.
- **The demo has three tabs, all clickable:** Board, Context (the
  project's `.md` files: `CLAUDE.md`, `AGENTS.md`, `DESIGN.md`, `SPEC.md`),
  readable and editable in place, and Settings (the project's
  name and key, and its members, agents with masked keys; New agent adds one). "Brief" is retired as a word. No looping morphs in the demo.
- **Pricing:** Cloud is $9 a month, flat: 10 projects, unlimited tasks, up to
  20 people, 5 agents, no trial. Self-host is free (AGPL) with no caps.
  Nothing else is free; never say "free" about Cloud. Three equal plan cards
  ending on one line, buttons at the bottom: Cloud (raised, the only orange
  button), Self-host, and "Bigger than this", a friendly no that sends
  bigger teams to Linear. No sliders.
- **The last call** is a feeling, not a price: "Stay lean. Stay cool." with
  "Get started" and "Self-host". No numbers there, and not a GitHub plea.
- **Commands** sit in one grey box with Copy, on one line, cut with an
  ellipsis; Copy still copies all of it.
- **Copy is an icon,** never the word: a square button whose copy icon swaps
  to a tick in place, so its width never changes. The tick shows at once.
- **Feature cards idle.** Each card's drawing has one quiet loop that acts out
  its sentence (a project gets picked, two tasks swap places, the status
  walks along, new activity arrives, the agents lift in a wave). Only once
  the card is on screen; none for reduced motion.
- **Comparisons** only say what's true and checkable; when in doubt, cut the
  row.
- **Docs** follow the Mintlify shape: sidebar, eyebrow, title, grey lead,
  numbered steps, previous and next.

## 5. In the app

- The same tokens, type and accent rule as the site. One look across both.
- Agents and people look the same in activity: a name and a face, no "bot" tag.

## 6. Decided, so we don't go back

| When   | Decision                                                                                               | Why                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 25 Oct | Bricolage headings, Geist body                                                                         | Hanken Grotesk tried and rejected the same day.                                               |
| 25 Oct | Dark only, pure black                                                                                  | "I liked the dark website by default." Quiet light tried and rejected.                        |
| 25 Oct | Plan cards, no price slider                                                                            | "The pricing section is so shit."                                                             |
| 25 Oct | Cloud $9 flat, no trial; only self-host is free                                                        | "The product is not at all free. Only the self-host thing is free."                           |
| 25 Oct | Cloud caps: 10 projects, 20 people, 5 agents; tasks unlimited                                          | Lean on purpose; bigger teams get pointed elsewhere.                                          |
| 25 Oct | No "It's on GitHub" closer                                                                             | The last call is to start.                                                                    |
| 25 Oct | Coding agents only on the site                                                                         | ChatGPT, Grok, Dots and Grok Bot need MCP sign-in we don't have.                              |
| 25 Oct | Logos in their own colours                                                                             | Tried one monochrome tile style; Rohit wanted the originals back.                             |
| 25 Oct | No exact copies of other marks in our space                                                            | Audyr sells to the same people; a copy reads as a knock-off.                                  |
| 25 Oct | The mark: soft square, round hole                                                                      | Rohit picked it from mitte's identity (water, not software); pure geometry.                   |
| 25 Oct | "Brief" becomes Context                                                                                | The agentic era has too many .md files; Leanear holds them like Vercel holds env vars.        |
| 25 Oct | Agents heading is "Your agents join the team"                                                          | "Your agent can do everything you can" didn't land.                                           |
| 25 Oct | Small team + agents, not one person; hero is "Project management for" plus a cycling phrase, two lines | Office hours: the real pain was Rohit and his co-founder never agreeing on the current state. |
