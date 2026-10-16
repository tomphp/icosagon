import type { Button } from "./widgets.ts";

/**
 * Keeps a real, transparent `<button>` over each canvas button, so the canvas buttons take pointer,
 * keyboard and screen-reader presses alike. Buttons are rebuilt only when the set of keys changes,
 * keeping focus on the button with the same key.
 */
export function syncMirror(container: HTMLElement, buttons: Button[], press: (button: Button) => void) {
  const keys = buttons.map((b) => b.key).join("\n");
  if (container.dataset.keys !== keys) {
    const focused = (document.activeElement as HTMLElement | null)?.dataset.key;
    container.replaceChildren(
      ...buttons.map(({ key }) => {
        const el = document.createElement("button");
        el.type = "button";
        el.dataset.key = key;
        return el;
      }),
    );
    container.dataset.keys = keys;
    container.querySelector<HTMLElement>(`[data-key="${focused}"]`)?.focus();
  }
  buttons.forEach((b, i) => {
    const el = container.children[i] as HTMLButtonElement;
    el.textContent = b.label;
    if (b.group) el.setAttribute("aria-label", `${b.group}: ${b.label}`);
    if (b.pill) el.setAttribute("aria-pressed", String(b.selected));
    el.onclick = () => press(b);
    Object.assign(el.style, {
      left: `${b.rect.x}px`,
      top: `${b.rect.y}px`,
      width: `${b.rect.width}px`,
      height: `${b.rect.height}px`,
      borderRadius: `${b.rect.height / 2}px`,
    });
  });
}
