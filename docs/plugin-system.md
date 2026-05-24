# Plugin System

Decknow plugins are runtime contributions that add elements, styles, themes,
selectable targets, and schema metadata. The current implementation supports
built-in and manually registered browser plugins. Package discovery, remote
loading, version negotiation, and CLI installation are intentionally deferred.

The runtime is developed as modules under `packages/runtime-standard/src/` and
built into the browser-facing single file at `packages/runtime-standard/decknow.js`.
This keeps the user-facing story simple while allowing the runtime internals to
stay modular.

## Runtime API

Plugins register through the browser runtime:

```js
window.__DECKNOW__.registerPlugin({
  name: "drawing-basic",
  version: "0.0.1",
  kind: "component",
  elements: {
    "dk-diagram": DKDiagram,
    "dk-shape": DKShape,
  },
  selectable: ["dk-diagram", "dk-shape"],
  styles: "dk-diagram { display: block; }",
  schema: {
    elements: {
      "dk-diagram": {
        description: "SVG-backed diagram canvas.",
      },
    },
  },
});
```

Available runtime methods:

```js
window.__DECKNOW__.registerPlugin(plugin);
window.__DECKNOW__.getPlugin(name);
window.__DECKNOW__.getPlugins();
window.__DECKNOW__.getSelectableSelectors();
window.__DECKNOW__.getRuntimeManifest();
```

## Plugin Contract

`name` is required and must be a stable lowercase slug. Names can use letters,
numbers, hyphens, colons, and dots.

`elements` maps custom element names to constructors. The registry validates all
custom element and theme conflicts before applying any side effects, so failed
plugin registration does not leave partially defined plugin elements.

`styles` can be a string or an array of `{ id, css }` entries. Styles are injected
once and marked with `data-dk-plugin`.

`selectable` tells dev tools and comment mode which plugin elements are meaningful
comment targets.

`themes` lists theme slugs provided by a plugin. Theme CSS can be carried in
`styles`.

`schema` is metadata for validators and AI-facing docs. Runtime schema merging is
not implemented yet.

## Trust And Namespaces

Plugin trust is never decided by plugin-provided fields. A plugin may pass
`official`, `builtin`, or `trusted`, but the runtime ignores those values.
Reserved trust-like keys are also removed from plugin `meta` before manifest
output.

Official status comes only from the runtime's built-in registration path and an
allowlist controlled by Decknow. Public plugins must use `registerPlugin()`;
built-ins use the internal `registerBuiltInPlugin()` path.

All custom element names are global. There is no parent-local namespace. Official
Decknow elements use the reserved `dk-` prefix, and public plugins cannot
register `dk-*` elements. Public plugins must declare an `elementPrefix`, and
every element they register must use that prefix.

Official plugin child elements should use specific names rather than broad,
reusable names:

```html
<dk-flow>
  <dk-flow-step>Plan</dk-flow-step>
  <dk-flow-step>Render</dk-flow-step>
</dk-flow>

<dk-pyramid>
  <dk-pyramid-level>Strategy</dk-pyramid-level>
  <dk-pyramid-level>Runtime</dk-pyramid-level>
</dk-pyramid>
```

Third-party plugins should use their own vendor prefix:

```html
<acme-org-chart>
  <acme-org-person>Daniel</acme-org-person>
</acme-org-chart>
```

## Built-In Plugins

The runtime currently registers these built-in plugins:

- `core`: deck, slide, text, layout, table, code, and other baseline elements.
- `theme:terminal-green`: the current default theme slug.
- `diagram-basic`: semantic flow and pyramid diagram templates.

These are still bundled into the standard runtime. The important boundary is
that built-ins now use the same registry surface that future first-party and
community plugins will use.

## Current Limits

The first plugin foundation does not yet include:

- Network or npm package plugin discovery.
- CLI plugin installation.
- Dependency/version negotiation.
- Schema merge and validation across plugin manifests.
- Separate production bundling for optional plugin packs.

The first practical component plugin is `diagram-basic`, implemented as a
built-in template plugin. It intentionally exposes semantic templates such as
`dk-flow` and `dk-pyramid` instead of low-level coordinates, shapes, or arbitrary
connectors.

`dk-flow` defaults to automatic orientation: the runtime uses horizontal flow
when the steps fit and switches to vertical flow when the container is narrow or
taller than it is wide. Authors can still force `direction="horizontal"` or
`direction="vertical"`.

`dk-pyramid` keeps its geometry strict: levels are horizontal cuts of one
triangle, so the side edges always stay aligned. Text is rendered in a separate
label layer. With `label-placement="auto"` the runtime keeps labels inside by
default, scales an individual level label down to a readable floor, and only
falls back to a side label for the specific level whose text is still too long.
