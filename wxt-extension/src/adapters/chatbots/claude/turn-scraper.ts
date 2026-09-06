/**
 * Structured Turn Scraper for Anthropic Claude SPA (claude.ai).
 * Handles Claude's 2-row CSS Grid layout (.row-start-1 vs .row-start-2),
 * thinking / reasoning trace extraction, tool use pill harvesting,
 * markdown code fence preservation, artifact chrome stripping,
 * Clio edge case #39 (nested .row-start-1 protection),
 * and Clio edge case #37 (empty-body reasoning tagged as 'thinking-only').
 */

import { CLAUDE_SELECTORS, queryAllMatching } from './selectors';
import { TextSanitizer } from '../../../core/harvest/extraction/text-sanitizer';
import type { HarvestTurn, HarvestAttachment } from '../../../core/harvest/types';
import type { IHarvesterAdapter } from '../types';

export interface ClaudeScraperOptions {
  root?: Document | HTMLElement | null;
  adapter?: IHarvesterAdapter;
}

/**
 * Compares two DOM elements to determine their natural document tree order.
 */
function compareDomOrder(a: Element | HTMLElement, b: Element | HTMLElement): number {
  if (a === b) return 0;
  if (typeof a.compareDocumentPosition === 'function') {
    const pos = a.compareDocumentPosition(b);
    if (pos & 4 /* Node.DOCUMENT_POSITION_FOLLOWING */) return -1;
    if (pos & 2 /* Node.DOCUMENT_POSITION_PRECEDING */) return 1;
  }
  return 0;
}

/**
 * Strips interactive chrome from Claude artifact cards (Clio #43):
 * - Targets .font-ui.rounded-2xl.rounded-t-3xl artifact cards
 * - Strips internal <button> elements ("Send via Gmail", tabs, copy, preview) and interactive tab roles
 * - Adds whitespace padding after <label> elements to prevent text run-on collisions
 */
export function stripArtifactWidgetChrome(root: HTMLElement): void {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  const cardSelectors = [
    '.font-ui.rounded-2xl.rounded-t-3xl',
    '[class*="rounded-2xl"][class*="rounded-t-3xl"]',
    '.font-ui[class*="rounded-2xl"]',
    '[data-testid*="artifact"]'
  ].join(', ');

  const artifactCards: HTMLElement[] = Array.from(root.querySelectorAll<HTMLElement>(cardSelectors));

  // Also process root itself if it is an artifact card
  if (root.classList) {
    const isSelf =
      (root.classList.contains('font-ui') &&
        (root.classList.contains('rounded-2xl') || root.classList.contains('rounded-t-3xl'))) ||
      root.getAttribute('data-testid')?.includes('artifact');
    if (isSelf && !artifactCards.includes(root)) {
      artifactCards.unshift(root);
    }
  }

  for (const card of artifactCards) {
    // 1. Strip internal button chrome (Send via Gmail, Copy, tabs, etc.)
    const buttons = Array.from(
      card.querySelectorAll<HTMLButtonElement>('button, [role="button"], [role="tab"], .tab')
    );
    for (const btn of buttons) {
      btn.remove();
    }

    // 2. Add whitespace padding after <label> elements to prevent text concatenation (Clio #43)
    const labels = Array.from(card.querySelectorAll<HTMLLabelElement>('label'));
    for (const label of labels) {
      if (label.textContent && !/\s$/.test(label.textContent)) {
        label.textContent = `${label.textContent} `;
      }
      if (label.nextSibling) {
        if (label.nextSibling.nodeType === 3 /* Node.TEXT_NODE */) {
          const text = label.nextSibling.nodeValue || '';
          if (text && !/^\s/.test(text)) {
            label.nextSibling.nodeValue = ` ${text}`;
          }
        } else if (typeof label.insertAdjacentText === 'function') {
          try {
            label.insertAdjacentText('afterend', ' ');
          } catch {
            // Ignore in mock DOM
          }
        }
      }
    }
  }
}

export class ClaudeTurnScraper {
  /**
   * Scrapes all conversation turns from the Claude DOM in strict document order.
   * Unions candidate selectors across user and assistant messages to reliably capture
   * mixed-variant turns while filtering outer wrapper enclosures.
   */
  static scrapeTurns(options: ClaudeScraperOptions = {}): HarvestTurn[] {
    const root = options.root || (typeof document !== 'undefined' ? document : null);
    if (!root) return [];

    const adapter = options.adapter;

    // 1. Query candidate user and assistant elements matching ANY selector strategy
    const rawUserNodes = queryAllMatching<HTMLElement>(CLAUDE_SELECTORS.userMessage, root);
    const rawAssistantNodes = queryAllMatching<HTMLElement>(CLAUDE_SELECTORS.assistantMessage, root);

    // Filter out ancestor wrapper containers to retain only innermost message elements
    const userNodes = rawUserNodes.filter(
      u => !rawUserNodes.some(other => other !== u && u.contains(other))
    );

    const assistantNodes = rawAssistantNodes.filter(
      a => !rawAssistantNodes.some(other => other !== a && a.contains(other))
    );

    // 2. Combine and sort all message nodes in strict DOM document order
    let allCandidates: { el: HTMLElement; isUser: boolean }[] = [
      ...userNodes.map(el => ({ el, isUser: true })),
      ...assistantNodes.map(el => ({ el, isUser: false }))
    ];

    // Filter out cross-container enclosures (e.g. outer wrapper containing another candidate)
    allCandidates = allCandidates.filter(
      c => !allCandidates.some(other => other !== c && c.el.contains(other.el))
    );

    allCandidates.sort((a, b) => compareDomOrder(a.el, b.el));

    if (allCandidates.length === 0) {
      return [];
    }

    // 3. Process candidate elements into HarvestTurns
    const rawTurns: HarvestTurn[] = [];

    allCandidates.forEach(({ el, isUser }, index) => {
      const messageId = this.resolveMessageId(el, isUser ? 'user' : 'assistant', index);

      if (isUser) {
        rawTurns.push(this.extractUserTurn(el, index, messageId, adapter));
      } else {
        rawTurns.push(this.extractAssistantTurn(el, index, messageId, adapter));
      }
    });

    // 4. Stably re-index turnIndex sequentially (0, 1, 2, ...)
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
    const images = this.findImages(element, turnIndex);

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
   * Extracts an assistant turn using Claude's 2-row CSS Grid architecture.
   * Isolates thinking/reasoning trace and tool use pills from .row-start-1.
   * Extracts response markdown from .row-start-2, preserving code fences via TextSanitizer.
   * Protects against nested .row-start-1 inside .row-start-2 (Clio #39).
   * Tags empty-body reasoning turns as type: 'thinking-only' (Clio #37).
   */
  static extractAssistantTurn(
    element: HTMLElement,
    turnIndex: number,
    messageId: string,
    adapter?: IHarvesterAdapter
  ): HarvestTurn {
    // 1. Locate Row 2 (Response body) candidates and Row 1 (Thinking) nodes
    // Clio #39: Normal Claude responses use .row-start-1.col-start-1 inside .row-start-2!
    // A valid thinking Row 1 must NEVER be inside row2 (or .font-claude-response-body).
    const allRow1 = Array.from(element.querySelectorAll<HTMLElement>('.row-start-1'));
    const row1Nodes = allRow1.filter(
      node =>
        !node.closest('.row-start-2') &&
        !node.closest('.font-claude-response-body')
    );

    // 2. Extract Tool Use Buttons from row1 containers (or outside response)
    const toolButtonSelector = CLAUDE_SELECTORS.toolUseButton.join(', ');
    const toolButtonsSet = new Set<HTMLElement>();

    if (row1Nodes.length > 0) {
      for (const r of row1Nodes) {
        if (r.matches && CLAUDE_SELECTORS.toolUseButton.some(sel => { try { return r.matches(sel); } catch { return false; } })) {
          toolButtonsSet.add(r);
        }
        try {
          r.querySelectorAll<HTMLElement>(toolButtonSelector).forEach(b => toolButtonsSet.add(b));
        } catch {
          // ignore
        }
      }
    } else {
      try {
        element.querySelectorAll<HTMLElement>(toolButtonSelector).forEach(b => {
          if (!b.closest('.row-start-2') && !b.closest('.font-claude-response-body')) {
            toolButtonsSet.add(b);
          }
        });
      } catch {
        // ignore
      }
    }

    const toolButtons = Array.from(toolButtonsSet);
    const toolPills = toolButtons
      .map(b => b.textContent?.replace(/\s+/g, ' ').trim() || '')
      .filter(Boolean);

    // 3. Extract Thinking trace
    let thinkingText = '';
    if (row1Nodes.length > 0) {
      const thinkingParts: string[] = [];
      for (const rNode of row1Nodes) {
        const isSelfTool =
          rNode.matches &&
          CLAUDE_SELECTORS.toolUseButton.some(sel => {
            try {
              return rNode.matches(sel);
            } catch {
              return false;
            }
          });

        if (isSelfTool) {
          const btnText = rNode.textContent?.replace(/\s+/g, ' ').trim() || '';
          if (btnText) {
            const formatted = btnText.startsWith('[Tool]:') ? btnText : `[Tool]: ${btnText}`;
            thinkingParts.push(formatted);
          }
          continue;
        }

        const clonedR = typeof rNode.cloneNode === 'function'
          ? (rNode.cloneNode(true) as HTMLElement)
          : rNode;

        // In cloned thinking container, replace tool use buttons in-place with formatted tool markers
        // so that TextSanitizer won't strip them and chronological order is preserved!
        if (typeof clonedR.querySelectorAll === 'function') {
          for (const sel of CLAUDE_SELECTORS.toolUseButton) {
            try {
              clonedR.querySelectorAll<HTMLElement>(sel).forEach(btn => {
                const btnText = btn.textContent?.replace(/\s+/g, ' ').trim();
                if (btnText) {
                  const marker = clonedR.ownerDocument?.createElement('div') ||
                    (typeof document !== 'undefined' ? document.createElement('div') : null);
                  if (marker) {
                    marker.textContent = btnText.startsWith('[Tool]:') ? btnText : `[Tool]: ${btnText}`;
                    if (typeof btn.replaceWith === 'function') {
                      btn.replaceWith(marker);
                    } else if (btn.parentNode) {
                      btn.parentNode.replaceChild(marker, btn);
                    }
                  }
                }
              });
            } catch {
              // ignore
            }
          }
        }

        const part = TextSanitizer.extractTextContent(clonedR);
        if (part) {
          thinkingParts.push(part);
        }
      }
      thinkingText = thinkingParts.join('\n\n');
    }

    // Safety fallback: if any tool pill was outside row1Nodes and missing from thinkingText, append it
    if (toolPills.length > 0) {
      const missingPills = toolPills.filter(pill => !thinkingText.includes(pill));
      if (missingPills.length > 0) {
        const formattedTools = missingPills
          .map(p => (p.startsWith('[Tool]:') ? p : `[Tool]: ${p}`))
          .join('\n');
        thinkingText = thinkingText
          ? `${thinkingText}\n${formattedTools}`
          : formattedTools;
      }
    }

    const thinking = thinkingText.trim() || null;

    // 4. Resolve response body elements
    // Query all explicit response body candidates (.row-start-2, .font-claude-response-body)
    const rawRow2Nodes = Array.from(
      element.querySelectorAll<HTMLElement>('.row-start-2, .font-claude-response-body')
    );

    // Filter out candidates that are inside any row1Nodes
    let row2Nodes = rawRow2Nodes.filter(
      r2 => !row1Nodes.some(r1 => r1.contains(r2))
    );

    // Filter out nested enclosures so we keep top-level response elements
    row2Nodes = row2Nodes.filter(
      r2 => !row2Nodes.some(other => other !== r2 && other.contains(r2))
    );

    // Fallback: if no explicit .row-start-2 or .font-claude-response-body, search siblings of row1 inside common parent
    if (row2Nodes.length === 0 && row1Nodes.length > 0) {
      const parent = row1Nodes[0]?.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children) as HTMLElement[];
        for (const sibling of siblings) {
          if (
            !row1Nodes.includes(sibling) &&
            !row1Nodes.some(r => r.contains(sibling) || sibling.contains(r)) &&
            typeof sibling.querySelector === 'function' &&
            (sibling.querySelector('p, pre, code') ||
              sibling.classList?.contains('markdown') ||
              (sibling.textContent && sibling.textContent.trim().length > 0))
          ) {
            row2Nodes.push(sibling);
          }
        }
      }
    }

    // 5. Extract sanitized response markdown
    let content = '';
    if (row2Nodes.length > 0) {
      const contentParts: string[] = [];
      for (const r2 of row2Nodes) {
        const clonedResponse = typeof r2.cloneNode === 'function'
          ? (r2.cloneNode(true) as HTMLElement)
          : r2;

        if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
          adapter.sanitizeTurnNode(clonedResponse);
        } else {
          stripArtifactWidgetChrome(clonedResponse);
        }

        const part = TextSanitizer.extractTextContent(clonedResponse);
        if (part) {
          contentParts.push(part);
        }
      }
      content = contentParts.join('\n\n');
    } else if (row1Nodes.length > 0) {
      // Robust recovery fallback: clone element, remove all row1Nodes and tool buttons, and inspect remaining content
      const clonedElement = typeof element.cloneNode === 'function'
        ? (element.cloneNode(true) as HTMLElement)
        : element;

      const clonedRow1 = Array.from(clonedElement.querySelectorAll<HTMLElement>('.row-start-1'));
      clonedRow1.forEach(n => n.remove());

      try {
        const clonedTools = Array.from(clonedElement.querySelectorAll<HTMLElement>(toolButtonSelector));
        clonedTools.forEach(n => n.remove());
      } catch {
        // ignore
      }

      if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
        adapter.sanitizeTurnNode(clonedElement);
      } else {
        stripArtifactWidgetChrome(clonedElement);
      }

      const remainingText = TextSanitizer.extractTextContent(clonedElement);
      if (remainingText && remainingText.trim()) {
        content = remainingText;
      }
    } else {
      // Fallback for flat or legacy Claude DOM structures without row-start-1 or row-start-2
      const target = element.querySelector<HTMLElement>('.font-claude-response-body') || element;
      const clonedResponse = typeof target.cloneNode === 'function'
        ? (target.cloneNode(true) as HTMLElement)
        : target;

      if (adapter && typeof adapter.sanitizeTurnNode === 'function') {
        adapter.sanitizeTurnNode(clonedResponse);
      } else {
        stripArtifactWidgetChrome(clonedResponse);
      }

      content = TextSanitizer.extractTextContent(clonedResponse);
    }

    // 6. Clio #37: Tag empty-body reasoning turns as type: 'thinking-only'
    const isThinkingOnly = (!content || !content.trim()) && !!thinking;
    const finalContent = isThinkingOnly ? '' : content;

    // 7. Extract attachments
    const images = this.findImages(element, turnIndex);

    // 8. Extract optional model slug
    const modelSlug = this.extractModelSlug(element);

    return {
      id: messageId,
      turnIndex,
      role: 'assistant',
      content: finalContent,
      rawText: element.textContent?.trim() || '',
      thinking,
      modelSlug: modelSlug || undefined,
      attachments: images.length > 0 ? images : undefined,
      timestamp: Date.now(),
      ...(isThinkingOnly ? { type: 'thinking-only' } : {})
    };
  }

  /**
   * Harvests image attachments from a message element, filtering out user avatars,
   * system icons, and SVG chrome. Supports src, data-src, and responsive srcset.
   */
  static findImages(element: HTMLElement, turnIndex: number): HarvestAttachment[] {
    if (!element || typeof element.querySelectorAll !== 'function') return [];

    const imgs = Array.from(element.querySelectorAll<HTMLImageElement>('img'));
    if (element.tagName === 'IMG' && !imgs.includes(element as HTMLImageElement)) {
      imgs.unshift(element as HTMLImageElement);
    }

    const attachments: HarvestAttachment[] = [];
    const seenSrc = new Set<string>();

    for (const img of imgs) {
      let src = img.getAttribute('data-src') || img.getAttribute('src') || img.src || '';
      if (!src && img.getAttribute('srcset')) {
        const srcset = img.getAttribute('srcset') || '';
        const first = srcset.split(',')[0]?.trim().split(' ')[0];
        if (first) src = first;
      }

      if (!src || seenSrc.has(src)) continue;

      const className = img.className || '';
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const isAvatar =
        className.includes('avatar') ||
        className.includes('rounded-full') ||
        alt.includes('avatar') ||
        alt.includes('profile');

      const width = Number(img.getAttribute('width')) || img.width || 0;
      const height = Number(img.getAttribute('height')) || img.height || 0;
      const isTinyIcon =
        (width > 0 && width <= 24 && height > 0 && height <= 24) ||
        (width === 1 && height === 1);

      if (isAvatar || isTinyIcon) continue;

      seenSrc.add(src);
      attachments.push({
        type: 'image',
        originalSrc: src,
        turnIndex,
        dataUrl: src.startsWith('data:') ? src : undefined
      });
    }

    return attachments;
  }

  private static resolveMessageId(element: HTMLElement, role: string, index: number): string {
    return (
      element.getAttribute('data-message-id') ||
      element.getAttribute('data-testid') ||
      `claude-${role[0]}-${index}`
    );
  }

  private static extractModelSlug(element: HTMLElement): string | null {
    const modelAttr =
      element.getAttribute('data-model') ||
      element.getAttribute('data-model-slug') ||
      element.closest('[data-model]')?.getAttribute('data-model');
    if (modelAttr) return modelAttr;

    const headerEl = element.querySelector('[data-testid="model-indicator"], .model-name');
    if (headerEl && headerEl.textContent?.trim()) {
      return headerEl.textContent.trim();
    }

    if (typeof document !== 'undefined') {
      const pageModel = document.querySelector(
        '[data-testid="model-selector"], [data-testid="model-indicator"], button[aria-label*="Model" i]'
      );
      if (pageModel && pageModel.textContent?.trim()) {
        const text = pageModel.textContent.trim();
        if (text && text.length < 50 && !text.includes('\n')) {
          return text;
        }
      }
    }

    return null;
  }
}
