import { BaseChatbotAdapter } from '../base.adapter';
import { CLAUDE_SELECTORS } from './selectors';
import { ClaudeTurnScraper, stripArtifactWidgetChrome } from './turn-scraper';
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
 * Platform adapter for Anthropic Claude (claude.ai).
 * Handles ProseMirror composer input, capture-phase submission interception,
 * 2-row CSS Grid turn scraping (.row-start-1 thinking vs .row-start-2 response),
 * artifact card chrome sanitization (Clio #43), Clio edge case #39 protection,
 * Clio edge case #37 thinking-only tagging, and dual REST/DOM conversation enumeration.
 */
export class ClaudeAdapter extends BaseChatbotAdapter implements IChatbotAdapter, IHarvesterAdapter {
  readonly platform = 'claude' as const;

  /**
   * Guard flag to prevent infinite refinement loops during programmatic submission.
   */
  public skipNextRefinement = false;

  matches(hostname: string): boolean {
    return hostname.includes('claude.ai');
  }

  getActiveInput(): HTMLElement | null {
    return this.findElement<HTMLElement>(CLAUDE_SELECTORS.input);
  }

  getSubmitButton(): HTMLElement | null {
    return this.findElement<HTMLElement>(CLAUDE_SELECTORS.submitButton);
  }

  getSelectors(): typeof CLAUDE_SELECTORS {
    return CLAUDE_SELECTORS;
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';

    if (this.isFormInputElement(input)) {
      return (input as HTMLTextAreaElement | HTMLInputElement).value || '';
    }

    // ProseMirror rich text composer: paragraphs inside <p>
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

    // ProseMirror rich text container: format as paragraph nodes
    const paragraphs = text
      .split('\n')
      .map(line => `<p>${line.length > 0 ? this.escapeHtml(line) : '<br>'}</p>`)
      .join('');

    input.innerHTML = paragraphs;
    if (!input.textContent && text) {
      input.textContent = text;
    }

    this.dispatchInputEvents(input, text);
    return true;
  }

  /**
   * Claude user message bubble is narrow; walk up to wide parent row container.
   * Stops before document body or main, and verifies positive offsetWidth.
   */
  resolveAnchor(element: HTMLElement): HTMLElement {
    let current: HTMLElement | null = element;
    while (
      current &&
      current.parentElement &&
      current.parentElement !== document.body &&
      current.parentElement.tagName !== 'MAIN' &&
      current.offsetWidth > 0 &&
      current.offsetWidth < 500
    ) {
      current = current.parentElement;
    }
    return current || element;
  }

  /**
   * Intercepts message submission (Enter keydown or Send click) in the capture phase,
   * allowing prompt refinement before ProseMirror / React consumes the event.
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

      let proceed = false;
      try {
        proceed = await onRefine(text);
      } catch {
        proceed = true; // Fail open on error
      }

      if (proceed) {
        this.skipNextRefinement = true;
        const currentSubmitBtn = this.getSubmitButton();
        if (currentSubmitBtn && typeof currentSubmitBtn.click === 'function') {
          currentSubmitBtn.click();
        } else {
          const currentInput = this.getActiveInput();
          const evt = typeof KeyboardEvent !== 'undefined'
            ? new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
            : ({ type: 'keydown', key: 'Enter', bubbles: true, cancelable: true } as any);
          currentInput?.dispatchEvent(evt);
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

      let proceed = false;
      try {
        proceed = await onRefine(text);
      } catch {
        proceed = true; // Fail open on error
      }

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
   * Scrapes completed conversation turns for real-time persona analysis.
   * Filters out ancestor wrapper containers and cross-role enclosures to prevent duplicate turns.
   */
  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];
    const userSelector = CLAUDE_SELECTORS.userMessage.join(', ');
    const assistantSelector = CLAUDE_SELECTORS.assistantMessage.join(', ');

    const rawUser = Array.from(document.querySelectorAll<HTMLElement>(userSelector));
    const rawAssistant = Array.from(document.querySelectorAll<HTMLElement>(assistantSelector));

    const userFiltered = rawUser.filter(
      u => !rawUser.some(other => other !== u && u.contains(other))
    );
    const assistantFiltered = rawAssistant.filter(
      a => !rawAssistant.some(other => other !== a && a.contains(other))
    );

    let combined = [
      ...userFiltered.map(el => ({ el, role: 'user' as const })),
      ...assistantFiltered.map(el => ({ el, role: 'assistant' as const }))
    ];

    // Filter out cross-container enclosures (e.g. outer wrapper containing another candidate)
    combined = combined.filter(
      c => !combined.some(other => other !== c && c.el.contains(other.el))
    );

    combined.sort((a, b) => {
      if (typeof a.el.compareDocumentPosition === 'function') {
        const pos = a.el.compareDocumentPosition(b.el);
        if (pos & 4) return -1;
        if (pos & 2) return 1;
      }
      return 0;
    });

    combined.forEach(({ el, role }, index) => {
      let content = '';
      if (role === 'assistant') {
        const bodyEl = el.querySelector<HTMLElement>('.row-start-2, .font-claude-response-body');
        content = bodyEl?.textContent?.trim() || el.textContent?.trim() || '';
      } else {
        content = el.textContent?.trim() || '';
      }

      turns.push({
        id: el.getAttribute('data-message-id') || `claude-${index}`,
        role,
        content,
        timestamp: Date.now()
      });
    });

    return turns;
  }

  // --- IHarvesterAdapter Implementation ---

  /**
   * Locates the primary scrolling conversation container in the Claude DOM.
   */
  getScrollContainer(): HTMLElement | null {
    const scroller = findScrollContainer({
      selectors: CLAUDE_SELECTORS.scrollContainer,
      conversationContainer: this.findElement<HTMLElement>(CLAUDE_SELECTORS.conversationContainer)
    });
    if (scroller) return scroller;
    return this.findElement<HTMLElement>(CLAUDE_SELECTORS.scrollContainer);
  }

  /**
   * Returns selector string for Claude loading indicators / generation progress.
   */
  getLoadingIndicatorSelector(): string | null {
    return CLAUDE_SELECTORS.loadingIndicator.join(', ');
  }

  /**
   * Returns list of selector strings for expandable sections (e.g. thinking toggles).
   */
  getExpandButtonSelectors(): string[] {
    return Array.from(CLAUDE_SELECTORS.expandButton);
  }

  /**
   * Claude maintains conversation turns in the DOM without aggressive recycling/unmounting.
   */
  requiresVirtualizationCache(): boolean {
    return false;
  }

  /**
   * Scrapes structured conversation turns with 2-row CSS Grid separation,
   * thinking / CoT isolation, tool use pill harvesting, and image attachments.
   */
  async scrapeHarvestTurns(): Promise<HarvestTurn[]> {
    return ClaudeTurnScraper.scrapeTurns({ adapter: this });
  }

  /**
   * Strips artifact widget chrome, internal buttons, and adds whitespace padding after <label> (Clio #43).
   */
  stripArtifactWidgetChrome(clonedNode: HTMLElement): void {
    stripArtifactWidgetChrome(clonedNode);
  }

  /**
   * Sanitizes cloned turn nodes:
   * - Strips artifact widget chrome (Clio #43)
   * - Strips interactive buttons, action bars, copy/retry buttons, and svg icons
   * - Preserves response content and nested .row-start-1 inside .row-start-2 (Clio #39)
   */
  sanitizeTurnNode(clonedNode: HTMLElement): void {
    if (!clonedNode || typeof clonedNode.querySelectorAll !== 'function') return;

    // 1. Strip artifact widget chrome & pad labels (Clio #43)
    this.stripArtifactWidgetChrome(clonedNode);

    // 2. Strip interactive UI chrome (action bars, buttons, icons, feedback widgets)
    const junk = clonedNode.querySelectorAll(
      [
        '.message-actions',
        'message-actions',
        '.action-bar',
        'button[aria-label*="Copy" i]',
        'button[aria-label*="Retry" i]',
        'button',
        'svg',
        '[role="button"]'
      ].join(', ')
    );
    junk.forEach(node => node.remove());
  }

  /**
   * Returns true if Claude is currently streaming / generating a response.
   */
  isStreaming(): boolean {
    if (typeof document === 'undefined') return false;
    return this.findElement(CLAUDE_SELECTORS.streamingIndicator) !== null;
  }

  /**
   * Extracts conversation title from page landmarks or document.title.
   */
  extractTitle(): string {
    if (typeof document === 'undefined') return 'Untitled Conversation';
    const titleEl = document.querySelector(
      '[data-testid="conversation-title"], [data-testid="chat-title"], button[data-testid="chat-title-button"], h1, main h1'
    );
    if (titleEl && titleEl.textContent?.trim()) {
      const candidate = TextSanitizer.cleanTitle(titleEl.textContent.trim());
      if (candidate && candidate !== 'Untitled Conversation') {
        return candidate;
      }
    }
    return TextSanitizer.cleanTitle(document.title || '');
  }

  /**
   * Extracts Claude conversation ID from URL path or hash (e.g. /chat/b8e62d40-f1c5-4d2b-9800-47b2ff639ab9).
   */
  extractConversationId(): string {
    if (typeof window !== 'undefined' && window.location) {
      const urlPath = (window.location.pathname || '') + (window.location.hash || '');
      const match = urlPath.match(/\/chat\/([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        return match[1];
      }
    }

    if (typeof document !== 'undefined') {
      const activeContainer = document.querySelector(
        '[data-testid="conversation-list-item"][aria-current="page"], [data-testid="conversation-list-item"][data-is-active="true"], a[href*="/chat/"][aria-current="page"], a[href*="/chat/"][data-is-active="true"]'
      );
      if (activeContainer) {
        const link = (activeContainer.tagName === 'A'
          ? activeContainer
          : activeContainer.querySelector('a')) as HTMLAnchorElement | null;
        const href = link?.getAttribute('href') || link?.href || activeContainer.getAttribute('href') || '';
        const match = href.match(/\/chat\/([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          return match[1];
        }
      }
    }

    return '';
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
   * Expands all collapsed thinking sections and tool use toggles.
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
   * Enumerates conversation history from Claude:
   * 1. Fast-path: query Claude's internal REST API (/api/organizations/{org}/chat_conversations) in 100-item chunks.
   * 2. Fallback: sidebar DOM scroll on [data-testid="conversation-list-item"] or a[href*="/chat/"].
   */
  async enumerateConversations(signal?: AbortSignal): Promise<DiscoveredConversation[]> {
    if (typeof document === 'undefined' || signal?.aborted) return [];

    // 1. Fast-path: Claude's internal REST API
    try {
      const apiResults = await this.enumerateViaRestApi(signal);
      if (apiResults && apiResults.length > 0) {
        return apiResults;
      }
    } catch {
      // Graceful fallback to DOM sidebar inspection
    }

    // 2. Fallback: sidebar DOM scraping
    return this.enumerateViaDom(signal);
  }

  private async enumerateViaRestApi(signal?: AbortSignal): Promise<DiscoveredConversation[]> {
    if (typeof fetch !== 'function') return [];

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://claude.ai';

    // Step 1: Resolve organization ID
    let orgId = '';

    // Check cookie
    if (typeof document !== 'undefined' && document.cookie) {
      const match = document.cookie.match(/lastActiveOrg=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        orgId = match[1];
      }
    }

    // Query /api/organizations if not in cookie
    if (!orgId) {
      try {
        const orgRes = await fetch(`${origin}/api/organizations`, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal
        });
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          const orgList = Array.isArray(orgData) ? orgData : (orgData?.organizations || []);
          const activeOrg = orgList.find((o: any) => o.is_active || o.active) || orgList[0];
          orgId = activeOrg?.uuid || activeOrg?.id || '';
        }
      } catch {
        return [];
      }
    }

    if (!orgId) return [];

    // Step 2: Fetch chat conversations in 100-item chunks
    const discovered: DiscoveredConversation[] = [];
    const seen = new Set<string>();
    let beforeId: string | null = null;
    const maxPages = 50;

    for (let page = 0; page < maxPages; page++) {
      if (signal?.aborted) break;

      try {
        let url = `${origin}/api/organizations/${orgId}/chat_conversations?limit=100`;
        if (beforeId) {
          url += `&before_id=${encodeURIComponent(beforeId)}`;
        }

        const res = await fetch(url, {
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal
        });

        if (!res.ok) break;

        const json = await res.json();
        const items = Array.isArray(json)
          ? json
          : (Array.isArray(json?.conversations)
            ? json.conversations
            : (Array.isArray(json?.data) ? json.data : []));

        if (!Array.isArray(items) || items.length === 0) break;

        for (const item of items) {
          const id = item.uuid || item.id;
          if (!id || seen.has(id)) continue;
          seen.add(id);

          const rawTitle = item.name || item.title || item.summary || '';
          const title = TextSanitizer.cleanTitle(rawTitle) || `Conversation ${id}`;

          discovered.push({
            site: 'claude',
            conversationId: id,
            url: `${origin}/chat/${id}`,
            title
          });
        }

        if (items.length < 100) break;

        const lastItem = items[items.length - 1];
        const nextBeforeId = lastItem?.uuid || lastItem?.id || null;
        if (!nextBeforeId || nextBeforeId === beforeId) break;
        beforeId = nextBeforeId;
      } catch {
        // Stop pagination on error and preserve already discovered items from earlier pages
        break;
      }
    }

    return discovered;
  }

  private enumerateViaDom(signal?: AbortSignal): DiscoveredConversation[] {
    if (typeof document === 'undefined' || signal?.aborted) return [];

    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://claude.ai';

    const selector = CLAUDE_SELECTORS.sidebarItem.join(', ');
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const seen = new Set<string>();
    const results: DiscoveredConversation[] = [];

    for (const el of elements) {
      if (signal?.aborted) break;

      const link = (el.tagName === 'A' ? el : el.querySelector('a')) as HTMLAnchorElement | null;
      const href = link?.getAttribute('href') || link?.href || el.getAttribute('href') || '';
      const match = href.match(/\/chat\/([a-zA-Z0-9_-]+)/i);
      const conversationId = match?.[1] || '';

      if (!conversationId || seen.has(conversationId)) continue;
      seen.add(conversationId);

      // Clone link or element and remove internal action buttons/SVGs before extracting title text
      const targetEl = (link || el).cloneNode(true) as HTMLElement;
      try {
        const junk = targetEl.querySelectorAll('button, svg, [role="button"], [aria-hidden="true"]');
        junk.forEach(n => n.remove());
      } catch {
        // ignore
      }

      const rawTitle = targetEl.textContent?.trim() || '';
      const title = TextSanitizer.cleanTitle(rawTitle) || `Conversation ${conversationId}`;
      const url = href.startsWith('http') ? href : `${origin}/chat/${conversationId}`;

      results.push({
        site: 'claude',
        conversationId,
        url,
        title
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
