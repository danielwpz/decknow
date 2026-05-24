import { createPluginRegistry } from "./plugin-registry.js";

const DECKNOW_VERSION = "0.0.1";
const RUNTIME_KEY = "__DECKNOW__";

const runtimeState = {
  decks: [],
  activeDeck: null,
  resolveReady: null,
};

const runtimeReady = new Promise((resolve) => {
  runtimeState.resolveReady = resolve;
});

const pluginRegistry = createPluginRegistry();

function isDebugEnabled() {
  return (
    new URLSearchParams(window.location.search).has("debug") ||
    window.location.hash.includes("debug=1") ||
    window.localStorage?.getItem("decknow:debug") === "1" ||
    document.querySelector("dk-deck[debug]") !== null
  );
}

function formatDebugValue(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function appendDebugLine(...args) {
  const panel = document.getElementById("decknow-debug-panel");
  if (!panel) return;
  const line = document.createElement("div");
  line.textContent = args.map(formatDebugValue).join(" ");
  panel.appendChild(line);
  while (panel.childNodes.length > 18) panel.removeChild(panel.firstChild);
  panel.scrollTop = panel.scrollHeight;
}

function debugLog(...args) {
  if (!isDebugEnabled()) return;
  window.__DECKNOW_DEBUG__ ||= [];
  window.__DECKNOW_DEBUG__.push(args);
  console.debug("[decknow]", ...args);
  appendDebugLine("[decknow]", ...args);
}

function exportDebugText() {
  return JSON.stringify(
    {
      debug: window.__DECKNOW_DEBUG__ || [],
      state: window.__DECKNOW__?.screenshotState?.() || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
    },
    null,
    2
  );
}

window.__DECKNOW_DEBUG_TEXT__ = exportDebugText;
window.__DECKNOW_COPY_DEBUG__ = async () => {
  const text = exportDebugText();
  await navigator.clipboard?.writeText(text);
  return text;
};

function canUseHistoryState() {
  return window.location.protocol !== "file:";
}

function createRuntimeApi() {
  return {
    version: DECKNOW_VERSION,
    ready: runtimeReady,
    get decks() {
      return runtimeState.decks;
    },
    get activeDeck() {
      return runtimeState.activeDeck;
    },
    getSlideCount() {
      return runtimeState.activeDeck?.getSlideCount() ?? 0;
    },
    goToSlide(index) {
      return runtimeState.activeDeck?.goToSlide(index) ?? Promise.resolve();
    },
    setStep(step) {
      return runtimeState.activeDeck?.setStep(step) ?? Promise.resolve();
    },
    screenshotState() {
      return runtimeState.activeDeck?.screenshotState() ?? null;
    },
    registerPlugin(plugin) {
      return pluginRegistry.registerPlugin(plugin);
    },
    getPlugin(name) {
      return pluginRegistry.getPlugin(name);
    },
    getPlugins() {
      return pluginRegistry.getPlugins();
    },
    getSelectableSelectors() {
      return pluginRegistry.getSelectableSelectors();
    },
    getRuntimeManifest() {
      return pluginRegistry.getManifest();
    },
  };
}

if (!window[RUNTIME_KEY]) {
  window[RUNTIME_KEY] = createRuntimeApi();
}

function injectStyles() {
  if (document.getElementById("decknow-runtime-styles")) return;

  const style = document.createElement("style");
  style.id = "decknow-runtime-styles";
  style.textContent = `
    :root,
    dk-deck,
    dk-deck[theme="terminal-green"] {
      --dk-deck-bg: #050608;
      --dk-deck-background:
        radial-gradient(circle at 16% 12%, rgba(57, 211, 83, 0.16), transparent 28%),
        radial-gradient(circle at 84% 80%, rgba(255, 143, 61, 0.12), transparent 30%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 34%),
        #050608;
      --dk-slide-bg: transparent;
      --dk-slide-surface:
        linear-gradient(180deg, rgba(13, 17, 23, 0.94), rgba(5, 6, 8, 0.97)),
        var(--dk-slide-bg);
      --dk-slide-solid-surface: #0d1117;
      --dk-slide-overlay:
        linear-gradient(rgba(255, 255, 255, 0.026) 1px, transparent 1px);
      --dk-slide-overlay-size: 100% 6px;
      --dk-slide-overlay-opacity: 1;
      --dk-slide-strip: linear-gradient(90deg, var(--dk-accent), var(--dk-accent-2));
      --dk-slide-ink: #f0f6fc;
      --dk-muted: #8b949e;
      --dk-border: rgba(139, 148, 158, 0.24);
      --dk-slide-border: rgba(139, 148, 158, 0.22);
      --dk-accent: #39d353;
      --dk-accent-2: #ff8f3d;
      --dk-panel-surface: rgba(13, 17, 23, 0.72);
      --dk-panel-surface-muted: rgba(48, 54, 61, 0.42);
      --dk-panel-surface-accent:
        linear-gradient(135deg, rgba(57, 211, 83, 0.18), rgba(13, 17, 23, 0.72));
      --dk-panel-surface-strong: #39d353;
      --dk-panel-ink-strong: #06150a;
      --dk-panel-border: rgba(57, 211, 83, 0.24);
      --dk-panel-shadow: 0 18px 60px rgba(0, 0, 0, 0.34);
      --dk-code-bg: rgba(1, 4, 9, 0.92);
      --dk-code-ink: #d9ffe9;
      --dk-inline-code-bg: rgba(57, 211, 83, 0.11);
      --dk-quote-surface: rgba(255, 143, 61, 0.1);
      --dk-table-surface: rgba(13, 17, 23, 0.68);
      --dk-table-header-surface: rgba(57, 211, 83, 0.16);
      --dk-shadow: 0 30px 90px rgba(0, 0, 0, 0.48);
      --dk-radius: 8px;
      --dk-deck-pad: clamp(12px, 2vw, 28px);
      --dk-stage-vh: 100vh;
      --dk-stage-aspect: 16 / 9;
      --dk-stage-fit-width: 16;
      --dk-stage-fit-height: 9;
      --dk-slide-pad: clamp(28px, 5.2cqw, 76px);
      --dk-slide-gap: clamp(14px, 2.2cqw, 30px);
      --dk-grid-gap: clamp(14px, 2cqw, 28px);
      --dk-grid-gap-sm: clamp(8px, 1.2cqw, 16px);
      --dk-grid-gap-lg: clamp(20px, 3cqw, 42px);
      --dk-stack-gap: clamp(10px, 1.5cqw, 22px);
      --dk-stack-gap-sm: clamp(6px, 1cqw, 14px);
      --dk-stack-gap-lg: clamp(18px, 2.4cqw, 36px);
      --dk-region-pad: clamp(14px, 2cqw, 28px);
      --dk-title-size: clamp(42px, 7.6cqw, 108px);
      --dk-title-size-tablet: clamp(36px, 6.8cqw, 72px);
      --dk-title-size-phone: clamp(28px, 7cqw, 42px);
      --dk-subtitle-size: clamp(17px, 1.9cqw, 30px);
      --dk-subtitle-size-tablet: clamp(14px, 1.8cqw, 20px);
      --dk-subtitle-size-phone: clamp(12px, 3.4cqw, 16px);
      --dk-heading-size: clamp(28px, 4cqw, 58px);
      --dk-heading-size-tablet: clamp(22px, 3.4cqw, 38px);
      --dk-heading-size-phone: clamp(18px, 5.2cqw, 26px);
      --dk-heading-3-size: clamp(22px, 2.8cqw, 40px);
      --dk-heading-3-size-tablet: clamp(18px, 2.6cqw, 28px);
      --dk-heading-3-size-phone: clamp(15px, 4.2cqw, 20px);
      --dk-heading-4-size: clamp(18px, 2.1cqw, 28px);
      --dk-heading-4-size-tablet: clamp(15px, 2.1cqw, 22px);
      --dk-heading-4-size-phone: clamp(13px, 3.6cqw, 17px);
      --dk-text-size: clamp(17px, 1.65cqw, 26px);
      --dk-text-size-tablet: clamp(13px, 1.5cqw, 18px);
      --dk-text-size-phone: clamp(11px, 3.1cqw, 14px);
      --dk-item-size: clamp(17px, 1.58cqw, 25px);
      --dk-item-size-tablet: clamp(13px, 1.45cqw, 18px);
      --dk-item-size-phone: clamp(11px, 3cqw, 14px);
      --dk-code-size: clamp(13px, 1.28cqw, 20px);
      --dk-code-size-tablet: clamp(11px, 1.16cqw, 15px);
      --dk-code-size-phone: clamp(10px, 2.7cqw, 12px);
      --dk-quote-size: clamp(24px, 3.3cqw, 50px);
      --dk-quote-size-tablet: clamp(18px, 2.7cqw, 30px);
      --dk-quote-size-phone: clamp(15px, 4.2cqw, 20px);
      --dk-cell-size: clamp(13px, 1.22cqw, 19px);
      --dk-cell-size-tablet: clamp(11px, 1.1cqw, 15px);
      --dk-cell-size-phone: clamp(10px, 2.6cqw, 12px);
      --dk-font-display: "JetBrains Mono", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      --dk-font-body: var(--dk-font-display);
      --dk-font-mono: var(--dk-font-display);
      --dk-title-prefix: "> ";
      --dk-heading-prefix: "// ";
    }

    html,
    body {
      height: 100%;
      min-height: 100%;
      margin: 0;
      overflow: hidden;
    }

    body {
      background: var(--dk-deck-bg);
      overscroll-behavior: none;
    }

    @supports (height: 100svh) {
      dk-deck,
      dk-deck[theme] {
        --dk-stage-vh: 100svh;
      }
    }

    @supports (height: 100dvh) {
      dk-deck,
      dk-deck[theme] {
        --dk-stage-vh: 100dvh;
      }
    }

    dk-deck {
      width: 100%;
      min-height: var(--dk-stage-vh);
      height: var(--dk-stage-vh);
      display: grid;
      place-items: center;
      position: relative;
      padding: var(--dk-deck-pad);
      box-sizing: border-box;
      overflow: hidden;
      background: var(--dk-deck-background);
      font-family: var(--dk-font-body);
      color: var(--dk-slide-ink);
      outline: none;
      user-select: text;
      -webkit-user-select: text;
      overscroll-behavior: none;
      touch-action: pan-x pinch-zoom;
    }

    dk-slide {
      width: min(
        calc(100vw - var(--dk-deck-pad) - var(--dk-deck-pad)),
        calc(
          (var(--dk-stage-vh) - var(--dk-deck-pad) - var(--dk-deck-pad)) *
          var(--dk-stage-fit-width) /
          var(--dk-stage-fit-height)
        )
      );
      max-height: calc(var(--dk-stage-vh) - var(--dk-deck-pad) - var(--dk-deck-pad));
      aspect-ratio: var(--dk-stage-aspect);
      display: none;
      flex-direction: column;
      justify-content: center;
      gap: var(--dk-slide-gap);
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
      isolation: isolate;
      container-name: dk-slide;
      container-type: size;
      padding: var(--dk-slide-pad);
      background: var(--dk-slide-surface);
      color: var(--dk-slide-ink);
      border: 1px solid var(--dk-slide-border);
      border-radius: var(--dk-radius);
      box-shadow: var(--dk-shadow);
      user-select: text;
      -webkit-user-select: text;
    }

    @media (max-width: 1180px) {
      dk-deck,
      dk-deck[theme] {
        --dk-deck-pad: clamp(10px, 2vw, 22px);
      }
    }

    @media (max-width: 820px) and (orientation: portrait) {
      dk-deck,
      dk-deck[theme] {
        --dk-deck-pad: clamp(10px, 2vw, 16px);
      }
    }

    @media (min-width: 641px) and (orientation: portrait) {
      dk-deck,
      dk-deck[theme] {
        --dk-deck-pad: clamp(14px, 2.2vw, 24px);
        --dk-stage-aspect: 3 / 4;
        --dk-stage-fit-width: 3;
        --dk-stage-fit-height: 4;
      }
    }

    @media (min-width: 900px) and (orientation: landscape) and (max-aspect-ratio: 1.45) {
      dk-deck,
      dk-deck[theme] {
        --dk-deck-pad: clamp(14px, 2.2vw, 24px);
        --dk-stage-aspect: 4 / 3;
        --dk-stage-fit-width: 4;
        --dk-stage-fit-height: 3;
      }
    }

    dk-slide[surface="none"] {
      --dk-slide-surface: transparent;
      --dk-slide-border: transparent;
      --dk-shadow: none;
      --dk-slide-overlay-opacity: 0;
      --dk-slide-strip: transparent;
    }

    dk-slide[surface="solid"] {
      --dk-slide-surface: var(--dk-slide-solid-surface);
    }

    dk-slide[data-active="true"] {
      display: flex;
    }

    dk-slide::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 1px solid var(--dk-border);
      border-radius: calc(var(--dk-radius) - 1px);
      background-image: var(--dk-slide-overlay);
      background-size: var(--dk-slide-overlay-size);
      opacity: var(--dk-slide-overlay-opacity);
      pointer-events: none;
    }

    dk-slide::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 6px;
      background: var(--dk-slide-strip);
      pointer-events: none;
    }

    dk-slide[layout="hero"] {
      align-items: flex-start;
      justify-content: center;
    }

    dk-slide[layout="center"] {
      align-items: center;
      text-align: center;
    }

    dk-title,
    dk-subtitle,
    dk-heading,
    dk-text,
    dk-list,
    dk-code,
    dk-quote,
    dk-table,
    dk-grid,
    dk-region,
    dk-stack,
    dk-raw {
      position: relative;
      z-index: 1;
      max-width: min(100%, 1120px);
    }

    dk-slide[align="center"],
    dk-region[align="center"],
    dk-stack[align="center"] {
      text-align: center;
      align-items: center;
    }

    dk-slide[align="right"],
    dk-region[align="right"],
    dk-stack[align="right"] {
      text-align: right;
      align-items: flex-end;
    }

    dk-heading[align="center"],
    dk-text[align="center"],
    dk-cell[align="center"] {
      text-align: center;
    }

    dk-heading[align="right"],
    dk-text[align="right"],
    dk-cell[align="right"] {
      text-align: right;
    }

    dk-title {
      display: block;
      max-width: 15ch;
      font-family: var(--dk-font-display);
      font-size: var(--dk-title-size);
      line-height: 0.96;
      letter-spacing: 0;
      font-weight: 800;
      color: var(--dk-slide-ink);
      text-wrap: balance;
      overflow-wrap: anywhere;
      text-shadow: 0 0 36px rgba(57, 211, 83, 0.12);
    }

    dk-title::before {
      content: var(--dk-title-prefix);
      color: var(--dk-accent);
    }

    dk-subtitle {
      display: block;
      max-width: 56ch;
      color: var(--dk-muted);
      font-size: var(--dk-subtitle-size);
      line-height: 1.34;
      font-weight: 500;
      overflow-wrap: anywhere;
    }

    dk-heading {
      display: block;
      font-family: var(--dk-font-display);
      font-size: var(--dk-heading-size);
      line-height: 1.08;
      font-weight: 780;
      text-wrap: balance;
      overflow-wrap: anywhere;
    }

    dk-heading[level="2"]::before {
      content: var(--dk-heading-prefix);
      color: var(--dk-accent);
      font-weight: 700;
    }

    dk-heading[level="3"] {
      font-size: var(--dk-heading-3-size);
    }

    dk-heading[level="4"] {
      font-size: var(--dk-heading-4-size);
    }

    dk-text {
      display: block;
      max-width: 68ch;
      font-size: var(--dk-text-size);
      line-height: 1.48;
      color: var(--dk-slide-ink);
      overflow-wrap: anywhere;
    }

    dk-text[tone="muted"] {
      color: var(--dk-muted);
    }

    dk-text[tone="accent"] {
      color: var(--dk-accent);
    }

    dk-list {
      display: flex;
      flex-direction: column;
      gap: var(--dk-stack-gap);
      margin: 0;
      padding: 0;
      counter-reset: dk-list;
    }

    dk-item {
      display: flex;
      align-items: start;
      gap: clamp(8px, 1.2cqw, 18px);
      font-size: var(--dk-item-size);
      line-height: 1.38;
      overflow-wrap: anywhere;
    }

    .dk-item__body {
      display: block;
      flex: 1 1 auto;
      min-width: 0;
    }

    dk-item::before {
      content: ">";
      width: 1.1em;
      margin-top: 0;
      color: var(--dk-accent);
      font-weight: 800;
      flex: 0 0 auto;
    }

    dk-list[ordered] dk-item {
      counter-increment: dk-list;
    }

    dk-list[ordered] dk-item::before {
      content: counter(dk-list);
      width: clamp(24px, 2.2cqw, 34px);
      height: clamp(24px, 2.2cqw, 34px);
      margin-top: -0.1em;
      display: grid;
      place-items: center;
      color: var(--dk-panel-ink-strong);
      font-size: 0.78em;
      font-weight: 800;
      border-radius: 999px;
      background: var(--dk-accent);
    }

    dk-code {
      display: block;
    }

    dk-code[inline] {
      display: inline;
    }

    dk-code pre {
      margin: 0;
      padding: clamp(16px, 2cqw, 28px);
      max-height: min(46cqh, 420px);
      overflow: auto;
      border-radius: 8px;
      background: var(--dk-code-bg);
      color: var(--dk-code-ink);
      border: 1px solid rgba(57, 211, 83, 0.22);
      font-family: var(--dk-font-mono);
      font-size: var(--dk-code-size);
      line-height: 1.55;
      white-space: pre-wrap;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    dk-code code,
    dk-code[inline] code {
      font-family: var(--dk-font-mono);
    }

    dk-code[inline] code {
      padding: 0.08em 0.34em;
      border-radius: 5px;
      background: var(--dk-inline-code-bg);
      color: var(--dk-accent);
      border: 1px solid rgba(57, 211, 83, 0.2);
      font-size: 0.9em;
      white-space: nowrap;
    }

    dk-quote {
      display: block;
      max-width: 54ch;
      padding: clamp(14px, 2.4cqw, 34px);
      border-left: clamp(5px, 0.75cqw, 10px) solid var(--dk-accent-2);
      background: var(--dk-quote-surface);
      border-radius: 0 8px 8px 0;
      font-family: var(--dk-font-display);
      font-size: var(--dk-quote-size);
      line-height: 1.13;
    }

    dk-quote[cite]::after {
      content: attr(cite);
      display: block;
      margin-top: clamp(12px, 1.4cqw, 20px);
      font-family: var(--dk-font-body);
      color: var(--dk-muted);
      font-size: clamp(13px, 1.2cqw, 18px);
      line-height: 1.3;
    }

    dk-link {
      display: inline;
    }

    dk-link a {
      color: var(--dk-accent);
      text-decoration-thickness: 0.12em;
      text-underline-offset: 0.18em;
      font-weight: 700;
      overflow-wrap: anywhere;
    }

    dk-table {
      display: block;
      overflow: hidden;
      border: 1px solid var(--dk-border);
      border-radius: 8px;
      background: var(--dk-table-surface);
    }

    dk-row,
    dk-tr {
      display: grid;
      grid-template-columns: repeat(var(--dk-table-columns, 2), minmax(0, 1fr));
      border-bottom: 1px solid var(--dk-border);
    }

    dk-row:last-child,
    dk-tr:last-child {
      border-bottom: 0;
    }

    dk-row[header],
    dk-tr[header] {
      background: var(--dk-table-header-surface);
      color: var(--dk-accent);
      font-weight: 800;
    }

    dk-cell,
    dk-th,
    dk-td {
      display: block;
      min-width: 0;
      padding: clamp(10px, 1.25cqw, 18px);
      border-right: 1px solid var(--dk-border);
      font-size: var(--dk-cell-size);
      line-height: 1.35;
    }

    dk-cell:last-child,
    dk-th:last-child,
    dk-td:last-child {
      border-right: 0;
    }

    dk-strong {
      display: inline;
      font-weight: 850;
    }

    dk-em {
      display: inline;
      font-style: italic;
      color: var(--dk-accent);
    }

    dk-grid {
      --dk-grid-columns: 2;
      --dk-grid-rows: auto;
      --dk-region-span: 1;
      display: grid;
      width: 100%;
      max-width: 100%;
      min-height: 0;
      --dk-grid-layout-columns: var(--dk-grid-columns);
      grid-template-columns: repeat(var(--dk-grid-layout-columns), minmax(0, 1fr));
      grid-auto-rows: minmax(0, 1fr);
      gap: var(--dk-grid-gap);
      align-items: stretch;
    }

    dk-grid[gap="none"] {
      gap: 0;
    }

    dk-grid[gap="sm"] {
      gap: var(--dk-grid-gap-sm);
    }

    dk-grid[gap="lg"] {
      gap: var(--dk-grid-gap-lg);
    }

    dk-grid[align="start"] {
      align-items: start;
    }

    dk-grid[align="center"] {
      align-items: center;
    }

    dk-grid[align="end"] {
      align-items: end;
    }

    dk-region {
      display: flex;
      min-width: 0;
      min-height: 0;
      flex-direction: column;
      justify-content: center;
      gap: var(--dk-stack-gap);
      grid-column: span var(--dk-region-span);
    }

    dk-region[frame] {
      padding: var(--dk-region-pad);
      border: 1px solid var(--dk-region-border, var(--dk-panel-border));
      border-left: 4px solid var(--dk-region-accent, var(--dk-accent));
      border-radius: 8px;
      background: var(--dk-region-surface, var(--dk-panel-surface));
      box-shadow: var(--dk-region-shadow, var(--dk-panel-shadow));
      backdrop-filter: blur(10px);
    }

    dk-region[frame][tone="muted"] {
      --dk-region-accent: var(--dk-muted);
      --dk-region-border: var(--dk-border);
      --dk-region-surface: var(--dk-panel-surface-muted);
    }

    dk-region[frame][tone="accent"] {
      --dk-region-surface: var(--dk-panel-surface-accent);
      --dk-region-border: rgba(57, 211, 83, 0.34);
    }

    dk-region[frame][tone="strong"] {
      --dk-region-surface: var(--dk-panel-surface-strong);
      --dk-region-border: rgba(57, 211, 83, 0.6);
      --dk-region-accent: var(--dk-accent-2);
      color: var(--dk-panel-ink-strong);
    }

    dk-region[frame][tone="strong"] dk-text,
    dk-region[frame][tone="strong"] dk-subtitle {
      color: rgba(6, 21, 10, 0.78);
    }

    dk-region[frame][surface="none"] {
      --dk-region-surface: transparent;
      --dk-region-border: transparent;
      --dk-region-accent: transparent;
      --dk-region-shadow: none;
      backdrop-filter: none;
    }

    dk-region[frame][surface="solid"] {
      --dk-region-surface: var(--dk-slide-solid-surface);
    }

    dk-region[frame][surface="glass"] {
      --dk-region-surface: rgba(13, 17, 23, 0.46);
      --dk-region-border: rgba(240, 246, 252, 0.16);
    }

    dk-region[valign="top"],
    dk-stack[valign="top"] {
      justify-content: flex-start;
    }

    dk-region[valign="center"],
    dk-stack[valign="center"] {
      justify-content: center;
    }

    dk-region[valign="bottom"],
    dk-stack[valign="bottom"] {
      justify-content: flex-end;
    }

    dk-region[valign="stretch"],
    dk-stack[valign="stretch"] {
      justify-content: stretch;
    }

    dk-stack {
      display: flex;
      min-width: 0;
      min-height: 0;
      flex-direction: column;
      gap: var(--dk-stack-gap);
    }

    dk-stack[direction="horizontal"] {
      flex-direction: row;
      align-items: stretch;
    }

    dk-stack[gap="none"] {
      gap: 0;
    }

    dk-stack[gap="sm"] {
      gap: var(--dk-stack-gap-sm);
    }

    dk-stack[gap="lg"] {
      gap: var(--dk-stack-gap-lg);
    }

    dk-stack[align="start"],
    dk-stack[align="left"] {
      align-items: flex-start;
      text-align: left;
    }

    dk-stack[align="end"],
    dk-stack[align="right"] {
      align-items: flex-end;
      text-align: right;
    }

    dk-stack[align="stretch"] {
      align-items: stretch;
    }

    dk-raw {
      display: block;
      min-width: 0;
      min-height: 0;
    }

    dk-raw[frame] {
      padding: var(--dk-region-pad);
      border: 1px dashed var(--dk-border);
      border-radius: 8px;
      background: rgba(13, 17, 23, 0.38);
    }

    dk-slide[layout="grid"] > dk-grid,
    dk-slide[layout="split"] > dk-grid {
      flex: 1;
    }

    .dk-slide-dots {
      position: fixed;
      top: 50%;
      right: clamp(14px, 2vw, 28px);
      transform: translateY(-50%) translateX(8px);
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: clamp(8px, 1.1vh, 14px);
      padding: 10px 8px;
      border: 1px solid rgba(139, 148, 158, 0.18);
      border-radius: 999px;
      background: rgba(1, 4, 9, 0.38);
      backdrop-filter: blur(10px);
      opacity: 0.14;
      filter: saturate(0.7);
      pointer-events: none;
      transition:
        opacity 260ms ease,
        transform 260ms ease,
        filter 260ms ease,
        background 260ms ease,
        border-color 260ms ease;
    }

    .dk-slide-dots[data-visible="true"] {
      transform: translateY(-50%) translateX(0);
      opacity: 1;
      filter: saturate(1);
      border-color: rgba(139, 148, 158, 0.28);
      background: rgba(1, 4, 9, 0.56);
    }

    .dk-slide-dot {
      width: clamp(6px, 0.72vw, 9px);
      height: clamp(6px, 0.72vw, 9px);
      border-radius: 999px;
      background: rgba(139, 148, 158, 0.42);
      box-shadow: 0 0 0 1px rgba(240, 246, 252, 0.08);
      opacity: 0.72;
      transition:
        width 180ms ease,
        height 180ms ease,
        background 180ms ease,
        box-shadow 180ms ease,
        opacity 180ms ease;
    }

    .dk-slide-dot[aria-current="true"] {
      height: clamp(18px, 2.6vh, 30px);
      background: linear-gradient(180deg, var(--dk-accent), var(--dk-accent-2));
      box-shadow: 0 0 18px rgba(57, 211, 83, 0.34);
      opacity: 1;
    }

    .dk-slide-dot__text {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    @container dk-slide (max-width: 900px) {
      dk-title {
        font-size: var(--dk-title-size-tablet);
      }

      dk-subtitle {
        font-size: var(--dk-subtitle-size-tablet);
        line-height: 1.32;
      }

      dk-heading {
        font-size: var(--dk-heading-size-tablet);
      }

      dk-heading[level="3"] {
        font-size: var(--dk-heading-3-size-tablet);
      }

      dk-heading[level="4"] {
        font-size: var(--dk-heading-4-size-tablet);
      }

      dk-text {
        font-size: var(--dk-text-size-tablet);
        line-height: 1.42;
      }

      dk-item {
        font-size: var(--dk-item-size-tablet);
        line-height: 1.32;
      }

      dk-code pre {
        font-size: var(--dk-code-size-tablet);
        line-height: 1.44;
        max-height: 34cqh;
      }

      dk-quote {
        font-size: var(--dk-quote-size-tablet);
      }

      dk-cell,
      dk-th,
      dk-td {
        font-size: var(--dk-cell-size-tablet);
      }

      dk-grid:not([responsive="none"])[columns="5"],
      dk-grid:not([responsive="none"])[columns="6"] {
        --dk-grid-layout-columns: 3;
      }

      dk-grid:not([responsive="none"])[columns="4"] {
        --dk-grid-layout-columns: 2;
      }
    }

    @container dk-slide (max-width: 560px) {
      dk-title {
        max-width: 100%;
        font-size: var(--dk-title-size-phone);
      }

      dk-subtitle {
        max-width: 100%;
        font-size: var(--dk-subtitle-size-phone);
        line-height: 1.28;
      }

      dk-heading {
        font-size: var(--dk-heading-size-phone);
        line-height: 1.05;
      }

      dk-heading[level="3"] {
        font-size: var(--dk-heading-3-size-phone);
      }

      dk-heading[level="4"] {
        font-size: var(--dk-heading-4-size-phone);
      }

      dk-text {
        font-size: var(--dk-text-size-phone);
        line-height: 1.32;
      }

      dk-list {
        gap: clamp(5px, 1.2cqw, 10px);
      }

      dk-item {
        gap: clamp(5px, 1.2cqw, 10px);
        font-size: var(--dk-item-size-phone);
        line-height: 1.24;
      }

      dk-code pre {
        padding: clamp(8px, 2.4cqw, 14px);
        font-size: var(--dk-code-size-phone);
        line-height: 1.34;
        max-height: 30cqh;
      }

      dk-code[inline] code {
        white-space: normal;
        word-break: break-word;
      }

      dk-quote {
        padding: clamp(10px, 2.4cqw, 16px);
        font-size: var(--dk-quote-size-phone);
      }

      dk-table {
        overflow-x: auto;
      }

      dk-cell,
      dk-th,
      dk-td {
        padding: clamp(6px, 1.6cqw, 10px);
        font-size: var(--dk-cell-size-phone);
        line-height: 1.24;
      }

      dk-stack[direction="horizontal"]:not([responsive="none"]) {
        flex-direction: column;
      }
    }

    @media (max-width: 640px) and (orientation: portrait) {
      dk-deck,
      dk-deck[theme] {
        --dk-deck-pad: 12px;
        --dk-stage-aspect: 9 / 16;
        --dk-stage-fit-width: 9;
        --dk-stage-fit-height: 16;
      }

      dk-slide {
        --dk-slide-pad: clamp(22px, 7cqw, 30px);
        --dk-slide-gap: clamp(8px, 2.2cqw, 14px);
        --dk-grid-gap: clamp(8px, 2.2cqw, 14px);
        --dk-grid-gap-lg: clamp(10px, 2.8cqw, 18px);
        --dk-region-pad: clamp(8px, 2.2cqw, 14px);
        border-radius: 6px;
      }

      dk-grid:not([responsive="none"]) {
        --dk-grid-layout-columns: 1;
        grid-auto-rows: minmax(0, auto);
      }

      dk-grid:not([responsive="none"])[phone-columns="2"] {
        --dk-grid-layout-columns: 2;
      }

      .dk-slide-dots {
        top: auto;
        right: 50%;
        bottom: max(10px, env(safe-area-inset-bottom));
        flex-direction: row;
        transform: translateX(50%) translateY(8px);
      }

      .dk-slide-dots[data-visible="true"] {
        transform: translateX(50%) translateY(0);
      }

      .dk-slide-dot[aria-current="true"] {
        width: clamp(18px, 7vw, 30px);
        height: clamp(6px, 1.8vw, 9px);
      }
    }

    @media (max-height: 620px) {
      dk-slide::before {
        inset: 0;
      }

      dk-slide {
        gap: clamp(8px, 1.6cqw, 18px);
      }

      dk-code pre {
        max-height: 38cqh;
      }

      .dk-slide-dots {
        gap: 6px;
        padding: 8px 6px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      }
    }

    .dk-debug-panel {
      display: flex;
      flex-direction: column;
      gap: 4px;
      position: fixed;
      right: 10px;
      bottom: 10px;
      z-index: 99999;
      width: min(560px, calc(100vw - 20px));
      max-height: 220px;
      overflow: auto;
      padding: 10px 12px;
      border: 1px solid rgba(255, 255, 255, 0.24);
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.82);
      color: #d9ffe9;
      font: 12px/1.4 var(--dk-font-mono);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.38);
      pointer-events: auto;
      user-select: text;
      white-space: pre-wrap;
    }
  `;
  document.head.appendChild(style);
}

function afterChildrenParsed(element, callback) {
  if (element.dataset.dkRenderScheduled === "true") return;
  element.dataset.dkRenderScheduled = "true";
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
    return;
  }
  queueMicrotask(callback);
}

function isEditableOrInteractiveTarget(target) {
  return Boolean(
    target?.closest?.(
      'a, button, input, textarea, select, summary, [contenteditable="true"], [data-dk-swipe="ignore"]'
    )
  );
}

function hasTextSelection() {
  const selection = window.getSelection?.();
  return Boolean(selection && !selection.isCollapsed && selection.toString().trim());
}

class DKDeck extends HTMLElement {
  connectedCallback() {
    if (this.dataset.dkScheduled === "true") return;
    this.dataset.dkScheduled = "true";
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.mount(), { once: true });
    } else {
      this.mount();
    }
  }

  mount() {
    if (this.dataset.dkMounted === "true") return;
    this.dataset.dkMounted = "true";
    injectStyles();
    this.currentSlide = 0;
    this.currentStep = 0;
    this.slides = Array.from(this.querySelectorAll(":scope > dk-slide"));
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "0");
    this.ensureSlideDots();
    this.ensureDebugPanel();
    this.setupKeyboard();
    this.setupPointerNavigation();
    this.goToSlide(this.readInitialSlide(), { silent: true });
    this.focusDeck();

    runtimeState.decks.push(this);
    runtimeState.activeDeck = this;
    runtimeState.resolveReady?.(this);
    document.dispatchEvent(new CustomEvent("decknow:ready", { detail: { deck: this } }));
    debugLog("ready", this.screenshotState());
  }

  readInitialSlide() {
    const hash = window.location.hash.match(/slide-(\d+)/);
    if (!hash) return 0;
    return Math.max(0, Number(hash[1]) - 1);
  }

  ensureSlideDots() {
    this.refreshSlides();
    const existing = this.querySelector(":scope > .dk-slide-dots");
    const dots = existing || document.createElement("nav");
    dots.className = "dk-slide-dots";
    dots.setAttribute("aria-label", "Slide progress");
    dots.innerHTML = "";

    this.slides.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "dk-slide-dot";
      dot.setAttribute("aria-label", `Slide ${index + 1} of ${this.slides.length}`);
      const text = document.createElement("span");
      text.className = "dk-slide-dot__text";
      text.textContent = `Slide ${index + 1} of ${this.slides.length}`;
      dot.appendChild(text);
      dots.appendChild(dot);
    });

    if (!existing) this.appendChild(dots);
  }

  showSlideDots() {
    const dots = this.querySelector(":scope > .dk-slide-dots");
    if (!dots) return;
    dots.dataset.visible = "true";
    clearTimeout(this._slideDotsTimer);
    this._slideDotsTimer = setTimeout(() => {
      dots.dataset.visible = "false";
    }, 1200);
  }

  setupKeyboard() {
    if (this._keyboardReady) return;
    this._keyboardReady = true;
    const handleKey = (event) => {
      if (runtimeState.activeDeck && runtimeState.activeDeck !== this) return;
      const tagName = event.target?.tagName?.toLowerCase();
      debugLog("keydown", {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode || event.which,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        target: tagName,
        defaultPrevented: event.defaultPrevented,
        slide: this.currentSlide + 1,
      });
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) {
        debugLog("keydown ignored modifier shortcut");
        return;
      }
      if (["input", "textarea", "select", "button", "a"].includes(tagName)) {
        debugLog("keydown ignored target", tagName);
        return;
      }

      const key = event.key || "";
      const code = event.code || "";
      const keyCode = event.keyCode || event.which;
      const isNext =
        key === "ArrowRight" ||
        key === "ArrowDown" ||
        key === "Right" ||
        key === "Down" ||
        key === "PageDown" ||
        key === " " ||
        key === "Spacebar" ||
        code === "ArrowRight" ||
        code === "ArrowDown" ||
        code === "PageDown" ||
        code === "Space" ||
        keyCode === 39 ||
        keyCode === 40 ||
        keyCode === 34 ||
        keyCode === 32;
      const isPrevious =
        key === "ArrowLeft" ||
        key === "ArrowUp" ||
        key === "Left" ||
        key === "Up" ||
        key === "PageUp" ||
        code === "ArrowLeft" ||
        code === "ArrowUp" ||
        code === "PageUp" ||
        keyCode === 37 ||
        keyCode === 38 ||
        keyCode === 33;

      if (isNext) {
        event.preventDefault();
        debugLog("nav next");
        this.next();
        return;
      }

      if (isPrevious) {
        event.preventDefault();
        debugLog("nav previous");
        this.previous();
        return;
      }

      debugLog("keydown no match");
    };

    window.addEventListener("keydown", handleKey, { capture: true, passive: false });
  }

  setupPointerNavigation() {
    if (this._pointerNavigationReady) return;
    this._pointerNavigationReady = true;
    if (this.getAttribute("swipe") === "none") return;

    const swipe = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      intent: null,
      startedAt: 0,
    };

    const resetSwipe = () => {
      swipe.active = false;
      swipe.pointerId = null;
      swipe.intent = null;
    };

    this.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType && !["touch", "pen"].includes(event.pointerType)) return;
        if (!event.isPrimary || isEditableOrInteractiveTarget(event.target)) return;
        if (hasTextSelection()) return;

        swipe.active = true;
        swipe.pointerId = event.pointerId;
        swipe.startX = event.clientX;
        swipe.startY = event.clientY;
        swipe.lastX = event.clientX;
        swipe.lastY = event.clientY;
        swipe.intent = null;
        swipe.startedAt = performance.now();
      },
      { passive: true }
    );

    this.addEventListener(
      "pointermove",
      (event) => {
        if (!swipe.active || event.pointerId !== swipe.pointerId) return;

        swipe.lastX = event.clientX;
        swipe.lastY = event.clientY;
        const dx = swipe.lastX - swipe.startX;
        const dy = swipe.lastY - swipe.startY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (!swipe.intent && (absX > 10 || absY > 10)) {
          swipe.intent = absX > absY * 1.25 ? "horizontal" : "vertical";
        }

        if (swipe.intent === "vertical" && event.cancelable) {
          event.preventDefault();
        }
      },
      { passive: false }
    );

    this.addEventListener(
      "pointerup",
      (event) => {
        if (!swipe.active || event.pointerId !== swipe.pointerId) return;

        const dx = event.clientX - swipe.startX;
        const dy = event.clientY - swipe.startY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const elapsed = performance.now() - swipe.startedAt;
        const threshold = Math.max(44, Math.min(96, window.innerHeight * 0.07));
        const isSwipe = absY >= threshold && absY > absX * 1.25 && elapsed < 1200;

        resetSwipe();

        if (!isSwipe || hasTextSelection()) return;
        debugLog("swipe", {
          direction: dy < 0 ? "next" : "previous",
          dx: Math.round(dx),
          dy: Math.round(dy),
          elapsed: Math.round(elapsed),
          threshold: Math.round(threshold),
        });

        if (dy < 0) {
          this.next();
        } else {
          this.previous();
        }
      },
      { passive: true }
    );

    this.addEventListener("pointercancel", resetSwipe, { passive: true });
    this.addEventListener("lostpointercapture", resetSwipe, { passive: true });
  }

  focusDeck() {
    requestAnimationFrame(() => {
      this.focus({ preventScroll: true });
      document.body?.setAttribute("tabindex", "-1");
      debugLog("focus", document.activeElement?.tagName);
    });
  }

  ensureDebugPanel() {
    if (!isDebugEnabled() || document.getElementById("decknow-debug-panel")) return;
    const panel = document.createElement("div");
    panel.id = "decknow-debug-panel";
    panel.className = "dk-debug-panel";
    panel.setAttribute("role", "log");
    panel.setAttribute("aria-live", "polite");
    const title = document.createElement("div");
    title.textContent = "[decknow] debug enabled";
    const hint = document.createElement("div");
    hint.textContent = "Press ArrowRight / ArrowLeft. In console run: __DECKNOW_DEBUG_TEXT__()";
    panel.append(title, hint);
    document.body.appendChild(panel);
  }

  getSlideCount() {
    this.refreshSlides();
    return this.slides.length;
  }

  refreshSlides() {
    this.slides = Array.from(this.querySelectorAll(":scope > dk-slide"));
  }

  next() {
    return this.goToSlide(this.currentSlide + 1);
  }

  previous() {
    return this.goToSlide(this.currentSlide - 1);
  }

  async goToSlide(index, options = {}) {
    this.refreshSlides();
    if (!this.slides.length) return;
    const target = Math.max(0, Math.min(this.slides.length - 1, Number(index) || 0));
    this.currentSlide = target;
    this.currentStep = 0;

    this.slides.forEach((slide, slideIndex) => {
      const active = slideIndex === target;
      if (active) {
        slide.setAttribute("data-active", "true");
      } else {
        slide.removeAttribute("data-active");
      }
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });

    this.updateSlideDots();
    if (!options.silent) this.showSlideDots();
    if (!options.silent && canUseHistoryState()) {
      try {
        history.replaceState(null, "", `#slide-${target + 1}`);
      } catch (error) {
        debugLog("history update failed", error?.message || String(error));
      }
    }
    if (document.activeElement === document.body || document.activeElement === null) {
      this.focusDeck();
    }
    await this.settle();
  }

  async setStep(step) {
    this.currentStep = Math.max(0, Number(step) || 0);
    await this.settle();
  }

  async settle() {
    await document.fonts?.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  updateSlideDots() {
    const dots = Array.from(this.querySelectorAll(":scope > .dk-slide-dots .dk-slide-dot"));
    if (dots.length !== this.slides.length) {
      this.ensureSlideDots();
      return this.updateSlideDots();
    }

    dots.forEach((dot, index) => {
      const active = index === this.currentSlide;
      dot.setAttribute("aria-current", active ? "true" : "false");
      dot.dataset.active = active ? "true" : "false";
    });
  }

  screenshotState() {
    return {
      version: DECKNOW_VERSION,
      slideIndex: this.currentSlide,
      slideNumber: this.currentSlide + 1,
      step: this.currentStep,
      slideCount: this.getSlideCount(),
      theme: this.getAttribute("theme") || "terminal-green",
      fit: this.getAttribute("fit") || "contain",
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
      },
    };
  }
}

class DKSlide extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    if (!this.hasAttribute("aria-roledescription")) {
      this.setAttribute("aria-roledescription", "slide");
    }
  }
}

class DKLink extends HTMLElement {
  connectedCallback() {
    afterChildrenParsed(this, () => this.render());
  }

  render() {
    if (this.dataset.dkRendered === "true") return;
    this.dataset.dkRendered = "true";
    const anchor = document.createElement("a");
    anchor.href = this.getAttribute("href") || "#";
    anchor.target = this.getAttribute("target") || "_blank";
    anchor.rel = this.getAttribute("rel") || "noopener noreferrer";
    while (this.firstChild) anchor.appendChild(this.firstChild);
    this.appendChild(anchor);
  }
}

class DKCode extends HTMLElement {
  connectedCallback() {
    afterChildrenParsed(this, () => this.render());
  }

  render() {
    if (this.dataset.dkRendered === "true") return;
    this.dataset.dkRendered = "true";
    const text = this.hasAttribute("inline")
      ? this.textContent.trim()
      : this.textContent.replace(/^\n/, "").replace(/\n\s*$/, "");
    this.textContent = "";
    const code = document.createElement("code");
    code.textContent = text;
    const language = this.getAttribute("language");
    if (language) code.className = `language-${language}`;

    if (this.hasAttribute("inline")) {
      this.appendChild(code);
      return;
    }

    const pre = document.createElement("pre");
    pre.appendChild(code);
    this.appendChild(pre);
  }
}

class DKItem extends HTMLElement {
  connectedCallback() {
    afterChildrenParsed(this, () => this.render());
  }

  render() {
    if (this.dataset.dkRendered === "true") return;
    this.dataset.dkRendered = "true";
    if (this.querySelector(":scope > .dk-item__body")) return;
    const body = document.createElement("span");
    body.className = "dk-item__body";
    while (this.firstChild) body.appendChild(this.firstChild);
    this.appendChild(body);
  }
}

class DKTable extends HTMLElement {
  connectedCallback() {
    afterChildrenParsed(this, () => this.updateColumns());
  }

  updateColumns() {
    const rows = Array.from(this.querySelectorAll(":scope > dk-row, :scope > dk-tr"));
    const maxColumns = rows.reduce((max, row) => {
      const count = row.querySelectorAll(":scope > dk-cell, :scope > dk-th, :scope > dk-td").length;
      return Math.max(max, count);
    }, 1);
    this.style.setProperty("--dk-table-columns", String(maxColumns));
  }
}

class DKGrid extends HTMLElement {
  static observedAttributes = ["columns", "rows", "gap"];

  connectedCallback() {
    this.syncGrid();
  }

  attributeChangedCallback() {
    this.syncGrid();
  }

  syncGrid() {
    const columns = clampInteger(this.getAttribute("columns"), 1, 6, 2);
    const rows = clampInteger(this.getAttribute("rows"), 1, 6, null);
    this.style.setProperty("--dk-grid-columns", String(columns));
    if (rows) {
      this.style.gridTemplateRows = `repeat(${rows}, minmax(0, 1fr))`;
    }
  }
}

class DKRegion extends HTMLElement {
  static observedAttributes = ["span"];

  connectedCallback() {
    this.syncRegion();
  }

  attributeChangedCallback() {
    this.syncRegion();
  }

  syncRegion() {
    const span = clampInteger(this.getAttribute("span"), 1, 6, 1);
    this.style.setProperty("--dk-region-span", String(span));
  }
}

function clampInteger(value, min, max, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

const coreElements = {
  "dk-deck": DKDeck,
  "dk-slide": DKSlide,
  "dk-title": plainElementClass(),
  "dk-subtitle": plainElementClass(),
  "dk-heading": plainElementClass(),
  "dk-text": plainElementClass(),
  "dk-list": plainElementClass(),
  "dk-item": DKItem,
  "dk-code": DKCode,
  "dk-quote": plainElementClass(),
  "dk-link": DKLink,
  "dk-table": DKTable,
  "dk-grid": DKGrid,
  "dk-region": DKRegion,
  "dk-stack": plainElementClass(),
  "dk-raw": plainElementClass(),
  "dk-row": plainElementClass(),
  "dk-cell": plainElementClass(),
  "dk-tr": plainElementClass(),
  "dk-th": plainElementClass(),
  "dk-td": plainElementClass(),
  "dk-strong": plainElementClass(),
  "dk-em": plainElementClass(),
};

const coreSelectableElements = [
  "dk-slide",
  "dk-title",
  "dk-subtitle",
  "dk-heading",
  "dk-text",
  "dk-strong",
  "dk-em",
  "dk-list",
  "dk-item",
  "dk-code",
  "dk-quote",
  "dk-link",
  "dk-table",
  "dk-row",
  "dk-cell",
  "dk-grid",
  "dk-region",
  "dk-stack",
  "dk-raw",
];

window[RUNTIME_KEY].registerPlugin({
  name: "core",
  version: DECKNOW_VERSION,
  kind: "core",
  elements: coreElements,
  selectable: coreSelectableElements,
  meta: {
    builtin: true,
  },
});

window[RUNTIME_KEY].registerPlugin({
  name: "theme:terminal-green",
  version: DECKNOW_VERSION,
  kind: "theme",
  themes: ["terminal-green"],
  meta: {
    builtin: true,
    default: true,
  },
});

function plainElementClass() {
  return class extends HTMLElement {};
}

injectStyles();
