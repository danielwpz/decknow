import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("standard runtime plugin bootstrap", () => {
  it("loads terminal-green as a default built-in theme plugin with injected tokens", async () => {
    const env = installDom();

    await import("./decknow.js");

    const theme = env.window.__DECKNOW__.getPlugin("theme:terminal-green");
    expect(theme).toMatchObject({
      name: "theme:terminal-green",
      kind: "theme",
      trusted: true,
      themes: ["terminal-green"],
      styleIds: ["decknow-plugin-theme-terminal-green-tokens-styles"],
    });
    expect(env.window.__DECKNOW__.getRuntimeManifest().themes).toEqual(["terminal-green"]);
    expect(
      env.document.getElementById("decknow-plugin-theme-terminal-green-tokens-styles")?.textContent
    ).toContain("--dk-deck-bg: #050608");
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

  it("injects theme tokens before core responsive rules", async () => {
    const env = installDom();

    await import("./decknow.js");

    const styleIds = Array.from(env.document.querySelectorAll("style"), (style) => style.id);
    expect(styleIds.indexOf("decknow-plugin-theme-terminal-green-tokens-styles")).toBeLessThan(
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
