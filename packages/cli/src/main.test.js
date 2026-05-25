import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSingleHtml,
  discoverSkills,
  injectCommentOverlay,
  installSkills,
  parseViewport,
  readCommentRound,
  readCommentsIndex,
  readLatestCommentRound,
  saveCommentRound,
  validateHtml,
} from "./main.js";

const tempDirs = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { force: true, recursive: true });
  }
});

describe("cli core", () => {
  it("parses viewport arguments with strict WIDTHxHEIGHT syntax", () => {
    expect(parseViewport()).toEqual({ width: 1920, height: 1080 });
    expect(parseViewport("1440x900")).toEqual({ width: 1440, height: 900 });
    expect(() => parseViewport("1440×900")).toThrow(/Invalid viewport/);
    expect(() => parseViewport("wide")).toThrow(/Invalid viewport/);
  });

  it("validates deck structure and escape-hatch warnings", () => {
    const file = writeTempFile(
      "deck.html",
      `<!doctype html>
      <script src="../packages/runtime-standard/decknow.js"></script>
      <dk-deck>
        <dk-slide>
          <dk-raw></dk-raw>
          <style>dk-slide { color: red; }</style>
          <script>window.customEscape = true;</script>
        </dk-slide>
      </dk-deck>`
    );

    const result = validateHtml(file);

    expect(result).toMatchObject({
      ok: true,
      deckCount: 1,
      slideCount: 1,
      errors: [],
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "<dk-raw> should include a reason attribute for agent traceability.",
        'Raw <style> detected. Prefer CSS variables or dk-raw reason="..." for one-off styling.',
      ])
    );
    expect(result.warnings.some((warning) => warning.includes("Raw <script> detected"))).toBe(true);
  });

  it("reports missing deck and slide roots as validation errors", () => {
    const file = writeTempFile("empty.html", "<main>No deck here</main>");

    expect(validateHtml(file)).toMatchObject({
      ok: false,
      deckCount: 0,
      slideCount: 0,
      errors: ["Missing <dk-deck> root element.", "Missing <dk-slide> elements."],
    });
  });

  it("injects the comment overlay once before body close", () => {
    const html = "<html><body><dk-deck></dk-deck></body></html>";
    const injected = injectCommentOverlay(html);

    expect(injected).toContain('<script src="/__decknow__/comments.js"></script>');
    expect(injected).toContain("</body>");
    expect(injectCommentOverlay(injected)).toBe(injected);
  });

  it("builds a self-contained HTML deck with the runtime inlined", () => {
    const input = writeTempFile(
      "deck.html",
      `<!doctype html>
      <html>
        <head>
          <script src="../packages/runtime-standard/decknow.js?v=test"></script>
          <script src="/__decknow__/comments.js"></script>
        </head>
        <body>
          <dk-deck><dk-slide><dk-title>Build me</dk-title></dk-slide></dk-deck>
        </body>
      </html>`
    );
    const output = path.join(makeTempDir(), "deck-built.html");

    const result = buildSingleHtml(input, { out: output });
    const html = fs.readFileSync(output, "utf8");

    expect(result).toMatchObject({ ok: true, out: output });
    expect(result.bytes).toBeGreaterThan(result.runtimeBytes);
    expect(html).toContain("<script data-decknow-runtime>");
    expect(html).toContain("window.__DECKNOW_DEBUG_TEXT__");
    expect(html).not.toContain("packages/runtime-standard/decknow.js");
    expect(html).not.toContain("/__decknow__/comments.js");
    expect(validateHtml(output).warnings.some((warning) => warning.includes("Raw <script>"))).toBe(
      false
    );
  });

  it("can build an already self-contained HTML deck again", () => {
    const input = writeTempFile(
      "deck.html",
      `<!doctype html>
      <html>
        <head><script src="../packages/runtime-standard/decknow.js"></script></head>
        <body><dk-deck><dk-slide><dk-title>Build twice</dk-title></dk-slide></dk-deck></body>
      </html>`
    );
    const firstOutput = path.join(makeTempDir(), "deck-built.html");
    const secondOutput = path.join(makeTempDir(), "deck-built-again.html");

    buildSingleHtml(input, { out: firstOutput });
    const result = buildSingleHtml(firstOutput, { out: secondOutput });
    const html = fs.readFileSync(secondOutput, "utf8");

    expect(result).toMatchObject({ ok: true, out: secondOutput });
    expect(html.match(/data-decknow-runtime/g)).toHaveLength(1);
    expect(html).not.toContain("packages/runtime-standard/decknow.js");
  });

  it("stores comment rounds with stable numeric ids and latest lookup", () => {
    const storeRoot = makeTempDir();
    const first = saveCommentRound(storeRoot, {
      entry: "/tmp/deck.html",
      sessionId: "session-a",
      payload: {
        deck: { slideNumber: 2 },
        viewport: { width: 1440, height: 900 },
        comments: [{ id: 1, text: "First comment" }],
      },
    });
    const second = saveCommentRound(storeRoot, {
      entry: "/tmp/deck.html",
      sessionId: "session-a",
      payload: {
        comments: [
          { id: 1, text: "Second round, first comment" },
          { id: 2, text: "Second round, second comment" },
        ],
      },
    });

    expect(first).toMatchObject({ round: 1, commentCount: 1, sessionId: "session-a" });
    expect(second).toMatchObject({ round: 2, commentCount: 2, sessionId: "session-a" });
    expect(readCommentsIndex(storeRoot)).toMatchObject({
      latestRound: 2,
      rounds: [
        { round: 1, commentCount: 1, file: "round-1.json" },
        { round: 2, commentCount: 2, file: "round-2.json" },
      ],
    });
    expect(readCommentRound(storeRoot, 1).comments[0].text).toBe("First comment");
    expect(readLatestCommentRound(storeRoot).comments).toHaveLength(2);
    expect(() => readCommentRound(storeRoot, 3)).toThrow(/was not found/);
  });

  it("discovers and installs package-declared skills", () => {
    const targetRoot = path.join(makeTempDir(), "skills");

    const discoveredSkillNames = discoverSkills().map((skill) => skill.name);
    const result = installSkills({ dir: targetRoot });

    expect(discoveredSkillNames).toEqual([
      "decknow",
      "decknow-plugin-diagram-basic",
      "decknow-theme-terminal-green",
    ]);
    expect(result.skills.map((skill) => skill.name)).toEqual(discoveredSkillNames);

    for (const skillName of discoveredSkillNames) {
      expect(fs.existsSync(path.join(targetRoot, skillName, "SKILL.md"))).toBe(true);
    }

    expect(
      fs.readFileSync(path.join(targetRoot, "decknow-plugin-diagram-basic", "SKILL.md"), "utf8")
    ).toContain("dk-flow");
  });
});

function writeTempFile(name, content) {
  const dir = makeTempDir();
  const file = path.join(dir, name);
  fs.writeFileSync(file, content);
  return file;
}

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "decknow-test-"));
  tempDirs.push(dir);
  return dir;
}
