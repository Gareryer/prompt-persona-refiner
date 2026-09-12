/**
 * Claude Composer DOM utilities:
 * - Active composer input pill resolution with strict disclaimer chin exclusion
 * - Trailing actions container resolution (submit button when typing, mic/audio when empty)
 * - Refine toggle UI anchor insertion
 */

export const CLAUDE_CHIN_SELECTORS =
  '[data-disclaimer="true"], [data-testid="model-selector-dropdown"], .group\\/chin-trail, a[href*="support.anthropic.com"]';

export const CLAUDE_MIC_SELECTORS =
  'button[aria-label*="voice" i], button[aria-label*="audio" i], button[aria-label*="record" i], button[aria-label*="dictat" i], button[aria-label*="speech" i], button[aria-label*="mic" i]';

/**
 * Resolves active Claude ProseMirror input pill container, strictly EXCLUDING the disclaimer chin.
 */
export function getActiveComposerContainer(
  activeInput?: HTMLElement | null
): HTMLElement | null {
  const input =
    activeInput ||
    (typeof document !== "undefined"
      ? document.querySelector<HTMLElement>(".ProseMirror")
      : null);
  if (!input || input.offsetParent === null) return null;

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
  if (submitBtn && submitBtn.parentElement) {
    return submitBtn.parentElement;
  }

  const inputContainer = activeContainer || getActiveComposerContainer();
  if (inputContainer) {
    // 2. Mic / voice / audio / dictation button parent (when composer is empty)
    const micOrVoiceBtn = inputContainer.querySelector<HTMLElement>(CLAUDE_MIC_SELECTORS);
    if (micOrVoiceBtn && micOrVoiceBtn.parentElement) {
      return micOrVoiceBtn.parentElement;
    }

    // 3. Trailing button container excluding the leading upload/add button ("+")
    const allButtons = Array.from(inputContainer.querySelectorAll<HTMLElement>("button"));
    const trailingButtons = allButtons.filter((btn) => {
      const label = (btn.getAttribute("aria-label") || "").toLowerCase();
      return (
        !label.includes("add") &&
        !label.includes("attach") &&
        !label.includes("upload") &&
        !label.includes("plus")
      );
    });
    if (trailingButtons.length > 0) {
      const lastBtn = trailingButtons[trailingButtons.length - 1];
      if (lastBtn?.parentElement) return lastBtn.parentElement;
    }

    // 4. Flex container fallbacks
    const trailing =
      inputContainer.querySelector<HTMLElement>("div.flex.items-center.gap-2") ||
      inputContainer.querySelector<HTMLElement>("div.flex.items-center.gap-1") ||
      inputContainer.querySelector<HTMLElement>("div.flex.items-center.justify-between") ||
      inputContainer.querySelector<HTMLElement>("div.flex.items-center");
    if (trailing) return trailing;
  }

  return null;
}

/**
 * Inserts the RefineToggle UI into the trailing action container anchor.
 * When a submit button is present, it is inserted before the submit button.
 * When in empty state, it is inserted before the first button (e.g. mic / voice button).
 * Otherwise, it falls back to appendChild.
 */
export function appendRefineToggleToAnchor(
  anchor: Element | HTMLElement,
  ui: Element | HTMLElement,
  submitBtn?: Element | HTMLElement | null
): void {
  if (submitBtn && submitBtn.parentElement === anchor) {
    anchor.insertBefore(ui, submitBtn);
  } else {
    // When empty, insert before the first button in anchor (e.g. mic / voice input button)
    const firstBtn = anchor.querySelector("button");
    if (firstBtn && firstBtn.parentElement === anchor) {
      anchor.insertBefore(ui, firstBtn);
    } else {
      anchor.appendChild(ui);
    }
  }
}
