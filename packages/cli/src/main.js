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

function parseViewport(value) {
  if (!value) return { width: 1920, height: 1080 };
  const match = String(value).match(/^(\d+)x(\d+)$/);
  if (!match)
    throw new Error(`Invalid viewport "${value}". Expected WIDTHxHEIGHT, e.g. 1920x1080.`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

await yargs(hideBin(process.argv))
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
          default: 0,
          describe: "Port, 0 picks a free port",
        })
        .example("decknow dev deck.html", "Serve a local preview for a deck")
        .example("decknow dev deck.html --port 4317", "Serve on a fixed port"),
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
  .demandCommand(1)
  .strict()
  .help()
  .fail((message, error) => {
    console.error(error?.message || message);
    process.exit(1);
  })
  .parseAsync();
