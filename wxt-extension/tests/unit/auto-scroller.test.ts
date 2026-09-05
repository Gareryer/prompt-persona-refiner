import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom, MockMutationObserver, MockElement } from '../fixtures/mock-dom';
import {
  isRealScroller,
  findScrollContainer,
  DEFAULT_SCROLL_CONTAINER_SELECTORS,
  DEFAULT_SCROLL_CONFIG,
  getScrollConfig,
  setScrollConfig,
  resetScrollConfig,
  waitForLoadingComplete,
  isElementVisible,
  expandAllContent,
  scrollToLoadAllMessages,
  AutoScroller,
  sleep
} from '@/core/harvest';
import { GeminiAdapter } from '@/adapters/chatbots/gemini/adapter';
import { GEMINI_SELECTORS } from '@/adapters/chatbots/gemini/selectors';

setupMockDom();

function setMetrics(
  el: Element,
  metrics: {
    scrollHeight?: number;
    clientHeight?: number;
    scrollTop?: number;
    overflowY?: string;
    overflow?: string;
  }
) {
  const m = el as unknown as MockElement;
  if (metrics.scrollHeight !== undefined) m.scrollHeight = metrics.scrollHeight;
  if (metrics.clientHeight !== undefined) m.clientHeight = metrics.clientHeight;
  if (metrics.scrollTop !== undefined) m.scrollTop = metrics.scrollTop;
  if (metrics.overflowY !== undefined) {
    m.style = m.style || {};
    m.style.overflowY = metrics.overflowY;
  }
  if (metrics.overflow !== undefined) {
    m.style = m.style || {};
    m.style.overflow = metrics.overflow;
  }
}

describe('Phase 3: Auto-Scroller & Upward History Loading Subsystem', () => {
  beforeEach(() => {
    setupMockDom();
    resetScrollConfig();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    resetScrollConfig();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. isRealScroller Detection Algorithm
  // =========================================================================
  describe('1. isRealScroller Algorithm', () => {
    it('returns false for null, undefined, and non-element inputs', () => {
      expect(isRealScroller(null)).toBe(false);
      expect(isRealScroller(undefined)).toBe(false);
      expect(isRealScroller({} as any)).toBe(false);
      expect(isRealScroller('string' as any)).toBe(false);
      expect(isRealScroller(123 as any)).toBe(false);
    });

    it('returns false when computed overflowY is visible, hidden, or clip even if scrollHeight > clientHeight', () => {
      const el = document.createElement('div');
      setMetrics(el, { scrollHeight: 2500, clientHeight: 500, overflowY: 'visible' });
      expect(isRealScroller(el)).toBe(false);

      setMetrics(el, { overflowY: 'hidden' });
      expect(isRealScroller(el)).toBe(false);

      setMetrics(el, { overflowY: 'clip' });
      expect(isRealScroller(el)).toBe(false);

      setMetrics(el, { overflowY: 'initial' });
      expect(isRealScroller(el)).toBe(false);
    });

    it('returns false when overflowY is auto or scroll but scrollHeight <= clientHeight', () => {
      const el = document.createElement('div');
      setMetrics(el, { overflowY: 'auto', scrollHeight: 600, clientHeight: 600 });
      expect(isRealScroller(el)).toBe(false);

      // Smaller scrollHeight: not scrollable
      setMetrics(el, { overflowY: 'scroll', scrollHeight: 400, clientHeight: 600 });
      expect(isRealScroller(el)).toBe(false);

      // Zero height
      setMetrics(el, { scrollHeight: 0, clientHeight: 0 });
      expect(isRealScroller(el)).toBe(false);
    });

    it('returns true when overflowY is auto or scroll AND scrollHeight > clientHeight', () => {
      const autoEl = document.createElement('div');
      setMetrics(autoEl, { overflowY: 'auto', scrollHeight: 1800, clientHeight: 600 });
      expect(isRealScroller(autoEl)).toBe(true);

      const scrollEl = document.createElement('div');
      setMetrics(scrollEl, { overflowY: 'scroll', scrollHeight: 2000, clientHeight: 800 });
      expect(isRealScroller(scrollEl)).toBe(true);
    });

    it('falls back to overflow property if overflowY is not set', () => {
      const el = document.createElement('div');
      setMetrics(el, { overflow: 'auto', scrollHeight: 1500, clientHeight: 500 });
      expect(isRealScroller(el)).toBe(true);

      const hiddenEl = document.createElement('div');
      setMetrics(hiddenEl, { overflow: 'hidden', scrollHeight: 1500, clientHeight: 500 });
      expect(isRealScroller(hiddenEl)).toBe(false);
    });

    it('handles fallback to inline style when getComputedStyle throws', () => {
      const el = document.createElement('div');
      setMetrics(el, { overflowY: 'auto', scrollHeight: 1200, clientHeight: 400 });

      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn().mockImplementation(() => {
        throw new Error('Failed to get computed style');
      });

      try {
        expect(isRealScroller(el)).toBe(true);
      } finally {
        window.getComputedStyle = originalGetComputedStyle;
      }
    });
  });

  // =========================================================================
  // 2. findScrollContainer Resolution Strategies
  // =========================================================================
  describe('2. findScrollContainer Resolution Strategies', () => {
    it('selects the first selector match that is a real scroller', () => {
      // First candidate is not scrollable (tall but overflow: visible)
      const fakeScroller = document.createElement('div');
      fakeScroller.id = 'chat-history';
      setMetrics(fakeScroller, { overflowY: 'visible', scrollHeight: 3000, clientHeight: 500 });
      document.body.appendChild(fakeScroller);

      // Second candidate is a real scroller
      const realScroller = document.createElement('div');
      realScroller.className = 'chat-history-scroll-container';
      setMetrics(realScroller, { overflowY: 'auto', scrollHeight: 3000, clientHeight: 500 });
      document.body.appendChild(realScroller);

      const found = findScrollContainer({
        selectors: ['#chat-history', '.chat-history-scroll-container']
      });
      expect(found).toBe(realScroller);
    });

    it('accepts array of string selectors directly as first argument', () => {
      const scroller = document.createElement('div');
      scroller.id = 'direct-scroller';
      setMetrics(scroller, { overflowY: 'scroll', scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      const found = findScrollContainer(['#direct-scroller']);
      expect(found).toBe(scroller);
    });

    it('walks up ancestor tree from conversation container (ChatGPT pattern)', () => {
      // Outer scroll root: overflow-y: auto, scrollHeight > clientHeight
      const scrollRoot = document.createElement('div');
      scrollRoot.className = 'group scroll-root';
      setMetrics(scrollRoot, { overflowY: 'auto', scrollHeight: 5000, clientHeight: 800 });
      document.body.appendChild(scrollRoot);

      // Intermediate <main> tag: overflow: visible
      const main = document.createElement('main');
      setMetrics(main, { overflowY: 'visible', scrollHeight: 5000, clientHeight: 800 });
      scrollRoot.appendChild(main);

      // Conversation container inside <main>
      const convContainer = document.createElement('div');
      convContainer.className = 'conversation-container';
      main.appendChild(convContainer);

      // findScrollContainer should climb ancestors of conversationContainer to locate scrollRoot
      const found = findScrollContainer({
        selectors: ['main'], // main matches first, but is not a real scroller
        conversationContainer: convContainer
      });

      expect(found).toBe(scrollRoot);
    });

    it('searches descendants if conversation container contains an internal scroller', () => {
      const convContainer = document.createElement('div');
      convContainer.className = 'outer-container';
      setMetrics(convContainer, { overflowY: 'visible' });
      document.body.appendChild(convContainer);

      const internalList = document.createElement('div');
      internalList.className = 'internal-scroll-list';
      setMetrics(internalList, { overflowY: 'scroll', scrollHeight: 4000, clientHeight: 600 });
      convContainer.appendChild(internalList);

      const found = findScrollContainer({
        selectors: ['.unmatched-selector'],
        conversationContainer: convContainer
      });

      expect(found).toBe(internalList);
    });

    it('returns first selector match if no element has layout metrics (pre-layout / mock env)', () => {
      const plainDiv = document.createElement('div');
      plainDiv.id = 'chat-history';
      document.body.appendChild(plainDiv);

      const found = findScrollContainer({
        selectors: ['#chat-history']
      });

      expect(found).toBe(plainDiv);
    });

    it('respects validateRealScroller: false and returns first match immediately', () => {
      const unscrollable = document.createElement('div');
      unscrollable.className = 'unscrollable';
      setMetrics(unscrollable, { overflowY: 'visible', scrollHeight: 500, clientHeight: 500 });
      document.body.appendChild(unscrollable);

      const found = findScrollContainer({
        selectors: ['.unscrollable'],
        validateRealScroller: false
      });

      expect(found).toBe(unscrollable);
    });

    it('falls back to documentElement or body when no selectors match', () => {
      const found = findScrollContainer({
        selectors: ['#non-existent-selector']
      });

      expect(found).not.toBeNull();
      expect(found === document.documentElement || found === document.body).toBe(true);
    });

    it('returns null when document and root are absent', () => {
      const found = findScrollContainer({
        root: null
      });
      // In this case root is null, but global document exists; if root is set to null and document is bypassed:
      const fakeRoot: any = { querySelectorAll: () => [] };
      const res = findScrollContainer({ root: fakeRoot, selectors: ['#none'] });
      expect(res).toBeNull();
    });
  });

  // =========================================================================
  // 3. SCROLL_CONFIG Global Settings & Mutators
  // =========================================================================
  describe('3. SCROLL_CONFIG Settings & Mutators', () => {
    it('returns default configuration values matching Clio specification', () => {
      const config = getScrollConfig();
      expect(config.scrollStep).toBe(5000);
      expect(config.scrollDelay).toBe(500);
      expect(config.maxScrollAttempts).toBe(500);
      expect(config.mutationTimeout).toBe(2000);
      expect(config.loadingCheckInterval).toBe(100);
      expect(config.maxLoadingWait).toBe(15000);
      expect(config.idleThreshold).toBe(3);
    });

    it('allows mutating configuration with setScrollConfig', () => {
      setScrollConfig({
        scrollStep: 3000,
        scrollDelay: 250
      });

      const updated = getScrollConfig();
      expect(updated.scrollStep).toBe(3000);
      expect(updated.scrollDelay).toBe(250);
      expect(updated.maxScrollAttempts).toBe(500); // Unchanged
    });

    it('resets configuration back to defaults with resetScrollConfig', () => {
      setScrollConfig({ scrollStep: 1000 });
      expect(getScrollConfig().scrollStep).toBe(1000);

      resetScrollConfig();
      expect(getScrollConfig().scrollStep).toBe(5000);
    });
  });

  // =========================================================================
  // 4. waitForLoadingComplete Loading Spinner Poller
  // =========================================================================
  describe('4. waitForLoadingComplete Loading Spinner Poller', () => {
    it('returns true immediately when selector is null, empty, or undefined', async () => {
      expect(await waitForLoadingComplete(null)).toBe(true);
      expect(await waitForLoadingComplete('')).toBe(true);
      expect(await waitForLoadingComplete(undefined)).toBe(true);
      expect(await waitForLoadingComplete({ selector: null })).toBe(true);
    });

    it('returns true immediately if spinner element is not present in DOM', async () => {
      const result = await waitForLoadingComplete('.non-existent-spinner');
      expect(result).toBe(true);
    });

    it('polls and resolves true when spinner is removed from DOM', async () => {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      document.body.appendChild(spinner);

      setTimeout(() => {
        spinner.remove();
      }, 30);

      const result = await waitForLoadingComplete({
        selector: '.loading-spinner',
        checkInterval: 10,
        maxTimeout: 500
      });

      expect(result).toBe(true);
    });

    it('returns false when loading spinner times out before removal', async () => {
      const spinner = document.createElement('div');
      spinner.className = 'stuck-spinner';
      document.body.appendChild(spinner);

      const result = await waitForLoadingComplete({
        selector: '.stuck-spinner',
        checkInterval: 10,
        maxTimeout: 40
      });

      expect(result).toBe(false);
    });

    it('returns false when cancelled via AbortSignal', async () => {
      const spinner = document.createElement('div');
      spinner.className = 'abortable-spinner';
      document.body.appendChild(spinner);

      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, 15);

      const result = await waitForLoadingComplete({
        selector: '.abortable-spinner',
        checkInterval: 10,
        maxTimeout: 1000,
        signal: controller.signal
      });

      expect(result).toBe(false);
    });

    it('tolerates invalid CSS selector strings without throwing', async () => {
      const result = await waitForLoadingComplete({
        selector: ':::bad[syntax',
        checkInterval: 10,
        maxTimeout: 100
      });
      expect(result).toBe(true);
    });
  });

  // =========================================================================
  // 5. expandAllContent Content Uncollapsing Engine
  // =========================================================================
  describe('5. expandAllContent Content Uncollapsing Engine', () => {
    it('finds and clicks buttons matching default expand selectors', async () => {
      const btn1 = document.createElement('button');
      btn1.setAttribute('aria-label', 'Show more');
      const click1 = vi.fn();
      btn1.addEventListener('click', click1);
      document.body.appendChild(btn1);

      const thoughts = document.createElement('model-thoughts');
      const btn2 = document.createElement('button');
      const click2 = vi.fn();
      btn2.addEventListener('click', click2);
      thoughts.appendChild(btn2);
      document.body.appendChild(thoughts);

      const count = await expandAllContent({ root: document.body, clickDelay: 0 });
      expect(count).toBe(2);
      expect(click1).toHaveBeenCalledTimes(1);
      expect(click2).toHaveBeenCalledTimes(1);
    });

    it('skips buttons that have aria-expanded="true"', async () => {
      const expandedBtn = document.createElement('button');
      expandedBtn.setAttribute('aria-expanded', 'true');
      expandedBtn.setAttribute('aria-label', 'thinking');
      const clickHandler = vi.fn();
      expandedBtn.addEventListener('click', clickHandler);
      document.body.appendChild(expandedBtn);

      const count = await expandAllContent({ root: document.body, clickDelay: 0 });
      expect(count).toBe(0);
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('clicks buttons that have aria-expanded="false"', async () => {
      const collapsedBtn = document.createElement('button');
      collapsedBtn.setAttribute('aria-expanded', 'false');
      const clickHandler = vi.fn();
      collapsedBtn.addEventListener('click', clickHandler);
      document.body.appendChild(collapsedBtn);

      const count = await expandAllContent({ root: document.body, clickDelay: 0 });
      expect(count).toBe(1);
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });

    it('tolerates button click errors fail-open and continues expanding remaining buttons', async () => {
      const failingBtn = document.createElement('button');
      failingBtn.setAttribute('aria-label', 'Show more');
      failingBtn.addEventListener('click', () => {
        throw new Error('Click failed');
      });
      document.body.appendChild(failingBtn);

      const goodBtn = document.createElement('button');
      goodBtn.setAttribute('aria-label', 'thinking');
      const goodClick = vi.fn();
      goodBtn.addEventListener('click', goodClick);
      document.body.appendChild(goodBtn);

      const count = await expandAllContent({ root: document.body, clickDelay: 0 });
      expect(count).toBe(1);
      expect(goodClick).toHaveBeenCalledTimes(1);
    });

    it('honors AbortSignal and halts button iteration early', async () => {
      const controller = new AbortController();
      controller.abort(); // Pre-aborted

      const btn = document.createElement('button');
      btn.setAttribute('aria-label', 'Show more');
      const clickHandler = vi.fn();
      btn.addEventListener('click', clickHandler);
      document.body.appendChild(btn);

      const count = await expandAllContent({
        root: document.body,
        clickDelay: 0,
        signal: controller.signal
      });

      expect(count).toBe(0);
      expect(clickHandler).not.toHaveBeenCalled();
    });

    it('invokes onProgress callback with progress metrics', async () => {
      const btn1 = document.createElement('button');
      btn1.setAttribute('aria-label', 'Show more');
      document.body.appendChild(btn1);

      const btn2 = document.createElement('button');
      btn2.setAttribute('aria-label', 'thinking');
      document.body.appendChild(btn2);

      const progressRecords: { current: number; total: number }[] = [];
      await expandAllContent({
        root: document.body,
        clickDelay: 0,
        onProgress: (current, total) => progressRecords.push({ current, total })
      });

      expect(progressRecords).toHaveLength(2);
      expect(progressRecords[0]).toEqual({ current: 1, total: 2 });
      expect(progressRecords[1]).toEqual({ current: 2, total: 2 });
    });
  });

  // =========================================================================
  // 6. scrollToLoadAllMessages Upward Scroller Loop
  // =========================================================================
  describe('6. scrollToLoadAllMessages Upward Scroller Loop', () => {
    it('returns immediately with 0 attempts if container is null and cannot be resolved', async () => {
      const result = await scrollToLoadAllMessages({
        container: null,
        root: { querySelectorAll: () => [] } as any
      });

      expect(result.attempts).toBe(0);
      expect(result.reachedTop).toBe(true);
      expect(result.totalDistanceScrolled).toBe(0);
    });

    it('scrolls container upward from positive scrollTop to 0 in steps', async () => {
      const scroller = document.createElement('div');
      scroller.id = 'chat-history';
      setMetrics(scroller, {
        overflowY: 'auto',
        scrollTop: 12000,
        scrollHeight: 15000,
        clientHeight: 1000
      });
      document.body.appendChild(scroller);

      const scrollEventsDispatched: number[] = [];
      scroller.addEventListener('scroll', () => {
        scrollEventsDispatched.push(scroller.scrollTop);
      });

      const result = await scrollToLoadAllMessages({
        container: scroller,
        config: {
          scrollStep: 5000,
          scrollDelay: 1,
          idleThreshold: 2
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(result.initialScrollTop).toBe(12000);
      expect(result.finalScrollTop).toBe(0);
      expect(result.totalDistanceScrolled).toBe(12000);
      expect(scrollEventsDispatched.length).toBeGreaterThanOrEqual(2);
      expect(scrollEventsDispatched).toContain(7000);
      expect(scrollEventsDispatched).toContain(2000);
    });

    it('detects DOM mutations and resets consecutive idle countdown', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      let mutationCallback: Function | null = null;
      const originalObserver = globalThis.MutationObserver;
      (globalThis as any).MutationObserver = class TestObserver {
        constructor(cb: Function) {
          mutationCallback = cb;
        }
        observe() {}
        disconnect() {}
      };

      try {
        let stepCount = 0;
        const result = await scrollToLoadAllMessages({
          container: scroller,
          config: {
            scrollDelay: 5,
            idleThreshold: 3
          },
          onProgress: () => {
            stepCount++;
            // Inject mutation during idle check 2
            if (stepCount === 2 && mutationCallback) {
              mutationCallback([{ type: 'childList' }]);
            }
          }
        });

        expect(result.reachedTop).toBe(true);
        expect(result.mutationsObserved).toBeGreaterThanOrEqual(1);
        expect(result.attempts).toBeGreaterThanOrEqual(4);
      } finally {
        globalThis.MutationObserver = originalObserver;
      }
    });

    it('awaits loading indicator disappearance between scroll steps', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 6000, scrollHeight: 10000, clientHeight: 1000 });
      document.body.appendChild(scroller);

      const spinner = document.createElement('div');
      spinner.className = 'active-spinner';
      document.body.appendChild(spinner);

      // Remove spinner after 20ms
      setTimeout(() => {
        spinner.remove();
      }, 20);

      const result = await scrollToLoadAllMessages({
        container: scroller,
        loadingSelector: '.active-spinner',
        config: {
          scrollStep: 6000,
          scrollDelay: 5,
          loadingCheckInterval: 5,
          maxLoadingWait: 500,
          idleThreshold: 1
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(result.finalScrollTop).toBe(0);
    });

    it('supports AbortSignal to cancel scroll loop midway', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 50000, scrollHeight: 60000, clientHeight: 1000 });
      document.body.appendChild(scroller);

      const controller = new AbortController();

      const result = await scrollToLoadAllMessages({
        container: scroller,
        config: {
          scrollStep: 5000,
          scrollDelay: 5
        },
        signal: controller.signal,
        onProgress: (progress) => {
          if (progress.attempt === 2) {
            controller.abort();
          }
        }
      });

      expect(result.aborted).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.reachedTop).toBe(false);
    });

    it('exports AutoScroller facade object with all operations', () => {
      expect(AutoScroller.run).toBe(scrollToLoadAllMessages);
      expect(AutoScroller.waitForLoading).toBe(waitForLoadingComplete);
      expect(AutoScroller.expandAll).toBe(expandAllContent);
      expect(AutoScroller.getConfig).toBe(getScrollConfig);
      expect(AutoScroller.setConfig).toBe(setScrollConfig);
      expect(AutoScroller.resetConfig).toBe(resetScrollConfig);
    });
  });

  // =========================================================================
  // 7. GeminiAdapter Wiring Integration
  // =========================================================================
  describe('7. GeminiAdapter Wiring Integration', () => {
    let adapter: GeminiAdapter;

    beforeEach(() => {
      adapter = new GeminiAdapter();
    });

    it('resolves scrollContainer via findScrollContainer with Gemini fallback', () => {
      const scroller = document.createElement('div');
      scroller.id = 'chat-history';
      setMetrics(scroller, { overflowY: 'auto', scrollHeight: 5000, clientHeight: 800 });
      document.body.appendChild(scroller);

      const container = adapter.getScrollContainer();
      expect(container).toBe(scroller);
    });

    it('provides loadingIndicatorSelector matching Gemini spinner classes', () => {
      const selector = adapter.getLoadingIndicatorSelector();
      expect(selector).toContain('mat-progress-spinner');
      expect(selector).toContain('.mdc-circular-progress');
    });

    it('provides expandButtonSelectors matching Gemini thought toggles', () => {
      const selectors = adapter.getExpandButtonSelectors();
      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.some(s => s.includes('model-thoughts'))).toBe(true);
    });

    it('executes autoScrollHistory method on GeminiAdapter', async () => {
      const scroller = document.createElement('div');
      scroller.id = 'chat-history';
      setMetrics(scroller, { scrollTop: 5000, scrollHeight: 8000, clientHeight: 800 });
      document.body.appendChild(scroller);

      const result = await adapter.autoScrollHistory({
        config: {
          scrollStep: 5000,
          scrollDelay: 1,
          idleThreshold: 1
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(result.finalScrollTop).toBe(0);
    });

    it('executes expandContent method on GeminiAdapter', async () => {
      const thoughts = document.createElement('model-thoughts');
      const btn = document.createElement('button');
      const clickHandler = vi.fn();
      btn.addEventListener('click', clickHandler);
      thoughts.appendChild(btn);
      document.body.appendChild(thoughts);

      const count = await adapter.expandContent({ clickDelay: 0 });
      expect(count).toBe(1);
      expect(clickHandler).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 8. Adversarial Edge Cases & Hardening Verification
  // =========================================================================
  describe('8. Adversarial Edge Cases & Hardening Verification', () => {
    it('isRealScroller recognizes overlay overflow as scrollable in WebKit/Blink', () => {
      const overlayEl = document.createElement('div');
      setMetrics(overlayEl, { overflowY: 'overlay', scrollHeight: 2500, clientHeight: 500 });
      expect(isRealScroller(overlayEl)).toBe(true);
    });

    it('isRealScroller supports allowDocumentRoot for full-page scrolling SPAs', () => {
      setMetrics(document.documentElement, { scrollHeight: 8000, clientHeight: 800 });
      expect(isRealScroller(document.documentElement, true)).toBe(true);

      // If explicitly overflowY: hidden, it cannot scroll
      setMetrics(document.documentElement, { overflowY: 'hidden' });
      expect(isRealScroller(document.documentElement, true)).toBe(false);
      setMetrics(document.documentElement, { overflowY: 'visible' });
    });

    it('isElementVisible accurately detects hidden, aria-hidden, display:none, and visibility:hidden', () => {
      const normalEl = document.createElement('div');
      expect(isElementVisible(normalEl)).toBe(true);

      const hiddenAttr = document.createElement('div');
      hiddenAttr.hidden = true;
      expect(isElementVisible(hiddenAttr)).toBe(false);

      const ariaHidden = document.createElement('div');
      ariaHidden.setAttribute('aria-hidden', 'true');
      expect(isElementVisible(ariaHidden)).toBe(false);

      const displayNone = document.createElement('div');
      setMetrics(displayNone, {});
      (displayNone as any).style.display = 'none';
      expect(isElementVisible(displayNone)).toBe(false);

      const visibilityHidden = document.createElement('div');
      setMetrics(visibilityHidden, {});
      (visibilityHidden as any).style.visibility = 'hidden';
      expect(isElementVisible(visibilityHidden)).toBe(false);

      const opacityZero = document.createElement('div');
      setMetrics(opacityZero, {});
      (opacityZero as any).style.opacity = '0';
      expect(isElementVisible(opacityZero)).toBe(false);
    });

    it('findScrollContainer returns conversationContainer directly when it is a real scroller', () => {
      const convContainer = document.createElement('div');
      convContainer.className = 'custom-chat-wrapper';
      setMetrics(convContainer, { overflowY: 'auto', scrollHeight: 3500, clientHeight: 600 });
      document.body.appendChild(convContainer);

      // Pass an unmatched selector so Step 1 does not match it
      const found = findScrollContainer({
        selectors: ['.unmatched-candidate'],
        conversationContainer: convContainer
      });

      expect(found).toBe(convContainer);
    });

    it('findScrollContainer pierces Shadow DOM boundary to locate outer host scroll container', () => {
      // Outer scroller host
      const hostContainer = document.createElement('div');
      hostContainer.id = 'outer-scroller-host';
      setMetrics(hostContainer, { overflowY: 'auto', scrollHeight: 5000, clientHeight: 800 });
      document.body.appendChild(hostContainer);

      // Component with shadow root
      const component = document.createElement('div');
      hostContainer.appendChild(component);
      const shadow = component.attachShadow({ mode: 'open' });

      // Inner conversation container inside Shadow DOM
      const innerChat = document.createElement('div');
      innerChat.className = 'inner-chat';
      setMetrics(innerChat, { overflowY: 'visible' });
      shadow.appendChild(innerChat);

      const found = findScrollContainer({
        selectors: ['.unmatched'],
        conversationContainer: innerChat
      });

      expect(found).toBe(hostContainer);
    });

    it('waitForLoadingComplete ignores dormant/hidden spinner elements and returns true immediately', async () => {
      const hiddenSpinner = document.createElement('div');
      hiddenSpinner.className = 'mat-progress-spinner';
      (hiddenSpinner as any).style.display = 'none';
      document.body.appendChild(hiddenSpinner);

      const start = Date.now();
      const result = await waitForLoadingComplete({
        selector: '.mat-progress-spinner',
        checkInterval: 10,
        maxTimeout: 2000
      });

      expect(result).toBe(true);
      expect(Date.now() - start).toBeLessThan(200); // Does NOT wait for 2000ms maxTimeout!
    });

    it('expandAllContent skips buttons with labels or text indicating collapse/hide states', async () => {
      const hideBtn = document.createElement('button');
      hideBtn.setAttribute('aria-label', 'Hide thoughts');
      const hideClick = vi.fn();
      hideBtn.addEventListener('click', hideClick);
      document.body.appendChild(hideBtn);

      const collapseBtn = document.createElement('button');
      collapseBtn.textContent = 'Collapse reasoning';
      const collapseClick = vi.fn();
      collapseBtn.addEventListener('click', collapseClick);
      document.body.appendChild(collapseBtn);

      const pressedBtn = document.createElement('button');
      pressedBtn.setAttribute('aria-pressed', 'true');
      pressedBtn.setAttribute('aria-label', 'thinking');
      const pressedClick = vi.fn();
      pressedBtn.addEventListener('click', pressedClick);
      document.body.appendChild(pressedBtn);

      const openBtn = document.createElement('button');
      openBtn.className = 'expanded';
      openBtn.setAttribute('aria-label', 'thought');
      const openClick = vi.fn();
      openBtn.addEventListener('click', openClick);
      document.body.appendChild(openBtn);

      const validBtn = document.createElement('button');
      validBtn.setAttribute('aria-label', 'thinking');
      const validClick = vi.fn();
      validBtn.addEventListener('click', validClick);
      document.body.appendChild(validBtn);

      const count = await expandAllContent({ root: document.body, clickDelay: 0 });
      expect(count).toBe(1);
      expect(hideClick).not.toHaveBeenCalled();
      expect(collapseClick).not.toHaveBeenCalled();
      expect(pressedClick).not.toHaveBeenCalled();
      expect(openClick).not.toHaveBeenCalled();
      expect(validClick).toHaveBeenCalledTimes(1);
    });

    it('expandAllContent supports selector array as first argument and handles null root', async () => {
      const btn = document.createElement('button');
      btn.className = 'custom-expand-btn';
      const clickHandler = vi.fn();
      btn.addEventListener('click', clickHandler);
      document.body.appendChild(btn);

      // Direct array signature
      const count1 = await expandAllContent(['.custom-expand-btn']);
      expect(count1).toBe(1);
      expect(clickHandler).toHaveBeenCalledTimes(1);

      // Null root with explicit selectors signature
      const count2 = await expandAllContent(null, ['.custom-expand-btn']);
      expect(count2).toBe(1);
      expect(clickHandler).toHaveBeenCalledTimes(2);
    });

    it('scrollToLoadAllMessages dispatches scroll event even when starting at scrollTop: 0', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      let scrollEventCount = 0;
      scroller.addEventListener('scroll', () => {
        scrollEventCount++;
      });

      const result = await scrollToLoadAllMessages({
        container: scroller,
        config: {
          scrollDelay: 1,
          idleThreshold: 1
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(scrollEventCount).toBeGreaterThanOrEqual(1);
    });

    it('scrollToLoadAllMessages protects against continuous zero-height background mutations without freezing in 500-step loop', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      let observerCallback: Function | null = null;
      const originalObserver = globalThis.MutationObserver;
      (globalThis as any).MutationObserver = class FlutteringObserver {
        constructor(cb: Function) {
          observerCallback = cb;
        }
        observe() {}
        disconnect() {}
      };

      try {
        let loopSteps = 0;
        const result = await scrollToLoadAllMessages({
          container: scroller,
          config: {
            scrollDelay: 2,
            idleThreshold: 3,
            maxScrollAttempts: 100,
            mutationTimeout: 10
          },
          onProgress: () => {
            loopSteps++;
            // Fire continuous background mutation on EVERY single idle step without height change
            if (observerCallback) {
              observerCallback([{ type: 'childList' }]);
            }
          }
        });

        expect(result.reachedTop).toBe(true);
        // Must conclude within a bounded number of steps rather than looping to maxScrollAttempts (100)
        expect(result.attempts).toBeLessThan(30);
      } finally {
        globalThis.MutationObserver = originalObserver;
      }
    });

    it('scrollToLoadAllMessages detects scrollHeight growth at top and resets idle countdown', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 0, scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      let step = 0;
      const result = await scrollToLoadAllMessages({
        container: scroller,
        config: {
          scrollDelay: 5,
          idleThreshold: 2
        },
        onProgress: () => {
          step++;
          // On step 1, simulate newly prepended chat turns expanding scrollHeight
          if (step === 1) {
            setMetrics(scroller, { scrollHeight: 4500 });
          }
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(result.attempts).toBeGreaterThanOrEqual(3);
    });

    it('scrollToLoadAllMessages is fail-safe against throwing onProgress callbacks', async () => {
      const scroller = document.createElement('div');
      setMetrics(scroller, { scrollTop: 1000, scrollHeight: 2000, clientHeight: 500 });
      document.body.appendChild(scroller);

      const result = await scrollToLoadAllMessages({
        container: scroller,
        config: {
          scrollStep: 1000,
          scrollDelay: 1,
          idleThreshold: 1
        },
        onProgress: () => {
          throw new Error('User logger crashed');
        }
      });

      expect(result.reachedTop).toBe(true);
      expect(result.finalScrollTop).toBe(0);
    });
  });
});
