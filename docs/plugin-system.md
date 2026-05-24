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

## Built-In Plugins

The runtime currently registers two built-in plugins:

- `core`: deck, slide, text, layout, table, code, and other baseline elements.
- `theme:terminal-green`: the current default theme slug.

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

The next practical plugin should be `drawing-basic`, implemented as a built-in
component plugin first.
