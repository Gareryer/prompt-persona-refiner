/**
 * Scroller detector and ancestor resolution utilities for chat web apps.
 * Clean-room TypeScript port of Clio's isRealScroller and findScrollContainer algorithms.
 */

export interface FindScrollContainerOptions {
  /**
   * Candidate CSS selectors to test in priority order.
   */
  selectors?: string[] | readonly string[];
  /**
   * Optional conversation container or anchor element to search within or walk ancestors from.
   */
  conversationContainer?: Element | HTMLElement | null;
  /**
   * Optional root document or parent node to query within. Defaults to global document.
   */
  root?: ParentNode | Document | null;
  /**
   * Whether to require `isRealScroller(el)` to return true for candidate selectors.
   * If false, returns the first selector match directly.
   * Defaults to true.
   */
  validateRealScroller?: boolean;
}

/**
 * Default selectors for common chatbot scroll containers.
 */
export const DEFAULT_SCROLL_CONTAINER_SELECTORS: readonly string[] = [
  '#chat-history',
  '.chat-history-scroll-container',
  '[data-scroll-container]',
  'div[class*="scroll-root"]',
  'main [class*="overflow-y-auto"]',
  '[class*="flex-1"][class*="overflow-y-auto"]',
  'div[class*="overflow-y-auto"]',
  'div[class*="overflow-y-scroll"]',
  'infinite-scroller',
  'main'
];

/**
 * Critical algorithm: verifies computed `overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay'`
 * AND `scrollHeight > clientHeight`. Prevents selecting tall containers with `overflow: visible`
 * (e.g. ChatGPT `<main>`).
 *
 * If `allowDocumentRoot` is true and `el` is the document root or body, allows scrolling if
 * `scrollHeight > clientHeight` unless explicitly hidden via `overflowY === 'hidden'`.
 */
export function isRealScroller(
  el: Element | HTMLElement | null | undefined,
  allowDocumentRoot = false
): boolean {
  if (!el || typeof el !== 'object') return false;
  const target = el as HTMLElement;

  let overflowY = '';
  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    try {
      const style = window.getComputedStyle(target);
      overflowY =
        style?.overflowY ||
        style?.getPropertyValue?.('overflow-y') ||
        style?.overflow ||
        style?.getPropertyValue?.('overflow') ||
        '';
    } catch {
      overflowY = target.style?.overflowY || target.style?.overflow || '';
    }
  }
  if (!overflowY && target.style) {
    overflowY = target.style.overflowY || target.style.overflow || '';
  }

  const scrollHeight = Number(target.scrollHeight) || 0;
  const clientHeight = Number(target.clientHeight) || 0;
  const hasScrollableHeight = scrollHeight > clientHeight;

  if (allowDocumentRoot && typeof document !== 'undefined') {
    const isDocRoot =
      target === document.documentElement ||
      target === document.body ||
      target === (document as any).scrollingElement;
    if (isDocRoot && hasScrollableHeight && overflowY !== 'hidden') {
      return true;
    }
  }

  const isScrollableOverflow =
    overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
  if (!isScrollableOverflow) {
    return false;
  }

  return hasScrollableHeight;
}

/**
 * Locates the actual scrolling container element for a conversation.
 * Tests selector list in order, walks up ancestor tree from conversation container,
 * searches descendants, and falls back to documentElement / body.
 */
export function findScrollContainer(
  optionsOrSelectors?: FindScrollContainerOptions | string[] | readonly string[]
): HTMLElement | null {
  const options: FindScrollContainerOptions =
    Array.isArray(optionsOrSelectors)
      ? { selectors: optionsOrSelectors }
      : (optionsOrSelectors as FindScrollContainerOptions) || {};

  const doc = (options.root || (typeof document !== 'undefined' ? document : null)) as Document | ParentNode | null;
  if (!doc) return null;

  const validate = options.validateRealScroller !== false;
  const selectors = options.selectors && options.selectors.length > 0
    ? options.selectors
    : DEFAULT_SCROLL_CONTAINER_SELECTORS;

  let firstMatch: HTMLElement | null = null;

  // Step 1: Test selector list in order
  for (const selector of selectors) {
    try {
      const elements = Array.from(doc.querySelectorAll(selector)) as HTMLElement[];
      for (const el of elements) {
        if (!firstMatch) {
          firstMatch = el;
        }
        if (!validate) {
          return el;
        }
        if (isRealScroller(el)) {
          return el;
        }
      }
    } catch {
      // Ignore invalid selector syntax
    }
  }

  // Step 2: Check conversationContainer itself if provided
  if (options.conversationContainer && isRealScroller(options.conversationContainer)) {
    return options.conversationContainer as HTMLElement;
  }

  // Step 3: Walk up ancestor tree from conversationContainer (or firstMatch anchor), piercing Shadow DOM boundaries
  const anchor = (options.conversationContainer as HTMLElement | null) || firstMatch;
  if (anchor) {
    const body = typeof document !== 'undefined' ? document.body : null;
    const docEl = typeof document !== 'undefined' ? (document as any).documentElement : null;
    let curr: Node | null =
      anchor.parentElement ||
      anchor.parentNode ||
      ((anchor as any).host as Node | null);

    while (curr) {
      if (curr.nodeType === 1) {
        if (curr === body || curr === docEl) {
          break;
        }
        if (isRealScroller(curr as Element)) {
          return curr as HTMLElement;
        }
      }
      // Climb up parent or pierce ShadowRoot boundary via host
      const nextParent: Node | null =
        (curr as Element).parentElement ||
        curr.parentNode ||
        ((curr as any).host as Node | null);
      curr = nextParent;
    }
  }

  // Step 4: Search descendants of conversation container (targeted container tags rather than all nodes)
  if (options.conversationContainer) {
    try {
      const descendants = Array.from(
        options.conversationContainer.querySelectorAll(
          'div, section, main, [class*="scroll"], [class*="overflow"]'
        )
      ) as HTMLElement[];
      for (const desc of descendants) {
        if (isRealScroller(desc)) {
          return desc;
        }
      }
    } catch {
      // Ignore query errors
    }
  }

  // Step 5: Check document-level scrolling candidates (scrollingElement, documentElement, body)
  const scrollingElement = (doc as any).scrollingElement as HTMLElement | undefined;
  const documentElement = (doc as any).documentElement as HTMLElement | undefined;
  const bodyElement = (doc as any).body as HTMLElement | undefined;

  const docCandidates = [scrollingElement, documentElement, bodyElement].filter(
    (el): el is HTMLElement => Boolean(el)
  );

  for (const candidate of docCandidates) {
    if (isRealScroller(candidate, true /* allowDocumentRoot */)) {
      return candidate;
    }
  }

  // Step 6: Fallback for pre-layout / mock environments where no element has computed layout dimensions
  if (firstMatch) {
    return firstMatch;
  }

  return docCandidates[0] || null;
}
