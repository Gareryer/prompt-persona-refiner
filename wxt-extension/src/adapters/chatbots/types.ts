import type { ChatbotPlatform, ScrapedTurn } from '../../core/types';

export interface IChatbotAdapter {
  readonly platform: ChatbotPlatform;

  /**
   * Returns true if this adapter handles the given hostname.
   */
  matches(hostname: string): boolean;

  /**
   * Scrapes all completed conversation turns from the current DOM.
   */
  scrapeTurns(): ScrapedTurn[];

  /**
   * Locates the active message input / composer element in the DOM.
   */
  getActiveInput(): HTMLElement | null;

  /**
   * Reads current text from the active composer.
   */
  getInputText(): string;

  /**
   * Inserts or replaces text in the active composer.
   */
  setInputText(text: string): boolean;

  /**
   * Optional re-anchor hook when SPA frameworks swap DOM nodes (e.g. Gemini Angular pending-request).
   */
  onReanchor?(element: HTMLElement): void;

  /**
   * Optional widening hook to escape narrow message bubble containers (e.g. Claude).
   */
  resolveAnchor?(element: HTMLElement): HTMLElement;
}
