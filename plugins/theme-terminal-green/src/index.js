const terminalGreenThemeStyles = `
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
    --dk-danger: #ff6b6b;
    --dk-danger-soft: rgba(255, 107, 107, 0.14);
    --dk-danger-line: rgba(255, 107, 107, 0.42);
    --dk-panel-surface: rgba(13, 17, 23, 0.72);
    --dk-panel-surface-muted: rgba(48, 54, 61, 0.42);
    --dk-panel-surface-accent:
      linear-gradient(135deg, rgba(57, 211, 83, 0.18), rgba(13, 17, 23, 0.72));
    --dk-panel-surface-strong:
      linear-gradient(
        135deg,
        rgba(255, 143, 61, 0.14),
        rgba(13, 17, 23, 0.82) 48%,
        rgba(57, 211, 83, 0.08)
      );
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
`;

export function createTerminalGreenThemePlugin(version) {
  return {
    name: "theme:terminal-green",
    version,
    kind: "theme",
    themes: ["terminal-green"],
    colorScheme: "dark",
    styles: {
      id: "tokens",
      css: terminalGreenThemeStyles,
    },
  };
}
