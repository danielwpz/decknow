---
name: decknow-plugin-diagram-basic
description: Use Decknow's built-in diagram-basic plugin. Use when authoring semantic process flows with dk-flow and dk-flow-step, or layered hierarchy diagrams with dk-pyramid and dk-pyramid-level.
---

# Decknow Diagram Basic

Use this plugin skill when a deck needs simple semantic diagrams.

## Flow

Use `dk-flow` for ordered processes. Put arbitrary Decknow content inside
`dk-flow-step`; a step can contain headings, text, lists, tables, links, or
nested layout elements.

```html
<dk-flow direction="vertical">
  <dk-flow-step>
    <dk-heading level="3">Collect context</dk-heading>
    <dk-text>Read project history, owners, and decisions.</dk-text>
  </dk-flow-step>
  <dk-flow-step>
    <dk-heading level="3">Prepare evidence</dk-heading>
    <dk-text>Package citations for the agent.</dk-text>
  </dk-flow-step>
</dk-flow>
```

Attributes:

- `direction="auto|horizontal|vertical"`
- `density="low|medium|high"`
- `responsive="auto|none"`

## Pyramid

Use `dk-pyramid` for layered hierarchy or maturity diagrams.

```html
<dk-pyramid>
  <dk-pyramid-level>Strategy</dk-pyramid-level>
  <dk-pyramid-level>Runtime</dk-pyramid-level>
  <dk-pyramid-level>Data foundation</dk-pyramid-level>
</dk-pyramid>
```

Attributes:

- `label-placement="auto|inside|side|callout"`
- `fit="auto|fill"`
- `tip-ratio="0.18"`

Do not hand-code SVG geometry for these diagrams unless the plugin cannot
express the structure.
