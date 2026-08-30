import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class MetaAIAdapter implements IChatbotAdapter {
  readonly platform = 'meta';

  matches(hostname: string): boolean {
    return hostname.includes('meta.ai');
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('[role="row"], .message-bubble')).map((el, i) => ({
      id: `meta-${i}`,
      role: 'user',
      content: el.textContent?.trim() || '',
      timestamp: Date.now()
    }));
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('[contenteditable="true"], textarea');
  }

  getInputText(): string {
    const el = this.getActiveInput();
    return el instanceof HTMLTextAreaElement ? el.value : el?.textContent || '';
  }

  setInputText(text: string): boolean {
    const el = this.getActiveInput();
    if (!el) return false;
    if (el instanceof HTMLTextAreaElement) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }
}
