import { BaseChatbotAdapter } from '../base.adapter';
import { CHATGPT_SELECTORS } from './selectors';
import { CHATGPT_TOKENS } from './tokens';
import { ChatGPTTurnScraper } from './turn-scraper';
import { TextSanitizer } from '../../../core/harvest/extraction/text-sanitizer';
import { VirtualMessageCache } from '../../../core/harvest/scroller/virtual-cache';
import {
  findScrollContainer,
  scrollToLoadAllMessages,
  expandAllContent,
  type AutoScrollOptions,
  type ScrollResult,
  type ExpandAllContentOptions
} from '../../../core/harvest';
import type { ScrapedTurn } from '../../../core/types';
import type { IChatbotAdapter, IHarvesterAdapter } from '../types';
import type { HarvestTurn, DiscoveredConversation } from '../../../core/harvest/types';

/**
 * Platform adapter for OpenAI ChatGPT (chatgpt.com & chat.openai.com).
 * Manages React virtualization DOM recycling via VirtualMessageCache,
 * ancestor scroll-root container resolution, reasoning trace isolation,
 * CodeMirror code blocks, image attachments, and sidebar history enumeration.
 */
export class ChatGPTAdapter extends BaseChatbotAdapter implements IChatbotAdapter, IHarvesterAdapter {
  readonly platform = 'chatgpt' as const;
  readonly ordersFromCapture = true;
  readonly citationDecoration = CHATGPT_SELECTORS.citationDecoration.join(', ');
  readonly uploadedFileCard = CHATGPT_SELECTORS.uploadedFileCard.join(', ');
  readonly downloadAffordance = CHATGPT_SELECTORS.downloadAffordance.join(', ');

  /**
   * Dedicated VirtualMessageCache to counter React virtual list unmounting off-screen turns.
   */
  public readonly virtualCache = new VirtualMessageCache();

  /**
   * Guard flag to prevent infinite refinement loops during programmatic submission.
   */
  public skipNextRefinement = false;

  matches(hostname: string): boolean {
    return hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com');
  }

  getActiveInput(): HTMLElement | null {
    return this.findElement<HTMLElement>(CHATGPT_SELECTORS.input);
  }

  getSubmitButton(): HTMLElement | null {
    return this.findElement<HTMLElement>(CHATGPT_SELECTORS.submitButton);
  }

  getSelectors(): typeof CHATGPT_SELECTORS {
    return CHATGPT_SELECTORS;
  }

  getStyleTokens(): Record<string, any> {
    return CHATGPT_TOKENS;
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';

    if (this.isFormInputElement(input)) {
      return (input as HTMLTextAreaElement | HTMLInputElement).value || '';
    }

    return input.textContent || '';
  }

  setInputText(text: string): boolean {
    const input = this.getActiveInput();
    if (!input) return false;

    if (this.isFormInputElement(input)) {
      (input as HTMLTextAreaElement | HTMLInputElement).value = text;
      this.dispatchInputEvents(input, text);
      return true;
    }

    // Rich contenteditable composer in modern ChatGPT
    input.textContent = text;
    this.dispatchInputEvents(input, text);
    return true;
  }

  /**
   * Intercepts message submission (Enter keydown or Send click) in the capture phase,
   * allowing Allie prompt refinement before React consumes the event.
   */
  interceptSubmit(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void {
    const input = this.getActiveInput();
    const submitBtn = this.getSubmitButton();

    const handleKeydown = async (e: KeyboardEvent) => {
      // Shift+Enter creates a newline; only intercept standalone Enter
      if (e.key !== 'Enter' || e.shiftKey) return;

      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return;

      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const proceed = await onRefine(text);
      if (proceed) {
        this.skipNextRefinement = true;
        const currentSubmitBtn = this.getSubmitButton();
        if (currentSubmitBtn && typeof currentSubmitBtn.click === 'function') {
          currentSubmitBtn.click();
        } else {
          const currentInput = this.getActiveInput();
          currentInput?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
          );
        }
      }
    };

    const handleClick = async (e: MouseEvent) => {
      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return;

      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const proceed = await onRefine(text);
      if (proceed) {
        this.skipNextRefinement = true;
        const currentSubmitBtn = this.getSubmitButton() || (e.currentTarget as HTMLElement);
        if (currentSubmitBtn && typeof currentSubmitBtn.click === 'function') {
          currentSubmitBtn.click();
        }
      }
    };

    input?.addEventListener('keydown', handleKeydown as unknown as EventListener, { capture: true });
    submitBtn?.addEventListener('click', handleClick as unknown as EventListener, { capture: true });

    return () => {
      input?.removeEventListener('keydown', handleKeydown as unknown as EventListener, { capture: true });
      submitBtn?.removeEventListener('click', handleClick as unknown as EventListener, { capture: true });
    };
  }

  /**
   * Scrapes completed conversation turns from the current DOM for real-time persona analysis.
   */
  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];
    const elements = Array.from(document.querySelectorAll('[data-message-author-role]'));

    elements.forEach((el, index) => {
      const roleAttr = el.getAttribute('data-message-author-role');
      const role = roleAttr === 'user' ? 'user' : 'assistant';
      turns.push({
        id: el.getAttribute('data-message-id') || `chatgpt-${index}`,
        role,
        content: el.textContent?.trim() || '',
        timestamp: Date.now()
      });
    });
    return turns;
  }

  // --- IHarvesterAdapter Implementation ---

  /**
   * Locates the true scrolling container for ChatGPT.
   * ChatGPT's <main> has overflow: visible; findScrollContainer resolves the ancestor
   * `div.group/scroll-root` or the scrollable container above <main>.
   */
  getScrollContainer(): HTMLElement | null {
    const mainEl = this.findElement<HTMLElement>(CHATGPT_SELECTORS.conversationContainer);
    const scroller = findScrollContainer({
      selectors: CHATGPT_SELECTORS.scrollContainer,
      conversationContainer: mainEl
    });
    if (scroller) return scroller;

    // Direct ancestor lookup for scroll-root if computed styles/layout are not available
    const ancestorScroller = mainEl?.closest?.<HTMLElement>('div[class*="scroll-root"], [class*="scroll-root"]');
    if (ancestorScroller) return ancestorScroller;

    return this.findElement<HTMLElement>(CHATGPT_SELECTORS.scrollContainer) || mainEl;
  }

  /**
   * Returns selector string for ChatGPT loading spinners / generation progress.
   */
  getLoadingIndicatorSelector(): string | null {
    return CHATGPT_SELECTORS.loadingIndicator.join(', ');
  }

  /**
   * Returns list of selector strings for expandable sections (reasoning traces, etc.).
   */
  getExpandButtonSelectors(): string[] {
    return Array.from(CHATGPT_SELECTORS.expandButton);
  }

  /**
   * ChatGPT actively unmounts off-screen messages as the user scrolls up.
   * Virtualization cache is mandatory to prevent data loss.
   */
  requiresVirtualizationCache(): boolean {
    return true;
  }

  /**
   * Resolves the message ID from data-message-id.
   */
  getMessageId(el: HTMLElement): string | null {
    if (!el) return null;
    return (
      el.getAttribute('data-message-id') ||
      el.querySelector('[data-message-id]')?.getAttribute('data-message-id') ||
      el.closest('[data-message-id]')?.getAttribute('data-message-id') ||
      null
    );
  }

  /**
   * Resolves numerical turn index from data-testid="conversation-turn-X".
   */
  getTurnIndex(el: HTMLElement): number | null {
    if (!el) return null;
    const testId =
      el.getAttribute('data-testid') ||
      el.closest('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid') ||
      el.querySelector('[data-testid^="conversation-turn-"]')?.getAttribute('data-testid');

    if (testId) {
      const match = testId.match(/conversation-turn-(\d+)/i);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }
    return null;
  }

  /**
   * Scrapes structured conversation turns with reasoning isolation, model slugs,
   * CodeMirror code blocks, image attachments, and virtual cache restoration.
   */
  async scrapeHarvestTurns(): Promise<HarvestTurn[]> {
    return ChatGPTTurnScraper.scrapeTurns({
      adapter: this,
      virtualCache: this.virtualCache
    });
  }

  /**
   * Sanitizes cloned turn nodes by stripping reasoning header badges, action toolbars,
   * copy buttons, and interactive feedback widgets.
   */
  sanitizeTurnNode(clonedNode: HTMLElement): void {
    if (typeof clonedNode.querySelectorAll === 'function') {
      const junk = clonedNode.querySelectorAll(
        [
          ...CHATGPT_SELECTORS.reasoningHeader,
          '.message-actions',
          'message-actions',
          '.action-bar',
          '[data-testid="copy-turn-action-button"]',
          '[data-testid*="feedback"]',
          'button',
          'svg',
          '[role="button"]'
        ].join(', ')
      );
      junk.forEach(node => node.remove());
    }
  }

  /**
   * Returns true if ChatGPT is currently streaming / generating a response.
   */
  isStreaming(): boolean {
    if (typeof document === 'undefined') return false;
    return this.findElement(CHATGPT_SELECTORS.streamingIndicator) !== null;
  }

  /**
   * Extracts conversation title from page landmarks or document.title.
   */
  extractTitle(): string {
    if (typeof document === 'undefined') return 'Untitled Conversation';
    const titleEl = document.querySelector('h1, main h1, [data-testid="conversation-title"]');
    if (titleEl && titleEl.textContent?.trim()) {
      return TextSanitizer.cleanTitle(titleEl.textContent.trim());
    }
    return TextSanitizer.cleanTitle(document.title || '');
  }

  /**
   * Extracts ChatGPT conversation ID from URL path (e.g. /c/671b281f-8294-800c-8822-b2a8fe47b669)
   * or active navigation landmark.
   */
  extractConversationId(): string {
    if (typeof window !== 'undefined' && window.location) {
      const match = window.location.pathname.match(/\/c\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    if (typeof document !== 'undefined') {
      const activeLink = document.querySelector<HTMLAnchorElement>('nav a[aria-current="page"], nav a.active');
      const href = activeLink?.getAttribute('href') || activeLink?.href || '';
      const match = href.match(/\/c\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    return '';
  }

  /**
   * Executes automated upward history scrolling, continuously capturing off-screen messages
   * into VirtualMessageCache before React unmounts them.
   */
  async autoScrollHistory(options?: Partial<AutoScrollOptions>): Promise<ScrollResult> {
    const container = this.getScrollContainer();
    const root = typeof document !== 'undefined' ? document : null;

    // Capture initial messages visible in the viewport before scrolling starts
    this.virtualCache.captureFromRoot(container || root, this);

    const userOnMutation = options?.onMutation;
    const userOnProgress = options?.onProgress;

    return scrollToLoadAllMessages({
      container,
      loadingSelector: this.getLoadingIndicatorSelector(),
      virtualCache: this.virtualCache,
      adapter: this,
      ...options,
      onMutation: (mutations) => {
        this.virtualCache.captureFromRoot(container || root, this);
        userOnMutation?.(mutations);
      },
      onProgress: (progress) => {
        this.virtualCache.captureFromRoot(container || root, this);
        userOnProgress?.(progress);
      }
    });
  }

  /**
   * Expands all collapsed thinking sections and show-more toggles.
   */
  async expandContent(options?: Partial<ExpandAllContentOptions>): Promise<number> {
    const container = this.getScrollContainer() || (typeof document !== 'undefined' ? document.body : null);
    return expandAllContent({
      root: container,
      selectors: this.getExpandButtonSelectors(),
      ...options
    });
  }

  /**
   * Enumerates conversation history from the ChatGPT sidebar (nav a[href*="/c/"]).
   */
  async enumerateConversations(signal?: AbortSignal): Promise<DiscoveredConversation[]> {
    if (typeof document === 'undefined' || signal?.aborted) return [];
    const selector = CHATGPT_SELECTORS.sidebarItem.join(', ');
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
    const seen = new Set<string>();
    const results: DiscoveredConversation[] = [];

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://chatgpt.com';

    for (const link of links) {
      if (signal?.aborted) break;
      const href = link.getAttribute('href') || link.href || '';
      const match = href.match(/\/c\/([a-zA-Z0-9_-]+)/i);
      const conversationId = (match && match[1]) ? match[1] : '';

      if (!conversationId || seen.has(conversationId)) {
        continue;
      }
      seen.add(conversationId);

      const title = TextSanitizer.cleanTitle(link.textContent?.trim() || '');
      const url = href.startsWith('http')
        ? href
        : `${origin}/c/${conversationId}`;

      results.push({
        site: 'chatgpt',
        conversationId,
        url,
        title: title || `Conversation ${conversationId}`
      });
    }

    return results;
  }

  private isFormInputElement(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
    const isTextarea =
      (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) ||
      el.tagName === 'TEXTAREA';
    const isInput =
      (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) ||
      el.tagName === 'INPUT';
    return isTextarea || isInput;
  }

  private dispatchInputEvents(element: HTMLElement, data: string): void {
    try {
      if (typeof InputEvent !== 'undefined') {
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data
          })
        );
      } else {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}
