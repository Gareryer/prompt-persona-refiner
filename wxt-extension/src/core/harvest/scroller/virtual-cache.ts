/**
 * Virtual Message Cache for Chatbot DOM Virtualization.
 * Caches cloned snapshots of rendered messages before chat platforms
 * (specifically OpenAI ChatGPT's React virtualization) unmount them during upward scrolling.
 */

import type { IHarvesterAdapter } from '../../../adapters/chatbots/types';

export interface VirtualMessageEntry {
  id: string;
  turnIndex: number | null;
  element: HTMLElement;
  timestamp: number;
}

export interface VirtualMessageCacheOptions {
  /** Maximum number of messages to cache before FIFO eviction (default: 5000) */
  maxEntries?: number;
}

export class VirtualMessageCache {
  private readonly cache = new Map<string, VirtualMessageEntry>();
  private readonly maxEntries: number;

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
   * Updates turnIndex if a more accurate index is discovered.
   */
  set(id: string, element: HTMLElement, turnIndex?: number | null): void {
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

    this.cache.set(id, {
      id,
      turnIndex: resolvedTurnIndex,
      element: cloned,
      timestamp: Date.now()
    });
  }

  /**
   * Scans root for rendered message elements and captures cloned snapshots into the cache.
   * Resolves message ID and turn index via adapter hooks or resilient DOM landmarks.
   * Returns the count of newly captured or updated message elements.
   */
  captureFromRoot(root: ParentNode | Document | null | undefined, adapter?: IHarvesterAdapter): number {
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

      if (id) {
        const isNew = !this.cache.has(id);
        this.set(id, el, turnIndex);
        if (isNew) captured++;
      } else if (turnIndex !== null) {
        const syntheticId = role ? `turn-${turnIndex}-${role}` : `turn-${turnIndex}`;
        const isNew = !this.cache.has(syntheticId);
        this.set(syntheticId, el, turnIndex);
        if (isNew) captured++;
      }
    }

    return captured;
  }

  /**
   * Returns all cached cloned elements, ordered by turnIndex ascending (if available),
   * then by timestamp.
   */
  getAll(): HTMLElement[] {
    return this.getEntries().map(e => e.element);
  }

  /**
   * Returns all cached message entries with metadata, sorted by turnIndex ascending.
   */
  getEntries(): VirtualMessageEntry[] {
    const entries = Array.from(this.cache.values());
    entries.sort((a, b) => {
      if (a.turnIndex !== null && b.turnIndex !== null) {
        return a.turnIndex - b.turnIndex;
      }
      if (a.turnIndex !== null) return -1;
      if (b.turnIndex !== null) return 1;
      return a.timestamp - b.timestamp;
    });
    return entries;
  }

  /**
   * Clears all cached messages.
   */
  clear(): void {
    this.cache.clear();
  }
}
