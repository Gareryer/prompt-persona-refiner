import type { ChatbotPlatform, ScrapedTurn } from '../../core/types';
import type {
  HarvestPlatform,
  HarvestTurn,
  DiscoveredConversation,
  AutoScrollOptions,
  ScrollResult,
  ExpandAllContentOptions
} from '../../core/harvest';

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

/**
 * Contract for deep archival and extraction adapters.
 * Platform-specific adapters implement this interface to handle custom DOM structures,
 * virtualization quirks, scroller containers, and thinking/CoT extraction.
 */
export interface IHarvesterAdapter {
  readonly platform: HarvestPlatform;

  // 1. Scroller & Container Quirks
  getScrollContainer(): HTMLElement | null;
  getLoadingIndicatorSelector(): string | null;
  getExpandButtonSelectors?(): string[];

  // 2. DOM Virtualization Handlers (true for ChatGPT, false for Gemini/Claude)
  requiresVirtualizationCache(): boolean;
  getMessageId?(el: HTMLElement): string | null;
  getTurnIndex?(el: HTMLElement): number | null;

  // 3. Platform-Specific Extraction & Sanitization
  scrapeHarvestTurns(): Promise<HarvestTurn[]>;
  sanitizeTurnNode?(clonedNode: HTMLElement): void;

  // 4. History Discovery
  enumerateConversations?(signal?: AbortSignal): Promise<DiscoveredConversation[]>;

  // 5. Status & Metadata Helpers
  isStreaming?(): boolean;
  extractTitle?(): string;
  extractConversationId?(): string;

  // 6. Upward Scroller & Expansion Helpers
  autoScrollHistory?(options?: Partial<AutoScrollOptions>): Promise<ScrollResult>;
  expandContent?(options?: Partial<ExpandAllContentOptions>): Promise<number>;
}

