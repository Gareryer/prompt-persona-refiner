/**
 * DOM fixture and lightweight in-memory DOM simulation for Vitest Node environment.
 */

export class MockNode {
  parentNode: MockElement | null = null;
  ownerDocument: any = null;

  static readonly DOCUMENT_POSITION_DISCONNECTED = 1;
  static readonly DOCUMENT_POSITION_PRECEDING = 2;
  static readonly DOCUMENT_POSITION_FOLLOWING = 4;
  static readonly DOCUMENT_POSITION_CONTAINS = 8;
  static readonly DOCUMENT_POSITION_CONTAINED_BY = 16;
  static readonly DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32;

  remove() {
    if (this.parentNode) {
      this.parentNode.children = this.parentNode.children.filter(c => (c as MockNode) !== this);
      this.parentNode = null;
    }
  }

  compareDocumentPosition(other: MockNode): number {
    if (this === other) return 0;
    if (!other) return MockNode.DOCUMENT_POSITION_DISCONNECTED;

    if (this instanceof MockElement && (this as any).contains(other)) {
      return MockNode.DOCUMENT_POSITION_CONTAINED_BY | MockNode.DOCUMENT_POSITION_FOLLOWING;
    }
    if (other instanceof MockElement && (other as any).contains(this)) {
      return MockNode.DOCUMENT_POSITION_CONTAINS | MockNode.DOCUMENT_POSITION_PRECEDING;
    }

    let rootA: MockNode = this;
    while (rootA.parentNode) rootA = rootA.parentNode;

    let rootB: MockNode = other;
    while (rootB.parentNode) rootB = rootB.parentNode;

    if (rootA !== rootB) {
      return MockNode.DOCUMENT_POSITION_DISCONNECTED;
    }

    let foundFirst: 'this' | 'other' | null = null;
    const walk = (node: MockNode): boolean => {
      if (node === this) {
        foundFirst = 'this';
        return true;
      }
      if (node === other) {
        foundFirst = 'other';
        return true;
      }
      if (node instanceof MockElement) {
        for (const child of node.children) {
          if (walk(child)) return true;
        }
      }
      return false;
    };

    walk(rootA);
    if (foundFirst === 'this') {
      return MockNode.DOCUMENT_POSITION_FOLLOWING;
    } else {
      return MockNode.DOCUMENT_POSITION_PRECEDING;
    }
  }
}

export class MockTextNode extends MockNode {
  textContent: string;

  constructor(text: string) {
    super();
    this.textContent = text;
  }
}

export class MockElement extends MockNode {
  tagName: string;
  className = '';
  id = '';
  value = '';
  src = '';
  href = '';
  width = 0;
  height = 0;
  private _textContent?: string;
  attributes: Record<string, string> = {};
  children: (MockElement | MockTextNode)[] = [];
  listeners: Record<string, { handler: Function; capture: boolean }[]> = {};

  classList = {
    contains: (cls: string) => this.className.split(/\s+/).includes(cls),
    add: (cls: string) => {
      if (!this.classList.contains(cls)) {
        this.className = `${this.className} ${cls}`.trim();
      }
    },
    remove: (cls: string) => {
      this.className = this.className
        .split(/\s+/)
        .filter(c => c !== cls)
        .join(' ');
    }
  };

  constructor(tagName: string, ownerDocument?: any) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument || (globalThis as any).document;
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
    this.children = [];
  }

  get innerHTML(): string {
    return this.children.map(c => {
      if (c instanceof MockTextNode) return c.textContent;
      return `<${(c as MockElement).tagName.toLowerCase()}>${(c as MockElement).innerHTML}</${(c as MockElement).tagName.toLowerCase()}>`;
    }).join('');
  }

  set innerHTML(html: string) {
    this.children = [];
    this._textContent = undefined;
    if (!html) return;
    const nodes = parseHtmlToNodes(html, this.ownerDocument);
    for (const node of nodes) {
      this.appendChild(node);
    }
  }

  getAttribute(name: string): string | null {
    if (name === 'id') return this.id || null;
    if (name === 'class') return this.className || null;
    if (name === 'src') return this.src || null;
    if (name === 'href') return this.href || null;
    return this.attributes[name] ?? null;
  }

  setAttribute(name: string, val: string) {
    this.attributes[name] = val;
    if (name === 'id') this.id = val;
    if (name === 'class') this.className = val;
    if (name === 'src') this.src = val;
    if (name === 'href') this.href = val;
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
    if (name === 'id') this.id = '';
    if (name === 'class') this.className = '';
    if (name === 'src') this.src = '';
    if (name === 'href') this.href = '';
  }

  hasAttribute(name: string): boolean {
    return name in this.attributes || (name === 'id' && !!this.id) || (name === 'class' && !!this.className);
  }

  appendChild(child: MockElement | MockTextNode) {
    child.parentNode = this;
    child.ownerDocument = this.ownerDocument;
    this.children.push(child);
  }

  replaceChild(newChild: MockElement | MockTextNode, oldChild: MockElement | MockTextNode) {
    const idx = this.children.indexOf(oldChild);
    if (idx !== -1) {
      oldChild.parentNode = null;
      newChild.parentNode = this;
      newChild.ownerDocument = this.ownerDocument;
      this.children[idx] = newChild;
    }
  }

  contains(child: MockNode): boolean {
    if (child === this) return true;
    for (const c of this.children) {
      if (c === child) return true;
      if (c instanceof MockElement && c.contains(child)) return true;
    }
    return false;
  }

  cloneNode(deep = true): MockElement {
    const clone = new MockElement(this.tagName.toLowerCase(), this.ownerDocument);
    clone.className = this.className;
    clone.id = this.id;
    clone.src = this.src;
    clone.href = this.href;
    clone.value = this.value;
    clone.width = this.width;
    clone.height = this.height;
    clone.attributes = { ...this.attributes };
    if (this._textContent !== undefined) {
      clone._textContent = this._textContent;
    }
    if (deep) {
      for (const child of this.children) {
        if (child instanceof MockElement) {
          clone.appendChild(child.cloneNode(true));
        } else if (child instanceof MockTextNode) {
          clone.appendChild(new MockTextNode(child.textContent));
        }
      }
    }
    return clone;
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
    const evt = { type: 'click', bubbles: true, cancelable: true, defaultPrevented: false };
    this.dispatchEvent(evt);
  }

  querySelectorAll<T extends MockElement = MockElement>(selector: string): T[] {
    const results: T[] = [];
    const traverse = (node: MockElement) => {
      for (const child of node.children) {
        if (child instanceof MockElement) {
          if (matchesSelector(child, selector)) {
            results.push(child as unknown as T);
          }
          traverse(child);
        }
      }
    };
    traverse(this);
    return results;
  }

  querySelector<T extends MockElement = MockElement>(selector: string): T | null {
    const all = this.querySelectorAll<T>(selector);
    return all.length > 0 ? (all[0] ?? null) : null;
  }

  closest<T extends MockElement = MockElement>(selector: string): T | null {
    let curr: MockElement | null = this;
    while (curr) {
      if (matchesSelector(curr, selector)) return curr as unknown as T;
      curr = curr.parentNode;
    }
    return null;
  }
}

function decodeEntities(str: string): string {
  return str
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseHtmlToNodes(html: string, ownerDoc: any): (MockElement | MockTextNode)[] {
  const rootNodes: (MockElement | MockTextNode)[] = [];
  const stack: MockElement[] = [];

  const tagRegex = /<(\/)?([a-zA-Z0-9_-]+)([^>]*)>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null) {
    if (match[4]) {
      // Text node
      const text = decodeEntities(match[4]);
      const textNode = new MockTextNode(text);
      if (stack.length > 0) {
        stack[stack.length - 1]!.appendChild(textNode);
      } else {
        rootNodes.push(textNode);
      }
    } else if (match[2]) {
      const isClosing = !!match[1];
      const tagName = match[2];
      const attrString = match[3] || '';

      if (isClosing) {
        if (stack.length > 0 && stack[stack.length - 1]!.tagName.toLowerCase() === tagName.toLowerCase()) {
          stack.pop();
        }
      } else {
        const el = new MockElement(tagName, ownerDoc);
        parseAttributes(el, attrString);

        if (stack.length > 0) {
          stack[stack.length - 1]!.appendChild(el);
        } else {
          rootNodes.push(el);
        }

        const isVoid = /^(img|br|hr|input|meta|link)$/i.test(tagName);
        const isSelfClosing = attrString.trim().endsWith('/') || isVoid;
        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    }
  }

  return rootNodes;
}

function parseAttributes(el: MockElement, attrString: string): void {
  const attrRegex = /([a-zA-Z0-9_-]+)(?:=["']?([^"'>\s]*)["']?)?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRegex.exec(attrString)) !== null) {
    const name = match[1];
    if (!name || name === '/') continue;
    const val = match[2] !== undefined ? match[2] : 'true';
    el.setAttribute(name, val);
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
      if (part && curr instanceof MockElement && matchesSimpleSelector(curr, part)) {
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

  // #id selector
  const idMatch = s.match(/^#([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1]) {
    if (el.id !== idMatch[1]) return false;
    s = s.slice(idMatch[0].length);
  }

  // Tag name
  const tagMatch = s.match(/^([a-zA-Z0-9-]+)/);
  if (tagMatch && tagMatch[1]) {
    if (el.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
    s = s.slice(tagMatch[1].length);
  }

  // Class names
  const classMatches = s.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const cls = cm.slice(1);
      if (!el.classList.contains(cls)) return false;
    }
    s = s.replace(/\.([a-zA-Z0-9_-]+)/g, '');
  }

  // :not(selector)
  const notRegex = /:not\(([^)]+)\)/g;
  let notMatch: RegExpExecArray | null;
  while ((notMatch = notRegex.exec(s)) !== null) {
    const innerSelector = notMatch[1];
    if (innerSelector && matchesSelector(el, innerSelector)) return false;
  }
  s = s.replace(/:not\([^)]+\)/g, '');

  // Attribute selectors
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
    if (op === '^=' && !a.startsWith(e)) return false;
    if (op === '$=' && !a.endsWith(e)) return false;
  }

  return true;
}

export function setupMockDom() {
  const mockRoot = new MockElement('HTML');
  const mockBody = new MockElement('BODY');
  mockRoot.appendChild(mockBody);

  const mockDocument = {
    body: mockBody,
    title: '',
    createElement: (tag: string) => new MockElement(tag),
    createTextNode: (text: string) => new MockTextNode(text),
    querySelector: (sel: string) => mockRoot.querySelector(sel),
    querySelectorAll: (sel: string) => mockRoot.querySelectorAll(sel)
  };

  mockRoot.ownerDocument = mockDocument;
  mockBody.ownerDocument = mockDocument;

  (globalThis as any).Node = MockNode;
  (globalThis as any).document = mockDocument;
  (globalThis as any).HTMLElement = MockElement;
  (globalThis as any).Element = MockElement;
  (globalThis as any).HTMLImageElement = MockElement;
  (globalThis as any).HTMLAnchorElement = MockElement;
  (globalThis as any).HTMLTextAreaElement = class HTMLTextAreaElement extends MockElement {};
  (globalThis as any).HTMLInputElement = class HTMLInputElement extends MockElement {};

  const mockWindow = {
    location: {
      pathname: '/',
      href: 'https://gemini.google.com/'
    },
    document: mockDocument
  };
  (globalThis as any).window = mockWindow;

  return { mockDocument, mockBody, mockRoot, mockWindow };
}

