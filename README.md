# Decknow

![Decknow example deck capability slide](docs/assets/decknow-basic-slide-001.png)

Decknow is an AI-native slide deck runtime.

It turns presentations into semantic HTML that coding agents can write, diff,
validate, inspect, comment on, and build into a single shareable file.

## Why Decknow

Slide decks are usually visual artifacts. That makes them painful for AI agents
to edit reliably.

Decknow treats a deck as source code:

- semantic `dk-*` elements instead of pixel-positioned shapes
- browser preview with point-and-comment feedback for human review
- layout inspection commands for agent-side verification
- built-in responsive runtime for desktop and portrait viewports
- single-file HTML builds for easy sharing
- repo-local plugin packages for themes and components

## How to use

Give this to your AI coding agent:

```text
Clone https://github.com/danielwpz/decknow.git, then read
`decknow/skills/SKILL.md` and follow it.

Use Decknow to create or edit my slide deck as semantic `dk-*` HTML.
Run the dev server so I can review and leave browser comments.
Validate and inspect the deck before reporting done.
Build a single self-contained HTML file when ready.
```
