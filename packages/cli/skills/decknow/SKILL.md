---
name: decknow
description: Create, edit, validate, inspect, comment-review, and build Decknow HTML slide decks. Use when the user wants an AI coding agent to make or improve a Decknow presentation, process Decknow browser comments, fix reusable Decknow rendering issues, or build a single-file HTML deck.
---

# Decknow

Use Decknow to create AI-agent-editable HTML presentations with semantic `dk-*`
elements and a local review loop.

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

## Read References As Needed

- `references/authoring.md`: deck structure, core elements, layout attributes,
  and good markup patterns.
- `references/cli.md`: command reference for dev, validate, inspect,
  screenshot, comments, build, and skills installation.
- `references/comments.md`: browser comment mode and how to process comment
  rounds.
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
