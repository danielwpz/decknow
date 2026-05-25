# Decknow Authoring

## Minimal Deck

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="./packages/runtime-standard/decknow.js"></script>
  </head>
  <body>
    <dk-deck theme="terminal-green">
      <dk-slide layout="grid" align="left">
        <dk-heading level="2">Clear thesis</dk-heading>
        <dk-text>One sentence that frames the slide.</dk-text>
        <dk-grid columns="2" gap="lg">
          <dk-region frame>
            <dk-heading level="3">Left idea</dk-heading>
            <dk-list>
              <dk-item>short point</dk-item>
              <dk-item>supporting point</dk-item>
            </dk-list>
          </dk-region>
          <dk-region frame tone="accent">
            <dk-heading level="3">Right idea</dk-heading>
            <dk-text>Concise evidence or implication.</dk-text>
          </dk-region>
        </dk-grid>
      </dk-slide>
    </dk-deck>
  </body>
</html>
```

## Core Elements

Content:

- `dk-title`, `dk-subtitle`, `dk-heading`, `dk-text`
- `dk-list`, `dk-item`, `dk-code`, `dk-quote`, `dk-link`
- `dk-table`, `dk-row`, `dk-cell`

Layout:

- `dk-grid`, `dk-region`, `dk-stack`
- `layout`, `columns`, `gap`, `align`, `valign`
- `width="auto|prose|wide|full"`
- `content-width="auto|prose|wide|full"` on `dk-slide`, `dk-region`, or
  `dk-stack`

Use `width="full"` or `content-width="full"` for structural content such as wide
tables. Keep prose text at the default width unless the user asks otherwise.

## Patterns

Status list:

```html
<dk-list marker="status">
  <dk-item tone="success">supported capability</dk-item>
  <dk-item tone="danger">missing capability</dk-item>
</dk-list>
```

Full-width evidence table:

```html
<dk-slide layout="grid" align="left" content-width="full">
  <dk-heading level="3">Market proof</dk-heading>
  <dk-table>
    <dk-row header>
      <dk-cell>Company</dk-cell>
      <dk-cell>Signal</dk-cell>
    </dk-row>
    <dk-row>
      <dk-cell>Example</dk-cell>
      <dk-cell>Clear evidence</dk-cell>
    </dk-row>
  </dk-table>
</dk-slide>
```

Use `dk-raw reason="..."` only when the DSL cannot express the slide yet. If the
same raw pattern repeats, promote it into a runtime or plugin capability.
