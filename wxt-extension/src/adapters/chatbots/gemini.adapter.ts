import type { IChatbotAdapter } from './types';
import type { ScrapedTurn } from '../../core/types';

export class GeminiAdapter implements IChatbotAdapter {
  readonly platform = 'gemini';

  matches(hostname: string): boolean {
    return hostname.includes('gemini.google.com');
  }

  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];
    const userNodes = Array.from(document.querySelectorAll('.query-text, .user-query-container, [data-role="user"]'));
    const modelNodes = Array.from(document.querySelectorAll('.model-response-text, [data-role="model"]'));

    const count = Math.max(userNodes.length, modelNodes.length);
    for (let i = 0; i < count; i++) {
      if (userNodes[i]) {
        turns.push({
          id: `gemini-u-${i}`,
          role: 'user',
          content: userNodes[i]!.textContent?.trim() || '',
          timestamp: Date.now()
        });
      }
      if (modelNodes[i]) {
        turns.push({
          id: `gemini-m-${i}`,
          role: 'assistant',
          content: modelNodes[i]!.textContent?.trim() || '',
          timestamp: Date.now()
        });
      }
    }
    return turns;
  }

  getActiveInput(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('.ql-editor, textarea, [contenteditable="true"], rich-textarea');
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      return input.value;
    }
    return input.textContent || '';
  }

  setInputText(text: string): boolean {
    const input = this.getActiveInput();
    if (!input) return false;

    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    input.textContent = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    return true;
  }

  onReanchor(element: HTMLElement): void {
    const permanent = document.querySelector('model-response, .model-response-text');
    if (permanent && !permanent.contains(element)) {
      permanent.appendChild(element);
    }
  }
}
