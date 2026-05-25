# Browser Comments

`pnpm exec decknow dev path/to/deck.html` injects the local comment overlay.

The user can click the floating comment button, select rendered slide elements,
write comments, and submit a comment round. Rounds are stored under
`.decknow-runs/comments`.

Read the latest round:

```bash
pnpm exec decknow comments latest
```

Other useful commands:

```bash
pnpm exec decknow comments list
pnpm exec decknow comments show 3
```

When processing comments:

- Treat comments as rendered-output feedback, not necessarily as deck-only tasks.
- Decide whether the issue belongs in deck content or the Decknow system.
- Fix reusable runtime, theme, schema, CLI, or plugin issues in the system.
- Keep private decks out of `examples/`; use ignored local paths such as
  `.decknow-runs/private/`.
