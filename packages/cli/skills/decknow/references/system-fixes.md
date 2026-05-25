# Deck Fixes Versus System Fixes

Prefer fixing the reusable layer when feedback points to a reusable capability.

Fix the deck when:

- the requested change is specific content or copy
- a slide needs a declarative attribute already supported by Decknow
- a private deck needs local-only business content changes

Fix the system when:

- multiple decks would hit the same layout issue
- a component lacks a semantic attribute
- responsive behavior fails in a viewport class
- comment mode, inspect, build, or validate behavior is wrong
- a theme token or plugin default is the real source of the issue

When changing system behavior:

- update runtime/schema/plugin docs as needed
- add focused tests before or with the fix
- run `pnpm build:runtime`, `pnpm lint`, `pnpm test`, and `pnpm validate`
- avoid patching one deck with raw CSS when a runtime capability is warranted
