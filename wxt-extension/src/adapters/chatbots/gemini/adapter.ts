import { BaseChatbotAdapter } from '../base.adapter';
import { GEMINI_SELECTORS } from './selectors';
import { GEMINI_TOKENS } from './tokens';
import type { ScrapedTurn } from '../../../core/types';

/**
 * Platform adapter for Google Gemini (gemini.google.com).
 * Manages Angular & Quill SPA integration, capture-phase event interception,
 * prompt text injection, and non-recursive programmatic submission.
 */
export class GeminiAdapter extends BaseChatbotAdapter {
  readonly platform = 'gemini' as const;

  /**
   * Guard flag to prevent infinite refinement loops during programmatic submission.
   */
  public skipNextRefinement = false;

  matches(hostname: string): boolean {
    return hostname.includes('gemini.google.com');
  }

  getActiveInput(): HTMLElement | null {
    return this.findElement<HTMLElement>(GEMINI_SELECTORS.input);
  }

  getSubmitButton(): HTMLElement | null {
    return this.findElement<HTMLElement>(GEMINI_SELECTORS.submitButton);
  }

  getSelectors(): Record<string, readonly string[]> {
    return GEMINI_SELECTORS;
  }

  getStyleTokens(): Record<string, any> {
    return GEMINI_TOKENS;
  }

  getInputText(): string {
    const input = this.getActiveInput();
    if (!input) return '';

    if (this.isFormInputElement(input)) {
      return (input as HTMLTextAreaElement | HTMLInputElement).value || '';
    }

    // Quill formats lines inside <p> elements
    const paragraphs = Array.from(input.querySelectorAll('p'));
    if (paragraphs.length > 0) {
      return paragraphs.map(p => p.textContent || '').join('\n');
    }

    return input.textContent || '';
  }

  setInputText(text: string): boolean {
    const input = this.getActiveInput();
    if (!input) return false;

    if (this.isFormInputElement(input)) {
      (input as HTMLTextAreaElement | HTMLInputElement).value = text;
      this.dispatchInputEvents(input, text);
      return true;
    }

    // Quill formats lines inside <p> elements
    const paragraphs = text
      .split('\n')
      .map(line => `<p>${line.length > 0 ? this.escapeHtml(line) : '<br>'}</p>`)
      .join('');

    input.innerHTML = paragraphs;
    // Ensure textContent is synchronized in non-DOM or mock environments
    if (!input.textContent && text) {
      input.textContent = text;
    }

    this.dispatchInputEvents(input, text);
    return true;
  }

  /**
   * Intercepts message submission (Enter keydown or Send click) in the capture phase,
   * allowing Allie prompt refinement before Angular consumes the event.
   * Uses skipNextRefinement guard to prevent infinite loops.
   */
  interceptSubmit(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void {
    const input = this.getActiveInput();
    const submitBtn = this.getSubmitButton();

    const handleKeydown = async (e: KeyboardEvent) => {
      // Shift+Enter creates a newline; only intercept standalone Enter
      if (e.key !== 'Enter' || e.shiftKey) return;

      // Programmatic submission bypass guard
      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return; // Ignore empty Enter

      // Intercept in capture phase before Angular consumes it
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const proceed = await onRefine(text);
      if (proceed) {
        this.skipNextRefinement = true;
        const currentSubmitBtn = this.getSubmitButton();
        if (currentSubmitBtn && typeof currentSubmitBtn.click === 'function') {
          currentSubmitBtn.click();
        } else {
          const currentInput = this.getActiveInput();
          currentInput?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
          );
        }
      }
    };

    const handleClick = async (e: MouseEvent) => {
      // Programmatic submission bypass guard
      if (this.skipNextRefinement) {
        this.skipNextRefinement = false;
        return;
      }

      const text = this.getInputText().trim();
      if (!text) return;

      // Intercept in capture phase before Angular consumes it
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }

      const proceed = await onRefine(text);
      if (proceed) {
        this.skipNextRefinement = true;
        const currentSubmitBtn = this.getSubmitButton() || (e.currentTarget as HTMLElement);
        if (currentSubmitBtn && typeof currentSubmitBtn.click === 'function') {
          currentSubmitBtn.click();
        }
      }
    };

    input?.addEventListener('keydown', handleKeydown as unknown as EventListener, { capture: true });
    submitBtn?.addEventListener('click', handleClick as unknown as EventListener, { capture: true });

    return () => {
      input?.removeEventListener('keydown', handleKeydown as unknown as EventListener, { capture: true });
      submitBtn?.removeEventListener('click', handleClick as unknown as EventListener, { capture: true });
    };
  }

  /**
   * Scrapes completed conversation turns from the current DOM.
   */
  scrapeTurns(): ScrapedTurn[] {
    if (typeof document === 'undefined') return [];
    const turns: ScrapedTurn[] = [];

    let userNodes = Array.from(
      document.querySelectorAll<HTMLElement>('user-query, .query-text, .user-query-container, [data-role="user"]')
    );
    // Filter out child nodes to avoid duplication when parent matches container selector
    userNodes = userNodes.filter(
      node => !userNodes.some(other => other !== node && other.contains(node))
    );

    let modelNodes = Array.from(
      document.querySelectorAll<HTMLElement>('model-response, .model-response-text, [data-role="model"]')
    );
    // Filter out child nodes to avoid duplication
    modelNodes = modelNodes.filter(
      node => !modelNodes.some(other => other !== node && other.contains(node))
    );

    const count = Math.max(userNodes.length, modelNodes.length);
    for (let i = 0; i < count; i++) {
      if (userNodes[i]) {
        turns.push({
          id: `gemini-u-${i}`,
          role: 'user',
          content: this.extractTurnText(userNodes[i]!),
          timestamp: Date.now()
        });
      }
      if (modelNodes[i]) {
        turns.push({
          id: `gemini-m-${i}`,
          role: 'assistant',
          content: this.extractTurnText(modelNodes[i]!),
          timestamp: Date.now()
        });
      }
    }
    return turns;
  }

  onReanchor(element: HTMLElement): void {
    if (typeof document === 'undefined' || !element) return;
    const permanent = this.findElement<HTMLElement>(GEMINI_SELECTORS.responseContainer);
    if (permanent && !permanent.contains(element)) {
      permanent.appendChild(element);
    }
  }

  /**
   * Safely checks if an element is a form input/textarea across both browser and Node/mock environments.
   */
  private isFormInputElement(el: Element): el is HTMLTextAreaElement | HTMLInputElement {
    const isTextarea =
      (typeof HTMLTextAreaElement !== 'undefined' && el instanceof HTMLTextAreaElement) ||
      el.tagName === 'TEXTAREA';
    const isInput =
      (typeof HTMLInputElement !== 'undefined' && el instanceof HTMLInputElement) ||
      el.tagName === 'INPUT';
    return isTextarea || isInput;
  }

  /**
   * Extracts text from turn nodes, prioritizing inner text content nodes if present.
   */
  private extractTurnText(node: HTMLElement): string {
    const inner = node.querySelector<HTMLElement>('.query-text, .model-response-text');
    if (inner && inner.textContent?.trim()) {
      return inner.textContent.trim();
    }
    return node.textContent?.trim() || '';
  }

  /**
   * Dispatches synthetic input and change events to notify Angular/Quill of external edits.
   */
  private dispatchInputEvents(element: HTMLElement, data: string): void {
    try {
      if (typeof InputEvent !== 'undefined') {
        element.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertFromPaste',
            data
          })
        );
      } else {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      }
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    }

    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
