import { Window } from "happy-dom";
import { describe, expect, it } from "vitest";
import { createPluginRegistry, normalizePlugin } from "./plugin-registry.js";

function createTestEnvironment() {
  const window = new Window();
  return {
    window,
    document: window.document,
    customElements: window.customElements,
    HTMLElement: window.HTMLElement,
  };
}

describe("plugin registry", () => {
  it("registers plugin elements, styles, selectable selectors, and themes", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class TestCard extends env.HTMLElement {}

    const summary = registry.registerPlugin({
      name: "test-plugin",
      version: "1.2.3",
      kind: "component",
      elements: {
        "dk-test-card": TestCard,
      },
      selectable: ["dk-test-card"],
      themes: ["test-theme"],
      styles: "dk-test-card { display: block; }",
    });

    expect(summary).toMatchObject({
      name: "test-plugin",
      version: "1.2.3",
      kind: "component",
      elements: ["dk-test-card"],
      selectable: ["dk-test-card"],
      themes: ["test-theme"],
    });
    expect(env.customElements.get("dk-test-card")).toBe(TestCard);
    expect(registry.getSelectableSelectors()).toEqual(["dk-test-card"]);
    expect(registry.getThemeNames()).toEqual(["test-theme"]);
    expect(env.document.getElementById("decknow-plugin-test-plugin-default-styles")).not.toBeNull();
  });

  it("rejects duplicate plugin names and duplicate custom elements", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class FirstElement extends env.HTMLElement {}
    class SecondElement extends env.HTMLElement {}

    registry.registerPlugin({
      name: "first",
      elements: {
        "dk-first": FirstElement,
      },
    });

    expect(() =>
      registry.registerPlugin({
        name: "first",
      })
    ).toThrow(/already registered/);

    expect(() =>
      registry.registerPlugin({
        name: "second",
        elements: {
          "dk-first": SecondElement,
        },
      })
    ).toThrow(/already registered by plugin "first"/);
  });

  it("rejects invalid elements before creating partial registration side effects", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class ValidElement extends env.HTMLElement {}

    expect(() =>
      registry.registerPlugin({
        name: "bad-plugin",
        elements: {
          "dk-valid": ValidElement,
          invalid: ValidElement,
        },
      })
    ).toThrow(/must include a hyphen/);

    expect(env.customElements.get("dk-valid")).toBeUndefined();
    expect(registry.getPlugin("bad-plugin")).toBeNull();
  });

  it("normalizes plugin metadata without requiring DOM", () => {
    const normalized = normalizePlugin({
      name: "theme:sample",
      kind: "theme",
      themes: {
        sample: {},
      },
      styles: [
        {
          id: "tokens",
          css: "dk-deck[theme='sample'] { --dk-accent: red; }",
        },
      ],
    });

    expect(normalized).toMatchObject({
      name: "theme:sample",
      kind: "theme",
      elements: {},
      selectable: [],
      themes: ["sample"],
      styles: [
        {
          id: "tokens",
          css: "dk-deck[theme='sample'] { --dk-accent: red; }",
        },
      ],
    });
  });
});
