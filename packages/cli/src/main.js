import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../../..");
const runtimePath = path.join(workspaceRoot, "packages/runtime-standard/decknow.js");

function resolveEntry(entry) {
  const resolved = path.resolve(process.cwd(), entry);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Entry file not found: ${entry}`);
  }
  return resolved;
}

function createStaticServer(entryFile) {
  const serveRoot = entryFile.startsWith(`${workspaceRoot}${path.sep}`)
    ? workspaceRoot
    : path.dirname(entryFile);
  const entryRoute = `/${path.relative(serveRoot, entryFile).split(path.sep).join("/")}`;

  return http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost");
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/") pathname = entryRoute;
    if (pathname === "/__decknow__/runtime.js") {
      return serveFile(runtimePath, "application/javascript", res);
    }

    const target = path.normalize(path.join(serveRoot, pathname));
    if (!target.startsWith(serveRoot)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    serveFile(target, mimeType(target), res);
  });
}

function serveFile(filePath, contentType, res) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
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
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

function validateHtml(entryFile) {
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

  if (
    /<script\b(?![^>]*src=["'][^"']*(?:packages\/runtime-standard\/decknow\.js(?:\?[^"']*)?|\/__decknow__\/runtime\.js(?:\?[^"']*)?)["'])/i.test(
      html
    )
  ) {
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
  if (
    /packages\/runtime-standard\/decknow\.js(?:\?[^"']*)?|\/__decknow__\/runtime\.js(?:\?[^"']*)?/.test(
      html
    )
  ) {
    return;
  }
  throw new Error(
    'Deck does not include the Decknow runtime. For local source files, add: <script src="../packages/runtime-standard/decknow.js"></script>.'
  );
}

function entryUrl(port, entry) {
  const route = entry.startsWith(`${workspaceRoot}${path.sep}`)
    ? `/${path.relative(workspaceRoot, entry).split(path.sep).join("/")}`
    : `/${path.basename(entry)}`;
  return `http://127.0.0.1:${port}${route}`;
}

async function runDev(argv) {
  const entry = resolveEntry(argv.entry);
  const server = createStaticServer(entry);
  const port = await listen(server, argv.port || 0);
  const url = entryUrl(port, entry);
  console.log(`Decknow dev server`);
  console.log(`Entry: ${entry}`);
  console.log(`URL:   ${url}`);
  console.log(`Runtime alias: /__decknow__/runtime.js`);
  console.log("Examples can also be opened directly as file:// documents.");
  console.log(`Press Ctrl+C to stop.`);
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

async function runScreenshot(argv) {
  const entry = resolveEntry(argv.entry);
  ensureRuntimeScript(entry);

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(
      "Playwright is required for screenshots. Run `pnpm install` in the project root."
    );
  }

  const viewport = parseViewport(argv.viewport);
  const outputDir = path.resolve(process.cwd(), argv.out || ".decknow-runs/latest");
  fs.mkdirSync(outputDir, { recursive: true });

  const server = createStaticServer(entry);
  const port = await listen(server, 0);
  const url = entryUrl(port, entry);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => window.__DECKNOW__?.ready);

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

    const result = {
      ok: true,
      entry,
      url,
      viewport,
      slideCount,
      files,
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

function parseViewport(value) {
  if (!value) return { width: 1920, height: 1080 };
  const match = String(value).match(/^(\d+)x(\d+)$/);
  if (!match)
    throw new Error(`Invalid viewport "${value}". Expected WIDTHxHEIGHT, e.g. 1920x1080.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

await yargs(hideBin(process.argv))
  .scriptName("decknow")
  .command(
    "dev <entry>",
    "Preview a Decknow HTML deck in a local browser server.",
    (y) =>
      y.positional("entry", { type: "string", describe: "HTML deck entry file" }).option("port", {
        alias: "p",
        type: "number",
        default: 0,
        describe: "Port, 0 picks a free port",
      }),
    runDev
  )
  .command(
    "validate <entry>",
    "Run the first-pass schema and escape-hatch checks.",
    (y) =>
      y
        .positional("entry", { type: "string", describe: "HTML deck entry file" })
        .option("json", { type: "boolean", default: false, describe: "Print JSON output" }),
    runValidate
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
        }),
    runScreenshot
  )
  .demandCommand(1)
  .strict()
  .help()
  .fail((message, error) => {
    console.error(error?.message || message);
    process.exit(1);
  })
  .parseAsync();
