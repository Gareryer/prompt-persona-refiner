/**
 * Resilient DOM Landmark Selectors for Google Gemini SPA.
 * Defines prioritized arrays of fallback selectors for each functional zone.
 */
export const GEMINI_SELECTORS = {
  input: [
    'rich-textarea .ql-editor[role="textbox"]',
    'rich-textarea .ql-editor',
    'textarea[aria-label*="prompt" i]',
    '[contenteditable="true"]'
  ],
  submitButton: [
    'button.send-button',
    'button[aria-label*="Send" i]',
    '.input-buttons-wrapper-bottom button:last-child'
  ],
  modeSwitcher: [
    'bard-mode-switcher',
    '.model-picker-container',
    '.input-area-v2 .trailing-actions-wrapper'
  ],
  trailingActions: [
    '.trailing-actions-wrapper',
    '.input-area-v2 .buttons-container'
  ],
  textInputField: [
    '.text-input-field',
    '.input-area-v2 .input-box'
  ],
  inputArea: [
    '.input-area',
    'input-area-v2',
    '.text-input-field'
  ],
  responseContainer: [
    'model-response',
    '.model-response-text',
    '[data-role="model"]'
  ],
  userQuery: [
    'user-query',
    '.query-text',
    '[data-role="user"]'
  ]
} as const;

export type GeminiSelectorKey = keyof typeof GEMINI_SELECTORS;

/**
 * Multi-strategy DOM element resolver supporting selector arrays or a single selector.
 */
export function findElement<T extends Element = HTMLElement>(
  selectors: string[] | readonly string[] | string
): T | null {
  if (typeof document === 'undefined') return null;
  const list: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
  for (const selector of list) {
    try {
      const el = document.querySelector(selector);
      if (el) return el as T;
    } catch {
      // Continue to next fallback selector
    }
  }
  return null;
}

/**
 * Convenience helper to locate an element using a known GEMINI_SELECTORS category key.
 */
export function findGeminiElement<T extends Element = HTMLElement>(
  key: GeminiSelectorKey
): T | null {
  return findElement<T>(GEMINI_SELECTORS[key]);
}
