(() => {
  const FALLBACK_SELECTABLE_SELECTORS = [
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

  const state = {
    active: false,
    hasReportedModeOpened: false,
    hoverTarget: null,
    selectedTarget: null,
    comments: [],
    nextCommentId: 1,
  };

  function ready(callback) {
    if (window.__DECKNOW__?.ready) {
      window.__DECKNOW__.ready.then(callback);
      return;
    }
    document.addEventListener("decknow:ready", callback, { once: true });
  }

  ready(() => {
    injectStyles();
    const ui = createUi();
    bindEvents(ui);
    updateCount(ui);
  });

  function createUi() {
    const root = document.createElement("div");
    root.className = "dk-comment-overlay";
    root.innerHTML = `
      <div class="dk-comment-highlight" data-kind="hover"></div>
      <div class="dk-comment-highlight" data-kind="selected"></div>
      <button class="dk-comment-toggle" type="button" aria-label="Open comment mode">
        <span class="dk-comment-toggle__mark">C</span>
        <span class="dk-comment-toggle__label">Comment</span>
      </button>
      <section class="dk-comment-panel" hidden>
        <div class="dk-comment-panel__header">
          <strong>Comment target</strong>
        </div>
        <div class="dk-comment-target"></div>
        <textarea class="dk-comment-text" rows="4" placeholder="Tell the AI what to change about this element."></textarea>
        <div class="dk-comment-panel__actions">
          <button class="dk-comment-cancel" type="button">Cancel</button>
          <button class="dk-comment-save" type="button">Save comment</button>
        </div>
      </section>
      <section class="dk-comment-round" hidden>
        <div class="dk-comment-round__copy">
          <strong>Submit saved comments</strong>
          <span class="dk-comment-count">0 comments in this round</span>
        </div>
        <button class="dk-comment-submit" type="button">Submit round</button>
        <button class="dk-comment-exit" type="button">Exit</button>
      </section>
      <div class="dk-comment-toast" hidden></div>
    `;
    document.body.appendChild(root);
    return {
      root,
      toggle: root.querySelector(".dk-comment-toggle"),
      hover: root.querySelector('.dk-comment-highlight[data-kind="hover"]'),
      selected: root.querySelector('.dk-comment-highlight[data-kind="selected"]'),
      panel: root.querySelector(".dk-comment-panel"),
      target: root.querySelector(".dk-comment-target"),
      textarea: root.querySelector(".dk-comment-text"),
      cancel: root.querySelector(".dk-comment-cancel"),
      save: root.querySelector(".dk-comment-save"),
      round: root.querySelector(".dk-comment-round"),
      count: root.querySelector(".dk-comment-count"),
      submit: root.querySelector(".dk-comment-submit"),
      exit: root.querySelector(".dk-comment-exit"),
      toast: root.querySelector(".dk-comment-toast"),
    };
  }

  function bindEvents(ui) {
    ui.toggle.addEventListener("click", () => {
      if (state.active) {
        exitCommentMode(ui);
      } else {
        enterCommentMode(ui);
      }
    });

    ui.exit.addEventListener("click", () => exitCommentMode(ui));
    ui.cancel.addEventListener("click", () => clearSelection(ui));
    ui.save.addEventListener("click", () => saveCurrentComment(ui));
    ui.submit.addEventListener("click", () => submitRound(ui));

    document.addEventListener(
      "pointermove",
      (event) => {
        if (!state.active || state.selectedTarget || ui.root.contains(event.target)) return;
        const target = targetFromPoint(event.clientX, event.clientY);
        state.hoverTarget = target;
        updateBox(ui.hover, target);
      },
      { passive: true }
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!state.active || ui.root.contains(event.target)) return;
        if (state.selectedTarget) return;
        const target = targetFromPoint(event.clientX, event.clientY);
        if (!target) return;
        event.preventDefault();
        event.stopPropagation();
        selectTarget(ui, target);
      },
      true
    );

    document.addEventListener("keydown", (event) => {
      if (!state.active || event.key !== "Escape") return;
      if (state.selectedTarget) {
        clearSelection(ui);
        return;
      }
      if (!state.selectedTarget) exitCommentMode(ui);
    });

    window.addEventListener("resize", () => {
      updateBox(ui.hover, state.hoverTarget);
      updateBox(ui.selected, state.selectedTarget);
    });
  }

  function enterCommentMode(ui) {
    state.active = true;
    document.body.dataset.dkCommentMode = "true";
    setToggleMode(ui, true);
    ui.toggle.setAttribute("aria-label", "Exit comment mode");
    ui.round.hidden = false;
    releaseOverlayFocus(ui);
    toast(ui, "Comment mode opened. Click an element to comment.");
    if (!state.hasReportedModeOpened) {
      state.hasReportedModeOpened = true;
      postJson("/__decknow__/comments/mode-opened", {
        deck: window.__DECKNOW__?.screenshotState?.() || null,
        viewport: viewportInfo(),
      }).catch(() => {});
    }
  }

  function exitCommentMode(ui) {
    state.active = false;
    state.hoverTarget = null;
    clearSelection(ui);
    document.body.removeAttribute("data-dk-comment-mode");
    setToggleMode(ui, false);
    ui.toggle.setAttribute("aria-label", "Open comment mode");
    ui.hover.hidden = true;
    ui.round.hidden = true;
    releaseOverlayFocus(ui);
  }

  function selectTarget(ui, target) {
    state.hoverTarget = null;
    ui.hover.hidden = true;
    state.selectedTarget = target;
    updateBox(ui.selected, target);
    ui.selected.hidden = false;
    ui.panel.hidden = false;
    ui.target.textContent = targetSummary(target);
    ui.textarea.value = "";
    ui.textarea.focus();
  }

  function clearSelection(ui) {
    state.selectedTarget = null;
    ui.selected.hidden = true;
    ui.panel.hidden = true;
    ui.target.textContent = "";
    ui.textarea.value = "";
    releaseOverlayFocus(ui);
  }

  function saveCurrentComment(ui) {
    const text = ui.textarea.value.trim();
    if (!state.selectedTarget || !text) {
      toast(ui, "Select an element and write a comment first.");
      return;
    }

    state.comments.push({
      id: state.nextCommentId++,
      text,
      target: describeTarget(state.selectedTarget),
    });
    updateCount(ui);
    clearSelection(ui);
    ui.round.hidden = false;
    toast(ui, "Comment saved to this round.");
  }

  async function submitRound(ui) {
    if (!state.comments.length) {
      toast(ui, "No saved comments to submit.");
      return;
    }

    const submittedCount = state.comments.length;
    const payload = {
      deck: window.__DECKNOW__?.screenshotState?.() || null,
      viewport: viewportInfo(),
      comments: state.comments,
    };
    const result = await postJson("/__decknow__/comments/rounds", payload);
    state.comments = [];
    state.nextCommentId = 1;
    updateCount(ui);
    clearSelection(ui);
    ui.round.hidden = true;
    releaseOverlayFocus(ui);
    toast(
      ui,
      `Submitted ${submittedCount} new ${submittedCount === 1 ? "comment" : "comments"} (round ${result.round}).`
    );
  }

  function updateCount(ui) {
    const count = state.comments.length;
    ui.round.dataset.dkHasComments = count ? "true" : "false";
    ui.count.textContent = count
      ? `${count} saved ${count === 1 ? "comment" : "comments"} ready to submit`
      : "No saved comments yet";
  }

  function setToggleMode(ui, active) {
    ui.toggle.dataset.dkActive = active ? "true" : "false";
    ui.toggle.querySelector(".dk-comment-toggle__mark").textContent = active ? "X" : "C";
    ui.toggle.querySelector(".dk-comment-toggle__label").textContent = active ? "Close" : "Comment";
  }

  function releaseOverlayFocus(ui) {
    if (ui.root.contains(document.activeElement)) {
      document.activeElement.blur?.();
    }
  }

  function targetFromPoint(x, y) {
    const activeSlide = document.querySelector("dk-slide[data-active='true']");
    if (!activeSlide) return null;
    const elements = document.elementsFromPoint(x, y);
    const selector = selectableSelector();
    for (const element of elements) {
      const target = element.closest?.(selector);
      if (target && activeSlide.contains(target)) return target;
    }
    return null;
  }

  function selectableSelector() {
    const runtimeSelectors = window.__DECKNOW__?.getSelectableSelectors?.();
    const selectors =
      Array.isArray(runtimeSelectors) && runtimeSelectors.length
        ? runtimeSelectors
        : FALLBACK_SELECTABLE_SELECTORS;
    return selectors.join(",");
  }

  function describeTarget(element) {
    const rect = element.getBoundingClientRect();
    const slide = element.closest("dk-slide");
    const slideRect = slide?.getBoundingClientRect();
    const slideIndex = slide
      ? Array.from(slide.parentElement.querySelectorAll(":scope > dk-slide")).indexOf(slide)
      : -1;
    return {
      tag: element.tagName.toLowerCase(),
      selector: cssPath(element),
      domPath: domPath(element),
      slide: slideIndex + 1,
      attributes: attributesOf(element),
      textExcerpt: compactText(element, 240),
      rect: rectObject(rect),
      slideRect: slideRect ? rectObject(slideRect) : null,
      slideRelativeRect: slideRect
        ? {
            x: round(rect.left - slideRect.left),
            y: round(rect.top - slideRect.top),
            width: round(rect.width),
            height: round(rect.height),
          }
        : null,
    };
  }

  function targetSummary(element) {
    const info = describeTarget(element);
    const text = info.textExcerpt ? ` - ${info.textExcerpt}` : "";
    return `Slide ${info.slide}: ${info.tag}${text}`;
  }

  function updateBox(box, element) {
    if (!element || !state.active) {
      box.hidden = true;
      return;
    }
    const rect = element.getBoundingClientRect();
    box.hidden = false;
    box.style.left = `${rect.left}px`;
    box.style.top = `${rect.top}px`;
    box.style.width = `${rect.width}px`;
    box.style.height = `${rect.height}px`;
  }

  async function postJson(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }

  function viewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
  }

  function cssPath(element) {
    const parts = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tag = current.tagName.toLowerCase();
      if (tag === "body" || tag === "html") break;
      parts.unshift(`${tag}:nth-of-type(${nthOfType(current)})`);
      if (tag === "dk-deck") break;
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function domPath(element) {
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tag = current.tagName.toLowerCase();
      if (tag === "body" || tag === "html") break;
      path.unshift({
        tag,
        index: nthOfType(current),
        attributes: attributesOf(current),
      });
      if (tag === "dk-deck") break;
      current = current.parentElement;
    }
    return path;
  }

  function nthOfType(element) {
    let index = 1;
    let current = element.previousElementSibling;
    while (current) {
      if (current.tagName === element.tagName) index += 1;
      current = current.previousElementSibling;
    }
    return index;
  }

  function attributesOf(element) {
    const attributes = {};
    for (const attribute of element.attributes) {
      if (isRuntimeAttribute(attribute.name)) continue;
      if (attribute.name === "style") {
        const style = cleanStyleAttribute(element);
        if (style) attributes.style = style;
        continue;
      }
      attributes[attribute.name] = attribute.value;
    }
    return attributes;
  }

  function isRuntimeAttribute(name) {
    return (
      name.startsWith("data-dk-") ||
      name === "data-active" ||
      name === "aria-hidden" ||
      name === "aria-roledescription" ||
      name === "role" ||
      name === "tabindex"
    );
  }

  function cleanStyleAttribute(element) {
    const declarations = [];
    for (let index = 0; index < element.style.length; index += 1) {
      const property = element.style.item(index);
      if (property.startsWith("--dk-")) continue;
      const priority = element.style.getPropertyPriority(property);
      declarations.push(
        `${property}: ${element.style.getPropertyValue(property)}${priority ? ` !${priority}` : ""}`
      );
    }
    return declarations.length ? `${declarations.join("; ")};` : "";
  }

  function compactText(element, length) {
    return element.textContent?.replace(/\s+/g, " ").trim().slice(0, length) || "";
  }

  function rectObject(rect) {
    return {
      x: round(rect.x),
      y: round(rect.y),
      left: round(rect.left),
      right: round(rect.right),
      top: round(rect.top),
      bottom: round(rect.bottom),
      width: round(rect.width),
      height: round(rect.height),
    };
  }

  function round(value) {
    return Math.round(value * 1000) / 1000;
  }

  function toast(ui, text) {
    ui.toast.textContent = text;
    ui.toast.hidden = false;
    clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => {
      ui.toast.hidden = true;
    }, 1800);
  }

  function injectStyles() {
    if (document.getElementById("decknow-comment-styles")) return;
    const style = document.createElement("style");
    style.id = "decknow-comment-styles";
    style.textContent = `
      .dk-comment-overlay {
        position: fixed;
        inset: 0;
        z-index: 100000;
        pointer-events: none;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .dk-comment-toggle,
      .dk-comment-panel,
      .dk-comment-round,
      .dk-comment-toast {
        pointer-events: auto;
      }

      .dk-comment-toggle {
        position: fixed;
        right: 18px;
        bottom: 18px;
        z-index: 1;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 118px;
        height: 46px;
        padding: 0 14px 0 9px;
        border: 1px solid rgba(57, 211, 83, 0.58);
        border-radius: 999px;
        background:
          linear-gradient(135deg, rgba(57, 211, 83, 0.22), rgba(1, 4, 9, 0.94) 58%),
          rgba(1, 4, 9, 0.92);
        color: #d9ffe9;
        font: 700 13px/1 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow:
          0 0 0 1px rgba(1, 4, 9, 0.86),
          0 16px 44px rgba(0, 0, 0, 0.38),
          0 0 24px rgba(57, 211, 83, 0.18);
        cursor: pointer;
      }

      .dk-comment-toggle__mark {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        background: #39d353;
        color: #06150a;
        font: 850 14px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
        box-shadow: 0 0 18px rgba(57, 211, 83, 0.28);
      }

      .dk-comment-toggle__label {
        letter-spacing: 0;
        white-space: nowrap;
      }

      .dk-comment-toggle[data-dk-active="true"] {
        border-color: rgba(255, 143, 61, 0.6);
        background:
          linear-gradient(135deg, rgba(255, 143, 61, 0.2), rgba(1, 4, 9, 0.94) 58%),
          rgba(1, 4, 9, 0.92);
      }

      .dk-comment-toggle[data-dk-active="true"] .dk-comment-toggle__mark {
        background: #ff8f3d;
        box-shadow: 0 0 18px rgba(255, 143, 61, 0.28);
      }

      .dk-comment-highlight {
        position: fixed;
        box-sizing: border-box;
        border: 2px solid rgba(255, 255, 255, 0.96);
        border-radius: 6px;
        background: rgba(34, 211, 238, 0.12);
        box-shadow:
          0 0 0 2px rgba(1, 4, 9, 0.92),
          0 0 0 5px rgba(34, 211, 238, 0.92),
          0 14px 34px rgba(0, 0, 0, 0.32);
        pointer-events: none;
      }

      .dk-comment-highlight[data-kind="selected"] {
        border-color: rgba(255, 255, 255, 0.98);
        background: rgba(255, 177, 66, 0.16);
        box-shadow:
          0 0 0 2px rgba(1, 4, 9, 0.95),
          0 0 0 5px rgba(255, 143, 61, 0.96),
          0 14px 34px rgba(0, 0, 0, 0.36);
      }

      .dk-comment-panel {
        position: fixed;
        right: 18px;
        bottom: 76px;
        z-index: 4;
        width: min(380px, calc(100vw - 36px));
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid rgba(139, 148, 158, 0.28);
        border-radius: 8px;
        background: rgba(1, 4, 9, 0.94);
        color: #f0f6fc;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.42);
      }

      .dk-comment-panel[hidden],
      .dk-comment-round[hidden],
      .dk-comment-toast[hidden],
      .dk-comment-highlight[hidden] {
        display: none;
      }

      .dk-comment-panel__header,
      .dk-comment-panel__actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .dk-comment-panel__header {
        justify-content: space-between;
      }

      .dk-comment-target {
        color: #8b949e;
        font-size: 12px;
        line-height: 1.35;
      }

      .dk-comment-text {
        min-height: 92px;
        resize: vertical;
        padding: 10px;
        border: 1px solid rgba(139, 148, 158, 0.32);
        border-radius: 6px;
        background: rgba(13, 17, 23, 0.9);
        color: #f0f6fc;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.45;
      }

      .dk-comment-panel button,
      .dk-comment-round button {
        flex: 0 0 auto;
        border: 1px solid rgba(139, 148, 158, 0.28);
        border-radius: 6px;
        background: rgba(13, 17, 23, 0.86);
        color: #f0f6fc;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
        padding: 8px 10px;
        cursor: pointer;
      }

      .dk-comment-save,
      .dk-comment-submit {
        border-color: rgba(57, 211, 83, 0.44) !important;
        color: #d9ffe9 !important;
      }

      .dk-comment-round {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 3;
        width: min(540px, calc(100vw - 36px));
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px;
        border: 1px solid rgba(57, 211, 83, 0.34);
        border-radius: 10px;
        background:
          linear-gradient(135deg, rgba(57, 211, 83, 0.14), rgba(1, 4, 9, 0.95) 44%),
          rgba(1, 4, 9, 0.94);
        color: #f0f6fc;
        box-shadow:
          0 0 0 1px rgba(1, 4, 9, 0.9),
          0 18px 56px rgba(0, 0, 0, 0.4),
          0 0 28px rgba(57, 211, 83, 0.12);
        font-size: 12px;
      }

      .dk-comment-round__copy {
        display: grid;
        gap: 2px;
        min-width: 0;
        flex: 1 1 auto;
      }

      .dk-comment-round__copy strong {
        color: #d9ffe9;
        font-size: 13px;
        line-height: 1.1;
      }

      .dk-comment-count {
        color: #8b949e;
        line-height: 1.2;
      }

      .dk-comment-submit {
        padding: 10px 12px !important;
        background: rgba(57, 211, 83, 0.16) !important;
        box-shadow: inset 0 0 0 1px rgba(57, 211, 83, 0.1);
      }

      .dk-comment-round[data-dk-has-comments="true"] .dk-comment-submit {
        background: #39d353 !important;
        border-color: #39d353 !important;
        color: #06150a !important;
      }

      .dk-comment-toast {
        position: fixed;
        left: 50%;
        top: 18px;
        transform: translateX(-50%);
        z-index: 5;
        max-width: min(520px, calc(100vw - 36px));
        padding: 10px 12px;
        border: 1px solid rgba(57, 211, 83, 0.28);
        border-radius: 999px;
        background: rgba(1, 4, 9, 0.9);
        color: #d9ffe9;
        font-size: 13px;
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.34);
      }
    `;
    document.head.appendChild(style);
  }
})();
