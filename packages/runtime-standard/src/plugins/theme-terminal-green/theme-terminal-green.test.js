import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { createPluginRegistry } from "../../plugin-registry.js";
import { createTerminalGreenThemePlugin } from "./index.js";

function createTestEnvironment() {
  const window = new Window();
  return {
    window,
    document: window.document,
    customElements: window.customElements,
  };
}

describe("terminal-green theme plugin", () => {
  it("registers the default theme through the plugin registry and injects theme tokens", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["theme:terminal-green"],
    });

    const summary = registry.registerBuiltInPlugin(createTerminalGreenThemePlugin("test"));

    expect(summary).toMatchObject({
      name: "theme:terminal-green",
      version: "test",
      kind: "theme",
      trusted: true,
      elements: [],
      selectable: [],
      themes: ["terminal-green"],
      styleIds: ["decknow-plugin-theme-terminal-green-tokens-styles"],
    });
    expect(registry.getThemeNames()).toEqual(["terminal-green"]);

    const style = env.document.getElementById("decknow-plugin-theme-terminal-green-tokens-styles");
    expect(style).not.toBeNull();
    expect(style.dataset.dkPlugin).toBe("theme:terminal-green");
    expect(style.textContent).toContain('dk-deck[theme="terminal-green"]');
    expect(style.textContent).toContain("--dk-accent: #39d353");
  });
});
