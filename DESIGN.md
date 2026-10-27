---
version: alpha
name: shipth.at
description: Dark, calm and spacious. One board for a small team and its agents.
colors:
  primary: "#ededed"
  page: "#000000"
  paper: "#101011"
  paper2: "#232325"
  card: "#1b1b1d"
  on-primary: "#000000"
  muted: "#a1a1a1"
  pale: "#5c5c60"
  line: "rgba(255, 255, 255, 0.1)"
  sep: "rgba(255, 255, 255, 0.07)"
  tint: "rgba(255, 255, 255, 0.05)"
  tint2: "rgba(255, 255, 255, 0.09)"
  accent: "#ff6a3d"
  on-accent: "#ffffff"
  green: "#30d158"
  info-bg: "rgba(10, 132, 255, 0.15)"
  info-ink: "#7cb6ff"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 76px
    fontWeight: 520
    lineHeight: 1.04
    letterSpacing: -0.045em
  headline:
    fontFamily: Bricolage Grotesque
    fontSize: 48px
    fontWeight: 520
    lineHeight: 1.06
    letterSpacing: -0.035em
  lead:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: Geist
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1
  label:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: 400
    letterSpacing: 0.01em
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 18px
  full: 9999px
spacing:
  s1: 4px
  s2: 8px
  s3: 12px
  s4: 16px
  s5: 24px
  s6: 32px
  s7: 48px
  s8: 64px
  s9: 96px
  section: 144px
  gutter: 48px
  width: 1080px
  text: 600px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 24px
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: 44px
    padding: 0 24px
  window:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.xl}"
---

# shipth.at

## Overview

One board for a small team and all its agents. Linear, but leaner. For two to
five people building one product with coding agents, where nobody, human or
agent, knows where it's at and what's next. Lead with that pain; Linear is the
exit for bigger teams, not the enemy.

Dark, calm,
spacious, confident by restraint: black like Linear and Claude, sparser and
lighter in weight.

Dark only, on pure black. This overrides row-taste's System, Light, Dark
("I liked the dark website by default"; a quiet light was tried and rejected).

The site (`apps/site`) is the reference. Its tokens live in
`apps/site/app/globals.css`, and the app (`apps/web/app/globals.css`) carries the
same ones; this file and those say the same thing. The app is black like the site,
edge to edge, with the demo's bar, tabs and cards on it: no framed window around it.

## Colors

- **Three surfaces, never more:** `page` is pure black, `paper` is a panel with
  one hairline edge, `card` and `paper2` are pieces inside it. Each step is a
  little lighter; nothing else marks depth.
- **Ink** (`primary`) for text that matters, `muted` for the line under it,
  `pale` for the dimmed words in a headline.
- **Accent:** orange, once per view, on the main button. Ticks, spinners, links
  and active states are ink or muted.
- Other products' logos keep their own colours.

## Typography

- **Bricolage Grotesque** for headings, at 520. **Geist** for body, at 400 and
  480 for emphasis. Nothing heavier than 520. Hanken Grotesk was tried for
  headings and rejected.
- **Geist Mono** for ids (`SHI-12`), commands, keys and small labels.
- **Mrs Saint Delafield** only for Rohit's signature.
- Headlines are two lines, tapering: the first line or the connector words
  `pale`, the line that matters in ink. On phones the display size drops to 40px
  and the headline to 34px.

## Layout

One width (`width`, 1080px) with `gutter` either side, sections `section` apart
(96px and a 20px gutter on phones). Every gap comes from the `s1` to `s9` scale.
Section heads are centred, at most 720px wide.

## Elevation & Depth

Depth is the surface steps. A raised card (the main plan, the shipth.at column) is
`card` with a soft shadow. The site's product window gets the one deep shadow on
the page. In the app everything placed on black (cards, settings rows, dialogs,
menus) is `paper` with a hairline; fields and secondary buttons are the soft tint.

## Shapes

- **The mark:** a soft square with a round hole, one solid shape, symmetric on
  every axis. Corners round at about a quarter of the side; the hole is 77% of
  the width. Drawn in code as `MARK_PATH` in `packages/ui/src/mark.tsx`, used
  wherever the mark appears. Ink on dark, never the accent.
- Buttons and pills are capsules (`full`). Small controls `sm` to `md`, cards
  `lg`, the product window `xl`.

## Components

- **Buttons:** `button-primary` for the one action that moves you on;
  `button-secondary` for the rest, gaining a hairline ring on hover. Both press
  to 0.97.
- **Waiting shows the loader:** Apple's activity indicator (eight blades, the
  highlight walking round, in the text's colour), as in Provida. A button that
  waits on the server keeps its label in place, hidden, with the loader over it,
  so it never changes width.
- **Copy is an icon,** never the word: a square button whose copy icon swaps to
  a tick in place, at once, so its width never changes.
- **Commands** sit in one grey box with Copy, on one line, cut with an
  ellipsis; Copy still copies all of it.
- **Activity:** agents and people look the same, a name and a face, no "bot"
  tag.

## Do's and Don'ts

- Do keep the accent to one element per view.
- Do keep everything at or under weight 520.
- Don't add a fourth surface colour or a gradient.
- Don't put the mark in the accent, or copy another product's mark.
