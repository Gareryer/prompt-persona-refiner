import { BaseChatbotAdapter } from '../base.adapter';
import { GEMINI_SELECTORS } from './selectors';
import { GEMINI_TOKENS } from './tokens';
import { GeminiContainerPairer } from './container-pairer';
import { TextSanitizer } from '../../../core/harvest/extraction/text-sanitizer';
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
 * Platform adapter for Google Gemini (gemini.google.com).
 * Manages Angular & Quill SPA integration, capture-phase event interception,
 * prompt text injection, non-recursive programmatic submission, and deep archival harvesting.
 */
export class GeminiAdapter extends BaseChatbotAdapter implements IChatbotAdapter, IHarvesterAdapter {
  readonly platform = 'gemini' as const;

  /**
   * Guard flag to prevent infinite refinement loops during programmatic submission.
   */
  public skipNextRefinement = false;

  matches(hostname: string): boolean {
    return hostname.includes('gemini.google.com');
  }

  getActiveInput(): HTMLElement | null {
    return this.findElement<HTMLElement>(GEMINI_SELECTORS.input);
  }

  getSubmitButton(): HTMLElement | null {
    return this.findElement<HTMLElement>(GEMINI_SELECTORS.submitButton);
  }

  getSelectors(): Record<string, readonly string[]> {
    return GEMINI_SELECTORS;
  }

  getStyleTokens(): Record<string, any> {
    return GEMINI_TOKENS;
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';

    if (this.isFormInputElement(input)) {
      return (input as HTMLTextAreaElement | HTMLInputElement).value || '';
    }

    // Quill formats lines inside <p> elements
    const paragraphs = Array.from(input.querySelectorAll('p'));
    if (paragraphs.length > 0) {
      return paragraphs.map(p => p.textContent || '').join('\n');
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

    // Quill formats lines inside <p> elements
    const paragraphs = text
      .split('\n')
      .map(line => `<p>${line.length > 0 ? this.escapeHtml(line) : '<br>'}</p>`)
      .join('');

    input.innerHTML = paragraphs;
    // Ensure textContent is synchronized in non-DOM or mock environments
    if (!input.textContent && text) {
      input.textContent = text;
    }

    this.dispatchInputEvents(input, text);
    return true;
  }

  /**
   * Intercepts message submission (Enter keydown or Send click) in the capture phase,
   * allowing Allie prompt refinement before Angular consumes the event.
   * Uses skipNextRefinement guard to prevent infinite loops.
   */
  interceptSubmit(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void {
    const input = this.getActiveInput();
    const submitBtn = this.getSubmitButton();

    const handleKeydown = async (e: KeyboardEvent) => {
      // Shift+Enter creates a newline; only intercept standalone Enter
      if (e.key !== 'Enter' || e.shiftKey) return;

      // Programmatic submission bypass guard
      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return; // Ignore empty Enter

      // Intercept in capture phase before Angular consumes it
      e.preventDefault();
      e.stopPropagation();
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
      // Programmatic submission bypass guard
      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return;

      // Intercept in capture phase before Angular consumes it
      e.preventDefault();
      e.stopPropagation();
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
   * Scrapes completed conversation turns from the current DOM.
   */
  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];

    let userNodes = Array.from(
      document.querySelectorAll<HTMLElement>('user-query, .query-text, .user-query-container, [data-role="user"]')
    );
    // Filter out child nodes to avoid duplication when parent matches container selector
    userNodes = userNodes.filter(
      node => !userNodes.some(other => other !== node && other.contains(node))
    );

    let modelNodes = Array.from(
      document.querySelectorAll<HTMLElement>('model-response, .model-response-text, [data-role="model"]')
    );
    // Filter out child nodes to avoid duplication
    modelNodes = modelNodes.filter(
      node => !modelNodes.some(other => other !== node && other.contains(node))
    );

    const count = Math.max(userNodes.length, modelNodes.length);
    for (let i = 0; i < count; i++) {
      if (userNodes[i]) {
        turns.push({
          id: `gemini-u-${i}`,
          role: 'user',
          content: this.extractTurnText(userNodes[i]!),
          timestamp: Date.now()
        });
      }
      if (modelNodes[i]) {
        turns.push({
          id: `gemini-m-${i}`,
          role: 'assistant',
          content: this.extractTurnText(modelNodes[i]!),
          timestamp: Date.now()
        });
      }
    }
    return turns;
  }

  onReanchor(element: HTMLElement): void {
    if (typeof document === 'undefined' || !element) return;
    const permanent = this.findElement<HTMLElement>(GEMINI_SELECTORS.responseContainer);
    if (permanent && !permanent.contains(element)) {
      permanent.appendChild(element);
    }
  }

  // --- IHarvesterAdapter Implementation ---

  /**
   * Locates the primary scrolling conversation container in the Gemini DOM.
   * Leverages resilient findScrollContainer with fallback to direct selector resolution.
   */
  getScrollContainer(): HTMLElement | null {
    const scroller = findScrollContainer({
      selectors: GEMINI_SELECTORS.scrollContainer,
      conversationContainer: this.findElement<HTMLElement>(GEMINI_SELECTORS.conversationContainer)
    });
    if (scroller) return scroller;
    return this.findElement<HTMLElement>(GEMINI_SELECTORS.scrollContainer);
  }

  /**
   * Returns selector string for Gemini loading / progress indicators.
   */
  getLoadingIndicatorSelector(): string | null {
    return GEMINI_SELECTORS.loadingIndicator.join(', ');
  }

  /**
   * Returns list of selector strings for expandable sections (e.g. model thoughts / CoT toggles).
   */
  getExpandButtonSelectors(): string[] {
    return Array.from(GEMINI_SELECTORS.expandButton);
  }

  /**
   * Executes automated upward history scrolling to load past conversation messages.
   */
  async autoScrollHistory(options?: Partial<AutoScrollOptions>): Promise<ScrollResult> {
    const container = this.getScrollContainer();
    return scrollToLoadAllMessages({
      container,
      loadingSelector: this.getLoadingIndicatorSelector(),
      ...options
    });
  }

  /**
   * Expands all collapsed thinking sections and model thought toggles.
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
   * Gemini maintains turns in the DOM without aggressive recycling/unmounting.
   */
  requiresVirtualizationCache(): boolean {
    return false;
  }

  /**
   * Scrapes structured conversation turns with container pairing, thinking isolation, and images.
   */
  async scrapeHarvestTurns(): Promise<HarvestTurn[]> {
    return GeminiContainerPairer.pairTurns({ adapter: this });
  }

  /**
   * Sanitizes cloned turn nodes by stripping interactive chrome, action toolbars, and UI buttons.
   */
  sanitizeTurnNode(clonedNode: HTMLElement): void {
    if (typeof clonedNode.querySelectorAll === 'function') {
      const junk = clonedNode.querySelectorAll(
        [
          ...GEMINI_SELECTORS.thinkingToggle,
          ...GEMINI_SELECTORS.thinkingContainer,
          '.message-actions',
          'message-actions',
          '.response-actions',
          '.action-bar',
          'button',
          'svg',
          '[role="button"]'
        ].join(', ')
      );
      junk.forEach(node => node.remove());
    }
  }

  /**
   * Returns true if Gemini is currently streaming / generating a response.
   */
  isStreaming(): boolean {
    if (typeof document === 'undefined') return false;
    return this.findElement(GEMINI_SELECTORS.streamingIndicator) !== null;
  }

  /**
   * Extracts conversation title from DOM landmarks or document.title.
   */
  extractTitle(): string {
    if (typeof document === 'undefined') return 'Untitled Conversation';
    const titleEl = this.findElement<HTMLElement>(GEMINI_SELECTORS.sessionTitle);
    if (titleEl && titleEl.textContent?.trim()) {
      return TextSanitizer.cleanTitle(titleEl.textContent.trim());
    }
    return TextSanitizer.cleanTitle(document.title || '');
  }

  /**
   * Extracts Gemini conversation ID from URL path (e.g. /app/4f1e56a7bc) or DOM landmark.
   */
  extractConversationId(): string {
    const reservedRoutes = new Set(['new', 'activity', 'settings', 'help', 'faq', 'share', 'updates', 'prompt']);

    if (typeof window !== 'undefined' && window.location) {
      const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1] && !reservedRoutes.has(match[1].toLowerCase())) {
        return match[1];
      }
    }

    if (typeof document !== 'undefined') {
      const domEl = document.querySelector('[data-conversation-id]');
      const id = domEl?.getAttribute('data-conversation-id')?.trim();
      if (id && !reservedRoutes.has(id.toLowerCase())) {
        return id;
      }
    }

    return '';
  }

  /**
   * Enumerates conversation history from the Gemini sidebar.
   */
  async enumerateConversations(signal?: AbortSignal): Promise<DiscoveredConversation[]> {
    if (typeof document === 'undefined' || signal?.aborted) return [];
    const selector = GEMINI_SELECTORS.sidebarItem.join(', ');
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(selector));
    const seen = new Set<string>();
    const results: DiscoveredConversation[] = [];
    const reservedRoutes = new Set(['new', 'activity', 'settings', 'help', 'faq', 'share', 'updates']);

    for (const link of links) {
      if (signal?.aborted) break;
      const href = link.getAttribute('href') || link.href || '';
      const match = href.match(/\/app\/([a-zA-Z0-9_-]+)/i);
      const conversationId = (match && match[1]) ? match[1] : link.getAttribute('data-conversation-id') || '';

      if (!conversationId || reservedRoutes.has(conversationId.toLowerCase()) || seen.has(conversationId)) {
        continue;
      }
      seen.add(conversationId);

      const title = TextSanitizer.cleanTitle(link.textContent?.trim() || '');
      const url = href.startsWith('http')
        ? href
        : `https://gemini.google.com/${href.replace(/^\/+/, '')}`;

      results.push({
        site: 'gemini',
        conversationId,
        url,
        title: title || `Conversation ${conversationId}`
      });
    }

    return results;
  }


  /**
   * Safely checks if an element is a form input/textarea across both browser and Node/mock environments.
   */
  private isFormInputElement(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
    const isTextarea =
      (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) ||
      el.tagName === 'TEXTAREA';
    const isInput =
      (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) ||
      el.tagName === 'INPUT';
    return isTextarea || isInput;
  }

  /**
   * Extracts text from turn nodes, prioritizing inner text content nodes if present.
   */
  private extractTurnText(node: HTMLElement): string {
    const inner = node.querySelector<HTMLElement>('.query-text, .model-response-text');
    if (inner && inner.textContent?.trim()) {
      return inner.textContent.trim();
    }
    return node.textContent?.trim() || '';
  }

  /**
   * Dispatches synthetic input and change events to notify Angular/Quill of external edits.
   */
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
