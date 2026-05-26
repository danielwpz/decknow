# Verification

Run verification commands from the Decknow repository root when using a source
checkout.

For deck-only edits:

```bash
pnpm exec decknow validate path/to/deck.html
pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 1440x900 --summary
```

For responsive or visual issues, inspect at least one desktop viewport and one
portrait viewport:

```bash
pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 1440x900 --summary
pnpm exec decknow inspect path/to/deck.html --slide 1 --viewport 430x932 --summary
```

For generated screenshots:

```bash
pnpm exec decknow screenshot path/to/deck.html --slide 1 --viewport 1440x900
```

For distributable output:

```bash
pnpm exec decknow build path/to/deck.html --out dist/deck.html
```

The build command inlines the standard runtime and removes the dev comment
overlay. The resulting HTML file can be opened directly in a browser.

For runtime, schema, CLI, or plugin changes:

```bash
pnpm build:runtime
pnpm lint
pnpm test
pnpm validate
```

Commit the generated `packages/runtime-standard/decknow.js` when runtime source
changes.
