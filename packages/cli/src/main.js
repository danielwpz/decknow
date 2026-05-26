import fs from "node:fs";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const workspaceRoot = path.resolve(__dirname, "../../..");
const cliPackageRoot = path.resolve(__dirname, "..");
const runtimePath = resolveRuntimePath();
const commentOverlayPath = path.join(workspaceRoot, "packages/cli/client/comment-overlay.js");
const defaultCommentsDir = ".decknow-runs/comments";
const defaultDevPort = 4317;
const devPortFallbackLimit = 50;
const decknowPackagePrefix = "@decknow/";
const runtimeSrcPattern =
  /(?:packages\/runtime-standard\/decknow\.js(?:\?[^"']*)?|\/__decknow__\/runtime\.js(?:\?[^"']*)?)/i;
const runtimeScriptTagPattern =
  /<script\b[^>]*\bsrc=["'][^"']*(?:packages\/runtime-standard\/decknow\.js(?:\?[^"']*)?|\/__decknow__\/runtime\.js(?:\?[^"']*)?)[^"']*["'][^>]*>\s*<\/script>/i;
const commentOverlayScriptTagPattern =
  /\n?\s*<script\b[^>]*\bsrc=["']\/__decknow__\/comments\.js["'][^>]*>\s*<\/script>\s*/gi;

function resolveRuntimePath() {
  const sourceRuntimePath = path.join(workspaceRoot, "packages/runtime-standard/decknow.js");
  if (fs.existsSync(sourceRuntimePath)) return sourceRuntimePath;
  return require.resolve("@decknow/runtime-standard/decknow.js");
}

function resolveEntry(entry) {
  const resolved = path.resolve(process.cwd(), entry);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Entry file not found: ${entry}`);
  }
  return resolved;
}

export function createStaticServer(entryFile, options = {}) {
  const serveRoot = entryFile.startsWith(`${workspaceRoot}${path.sep}`)
    ? workspaceRoot
    : path.dirname(entryFile);
  const entryRoute = `/${path.relative(serveRoot, entryFile).split(path.sep).join("/")}`;
  const comments = options.comments || null;
  const commentState = comments ? { modeOpenedLogged: false } : null;

  return http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    let pathname = decodeURIComponent(url.pathname);

    try {
      if (comments && pathname.startsWith("/__decknow__/comments/")) {
        await handleCommentApi(req, res, {
          entryFile,
          sessionId: comments.sessionId,
          storeRoot: comments.storeRoot,
          state: commentState,
        });
        return;
      }

      if (pathname === "/") pathname = entryRoute;
      if (pathname === "/__decknow__/runtime.js") {
        return serveFile(runtimePath, "application/javascript; charset=utf-8", res);
      }

      if (comments && pathname === "/__decknow__/comments.js") {
        return serveFile(commentOverlayPath, "application/javascript; charset=utf-8", res);
      }

      const target = path.normalize(path.join(serveRoot, pathname));
      if (!isPathInside(target, serveRoot)) {
        sendText(res, 403, "Forbidden");
        return;
      }

      const contentType = mimeType(target);
      const transform =
        comments && contentType.startsWith("text/html") ? injectCommentOverlay : null;
      serveFile(target, contentType, res, transform);
    } catch (error) {
      sendJson(res, 500, { ok: false, error: error?.message || String(error) });
    }
  });
}

function serveFile(filePath, contentType, res, transform = null) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendText(res, 404, "Not found");
      return;
    }
    const body = transform ? transform(data.toString("utf8")) : data;
    res.writeHead(200, { "Content-Type": contentType });
    res.end(body);
  });
}

function isPathInside(target, root) {
  return target === root || target.startsWith(`${root}${path.sep}`);
}

export function injectCommentOverlay(html) {
  if (html.includes("/__decknow__/comments.js")) return html;
  const script = '\n    <script src="/__decknow__/comments.js"></script>\n';
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${script}  </body>`);
  }
  return `${html}${script}`;
}

export function buildSingleHtml(entryFile, options = {}) {
  const html = fs.readFileSync(entryFile, "utf8");
  if (!hasDecknowRuntimeScript(html)) {
    throw new Error(
      'Deck does not include the Decknow runtime. Add a runtime script before building, for example: <script src="../packages/runtime-standard/decknow.js"></script>.'
    );
  }

  const runtime = fs.readFileSync(runtimePath, "utf8").replace(/<\/script/gi, "<\\/script");
  const htmlWithoutDevOverlay = html.replace(commentOverlayScriptTagPattern, "\n");
  const outputHtml = /<script\b[^>]*\bdata-decknow-runtime\b/i.test(htmlWithoutDevOverlay)
    ? htmlWithoutDevOverlay
    : htmlWithoutDevOverlay.replace(
        runtimeScriptTagPattern,
        `<script data-decknow-runtime>\n${runtime}\n</script>`
      );

  if (
    outputHtml === htmlWithoutDevOverlay &&
    !/<script\b[^>]*\bdata-decknow-runtime\b/i.test(outputHtml)
  ) {
    throw new Error("Unable to replace the runtime script while building the deck.");
  }

  const outputFile = options.out
    ? path.resolve(process.cwd(), options.out)
    : path.resolve(
        process.cwd(),
        ".decknow-runs/build",
        `${path.basename(entryFile, path.extname(entryFile))}.html`
      );
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, outputHtml);

  return {
    ok: true,
    entry: entryFile,
    out: outputFile,
    bytes: Buffer.byteLength(outputHtml),
    runtimeBytes: Buffer.byteLength(runtime),
  };
}

export function discoverSkills(options = {}) {
  const startRoot = path.resolve(options.startRoot || cliPackageRoot);
  const queue = [startRoot];
  const visited = new Set();
  const skills = [];

  while (queue.length > 0) {
    const packageRoot = queue.shift();
    if (visited.has(packageRoot)) continue;
    visited.add(packageRoot);

    const packageJson = readPackageJson(packageRoot);
    skills.push(...normalizeSkillDeclarations(packageJson, packageRoot));

    for (const dependencyName of decknowDependencyNames(packageJson)) {
      const dependencyRoot = resolvePackageRoot(dependencyName, packageRoot);
      if (!visited.has(dependencyRoot)) queue.push(dependencyRoot);
    }
  }

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

export function installSkills(options = {}) {
  const targetRoot = path.resolve(process.cwd(), options.dir || "skills");
  const skills = discoverSkills();

  if (skills.length === 0) {
    throw new Error("No Decknow skills were discovered from installed packages.");
  }

  const installed = skills.map((skill) => {
    if (!fs.existsSync(path.join(skill.source, "SKILL.md"))) {
      throw new Error(`Skill "${skill.name}" is missing SKILL.md at ${skill.source}.`);
    }

    const target = path.join(targetRoot, skill.name);
    copyDirectory(skill.source, target);
    return {
      name: skill.name,
      package: skill.package,
      source: skill.source,
      target,
    };
  });

  return {
    ok: true,
    targetRoot,
    skills: installed,
  };
}

function readPackageJson(packageRoot) {
  const packageJsonPath = path.join(packageRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`Missing package.json at ${packageRoot}.`);
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
}

function normalizeSkillDeclarations(packageJson, packageRoot) {
  const declarations = [];
  if (packageJson.decknow?.skill) declarations.push(packageJson.decknow.skill);
  if (packageJson.decknow?.skills) {
    if (!Array.isArray(packageJson.decknow.skills)) {
      throw new Error(`Package ${packageJson.name || packageRoot} has invalid decknow.skills.`);
    }
    declarations.push(...packageJson.decknow.skills);
  }

  return declarations.map((declaration) => {
    if (!declaration?.path) {
      throw new Error(
        `Package ${packageJson.name || packageRoot} declares a skill without a path.`
      );
    }

    const declaredSource = path.resolve(packageRoot, declaration.path);
    if (!isPathInside(declaredSource, packageRoot)) {
      throw new Error(
        `Package ${packageJson.name || packageRoot} declares a skill outside the package root.`
      );
    }
    const source = resolveSkillSource(packageJson, declaration, declaredSource);

    return {
      name: declaration.name || path.basename(source),
      package: packageJson.name || null,
      source,
    };
  });
}

function resolveSkillSource(packageJson, declaration, declaredSource) {
  const isCliRootSkill = packageJson.name === "@decknow/cli" && declaration.path === "skills";
  const sourceRootSkill = path.join(workspaceRoot, "skills");
  if (isCliRootSkill && fs.existsSync(path.join(sourceRootSkill, "SKILL.md"))) {
    return sourceRootSkill;
  }

  if (fs.existsSync(path.join(declaredSource, "SKILL.md"))) return declaredSource;

  return declaredSource;
}

function decknowDependencyNames(packageJson) {
  return Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.optionalDependencies || {}),
  }).filter((dependencyName) => dependencyName.startsWith(decknowPackagePrefix));
}

function resolvePackageRoot(packageName, fromPackageRoot) {
  const fromRequire = createRequire(path.join(fromPackageRoot, "package.json"));
  try {
    return path.dirname(fromRequire.resolve(`${packageName}/package.json`));
  } catch {
    const entryPath = fromRequire.resolve(packageName);
    return findPackageRoot(entryPath);
  }
}

function findPackageRoot(startPath) {
  let current = fs.statSync(startPath).isDirectory() ? startPath : path.dirname(startPath);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "package.json"))) return current;
    current = path.dirname(current);
  }
  throw new Error(`Unable to find package root for ${startPath}.`);
}

function copyDirectory(source, target) {
  fs.rmSync(target, { force: true, recursive: true });
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

async function handleCommentApi(req, res, context) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/__decknow__/comments/mode-opened") {
    await readJsonBody(req);
    if (!context.state.modeOpenedLogged) {
      context.state.modeOpenedLogged = true;
      console.log("Comment mode opened. The user may add comments across multiple slides.");
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === "/__decknow__/comments/rounds") {
    const payload = await readJsonBody(req);
    const round = saveCommentRound(context.storeRoot, {
      entry: context.entryFile,
      sessionId: context.sessionId,
      payload,
    });
    console.log(
      `Comment round ${round.round} submitted with ${round.commentCount} ${round.commentCount === 1 ? "comment" : "comments"}.`
    );
    console.log("Run `decknow comments latest` to read this round.");
    sendJson(res, 200, { ok: true, ...round });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Unknown comment endpoint." });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 2_000_000) {
        reject(new Error("Request body too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON request body."));
      }
    });
    req.on("error", reject);
  });
}

function commentsStoreRoot() {
  return path.resolve(process.cwd(), defaultCommentsDir);
}

export function readCommentsIndex(storeRoot) {
  const indexPath = path.join(storeRoot, "index.json");
  if (!fs.existsSync(indexPath)) {
    return { latestRound: 0, rounds: [] };
  }
  return JSON.parse(fs.readFileSync(indexPath, "utf8"));
}

export function saveCommentRound(storeRoot, { entry, sessionId, payload }) {
  const index = readCommentsIndex(storeRoot);
  const roundNumber = Number(index.latestRound || 0) + 1;
  const createdAt = new Date().toISOString();
  const comments = Array.isArray(payload?.comments) ? payload.comments : [];
  const file = `round-${roundNumber}.json`;
  const round = {
    round: roundNumber,
    sessionId,
    entry,
    createdAt,
    commentCount: comments.length,
    deck: payload?.deck || null,
    viewport: payload?.viewport || null,
    comments,
  };

  writeJson(path.join(storeRoot, file), round);
  writeJson(path.join(storeRoot, "index.json"), {
    latestRound: roundNumber,
    updatedAt: createdAt,
    rounds: [
      ...(Array.isArray(index.rounds) ? index.rounds : []),
      {
        round: roundNumber,
        sessionId,
        entry,
        createdAt,
        commentCount: comments.length,
        file,
      },
    ],
  });

  return round;
}

export function readCommentRound(storeRoot, roundNumber) {
  const file = path.join(storeRoot, `round-${roundNumber}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Comment round ${roundNumber} was not found.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function readLatestCommentRound(storeRoot) {
  const index = readCommentsIndex(storeRoot);
  if (!index.latestRound) {
    throw new Error("No comment rounds found.");
  }
  return readCommentRound(storeRoot, index.latestRound);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}

function mimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    }[ext] || "application/octet-stream"
  );
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    const onError = (error) => {
      reject(error);
    };
    server.once("error", onError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", onError);
      const address = server.address();
      resolve(address.port);
    });
  });
}

async function listenWithPortFallback(createServer, preferredPort) {
  if (preferredPort === 0) {
    const server = createServer();
    const port = await listen(server, 0);
    return { server, port, requestedPort: 0 };
  }

  let lastError = null;
  for (let offset = 0; offset <= devPortFallbackLimit; offset += 1) {
    const candidatePort = preferredPort + offset;
    const server = createServer();
    try {
      const port = await listen(server, candidatePort);
      return { server, port, requestedPort: preferredPort };
    } catch (error) {
      closeServer(server);
      lastError = error;
      if (!isPortUnavailableError(error)) throw error;
    }
  }

  throw new Error(
    `No available port found from ${preferredPort} to ${preferredPort + devPortFallbackLimit}: ${lastError?.message || "unknown error"}`
  );
}

function isPortUnavailableError(error) {
  return ["EADDRINUSE", "EACCES"].includes(error?.code);
}

function closeServer(server) {
  try {
    server.close();
  } catch {
    // The server may not have started listening yet.
  }
}

export function validateHtml(entryFile) {
  const html = fs.readFileSync(entryFile, "utf8");
  const warnings = [];
  const errors = [];

  const deckCount = countMatches(html, /<dk-deck\b/gi);
  const slideCount = countMatches(html, /<dk-slide\b/gi);

  if (deckCount === 0) errors.push("Missing <dk-deck> root element.");
  if (deckCount > 1) warnings.push(`Found ${deckCount} <dk-deck> elements; MVP expects one deck.`);
  if (slideCount === 0) errors.push("Missing <dk-slide> elements.");

  const rawZones = [...html.matchAll(/<dk-raw\b([^>]*)>/gi)];
  for (const match of rawZones) {
    if (!/\breason\s*=/.test(match[1])) {
      warnings.push("<dk-raw> should include a reason attribute for agent traceability.");
    }
  }

  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
  if (scriptTags.some((tag) => !isDecknowRuntimeScriptTag(tag))) {
    warnings.push(
      'Raw <script> detected. This is allowed as an escape hatch, but prefer dk-raw reason="...".'
    );
  }

  if (/<style\b/i.test(html)) {
    warnings.push(
      'Raw <style> detected. Prefer CSS variables or dk-raw reason="..." for one-off styling.'
    );
  }

  return {
    ok: errors.length === 0,
    entry: entryFile,
    deckCount,
    slideCount,
    errors,
    warnings,
  };
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function ensureRuntimeScript(entryFile) {
  const html = fs.readFileSync(entryFile, "utf8");
  if (hasDecknowRuntimeScript(html)) {
    return;
  }
  throw new Error(
    'Deck does not include the Decknow runtime. For local source files, add: <script src="../packages/runtime-standard/decknow.js"></script>.'
  );
}

function hasDecknowRuntimeScript(html) {
  return /<script\b[^>]*\bdata-decknow-runtime\b/i.test(html) || runtimeSrcPattern.test(html);
}

function isDecknowRuntimeScriptTag(tag) {
  return /\bdata-decknow-runtime\b/i.test(tag) || runtimeSrcPattern.test(tag);
}

export function entryUrl(port, entry) {
  const route = entry.startsWith(`${workspaceRoot}${path.sep}`)
    ? `/${path.relative(workspaceRoot, entry).split(path.sep).join("/")}`
    : `/${path.basename(entry)}`;
  return `http://127.0.0.1:${port}${route}`;
}

async function runDev(argv) {
  const entry = resolveEntry(argv.entry);
  const storeRoot = commentsStoreRoot();
  const sessionId = createSessionId();
  const requestedPort = Number(argv.port);
  const { port } = await listenWithPortFallback(
    () =>
      createStaticServer(entry, {
        comments: {
          sessionId,
          storeRoot,
        },
      }),
    requestedPort
  );
  const url = entryUrl(port, entry);
  console.log("Decknow dev server is running.");
  if (requestedPort !== 0 && port !== requestedPort) {
    console.log(`Port ${requestedPort} was unavailable. Using ${port} instead.`);
  }
  console.log(`Open: ${url}`);
  console.log(
    "Comments are enabled. Click the floating comment button in the browser to annotate the deck."
  );
  console.log(`Comment rounds will be stored in: ${storeRoot}`);
  console.log(`Runtime alias: /__decknow__/runtime.js`);
  console.log(`Press Ctrl+C to stop.`);
}

function createSessionId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function runValidate(argv) {
  const entry = resolveEntry(argv.entry);
  const result = validateHtml(entry);
  if (argv.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(result.ok ? "OK" : "FAILED");
    console.log(`Slides: ${result.slideCount}`);
    for (const warning of result.warnings) console.log(`Warning: ${warning}`);
    for (const error of result.errors) console.error(`Error: ${error}`);
  }
  if (!result.ok) process.exitCode = 1;
}

async function runBuild(argv) {
  const entry = resolveEntry(argv.entry);
  console.log(JSON.stringify(buildSingleHtml(entry, { out: argv.out }), null, 2));
}

async function runSkills(argv) {
  if (argv.action !== "install") {
    throw new Error(`Unknown skills action: ${argv.action}`);
  }

  const result = installSkills({ dir: argv.dir });
  console.log(`Installed Decknow skills to ${result.targetRoot}`);
  for (const skill of result.skills) {
    console.log(`- ${skill.name} (${skill.package})`);
  }
}

async function loadChromium() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "Playwright is required for screenshot and inspect commands. Run `pnpm install` in the project root."
    );
  }
  return chromium;
}

async function withRenderedDeck(entry, viewport, callback) {
  ensureRuntimeScript(entry);
  const chromium = await loadChromium();

  const server = createStaticServer(entry);
  const port = await listen(server, 0);
  const url = entryUrl(port, entry);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => window.__DECKNOW__?.ready);
    return await callback({ page, url });
  } finally {
    await browser.close();
    server.close();
  }
}

async function runScreenshot(argv) {
  const entry = resolveEntry(argv.entry);
  const viewport = parseViewport(argv.viewport);
  const outputDir = path.resolve(process.cwd(), argv.out || ".decknow-runs/latest");
  fs.mkdirSync(outputDir, { recursive: true });

  const result = await withRenderedDeck(entry, viewport, async ({ page, url }) => {
    const slideCount = await page.evaluate(() => window.__DECKNOW__?.getSlideCount?.() ?? 0);
    const slideIndexes = argv.all
      ? Array.from({ length: slideCount }, (_, index) => index)
      : [Math.max(0, Number(argv.slide || 1) - 1)];

    const files = [];
    for (const index of slideIndexes) {
      await page.evaluate((slideIndex) => window.__DECKNOW__.goToSlide(slideIndex), index);
      if (argv.step !== undefined) {
        await page.evaluate((step) => window.__DECKNOW__.setStep(step), Number(argv.step));
      }
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(120);

      const filename = `slide-${String(index + 1).padStart(3, "0")}-${viewport.width}x${viewport.height}.png`;
      const filePath = path.join(outputDir, filename);
      await page.screenshot({ path: filePath, fullPage: false });
      files.push(filePath);
    }

    return {
      ok: true,
      entry,
      url,
      viewport,
      slideCount,
      files,
    };
  });

  console.log(JSON.stringify(result, null, 2));
}

async function runInspect(argv) {
  const entry = resolveEntry(argv.entry);
  const viewport = parseViewport(argv.viewport);
  const selector = argv.selector || ":scope > *";

  const result = await withRenderedDeck(entry, viewport, async ({ page, url }) => {
    const slideCount = await page.evaluate(() => window.__DECKNOW__?.getSlideCount?.() ?? 0);
    const slideIndexes = argv.all
      ? Array.from({ length: slideCount }, (_, index) => index)
      : [Math.max(0, Math.min(slideCount - 1, Number(argv.slide || 1) - 1))];

    const slides = [];
    for (const index of slideIndexes) {
      await page.evaluate((slideIndex) => window.__DECKNOW__.goToSlide(slideIndex), index);
      if (argv.step !== undefined) {
        await page.evaluate((step) => window.__DECKNOW__.setStep(step), Number(argv.step));
      }
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(120);
      slides.push(await inspectActiveSlide(page, selector));
    }

    const diagnostics = slides.flatMap((slide) => slide.diagnostics);
    return {
      ok: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
      entry,
      url,
      viewport,
      selector,
      slideCount,
      slides,
      diagnostics,
    };
  });

  console.log(JSON.stringify(argv.summary ? summarizeInspectResult(result) : result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

async function runComments(argv) {
  const storeRoot = commentsStoreRoot();
  try {
    if (argv.action === "list") {
      const index = readCommentsIndex(storeRoot);
      printJson({ ok: true, storage: storeRoot, ...index });
      return;
    }

    if (argv.action === "latest") {
      printJson({ ok: true, storage: storeRoot, ...readLatestCommentRound(storeRoot) });
      return;
    }

    if (argv.action === "show") {
      const roundNumber = Number(argv.round);
      if (!Number.isInteger(roundNumber) || roundNumber < 1) {
        throw new Error("`decknow comments show` requires a positive numeric round.");
      }
      printJson({ ok: true, storage: storeRoot, ...readCommentRound(storeRoot, roundNumber) });
      return;
    }

    throw new Error(`Unknown comments action: ${argv.action}`);
  } catch (error) {
    process.exitCode = 1;
    printJson({ ok: false, storage: storeRoot, error: error?.message || String(error) });
  }
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function summarizeInspectResult(result) {
  return {
    ok: result.ok,
    entry: result.entry,
    viewport: result.viewport,
    selector: result.selector,
    slideCount: result.slideCount,
    slides: result.slides.map((slide) => ({
      slideNumber: slide.state?.slideNumber,
      layout: slide.slide?.attributes?.layout,
      rect: slide.slide?.rect,
      elements: slide.elements.map((element) => ({
        index: element.index,
        tag: element.tag,
        text: element.text,
        rect: element.rect,
        margins: element.slideMargins,
        overflow: Object.values(element.overflow).some(Boolean),
        display: element.computed.display,
        maxWidth: element.computed.maxWidth,
      })),
      diagnostics: slide.diagnostics,
    })),
    diagnostics: result.diagnostics,
  };
}

async function inspectActiveSlide(page, selector) {
  return page.evaluate((inspectSelector) => {
    const activeSlide = document.querySelector("dk-slide[data-active='true']");
    const state = window.__DECKNOW__?.screenshotState?.() || null;
    const diagnostics = [];

    function rectOf(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: round(rect.x),
        y: round(rect.y),
        left: round(rect.left),
        right: round(rect.right),
        top: round(rect.top),
        bottom: round(rect.bottom),
        width: round(rect.width),
        height: round(rect.height),
      };
    }

    function round(value) {
      return Math.round(value * 1000) / 1000;
    }

    function compactText(element) {
      return element.textContent?.replace(/\s+/g, " ").trim().slice(0, 160) || "";
    }

    function pickedStyles(element) {
      const styles = getComputedStyle(element);
      return {
        display: styles.display,
        position: styles.position,
        width: styles.width,
        maxWidth: styles.maxWidth,
        height: styles.height,
        overflow: styles.overflow,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
        gridTemplateColumns: styles.gridTemplateColumns,
        gridTemplateRows: styles.gridTemplateRows,
        flexDirection: styles.flexDirection,
        whiteSpace: styles.whiteSpace,
        textAlign: styles.textAlign,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
      };
    }

    function attributesOf(element) {
      return Object.fromEntries(
        Array.from(element.attributes, (attribute) => [attribute.name, attribute.value])
      );
    }

    function elementInfo(element, index, slideRect) {
      const rect = rectOf(element);
      const tag = element.tagName.toLowerCase();
      const leftMargin = rect.left - slideRect.left;
      const rightMargin = slideRect.right - rect.right;
      const overflow = {
        left: rect.left < slideRect.left - 0.5,
        right: rect.right > slideRect.right + 0.5,
        top: rect.top < slideRect.top - 0.5,
        bottom: rect.bottom > slideRect.bottom + 0.5,
      };

      const info = {
        index,
        tag,
        text: compactText(element),
        attributes: attributesOf(element),
        rect,
        slideMargins: {
          left: round(leftMargin),
          right: round(rightMargin),
          horizontalImbalance: round(rightMargin - leftMargin),
        },
        overflow,
        computed: pickedStyles(element),
      };

      if (Object.values(overflow).some(Boolean)) {
        diagnostics.push({
          type: "overflow",
          severity: "error",
          slide: state?.slideNumber,
          tag,
          index,
          text: info.text,
          message: `${tag} overflows the slide bounds.`,
          overflow,
        });
      }

      if (rect.width === 0 || rect.height === 0) {
        diagnostics.push({
          type: "empty-layout-box",
          severity: "warn",
          slide: state?.slideNumber,
          tag,
          index,
          text: info.text,
          message: `${tag} has a zero-size layout box.`,
        });
      }

      if (["dk-grid", "dk-table"].includes(tag) && Math.abs(rightMargin - leftMargin) > 8) {
        diagnostics.push({
          type: "horizontal-imbalance",
          severity: "warn",
          slide: state?.slideNumber,
          tag,
          index,
          text: info.text,
          message: `${tag} has ${round(leftMargin)}px left margin and ${round(rightMargin)}px right margin inside the slide.`,
          leftMargin: round(leftMargin),
          rightMargin: round(rightMargin),
        });
      }

      return info;
    }

    if (!activeSlide) {
      return {
        state,
        slide: null,
        elements: [],
        diagnostics: [
          {
            type: "missing-active-slide",
            severity: "error",
            message: "No active slide was found.",
          },
        ],
      };
    }

    const slideRect = rectOf(activeSlide);
    let selectedElements = [];
    try {
      selectedElements = Array.from(activeSlide.querySelectorAll(inspectSelector));
    } catch (error) {
      diagnostics.push({
        type: "invalid-selector",
        severity: "error",
        slide: state?.slideNumber,
        selector: inspectSelector,
        message: error?.message || String(error),
      });
    }

    return {
      state,
      slide: {
        tag: activeSlide.tagName.toLowerCase(),
        attributes: attributesOf(activeSlide),
        rect: slideRect,
        computed: pickedStyles(activeSlide),
      },
      elements: selectedElements.map((element, index) => elementInfo(element, index, slideRect)),
      diagnostics,
    };
  }, selector);
}

export function parseViewport(value) {
  if (!value) return { width: 1920, height: 1080 };
  const match = String(value).match(/^(\d+)x(\d+)$/);
  if (!match)
    throw new Error(`Invalid viewport "${value}". Expected WIDTHxHEIGHT, e.g. 1920x1080.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

export async function runCli(argv = process.argv) {
  await yargs(hideBin(argv))
    .scriptName("decknow")
    .wrap(120)
    .command(
      "dev <entry>",
      "Preview a Decknow HTML deck in a local browser server.",
      (y) =>
        y
          .positional("entry", { type: "string", describe: "HTML deck entry file" })
          .option("port", {
            alias: "p",
            type: "number",
            default: defaultDevPort,
            describe:
              "Starting port. If unavailable, dev tries the next port. Use 0 for any free port",
          })
          .example("decknow dev deck.html", "Serve a local preview for a deck")
          .example("decknow dev deck.html --port 4317", "Start from a specific port"),
      runDev
    )
    .command(
      "validate <entry>",
      "Run the first-pass schema and escape-hatch checks.",
      (y) =>
        y
          .positional("entry", { type: "string", describe: "HTML deck entry file" })
          .option("json", { type: "boolean", default: false, describe: "Print JSON output" })
          .example("decknow validate deck.html", "Validate a deck")
          .example("decknow validate deck.html --json", "Print machine-readable output"),
      runValidate
    )
    .command(
      "build <entry>",
      "Build a self-contained single HTML deck for presentation.",
      (y) =>
        y
          .positional("entry", { type: "string", describe: "HTML deck entry file" })
          .option("out", {
            alias: "o",
            type: "string",
            describe: "Output HTML file. Defaults to .decknow-runs/build/<entry>.html",
          })
          .example("decknow build deck.html", "Build a single self-contained HTML file")
          .example("decknow build deck.html --out dist/deck.html", "Build to a specific file"),
      runBuild
    )
    .command(
      "skills <action>",
      "Install Decknow AI-agent skills into the current project.",
      (y) =>
        y
          .positional("action", {
            type: "string",
            choices: ["install"],
            describe: "Skill action",
          })
          .option("dir", {
            type: "string",
            default: "skills",
            describe: "Target directory. Defaults to ./skills",
          })
          .example("decknow skills install", "Install bundled skills into ./skills")
          .example("decknow skills install --dir .agent/skills", "Install into a custom directory"),
      runSkills
    )
    .command(
      "screenshot <entry>",
      "Render a deck with Playwright and capture slide screenshots.",
      (y) =>
        y
          .positional("entry", { type: "string", describe: "HTML deck entry file" })
          .option("slide", {
            alias: "s",
            type: "number",
            default: 1,
            describe: "1-based slide number",
          })
          .option("all", { type: "boolean", default: false, describe: "Capture every slide" })
          .option("step", { type: "number", describe: "Step/click state to set before capture" })
          .option("viewport", {
            alias: "v",
            type: "string",
            default: "1920x1080",
            describe: "Viewport as WIDTHxHEIGHT",
          })
          .option("out", {
            alias: "o",
            type: "string",
            default: ".decknow-runs/latest",
            describe: "Output directory",
          })
          .example("decknow screenshot deck.html --slide 1", "Capture one slide")
          .example(
            "decknow screenshot deck.html --all --viewport 1440x900",
            "Capture every slide at a specific viewport"
          ),
      runScreenshot
    )
    .command(
      "inspect <entry>",
      "Render a deck and print slide layout metrics as JSON.",
      (y) =>
        y
          .positional("entry", { type: "string", describe: "HTML deck entry file" })
          .option("slide", {
            alias: "s",
            type: "number",
            default: 1,
            describe: "1-based slide number",
          })
          .option("all", { type: "boolean", default: false, describe: "Inspect every slide" })
          .option("step", { type: "number", describe: "Step/click state to set before inspect" })
          .option("selector", {
            alias: "q",
            type: "string",
            default: ":scope > *",
            describe: "CSS selector scoped to the active slide",
          })
          .option("summary", {
            alias: "m",
            type: "boolean",
            default: false,
            describe: "Print compact inspect output",
          })
          .option("viewport", {
            alias: "v",
            type: "string",
            default: "1920x1080",
            describe: "Viewport as WIDTHxHEIGHT",
          })
          .example("decknow inspect deck.html -s 4 -q dk-grid -m", "Inspect grid layout")
          .example("decknow inspect deck.html --all -q dk-grid -v 1440x900", "Check every grid"),
      runInspect
    )
    .command(
      "comments <action> [round]",
      "Read submitted development comment rounds as JSON.",
      (y) =>
        y
          .positional("action", {
            type: "string",
            choices: ["list", "latest", "show"],
            describe: "Comment action",
          })
          .positional("round", {
            type: "number",
            describe: "Numeric round id for `show`",
          })
          .example("decknow comments list", "Print submitted comment round summaries")
          .example("decknow comments latest", "Print the latest submitted comment round")
          .example("decknow comments show 3", "Print comment round 3"),
      runComments
    )
    .demandCommand(1)
    .strict()
    .help()
    .fail((message, error) => {
      console.error(error?.message || message);
      process.exit(1);
    })
    .parseAsync();
}
