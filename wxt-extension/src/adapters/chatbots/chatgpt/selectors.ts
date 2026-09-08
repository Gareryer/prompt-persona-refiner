/**
 * Resilient DOM Landmark Selectors for OpenAI ChatGPT SPA.
 * Defines prioritized arrays of fallback selectors for each functional zone.
 */
export const CHATGPT_SELECTORS = {
  input: [
    '#prompt-textarea',
    '[data-id="root"] textarea',
    'textarea[placeholder*="Ask" i]',
    'textarea[placeholder*="Message" i]',
    'textarea',
    '[contenteditable="true"]#prompt-textarea',
    '[contenteditable="true"]'
  ],
  submitButton: [
    'button[data-testid="send-button"]',
    'button[data-testid="fruitjuice-send-button"]',
    'button[aria-label*="Send" i]',
    'button.mb-1.mr-1'
  ],
  conversationContainer: [
    'main',
    '[data-testid="conversation-turn-0"]',
    'div[class*="react-scroll-to-bottom"]'
  ],
  scrollContainer: [
    'div[class*="scroll-root"]',
    '[class*="scroll-root"]',
    'main [class*="overflow-y-auto"]',
    'main'
  ],
  turnContainer: [
    '[data-testid^="conversation-turn-"]',
    'article'
  ],
  userMessage: [
    '[data-message-author-role="user"]',
    '[data-role="user"]',
    '.user-message'
  ],
  assistantMessage: [
    '[data-message-author-role="assistant"]',
    '[data-role="assistant"]',
    '.assistant-message'
  ],
  userContent: [
    '.whitespace-pre-wrap',
    '[data-message-author-role="user"]'
  ],
  assistantContent: [
    '.markdown',
    '[data-message-author-role="assistant"]'
  ],
  reasoningHeader: [
    '.flex.items-start.gap-3.pb-2',
    '[class*="items-start"][class*="gap-3"][class*="pb-2"]',
    'button[aria-label*="Thought" i]',
    'button[aria-label*="Reasoned" i]',
    '.result-thinking'
  ],
  modelSlug: [
    '[data-message-model-slug]',
    '[data-model-slug]'
  ],
  codeBlock: [
    'pre code',
    'pre .cm-content',
    'pre',
    '.cm-content'
  ],
  loadingIndicator: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
    '.result-thinking',
    '[aria-label*="Loading" i]',
    '.dot-pulse'
  ],
  streamingIndicator: [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop" i]',
    '.result-thinking'
  ],
  sidebarItem: [
    'nav a[href*="/c/"]',
    'a[href*="/c/"]'
  ],
  image: [
    'img'
  ],
  expandButton: [
    '.flex.items-start.gap-3.pb-2 button',
    'button[aria-label*="thought" i]',
    'button[aria-label*="reason" i]',
    'button[aria-expanded="false"]'
  ],
  citationDecoration: [
    '[aria-label="Sources"]',
    '[class*="footnote"]',
    '[data-testid*="citation"]'
  ],
  uploadedFileCard: [
    '[data-testid="library-file-icon"]'
  ],
  downloadAffordance: [
    'button',
    'a',
    '[role="menuitem"]'
  ]
} as const;

export const CHATGPT_ORDERS_FROM_CAPTURE = true;

export type ChatGPTSelectorKey = keyof typeof CHATGPT_SELECTORS;

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
 * Convenience helper to locate an element using a known CHATGPT_SELECTORS category key.
 */
export function findChatGPTElement<T extends Element = HTMLElement>(
  key: ChatGPTSelectorKey
): T | null {
  return findElement<T>(CHATGPT_SELECTORS[key]);
}

/**
 * Convenience helper to query elements using a known CHATGPT_SELECTORS category key.
 */
export function findChatGPTElements<T extends Element = HTMLElement>(
  key: ChatGPTSelectorKey
): T[] {
  return findElements<T>(CHATGPT_SELECTORS[key]);
}
