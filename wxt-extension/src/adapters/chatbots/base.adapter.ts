import type { IChatbotAdapter } from './types';
import type { ChatbotPlatform, ScrapedTurn } from '../../core/types';

/**
 * Base abstract class providing common DOM manipulation, observer tracking,
 * and multi-strategy element finding for chatbot platform adapters.
 */
export abstract class BaseChatbotAdapter implements IChatbotAdapter {
  abstract readonly platform: ChatbotPlatform;
  observers: MutationObserver[] = [];

  abstract matches(hostname: string): boolean;
  abstract scrapeTurns(): ScrapedTurn[];
  abstract getActiveInput(): HTMLElement | null;
  abstract getInputText(): string;
  abstract setInputText(text: string): boolean;

  /**
   * Multi-strategy helper to locate an element using a prioritized array of CSS selectors or a single selector.
   */
  findElement<T extends Element = HTMLElement>(selectors: string[] | readonly string[] | string): T | null {
    if (typeof document === 'undefined') return null;
    const selectorList: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
    for (const selector of selectorList) {
      try {
        const el = document.querySelector(selector);
        if (el) return el as T;
      } catch {
        // Continue to fallback selector if querySelector errors
      }
    }
    return null;
  }

  /**
   * Multi-strategy helper to locate all elements matching any selector in a prioritized selector array.
   */
  findElements<T extends Element = HTMLElement>(selectors: string[] | readonly string[] | string): T[] {
    if (typeof document === 'undefined') return [];
    const selectorList: readonly string[] = Array.isArray(selectors) ? selectors : [selectors as string];
    for (const selector of selectorList) {
      try {
        const elements = Array.from(document.querySelectorAll(selector)) as T[];
        if (elements.length > 0) return elements;
      } catch {
        // Continue to next selector
      }
    }
    return [];
  }

  /**
   * Registers a MutationObserver for automated lifecycle tracking and cleanup.
   */
  trackObserver(observer: MutationObserver): MutationObserver {
    this.observers.push(observer);
    return observer;
  }

  /**
   * Disconnects all tracked observers and clears the observer list.
   */
  cleanup(): void {
    for (const observer of this.observers) {
      try {
        observer.disconnect();
      } catch {
        // Ignore disconnect errors
      }
    }
    this.observers = [];
  }
}
