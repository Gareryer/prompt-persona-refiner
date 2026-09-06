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
  assistantMessage: [
    '.model-response-text',
    '[data-role="model"]',
    'model-response'
  ],
  userQuery: [
    'user-query',
    '.query-text',
    '[data-role="user"]'
  ],
  conversationContainer: [
    '.conversation-container',
    '[data-conversation-id]',
    'ms-chat-turn'
  ],
  sessionTitle: [
    '.conversation-title',
    'h1[data-conversation-title]',
    'h1'
  ],
  scrollContainer: [
    '#chat-history',
    '.chat-history-scroll-container',
    '[data-scroll-container]',
    'infinite-scroller',
    'main[class*="overflow-y-auto"]'
  ],
  thinkingContainer: [
    'model-thoughts',
    '[data-test-id="model-thoughts"]',
    '.thinking-container'
  ],
  thinkingToggle: [
    '[data-test-id="model-thoughts"] button',
    'model-thoughts button',
    'button[aria-label*="thinking" i]',
    'button[aria-label*="thought" i]'
  ],
  thinkingContent: [
    'model-thoughts .thoughts-body',
    '.thinking-content',
    '.thought-process'
  ],
  loadingIndicator: [
    'mat-progress-spinner',
    '.mdc-circular-progress',
    '[role="progressbar"]',
    '[aria-busy="true"]',
    '.loading-spinner'
  ],
  streamingIndicator: [
    'button[aria-label*="Stop" i]',
    '.streaming-indicator',
    '.generating',
    '[data-streaming="true"]'
  ],
  codeBlock: [
    'pre code',
    '.code-block code',
    'code-block'
  ],
  codeLanguage: [
    '[data-language]',
    '.code-language',
    '.language-label'
  ],
  image: [
    'img'
  ],
  sidebarItem: [
    'a[data-conversation-id]',
    'a[href*="/app/"]'
  ],
  expandButton: [
    '[data-test-id="model-thoughts"] button',
    'model-thoughts button',
    'button[aria-label*="thinking" i]',
    'button[aria-label*="thought" i]',
    'button[aria-label*="draft" i]',
    'button[aria-label*="Show more" i]'
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
 * Multi-strategy DOM element query supporting selector arrays or a single selector.
 * Returns elements matching the first selector that yields results.
 */
export function findElements<T extends Element = HTMLElement>(
  selectors: string[] | readonly string[] | string
): T[] {
  if (typeof document === 'undefined') return [];
  const list: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
  for (const selector of list) {
    try {
      const els = Array.from(document.querySelectorAll(selector));
      if (els.length > 0) return els as T[];
    } catch {
      // Continue to next fallback selector
    }
  }
  return [];
}

/**
 * Convenience helper to locate an element using a known GEMINI_SELECTORS category key.
 */
export function findGeminiElement<T extends Element = HTMLElement>(
  key: GeminiSelectorKey
): T | null {
  return findElement<T>(GEMINI_SELECTORS[key]);
}

/**
 * Convenience helper to query elements using a known GEMINI_SELECTORS category key.
 */
export function findGeminiElements<T extends Element = HTMLElement>(
  key: GeminiSelectorKey
): T[] {
  return findElements<T>(GEMINI_SELECTORS[key]);
}

