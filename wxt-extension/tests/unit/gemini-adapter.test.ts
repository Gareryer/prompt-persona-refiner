import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GeminiAdapter } from '@/adapters/chatbots/gemini/adapter';
import { GEMINI_SELECTORS, findElement } from '@/adapters/chatbots/gemini/selectors';
import { GEMINI_TOKENS, getAllieCssVariables } from '@/adapters/chatbots/gemini/tokens';

// --- Lightweight DOM Mocking for Node environment ---

class MockEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  _immediateStopped = false;
  _stopped = false;
  target: any = null;
  currentTarget: any = null;

  constructor(type: string, options?: any) {
    this.type = type;
    this.bubbles = !!options?.bubbles;
    this.cancelable = !!options?.cancelable;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  stopPropagation() {
    this._stopped = true;
  }

  stopImmediatePropagation() {
    this._immediateStopped = true;
    this._stopped = true;
  }
}

class MockInputEvent extends MockEvent {
  inputType: string;
  data: string;

  constructor(type: string, options?: any) {
    super(type, options);
    this.inputType = options?.inputType || '';
    this.data = options?.data || '';
  }
}

class MockKeyboardEvent extends MockEvent {
  key: string;
  shiftKey: boolean;

  constructor(type: string, options?: any) {
    super(type, options);
    this.key = options?.key || '';
    this.shiftKey = !!options?.shiftKey;
  }
}

class MockMouseEvent extends MockEvent {
  constructor(type: string, options?: any) {
    super(type, options);
  }
}

class MockElement {
  tagName: string;
  className = '';
  value = '';
  private _textContent?: string;
  innerHTML = '';
  attributes: Record<string, string> = {};
  children: MockElement[] = [];
  parentNode: MockElement | null = null;
  listeners: Record<string, { handler: Function; capture: boolean }[]> = {};

  constructor(tagName: string) {
    this.tagName = tagName.toUpperCase();
  }

  get textContent(): string {
    if (this._textContent !== undefined) return this._textContent;
    if (this.children.length > 0) {
      return this.children.map(c => c.textContent).join('');
    }
    return '';
  }

  set textContent(val: string) {
    this._textContent = val;
  }

  getAttribute(name: string): string | null {
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
  }

  getAttributeNames(): string[] {
    return Object.keys(this.attributes);
  }

  hasAttribute(name: string): boolean {
    return name in this.attributes;
  }

  appendChild(child: MockElement) {
    child.parentNode = this;
    this.children.push(child);
  }

  contains(child: MockElement): boolean {
    if (child === this) return true;
    return this.children.some(c => c === child || c.contains(child));
  }

  addEventListener(type: string, handler: Function, options?: any) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push({ handler, capture });
  }

  removeEventListener(type: string, handler: Function, options?: any) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(
      l => l.handler !== handler || l.capture !== capture
    );
  }

  dispatchEvent(event: any): boolean {
    event.target = this;
    event.currentTarget = this;
    const list = [...(this.listeners[event.type] || [])];
    for (const item of list) {
      if (event._immediateStopped) break;
      item.handler(event);
    }
    return !event.defaultPrevented;
  }

  click() {
    const evt = new MockMouseEvent('click', { bubbles: true, cancelable: true });
    this.dispatchEvent(evt);
  }

  querySelectorAll(selector: string): MockElement[] {
    const results: MockElement[] = [];
    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        if (matchesSelector(child, selector)) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);
    return results;
  }

  querySelector(selector: string): MockElement | null {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? (all[0] ?? null) : null;
  }
}

function splitSelector(selector: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inBracket = false;
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]!;
    if (char === '"' || char === "'") {
      if (!inQuote) {
        inQuote = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuote = false;
        quoteChar = '';
      }
      current += char;
    } else if (char === '[' && !inQuote) {
      inBracket = true;
      current += char;
    } else if (char === ']' && !inQuote) {
      inBracket = false;
      current += char;
    } else if (char === delimiter && !inBracket && !inQuote) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else if (delimiter === ' ' && /\s/.test(char) && !inBracket && !inQuote) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function matchesSelector(el: MockElement, selector: string): boolean {
  selector = selector.trim();
  const commaParts = splitSelector(selector, ',');
  if (commaParts.length > 1) {
    return commaParts.some(part => matchesSelector(el, part));
  }

  const spaceParts = splitSelector(selector, ' ');
  if (spaceParts.length > 1) {
    const lastPart = spaceParts[spaceParts.length - 1];
    if (!lastPart || !matchesSimpleSelector(el, lastPart)) return false;
    let curr = el.parentNode;
    let partIdx = spaceParts.length - 2;
    while (curr && partIdx >= 0) {
      const part = spaceParts[partIdx];
      if (part && matchesSimpleSelector(curr, part)) {
        partIdx--;
      }
      curr = curr.parentNode;
    }
    return partIdx < 0;
  }
  return matchesSimpleSelector(el, selector);
}

function matchesSimpleSelector(el: MockElement, sel: string): boolean {
  let s = sel;
  const tagMatch = s.match(/^([a-zA-Z0-9-]+)/);
  if (tagMatch && tagMatch[1]) {
    if (el.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
    s = s.slice(tagMatch[1].length);
  }

  const classMatches = s.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const cls = cm.slice(1);
      const classes = el.className.split(/\s+/);
      if (!classes.includes(cls)) return false;
    }
    s = s.replace(/\.([a-zA-Z0-9_-]+)/g, '');
  }

  const attrRegex = /\[([a-zA-Z0-9_-]+)([\*~|^$]?=)?["']?([^"'\]]*)["']?(\s+i)?\]/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(s)) !== null) {
    const attrName = match[1];
    const op = match[2];
    const expectedVal = match[3] ?? '';
    const caseInsensitive = !!match[4];
    if (!attrName) continue;
    const actualVal = el.getAttribute(attrName);
    if (actualVal === null) return false;
    if (!op) continue;
    const a = caseInsensitive ? actualVal.toLowerCase() : actualVal;
    const e = caseInsensitive ? expectedVal.toLowerCase() : expectedVal;
    if (op === '=' && a !== e) return false;
    if (op === '*=' && !a.includes(e)) return false;
  }

  if (s.includes(':last-child')) {
    if (el.parentNode) {
      const idx = el.parentNode.children.indexOf(el);
      if (idx !== el.parentNode.children.length - 1) return false;
    }
  }

  return true;
}

// Attach mocks to global scope
const mockRoot = new MockElement('HTML');
const mockBody = new MockElement('BODY');
mockRoot.appendChild(mockBody);

const mockDocument = {
  body: mockBody,
  createElement: (tag: string) => new MockElement(tag),
  querySelector: (sel: string) => mockRoot.querySelector(sel),
  querySelectorAll: (sel: string) => mockRoot.querySelectorAll(sel)
};

(globalThis as any).document = mockDocument;
(globalThis as any).HTMLElement = MockElement;
(globalThis as any).Element = MockElement;
(globalThis as any).HTMLTextAreaElement = class HTMLTextAreaElement extends MockElement {};
(globalThis as any).HTMLInputElement = class HTMLInputElement extends MockElement {};
(globalThis as any).Event = MockEvent;
(globalThis as any).InputEvent = MockInputEvent;
(globalThis as any).KeyboardEvent = MockKeyboardEvent;
(globalThis as any).MouseEvent = MockMouseEvent;

describe('Phase 2: Gemini Modular Platform Adapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    mockBody.children = [];
    mockBody.listeners = {};
    adapter = new GeminiAdapter();
  });

  afterEach(() => {
    adapter.cleanup();
  });

  describe('1. Platform Matching & Metadata', () => {
    it('matches gemini.google.com and subdomains', () => {
      expect(adapter.platform).toBe('gemini');
      expect(adapter.matches('gemini.google.com')).toBe(true);
      expect(adapter.matches('https://gemini.google.com/app')).toBe(true);
      expect(adapter.matches('chatgpt.com')).toBe(false);
      expect(adapter.matches('claude.ai')).toBe(false);
      expect(adapter.matches('google.com')).toBe(false);
    });

    it('exposes selector definitions matching GEMINI_SELECTORS', () => {
      const selectors = adapter.getSelectors();
      expect(selectors).toBeDefined();
      expect(selectors.input).toContain('rich-textarea .ql-editor[role="textbox"]');
      expect(selectors.submitButton).toContain('button.send-button');
      expect(selectors.modeSwitcher).toContain('bard-mode-switcher');
    });

    it('exposes style tokens adhering to Allie namespace', () => {
      const tokens = adapter.getStyleTokens();
      expect(tokens).toBeDefined();
      expect(tokens.typography.fontFamily).toContain('Google Sans Flex');
      expect(tokens.radii.pill).toBe('9999px');
      expect(tokens.dark.bgPrimary).toBe('#131314');
      expect(tokens.light.bgPrimary).toBe('#f0f4f9');

      // Rebrand mandate: Verify zero legacy 'pa-' or 'pa_' tokens
      const tokenJson = JSON.stringify(tokens);
      expect(tokenJson).not.toContain('--pa-');
      expect(tokenJson).not.toContain('pa-');
      expect(tokenJson).not.toContain('pa_');
      expect(tokenJson).toContain('--allie-');

      const cssVars = getAllieCssVariables('dark');
      expect(cssVars['--allie-bg-primary']).toBe('#131314');
      expect(cssVars['--allie-accent']).toBe('#8ab4f8');
    });
  });

  describe('2. Multi-Strategy Element Finding & Fallback', () => {
    it('locates primary Quill composer input: rich-textarea .ql-editor[role="textbox"]', () => {
      const richTextarea = new MockElement('rich-textarea');
      const qlEditor = new MockElement('div');
      qlEditor.className = 'ql-editor';
      qlEditor.setAttribute('role', 'textbox');
      richTextarea.appendChild(qlEditor);
      mockBody.appendChild(richTextarea);

      const input = adapter.getActiveInput();
      expect(input).toBe(qlEditor);
    });

    it('falls back to secondary input: textarea[aria-label*="prompt" i]', () => {
      const textarea = new MockElement('textarea');
      textarea.setAttribute('aria-label', 'Enter a prompt here');
      mockBody.appendChild(textarea);

      const input = adapter.getActiveInput();
      expect(input).toBe(textarea);
    });

    it('falls back to tertiary generic input: [contenteditable="true"]', () => {
      const div = new MockElement('div');
      div.setAttribute('contenteditable', 'true');
      mockBody.appendChild(div);

      const input = adapter.getActiveInput();
      expect(input).toBe(div);
    });

    it('locates primary Send button: button.send-button', () => {
      const btn = new MockElement('button');
      btn.className = 'send-button';
      mockBody.appendChild(btn);

      const found = adapter.getSubmitButton();
      expect(found).toBe(btn);
    });

    it('falls back to aria-label Send button: button[aria-label*="Send" i]', () => {
      const btn = new MockElement('button');
      btn.setAttribute('aria-label', 'Send message');
      mockBody.appendChild(btn);

      const found = adapter.getSubmitButton();
      expect(found).toBe(btn);
    });

    it('finds element using module-level findElement helper', () => {
      const mode = new MockElement('bard-mode-switcher');
      mockBody.appendChild(mode);

      const found = findElement(GEMINI_SELECTORS.modeSwitcher);
      expect(found).toBe(mode);
    });
  });

  describe('3. Reading & Writing Input Text (Quill & Textarea)', () => {
    it('reads multi-line text from Quill <p> elements', () => {
      const richTextarea = new MockElement('rich-textarea');
      const qlEditor = new MockElement('div');
      qlEditor.className = 'ql-editor';
      qlEditor.setAttribute('role', 'textbox');

      const p1 = new MockElement('p');
      p1.textContent = 'Explain quantum computing';
      const p2 = new MockElement('p');
      p2.textContent = 'in simple terms.';
      qlEditor.appendChild(p1);
      qlEditor.appendChild(p2);
      richTextarea.appendChild(qlEditor);
      mockBody.appendChild(richTextarea);

      expect(adapter.getInputText()).toBe('Explain quantum computing\nin simple terms.');
    });

    it('reads value from textarea if active composer is textarea', () => {
      const textarea = new MockElement('textarea');
      textarea.setAttribute('aria-label', 'prompt');
      textarea.value = 'Hello from textarea';
      mockBody.appendChild(textarea);

      expect(adapter.getInputText()).toBe('Hello from textarea');
    });

    it('sets multi-line text into Quill wrapped in <p> tags with synthetic events', () => {
      const richTextarea = new MockElement('rich-textarea');
      const qlEditor = new MockElement('div');
      qlEditor.className = 'ql-editor';
      qlEditor.setAttribute('role', 'textbox');
      richTextarea.appendChild(qlEditor);
      mockBody.appendChild(richTextarea);

      const dispatchedEvents: string[] = [];
      let inputData = '';
      let inputType = '';

      qlEditor.addEventListener('input', (e: any) => {
        dispatchedEvents.push('input');
        inputData = e.data;
        inputType = e.inputType;
      });
      qlEditor.addEventListener('change', () => {
        dispatchedEvents.push('change');
      });

      const multiLinePrompt = 'Line 1: Summary\nLine 2: <b>Escaped & details</b>';
      const success = adapter.setInputText(multiLinePrompt);

      expect(success).toBe(true);
      expect(qlEditor.innerHTML).toContain('<p>Line 1: Summary</p>');
      expect(qlEditor.innerHTML).toContain('<p>Line 2: &lt;b&gt;Escaped &amp; details&lt;/b&gt;</p>');
      expect(dispatchedEvents).toEqual(['input', 'change']);
      expect(inputType).toBe('insertFromPaste');
      expect(inputData).toBe(multiLinePrompt);
    });

    it('returns false when setInputText is called with no input available', () => {
      expect(adapter.setInputText('No input')).toBe(false);
    });
  });

  describe('4. Capture-Phase Submission Interception & Loop Prevention', () => {
    let qlEditor: MockElement;
    let sendButton: MockElement;

    beforeEach(() => {
      const richTextarea = new MockElement('rich-textarea');
      qlEditor = new MockElement('div');
      qlEditor.className = 'ql-editor';
      qlEditor.setAttribute('role', 'textbox');
      richTextarea.appendChild(qlEditor);
      mockBody.appendChild(richTextarea);

      sendButton = new MockElement('button');
      sendButton.className = 'send-button';
      mockBody.appendChild(sendButton);
    });

    it('intercepts standalone Enter keydown in capture phase and stops propagation', async () => {
      const p = new MockElement('p');
      p.textContent = 'User draft prompt';
      qlEditor.appendChild(p);

      const onRefine = vi.fn().mockResolvedValue(false);
      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvent = new MockKeyboardEvent('keydown', { key: 'Enter', shiftKey: false, cancelable: true });
      qlEditor.dispatchEvent(enterEvent);

      expect(enterEvent.defaultPrevented).toBe(true);
      expect(enterEvent._immediateStopped).toBe(true);
      expect(onRefine).toHaveBeenCalledWith('User draft prompt');

      cleanup();
    });

    it('does not intercept Shift+Enter (allows newline formatting)', async () => {
      const p = new MockElement('p');
      p.textContent = 'Line with shift enter';
      qlEditor.appendChild(p);

      const onRefine = vi.fn().mockResolvedValue(false);
      const cleanup = adapter.interceptSubmit(onRefine);

      const shiftEnterEvent = new MockKeyboardEvent('keydown', { key: 'Enter', shiftKey: true, cancelable: true });
      qlEditor.dispatchEvent(shiftEnterEvent);

      expect(shiftEnterEvent.defaultPrevented).toBe(false);
      expect(onRefine).not.toHaveBeenCalled();

      cleanup();
    });

    it('does not intercept empty Enter keypress', async () => {
      const onRefine = vi.fn().mockResolvedValue(false);
      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvent = new MockKeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      qlEditor.dispatchEvent(enterEvent);

      expect(enterEvent.defaultPrevented).toBe(false);
      expect(onRefine).not.toHaveBeenCalled();

      cleanup();
    });

    it('intercepts Send button click in capture phase and halts default Angular handler', async () => {
      const p = new MockElement('p');
      p.textContent = 'Prompt to submit via button';
      qlEditor.appendChild(p);

      const onRefine = vi.fn().mockResolvedValue(false);
      const cleanup = adapter.interceptSubmit(onRefine);

      const clickEvent = new MockMouseEvent('click', { bubbles: true, cancelable: true });
      sendButton.dispatchEvent(clickEvent);

      expect(clickEvent.defaultPrevented).toBe(true);
      expect(clickEvent._immediateStopped).toBe(true);
      expect(onRefine).toHaveBeenCalledWith('Prompt to submit via button');

      cleanup();
    });

    it('bypasses interceptor when skipNextRefinement guard is active (infinite-loop prevention)', async () => {
      const p = new MockElement('p');
      p.textContent = 'Refined prompt';
      qlEditor.appendChild(p);

      const onRefine = vi.fn().mockResolvedValue(false);
      const cleanup = adapter.interceptSubmit(onRefine);

      // Programmatic submission raises the guard
      adapter.skipNextRefinement = true;

      const clickEvent = new MockMouseEvent('click', { bubbles: true, cancelable: true });
      sendButton.dispatchEvent(clickEvent);

      // Event was NOT intercepted
      expect(clickEvent.defaultPrevented).toBe(false);
      expect(onRefine).not.toHaveBeenCalled();
      // Guard is reset for subsequent user turns
      expect(adapter.skipNextRefinement).toBe(false);

      cleanup();
    });

    it('triggers programmatic send with skipNextRefinement guard when onRefine resolves true', async () => {
      const p = new MockElement('p');
      p.textContent = 'Draft prompt';
      qlEditor.appendChild(p);

      let sendButtonClicked = false;
      sendButton.addEventListener('click', () => {
        sendButtonClicked = true;
      });

      const onRefine = vi.fn().mockImplementation(async () => {
        return true;
      });

      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvent = new MockKeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
      qlEditor.dispatchEvent(enterEvent);

      // Allow async onRefine promise to resolve
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(onRefine).toHaveBeenCalledWith('Draft prompt');
      expect(sendButtonClicked).toBe(true);

      cleanup();
    });
  });

  describe('5. Conversation Turn Scraping & Reanchoring', () => {
    it('scrapes user and assistant turns with role, content, and unique IDs', () => {
      const userDiv = new MockElement('div');
      userDiv.className = 'query-text';
      userDiv.textContent = 'What is the speed of light?';
      mockBody.appendChild(userDiv);

      const modelDiv = new MockElement('div');
      modelDiv.className = 'model-response-text';
      modelDiv.textContent = 'Approximately 299,792,458 meters per second.';
      mockBody.appendChild(modelDiv);

      const turns = adapter.scrapeTurns();
      expect(turns).toHaveLength(2);
      expect(turns[0]).toMatchObject({
        id: 'gemini-u-0',
        role: 'user',
        content: 'What is the speed of light?'
      });
      expect(turns[1]).toMatchObject({
        id: 'gemini-m-0',
        role: 'assistant',
        content: 'Approximately 299,792,458 meters per second.'
      });
    });

    it('deduplicates turns when nested container and inner text elements both match', () => {
      const userQuery = new MockElement('user-query');
      const innerQueryText = new MockElement('div');
      innerQueryText.className = 'query-text';
      innerQueryText.textContent = 'Explain photosynthesis';
      userQuery.appendChild(innerQueryText);
      mockBody.appendChild(userQuery);

      const modelResp = new MockElement('model-response');
      const innerModelText = new MockElement('div');
      innerModelText.className = 'model-response-text';
      innerModelText.textContent = 'Photosynthesis converts light into chemical energy.';
      modelResp.appendChild(innerModelText);
      mockBody.appendChild(modelResp);

      const turns = adapter.scrapeTurns();
      // Should scrape exactly 1 user turn and 1 model turn, without duplicate inner turns
      expect(turns).toHaveLength(2);
      expect(turns[0]!.role).toBe('user');
      expect(turns[0]!.content).toContain('Explain photosynthesis');
      expect(turns[1]!.role).toBe('assistant');
      expect(turns[1]!.content).toContain('Photosynthesis converts light');
    });

    it('re-anchors floating element to permanent model-response container', () => {
      const modelResp = new MockElement('model-response');
      mockBody.appendChild(modelResp);

      const ratingWidget = new MockElement('div');
      ratingWidget.className = 'allie-rating-widget';

      adapter.onReanchor(ratingWidget as any);
      expect(modelResp.children).toContain(ratingWidget);
    });
  });

  describe('6. Observer Tracking & BaseChatbotAdapter Cleanup', () => {
    it('tracks and disconnects mutation observers on cleanup', () => {
      const disconnectMock = vi.fn();
      const mockObserver = {
        observe: vi.fn(),
        disconnect: disconnectMock,
        takeRecords: vi.fn()
      } as unknown as MutationObserver;

      adapter.trackObserver(mockObserver);
      expect(adapter.observers).toHaveLength(1);

      adapter.cleanup();
      expect(disconnectMock).toHaveBeenCalled();
      expect(adapter.observers).toHaveLength(0);
    });
  });
});
