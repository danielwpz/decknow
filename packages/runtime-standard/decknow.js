(() => {
  // plugins/diagram-basic/src/flow.js
  var DKFlow = class extends HTMLElement {
    static get observedAttributes() {
      return ["direction", "responsive"];
    }
    connectedCallback() {
      if (!this.hasAttribute("role")) this.setAttribute("role", "list");
      this.ensureStepLabels();
      this.syncOrientation();
      if (!this._dkFlowResizeObserver) {
        this._dkFlowResizeObserver = new ResizeObserver(() => this.syncOrientation());
        this._dkFlowResizeObserver.observe(this);
        if (this.parentElement) this._dkFlowResizeObserver.observe(this.parentElement);
      }
      if (!this._dkFlowMutationObserver) {
        this._dkFlowMutationObserver = new MutationObserver(() => {
          this.ensureStepLabels();
          this.syncOrientation();
        });
        this._dkFlowMutationObserver.observe(this, { childList: true, subtree: true });
      }
    }
    disconnectedCallback() {
      this._dkFlowResizeObserver?.disconnect();
      this._dkFlowResizeObserver = null;
      this._dkFlowMutationObserver?.disconnect();
      this._dkFlowMutationObserver = null;
    }
    attributeChangedCallback() {
      this.syncOrientation();
    }
    ensureStepLabels() {
      for (const step of this.querySelectorAll(":scope > dk-flow-step")) {
        ensureFlowStepLabel(step);
      }
    }
    syncOrientation() {
      const forcedDirection = this.getAttribute("direction");
      if (forcedDirection === "horizontal" || forcedDirection === "vertical") {
        this.dataset.dkOrientation = forcedDirection;
        return;
      }
      if (this.getAttribute("responsive") === "none") {
        this.dataset.dkOrientation = "horizontal";
        return;
      }
      const steps = Array.from(this.querySelectorAll(":scope > dk-flow-step"));
      if (steps.length <= 1) {
        this.dataset.dkOrientation = "horizontal";
        return;
      }
      const hostRect = this.getBoundingClientRect();
      const parentRect = this.parentElement?.getBoundingClientRect() || hostRect;
      const gap = parseFloat(getComputedStyle(this).columnGap || "0") || 0;
      const requiredWidth = steps.reduce((total, step) => total + measureFlowStepWidth(step), 0) + gap * Math.max(0, steps.length - 1);
      const hasVerticalRoom = parentRect.height > parentRect.width * 1.08;
      const lacksHorizontalRoom = hostRect.width < requiredWidth;
      this.dataset.dkOrientation = hasVerticalRoom || lacksHorizontalRoom ? "vertical" : "horizontal";
    }
  };
  var DKFlowStep = class extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute("role")) this.setAttribute("role", "listitem");
      ensureFlowStepLabel(this);
    }
  };
  var flowSchema = {
    "dk-flow": {
      description: "Semantic process flow. Runtime owns node spacing and connectors."
    },
    "dk-flow-step": {
      description: "One step inside a dk-flow."
    }
  };
  function ensureFlowStepLabel(step) {
    let label = step.querySelector(":scope > .dk-flow-step-label");
    if (!label) {
      label = document.createElement("div");
      label.className = "dk-flow-step-label";
      step.appendChild(label);
    }
    for (const child of Array.from(step.childNodes)) {
      if (child === label) continue;
      label.appendChild(child);
    }
    step.dataset.dkRichContent = hasFlowStepRichContent(label) ? "true" : "false";
  }
  function hasFlowStepRichContent(label) {
    return Boolean(
      label.querySelector(
        ":scope > dk-heading, :scope > dk-text, :scope > dk-list, :scope > dk-table, :scope > dk-grid, :scope > dk-region, :scope > dk-stack, :scope > dk-quote, :scope > dk-flow, :scope > dk-pyramid"
      )
    );
  }
  function measureFlowStepWidth(step) {
    const style = getComputedStyle(step);
    const label = step.querySelector(":scope > .dk-flow-step-label");
    const labelWidth = label?.scrollWidth || step.scrollWidth || 0;
    const padding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0) + (parseFloat(style.columnGap) || 0);
    const markerWidth = parseFloat(getComputedStyle(step, "::before").width || "0") || 36;
    return Math.ceil(labelWidth + padding + markerWidth + 4);
  }
  var flowStyles = `
  dk-flow {
    --dk-flow-gap-local: var(--dk-grid-gap-lg);
    --dk-flow-arrow-head: clamp(12px, 1.1cqw, 18px);
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    max-width: min(100%, 1120px);
    align-items: stretch;
    gap: var(--dk-flow-gap-local);
    counter-reset: dk-flow-step;
  }

  dk-flow[data-dk-orientation="vertical"] {
    max-width: min(100%, 760px);
    flex-direction: column;
  }

  dk-flow[align="center"] {
    margin-inline: auto;
  }

  dk-flow[density="high"] {
    --dk-flow-gap-local: var(--dk-grid-gap);
  }

  dk-flow[density="low"] {
    --dk-flow-gap-local: calc(var(--dk-grid-gap-lg) * 1.25);
  }

  dk-flow-step {
    counter-increment: dk-flow-step;
    position: relative;
    display: flex;
    flex: 1 1 0;
    min-width: 0;
    align-items: center;
    gap: clamp(10px, 1.2cqw, 18px);
    padding: clamp(14px, 1.8cqw, 26px);
    border: 1px solid var(--dk-flow-step-border, var(--dk-panel-border));
    border-radius: var(--dk-radius);
    background: var(--dk-flow-step-surface, var(--dk-panel-surface));
    color: var(--dk-slide-ink);
    box-shadow: var(--dk-panel-shadow);
    font-size: var(--dk-text-size);
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  dk-flow[data-dk-orientation="horizontal"] dk-flow-step {
    min-width: max-content;
    flex-basis: max-content;
  }

  .dk-flow-step-label {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  dk-flow[data-dk-orientation="horizontal"] dk-flow-step:not([data-dk-rich-content="true"]) .dk-flow-step-label {
    white-space: nowrap;
  }

  dk-flow-step dk-heading,
  dk-flow-step dk-text {
    max-width: 100%;
  }

  dk-flow-step dk-heading {
    font-size: var(--dk-heading-4-size);
    line-height: 1.12;
  }

  dk-flow-step dk-heading::before {
    content: none;
  }

  dk-flow-step dk-text {
    margin-top: clamp(4px, 0.7cqw, 8px);
    color: var(--dk-muted);
    font-size: 0.84em;
    line-height: 1.3;
  }

  dk-flow-step::before {
    content: counter(dk-flow-step);
    display: grid;
    width: clamp(28px, 2.8cqw, 42px);
    height: clamp(28px, 2.8cqw, 42px);
    flex: 0 0 auto;
    place-items: center;
    border-radius: 999px;
    background: var(--dk-flow-step-accent, var(--dk-accent));
    color: var(--dk-panel-ink-strong);
    font-size: 0.76em;
    font-weight: 850;
  }

  dk-flow-step:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 50%;
    left: calc(100% + 4px);
    width: calc(var(--dk-flow-gap-local) - 4px);
    height: clamp(16px, 1.6cqw, 24px);
    transform: translateY(-50%);
    border-radius: 999px;
    background: linear-gradient(90deg, var(--dk-accent), rgba(57, 211, 83, 0.12));
    clip-path: polygon(
      0 38%,
      calc(100% - var(--dk-flow-arrow-head)) 38%,
      calc(100% - var(--dk-flow-arrow-head)) 10%,
      100% 50%,
      calc(100% - var(--dk-flow-arrow-head)) 90%,
      calc(100% - var(--dk-flow-arrow-head)) 62%,
      0 62%
    );
    opacity: 0.96;
  }

  dk-flow[arrows="none"] dk-flow-step::after {
    display: none;
  }

  dk-flow[data-dk-orientation="vertical"] dk-flow-step {
    flex-basis: auto;
  }

  dk-flow[data-dk-orientation="vertical"] dk-flow-step:not(:last-child)::after {
    top: calc(100% + 4px);
    right: auto;
    left: 50%;
    width: clamp(16px, 1.6cqw, 24px);
    height: calc(var(--dk-flow-gap-local) - 4px);
    transform: translateX(-50%);
    background: linear-gradient(180deg, var(--dk-accent), rgba(57, 211, 83, 0.12));
    clip-path: polygon(
      38% 0,
      62% 0,
      62% calc(100% - var(--dk-flow-arrow-head)),
      90% calc(100% - var(--dk-flow-arrow-head)),
      50% 100%,
      10% calc(100% - var(--dk-flow-arrow-head)),
      38% calc(100% - var(--dk-flow-arrow-head))
    );
  }

  dk-flow[data-dk-orientation="vertical"] .dk-flow-step-label {
    white-space: normal;
  }

  dk-flow-step[tone="muted"] {
    --dk-flow-step-accent: var(--dk-muted);
    --dk-flow-step-border: var(--dk-border);
    --dk-flow-step-surface: var(--dk-panel-surface-muted);
  }

  dk-flow-step[tone="accent"] {
    --dk-flow-step-surface: var(--dk-panel-surface-accent);
    --dk-flow-step-border: rgba(57, 211, 83, 0.34);
  }

  dk-flow-step[tone="strong"],
  dk-flow-step[emphasis] {
    --dk-flow-step-accent: var(--dk-accent-2);
    --dk-flow-step-border: rgba(57, 211, 83, 0.52);
    --dk-flow-step-surface: rgba(57, 211, 83, 0.16);
  }

  @container dk-slide (max-width: 760px) {
    dk-flow:not([responsive="none"]) dk-flow-step:not(:last-child)::after {
      top: calc(100% + 4px);
      right: auto;
      left: 50%;
      width: clamp(16px, 1.6cqw, 24px);
      height: calc(var(--dk-flow-gap-local) - 4px);
      transform: translateX(-50%);
      background: linear-gradient(180deg, var(--dk-accent), rgba(57, 211, 83, 0.12));
      clip-path: polygon(
        38% 0,
        62% 0,
        62% calc(100% - var(--dk-flow-arrow-head)),
        90% calc(100% - var(--dk-flow-arrow-head)),
        50% 100%,
        10% calc(100% - var(--dk-flow-arrow-head)),
        38% calc(100% - var(--dk-flow-arrow-head))
      );
    }

    dk-flow[data-dk-orientation="horizontal"] dk-flow-step:not(:last-child)::after {
      top: 50%;
      left: calc(100% + 4px);
      width: calc(var(--dk-flow-gap-local) - 4px);
      height: clamp(16px, 1.6cqw, 24px);
      transform: translateY(-50%);
      background: linear-gradient(90deg, var(--dk-accent), rgba(57, 211, 83, 0.12));
      clip-path: polygon(
        0 38%,
        calc(100% - var(--dk-flow-arrow-head)) 38%,
        calc(100% - var(--dk-flow-arrow-head)) 10%,
        100% 50%,
        calc(100% - var(--dk-flow-arrow-head)) 90%,
        calc(100% - var(--dk-flow-arrow-head)) 62%,
        0 62%
      );
    }

    dk-flow-step {
      font-size: var(--dk-text-size-tablet);
    }

    dk-flow[data-dk-orientation="vertical"] .dk-flow-step-label {
      white-space: normal;
    }
  }

  @container dk-slide (max-width: 560px) {
    dk-flow {
      --dk-flow-gap-local: var(--dk-grid-gap);
    }

    dk-flow-step {
      padding: clamp(10px, 2.8cqw, 15px);
      font-size: var(--dk-text-size-phone);
    }

    dk-flow-step::before {
      width: clamp(22px, 7cqw, 30px);
      height: clamp(22px, 7cqw, 30px);
    }
  }
`;

  // plugins/diagram-basic/src/pyramid.js
  var DKPyramid = class extends HTMLElement {
    static get observedAttributes() {
      return ["label-placement", "tip-ratio"];
    }
    connectedCallback() {
      this.syncLevels();
      requestAnimationFrame(() => this.syncLevels());
      if (this._dkPyramidObserver) return;
      this._dkPyramidObserver = new MutationObserver(() => this.syncLevels());
      this._dkPyramidObserver.observe(this, { childList: true, subtree: true, characterData: true });
      this._dkPyramidResizeObserver = new ResizeObserver(() => this.syncLevels());
      this._dkPyramidResizeObserver.observe(this);
    }
    disconnectedCallback() {
      this._dkPyramidObserver?.disconnect();
      this._dkPyramidObserver = null;
      this._dkPyramidResizeObserver?.disconnect();
      this._dkPyramidResizeObserver = null;
    }
    attributeChangedCallback() {
      this.syncLevels();
    }
    syncLevels() {
      const levels = Array.from(this.querySelectorAll(":scope > dk-pyramid-level"));
      const count = Math.max(1, levels.length);
      const tipRatio = clampRatio(Number(this.getAttribute("tip-ratio") || 0), 0, 0.72);
      const placement = normalizePlacement(this.getAttribute("label-placement"));
      const width = this.getBoundingClientRect().width;
      const decisions = levels.map((level, index) => {
        ensurePyramidLevelParts(level);
        return decideLabelPlacement(level, index, count, width, tipRatio, placement, 1);
      });
      const hasSideLabels = decisions.some((decision) => decision.placement !== "inside");
      const shapeRatio = hasSideLabels ? 0.68 : 1;
      this.dataset.dkHasSideLabels = hasSideLabels ? "true" : "false";
      for (const [index, level] of levels.entries()) {
        const topRatio = pyramidBoundaryRatio(index, count, tipRatio);
        const bottomRatio = pyramidBoundaryRatio(index + 1, count, tipRatio);
        const decision = decideLabelPlacement(
          level,
          index,
          count,
          width,
          tipRatio,
          placement,
          shapeRatio
        );
        level.style.setProperty("--dk-pyramid-left-top", toEdgePercent(topRatio, "left"));
        level.style.setProperty("--dk-pyramid-right-top", toEdgePercent(topRatio, "right"));
        level.style.setProperty("--dk-pyramid-left-bottom", toEdgePercent(bottomRatio, "left"));
        level.style.setProperty("--dk-pyramid-right-bottom", toEdgePercent(bottomRatio, "right"));
        level.style.setProperty("--dk-pyramid-level-index", String(index + 1));
        level.style.setProperty("--dk-pyramid-level-count", String(count));
        level.style.setProperty(
          "--dk-pyramid-label-left",
          toLevelEdgePercent(bottomRatio, "left", shapeRatio)
        );
        level.style.setProperty(
          "--dk-pyramid-label-right",
          toLevelEdgePercent(bottomRatio, "right", shapeRatio)
        );
        level.style.setProperty(
          "--dk-pyramid-label-scale",
          String(Math.round(decision.scale * 1e3) / 1e3)
        );
        level.dataset.dkLabelPlacement = decision.placement;
      }
    }
  };
  var DKPyramidLevel = class extends HTMLElement {
    connectedCallback() {
      ensurePyramidLevelParts(this);
    }
  };
  var pyramidSchema = {
    "dk-pyramid": {
      description: "Semantic layered pyramid. Runtime owns level sizing."
    },
    "dk-pyramid-level": {
      description: "One level inside a dk-pyramid."
    }
  };
  function clampRatio(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }
  function toEdgePercent(ratio, side) {
    const halfSpan = ratio * 50;
    const value = side === "left" ? 50 - halfSpan : 50 + halfSpan;
    return `${Math.round(value * 1e3) / 1e3}%`;
  }
  function toLevelEdgePercent(ratio, side, shapeRatio) {
    const halfSpan = ratio * 50;
    const shapePercent = side === "left" ? 50 - halfSpan : 50 + halfSpan;
    const value = shapePercent * shapeRatio;
    return `${Math.round(value * 1e3) / 1e3}%`;
  }
  function pyramidBoundaryRatio(boundaryIndex, count, tipRatio) {
    if (boundaryIndex <= 0) return tipRatio;
    if (boundaryIndex >= count) return 1;
    const progress = boundaryIndex / count;
    return tipRatio + progress * (1 - tipRatio);
  }
  function normalizePlacement(value) {
    return value === "inside" || value === "side" || value === "callout" ? value : "auto";
  }
  function ensurePyramidLevelParts(level) {
    let shape = level.querySelector(":scope > .dk-pyramid-level-shape");
    let label = level.querySelector(":scope > .dk-pyramid-level-label");
    if (!shape) {
      shape = document.createElement("span");
      shape.className = "dk-pyramid-level-shape";
      shape.setAttribute("aria-hidden", "true");
      level.prepend(shape);
    }
    if (!label) {
      label = document.createElement("span");
      label.className = "dk-pyramid-level-label";
      level.appendChild(label);
    }
    for (const child of Array.from(level.childNodes)) {
      if (child === shape || child === label) continue;
      label.appendChild(child);
    }
  }
  function decideLabelPlacement(level, index, count, width, tipRatio, placement, shapeRatio) {
    if (placement === "side" || placement === "callout") {
      return { placement, scale: 1 };
    }
    const bottomRatio = pyramidBoundaryRatio(index + 1, count, tipRatio);
    const labelWidth = width * shapeRatio * bottomRatio - 16;
    const textWidth = measureTextWidth(level.textContent, getLevelFont(level));
    const scale = labelWidth > 0 ? clampRatio(labelWidth / Math.max(1, textWidth), 0.64, 1) : 1;
    const tooLongForInside = textWidth * 0.64 > labelWidth * 1.95;
    return {
      placement: placement === "auto" && tooLongForInside ? "side" : "inside",
      scale
    };
  }
  function getLevelFont(level) {
    const style = getComputedStyle(level);
    return style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  }
  function measureTextWidth(text, font) {
    const value = String(text || "").trim();
    if (!value) return 0;
    if (!document.body) return value.length * 12;
    const probe = document.createElement("span");
    probe.textContent = value;
    probe.style.position = "fixed";
    probe.style.left = "-10000px";
    probe.style.top = "-10000px";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "nowrap";
    probe.style.font = font;
    document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width;
    probe.remove();
    return width;
  }
  var pyramidStyles = `
  dk-pyramid {
    --dk-pyramid-shape-width: 100%;
    --dk-pyramid-side-gap: clamp(12px, 2cqw, 24px);
    position: relative;
    z-index: 1;
    display: flex;
    width: 100%;
    max-width: min(100%, 980px);
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin-inline: auto;
    filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.28));
  }

  dk-pyramid[data-dk-has-side-labels="true"] {
    --dk-pyramid-shape-width: 68%;
    align-items: flex-start;
  }

  dk-pyramid[density="high"] {
    gap: 1px;
  }

  dk-pyramid[density="low"] {
    gap: clamp(4px, 0.7cqw, 8px);
  }

  dk-pyramid[fit="fill"] {
    flex: 1 1 auto;
    min-height: min(92%, clamp(280px, 38cqh, 470px));
  }

  dk-pyramid-level {
    display: block;
    position: relative;
    width: 100%;
    min-height: clamp(58px, 9cqh, 118px);
    box-sizing: border-box;
    border: 0;
    color: var(--dk-slide-ink);
    font-size: var(--dk-text-size);
    font-weight: 760;
    line-height: 1.18;
    overflow: visible;
  }

  dk-pyramid[fit="fill"] dk-pyramid-level {
    flex: 1 1 0;
    min-height: 0;
  }

  .dk-pyramid-level-shape {
    position: absolute;
    inset-block: 0;
    left: 0;
    width: var(--dk-pyramid-shape-width);
    clip-path: polygon(
      var(--dk-pyramid-left-top, 40%) 0,
      var(--dk-pyramid-right-top, 60%) 0,
      var(--dk-pyramid-right-bottom, 100%) 100%,
      var(--dk-pyramid-left-bottom, 0) 100%
    );
    background: var(--dk-pyramid-level-surface, var(--dk-panel-surface));
    box-shadow: inset 0 0 0 1px var(--dk-pyramid-level-border, var(--dk-panel-border));
  }

  .dk-pyramid-level-label {
    position: absolute;
    z-index: 1;
    inset-block: 0;
    left: var(--dk-pyramid-label-left, 0);
    right: calc(100% - var(--dk-pyramid-label-right, 100%));
    display: flex;
    width: auto;
    min-width: 0;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding-inline: clamp(4px, 0.8cqw, 10px);
    color: var(--dk-slide-ink);
    font-size: calc(1em * var(--dk-pyramid-label-scale, 1));
    text-align: center;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }

  dk-pyramid-level[data-dk-label-placement="side"]::after,
  dk-pyramid-level[data-dk-label-placement="callout"]::after {
    content: "";
    position: absolute;
    top: 50%;
    left: var(--dk-pyramid-shape-width);
    width: var(--dk-pyramid-side-gap);
    height: 1px;
    background: linear-gradient(90deg, var(--dk-accent), transparent);
  }

  dk-pyramid-level[data-dk-label-placement="side"] .dk-pyramid-level-label,
  dk-pyramid-level[data-dk-label-placement="callout"] .dk-pyramid-level-label {
    left: calc(var(--dk-pyramid-shape-width) + var(--dk-pyramid-side-gap));
    right: auto;
    width: calc(100% - var(--dk-pyramid-shape-width) - var(--dk-pyramid-side-gap));
    justify-content: flex-start;
    padding-inline: 0;
    text-align: left;
    text-wrap: pretty;
  }

  dk-pyramid-level[data-dk-label-placement="callout"] .dk-pyramid-level-label {
    inset-block: 10%;
    padding: 0.35em 0.6em;
    border: 1px solid var(--dk-pyramid-level-border, var(--dk-panel-border));
    border-radius: calc(var(--dk-radius) * 0.6);
    background: var(--dk-panel-surface-muted);
  }

  dk-pyramid-level[tone="muted"] {
    --dk-pyramid-level-border: var(--dk-border);
    --dk-pyramid-level-surface: var(--dk-panel-surface-muted);
  }

  dk-pyramid-level[tone="accent"] {
    --dk-pyramid-level-border: rgba(57, 211, 83, 0.34);
    --dk-pyramid-level-surface: var(--dk-panel-surface-accent);
  }

  dk-pyramid-level[tone="strong"],
  dk-pyramid-level[emphasis] {
    --dk-pyramid-level-border: rgba(57, 211, 83, 0.52);
    --dk-pyramid-level-surface: rgba(57, 211, 83, 0.18);
  }

  @container dk-slide (max-width: 760px) {
    dk-pyramid-level {
      font-size: var(--dk-text-size-tablet);
    }
  }

  @container dk-slide (max-width: 560px) {
    dk-pyramid {
      gap: clamp(6px, 1.6cqw, 10px);
    }

    dk-pyramid[fit="fill"] {
      min-height: min(90%, clamp(210px, 42cqh, 330px));
    }

    dk-pyramid-level {
      min-height: clamp(36px, 9cqh, 58px);
      font-size: var(--dk-text-size-phone);
    }
  }
`;

  // plugins/diagram-basic/src/index.js
  function createDiagramBasicPlugin(version) {
    return {
      name: "diagram-basic",
      version,
      kind: "component",
      elements: {
        "dk-flow": DKFlow,
        "dk-flow-step": DKFlowStep,
        "dk-pyramid": DKPyramid,
        "dk-pyramid-level": DKPyramidLevel
      },
      selectable: ["dk-flow", "dk-flow-step", "dk-pyramid", "dk-pyramid-level"],
      styles: [
        {
          id: "flow",
          css: flowStyles
        },
        {
          id: "pyramid",
          css: pyramidStyles
        }
      ],
      schema: {
        elements: {
          ...flowSchema,
          ...pyramidSchema
        }
      },
      meta: {
        templates: ["flow", "pyramid"]
      }
    };
  }

  // plugins/theme-terminal-green/src/index.js
  var terminalGreenThemeStyles = `
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
  function createTerminalGreenThemePlugin(version) {
    return {
      name: "theme:terminal-green",
      version,
      kind: "theme",
      themes: ["terminal-green"],
      styles: {
        id: "tokens",
        css: terminalGreenThemeStyles
      }
    };
  }

  // packages/runtime-standard/src/plugin-registry.js
  var PLUGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9-:.]*$/;
  var ELEMENT_PREFIX_PATTERN = /^[a-z0-9][a-z0-9-]*-$/;
  var RESERVED_META_KEYS = /* @__PURE__ */ new Set(["builtin", "official", "trusted"]);
  function createPluginRegistry(environment = {}, options = {}) {
    const env = resolveEnvironment(environment);
    const officialPluginNames = new Set(options.officialPluginNames || []);
    const officialElementPrefix = options.officialElementPrefix || "dk-";
    const plugins = /* @__PURE__ */ new Map();
    const elementOwners = /* @__PURE__ */ new Map();
    const selectableSelectors = /* @__PURE__ */ new Set();
    const themeOwners = /* @__PURE__ */ new Map();
    function registerPlugin(plugin) {
      const record = normalizePlugin(plugin, { trusted: false });
      assertCanRegister(record);
      assertPublicPluginPolicy(record);
      return applyRegistration(record);
    }
    function registerBuiltInPlugin(plugin) {
      const record = normalizePlugin(plugin, { trusted: true });
      if (!officialPluginNames.has(record.name)) {
        throw new Error(`Built-in Decknow plugin "${record.name}" is not in the official allowlist.`);
      }
      assertCanRegister(record);
      return applyRegistration(record);
    }
    function applyRegistration(record) {
      for (const [name, klass] of Object.entries(record.elements)) {
        registerElement(name, klass, record.name);
      }
      for (const selector of record.selectable) {
        selectableSelectors.add(selector);
      }
      for (const theme of record.themes) {
        if (themeOwners.has(theme)) {
          throw new Error(
            `Decknow theme "${theme}" is already provided by plugin "${themeOwners.get(theme)}".`
          );
        }
        themeOwners.set(theme, record.name);
      }
      const styleIds = injectPluginStyles(record);
      record.styleIds = styleIds;
      plugins.set(record.name, record);
      return pluginSummary(record);
    }
    function assertCanRegister(record) {
      if (plugins.has(record.name)) {
        throw new Error(`Decknow plugin "${record.name}" is already registered.`);
      }
      for (const [name, klass] of Object.entries(record.elements)) {
        if (!name.includes("-")) {
          throw new Error(
            `Custom element "${name}" from plugin "${record.name}" must include a hyphen.`
          );
        }
        if (typeof klass !== "function") {
          throw new Error(
            `Custom element "${name}" from plugin "${record.name}" must be a constructor.`
          );
        }
        if (elementOwners.has(name)) {
          throw new Error(
            `Custom element "${name}" is already registered by plugin "${elementOwners.get(name)}".`
          );
        }
        if (env.customElements?.get(name)) {
          throw new Error(`Custom element "${name}" is already defined outside Decknow plugins.`);
        }
      }
      for (const theme of record.themes) {
        if (themeOwners.has(theme)) {
          throw new Error(
            `Decknow theme "${theme}" is already provided by plugin "${themeOwners.get(theme)}".`
          );
        }
      }
    }
    function assertPublicPluginPolicy(record) {
      const elementNames = Object.keys(record.elements);
      if (!elementNames.length) return;
      if (!record.elementPrefix) {
        throw new Error(`Plugin "${record.name}" must declare elementPrefix for public elements.`);
      }
      if (!ELEMENT_PREFIX_PATTERN.test(record.elementPrefix)) {
        throw new Error(
          `Plugin "${record.name}" has invalid elementPrefix "${record.elementPrefix}". It must be a lowercase custom-element prefix ending with "-".`
        );
      }
      if (record.elementPrefix === officialElementPrefix) {
        throw new Error(
          `Plugin "${record.name}" cannot use reserved Decknow element prefix "${officialElementPrefix}".`
        );
      }
      for (const name of elementNames) {
        if (name.startsWith(officialElementPrefix)) {
          throw new Error(
            `Plugin "${record.name}" cannot register official Decknow element "${name}".`
          );
        }
        if (!name.startsWith(record.elementPrefix)) {
          throw new Error(
            `Plugin "${record.name}" element "${name}" must use declared prefix "${record.elementPrefix}".`
          );
        }
      }
    }
    function registerElement(name, klass, pluginName) {
      env.customElements?.define(name, klass);
      elementOwners.set(name, pluginName);
    }
    function injectPluginStyles(record) {
      if (!record.styles.length || !env.document) return [];
      const ids = [];
      const host = env.document.head || env.document.documentElement;
      for (const styleEntry of record.styles) {
        const id = pluginStyleId(record.name, styleEntry.id);
        ids.push(id);
        if (env.document.getElementById(id)) continue;
        const style = env.document.createElement("style");
        style.id = id;
        style.dataset.dkPlugin = record.name;
        style.textContent = styleEntry.css;
        host.appendChild(style);
      }
      return ids;
    }
    function getPlugin(name) {
      const record = plugins.get(name);
      return record ? pluginSummary(record) : null;
    }
    function getPlugins() {
      return Array.from(plugins.values(), pluginSummary);
    }
    function getSelectableSelectors() {
      return Array.from(selectableSelectors);
    }
    function getElementNames() {
      return Array.from(elementOwners.keys());
    }
    function getThemeNames() {
      return Array.from(themeOwners.keys());
    }
    function getManifest() {
      return {
        plugins: getPlugins(),
        elements: getElementNames(),
        selectable: getSelectableSelectors(),
        themes: getThemeNames()
      };
    }
    return {
      registerPlugin,
      registerBuiltInPlugin,
      getPlugin,
      getPlugins,
      getSelectableSelectors,
      getElementNames,
      getThemeNames,
      getManifest
    };
  }
  function normalizePlugin(plugin, options = {}) {
    if (!plugin || typeof plugin !== "object") {
      throw new Error("Decknow plugin must be an object.");
    }
    if (!plugin.name || typeof plugin.name !== "string") {
      throw new Error("Decknow plugin requires a string name.");
    }
    if (!PLUGIN_NAME_PATTERN.test(plugin.name)) {
      throw new Error(
        `Decknow plugin name "${plugin.name}" must use lowercase letters, numbers, hyphens, colons, or dots.`
      );
    }
    const elements = normalizeElements(plugin.elements);
    return {
      name: plugin.name,
      version: plugin.version || "0.0.0",
      kind: plugin.kind || "component",
      trusted: Boolean(options.trusted),
      elementPrefix: plugin.elementPrefix || null,
      elements,
      selectable: normalizeStringList(plugin.selectable, Object.keys(elements)),
      themes: normalizeStringList(plugin.themes, []),
      styles: normalizeStyles(plugin.styles),
      schema: plugin.schema || null,
      meta: sanitizeMeta(plugin.meta)
    };
  }
  function normalizeElements(elements = {}) {
    if (Array.isArray(elements)) {
      return Object.fromEntries(elements);
    }
    if (!elements || typeof elements !== "object") return {};
    return { ...elements };
  }
  function normalizeStyles(styles) {
    if (!styles) return [];
    const entries = Array.isArray(styles) ? styles : [styles];
    return entries.map((entry, index) => {
      if (typeof entry === "string")
        return { id: index === 0 ? "default" : String(index), css: entry };
      if (!entry || typeof entry !== "object") return null;
      return {
        id: entry.id || (index === 0 ? "default" : String(index)),
        css: String(entry.css || "")
      };
    }).filter((entry) => entry?.css);
  }
  function normalizeStringList(value, fallback) {
    if (value === void 0 || value === null) return [...fallback];
    if (Array.isArray(value)) return value.map(String).filter(Boolean);
    if (typeof value === "object") return Object.keys(value);
    return [String(value)].filter(Boolean);
  }
  function sanitizeMeta(meta) {
    if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
    return Object.fromEntries(Object.entries(meta).filter(([key]) => !RESERVED_META_KEYS.has(key)));
  }
  function pluginSummary(record) {
    return {
      name: record.name,
      version: record.version,
      kind: record.kind,
      trusted: record.trusted,
      elementPrefix: record.elementPrefix,
      elements: Object.keys(record.elements),
      selectable: [...record.selectable],
      themes: [...record.themes],
      styleIds: [...record.styleIds || []],
      schema: record.schema,
      meta: record.meta
    };
  }
  function pluginStyleId(pluginName, styleId) {
    return `decknow-plugin-${safeId(pluginName)}-${safeId(styleId || "default")}-styles`;
  }
  function safeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  }
  function resolveEnvironment(environment) {
    return {
      document: environment.document || globalThis.document,
      customElements: environment.customElements || globalThis.customElements
    };
  }

  // packages/runtime-standard/src/decknow.js
  var DECKNOW_VERSION = "0.0.1";
  var RUNTIME_KEY = "__DECKNOW__";
  var runtimeState = {
    decks: [],
    activeDeck: null,
    resolveReady: null
  };
  var runtimeReady = new Promise((resolve) => {
    runtimeState.resolveReady = resolve;
  });
  var pluginRegistry = createPluginRegistry(
    {},
    {
      officialPluginNames: ["core", "theme:terminal-green", "diagram-basic"]
    }
  );
  function isDebugEnabled() {
    return new URLSearchParams(window.location.search).has("debug") || window.location.hash.includes("debug=1") || window.localStorage?.getItem("decknow:debug") === "1" || document.querySelector("dk-deck[debug]") !== null;
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
        userAgent: navigator.userAgent
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
      }
    };
  }
  if (!window[RUNTIME_KEY]) {
    window[RUNTIME_KEY] = createRuntimeApi();
  }
  var coreRuntimeStyles = `
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
      --dk-auto-width: min(100%, 1120px);
      max-width: var(--dk-width, var(--dk-auto-width));
    }

    dk-slide[content-width="auto"] > :is(
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
      dk-raw
    ),
    dk-region[content-width="auto"] > :is(
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
      dk-raw
    ),
    dk-stack[content-width="auto"] > :is(
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
      dk-raw
    ),
    :is(
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
      dk-raw
    )[width="auto"] {
      --dk-width: var(--dk-auto-width);
    }

    dk-slide[content-width="prose"] > :is(
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
      dk-raw
    ),
    dk-region[content-width="prose"] > :is(
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
      dk-raw
    ),
    dk-stack[content-width="prose"] > :is(
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
      dk-raw
    ),
    :is(
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
      dk-raw
    )[width="prose"] {
      --dk-width: min(100%, 68ch);
    }

    dk-slide[content-width="wide"] > :is(
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
      dk-raw
    ),
    dk-region[content-width="wide"] > :is(
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
      dk-raw
    ),
    dk-stack[content-width="wide"] > :is(
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
      dk-raw
    ),
    :is(
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
      dk-raw
    )[width="wide"] {
      --dk-width: min(100%, 1320px);
    }

    dk-slide[content-width="full"] > :is(
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
      dk-raw
    ),
    dk-region[content-width="full"] > :is(
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
      dk-raw
    ),
    dk-stack[content-width="full"] > :is(
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
      dk-raw
    ),
    :is(
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
      dk-raw
    )[width="full"] {
      --dk-width: 100%;
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
      --dk-auto-width: 15ch;
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
      --dk-auto-width: 56ch;
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
      --dk-auto-width: 68ch;
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

    dk-list[marker="none"] dk-item {
      gap: 0;
    }

    dk-list[marker="none"] dk-item::before {
      display: none;
    }

    dk-list[marker="status"] dk-item {
      --dk-item-marker-content: "*";
      --dk-item-marker-bg: var(--dk-panel-surface-muted);
      --dk-item-marker-ink: var(--dk-slide-ink);
      --dk-item-marker-border: var(--dk-border);
    }

    dk-list[marker="status"] dk-item[tone="success"] {
      --dk-item-marker-content: "\\2713";
      --dk-item-marker-bg: rgba(57, 211, 83, 0.18);
      --dk-item-marker-ink: var(--dk-accent);
      --dk-item-marker-border: rgba(57, 211, 83, 0.38);
    }

    dk-list[marker="status"] dk-item[tone="danger"] {
      --dk-item-marker-content: "\\00d7";
      --dk-item-marker-bg: var(--dk-danger-soft);
      --dk-item-marker-ink: var(--dk-danger);
      --dk-item-marker-border: var(--dk-danger-line);
    }

    dk-list[marker="status"] dk-item[tone="warning"] {
      --dk-item-marker-content: "!";
      --dk-item-marker-bg: rgba(255, 143, 61, 0.16);
      --dk-item-marker-ink: var(--dk-accent-2);
      --dk-item-marker-border: rgba(255, 143, 61, 0.4);
    }

    dk-list[marker="status"] dk-item::before {
      content: var(--dk-item-marker-content);
      width: clamp(24px, 2.2cqw, 34px);
      height: clamp(24px, 2.2cqw, 34px);
      margin-top: -0.08em;
      display: grid;
      place-items: center;
      border: 1px solid var(--dk-item-marker-border);
      border-radius: 999px;
      background: var(--dk-item-marker-bg);
      color: var(--dk-item-marker-ink);
      font-size: 0.78em;
      font-weight: 850;
      line-height: 1;
      flex: 0 0 auto;
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
      --dk-auto-width: 100%;
      display: grid;
      width: 100%;
      max-width: var(--dk-width, var(--dk-auto-width));
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
      --dk-region-border: rgba(255, 143, 61, 0.42);
      --dk-region-accent: var(--dk-accent-2);
      color: var(--dk-slide-ink);
    }

    dk-region[frame][tone="strong"] dk-text,
    dk-region[frame][tone="strong"] dk-subtitle {
      color: rgba(240, 246, 252, 0.78);
    }

    dk-region[frame][tone="strong"] dk-item::before {
      color: var(--dk-accent);
    }

    dk-region[frame][tone="strong"] dk-list[ordered] dk-item::before {
      color: var(--dk-panel-ink-strong);
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
  var DKDeck = class extends HTMLElement {
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
          slide: this.currentSlide + 1
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
        const isNext = key === "ArrowRight" || key === "ArrowDown" || key === "Right" || key === "Down" || key === "PageDown" || key === " " || key === "Spacebar" || code === "ArrowRight" || code === "ArrowDown" || code === "PageDown" || code === "Space" || keyCode === 39 || keyCode === 40 || keyCode === 34 || keyCode === 32;
        const isPrevious = key === "ArrowLeft" || key === "ArrowUp" || key === "Left" || key === "Up" || key === "PageUp" || code === "ArrowLeft" || code === "ArrowUp" || code === "PageUp" || keyCode === 37 || keyCode === 38 || keyCode === 33;
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
        startedAt: 0
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
            threshold: Math.round(threshold)
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
          orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait"
        }
      };
    }
  };
  var DKSlide = class extends HTMLElement {
    connectedCallback() {
      if (!this.hasAttribute("role")) this.setAttribute("role", "group");
      if (!this.hasAttribute("aria-roledescription")) {
        this.setAttribute("aria-roledescription", "slide");
      }
    }
  };
  var DKLink = class extends HTMLElement {
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
  };
  var DKCode = class extends HTMLElement {
    connectedCallback() {
      afterChildrenParsed(this, () => this.render());
    }
    render() {
      if (this.dataset.dkRendered === "true") return;
      this.dataset.dkRendered = "true";
      const text = this.hasAttribute("inline") ? this.textContent.trim() : this.textContent.replace(/^\n/, "").replace(/\n\s*$/, "");
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
  };
  var DKItem = class extends HTMLElement {
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
  };
  var DKTable = class extends HTMLElement {
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
  };
  var DKGrid = class extends HTMLElement {
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
  };
  var DKRegion = class extends HTMLElement {
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
  };
  function clampInteger(value, min, max, fallback) {
    if (value === null || value === void 0 || value === "") return fallback;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }
  var coreElements = {
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
    "dk-em": plainElementClass()
  };
  var coreSelectableElements = [
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
    "dk-raw"
  ];
  pluginRegistry.registerBuiltInPlugin(createTerminalGreenThemePlugin(DECKNOW_VERSION));
  pluginRegistry.registerBuiltInPlugin({
    name: "core",
    version: DECKNOW_VERSION,
    kind: "core",
    elements: coreElements,
    selectable: coreSelectableElements,
    styles: {
      id: "runtime",
      css: coreRuntimeStyles
    }
  });
  pluginRegistry.registerBuiltInPlugin(createDiagramBasicPlugin(DECKNOW_VERSION));
  function plainElementClass() {
    return class extends HTMLElement {
    };
  }
})();
