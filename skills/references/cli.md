# CLI Reference

Use `pnpm exec decknow <command>` from the Decknow source repository root. Run
`pnpm install` first when dependencies are missing.

## Core Commands

Install agent skills:

```bash
pnpm exec decknow skills install
pnpm exec decknow skills install --dir ./skills
```

Preview a deck with browser comments enabled:

```bash
pnpm exec decknow dev path/to/deck.html
pnpm exec decknow dev path/to/deck.html --port 4317
```

Validate basic deck structure:

```bash
pnpm exec decknow validate path/to/deck.html
pnpm exec decknow validate path/to/deck.html --json
```

Build a self-contained HTML file:

```bash
pnpm exec decknow build path/to/deck.html --out dist/deck.html
```

Read submitted browser comments:

```bash
pnpm exec decknow comments list
pnpm exec decknow comments latest
pnpm exec decknow comments show 3
```

Inspect rendered layout metrics:

```bash
pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 1440x900 --summary
pnpm exec decknow inspect path/to/deck.html --all --selector dk-grid --viewport 430x932 --summary
```

Capture screenshots:

```bash
pnpm exec decknow screenshot path/to/deck.html --slide 1 --viewport 1440x900
pnpm exec decknow screenshot path/to/deck.html --all --out .decknow-runs/latest
```

## Common Options

- `entry`: HTML deck source file.
- `--port`: starting local dev port. Use `0` for any free port.
- `--out`: output file or directory, depending on command.
- `--slide`: 1-based slide number.
- `--all`: inspect or screenshot every slide.
- `--step`: set the deck step/click state before inspect or screenshot.
- `--viewport`: viewport as `WIDTHxHEIGHT`, for example `1440x900`.
- `--selector`: CSS selector scoped to the active slide for `inspect`.
- `--summary`: compact `inspect` output for agent review.
- `--json`: machine-readable `validate` output.
- `--dir`: target directory for `skills install`; defaults to `./skills`.

Use `pnpm exec decknow <command> --help` when exact flags are uncertain.
