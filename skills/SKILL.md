---
name: decknow
description: Create, edit, validate, inspect, comment-review, and build Decknow HTML slide decks. Use when the user wants an AI coding agent to make or improve a Decknow presentation, process Decknow browser comments, fix reusable Decknow rendering issues, or build a single-file HTML deck.
---

# Decknow

Use Decknow to create AI-agent-editable HTML presentations with semantic `dk-*`
elements and a local review loop.

## Source Checkout Setup

Work inside a Decknow source checkout:

1. `cd decknow`
2. Run `pnpm install` if dependencies are missing.
3. Create or edit deck files inside the repository unless the user gives an
   explicit external path. A safe scratch location is `.decknow-runs/<name>.html`.
4. Use `pnpm exec decknow ...` from the repository root for dev, validate,
   inspect, screenshot, comments, and build commands.

When authoring a deck inside the repository, make the runtime script path
relative to the deck file. For a deck at the repository root, use:

```html
<script src="./packages/runtime-standard/decknow.js"></script>
```

For a deck under `.decknow-runs/`, use:

```html
<script src="../packages/runtime-standard/decknow.js"></script>
```

## Content Ownership

Decknow is a deck authoring tool. It helps turn the user's ideas, source
materials, and review feedback into a presentation; it is not the source of the
deck's business facts, thesis, metrics, or citations.

Use content supplied by the user, existing deck/source files, or assumptions the
user has explicitly confirmed. If the goal, audience, narrative, or source
material is missing, ask the user for the minimum information needed before
authoring. Do not invent facts, metrics, customers, funding numbers, quotes, or
citations. For incomplete but non-blocking details, create a clearly reviewable
draft and use the browser comment loop to refine it with the user.

## Workflow

1. Read the deck source, or create a new `.html` deck from the minimal pattern in
   `references/authoring.md`.
2. Write semantic Decknow markup first. Avoid raw CSS and pixel positioning.
3. Run the dev server so the user can review and leave browser comments:

   ```bash
   pnpm exec decknow dev path/to/deck.html
   ```

4. Read comments when the user submits a round:

   ```bash
   pnpm exec decknow comments latest
   ```

5. Validate and inspect before reporting done:

   ```bash
   pnpm exec decknow validate path/to/deck.html
   pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 1440x900 --summary
   ```

6. Build a distributable single HTML file when requested:

   ```bash
   pnpm exec decknow build path/to/deck.html --out dist/deck.html
   ```

7. If the user wants a web link for the finished deck, read
   `references/publishing.md` and publish the built deck through `lark-cli apps`
   when that CLI is available.

## Read References As Needed

- `references/authoring.md`: deck structure, core elements, layout attributes,
  and good markup patterns.
- `references/cli.md`: command reference for dev, validate, inspect,
  screenshot, comments, build, and source-checkout command usage.
- `references/comments.md`: browser comment mode and how to process comment
  rounds.
- `references/publishing.md`: optional Feishu/Lark Miaoda publishing flow for
  turning a built deck into a web-accessible link.
- `references/verification.md`: validation, inspect, screenshot, responsive
  checks, and single-file build checks.
- `references/system-fixes.md`: when to fix the deck versus runtime, theme,
  schema, CLI, or plugin code.

## Built-In Plugin Skills

The standard runtime bundles repo-local plugins. When using a plugin-specific
component, read that plugin's installed skill if available:

- `decknow-plugin-diagram-basic`: `dk-flow`, `dk-flow-step`, `dk-pyramid`,
  `dk-pyramid-level`
- `decknow-theme-terminal-green`: default theme behavior and token ownership

Deck authors normally include only the standard runtime script. Do not add extra
plugin script tags for built-in plugins.
