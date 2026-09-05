/**
 * Structured Container Pairing Engine for Google Gemini SPA.
 * Handles pairing of <user-query> and <model-response> elements enclosed within
 * .conversation-container, cleanly isolating Chain-of-Thought (thinking) traces,
 * code blocks, and embedded images.
 */

import { GEMINI_SELECTORS } from './selectors';
import { TextSanitizer } from '../../../core/harvest/extraction/text-sanitizer';
import type { HarvestTurn, HarvestAttachment } from '../../../core/harvest/types';
import type { IHarvesterAdapter } from '../types';

export interface GeminiPairingOptions {
  root?: Document | HTMLElement;
  isolateThinking?: boolean;
  adapter?: IHarvesterAdapter;
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

function matchesSimple(el: HTMLElement, selector: string): boolean {
  if (typeof (el as any).matches === 'function') {
    try {
      return (el as any).matches(selector);
    } catch {
      // Ignore
    }
  }
  const tag = el.tagName?.toLowerCase();
  const sel = selector.trim().toLowerCase();
  if (tag === sel) return true;
  if (sel.startsWith('.') && el.classList?.contains(sel.slice(1))) return true;
  return false;
}

export class GeminiContainerPairer {
  /**
   * Scrapes and pairs all conversation turns from the Gemini DOM.
   */
  static pairTurns(options: GeminiPairingOptions = {}): HarvestTurn[] {
    const root = options.root || (typeof document !== 'undefined' ? document : null);
    if (!root) return [];

    const isolateThinking = options.isolateThinking ?? true;
    const adapter = options.adapter;
    const turns: HarvestTurn[] = [];

    // 1. Try structured container strategy (.conversation-container, ms-chat-turn)
    const containerSelectors = GEMINI_SELECTORS.conversationContainer.join(', ');
    const rawContainers = Array.from(root.querySelectorAll<HTMLElement>(containerSelectors));

    // Crucial: filter out ancestor wrapper containers (e.g. div[data-conversation-id])
    // that contain other matched containers, keeping only the innermost turn containers.
    const innermostContainers = rawContainers.filter(
      c => !rawContainers.some(other => other !== c && c.contains(other))
    );

    if (innermostContainers.length > 0) {
      let turnIndex = 0;
      let userCount = 0;
      let assistantCount = 0;

      const userQuerySelector = GEMINI_SELECTORS.userQuery.join(', ');
      const modelResponseSelector = GEMINI_SELECTORS.responseContainer.join(', ');

      for (const container of innermostContainers) {
        // Collect all user queries inside container
        let userNodes = Array.from(container.querySelectorAll<HTMLElement>(userQuerySelector));
        if (userNodes.length === 0) {
          for (const uSel of GEMINI_SELECTORS.userQuery) {
            if (matchesSimple(container, uSel)) {
              userNodes = [container];
              break;
            }
          }
        }
        userNodes = userNodes.filter(
          node => !userNodes.some(other => other !== node && other.contains(node))
        );

        // Collect all model responses inside container
        let modelNodes = Array.from(container.querySelectorAll<HTMLElement>(modelResponseSelector));
        if (modelNodes.length === 0) {
          for (const mSel of GEMINI_SELECTORS.responseContainer) {
            if (matchesSimple(container, mSel)) {
              modelNodes = [container];
              break;
            }
          }
        }
        modelNodes = modelNodes.filter(
          node => !modelNodes.some(other => other !== node && other.contains(node))
        );

        // Standard 1:1 pair (User -> Assistant)
        if (userNodes.length === 1 && modelNodes.length === 1) {
          turns.push(this.extractUserTurn(userNodes[0]!, turnIndex++, userCount++, adapter));
          turns.push(
            this.extractAssistantTurn(
              modelNodes[0]!,
              turnIndex++,
              assistantCount++,
              isolateThinking,
              adapter
            )
          );
        } else if (userNodes.length > 0 || modelNodes.length > 0) {
          // Multiple turns or unilateral turns within container: sort in document DOM order
          const allTurnsInContainer = [
            ...userNodes.map(node => ({ node, role: 'user' as const })),
            ...modelNodes.map(node => ({ node, role: 'assistant' as const }))
          ].sort((a, b) => compareDomOrder(a.node, b.node));

          for (const item of allTurnsInContainer) {
            if (item.role === 'user') {
              turns.push(this.extractUserTurn(item.node, turnIndex++, userCount++, adapter));
            } else {
              turns.push(
                this.extractAssistantTurn(
                  item.node,
                  turnIndex++,
                  assistantCount++,
                  isolateThinking,
                  adapter
                )
              );
            }
          }
        }
      }

      if (turns.length > 0) {
        return turns;
      }
    }

    // 2. Fallback: Sequential pairing sorted by DOM order for flat or legacy DOM structures
    return this.fallbackPairTurns(root, isolateThinking, adapter);
  }

  /**
   * Extracts a user turn with attachments, sanitized text, and adapter node cleanup.
   */
  static extractUserTurn(
    element: HTMLElement,
    turnIndex: number,
    sequenceNum: number,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    const images = this.findImages(element, turnIndex);

    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
      adapter.sanitizeTurnNode(cloned);
    }

    const content = TextSanitizer.extractTextContent(cloned);

    return {
      id: `gemini-u-${sequenceNum}`,
      turnIndex,
      role: 'user',
      content,
      rawText: element.textContent?.trim() || '',
      attachments: images.length > 0 ? images : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * Extracts an assistant turn with thinking isolation, model slug, attachments, and adapter node cleanup.
   */
  static extractAssistantTurn(
    element: HTMLElement,
    turnIndex: number,
    sequenceNum: number,
    isolateThinking: boolean,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    // 1. Extract thinking traces
    let thinking: string | null = null;
    const thinkingSelector = GEMINI_SELECTORS.thinkingContent.join(', ');
    const thinkingEl = element.querySelector<HTMLElement>(thinkingSelector);

    if (thinkingEl) {
      const thinkingText = TextSanitizer.extractTextContent(thinkingEl);
      if (thinkingText.trim()) {
        thinking = thinkingText.trim();
      }
    }

    // 2. Extract embedded images
    const images = this.findImages(element, turnIndex);

    // 3. Clone node to sanitize body without mutating live DOM
    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    // If isolating thinking, strip the ENTIRE thinking container/headers/toggles from cloned response body
    if (isolateThinking && typeof cloned.querySelectorAll === 'function') {
      const thinkingWrappers = cloned.querySelectorAll(
        GEMINI_SELECTORS.thinkingContainer.join(', ') + ', ' + thinkingSelector
      );
      thinkingWrappers.forEach(node => node.remove());

      const toggleSelector = GEMINI_SELECTORS.thinkingToggle.join(', ');
      const clonedToggles = cloned.querySelectorAll(toggleSelector);
      clonedToggles.forEach(node => node.remove());
    }

    // Run adapter-specific turn sanitizer if available
    if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
      adapter.sanitizeTurnNode(cloned);
    }

    // 4. Extract sanitized content
    const content = TextSanitizer.extractTextContent(cloned);

    // 5. Extract model slug / name if available
    const modelSlug = this.extractModelSlug(element);

    return {
      id: `gemini-a-${sequenceNum}`,
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
   * Fallback for legacy or flat DOM structures where turns are not wrapped in containers.
   */
  private static fallbackPairTurns(
    root: Document | HTMLElement,
    isolateThinking: boolean,
    adapter?: IHarvesterAdapter
  ): HarvestTurn[] {
    const turns: HarvestTurn[] = [];

    const userSelector = GEMINI_SELECTORS.userQuery.join(', ');
    let userNodes = Array.from(root.querySelectorAll<HTMLElement>(userSelector));
    userNodes = userNodes.filter(
      node => !userNodes.some(other => other !== node && other.contains(node))
    );

    const modelSelector = GEMINI_SELECTORS.responseContainer.join(', ');
    let modelNodes = Array.from(root.querySelectorAll<HTMLElement>(modelSelector));
    modelNodes = modelNodes.filter(
      node => !modelNodes.some(other => other !== node && other.contains(node))
    );

    const allNodes = [
      ...userNodes.map(node => ({ node, role: 'user' as const })),
      ...modelNodes.map(node => ({ node, role: 'assistant' as const }))
    ].sort((a, b) => compareDomOrder(a.node, b.node));

    let turnIndex = 0;
    let userCount = 0;
    let assistantCount = 0;

    for (const item of allNodes) {
      if (item.role === 'user') {
        turns.push(this.extractUserTurn(item.node, turnIndex++, userCount++, adapter));
      } else {
        turns.push(
          this.extractAssistantTurn(
            item.node,
            turnIndex++,
            assistantCount++,
            isolateThinking,
            adapter
          )
        );
      }
    }

    return turns;
  }

  /**
   * Discovers relevant images inside a message turn.
   * Deduplicates multiple references to the same src and filters out UI icons/avatars.
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

      // Filter out icons, avatars, logo, presentation SVGs
      const isUiIcon =
        ariaHidden ||
        role === 'presentation' ||
        src.includes('profile') ||
        src.includes('avatar') ||
        src.includes('sparkle') ||
        src.includes('google_logo') ||
        src.includes('favicon') ||
        cls.includes('avatar') ||
        cls.includes('icon') ||
        alt.includes('avatar') ||
        alt.includes('profile') ||
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
   * Attempts to discover the Gemini model identifier from the DOM.
   */
  static extractModelSlug(element: HTMLElement): string | null {
    // Check data attributes on element
    const dataModel =
      element.getAttribute('data-model') ||
      element.getAttribute('data-model-name') ||
      element.getAttribute('data-model-slug');
    if (dataModel) return dataModel;

    // Check mode switcher in parent or page
    if (typeof document !== 'undefined') {
      const modeSwitcher = document.querySelector('bard-mode-switcher, .model-picker-container, [data-model-slug]');
      if (modeSwitcher) {
        const attrSlug = modeSwitcher.getAttribute('data-model-slug');
        if (attrSlug) return attrSlug;
        if (modeSwitcher.textContent?.trim()) {
          return modeSwitcher.textContent.trim();
        }
      }
    }

    return null;
  }
}
