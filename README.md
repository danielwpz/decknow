# Decknow

Early local development workspace for an AI-native HTML slides runtime.

This README only documents what exists in this repository today. Distribution,
hosting, CDN, package names, and installer choices are intentionally not specified yet.

## Local Development

Install dependencies:

```bash
pnpm install
```

Preview the current example deck:

```bash
pnpm dev
```

`decknow dev` starts a local development server. In development it injects a
comment overlay and accepts local comment submissions so an AI agent can read
them later. The deck rendering itself is still HTML-backed.

The dev server starts on `127.0.0.1:4317` by default. If that port is already in
use, it tries the next ports in sequence and prints the actual URL.

The example HTML files also work when opened directly from the filesystem in a
presentation-like static mode because they use a relative runtime script:

```txt
examples/project-overview.html
examples/basic.html
```

Direct file opening does not include the development comment overlay.

Validate the current example deck:

```bash
pnpm validate
```

Print CLI help:

```bash
pnpm exec decknow --help
pnpm exec decknow inspect --help
pnpm exec decknow comments --help
```

Capture the first slide:

```bash
pnpm screenshot
```

Inspect rendered layout metrics for a slide:

```bash
pnpm inspect
```

The inspect command prints JSON for the active slide, including element boxes,
selected computed styles, slide-relative margins, overflow flags, and basic
diagnostics. It is intended for agent/debug workflows where screenshots are not
precise enough:

```bash
pnpm exec decknow inspect examples/project-overview.html -s 4 -q "dk-grid" -v 1440x900
```

Use `--summary` when the full computed-style payload is too noisy:

```bash
pnpm exec decknow inspect examples/project-overview.html -s 4 -q "dk-grid" -v 1440x900 -m
```

Read the latest submitted development comment round:

```bash
pnpm comments
pnpm exec decknow comments list
pnpm exec decknow comments show 1
```

## Current Packages

```txt
packages/runtime-standard   Browser runtime for the current HTML DSL
packages/schema             First-pass schema and element manifest
packages/cli                Local dev/validate/screenshot/inspect/comments CLI
examples/basic.html         First example deck
```

The current built-in default theme is `terminal-green`. It is intentionally kept
inside `packages/runtime-standard` for the first local-development version so a
deck still only needs one runtime script. Its visual direction follows the
current `frontend-slides` default style: black stage, monospace typography,
green primary accents, orange contrast accents, and code-review style translucent
surfaces.

## Responsive Runtime Notes

The runtime owns viewport fitting, keyboard navigation, vertical touch swipe
navigation, slide progress placement, and generic responsive behavior for core
layout primitives such as `dk-grid`, `dk-stack`, and `dk-table`.

Themes own design tokens: colors, typography sizes, spacing, surfaces, shadows,
and their compact/tablet/mobile token values. The current implementation uses
plain CSS variables, media queries, container queries, and Pointer Events. No
responsive helper SDK is used.

Desktop viewports keep the default 16:9 slide stage. Tablet and iPad viewports
adapt the stage closer to the device: 4:3 in landscape and 3:4 in portrait. Small
portrait phones switch to a 9:16 stage so text-heavy slides remain inspectable
without adding a mobile editor mode.

## Current DSL Scope

The first schema covers Markdown-like basics:

- `dk-title`
- `dk-subtitle`
- `dk-heading`
- `dk-text`
- `dk-list` / `dk-item`
- `dk-code`
- `dk-quote`
- `dk-link`
- `dk-table` / `dk-row` / `dk-cell`

Core layout primitives are included because simple layout control is not a plugin concern:

- `dk-grid`
- `dk-region`
- `dk-stack`
- alignment attributes

`dk-raw` exists as an explicit escape hatch for raw HTML/CSS/JS when the core DSL is insufficient.

`dk-code` uses its `language` attribute as metadata. Markdown fence markers such
as ` ```ts ` and ` ``` ` are authoring syntax and should not be rendered inside
the code block. Syntax highlighting is intentionally out of the core MVP; it
should be added later through an optional highlighter plugin or component pack.

## Not Decided Yet

- Public package names
- CDN shape
- Installer/distribution method
- Plugin loading format
- Production documentation structure
