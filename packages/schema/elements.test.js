import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "elements.v0.json"), "utf8"));

describe("element schema manifest", () => {
  it("documents built-in flow and pyramid diagram elements", () => {
    expect(manifest.elements["dk-slide"].children).toEqual(
      expect.arrayContaining(["dk-flow", "dk-pyramid"])
    );
    expect(manifest.elements["dk-region"].children).toEqual(
      expect.arrayContaining(["dk-flow", "dk-pyramid"])
    );
    expect(manifest.elements["dk-stack"].children).toEqual(
      expect.arrayContaining(["dk-flow", "dk-pyramid"])
    );

    expect(manifest.elements["dk-flow"]).toMatchObject({
      attributes: {
        direction: ["auto", "horizontal", "vertical"],
        responsive: ["auto", "none"],
      },
      children: ["dk-flow-step"],
    });
    expect(manifest.elements["dk-pyramid"]).toMatchObject({
      attributes: {
        fit: ["auto", "fill"],
        "label-placement": ["auto", "inside", "side", "callout"],
        "tip-ratio": "number",
      },
      children: ["dk-pyramid-level"],
    });
  });

  it("keeps child references resolvable or explicitly virtual", () => {
    const knownElements = new Set(Object.keys(manifest.elements));
    const virtualChildren = new Set(["flow", "raw-html"]);

    for (const [name, definition] of Object.entries(manifest.elements)) {
      for (const child of definition.children || []) {
        expect(
          knownElements.has(child) || virtualChildren.has(child),
          `${name} references unknown child ${child}`
        ).toBe(true);
      }
    }
  });

  it("uses valid custom-element names for concrete dk elements", () => {
    for (const name of Object.keys(manifest.elements)) {
      if (!name.startsWith("dk-")) continue;
      expect(name, `${name} should be a valid custom element name`).toMatch(
        /^dk-[a-z0-9]+(?:-[a-z0-9]+)*$/
      );
    }
  });
});
