import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { createPluginRegistry } from "../../../packages/runtime-standard/src/plugin-registry.js";
import { createPaperInkThemePlugin } from "./index.js";

function createTestEnvironment() {
  const window = new Window();
  return {
    window,
    document: window.document,
    customElements: window.customElements,
  };
}

describe("paper-ink theme plugin", () => {
  it("registers a light theme and injects theme tokens", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["theme:paper-ink"],
    });

    const summary = registry.registerBuiltInPlugin(createPaperInkThemePlugin("test"));

    expect(summary).toMatchObject({
      name: "theme:paper-ink",
      version: "test",
      kind: "theme",
      trusted: true,
      elements: [],
      selectable: [],
      themes: ["paper-ink"],
      colorScheme: "light",
      styleIds: ["decknow-plugin-theme-paper-ink-tokens-styles"],
    });
    expect(registry.getThemeNames()).toEqual(["paper-ink"]);
    expect(registry.getThemeColorScheme("paper-ink")).toBe("light");

    const style = env.document.getElementById("decknow-plugin-theme-paper-ink-tokens-styles");
    expect(style).not.toBeNull();
    expect(style.dataset.dkPlugin).toBe("theme:paper-ink");
    expect(style.textContent).toContain('dk-deck[theme="paper-ink"]');
    expect(style.textContent).toContain("--dk-deck-bg: #efe8dc");
    expect(style.textContent).toContain('--dk-title-prefix: ""');
    expect(style.textContent).toContain("--dk-flow-connector-thickness");
    expect(style.textContent).toContain("--dk-flow-connector-color: rgba(154, 106, 31, 0.68)");
  });
});
