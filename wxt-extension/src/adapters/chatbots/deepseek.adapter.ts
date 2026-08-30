import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class DeepSeekAdapter implements IChatbotAdapter {
  readonly platform = 'deepseek';

  matches(hostname: string): boolean {
    return hostname.includes('chat.deepseek.com');
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    return Array.from(document.querySelectorAll('.chat-turn, .message-content')).map((el, i) => ({
      id: `deepseek-${i}`,
      role: el.classList.contains('user') ? 'user' : 'assistant',
      content: el.textContent?.trim() || '',
      timestamp: Date.now()
    }));
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('#chat-input, textarea');
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
