# Publishing

Use this workflow only when the user asks to publish, deploy, share by URL, or
make a finished deck web-accessible. Normal deck authoring, local preview, and
single-file build do not require publishing.

## Feishu/Lark Miaoda

If `lark-cli` is available, a finished Decknow deck can be published as a
Miaoda HTML app.

First build into a clean directory whose entry file is named `index.html`:

```bash
mkdir -p .decknow-runs/publish
pnpm exec decknow build path/to/deck.html --out .decknow-runs/publish/index.html
```

Do not publish the repository root. Publish only a clean build directory or the
single `index.html` file. The Miaoda publisher recursively packages directories,
so avoid paths that contain source files, `.git`, `.env`, `node_modules`, keys,
or unrelated artifacts.

Authenticate user scopes if needed:

```bash
lark-cli auth login --domain apps
```

Create a new HTML app unless the user explicitly provides an existing Miaoda
`app_id` or app URL:

```bash
lark-cli apps +create --name "Deck Title" --app-type HTML --as user
```

Copy the returned `data.app.app_id`, then dry-run the publish:

```bash
lark-cli apps +html-publish --app-id app_xxx --path ./.decknow-runs/publish --dry-run --as user
```

If dry-run reports warnings, stop and show them to the user. Do not publish until
the user confirms. If the dry-run is clean, publish:

```bash
lark-cli apps +html-publish --app-id app_xxx --path ./.decknow-runs/publish --as user
```

Return the published URL from `data.url`.

## Public Access

Publishing creates or updates the app content. Access scope is separate.

If the user asks for a public, non-login web link, set the app to public
passwordless access:

```bash
lark-cli apps +access-scope-set --app-id app_xxx --scope public --require-login=false --as user
lark-cli apps +access-scope-get --app-id app_xxx --as user
```

Confirm that the returned config has `scope: "All"` and
`require_login: false`.

Use `curl -L <url>` to smoke-test anonymous access. Some Miaoda URLs may return
404 to `HEAD` requests, so do not rely on `curl -I` alone.

## Reporting

Tell the user:

- the app name and `app_id`;
- the final URL;
- whether access is restricted, tenant-wide, or public passwordless;
- whether dry-run warnings were absent or explicitly accepted.
