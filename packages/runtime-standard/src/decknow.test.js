import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("standard runtime plugin bootstrap", () => {
  it("loads built-in theme plugins with injected tokens", async () => {
    const env = installDom();

    await import("./decknow.js");

    const theme = env.window.__DECKNOW__.getPlugin("theme:terminal-green");
    expect(theme).toMatchObject({
      name: "theme:terminal-green",
      kind: "theme",
      trusted: true,
      themes: ["terminal-green"],
      colorScheme: "dark",
      styleIds: ["decknow-plugin-theme-terminal-green-tokens-styles"],
    });
    expect(
      env.document.getElementById("decknow-plugin-theme-terminal-green-tokens-styles")?.textContent
    ).toContain("--dk-deck-bg: #050608");
    const paperInkTheme = env.window.__DECKNOW__.getPlugin("theme:paper-ink");
    expect(paperInkTheme).toMatchObject({
      name: "theme:paper-ink",
      kind: "theme",
      trusted: true,
      themes: ["paper-ink"],
      colorScheme: "light",
      styleIds: ["decknow-plugin-theme-paper-ink-tokens-styles"],
    });
    expect(env.window.__DECKNOW__.getRuntimeManifest().themes).toEqual([
      "terminal-green",
      "paper-ink",
    ]);
    expect(env.window.__DECKNOW__.getRuntimeManifest().themeColorSchemes).toEqual({
      "terminal-green": "dark",
      "paper-ink": "light",
    });
    expect(env.window.__DECKNOW__.getThemeColorScheme("paper-ink")).toBe("light");
    expect(
      env.document.getElementById("decknow-plugin-theme-paper-ink-tokens-styles")?.textContent
    ).toContain("--dk-deck-bg: #efe8dc");
    expect(env.window.__DECKNOW__.getPlugin("core")).toMatchObject({
      styleIds: ["decknow-plugin-core-runtime-styles"],
    });
    expect(
      env.document.getElementById("decknow-plugin-core-runtime-styles")?.textContent
    ).not.toContain("--dk-deck-bg: #050608");
  });

  it("exposes declarative width controls from core styles", async () => {
    const env = installDom();

    await import("./decknow.js");

    const coreStyles =
      env.document.getElementById("decknow-plugin-core-runtime-styles")?.textContent || "";
    expect(coreStyles).toContain('dk-slide[content-width="full"]');
    expect(coreStyles).toContain('[width="wide"]');
    expect(coreStyles).toContain("--dk-width: 100%");
    expect(coreStyles).toContain("--dk-auto-width: 68ch");
  });

  it("gives dk-raw a minimal themed HTML baseline without owning raw markup", async () => {
    const env = installDom();

    await import("./decknow.js");

    const coreStyles =
      env.document.getElementById("decknow-plugin-core-runtime-styles")?.textContent || "";
    expect(coreStyles).toContain("dk-raw :is(p, ul, ol, blockquote, pre, table, figure)");
    expect(coreStyles).toContain("dk-raw code");
    expect(coreStyles).toContain("dk-raw table");
    expect(coreStyles).toContain("accent-color: var(--dk-accent)");
  });

  it("adapts runtime chrome from theme color schemes", async () => {
    const env = installDom();

    await import("./decknow.js");

    env.document.body.innerHTML = `
      <dk-deck theme="paper-ink">
        <dk-slide><dk-title>Light theme</dk-title></dk-slide>
      </dk-deck>
    `;
    const deck = env.document.querySelector("dk-deck");
    deck.mount();

    expect(deck.dataset.dkColorScheme).toBe("light");
    expect(env.document.body.dataset.dkColorScheme).toBe("light");
    expect(env.window.__DECKNOW__.getColorScheme()).toBe("light");
    expect(deck.screenshotState()).toMatchObject({
      theme: "paper-ink",
      colorScheme: "light",
    });

    const coreStyles =
      env.document.getElementById("decknow-plugin-core-runtime-styles")?.textContent || "";
    expect(coreStyles).toContain('dk-deck[data-dk-color-scheme="light"] .dk-slide-dots');
    expect(coreStyles).toContain(
      "--dk-chrome-dot-active-bg: linear-gradient(180deg, #e3d8c4, #c9b79b)"
    );
  });

  it("injects theme tokens before core responsive rules", async () => {
    const env = installDom();

    await import("./decknow.js");

    const styleIds = Array.from(env.document.querySelectorAll("style"), (style) => style.id);
    expect(styleIds.indexOf("decknow-plugin-theme-terminal-green-tokens-styles")).toBeLessThan(
      styleIds.indexOf("decknow-plugin-core-runtime-styles")
    );
    expect(styleIds.indexOf("decknow-plugin-theme-paper-ink-tokens-styles")).toBeLessThan(
      styleIds.indexOf("decknow-plugin-core-runtime-styles")
    );

    const coreStyles =
      env.document.getElementById("decknow-plugin-core-runtime-styles")?.textContent || "";
    expect(coreStyles).toContain("@media (min-width: 641px) and (orientation: portrait)");
    expect(coreStyles).toContain("--dk-stage-aspect: 3 / 4");
  });
});

function installDom() {
  const window = new Window();
  const env = {
    window,
    document: window.document,
    customElements: window.customElements,
  };

  vi.stubGlobal("window", window);
  vi.stubGlobal("document", window.document);
  vi.stubGlobal("customElements", window.customElements);
  vi.stubGlobal("HTMLElement", window.HTMLElement);
  vi.stubGlobal("MutationObserver", window.MutationObserver);
  vi.stubGlobal("ResizeObserver", TestResizeObserver);
  vi.stubGlobal("CustomEvent", window.CustomEvent);
  vi.stubGlobal("requestAnimationFrame", (callback) => {
    callback();
    return 1;
  });
  vi.stubGlobal("getComputedStyle", window.getComputedStyle.bind(window));

  return env;
}

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
