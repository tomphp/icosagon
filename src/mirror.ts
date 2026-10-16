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

/**
 * Keeps a line in the `aria-live` container per status entry, by name, changing only the lines whose text
 * changed so only they are announced. Empty lines, and lines missing from the entries, are hidden.
 */
export function syncStatus(container: HTMLElement, lines: Record<string, string>) {
  for (const [line, text] of Object.entries(lines)) {
    let el = container.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!el) {
      el = document.createElement("p");
      el.dataset.line = line;
      container.append(el);
    }
    if (el.textContent !== text) el.textContent = text;
  }
  for (const el of container.children as HTMLCollectionOf<HTMLElement>) el.hidden = !lines[el.dataset.line!];
}
