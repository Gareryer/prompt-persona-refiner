import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class ChatGPTAdapter implements IChatbotAdapter {
  readonly platform = 'chatgpt';

  matches(hostname: string): boolean {
    return hostname.includes('chatgpt.com') || hostname.includes('chat.openai.com');
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];
    const elements = Array.from(document.querySelectorAll('[data-message-author-role]'));

    elements.forEach((el, index) => {
      const roleAttr = el.getAttribute('data-message-author-role');
      const role = roleAttr === 'user' ? 'user' : 'assistant';
      turns.push({
        id: el.getAttribute('data-message-id') || `chatgpt-${index}`,
        role,
        content: el.textContent?.trim() || '',
        timestamp: Date.now()
      });
    });
    return turns;
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('#prompt-textarea, [data-id="root"] textarea, textarea');
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';
    if (input instanceof HTMLTextAreaElement) {
      return input.value;
    }
    return input.textContent || '';
  }

  setInputText(text: string): boolean {
    const input = this.getActiveInput();
    if (!input) return false;

    if (input instanceof HTMLTextAreaElement) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    input.textContent = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }
}
