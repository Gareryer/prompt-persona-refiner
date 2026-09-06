/**
 * Resilient DOM Landmark Selectors for Anthropic Claude SPA (claude.ai).
 * Defines prioritized arrays of fallback selectors for each functional zone.
 */
export const CLAUDE_SELECTORS = {
  input: [
    '[data-testid="chat-input"]',
    '.ProseMirror',
    'div[contenteditable="true"]',
    'textarea[placeholder*="Reply" i]',
    'textarea[placeholder*="Claude" i]',
    'textarea'
  ],
  submitButton: [
    'button[aria-label*="Send" i]',
    'button[data-testid="send-button"]',
    'button[data-testid*="send" i]',
    'button[aria-label*="Submit" i]',
    'button[aria-label*="Reply" i]'
  ],
  conversationContainer: [
    'main',
    '[data-scroll-container]',
    'div[class*="flex-1"][class*="overflow-y-auto"]'
  ],
  scrollContainer: [
    'div[class*="flex-1"][class*="overflow-y-auto"]',
    '[data-scroll-container]',
    'main'
  ],
  turnContainer: [
    '[data-testid="user-message"]',
    '.font-claude-response:not(.font-claude-response-body)',
    '.font-claude-message',
    '[data-cds="UserMessage"]'
  ],
  userMessage: [
    '[data-testid="user-message"]',
    '[data-cds="UserMessage"]',
    '.font-user-message',
    '.UserMessage'
  ],
  assistantMessage: [
    '.font-claude-response:not(.font-claude-response-body)',
    '.font-claude-message',
    '[data-is-streaming]'
  ],
  thinkingContent: [
    '.row-start-1'
  ],
  responseContent: [
    '.row-start-2',
    '.font-claude-response-body'
  ],
  toolUseButton: [
    '.row-start-1 button.group\\/row',
    'button[aria-label*="tool" i]',
    'button.group\\/row',
    'button[class*="group/row"]'
  ],
  loadingIndicator: [
    '[role="progressbar"]',
    '[aria-busy="true"]',
    '.loading-spinner',
    '[data-is-streaming="true"]',
    '.ant-spin'
  ],
  streamingIndicator: [
    '[data-is-streaming="true"]',
    '[data-is-streaming]',
    '[aria-busy="true"]'
  ],
  expandButton: [
    '.row-start-1 button[aria-expanded="false"]',
    '.row-start-1 button',
    'button[aria-label*="thought" i]',
    'button[aria-label*="thinking" i]',
    'button[aria-label*="reasoning" i]'
  ],
  sidebarItem: [
    '[data-testid="conversation-list-item"]',
    'a[href*="/chat/"]'
  ],
  artifactCard: [
    '.font-ui.rounded-2xl.rounded-t-3xl',
    '[class*="rounded-2xl"][class*="rounded-t-3xl"]',
    '.font-ui[class*="rounded-2xl"]',
    '[data-testid*="artifact"]'
  ],
  image: [
    'img'
  ]
} as const;

export type ClaudeSelectorKey = keyof typeof CLAUDE_SELECTORS;

/**
 * Multi-strategy DOM element resolver supporting selector arrays or a single selector.
 */
export function findElement<T extends Element = HTMLElement>(
  selectors: string[] | readonly string[] | string,
  root?: ParentNode | Element | null
): T | null {
  const container = root || (typeof document !== 'undefined' ? document : null);
  if (!container || typeof container.querySelector !== 'function') return null;
  const list: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
  for (const selector of list) {
    try {
      const el = container.querySelector(selector);
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
  selectors: string[] | readonly string[] | string,
  root?: ParentNode | Element | null
): T[] {
  const container = root || (typeof document !== 'undefined' ? document : null);
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  const list: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
  for (const selector of list) {
    try {
      const els = Array.from(container.querySelectorAll(selector));
      if (els.length > 0) return els as T[];
    } catch {
      // Continue to next fallback selector
    }
  }
  return [];
}

/**
 * Convenience helper to locate an element using a known CLAUDE_SELECTORS category key.
 */
export function findClaudeElement<T extends Element = HTMLElement>(
  key: ClaudeSelectorKey,
  root?: ParentNode | Element | null
): T | null {
  return findElement<T>(CLAUDE_SELECTORS[key], root);
}

/**
 * Convenience helper to query elements using a known CLAUDE_SELECTORS category key.
 */
export function findClaudeElements<T extends Element = HTMLElement>(
  key: ClaudeSelectorKey,
  root?: ParentNode | Element | null
): T[] {
  return findElements<T>(CLAUDE_SELECTORS[key], root);
}

/**
 * Queries all elements matching any selector in a selector list, combining and deduplicating them.
 * Unlike findElements which stops at the first matching selector, queryAllMatching unions matches
 * across all fallback selectors so mixed-turn conversations are fully captured.
 */
export function queryAllMatching<T extends Element = HTMLElement>(
  selectors: string[] | readonly string[] | string,
  root?: ParentNode | Element | null
): T[] {
  const container = root || (typeof document !== 'undefined' ? document : null);
  if (!container || typeof container.querySelectorAll !== 'function') return [];
  const list: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
  const matched = new Set<T>();

  // 1. Fast path: try comma-separated query selector
  try {
    const all = container.querySelectorAll<T>(list.join(', '));
    all.forEach(el => matched.add(el));
    if (matched.size > 0) return Array.from(matched);
  } catch {
    // Continue to individual queries if compound selector errors
  }

  // 2. Individual query fallback
  for (const selector of list) {
    try {
      const els = container.querySelectorAll<T>(selector);
      els.forEach(el => matched.add(el));
    } catch {
      // Continue to next selector
    }
  }

  return Array.from(matched);
}
