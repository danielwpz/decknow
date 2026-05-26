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
      elementPrefix: "test-",
      elements: {
        "test-card": TestCard,
      },
      selectable: ["test-card"],
      themes: ["test-theme"],
      colorScheme: "light",
      styles: "test-card { display: block; }",
    });

    expect(summary).toMatchObject({
      name: "test-plugin",
      version: "1.2.3",
      kind: "component",
      trusted: false,
      elementPrefix: "test-",
      elements: ["test-card"],
      selectable: ["test-card"],
      themes: ["test-theme"],
      colorScheme: "light",
    });
    expect(env.customElements.get("test-card")).toBe(TestCard);
    expect(registry.getSelectableSelectors()).toEqual(["test-card"]);
    expect(registry.getThemeNames()).toEqual(["test-theme"]);
    expect(registry.getThemeColorScheme("test-theme")).toBe("light");
    expect(registry.getManifest().themeColorSchemes).toEqual({ "test-theme": "light" });
    expect(env.document.getElementById("decknow-plugin-test-plugin-default-styles")).not.toBeNull();
  });

  it("rejects duplicate plugin names and duplicate custom elements", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class FirstElement extends env.HTMLElement {}
    class SecondElement extends env.HTMLElement {}

    registry.registerPlugin({
      name: "first",
      elementPrefix: "first-",
      elements: {
        "first-card": FirstElement,
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
        elementPrefix: "first-",
        elements: {
          "first-card": SecondElement,
        },
      })
    ).toThrow(/already registered by plugin "first"/);
  });

  it("allows only allowlisted built-in plugins to register official dk elements", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["core"],
    });
    class OfficialElement extends env.HTMLElement {}

    expect(() =>
      registry.registerPlugin({
        name: "fake-official",
        official: true,
        elementPrefix: "dk-",
        elements: {
          "dk-fake": OfficialElement,
        },
      })
    ).toThrow(/reserved Decknow element prefix/);

    expect(() =>
      registry.registerBuiltInPlugin({
        name: "not-allowlisted",
        elements: {
          "dk-nope": OfficialElement,
        },
      })
    ).toThrow(/not in the official allowlist/);

    const summary = registry.registerBuiltInPlugin({
      name: "core",
      elements: {
        "dk-official": OfficialElement,
      },
    });

    expect(summary).toMatchObject({
      name: "core",
      trusted: true,
      elements: ["dk-official"],
    });
    expect(env.customElements.get("dk-official")).toBe(OfficialElement);
  });

  it("requires public elements to match their declared elementPrefix", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class TestElement extends env.HTMLElement {}

    expect(() =>
      registry.registerPlugin({
        name: "missing-prefix",
        elements: {
          "x-card": TestElement,
        },
      })
    ).toThrow(/must declare elementPrefix/);

    expect(() =>
      registry.registerPlugin({
        name: "wrong-prefix",
        elementPrefix: "acme-",
        elements: {
          "other-card": TestElement,
        },
      })
    ).toThrow(/must use declared prefix "acme-"/);
  });

  it("ignores plugin self-declared trust metadata", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class TestElement extends env.HTMLElement {}

    const summary = registry.registerPlugin({
      name: "self-declared-official",
      official: true,
      trusted: true,
      elementPrefix: "self-",
      elements: {
        "self-card": TestElement,
      },
      meta: {
        builtin: true,
        official: true,
        trusted: true,
        label: "safe metadata",
      },
    });

    expect(summary.trusted).toBe(false);
    expect(summary.meta).toEqual({
      label: "safe metadata",
    });
  });

  it("rejects invalid elements before creating partial registration side effects", () => {
    const env = createTestEnvironment();
    const registry = createPluginRegistry(env);
    class ValidElement extends env.HTMLElement {}

    expect(() =>
      registry.registerPlugin({
        name: "bad-plugin",
        elementPrefix: "dk-",
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
      colorScheme: "LIGHT",
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
      colorScheme: "light",
      styles: [
        {
          id: "tokens",
          css: "dk-deck[theme='sample'] { --dk-accent: red; }",
        },
      ],
    });
  });

  it("rejects non-declarative theme color schemes", () => {
    expect(() =>
      normalizePlugin({
        name: "theme:sample",
        kind: "theme",
        themes: ["sample"],
        colorScheme: "sepia",
      })
    ).toThrow(/colorScheme/);
  });
});
