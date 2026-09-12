/**
 * Claude Composer DOM utilities:
 * - Active composer input pill resolution with strict disclaimer chin exclusion
 * - Trailing actions container resolution (submit button when typing, mic/audio when empty)
 * - Refine toggle UI anchor insertion
 */

export const CLAUDE_CHIN_SELECTORS =
  '[data-disclaimer="true"], [data-testid="model-selector-dropdown"], .group\\/chin-trail, a[href*="support.anthropic.com"]';

export const CLAUDE_MIC_SELECTORS = [
  'button[aria-label*="voice" i]',
  'button[aria-label*="audio" i]',
  'button[aria-label*="record" i]',
  'button[aria-label*="dictat" i]',
  'button[aria-label*="speech" i]',
  'button[aria-label*="mic" i]',
  'button[data-testid*="mic" i]',
  'button[data-testid*="voice" i]',
  'button[data-testid*="speech" i]',
  'button[data-testid*="audio" i]',
  '[data-cds="Button"][aria-label*="voice" i]',
  '[data-cds="Button"][aria-label*="mic" i]',
  '[data-cds="Button"][aria-label*="speech" i]'
].join(', ');

/**
 * Resolves active Claude ProseMirror input pill container, strictly EXCLUDING the disclaimer chin.
 */
export function getActiveComposerContainer(
  activeInput?: HTMLElement | null
): HTMLElement | null {
  const input =
    activeInput ||
    (typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(".ProseMirror, [contenteditable='true']")
      : null);
  if (!input || (typeof input.isConnected === "boolean" && !input.isConnected)) return null;

  let container: HTMLElement = input;
  let curr: HTMLElement | null = input.parentElement;

  // Walk up from ProseMirror, stopping before any ancestor that contains the disclaimer chin
  while (curr && curr.tagName !== "BODY" && curr.tagName !== "MAIN") {
    const hasChin = curr.querySelector(CLAUDE_CHIN_SELECTORS);
    if (hasChin && curr.contains(hasChin)) {
      // curr includes the bottom disclaimer chin; stop here so "container" is strictly the input pill!
      break;
    }
    container = curr;
    if (curr.tagName === "FIELDSET") break;
    curr = curr.parentElement;
  }

  return container;
}

/**
 * Resolves trailing action buttons container in Claude composer (send button when typing, mic/audio when empty).
 */
export function getTrailingActionsContainer(
  activeContainer?: HTMLElement | null,
  submitBtn?: HTMLElement | null
): HTMLElement | null {
  // 1. Submit button parent (when text is present)
  if (submitBtn) {
    const flexParent = submitBtn.closest("div.flex") as HTMLElement | null;
    if (flexParent && !flexParent.querySelector(CLAUDE_CHIN_SELECTORS)) {
      return flexParent;
    }
    if (submitBtn.parentElement) return submitBtn.parentElement;
  }

  const inputContainer = activeContainer || getActiveComposerContainer();
  const input =
    typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(".ProseMirror, [contenteditable='true']")
      : null;

  // Potential search roots in descending priority, strictly excluding chin
  const searchRoots = [
    inputContainer,
    input?.closest("fieldset"),
    input?.closest("form"),
    input?.parentElement?.parentElement
  ].filter(Boolean) as HTMLElement[];

  for (const root of searchRoots) {
    // 2. Mic / voice / audio / dictation button parent (when composer is empty)
    const micOrVoiceBtn = root.querySelector<HTMLElement>(CLAUDE_MIC_SELECTORS);
    if (micOrVoiceBtn && !micOrVoiceBtn.closest(CLAUDE_CHIN_SELECTORS)) {
      const flexParent = micOrVoiceBtn.closest("div.flex") as HTMLElement | null;
      if (flexParent && !flexParent.querySelector(CLAUDE_CHIN_SELECTORS)) {
        return flexParent;
      }
      if (micOrVoiceBtn.parentElement) return micOrVoiceBtn.parentElement;
    }

    // 3. Trailing button container excluding the leading upload/add button ("+")
    const allButtons = Array.from(
      root.querySelectorAll<HTMLElement>("button, [data-cds=\"Button\"], [role=\"button\"]")
    ).filter((btn) => !btn.closest(CLAUDE_CHIN_SELECTORS));

    const trailingButtons = allButtons.filter((btn) => {
      // Exclude buttons preceding input in document order if both connected
      if (input && (btn.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_PRECEDING) === 0) {
        return false;
      }
      const label = (btn.getAttribute("aria-label") || "").toLowerCase();
      return (
        !label.includes("add") &&
        !label.includes("attach") &&
        !label.includes("upload") &&
        !label.includes("plus")
      );
    });

    const firstTrailing = trailingButtons[0];
    if (firstTrailing) {
      const flexParent = firstTrailing.closest("div.flex") as HTMLElement | null;
      if (flexParent && !flexParent.querySelector(CLAUDE_CHIN_SELECTORS)) {
        return flexParent;
      }
      if (firstTrailing.parentElement) return firstTrailing.parentElement;
    }

    // 4. Flex container fallbacks
    const flexCandidates = Array.from(
      root.querySelectorAll<HTMLElement>(
        "div.flex.items-center.gap-2, div.flex.items-center.gap-1, div.flex.items-center.justify-between, div.flex.items-center"
      )
    ).filter((el) => !el.closest(CLAUDE_CHIN_SELECTORS) && !el.querySelector(CLAUDE_CHIN_SELECTORS));

    const fallbackFlex = flexCandidates[flexCandidates.length - 1];
    if (fallbackFlex) {
      return fallbackFlex;
    }
  }

  return null;
}

/**
 * Inserts the RefineToggle UI into the trailing action container anchor.
 * When a submit button is present, it is inserted before the direct child containing the submit button.
 * When in empty state, it is inserted before the direct child containing the first action button (e.g. mic / voice button).
 * Otherwise, it falls back to appendChild.
 */
export function appendRefineToggleToAnchor(
  anchor: Element | HTMLElement,
  ui: Element | HTMLElement,
  submitBtn?: Element | HTMLElement | null
): void {
  let targetChild: Element | null = null;

  if (submitBtn && anchor.contains(submitBtn)) {
    targetChild =
      Array.from(anchor.children).find((c) => c === submitBtn || c.contains(submitBtn)) || null;
  }

  if (!targetChild) {
    // In empty state, find the first button or button wrapper in anchor
    const btn = anchor.querySelector("button, [data-cds=\"Button\"], [role=\"button\"]");
    if (btn && anchor.contains(btn)) {
      targetChild =
        Array.from(anchor.children).find((c) => c === btn || c.contains(btn)) || null;
    }
  }

  if (targetChild && targetChild.parentElement === anchor) {
    anchor.insertBefore(ui, targetChild);
  } else {
    anchor.appendChild(ui);
  }
}
