/**
 * Automated upward scroller and content expansion engine for conversation history harvesting.
 * Clean-room TypeScript port of Clio's SCROLL_CONFIG, scrollToLoadAllMessages,
 * waitForLoadingComplete, and expandAllContent.
 */

import { findScrollContainer } from './scroller-detector';
import { VirtualMessageCache } from './virtual-cache';
import type { IHarvesterAdapter } from '../../../adapters/chatbots/types';

export interface ScrollConfig {
  /** Distance in pixels to decrement scrollTop per step (default: 5000) */
  scrollStep: number;
  /** Delay in milliseconds between scroll steps (default: 500) */
  scrollDelay: number;
  /** Maximum number of scroll loop iterations before halting (default: 500) */
  maxScrollAttempts: number;
  /** Milliseconds to wait without DOM mutations before concluding top reached (default: 2000) */
  mutationTimeout: number;
  /** Polling interval in ms to check loading spinner disappearance (default: 100) */
  loadingCheckInterval: number;
  /** Maximum milliseconds to wait for loading spinner to disappear (default: 15000) */
  maxLoadingWait: number;
  /** Number of consecutive idle checks at top before finishing (default: 3) */
  idleThreshold: number;
}

export const DEFAULT_SCROLL_CONFIG: Readonly<ScrollConfig> = Object.freeze({
  scrollStep: 5000,
  scrollDelay: 500,
  maxScrollAttempts: 500,
  mutationTimeout: 2000,
  loadingCheckInterval: 100,
  maxLoadingWait: 15000,
  idleThreshold: 3
});

let activeScrollConfig: ScrollConfig = { ...DEFAULT_SCROLL_CONFIG };

/**
 * Returns a copy of the current global scroll configuration.
 */
export function getScrollConfig(): ScrollConfig {
  return { ...activeScrollConfig };
}

/**
 * Overrides global scroll parameters.
 */
export function setScrollConfig(overrides: Partial<ScrollConfig>): void {
  activeScrollConfig = {
    ...activeScrollConfig,
    ...overrides
  };
}

/**
 * Resets global scroll configuration back to defaults.
 */
export function resetScrollConfig(): void {
  activeScrollConfig = { ...DEFAULT_SCROLL_CONFIG };
}

/**
 * Asynchronous timer helper.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifies whether an element is currently visible and actively rendered in the viewport/DOM.
 */
export function isElementVisible(el: Element | null | undefined): boolean {
  if (!el || typeof el !== 'object') return false;
  const target = el as HTMLElement;

  if (target.hidden || el.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    try {
      const style = window.getComputedStyle(target);
      if (
        style?.display === 'none' ||
        style?.visibility === 'hidden' ||
        style?.opacity === '0'
      ) {
        return false;
      }
    } catch {
      // Fall through to inline style inspection
    }
  }

  if (target.style) {
    if (
      target.style.display === 'none' ||
      target.style.visibility === 'hidden' ||
      target.style.opacity === '0'
    ) {
      return false;
    }
  }

  return true;
}

export interface WaitForLoadingOptions {
  /** CSS selector targeting loading spinners / progress indicators */
  selector?: string | null;
  /** Polling check interval in milliseconds */
  checkInterval?: number;
  /** Maximum milliseconds to wait before timing out */
  maxTimeout?: number;
  /** Parent node or document context to query within */
  root?: ParentNode | Document | null;
  /** Optional cancellation signal */
  signal?: AbortSignal;
}

/**
 * Polls for loading indicator disappearance with configurable check interval and max timeout.
 * Returns true if loading finished, false if timed out or aborted.
 * Safely ignores dormant or hidden spinner elements (`display: none`, `hidden`, `aria-hidden="true"`).
 */
export async function waitForLoadingComplete(
  optionsOrSelector?: WaitForLoadingOptions | string | null,
  maxTimeoutArg?: number
): Promise<boolean> {
  const options: WaitForLoadingOptions =
    typeof optionsOrSelector === 'string' || optionsOrSelector === null || optionsOrSelector === undefined
      ? { selector: optionsOrSelector, maxTimeout: maxTimeoutArg }
      : optionsOrSelector;

  const selector = options.selector?.trim();
  if (!selector) return true;

  const currentConfig = getScrollConfig();
  const checkInterval = options.checkInterval ?? currentConfig.loadingCheckInterval;
  const timeout = options.maxTimeout ?? currentConfig.maxLoadingWait;
  const root = options.root || (typeof document !== 'undefined' ? document : null);
  const signal = options.signal;

  if (!root) return true;

  const startTime = Date.now();

  while (true) {
    if (signal?.aborted) return false;

    let hasActiveSpinner = false;
    try {
      const spinners = Array.from(root.querySelectorAll(selector));
      hasActiveSpinner = spinners.some((s) => isElementVisible(s));
    } catch {
      // In case of selector error, do not stall
      return true;
    }

    // If no active visible spinner element is present, loading has finished
    if (!hasActiveSpinner) {
      return true;
    }

    if (Date.now() - startTime >= timeout) {
      return false; // Timed out waiting for spinner
    }

    if (checkInterval > 0) {
      await sleep(checkInterval);
    }
    await sleep(0); // Yield to browser event loop
  }
}

export const DEFAULT_EXPAND_BUTTON_SELECTORS: readonly string[] = [
  '[data-test-id="model-thoughts"] button',
  'model-thoughts button',
  'button[aria-label*="thinking" i]',
  'button[aria-label*="thought" i]',
  'button[aria-label*="draft" i]',
  'button[aria-label*="Show more" i]',
  'button[aria-expanded="false"]',
  '.row-start-1 button[aria-expanded="false"]'
];

export interface ExpandAllContentOptions {
  /** Root parent element or document context to search within */
  root?: ParentNode | Element | null;
  /** Button selectors to trigger */
  selectors?: string[] | readonly string[];
  /** Milliseconds delay between consecutive button clicks (default: 100) */
  clickDelay?: number;
  /** Optional cancellation signal */
  signal?: AbortSignal;
  /** Progress callback */
  onProgress?: (expandedCount: number, total: number) => void;
}

/**
 * Finds and programmatically clicks collapsed buttons, show-more toggles,
 * and model reasoning / thinking blocks. Skips already expanded buttons.
 * Returns the total number of buttons successfully triggered.
 */
/**
 * Finds and programmatically clicks collapsed buttons, show-more toggles,
 * and model reasoning / thinking blocks. Skips already expanded buttons.
 * Returns the total number of buttons successfully triggered.
 */
export async function expandAllContent(
  optionsOrRoot?: ParentNode | Element | null | ExpandAllContentOptions | string[] | readonly string[],
  selectorsArg?: string[] | readonly string[]
): Promise<number> {
  let root: ParentNode | null = null;
  let selectors: readonly string[] = DEFAULT_EXPAND_BUTTON_SELECTORS;
  let clickDelay = 100;
  let signal: AbortSignal | undefined;
  let onProgress: ((expandedCount: number, total: number) => void) | undefined;

  if (Array.isArray(optionsOrRoot)) {
    selectors = optionsOrRoot;
  } else if (
    optionsOrRoot &&
    (typeof (optionsOrRoot as any).querySelectorAll === 'function' ||
      (optionsOrRoot as any).nodeType !== undefined)
  ) {
    root = optionsOrRoot as ParentNode;
    if (selectorsArg && selectorsArg.length > 0) {
      selectors = selectorsArg;
    }
  } else if (optionsOrRoot && typeof optionsOrRoot === 'object') {
    const opts = optionsOrRoot as ExpandAllContentOptions;
    root = opts.root ?? null;
    if (opts.selectors && opts.selectors.length > 0) {
      selectors = opts.selectors;
    } else if (selectorsArg && selectorsArg.length > 0) {
      selectors = selectorsArg;
    }
    if (opts.clickDelay !== undefined) clickDelay = opts.clickDelay;
    signal = opts.signal;
    onProgress = opts.onProgress;
  } else if (selectorsArg && selectorsArg.length > 0) {
    selectors = selectorsArg;
  }

  if (!root && typeof document !== 'undefined') {
    root = document;
  }
  if (!root) return 0;

  // Query candidate buttons across all specified selectors
  const candidates: HTMLElement[] = [];
  for (const selector of selectors) {
    try {
      const matches = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
      for (const btn of matches) {
        if (!candidates.includes(btn)) {
          candidates.push(btn);
        }
      }
    } catch {
      // Ignore invalid selectors
    }
  }

  let expandedCount = 0;
  for (const btn of candidates) {
    if (signal?.aborted) break;

    // Skip buttons that are already explicitly expanded
    const ariaExpanded = btn.getAttribute('aria-expanded');
    if (ariaExpanded === 'true') {
      continue;
    }
    if (btn.getAttribute('aria-pressed') === 'true') {
      continue;
    }
    if (
      btn.classList &&
      (btn.classList.contains('expanded') || btn.classList.contains('is-expanded'))
    ) {
      continue;
    }

    // Check if button text or aria-label indicates an already expanded state (e.g. "Hide thoughts", "Collapse")
    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase().trim();
    const btnText = (btn.textContent || '').toLowerCase().trim();
    if (
      ariaLabel.includes('collapse') ||
      ariaLabel.includes('hide ') ||
      ariaLabel === 'hide' ||
      btnText.startsWith('collapse') ||
      btnText.startsWith('hide')
    ) {
      continue;
    }

    try {
      if (typeof btn.click === 'function') {
        btn.click();
        expandedCount++;
        onProgress?.(expandedCount, candidates.length);
      }
    } catch {
      // Fail-open: single button error does not interrupt overall expansion
    }

    if (clickDelay > 0) {
      await sleep(clickDelay);
    }
    await sleep(0); // Yield to browser event loop
  }

  return expandedCount;
}

export interface ScrollProgress {
  attempt: number;
  maxAttempts: number;
  scrollTop: number;
  scrollHeight: number;
  mutationsCount: number;
  message?: string;
}

export interface ScrollResult {
  attempts: number;
  reachedTop: boolean;
  totalDistanceScrolled: number;
  initialScrollTop: number;
  finalScrollTop: number;
  mutationsObserved: number;
  durationMs: number;
  aborted?: boolean;
}

export interface AutoScrollOptions {
  /** Target scrollable container element (defaults to findScrollContainer()) */
  container?: HTMLElement | null;
  /** Optional config overrides */
  config?: Partial<ScrollConfig>;
  /** Optional selector for spinner/loading element to poll before next step */
  loadingSelector?: string | null;
  /** Progress reporter callback */
  onProgress?: (progress: ScrollProgress) => void;
  /** Optional cancellation signal */
  signal?: AbortSignal;
  /** Callback fired whenever DOM mutations occur */
  onMutation?: (mutations: MutationRecord[]) => void;
  /** Root document or parent node */
  root?: ParentNode | Document | null;
  /** Optional virtual message cache to capture messages before eviction during upward scroll */
  virtualCache?: VirtualMessageCache;
  /** Optional harvester adapter providing messageId and turnIndex resolvers */
  adapter?: IHarvesterAdapter;
}

/**
 * Manages upward scrolling step loop, dispatching synthetic scroll events,
 * monitoring DOM mutations, polling loading indicators, and yielding to the event loop.
 */
export async function scrollToLoadAllMessages(
  optionsOrContainer?: AutoScrollOptions | HTMLElement | null
): Promise<ScrollResult> {
  const options: AutoScrollOptions =
    optionsOrContainer &&
    (typeof (optionsOrContainer as any).querySelector === 'function' ||
      (optionsOrContainer as any).nodeType !== undefined)
      ? { container: optionsOrContainer as HTMLElement }
      : (optionsOrContainer as AutoScrollOptions) || {};

  const root = options.root || (typeof document !== 'undefined' ? document : null);
  const container = options.container || findScrollContainer({ root });

  // Initial capture of currently mounted messages into virtual cache if provided
  options.virtualCache?.captureFromRoot(container || root, options.adapter, container);

  const initialScrollTop = container ? Number(container.scrollTop) || 0 : 0;
  const startTime = Date.now();

  if (!container) {
    return {
      attempts: 0,
      reachedTop: true,
      totalDistanceScrolled: 0,
      initialScrollTop: 0,
      finalScrollTop: 0,
      mutationsObserved: 0,
      durationMs: 0,
      aborted: false
    };
  }

  const cfg: ScrollConfig = {
    ...getScrollConfig(),
    ...(options.config || {})
  };

  let totalDistanceScrolled = 0;
  let mutationsObserved = 0;
  let consecutiveIdleAtTop = 0;
  let idleAttemptsAtTop = 0;
  let lastMutationTime = Date.now();
  let lastKnownScrollHeight = Number(container.scrollHeight) || 0;
  let attempts = 0;
  let aborted = false;

  const safeNotifyProgress = (data: ScrollProgress) => {
    try {
      options.onProgress?.(data);
    } catch {
      // User callback error must not interrupt scrolling pipeline
    }
  };

  const safeNotifyMutation = (mutations: MutationRecord[]) => {
    try {
      options.onMutation?.(mutations);
    } catch {
      // User callback error must not interrupt scrolling pipeline
    }
  };

  const dispatchScrollEvent = (targetEl: HTMLElement) => {
    try {
      const evt =
        typeof Event !== 'undefined'
          ? new Event('scroll', { bubbles: true, cancelable: false })
          : { type: 'scroll', bubbles: true };
      targetEl.dispatchEvent(evt as Event);
    } catch {
      // Ignore event dispatch errors
    }

    if (
      typeof window !== 'undefined' &&
      typeof window.dispatchEvent === 'function' &&
      (targetEl === (document as any)?.documentElement ||
        targetEl === (document as any)?.body ||
        targetEl === (document as any)?.scrollingElement)
    ) {
      try {
        window.dispatchEvent(new Event('scroll'));
      } catch {}
    }
  };

  let observer: MutationObserver | null = null;
  if (typeof MutationObserver !== 'undefined') {
    try {
      observer = new MutationObserver((mutations) => {
        mutationsObserved += mutations.length;
        lastMutationTime = Date.now();
        if (idleAttemptsAtTop <= cfg.idleThreshold * 3) {
          consecutiveIdleAtTop = 0;
        }
        options.virtualCache?.captureFromRoot(container || root, options.adapter, container);
        safeNotifyMutation(mutations as MutationRecord[]);
      });
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: false
      });
    } catch {
      // Non-fatal if environment observer setup fails
    }
  }

  try {
    while (attempts < cfg.maxScrollAttempts) {
      if (options.signal?.aborted) {
        aborted = true;
        break;
      }

      attempts++;

      const currentScrollTop = Number(container.scrollTop) || 0;

      if (currentScrollTop <= 0) {
        idleAttemptsAtTop++;
        // Dispatch scroll event so SPA listeners know we are at the top
        dispatchScrollEvent(container);

        // At or reached top: check loading indicator and wait for potential prepended mutations
        if (options.loadingSelector) {
          await waitForLoadingComplete({
            selector: options.loadingSelector,
            checkInterval: cfg.loadingCheckInterval,
            maxTimeout: cfg.maxLoadingWait,
            root: options.root || container.ownerDocument || root,
            signal: options.signal
          });
        }

        if (cfg.scrollDelay > 0) {
          await sleep(cfg.scrollDelay);
        }
        await sleep(0); // Yield to event loop

        // Layout has settled for this round: remeasure bottom distances
        options.virtualCache?.captureFromRoot(container || root, options.adapter, container);
        options.virtualCache?.remeasureSettled(container || root, container);

        const postWaitScrollTop = Number(container.scrollTop) || 0;
        const currentScrollHeight = Number(container.scrollHeight) || 0;
        const heightGrew = currentScrollHeight > lastKnownScrollHeight;

        if (postWaitScrollTop > 0 || heightGrew) {
          // New messages were prepended, pushing scrollTop down or growing container height
          consecutiveIdleAtTop = 0;
          idleAttemptsAtTop = 0;
          lastKnownScrollHeight = currentScrollHeight;
          lastMutationTime = Date.now();
        } else {
          // No height growth and scrollTop still <= 0
          if (
            Date.now() - lastMutationTime < cfg.mutationTimeout &&
            idleAttemptsAtTop <= cfg.idleThreshold * 3
          ) {
            consecutiveIdleAtTop = 0;
          } else {
            consecutiveIdleAtTop++;
          }
        }

        safeNotifyProgress({
          attempt: attempts,
          maxAttempts: cfg.maxScrollAttempts,
          scrollTop: postWaitScrollTop,
          scrollHeight: currentScrollHeight,
          mutationsCount: mutationsObserved,
          message: `At top, idle check ${consecutiveIdleAtTop}/${cfg.idleThreshold}`
        });

        if (options.signal?.aborted) {
          aborted = true;
          break;
        }

        if (consecutiveIdleAtTop >= cfg.idleThreshold) {
          break;
        }
      } else {
        // Decrement scroll position upwards
        consecutiveIdleAtTop = 0;
        idleAttemptsAtTop = 0;
        const targetScrollTop = Math.max(0, currentScrollTop - cfg.scrollStep);
        const scrolled = currentScrollTop - targetScrollTop;
        totalDistanceScrolled += scrolled;
        container.scrollTop = targetScrollTop;

        dispatchScrollEvent(container);

        if (cfg.scrollDelay > 0) {
          await sleep(cfg.scrollDelay);
        }

        if (options.loadingSelector) {
          await waitForLoadingComplete({
            selector: options.loadingSelector,
            checkInterval: cfg.loadingCheckInterval,
            maxTimeout: cfg.maxLoadingWait,
            root: options.root || container.ownerDocument || root,
            signal: options.signal
          });
        }

        await sleep(0); // Yield to event loop

        // Layout settled: capture and remeasure
        options.virtualCache?.captureFromRoot(container || root, options.adapter, container);
        options.virtualCache?.remeasureSettled(container || root, container);

        safeNotifyProgress({
          attempt: attempts,
          maxAttempts: cfg.maxScrollAttempts,
          scrollTop: Number(container.scrollTop) || 0,
          scrollHeight: Number(container.scrollHeight) || 0,
          mutationsCount: mutationsObserved,
          message: `Scrolled up to ${container.scrollTop}`
        });

        if (options.signal?.aborted) {
          aborted = true;
          break;
        }
      }
    }
  } finally {
    observer?.disconnect();
  }

  // Final settle pass to guarantee all rendered turns have settled measurements
  options.virtualCache?.captureFromRoot(container || root, options.adapter, container);
  options.virtualCache?.remeasureSettled(container || root, container);

  const finalScrollTop = Number(container.scrollTop) || 0;
  const reachedTop = finalScrollTop <= 0 && consecutiveIdleAtTop >= cfg.idleThreshold;

  return {
    attempts,
    reachedTop,
    totalDistanceScrolled,
    initialScrollTop,
    finalScrollTop,
    mutationsObserved,
    durationMs: Date.now() - startTime,
    aborted
  };
}

/**
 * High-level facade for AutoScroller operations.
 */
export const AutoScroller = {
  run: scrollToLoadAllMessages,
  waitForLoading: waitForLoadingComplete,
  expandAll: expandAllContent,
  getConfig: getScrollConfig,
  setConfig: setScrollConfig,
  resetConfig: resetScrollConfig
};
