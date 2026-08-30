import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class ClaudeAdapter implements IChatbotAdapter {
  readonly platform = 'claude';

  matches(hostname: string): boolean {
    return hostname.includes('claude.ai');
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];
    const elements = Array.from(document.querySelectorAll('[data-cds="UserMessage"], .font-claude-message, [data-is-streaming]'));

    elements.forEach((el, index) => {
      const isUser = el.hasAttribute('data-cds') || el.classList.contains('UserMessage');
      turns.push({
        id: `claude-${index}`,
        role: isUser ? 'user' : 'assistant',
        content: el.textContent?.trim() || '',
        timestamp: Date.now()
      });
    });
    return turns;
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('[data-testid="chat-input"], .ProseMirror, textarea');
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';
    if (input instanceof HTMLTextAreaElement) return input.value;
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

    input.innerHTML = `<p>${text}</p>`;
    input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }

  resolveAnchor(element: HTMLElement): HTMLElement {
    // Claude user message bubble is narrow; walk up to wide parent row container
    let current: HTMLElement | null = element;
    while (current && current.parentElement && current.offsetWidth < 500) {
      current = current.parentElement;
    }
    return current || element;
  }
}
