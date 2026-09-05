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

  /**
   * Locates the submit / send button element in the DOM.
   */
  getSubmitButton?(): HTMLElement | null;

  /**
   * Returns selector definitions used by this adapter.
   */
  getSelectors?(): Record<string, string[] | readonly string[] | string>;

  /**
   * Returns platform-specific style tokens.
   */
  getStyleTokens?(): Record<string, any>;

  /**
   * Intercepts message submission (Enter keydown or Send click), allowing prompt refinement before submission.
   * Returns a cleanup function to unregister listeners.
   */
  interceptSubmit?(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void;
}
