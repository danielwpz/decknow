import fs from "node:fs";
import { Window } from "happy-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const overlaySource = fs.readFileSync(new URL("./comment-overlay.js", import.meta.url), "utf8");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("comment overlay client", () => {
  it("lets normal page clicks through while a comment target is locked", async () => {
    const { document, window } = installOverlay(`
      <dk-deck>
        <dk-slide data-active="true">
          <dk-text id="first">First target text</dk-text>
          <dk-text id="second">Second target text</dk-text>
        </dk-slide>
      </dk-deck>
    `);
    await flushReady();

    const toggle = document.querySelector(".dk-comment-toggle");
    toggle.focus();
    click(window, toggle);
    expect(document.activeElement).not.toBe(toggle);

    const first = document.getElementById("first");
    const second = document.getElementById("second");
    document.elementsFromPoint = vi.fn(() => [first]);

    const selectClick = click(window, first);
    expect(selectClick.defaultPrevented).toBe(true);
    expect(document.querySelector(".dk-comment-target").textContent).toContain("First target text");

    document.elementsFromPoint = vi.fn(() => [second]);
    const pageClick = click(window, second);

    expect(pageClick.defaultPrevented).toBe(false);
    expect(document.querySelector(".dk-comment-target").textContent).toContain("First target text");
    expect(document.querySelector(".dk-comment-target").textContent).not.toContain(
      "Second target text"
    );

    click(window, document.querySelector(".dk-comment-cancel"));
    const nextSelectClick = click(window, second);

    expect(nextSelectClick.defaultPrevented).toBe(true);
    expect(document.querySelector(".dk-comment-target").textContent).toContain(
      "Second target text"
    );

    toggle.focus();
    click(window, toggle);
    expect(document.body.hasAttribute("data-dk-comment-mode")).toBe(false);
    expect(document.activeElement).not.toBe(toggle);
  });

  it("makes the bottom submit affordance explicit and stateful", async () => {
    const { document, window } = installOverlay(`
      <dk-deck>
        <dk-slide data-active="true">
          <dk-text id="target">Target text</dk-text>
        </dk-slide>
      </dk-deck>
    `);
    await flushReady();

    click(window, document.querySelector(".dk-comment-toggle"));

    const round = document.querySelector(".dk-comment-round");
    expect(round.querySelector(".dk-comment-round__copy strong").textContent).toBe(
      "Submit saved comments"
    );
    expect(round.dataset.dkHasComments).toBe("false");
    expect(document.querySelector(".dk-comment-count").textContent).toBe("No saved comments yet");

    const target = document.getElementById("target");
    document.elementsFromPoint = vi.fn(() => [target]);
    click(window, target);
    document.querySelector(".dk-comment-text").value = "Needs a change";
    click(window, document.querySelector(".dk-comment-save"));

    expect(round.dataset.dkHasComments).toBe("true");
    expect(document.querySelector(".dk-comment-count").textContent).toBe(
      "1 saved comment ready to submit"
    );
    expect(document.getElementById("decknow-comment-styles").textContent).toContain(
      '.dk-comment-round[data-dk-has-comments="true"] .dk-comment-submit'
    );

    click(window, document.querySelector(".dk-comment-exit"));
    expect(document.body.hasAttribute("data-dk-comment-mode")).toBe(false);
    expect(round.hidden).toBe(true);

    click(window, document.querySelector(".dk-comment-toggle"));
    expect(round.hidden).toBe(false);
    expect(document.querySelector(".dk-comment-count").textContent).toBe(
      "1 saved comment ready to submit"
    );

    click(window, document.querySelector(".dk-comment-submit"));
    await flushReady();

    expect(round.hidden).toBe(true);
    expect(document.querySelector(".dk-comment-toast").textContent).toBe(
      "Submitted 1 new comment (round 1)."
    );
  });
});

function installOverlay(bodyHtml) {
  const window = new Window({ url: "http://127.0.0.1:4317/deck.html" });
  const { document } = window;
  document.body.innerHTML = bodyHtml;
  window.__DECKNOW__ = {
    getSelectableSelectors: () => ["dk-text"],
    ready: Promise.resolve(),
    screenshotState: () => ({ slideNumber: 1 }),
  };
  window.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, round: 1 }),
  }));
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  vi.stubGlobal("navigator", window.navigator);
  vi.stubGlobal("Node", window.Node);
  vi.stubGlobal("fetch", window.fetch);

  Function(overlaySource)();

  return { document, window };
}

async function flushReady() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

function click(window, element) {
  const event = new window.MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    clientX: 10,
    clientY: 10,
  });
  element.dispatchEvent(event);
  return event;
}
