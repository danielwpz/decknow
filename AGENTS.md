# Agent Guide

This file applies to the whole Decknow repository.

## Project Purpose

Decknow is an AI-native HTML presentation runtime. Treat it as a structured,
declarative slide source format for AI coding agents, not as a pixel-level slide
designer.

The core product idea is:

- users describe slides, review rendered output, and leave comments;
- agents edit the source deck and/or the Decknow system;
- the runtime, schema, themes, and plugins own rendering behavior;
- decks stay mostly semantic and declarative.

When a problem is caused by a reusable runtime, theme, schema, plugin, or CLI
behavior, fix the system. Avoid patching a single deck with one-off CSS unless
the deck genuinely needs an escape hatch.

## Repository Layout

```txt
packages/runtime-standard   Browser runtime and built-in theme/components
packages/schema             Element manifest and schema checks
packages/cli                dev server, validate, screenshot, inspect, comments
docs                        Design notes and workflow docs
examples                    Public example decks only
scripts                     Build and precommit helpers
```

`packages/runtime-standard/src/` is the source for the runtime. The generated
browser bundle is `packages/runtime-standard/decknow.js`. If runtime source
changes, run `pnpm build:runtime` and commit the bundle when it changes.

Private or local decks belong under ignored runtime directories such as
`.decknow-runs/private/`, not under `examples/`.

## Common Commands

Install dependencies:

```bash
pnpm install
```

Run the default dev server:

```bash
pnpm dev
```

Run a dev server for a specific deck:

```bash
pnpm exec decknow dev path/to/deck.html
```

Read latest submitted comments:

```bash
pnpm comments
pnpm exec decknow comments latest
```

Validate example decks:

```bash
pnpm validate
```

Inspect layout metrics:

```bash
pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 1440x900 --summary
```

Capture a screenshot:

```bash
pnpm exec decknow screenshot path/to/deck.html --slide 1 --viewport 1440x900
```

Run checks:

```bash
pnpm lint
pnpm test
pnpm build:runtime
```

Before committing, prefer:

```bash
pnpm precommit
```

## Contribution Rules

- Prefer small, system-level changes with tests.
- Keep decks declarative. Use `dk-*` elements and attributes before raw styles.
- Do not add broad styling controls just to solve one slide. First ask whether
  the right fix is a component, theme token, schema update, or plugin behavior.
- When adding or changing DSL attributes, update the schema manifest and tests.
- When changing runtime source, update the generated runtime bundle.
- When changing CLI behavior, add CLI/client tests where practical.
- Keep public examples generic. Do not place personal, customer, or private
  business content in `examples/`.
- Respect existing uncommitted changes. Do not revert user work unless asked.

## DSL Design Principles

Decknow should be easy for AI agents to write, diff, repair, and verify.

Good Decknow markup states intent:

```html
<dk-grid columns="3" gap="lg">
  <dk-region frame tone="muted">
    <dk-heading level="3">First group</dk-heading>
    <dk-list>
      <dk-item>Primary item</dk-item>
      <dk-item>Supporting item</dk-item>
    </dk-list>
  </dk-region>
</dk-grid>
```

Avoid encoding layout as fragile pixel instructions:

```html
<div style="position:absolute; left:742px; top:128px">...</div>
```

Core attributes should describe reusable presentation intent:

- layout: `layout`, `columns`, `gap`, `align`, `valign`
- semantics: `level`, `ordered`, `marker`, `tone`
- component behavior: `direction`, `density`, `emphasis`, `surface`

Use `dk-raw` only as an explicit escape hatch when the DSL cannot express the
need yet. If the same escape hatch appears repeatedly, promote it into a system
capability.

## Current Authoring Capabilities

Core content:

- `dk-title`, `dk-subtitle`, `dk-heading`, `dk-text`
- `dk-list`, `dk-item`, `dk-code`, `dk-quote`, `dk-link`
- `dk-table`, `dk-row`, `dk-cell`

Core layout:

- `dk-grid`, `dk-region`, `dk-stack`
- slide-level layout and alignment attributes

Diagram/basic plugin:

- `dk-flow`, `dk-flow-step`
- `dk-pyramid`, `dk-pyramid-level`

Useful current patterns:

```html
<dk-list marker="status">
  <dk-item tone="success">supported capability</dk-item>
  <dk-item tone="danger">missing capability</dk-item>
</dk-list>
```

```html
<dk-flow direction="vertical">
  <dk-flow-step>
    <dk-heading level="3">Step title</dk-heading>
    <dk-text>Step body text.</dk-text>
  </dk-flow-step>
</dk-flow>
```

## Comment Mode Workflow

`decknow dev` injects the local comment overlay. Users can select rendered
elements, save comments, and submit a comment round for an agent to process.

Agent workflow:

1. Run or use the dev server for the target deck.
2. Read comments with `pnpm exec decknow comments latest`.
3. Decide whether each issue is a deck content issue or a system issue.
4. Fix the right layer.
5. Validate, test, and reopen or refresh the dev page for review.

Do not assume comment text always implies a single-page patch. Many comments
are signals that Decknow needs a better component, theme token, or interaction.

## Verification Expectations

For narrow changes, run the focused test plus `pnpm lint`.

For runtime, schema, plugin, or CLI behavior changes, run:

```bash
pnpm lint
pnpm test
pnpm validate
```

For visual behavior, also use `decknow inspect` or `decknow screenshot` on the
affected deck and viewport. If a local dev server is already running, reuse it.

## Style Notes

- This repo uses ESM JavaScript.
- Formatting is handled by Biome.
- Tests use Vitest and `happy-dom` where browser simulation is enough.
- Keep comments sparse and useful.
- Prefer structured APIs and existing helpers over ad hoc string manipulation.
- Keep generated and ignored runtime artifacts out of commits unless they are
  intentionally tracked build outputs.
