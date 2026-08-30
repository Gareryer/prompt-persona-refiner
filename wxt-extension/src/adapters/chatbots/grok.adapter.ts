import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class GrokAdapter implements IChatbotAdapter {
  readonly platform = 'grok';

  matches(hostname: string): boolean {
    return hostname.includes('grok.com') || (hostname.includes('x.com') && location.pathname.includes('grok'));
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('[data-testid="grok-turn"], .message-turn')).map((el, i) => ({
      id: `grok-${i}`,
      role: 'user',
      content: el.textContent?.trim() || '',
      timestamp: Date.now()
    }));
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('textarea, [data-testid="tweetTextarea_0"]');
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
