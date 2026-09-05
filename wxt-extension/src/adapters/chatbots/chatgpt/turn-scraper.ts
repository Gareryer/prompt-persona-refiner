/**
 * Structured Turn Scraper for OpenAI ChatGPT SPA.
 * Extracts conversation turns with OpenAI reasoning header isolation,
 * model slug extraction, CodeMirror code fence preservation, and image attachment harvesting.
 * Supports DOM virtualization recovery via VirtualMessageCache.
 */

import { CHATGPT_SELECTORS } from './selectors';
import { TextSanitizer } from '../../../core/harvest/extraction/text-sanitizer';
import type { HarvestTurn, HarvestAttachment } from '../../../core/harvest/types';
import type { VirtualMessageCache } from '../../../core/harvest/scroller/virtual-cache';
import type { IHarvesterAdapter } from '../types';

export interface ChatGPTScraperOptions {
  root?: Document | HTMLElement | null;
  adapter?: IHarvesterAdapter;
  virtualCache?: VirtualMessageCache;
}

function compareDomOrder(a: Element | HTMLElement, b: Element | HTMLElement): number {
  if (a === b) return 0;
  if (typeof a.compareDocumentPosition === 'function') {
    const pos = a.compareDocumentPosition(b);
    if (pos & 4 /* Node.DOCUMENT_POSITION_FOLLOWING */) return -1;
    if (pos & 2 /* Node.DOCUMENT_POSITION_PRECEDING */) return 1;
  }
  return 0;
}

export class ChatGPTTurnScraper {
  /**
   * Scrapes all conversation turns from the ChatGPT DOM, merging live DOM elements
   * with virtualized messages from VirtualMessageCache to counter off-screen unmounting.
   */
  static scrapeTurns(options: ChatGPTScraperOptions = {}): HarvestTurn[] {
    const root = options.root || (typeof document !== 'undefined' ? document : null);
    const adapter = options.adapter;
    const virtualCache = options.virtualCache;

    // Ordered list of candidate elements with deduplication key tracking
    const candidates: { el: HTMLElement; live: boolean; key: string }[] = [];
    const seenKeys = new Set<string>();

    // 1. Collect live DOM message elements in natural DOM order
    if (root) {
      const userSelector = CHATGPT_SELECTORS.userMessage.join(', ');
      const assistantSelector = CHATGPT_SELECTORS.assistantMessage.join(', ');
      const combinedSelector = `${userSelector}, ${assistantSelector}`;

      let liveMessages: HTMLElement[] = [];
      try {
        liveMessages = Array.from(root.querySelectorAll<HTMLElement>(combinedSelector));
        liveMessages.sort(compareDomOrder);
      } catch {
        const liveUserEls = Array.from(root.querySelectorAll<HTMLElement>(userSelector));
        const liveAssistantEls = Array.from(root.querySelectorAll<HTMLElement>(assistantSelector));
        liveMessages = [...liveUserEls, ...liveAssistantEls].sort(compareDomOrder);
      }

      for (const el of liveMessages) {
        const id = this.resolveMessageId(el, adapter);
        const turnIdx = this.resolveTurnIndex(el, adapter);
        const role = this.resolveRole(el);
        const primaryKey = id || (turnIdx !== null ? `turn-${turnIdx}-${role}` : `dom-${candidates.length}`);

        if (seenKeys.has(primaryKey)) continue;
        seenKeys.add(primaryKey);
        if (id) seenKeys.add(id);
        if (turnIdx !== null) seenKeys.add(`turn-${turnIdx}-${role}`);

        candidates.push({ el, live: true, key: primaryKey });
      }
    }

    // 2. Merge elements from VirtualMessageCache (captures off-screen evicted turns)
    if (virtualCache && virtualCache.size > 0) {
      for (const entry of virtualCache.getEntries()) {
        const role = this.resolveRole(entry.element);
        const roleKey = entry.turnIndex !== null ? `turn-${entry.turnIndex}-${role}` : null;
        const primaryKey = entry.id || roleKey || `cached-${candidates.length}`;

        // Check if either entry.id, roleKey, or primaryKey was already seen
        const isDuplicate =
          (entry.id && seenKeys.has(entry.id)) ||
          (roleKey && seenKeys.has(roleKey)) ||
          seenKeys.has(primaryKey);

        if (!isDuplicate) {
          seenKeys.add(primaryKey);
          if (entry.id) seenKeys.add(entry.id);
          if (roleKey) seenKeys.add(roleKey);
          candidates.push({ el: entry.element, live: false, key: primaryKey });
        }
      }
    }

    if (candidates.length === 0) {
      return [];
    }

    // 3. Process candidate elements into structured HarvestTurns
    const rawTurns: HarvestTurn[] = [];
    let fallbackIndex = 0;

    for (const { el, key } of candidates) {
      const role = this.resolveRole(el);
      const messageId = this.resolveMessageId(el, adapter) || key;
      const turnIndex = this.resolveTurnIndex(el, adapter);
      const effectiveIndex = turnIndex ?? fallbackIndex++;

      if (role === 'user') {
        rawTurns.push(this.extractUserTurn(el, effectiveIndex, messageId, adapter));
      } else {
        rawTurns.push(this.extractAssistantTurn(el, effectiveIndex, messageId, adapter));
      }
    }

    // 4. Sort turns stably by turnIndex ascending, then by timestamp
    rawTurns.sort((a, b) => {
      if (a.turnIndex !== b.turnIndex) {
        return a.turnIndex - b.turnIndex;
      }
      return a.timestamp - b.timestamp;
    });

    // 5. Re-index turnIndex sequentially (0, 1, 2, ...) to ensure a monotonic sequence
    return rawTurns.map((turn, idx) => ({
      ...turn,
      turnIndex: idx
    }));
  }

  /**
   * Extracts a user turn with sanitized prompt content and image attachments.
   */
  static extractUserTurn(
    element: HTMLElement,
    turnIndex: number,
    messageId: string,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    const turnContainer = element.closest?.('[data-testid^="conversation-turn-"]') as HTMLElement | null;
    const images = this.findImages(turnContainer || element, turnIndex);

    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
      adapter.sanitizeTurnNode(cloned);
    }

    const content = TextSanitizer.extractTextContent(cloned);

    return {
      id: messageId,
      turnIndex,
      role: 'user',
      content,
      rawText: element.textContent?.trim() || '',
      attachments: images.length > 0 ? images : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Extracts an assistant turn with OpenAI reasoning header isolation,
   * model slug extraction, CodeMirror code preservation, and attachments.
   */
  static extractAssistantTurn(
    element: HTMLElement,
    turnIndex: number,
    messageId: string,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    // 1. Extract OpenAI reasoning header (e.g. "Reasoned for 8 seconds", "Thought for 12 seconds")
    let thinking: string | null = null;
    const turnContainer = element.closest?.('[data-testid^="conversation-turn-"]') as HTMLElement | null;
    const reasoningSelector = CHATGPT_SELECTORS.reasoningHeader.join(', ');
    const reasoningEl =
      element.querySelector<HTMLElement>(reasoningSelector) ||
      turnContainer?.querySelector<HTMLElement>(reasoningSelector);

    if (reasoningEl && reasoningEl.textContent?.trim()) {
      thinking = reasoningEl.textContent.replace(/\s+/g, ' ').trim();
    }

    // 2. Extract model slug
    const modelSlug = this.extractModelSlug(element);

    // 3. Extract attachments (e.g. DALL-E generated images)
    const images = this.findImages(turnContainer || element, turnIndex);

    // 4. Clone element to sanitize body without mutating live DOM
    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    // Strip reasoning header element from cloned body so it does not bleed into response prose
    if (typeof cloned.querySelectorAll === 'function') {
      const reasoningJunk = cloned.querySelectorAll(reasoningSelector);
      reasoningJunk.forEach(node => node.remove());
    }

    // Run adapter turn sanitizer
    if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
      adapter.sanitizeTurnNode(cloned);
    }

    // 5. Extract sanitized content with CodeMirror code blocks converted to markdown fences
    const content = TextSanitizer.extractTextContent(cloned);

    return {
      id: messageId,
      turnIndex,
      role: 'assistant',
      content,
      rawText: element.textContent?.trim() || '',
      thinking,
      modelSlug: modelSlug || undefined,
      attachments: images.length > 0 ? images : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Harvests image attachments from a message or turn container,
   * filtering out user avatars, system icons, and SVG chrome.
   */
  static findImages(element: HTMLElement, turnIndex: number): HarvestAttachment[] {
    if (typeof element.querySelectorAll !== 'function') return [];

    const imgs = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
    const attachments: HarvestAttachment[] = [];
    const seenSrc = new Set<string>();

    for (const img of imgs) {
      const src = img.getAttribute('src') || img.src;
      if (!src || seenSrc.has(src)) continue;

      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const cls = (img.className || '').toLowerCase();
      const role = img.getAttribute('role') || '';
      const ariaHidden = img.getAttribute('aria-hidden') === 'true';

      // Filter out avatars, icons, logos, and UI chrome
      const isUiIcon =
        ariaHidden ||
        role === 'presentation' ||
        src.includes('avatar') ||
        src.includes('profile') ||
        src.includes('favicon') ||
        cls.includes('avatar') ||
        cls.includes('icon') ||
        alt.includes('avatar') ||
        alt.includes('profile') ||
        alt.includes('user') ||
        (img.width > 0 && img.width < 32 && img.height > 0 && img.height < 32);

      if (!isUiIcon) {
        seenSrc.add(src);
        attachments.push({
          type: 'image',
          originalSrc: src,
          turnIndex
        });
      }
    }

    return attachments;
  }

  /**
   * Resolves the message ID attribute from an element or its descendants/ancestors.
   */
  static resolveMessageId(element: HTMLElement, adapter?: IHarvesterAdapter): string | null {
    if (adapter && typeof adapter.getMessageId === 'function') {
      const id = adapter.getMessageId(element);
      if (id) return id;
    }
    return (
      element.getAttribute('data-message-id') ||
      element.querySelector('[data-message-id]')?.getAttribute('data-message-id') ||
      element.closest('[data-message-id]')?.getAttribute('data-message-id') ||
      null
    );
  }

  /**
   * Resolves the numerical turn index from data-testid="conversation-turn-X".
   */
  static resolveTurnIndex(element: HTMLElement, adapter?: IHarvesterAdapter): number | null {
    if (adapter && typeof adapter.getTurnIndex === 'function') {
      const idx = adapter.getTurnIndex(element);
      if (idx !== null && idx !== undefined) return idx;
    }

    const testId =
      element.getAttribute('data-testid') ||
      element.closest('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid') ||
      element.querySelector('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid');

    if (testId) {
      const match = testId.match(/conversation-turn-(\d+)/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }

  /**
   * Resolves the message author role ('user' vs 'assistant').
   */
  static resolveRole(element: HTMLElement): 'user' | 'assistant' {
    const roleAttr =
      element.getAttribute('data-message-author-role') ||
      element.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role') ||
      element.getAttribute('data-role');

    if (roleAttr === 'user') return 'user';
    if (roleAttr === 'assistant') return 'assistant';

    // Fallback checks
    if (element.classList?.contains('user-message')) return 'user';
    if (element.classList?.contains('assistant-message')) return 'assistant';

    return 'assistant';
  }

  /**
   * Extracts model slug identifier (e.g. "gpt-4o", "o1-preview") from data attributes.
   */
  static extractModelSlug(element: HTMLElement): string | null {
    const slug =
      element.getAttribute('data-message-model-slug') ||
      element.querySelector('[data-message-model-slug]')?.getAttribute('data-message-model-slug') ||
      element.closest?.('[data-message-model-slug]')?.getAttribute('data-message-model-slug') ||
      element.getAttribute('data-model-slug') ||
      element.querySelector('[data-model-slug]')?.getAttribute('data-model-slug') ||
      element.closest?.('[data-model-slug]')?.getAttribute('data-model-slug');

    return slug ? slug.trim() : null;
  }
}
