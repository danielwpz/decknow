const paperInkThemeStyles = `
  dk-deck[theme="paper-ink"] {
    --dk-deck-bg: #efe8dc;
    --dk-deck-background:
      linear-gradient(rgba(39, 31, 24, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(39, 31, 24, 0.026) 1px, transparent 1px),
      linear-gradient(135deg, #f7f1e7 0%, #eadfce 100%);
    --dk-slide-bg: #fffaf0;
    --dk-slide-surface:
      linear-gradient(180deg, rgba(255, 253, 248, 0.96), rgba(250, 243, 232, 0.98)),
      var(--dk-slide-bg);
    --dk-slide-solid-surface: #fffaf0;
    --dk-slide-overlay:
      linear-gradient(rgba(39, 31, 24, 0.04) 1px, transparent 1px);
    --dk-slide-overlay-size: 100% 22px;
    --dk-slide-overlay-opacity: 0.72;
    --dk-slide-strip: linear-gradient(90deg, #2a2119, var(--dk-accent), var(--dk-accent-2));
    --dk-slide-ink: #231c16;
    --dk-muted: #74685d;
    --dk-border: rgba(66, 52, 40, 0.18);
    --dk-slide-border: rgba(66, 52, 40, 0.22);
    --dk-accent: #b42318;
    --dk-accent-2: #9a6a1f;
    --dk-danger: #9f1d1d;
    --dk-danger-soft: rgba(159, 29, 29, 0.1);
    --dk-danger-line: rgba(159, 29, 29, 0.34);
    --dk-panel-surface: rgba(255, 253, 248, 0.78);
    --dk-panel-surface-muted: rgba(238, 226, 210, 0.72);
    --dk-panel-surface-accent:
      linear-gradient(135deg, rgba(180, 35, 24, 0.1), rgba(255, 253, 248, 0.84));
    --dk-panel-surface-strong:
      linear-gradient(135deg, #2a2119, #473524 62%, #6d3b24);
    --dk-panel-ink-strong: #fffaf0;
    --dk-panel-border: rgba(180, 35, 24, 0.22);
    --dk-panel-shadow: 0 18px 46px rgba(66, 52, 40, 0.14);
    --dk-code-bg: #2a2119;
    --dk-code-ink: #fff4df;
    --dk-inline-code-bg: rgba(180, 35, 24, 0.1);
    --dk-quote-surface: rgba(154, 106, 31, 0.1);
    --dk-table-surface: rgba(255, 253, 248, 0.72);
    --dk-table-header-surface: rgba(180, 35, 24, 0.12);
    --dk-shadow: 0 30px 80px rgba(66, 52, 40, 0.2);
    --dk-radius: 6px;
    --dk-deck-pad: clamp(12px, 2vw, 28px);
    --dk-stage-vh: 100vh;
    --dk-stage-aspect: 16 / 9;
    --dk-stage-fit-width: 16;
    --dk-stage-fit-height: 9;
    --dk-slide-pad: clamp(30px, 5cqw, 72px);
    --dk-slide-gap: clamp(14px, 2cqw, 28px);
    --dk-grid-gap: clamp(14px, 2cqw, 28px);
    --dk-grid-gap-sm: clamp(8px, 1.2cqw, 16px);
    --dk-grid-gap-lg: clamp(20px, 3cqw, 40px);
    --dk-stack-gap: clamp(10px, 1.5cqw, 22px);
    --dk-stack-gap-sm: clamp(6px, 1cqw, 14px);
    --dk-stack-gap-lg: clamp(18px, 2.4cqw, 34px);
    --dk-region-pad: clamp(14px, 2cqw, 28px);
    --dk-title-size: clamp(42px, 7.2cqw, 104px);
    --dk-title-size-tablet: clamp(34px, 6.3cqw, 68px);
    --dk-title-size-phone: clamp(28px, 7cqw, 42px);
    --dk-subtitle-size: clamp(17px, 1.85cqw, 28px);
    --dk-subtitle-size-tablet: clamp(14px, 1.8cqw, 20px);
    --dk-subtitle-size-phone: clamp(12px, 3.4cqw, 16px);
    --dk-heading-size: clamp(28px, 3.8cqw, 56px);
    --dk-heading-size-tablet: clamp(22px, 3.4cqw, 38px);
    --dk-heading-size-phone: clamp(18px, 5.2cqw, 26px);
    --dk-heading-3-size: clamp(22px, 2.7cqw, 38px);
    --dk-heading-3-size-tablet: clamp(18px, 2.6cqw, 28px);
    --dk-heading-3-size-phone: clamp(15px, 4.2cqw, 20px);
    --dk-heading-4-size: clamp(18px, 2cqw, 27px);
    --dk-heading-4-size-tablet: clamp(15px, 2.1cqw, 22px);
    --dk-heading-4-size-phone: clamp(13px, 3.6cqw, 17px);
    --dk-text-size: clamp(17px, 1.58cqw, 24px);
    --dk-text-size-tablet: clamp(13px, 1.5cqw, 18px);
    --dk-text-size-phone: clamp(11px, 3.1cqw, 14px);
    --dk-item-size: clamp(17px, 1.52cqw, 24px);
    --dk-item-size-tablet: clamp(13px, 1.45cqw, 18px);
    --dk-item-size-phone: clamp(11px, 3cqw, 14px);
    --dk-code-size: clamp(13px, 1.2cqw, 18px);
    --dk-code-size-tablet: clamp(11px, 1.16cqw, 15px);
    --dk-code-size-phone: clamp(10px, 2.7cqw, 12px);
    --dk-quote-size: clamp(24px, 3.1cqw, 46px);
    --dk-quote-size-tablet: clamp(18px, 2.7cqw, 30px);
    --dk-quote-size-phone: clamp(15px, 4.2cqw, 20px);
    --dk-cell-size: clamp(13px, 1.18cqw, 18px);
    --dk-cell-size-tablet: clamp(11px, 1.1cqw, 15px);
    --dk-cell-size-phone: clamp(10px, 2.6cqw, 12px);
    --dk-font-display: "Cormorant Garamond", "Iowan Old Style", Georgia, serif;
    --dk-font-body: "Source Serif 4", Georgia, "Times New Roman", serif;
    --dk-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    --dk-title-prefix: "";
    --dk-heading-prefix: "";
    --dk-flow-arrow-head: clamp(8px, 0.8cqw, 13px);
    --dk-flow-connector-thickness: clamp(7px, 0.72cqw, 11px);
    --dk-flow-connector-color: rgba(154, 106, 31, 0.68);
    --dk-flow-connector-fade: rgba(154, 106, 31, 0.12);
    --dk-flow-connector-bg-horizontal: linear-gradient(
      90deg,
      var(--dk-flow-connector-color),
      var(--dk-flow-connector-fade)
    );
    --dk-flow-connector-bg-vertical: linear-gradient(
      180deg,
      var(--dk-flow-connector-color),
      var(--dk-flow-connector-fade)
    );
    --dk-flow-connector-radius: 2px;
    --dk-flow-connector-opacity: 0.78;
  }

  dk-deck[theme="paper-ink"] dk-title,
  dk-deck[theme="paper-ink"] dk-heading {
    font-family: var(--dk-font-display);
    font-weight: 700;
  }

  dk-deck[theme="paper-ink"] dk-code {
    border-color: rgba(42, 33, 25, 0.2);
  }

  dk-deck[theme="paper-ink"] dk-region[frame][tone="accent"] {
    --dk-region-border: rgba(180, 35, 24, 0.34);
  }

  dk-deck[theme="paper-ink"] dk-region[frame][tone="strong"] {
    color: var(--dk-panel-ink-strong);
    --dk-region-border: rgba(154, 106, 31, 0.36);
    --dk-region-accent: #e2b75d;
  }

  dk-deck[theme="paper-ink"] dk-region[frame][tone="strong"] dk-text,
  dk-deck[theme="paper-ink"] dk-region[frame][tone="strong"] dk-subtitle {
    color: rgba(255, 250, 240, 0.82);
  }

  dk-deck[theme="paper-ink"] dk-list[marker="status"] dk-item[tone="success"] {
    --dk-item-marker-bg: rgba(180, 35, 24, 0.1);
    --dk-item-marker-ink: var(--dk-accent);
    --dk-item-marker-border: rgba(180, 35, 24, 0.28);
  }

  dk-deck[theme="paper-ink"] dk-flow-step[tone="accent"] {
    --dk-flow-step-surface: rgba(180, 35, 24, 0.09);
    --dk-flow-step-border: rgba(180, 35, 24, 0.28);
  }

  dk-deck[theme="paper-ink"] dk-flow-step[emphasis],
  dk-deck[theme="paper-ink"] dk-flow-step[tone="strong"] {
    --dk-flow-step-accent: var(--dk-accent-2);
    --dk-flow-step-border: rgba(154, 106, 31, 0.36);
    --dk-flow-step-surface: rgba(154, 106, 31, 0.12);
  }

  dk-deck[theme="paper-ink"] dk-pyramid-level[tone="accent"] {
    --dk-pyramid-level-border: rgba(180, 35, 24, 0.32);
    --dk-pyramid-level-surface: rgba(180, 35, 24, 0.1);
  }

  dk-deck[theme="paper-ink"] dk-pyramid-level[tone="strong"],
  dk-deck[theme="paper-ink"] dk-pyramid-level[emphasis] {
    --dk-pyramid-level-border: rgba(154, 106, 31, 0.36);
    --dk-pyramid-level-surface: rgba(154, 106, 31, 0.14);
  }
`;

export function createPaperInkThemePlugin(version) {
  return {
    name: "theme:paper-ink",
    version,
    kind: "theme",
    themes: ["paper-ink"],
    colorScheme: "light",
    styles: {
      id: "tokens",
      css: paperInkThemeStyles,
    },
  };
}
