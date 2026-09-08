/**
 * Structured Turn Scraper for OpenAI ChatGPT SPA.
 * Extracts conversation turns with OpenAI reasoning header isolation,
 * model slug extraction, CodeMirror code fence preservation, image attachment harvesting,
 * and in-scroll file & download affordance capture (Clio #262, #263, #264, #279).
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

    // 1. When virtualCache is present, start with cached entries (already sorted by invariant bottom-distance)
    if (virtualCache && virtualCache.size > 0) {
      for (const entry of virtualCache.getEntries()) {
        const role = this.resolveRole(entry.element);
        const roleKey = entry.turnIndex !== null ? `turn-${entry.turnIndex}-${role}` : null;
        const primaryKey = entry.id || roleKey || `cached-${candidates.length}`;

        if (!seenKeys.has(primaryKey) && !(entry.id && seenKeys.has(entry.id))) {
          seenKeys.add(primaryKey);
          if (entry.id) seenKeys.add(entry.id);
          if (roleKey) seenKeys.add(roleKey);
          candidates.push({ el: entry.element, live: false, key: primaryKey });
        }
      }
    }

    // 2. Collect live DOM message elements in natural DOM order
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

        if (seenKeys.has(primaryKey) || (id && seenKeys.has(id))) continue;
        seenKeys.add(primaryKey);
        if (id) seenKeys.add(id);
        if (turnIdx !== null) seenKeys.add(`turn-${turnIdx}-${role}`);

        candidates.push({ el, live: true, key: primaryKey });
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

    // 4. If virtualCache was not used and all candidates have turnIndex, sort by turnIndex ascending
    if ((!virtualCache || virtualCache.size === 0) && rawTurns.every(t => typeof t.turnIndex === 'number')) {
      rawTurns.sort((a, b) => {
        if (a.turnIndex !== b.turnIndex) {
          return a.turnIndex - b.turnIndex;
        }
        return a.timestamp - b.timestamp;
      });
    }

    // 5. Re-index turnIndex sequentially (0, 1, 2, ...) to ensure a monotonic sequence
    return rawTurns.map((turn, idx) => ({
      ...turn,
      turnIndex: idx
    }));
  }

  /**
   * Extracts a user turn with sanitized prompt content and image/file attachments.
   */
  static extractUserTurn(
    element: HTMLElement,
    turnIndex: number,
    messageId: string,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    const turnContainer = element.closest?.('[data-testid^="conversation-turn-"]') as HTMLElement | null;
    const attachments = this.findAttachments(turnContainer || element, turnIndex);

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
      attachments: attachments.length > 0 ? attachments : undefined,
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

    // 3. Extract attachments (e.g. DALL-E images and generated file download controls)
    const attachments = this.findAttachments(turnContainer || element, turnIndex);

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
      attachments: attachments.length > 0 ? attachments : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Harvests image attachments, filtering out user avatars, system icons, and citation decorations (Clio #279).
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

      // Clio #279 / #284: Skip citation decoration icons
      const isCitation = img.closest?.('[aria-label="Sources"], [class*="footnote"], [data-testid*="citation"]') !== null;
      if (isCitation) continue;

      if (src.includes('googleusercontent.com') || src.includes('gstatic.com')) {
        continue;
      }

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
          kind: 'image',
          originalSrc: src,
          url: src,
          turnIndex
        });
      }
    }

    return attachments;
  }

  /**
   * Harvests both images and attached files / download affordances (Clio #262, #279).
   */
  static findAttachments(element: HTMLElement, turnIndex: number): HarvestAttachment[] {
    const images = this.findImages(element, turnIndex);
    const files: HarvestAttachment[] = [];

    // 1. Operator-uploaded file cards in user messages (Clio #262)
    const uploadedCardSelectors = CHATGPT_SELECTORS.uploadedFileCard.join(', ');
    const fileIcons = Array.from(element.querySelectorAll?.(uploadedCardSelectors) || []) as HTMLElement[];
    const seenFiles = new Set<string>();

    for (const icon of fileIcons) {
      let card: HTMLElement | null = icon;
      for (let i = 0; i < 6 && card?.parentElement && card.parentElement !== element; i++) {
        card = card.parentElement;
        if ((card.textContent || '').trim().length > 3) break;
      }
      if (!card) continue;

      const lines = this.elementTextLines(card);
      const name = lines[0];
      if (name && !seenFiles.has(name)) {
        seenFiles.add(name);
        files.push({
          type: 'file',
          name,
          kind: lines[1] || 'file',
          downloadable: false,
          turnIndex
        });
      }
    }

    // 2. Generated artifact download controls in assistant messages (Clio #262)
    const downloadSelectors = CHATGPT_SELECTORS.downloadAffordance.join(', ');
    const downloadControls = Array.from(element.querySelectorAll?.(downloadSelectors) || []) as HTMLElement[];
    const seenDownloads = new Set<string>();

    for (const control of downloadControls) {
      const label = (control.getAttribute('aria-label') || control.textContent || '').trim();
      const downloadAttr = control.getAttribute('download');
      const href = control.getAttribute('href');

      if (!downloadAttr && !/^download\b/i.test(label)) continue;
      if (/^download\s+(apps?|the\s+app)$/i.test(label)) continue;

      const rest = label.replace(/^download\s+/i, '').trim();
      const looksLikeFilename = /^[^\s]+\.[A-Za-z0-9]{1,10}$/.test(rest);
      const name = (downloadAttr && downloadAttr !== 'true') ? downloadAttr : (looksLikeFilename ? rest : null);
      const dedupKey = name || label;
      if (seenDownloads.has(dedupKey)) continue;
      seenDownloads.add(dedupKey);

      // Check parent card for secondary descriptor line
      let kind: string | null = null;
      let card: HTMLElement | null = control.parentElement;
      while (card && card !== element && !card.hasAttribute?.('data-message-author-role')) {
        const isCard =
          (card.className && /file|surface|attachment|card|rounded/i.test(card.className));
        if (isCard) {
          const lines = this.elementTextLines(card);
          if (lines.length >= 2 && lines[1] && !lines[1].toLowerCase().includes('download')) {
            kind = lines[1];
          }
          break;
        }
        card = card.parentElement;
      }

      files.push({
        type: 'file',
        name,
        label: kind || label,
        kind: kind || 'file',
        downloadable: true,
        url: href || undefined,
        turnIndex
      });
    }

    return [...images, ...files];
  }

  /**
   * Helper to retrieve text lines of an element, resilient against jsdom innerText limitations.
   */
  static elementTextLines(el: HTMLElement): string[] {
    if (el && typeof el.innerText === 'string' && el.innerText.trim()) {
      return el.innerText.split('\n').map(s => s.trim()).filter(Boolean);
    }
    const isLeaf = (e: Element) => {
      const childElements = Array.from(e.children || []).filter(c => (c as any).nodeType === 1);
      return childElements.length === 0 && (e.textContent || '').trim().length > 0;
    };
    const leaves = Array.from(el.querySelectorAll?.('*') || [])
      .filter(isLeaf)
      .map(e => e.textContent!.trim());
    if (leaves.length) return leaves;
    const text = (el.textContent || '').trim();
    return text ? [text] : [];
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
