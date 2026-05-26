export class DKFlow extends HTMLElement {
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
    const requiredWidth =
      steps.reduce((total, step) => total + measureFlowStepWidth(step), 0) +
      gap * Math.max(0, steps.length - 1);
    const hasVerticalRoom = parentRect.height > parentRect.width * 1.08;
    const lacksHorizontalRoom = hostRect.width < requiredWidth;

    this.dataset.dkOrientation = hasVerticalRoom || lacksHorizontalRoom ? "vertical" : "horizontal";
  }
}

export class DKFlowStep extends HTMLElement {
  connectedCallback() {
    if (!this.hasAttribute("role")) this.setAttribute("role", "listitem");
    ensureFlowStepLabel(this);
  }
}

export const flowSchema = {
  "dk-flow": {
    description: "Semantic process flow. Runtime owns node spacing and connectors.",
  },
  "dk-flow-step": {
    description: "One step inside a dk-flow.",
  },
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
  const padding =
    (parseFloat(style.paddingLeft) || 0) +
    (parseFloat(style.paddingRight) || 0) +
    (parseFloat(style.columnGap) || 0);
  const markerWidth = parseFloat(getComputedStyle(step, "::before").width || "0") || 36;
  return Math.ceil(labelWidth + padding + markerWidth + 4);
}

export const flowStyles = `
  dk-flow {
    --dk-flow-gap-local: var(--dk-grid-gap-lg);
    --dk-flow-arrow-head: clamp(12px, 1.1cqw, 18px);
    --dk-flow-connector-thickness: clamp(16px, 1.6cqw, 24px);
    --dk-flow-connector-color: var(--dk-accent);
    --dk-flow-connector-fade: rgba(57, 211, 83, 0.12);
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
    --dk-flow-connector-radius: 999px;
    --dk-flow-connector-opacity: 0.96;
    --dk-flow-connector-clip-horizontal: polygon(
      0 38%,
      calc(100% - var(--dk-flow-arrow-head)) 38%,
      calc(100% - var(--dk-flow-arrow-head)) 10%,
      100% 50%,
      calc(100% - var(--dk-flow-arrow-head)) 90%,
      calc(100% - var(--dk-flow-arrow-head)) 62%,
      0 62%
    );
    --dk-flow-connector-clip-vertical: polygon(
      38% 0,
      62% 0,
      62% calc(100% - var(--dk-flow-arrow-head)),
      90% calc(100% - var(--dk-flow-arrow-head)),
      50% 100%,
      10% calc(100% - var(--dk-flow-arrow-head)),
      38% calc(100% - var(--dk-flow-arrow-head))
    );
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
    height: var(--dk-flow-connector-thickness);
    transform: translateY(-50%);
    border-radius: var(--dk-flow-connector-radius);
    background: var(--dk-flow-connector-bg-horizontal);
    clip-path: var(--dk-flow-connector-clip-horizontal);
    opacity: var(--dk-flow-connector-opacity);
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
    width: var(--dk-flow-connector-thickness);
    height: calc(var(--dk-flow-gap-local) - 4px);
    transform: translateX(-50%);
    background: var(--dk-flow-connector-bg-vertical);
    clip-path: var(--dk-flow-connector-clip-vertical);
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
      width: var(--dk-flow-connector-thickness);
      height: calc(var(--dk-flow-gap-local) - 4px);
      transform: translateX(-50%);
      background: var(--dk-flow-connector-bg-vertical);
      clip-path: var(--dk-flow-connector-clip-vertical);
    }

    dk-flow[data-dk-orientation="horizontal"] dk-flow-step:not(:last-child)::after {
      top: 50%;
      left: calc(100% + 4px);
      width: calc(var(--dk-flow-gap-local) - 4px);
      height: var(--dk-flow-connector-thickness);
      transform: translateY(-50%);
      background: var(--dk-flow-connector-bg-horizontal);
      clip-path: var(--dk-flow-connector-clip-horizontal);
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
