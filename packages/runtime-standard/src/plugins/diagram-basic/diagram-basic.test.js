import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("diagram-basic plugin", () => {
  it("registers official diagram elements, styles, and schema", async () => {
    const env = installDom();
    const { createPluginRegistry, createDiagramBasicPlugin } = await loadModules();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["diagram-basic"],
    });

    const summary = registry.registerBuiltInPlugin(createDiagramBasicPlugin("test"));

    expect(summary).toMatchObject({
      name: "diagram-basic",
      trusted: true,
      elements: ["dk-flow", "dk-flow-step", "dk-pyramid", "dk-pyramid-level"],
      selectable: ["dk-flow", "dk-flow-step", "dk-pyramid", "dk-pyramid-level"],
      styleIds: [
        "decknow-plugin-diagram-basic-flow-styles",
        "decknow-plugin-diagram-basic-pyramid-styles",
      ],
      meta: {
        templates: ["flow", "pyramid"],
      },
    });
    expect(summary.schema.elements).toHaveProperty("dk-flow");
    expect(summary.schema.elements).toHaveProperty("dk-pyramid");
    expect(env.customElements.get("dk-flow")).toBeDefined();
    expect(env.document.getElementById("decknow-plugin-diagram-basic-flow-styles")).not.toBeNull();
    expect(
      env.document.getElementById("decknow-plugin-diagram-basic-pyramid-styles")
    ).not.toBeNull();
  });

  it("wraps flow step labels and auto-selects orientation unless direction is forced", async () => {
    const env = installDom();
    const { createPluginRegistry, createDiagramBasicPlugin } = await loadModules();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["diagram-basic"],
    });
    registry.registerBuiltInPlugin(createDiagramBasicPlugin("test"));

    const parent = env.document.createElement("div");
    const flow = env.document.createElement("dk-flow");
    flow.innerHTML = `
      <dk-flow-step>Plan</dk-flow-step>
      <dk-flow-step>Render</dk-flow-step>
      <dk-flow-step>Inspect</dk-flow-step>
    `;
    parent.appendChild(flow);
    env.document.body.appendChild(parent);
    mockRect(parent, { width: 240, height: 520 });
    mockRect(flow, { width: 240, height: 120 });

    flow.syncOrientation();
    expect(flow.dataset.dkOrientation).toBe("vertical");
    expect(Array.from(flow.querySelectorAll(".dk-flow-step-label"), textContent)).toEqual([
      "Plan",
      "Render",
      "Inspect",
    ]);

    flow.setAttribute("direction", "horizontal");
    expect(flow.dataset.dkOrientation).toBe("horizontal");

    flow.removeAttribute("direction");
    flow.setAttribute("responsive", "none");
    expect(flow.dataset.dkOrientation).toBe("horizontal");
  });

  it("allows rich Decknow content inside flow steps", async () => {
    const env = installDom();
    const { createPluginRegistry, createDiagramBasicPlugin } = await loadModules();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["diagram-basic"],
    });
    registry.registerBuiltInPlugin(createDiagramBasicPlugin("test"));

    const flow = env.document.createElement("dk-flow");
    flow.innerHTML = `
      <dk-flow-step>
        <dk-heading level="3">Title</dk-heading>
        <dk-text>Body copy</dk-text>
      </dk-flow-step>
    `;
    env.document.body.appendChild(flow);

    const step = flow.querySelector("dk-flow-step");
    const label = step.querySelector(".dk-flow-step-label");
    expect(step.dataset.dkRichContent).toBe("true");
    expect(label.tagName.toLowerCase()).toBe("div");
    expect(label.querySelector("dk-heading")?.textContent).toBe("Title");
    expect(label.querySelector("dk-text")?.textContent).toBe("Body copy");
  });

  it("keeps pyramid geometry aligned and only falls back long labels per level", async () => {
    const env = installDom();
    installTextMeasurement(env, 10);
    const { createPluginRegistry, createDiagramBasicPlugin } = await loadModules();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["diagram-basic"],
    });
    registry.registerBuiltInPlugin(createDiagramBasicPlugin("test"));

    const pyramid = env.document.createElement("dk-pyramid");
    pyramid.innerHTML = `
      <dk-pyramid-level>Top</dk-pyramid-level>
      <dk-pyramid-level>Middle</dk-pyramid-level>
      <dk-pyramid-level>${"Very long level label ".repeat(10)}</dk-pyramid-level>
    `;
    env.document.body.appendChild(pyramid);
    mockRect(pyramid, { width: 420, height: 320 });

    pyramid.syncLevels();
    const [top, middle, bottom] = Array.from(pyramid.querySelectorAll("dk-pyramid-level"));

    expect(top.style.getPropertyValue("--dk-pyramid-left-top")).toBe("50%");
    expect(top.style.getPropertyValue("--dk-pyramid-right-top")).toBe("50%");
    expect(top.style.getPropertyValue("--dk-pyramid-left-bottom")).toBe("33.333%");
    expect(top.style.getPropertyValue("--dk-pyramid-right-bottom")).toBe("66.667%");
    expect(middle.style.getPropertyValue("--dk-pyramid-left-bottom")).toBe("16.667%");
    expect(middle.style.getPropertyValue("--dk-pyramid-right-bottom")).toBe("83.333%");

    expect(top.dataset.dkLabelPlacement).toBe("inside");
    expect(middle.dataset.dkLabelPlacement).toBe("inside");
    expect(bottom.dataset.dkLabelPlacement).toBe("side");
    expect(pyramid.dataset.dkHasSideLabels).toBe("true");
    expect(top.querySelector(".dk-pyramid-level-label")?.textContent).toBe("Top");
    expect(bottom.querySelector(".dk-pyramid-level-label")?.textContent).toContain(
      "Very long level label"
    );
  });

  it("honors explicit pyramid label placement overrides", async () => {
    const env = installDom();
    const { createPluginRegistry, createDiagramBasicPlugin } = await loadModules();
    const registry = createPluginRegistry(env, {
      officialPluginNames: ["diagram-basic"],
    });
    registry.registerBuiltInPlugin(createDiagramBasicPlugin("test"));

    const pyramid = env.document.createElement("dk-pyramid");
    pyramid.setAttribute("label-placement", "inside");
    pyramid.innerHTML = `
      <dk-pyramid-level>${"Long but forced inside ".repeat(20)}</dk-pyramid-level>
    `;
    env.document.body.appendChild(pyramid);
    mockRect(pyramid, { width: 180, height: 120 });

    pyramid.syncLevels();
    expect(pyramid.querySelector("dk-pyramid-level")?.dataset.dkLabelPlacement).toBe("inside");

    pyramid.setAttribute("label-placement", "callout");
    expect(pyramid.querySelector("dk-pyramid-level")?.dataset.dkLabelPlacement).toBe("callout");
  });
});

async function loadModules() {
  const [{ createPluginRegistry }, { createDiagramBasicPlugin }] = await Promise.all([
    import("../../plugin-registry.js"),
    import("./index.js"),
  ]);
  return { createPluginRegistry, createDiagramBasicPlugin };
}

function installDom() {
  const window = new Window();
  const env = {
    window,
    document: window.document,
    customElements: window.customElements,
    HTMLElement: window.HTMLElement,
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

function installTextMeasurement(env, charWidth) {
  const originalGetBoundingClientRect = env.window.HTMLElement.prototype.getBoundingClientRect;
  env.window.HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    if (this.style?.position === "fixed" && this.style?.visibility === "hidden") {
      return rect({ width: this.textContent.length * charWidth, height: 20 });
    }
    return originalGetBoundingClientRect.call(this);
  };
}

function mockRect(element, size) {
  element.getBoundingClientRect = () => rect(size);
}

function rect({ width, height }) {
  return {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
  };
}

function textContent(element) {
  return element.textContent;
}

class TestResizeObserver {
  observe() {}
  disconnect() {}
}
