export class DKPyramid extends HTMLElement {
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
        String(Math.round(decision.scale * 1000) / 1000)
      );
      level.dataset.dkLabelPlacement = decision.placement;
    }
  }
}

export class DKPyramidLevel extends HTMLElement {
  connectedCallback() {
    ensurePyramidLevelParts(this);
  }
}

export const pyramidSchema = {
  "dk-pyramid": {
    description: "Semantic layered pyramid. Runtime owns level sizing.",
  },
  "dk-pyramid-level": {
    description: "One level inside a dk-pyramid.",
  },
};

function clampRatio(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function toEdgePercent(ratio, side) {
  const halfSpan = ratio * 50;
  const value = side === "left" ? 50 - halfSpan : 50 + halfSpan;
  return `${Math.round(value * 1000) / 1000}%`;
}

function toLevelEdgePercent(ratio, side, shapeRatio) {
  const halfSpan = ratio * 50;
  const shapePercent = side === "left" ? 50 - halfSpan : 50 + halfSpan;
  const value = shapePercent * shapeRatio;
  return `${Math.round(value * 1000) / 1000}%`;
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
    scale,
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

export const pyramidStyles = `
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
