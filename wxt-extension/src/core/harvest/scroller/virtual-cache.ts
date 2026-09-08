/**
 * Virtual Message Cache for Chatbot DOM Virtualization.
 * Caches cloned snapshots of rendered messages before chat platforms
 * (specifically OpenAI ChatGPT's React virtualization) unmount them during upward scrolling.
 *
 * Implements Clio #264 / #272 / #289 invariant bottom-distance ordering to prevent
 * transcript scrambling on virtualized lists where data-testid="conversation-turn-N"
 * is provisional and relative only to the currently rendered window.
 */

import type { IHarvesterAdapter } from '../../../adapters/chatbots/types';

export interface VirtualMessageEntry {
  id: string;
  turnIndex: number | null;
  element: HTMLElement;
  timestamp: number;
  seq: number;
  fromBottom: number | null;
  measuredSettled: boolean;
}

export interface VirtualMessageCacheOptions {
  /** Maximum number of messages to cache before FIFO eviction (default: 5000) */
  maxEntries?: number;
}

export interface CaptureOrderStats {
  captured: number;
  withOrderKey: number;
  withoutOrderKey: number;
  measuredOnSettledDom: number;
  neverMeasuredOnSettledDom: number;
}

/**
 * Calculates distance from the BOTTOM of the scroller to the top of an element.
 *
 * This is the invariant ordering key for virtualized lists (Clio #264).
 * Prepending older content above increases scrollHeight by delta D and pushes
 * every existing element's offset down by exactly D, so (scrollHeight - offsetTop)
 * does not shift as older turns mount. Larger value = further from bottom = earlier in conversation.
 */
export function measureFromBottom(el: HTMLElement, scroller: HTMLElement | null): number | null {
  if (!scroller || !el || typeof el.getBoundingClientRect !== 'function') return null;
  // A container that does not scroll provides a meaningless key
  if (!(scroller.scrollHeight > scroller.clientHeight)) return null;
  const r = el.getBoundingClientRect();
  // Height 0 means the node is in DOM but not yet laid out — measurement is junk
  if (!r || !r.height) return null;
  const sr = scroller.getBoundingClientRect();
  const offsetTop = r.top - sr.top + scroller.scrollTop;
  return scroller.scrollHeight - offsetTop;
}

export class VirtualMessageCache {
  private readonly cache = new Map<string, VirtualMessageEntry>();
  private readonly maxEntries: number;
  private seqCounter: number = 0;

  constructor(options?: VirtualMessageCacheOptions) {
    this.maxEntries = options?.maxEntries ?? 5000;
  }

  get size(): number {
    return this.cache.size;
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  get(id: string): HTMLElement | undefined {
    return this.cache.get(id)?.element;
  }

  getEntry(id: string): VirtualMessageEntry | undefined {
    return this.cache.get(id);
  }

  /**
   * Caches a message element by deep-cloning it.
   * Updates turnIndex, fromBottom, and settled status if more accurate readings are found.
   */
  set(
    id: string,
    element: HTMLElement,
    turnIndex?: number | null,
    fromBottom?: number | null,
    measuredSettled: boolean = false
  ): void {
    if (!id || !element) return;

    if (this.cache.size >= this.maxEntries && !this.cache.has(id)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    const existing = this.cache.get(id);
    const resolvedTurnIndex = turnIndex ?? existing?.turnIndex ?? null;
    const resolvedFromBottom = fromBottom ?? existing?.fromBottom ?? null;
    const resolvedMeasuredSettled = measuredSettled || (existing?.measuredSettled ?? false);
    const seq = existing?.seq ?? this.seqCounter++;

    this.cache.set(id, {
      id,
      turnIndex: resolvedTurnIndex,
      element: cloned,
      timestamp: Date.now(),
      seq,
      fromBottom: resolvedFromBottom,
      measuredSettled: resolvedMeasuredSettled
    });
  }

  /**
   * Scans root for rendered message elements and captures cloned snapshots into the cache.
   * Resolves message ID, turn index, and invariant bottom distance.
   */
  captureFromRoot(
    root: ParentNode | Document | null | undefined,
    adapter?: IHarvesterAdapter,
    scroller?: HTMLElement | null
  ): number {
    if (!root || typeof (root as any).querySelectorAll !== 'function') return 0;

    let captured = 0;
    const selectors = [
      '[data-message-author-role]',
      '[data-testid^="conversation-turn-"]',
      '[data-message-id]'
    ].join(', ');

    let rawElements: HTMLElement[] = [];
    try {
      rawElements = Array.from((root as any).querySelectorAll(selectors)) as HTMLElement[];
    } catch {
      return 0;
    }

    for (const el of rawElements) {
      // If el is an outer container holding inner message elements, skip container to prevent turn duplication
      const hasInnerMessage =
        el.querySelector?.('[data-message-author-role]') !== null &&
        !el.hasAttribute?.('data-message-author-role');
      if (hasInnerMessage) {
        continue;
      }

      let id: string | null = null;
      if (adapter && typeof adapter.getMessageId === 'function') {
        id = adapter.getMessageId(el);
      }
      if (!id) {
        id =
          el.getAttribute('data-message-id') ||
          el.querySelector('[data-message-id]')?.getAttribute('data-message-id') ||
          el.closest?.('[data-message-id]')?.getAttribute('data-message-id') ||
          null;
      }

      let turnIndex: number | null = null;
      if (adapter && typeof adapter.getTurnIndex === 'function') {
        turnIndex = adapter.getTurnIndex(el);
      }
      if (turnIndex === null) {
        const testId =
          el.getAttribute('data-testid') ||
          el.closest?.('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid') ||
          el.querySelector('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid');
        const match = testId?.match(/conversation-turn-(\d+)/i);
        if (match && match[1]) {
          turnIndex = parseInt(match[1], 10);
        }
      }

      const roleAttr =
        el.getAttribute('data-message-author-role') ||
        el.querySelector?.('[data-message-author-role]')?.getAttribute('data-message-author-role') ||
        el.getAttribute('data-role');
      const role = roleAttr === 'user' ? 'user' : roleAttr === 'assistant' ? 'assistant' : undefined;

      const fromBottom = scroller ? measureFromBottom(el, scroller) : null;

      if (id) {
        const isNew = !this.cache.has(id);
        this.set(id, el, turnIndex, fromBottom, false);
        if (isNew) captured++;
      } else if (turnIndex !== null) {
        const syntheticId = role ? `turn-${turnIndex}-${role}` : `turn-${turnIndex}`;
        const isNew = !this.cache.has(syntheticId);
        this.set(syntheticId, el, turnIndex, fromBottom, false);
        if (isNew) captured++;
      }
    }

    return captured;
  }

  /**
   * Re-measures currently rendered messages from a settled DOM (Clio #264).
   * Overwrites measurements taken inside MutationObserver during in-flight React reflows.
   */
  remeasureSettled(root: ParentNode | Document | null | undefined, scroller: HTMLElement | null): number {
    if (!root || !scroller || typeof (root as any).querySelectorAll !== 'function') return 0;

    let remeasured = 0;
    const selectors = [
      '[data-message-author-role]',
      '[data-testid^="conversation-turn-"]',
      '[data-message-id]'
    ].join(', ');

    let rawElements: HTMLElement[] = [];
    try {
      rawElements = Array.from((root as any).querySelectorAll(selectors)) as HTMLElement[];
    } catch {
      return 0;
    }

    for (const el of rawElements) {
      const id =
        el.getAttribute('data-message-id') ||
        el.querySelector('[data-message-id]')?.getAttribute('data-message-id') ||
        el.closest?.('[data-message-id]')?.getAttribute('data-message-id') ||
        null;

      if (!id) continue;
      const entry = this.cache.get(id);
      if (!entry) continue;

      const measured = measureFromBottom(el, scroller);
      if (measured !== null) {
        entry.fromBottom = measured;
        entry.measuredSettled = true;
        remeasured++;
      }
    }

    return remeasured;
  }

  /**
   * Returns ordering statistics indicating confidence in transcript reconstruction (Clio #264, #272).
   */
  getCaptureOrderStats(): CaptureOrderStats {
    let withOrderKey = 0;
    let measuredOnSettledDom = 0;
    for (const entry of this.cache.values()) {
      if (typeof entry.fromBottom === 'number') withOrderKey++;
      if (entry.measuredSettled) measuredOnSettledDom++;
    }
    return {
      captured: this.cache.size,
      withOrderKey,
      withoutOrderKey: this.cache.size - withOrderKey,
      measuredOnSettledDom,
      neverMeasuredOnSettledDom: this.cache.size - measuredOnSettledDom
    };
  }

  /**
   * Returns all cached cloned elements in stable conversation order.
   */
  getAll(): HTMLElement[] {
    return this.getEntries().map(e => e.element);
  }

  /**
   * Returns all cached message entries sorted primarily by invariant bottom distance
   * descending (b.fromBottom - a.fromBottom) so earlier turns come first.
   * Unmeasured turns are safely appended in capture sequence without being dropped.
   */
  getEntries(): VirtualMessageEntry[] {
    const entries = Array.from(this.cache.values());
    const measured = entries.filter(e => typeof e.fromBottom === 'number');
    const unmeasured = entries.filter(e => typeof e.fromBottom !== 'number');

    // Earlier turns sit higher up, meaning larger distance from scroller bottom
    measured.sort((a, b) => (b.fromBottom! - a.fromBottom!) || (a.seq - b.seq));

    // Unmeasured fallback: preserve turnIndex if both have it, otherwise capture sequence (seq)
    unmeasured.sort((a, b) => {
      if (a.turnIndex !== null && b.turnIndex !== null && a.turnIndex !== b.turnIndex) {
        return a.turnIndex - b.turnIndex;
      }
      return a.seq - b.seq;
    });

    return [...measured, ...unmeasured];
  }

  /**
   * Clears all cached messages and resets sequence counter.
   */
  clear(): void {
    this.cache.clear();
    this.seqCounter = 0;
  }
}
