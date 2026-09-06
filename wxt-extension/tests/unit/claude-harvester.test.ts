import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom } from '../fixtures/mock-dom';
import { ClaudeAdapter } from '@/adapters/chatbots/claude/adapter';
import { CLAUDE_SELECTORS } from '@/adapters/chatbots/claude/selectors';
import { ClaudeTurnScraper, stripArtifactWidgetChrome } from '@/adapters/chatbots/claude/turn-scraper';
import { TextSanitizer } from '@/core/harvest/extraction/text-sanitizer';

setupMockDom();

describe('Phase 5: Claude Harvester Adapter & 2-Row CSS Grid Scraper', () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    setupMockDom();
    adapter = new ClaudeAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('Contract & Platform Verification', () => {
    it('implements IHarvesterAdapter and IChatbotAdapter contract', () => {
      expect(adapter.platform).toBe('claude');
      expect(adapter.requiresVirtualizationCache()).toBe(false);
      expect(typeof adapter.getScrollContainer).toBe('function');
      expect(typeof adapter.getLoadingIndicatorSelector).toBe('function');
      expect(typeof adapter.getExpandButtonSelectors).toBe('function');
      expect(typeof adapter.scrapeHarvestTurns).toBe('function');
      expect(typeof adapter.sanitizeTurnNode).toBe('function');
      expect(typeof adapter.enumerateConversations).toBe('function');
      expect(typeof adapter.stripArtifactWidgetChrome).toBe('function');
    });

    it('matches claude.ai domains and subdomains', () => {
      expect(adapter.matches('claude.ai')).toBe(true);
      expect(adapter.matches('www.claude.ai')).toBe(true);
      expect(adapter.matches('https://claude.ai/chat/123')).toBe(true);
      expect(adapter.matches('gemini.google.com')).toBe(false);
      expect(adapter.matches('chatgpt.com')).toBe(false);
    });

    it('provides verified modern Claude selectors', () => {
      const selectors = adapter.getSelectors();
      expect(selectors).toBeDefined();
      expect(selectors.userMessage).toContain('[data-testid="user-message"]');
      expect(selectors.assistantMessage).toContain('.font-claude-response:not(.font-claude-response-body)');
      expect(selectors.scrollContainer).toContain('div[class*="flex-1"][class*="overflow-y-auto"]');
      expect(selectors.scrollContainer).toContain('[data-scroll-container]');
      expect(selectors.scrollContainer).toContain('main');
      expect(selectors.thinkingContent).toContain('.row-start-1');
      expect(selectors.responseContent).toContain('.row-start-2');
      expect(selectors.toolUseButton).toContain('.row-start-1 button.group\\/row');
      expect(selectors.toolUseButton).toContain('button[aria-label*="tool" i]');
      expect(selectors.loadingIndicator).toContain('[role="progressbar"]');
      expect(selectors.loadingIndicator).toContain('[aria-busy="true"]');
      expect(selectors.loadingIndicator).toContain('.loading-spinner');
    });
  });

  describe('DOM Landmarks & Scroller Resolution', () => {
    it('resolves scroll container with flex-1 and overflow-y-auto', () => {
      const main = document.createElement('main');
      const scroller = document.createElement('div');
      scroller.className = 'flex-1 overflow-y-auto';
      scroller.style.overflowY = 'auto';
      (scroller as any).scrollHeight = 2000;
      (scroller as any).clientHeight = 800;

      main.appendChild(scroller);
      document.body.appendChild(main);

      const resolved = adapter.getScrollContainer();
      expect(resolved).not.toBeNull();
      expect(resolved).toBe(scroller);
    });

    it('falls back to main when no specific scroller exists', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      const resolved = adapter.getScrollContainer();
      expect(resolved).not.toBeNull();
      expect(resolved === main || resolved === document.body).toBe(true);
    });

    it('returns loading indicator selector string', () => {
      const selector = adapter.getLoadingIndicatorSelector();
      expect(selector).not.toBeNull();
      expect(selector).toContain('[role="progressbar"]');
      expect(selector).toContain('[aria-busy="true"]');
      expect(selector).toContain('.loading-spinner');
    });

    it('detects streaming indicator', () => {
      expect(adapter.isStreaming()).toBe(false);

      const spinner = document.createElement('div');
      spinner.setAttribute('data-is-streaming', 'true');
      document.body.appendChild(spinner);

      expect(adapter.isStreaming()).toBe(true);
    });
  });

  describe('Real-time Input & Interception', () => {
    it('reads and writes input in ProseMirror contenteditable container', () => {
      const composer = document.createElement('div');
      composer.className = 'ProseMirror';
      composer.setAttribute('contenteditable', 'true');
      document.body.appendChild(composer);

      expect(adapter.getActiveInput()).toBe(composer);

      adapter.setInputText('Line 1\nLine 2');
      expect(composer.innerHTML).toContain('<p>Line 1</p>');
      expect(composer.innerHTML).toContain('<p>Line 2</p>');
      expect(adapter.getInputText()).toBe('Line 1\nLine 2');
    });

    it('reads and writes input in fallback textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.setAttribute('data-testid', 'chat-input');
      document.body.appendChild(textarea);

      adapter.setInputText('Hello Claude');
      expect(textarea.value).toBe('Hello Claude');
      expect(adapter.getInputText()).toBe('Hello Claude');
    });

    it('widens narrow bubble container via resolveAnchor', () => {
      const wideContainer = document.createElement('div');
      (wideContainer as any).offsetWidth = 600;

      const narrowBubble = document.createElement('div');
      (narrowBubble as any).offsetWidth = 200;

      wideContainer.appendChild(narrowBubble);
      document.body.appendChild(wideContainer);

      const resolved = adapter.resolveAnchor(narrowBubble);
      expect(resolved).toBe(wideContainer);
    });

    it('intercepts standalone Enter keydown with refinement guard', async () => {
      const composer = document.createElement('div');
      composer.className = 'ProseMirror';
      composer.textContent = 'Original prompt';
      document.body.appendChild(composer);

      const onRefine = vi.fn().mockResolvedValue(true);
      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvt: any = {
        type: 'keydown',
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        stopImmediatePropagation: vi.fn()
      };

      composer.dispatchEvent(enterEvt);
      await Promise.resolve();

      expect(onRefine).toHaveBeenCalledWith('Original prompt');
      expect(enterEvt.preventDefault).toHaveBeenCalled();

      cleanup();
    });

    it('ignores Shift+Enter keydown to permit multiline composer input', async () => {
      const composer = document.createElement('div');
      composer.className = 'ProseMirror';
      composer.textContent = 'Line one';
      document.body.appendChild(composer);

      const onRefine = vi.fn();
      const cleanup = adapter.interceptSubmit(onRefine);

      const shiftEnterEvt: any = {
        type: 'keydown',
        key: 'Enter',
        shiftKey: true,
        preventDefault: vi.fn()
      };

      composer.dispatchEvent(shiftEnterEvt);
      expect(onRefine).not.toHaveBeenCalled();
      expect(shiftEnterEvt.preventDefault).not.toHaveBeenCalled();

      cleanup();
    });

    it('scrapes turns for real-time persona analysis', () => {
      const user = document.createElement('div');
      user.setAttribute('data-testid', 'user-message');
      user.textContent = 'Tell me a joke';

      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.textContent = 'Why did the chicken cross the road?';

      document.body.appendChild(user);
      document.body.appendChild(assistant);

      const turns = adapter.scrapeTurns();
      expect(turns.length).toBe(2);
      expect(turns[0]?.role).toBe('user');
      expect(turns[0]?.content).toBe('Tell me a joke');
      expect(turns[1]?.role).toBe('assistant');
      expect(turns[1]?.content).toBe('Why did the chicken cross the road?');
    });
  });

  describe('2-Row CSS Grid Turn Extraction', () => {
    it('extracts turns in strict document order using compareDocumentPosition', async () => {
      const u1 = document.createElement('div');
      u1.setAttribute('data-testid', 'user-message');
      u1.textContent = 'First prompt';

      const a1 = document.createElement('div');
      a1.className = 'font-claude-response';
      a1.innerHTML = '<div class="row-start-2 font-claude-response-body"><p>First response</p></div>';

      const u2 = document.createElement('div');
      u2.setAttribute('data-testid', 'user-message');
      u2.textContent = 'Second prompt';

      const a2 = document.createElement('div');
      a2.className = 'font-claude-response';
      a2.innerHTML = '<div class="row-start-2 font-claude-response-body"><p>Second response</p></div>';

      document.body.appendChild(u1);
      document.body.appendChild(a1);
      document.body.appendChild(u2);
      document.body.appendChild(a2);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(4);
      expect(turns.map(t => t.turnIndex)).toEqual([0, 1, 2, 3]);
      expect(turns.map(t => t.role)).toEqual(['user', 'assistant', 'user', 'assistant']);
      expect(turns[0]?.content).toBe('First prompt');
      expect(turns[1]?.content).toBe('First response');
      expect(turns[2]?.content).toBe('Second prompt');
      expect(turns[3]?.content).toBe('Second response');
    });

    it('extracts thinking trace and tool use pills from .row-start-1 and markdown from .row-start-2', async () => {
      const user = document.createElement('div');
      user.setAttribute('data-testid', 'user-message');
      user.textContent = 'Can you calculate 25 * 4 and write python code?';

      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <div class="thinking-trace">Let me compute 25 * 4 which is 100.</div>
          <button class="group/row" aria-label="Tool: calculator">Ran tool: calculator</button>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>The answer is 100. Here is the code:</p>
          <pre><code class="language-python">result = 25 * 4\nprint(result)</code></pre>
        </div>
      `;

      document.body.appendChild(user);
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);

      const assistantTurn = turns[1]!;
      expect(assistantTurn.role).toBe('assistant');
      expect(assistantTurn.thinking).toContain('Let me compute 25 * 4 which is 100.');
      expect(assistantTurn.thinking).toContain('Ran tool: calculator');
      expect(assistantTurn.content).toContain('The answer is 100. Here is the code:');
      expect(assistantTurn.content).toContain('```python');
      expect(assistantTurn.content).toContain('result = 25 * 4');
      expect(assistantTurn.type).toBeUndefined();
    });

    it('harvests image attachments in user and assistant messages, ignoring avatars', async () => {
      const user = document.createElement('div');
      user.setAttribute('data-testid', 'user-message');
      user.innerHTML = `
        <img class="avatar rounded-full" src="https://claude.ai/avatar.png" width="20" height="20" />
        <p>Look at this chart:</p>
        <img src="data:image/png;base64,iVBORw0KGgoAAA..." width="400" height="300" />
      `;

      document.body.appendChild(user);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.attachments?.length).toBe(1);
      expect(turns[0]?.attachments?.[0]?.type).toBe('image');
      expect(turns[0]?.attachments?.[0]?.originalSrc).toContain('data:image/png;base64');
    });
  });

  describe('Clio Edge Case #39: Nested .row-start-1 Protection', () => {
    it('preserves response content when .row-start-1.col-start-1 is nested inside .row-start-2 (normal Claude layout)', async () => {
      // Clio #39: Claude's normal responses often use CSS grid with .row-start-1.col-start-1 INSIDE .row-start-2.
      // A naive selector removing .row-start-1 would completely erase the response body!
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-2 font-claude-response-body">
          <div class="row-start-1 col-start-1 grid-inner">
            <p>This is a normal Claude response layout without reasoning CoT.</p>
            <p>It must NOT be stripped or considered as thinking!</p>
          </div>
        </div>
      `;

      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const turn = turns[0]!;
      expect(turn.role).toBe('assistant');
      expect(turn.thinking).toBeNull();
      expect(turn.content).toContain('This is a normal Claude response layout without reasoning CoT.');
      expect(turn.content).toContain('It must NOT be stripped or considered as thinking!');
      expect(turn.type).toBeUndefined();
    });

    it('extracts top-level thinking while preserving nested .row-start-1 inside .row-start-2', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>Genuine CoT reasoning trace at top-level row 1.</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <div class="row-start-1 col-start-1">
            <p>Response body wrapped in inner row-start-1.</p>
          </div>
        </div>
      `;

      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const turn = turns[0]!;
      expect(turn.thinking).toBe('Genuine CoT reasoning trace at top-level row 1.');
      expect(turn.content).toBe('Response body wrapped in inner row-start-1.');
    });
  });

  describe('Clio Edge Case #37: Empty-body Reasoning Turns (thinking-only)', () => {
    it('tags empty-body reasoning turns as type: "thinking-only" when prose is whitespace', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>Thinking deeply about a difficult architectural tradeoff...</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>   </p>
        </div>
      `;

      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const turn = turns[0]!;
      expect(turn.role).toBe('assistant');
      expect(turn.thinking).toBe('Thinking deeply about a difficult architectural tradeoff...');
      expect(turn.content).toBe('');
      expect(turn.type).toBe('thinking-only');
    });

    it('tags reasoning turn without row-start-2 as type: "thinking-only"', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>Still processing tool outputs...</p>
          <button class="group/row">Ran tool: grep_search</button>
        </div>
      `;

      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const turn = turns[0]!;
      expect(turn.type).toBe('thinking-only');
      expect(turn.content).toBe('');
      expect(turn.thinking).toContain('Still processing tool outputs...');
      expect(turn.thinking).toContain('Ran tool: grep_search');
    });
  });

  describe('Clio Edge Case #43: Artifact Widget Chrome & Label Padding', () => {
    it('strips internal buttons from artifact card and adds whitespace padding after label', () => {
      const card = document.createElement('div');
      card.className = 'font-ui rounded-2xl rounded-t-3xl border';
      card.innerHTML = `
        <div class="artifact-header">
          <label>SVG Architecture Diagram</label>
          <button>Send via Gmail</button>
          <button>Copy</button>
        </div>
        <div class="artifact-tabs">
          <button class="tab">Code</button>
          <button class="tab">Preview</button>
        </div>
        <div class="artifact-content">
          <pre><code class="language-xml">&lt;svg&gt;&lt;circle r="50"/&gt;&lt;/svg&gt;</code></pre>
        </div>
      `;

      stripArtifactWidgetChrome(card);

      // Buttons stripped
      expect(card.querySelectorAll('button').length).toBe(0);

      // Label padding added
      const label = card.querySelector('label')!;
      expect(label.textContent).toMatch(/SVG Architecture Diagram\s+$/);

      // Markdown extraction preserves code fence and label separation
      const extracted = TextSanitizer.extractTextContent(card);
      expect(extracted).not.toContain('Send via Gmail');
      expect(extracted).not.toContain('Copy');
      expect(extracted).toContain('SVG Architecture Diagram');
      expect(extracted).toContain('```xml');
      expect(extracted).toContain('<svg><circle r="50"/></svg>');
    });

    it('sanitizes turn node by stripping action bars and artifact buttons while preserving content', () => {
      const turnNode = document.createElement('div');
      turnNode.innerHTML = `
        <p>Here is your artifact:</p>
        <div class="font-ui rounded-2xl rounded-t-3xl">
          <label>Code Snippet</label>
          <button>Send via Gmail</button>
          <pre><code class="language-js">console.log("hello");</code></pre>
        </div>
        <div class="message-actions">
          <button aria-label="Copy">Copy response</button>
          <button aria-label="Retry">Retry</button>
        </div>
      `;

      adapter.sanitizeTurnNode(turnNode);

      // All action buttons and artifact buttons removed
      expect(turnNode.querySelectorAll('.message-actions').length).toBe(0);
      expect(turnNode.querySelectorAll('button').length).toBe(0);

      const text = TextSanitizer.extractTextContent(turnNode);
      expect(text).toContain('Here is your artifact:');
      expect(text).toContain('Code Snippet');
      expect(text).toContain('```js');
      expect(text).toContain('console.log("hello");');
      expect(text).not.toContain('Copy response');
      expect(text).not.toContain('Send via Gmail');
    });
  });

  describe('Conversation Enumeration: REST API & DOM Fallback', () => {
    it('fast-path: queries Claude internal REST API in 100-item chunks', async () => {
      const mockOrg = [{ uuid: 'org-abc-123', name: 'Personal' }];
      const mockConversations = [
        { uuid: 'conv-1', name: 'Refactoring Harvester - Claude' },
        { uuid: 'conv-2', name: 'TypeScript Architecture' }
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/organizations/org-abc-123/chat_conversations')) {
          return {
            ok: true,
            json: async () => mockConversations
          } as any;
        }
        if (urlStr.includes('/api/organizations')) {
          return {
            ok: true,
            json: async () => mockOrg
          } as any;
        }
        return { ok: false, status: 404 } as any;
      });

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(2);
      expect(discovered[0]?.site).toBe('claude');
      expect(discovered[0]?.conversationId).toBe('conv-1');
      expect(discovered[0]?.title).toBe('Refactoring Harvester'); // "- Claude" stripped
      expect(discovered[0]?.url).toBe('https://claude.ai/chat/conv-1');

      expect(discovered[1]?.conversationId).toBe('conv-2');
      expect(discovered[1]?.title).toBe('TypeScript Architecture');

      fetchSpy.mockRestore();
    });

    it('fallback: scrapes sidebar DOM when REST API fails', async () => {
      // Mock fetch rejection to trigger DOM fallback
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const sidebar = document.createElement('nav');
      sidebar.innerHTML = `
        <div data-testid="conversation-list-item">
          <a href="/chat/conv-dom-1">DOM Conversation One - Claude</a>
        </div>
        <div data-testid="conversation-list-item">
          <a href="/chat/conv-dom-2">DOM Conversation Two</a>
        </div>
        <a href="/chat/conv-dom-1">Duplicate link to conv-dom-1</a>
      `;
      document.body.appendChild(sidebar);

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(2);
      expect(discovered[0]?.conversationId).toBe('conv-dom-1');
      expect(discovered[0]?.title).toBe('DOM Conversation One');
      expect(discovered[1]?.conversationId).toBe('conv-dom-2');
      expect(discovered[1]?.title).toBe('DOM Conversation Two');

      fetchSpy.mockRestore();
    });

    it('respects AbortSignal cancellation', async () => {
      const controller = new AbortController();
      controller.abort();

      const discovered = await adapter.enumerateConversations(controller.signal);
      expect(discovered).toEqual([]);
    });
  });

  describe('Title & Conversation ID Extraction', () => {
    it('extracts and cleans conversation title from h1 or document.title', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'System Design Session - Claude';
      document.body.appendChild(h1);

      expect(adapter.extractTitle()).toBe('System Design Session');
    });

    it('normalizes bare provider name to Untitled Conversation', () => {
      document.title = 'Claude';
      expect(adapter.extractTitle()).toBe('Untitled Conversation');
    });

    it('extracts conversation ID from active sidebar link', () => {
      const activeLink = document.createElement('a');
      activeLink.setAttribute('href', '/chat/9b3f4a21-72e0-4960-928f-7c1a2e3d4b5c');
      activeLink.setAttribute('aria-current', 'page');
      document.body.appendChild(activeLink);

      expect(adapter.extractConversationId()).toBe('9b3f4a21-72e0-4960-928f-7c1a2e3d4b5c');
    });
  });

  describe('Deep Edge Cases & Resilient Fallbacks', () => {
    it('returns empty array when DOM is empty or root is null', async () => {
      const turns = ClaudeTurnScraper.scrapeTurns({ root: null });
      expect(turns).toEqual([]);
    });

    it('handles legacy flat Claude turn when neither row-start-1 nor row-start-2 exist', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = '<p>Legacy or mobile flat response without CSS grid rows.</p>';
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.content).toBe('Legacy or mobile flat response without CSS grid rows.');
      expect(turns[0]?.thinking).toBeNull();
      expect(turns[0]?.type).toBeUndefined();
    });

    it('synthesizes KaTeX math formulas into LaTeX markdown in Claude responses', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-2 font-claude-response-body">
          <p>The Pythagorean theorem is:</p>
          <span class="katex"><annotation encoding="application/x-tex">a^2 + b^2 = c^2</annotation></span>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.content).toContain('$a^2 + b^2 = c^2$');
    });

    it('paginates multi-page REST API chunks using before_id', async () => {
      // 100 items on page 1, 2 items on page 2
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        uuid: `conv-p1-${i}`,
        name: `Chat P1 ${i}`
      }));
      const page2 = [
        { uuid: 'conv-p2-1', name: 'Chat P2 1' },
        { uuid: 'conv-p2-2', name: 'Chat P2 2' }
      ];

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/organizations/cookie-org-999/chat_conversations')) {
          if (urlStr.includes('before_id=conv-p1-99')) {
            return { ok: true, json: async () => page2 } as any;
          }
          return { ok: true, json: async () => page1 } as any;
        }
        return { ok: false } as any;
      });

      // Provide org via cookie
      Object.defineProperty(document, 'cookie', {
        value: 'lastActiveOrg=cookie-org-999',
        writable: true,
        configurable: true
      });

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(102);
      expect(discovered[0]?.conversationId).toBe('conv-p1-0');
      expect(discovered[99]?.conversationId).toBe('conv-p1-99');
      expect(discovered[100]?.conversationId).toBe('conv-p2-1');
      expect(discovered[101]?.conversationId).toBe('conv-p2-2');

      fetchSpy.mockRestore();
    });

    it('invokes autoScrollHistory and expandContent helpers without crashing', async () => {
      const scrollResult = await adapter.autoScrollHistory({
        config: { maxScrollAttempts: 1, scrollDelay: 0 }
      });
      expect(scrollResult).toBeDefined();
      expect(typeof scrollResult.reachedTop).toBe('boolean');

      const expandedCount = await adapter.expandContent({ clickDelay: 0 });
      expect(expandedCount).toBe(0);
    });

    it('retains innermost .font-claude-response when wrapped by ancestor .font-claude-message', async () => {
      const outerWrapper = document.createElement('div');
      outerWrapper.className = 'font-claude-message';
      outerWrapper.setAttribute('data-testid', 'outer-wrapper');

      const innerResponse = document.createElement('div');
      innerResponse.className = 'font-claude-response';
      innerResponse.setAttribute('data-message-id', 'real-msg-999');
      innerResponse.innerHTML = `
        <div class="row-start-2 font-claude-response-body">
          <p>Inner response body</p>
        </div>
      `;

      outerWrapper.appendChild(innerResponse);
      document.body.appendChild(outerWrapper);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.id).toBe('real-msg-999');
      expect(turns[0]?.content).toBe('Inner response body');
    });

    it('preserves chronological in-place tool call pills in thinking trace even if prose mentions tool', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>I will run bash_cmd to verify git status.</p>
          <button class="group/row" aria-label="Tool: bash_cmd">Ran tool: bash_cmd</button>
          <p>Now that git status passed, proceeding to build.</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>Build complete.</p>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      const thinking = turns[0]?.thinking || '';
      expect(thinking).toContain('I will run bash_cmd to verify git status.');
      expect(thinking).toContain('[Tool]: Ran tool: bash_cmd');
      expect(thinking).toContain('Now that git status passed, proceeding to build.');

      // Check chronological ordering: first prose -> tool marker -> second prose
      const idx1 = thinking.indexOf('I will run bash_cmd');
      const idxTool = thinking.indexOf('[Tool]: Ran tool: bash_cmd');
      const idx2 = thinking.indexOf('Now that git status passed');
      expect(idx1).toBeLessThan(idxTool);
      expect(idxTool).toBeLessThan(idx2);
    });

    it('collects multiple .row-start-1 sibling elements outside row2 in CSS Grid', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1 col-start-1 thinking-block">
          <p>Reasoning about system architecture...</p>
        </div>
        <div class="row-start-1 col-start-2 tool-block">
          <button class="group/row">Ran tool: architecture_graph</button>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>Here is the architecture plan.</p>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.thinking).toContain('Reasoning about system architecture...');
      expect(turns[0]?.thinking).toContain('Ran tool: architecture_graph');
      expect(turns[0]?.content).toBe('Here is the architecture plan.');
    });

    it('protects inner .row-start-1 when response body only has .font-claude-response-body without .row-start-2 class', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="font-claude-response-body">
          <div class="row-start-1 col-start-1">
            <p>Content inside font-claude-response-body without row-start-2.</p>
          </div>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.thinking).toBeNull();
      expect(turns[0]?.content).toBe('Content inside font-claude-response-body without row-start-2.');
    });

    it('extracts conversation ID when active link is wrapped in a container div', () => {
      const containerDiv = document.createElement('div');
      containerDiv.setAttribute('data-testid', 'conversation-list-item');
      containerDiv.setAttribute('aria-current', 'page');

      const link = document.createElement('a');
      link.setAttribute('href', '/chat/nested-id-456');
      link.textContent = 'Active Chat';
      containerDiv.appendChild(link);
      document.body.appendChild(containerDiv);

      expect(adapter.extractConversationId()).toBe('nested-id-456');
    });

    it('falls back to document.title when h1 produces "Untitled Conversation"', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Claude';
      document.body.appendChild(h1);

      document.title = 'Deep Reinforcement Learning - Claude';
      expect(adapter.extractTitle()).toBe('Deep Reinforcement Learning');
    });

    it('sidebar DOM enumeration strips menu/option buttons from conversation title', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const sidebarItem = document.createElement('div');
      sidebarItem.setAttribute('data-testid', 'conversation-list-item');

      const link = document.createElement('a');
      link.setAttribute('href', '/chat/clean-title-1');
      link.textContent = 'Clean Title Only';

      const menuBtn = document.createElement('button');
      menuBtn.textContent = 'Options Delete Rename';

      sidebarItem.appendChild(link);
      sidebarItem.appendChild(menuBtn);
      document.body.appendChild(sidebarItem);

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(1);
      expect(discovered[0]?.conversationId).toBe('clean-title-1');
      expect(discovered[0]?.title).toBe('Clean Title Only');

      fetchSpy.mockRestore();
    });

    it('preserves earlier REST API pages when a subsequent page encounters a network error', async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        uuid: `p1-${i}`,
        name: `Conversation 1-${i}`
      }));

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/organizations/mock-org/chat_conversations')) {
          if (urlStr.includes('before_id=')) {
            // Page 2 fails with network error
            throw new Error('Socket reset / timeout');
          }
          return { ok: true, json: async () => page1 } as any;
        }
        return { ok: false } as any;
      });

      Object.defineProperty(document, 'cookie', {
        value: 'lastActiveOrg=mock-org',
        writable: true,
        configurable: true
      });

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(100);
      expect(discovered[0]?.conversationId).toBe('p1-0');
      expect(discovered[99]?.conversationId).toBe('p1-99');

      fetchSpy.mockRestore();
    });

    it('interceptSubmit does not fire duplicate keydown when submit button is present and clicked', async () => {
      const input = document.createElement('div');
      input.className = 'ProseMirror';
      input.textContent = 'Test submission';

      const submitBtn = document.createElement('button');
      submitBtn.setAttribute('aria-label', 'Send message');
      const clickSpy = vi.spyOn(submitBtn, 'click');

      const inputDispatchSpy = vi.spyOn(input, 'dispatchEvent');

      document.body.appendChild(input);
      document.body.appendChild(submitBtn);

      const onRefine = vi.fn().mockResolvedValue(true);
      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvt: any = {
        type: 'keydown',
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        stopImmediatePropagation: vi.fn()
      };

      input.dispatchEvent(enterEvt);
      await Promise.resolve();

      expect(clickSpy).toHaveBeenCalledTimes(1);
      // The only keydown event dispatched was the initial test event itself, never a secondary programmatic event
      const programmaticEnterDispatches = inputDispatchSpy.mock.calls.filter(
        c => (c[0] as any)?.key === 'Enter' && c[0] !== enterEvt
      );
      expect(programmaticEnterDispatches.length).toBe(0);

      cleanup();
    });

    it('scrapeTurns isolates assistant response body from thinking trace and actions', () => {
      const user = document.createElement('div');
      user.setAttribute('data-testid', 'user-message');
      user.textContent = 'Explain relativity';

      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>Let me recall Einstein's 1905 paper...</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>Special relativity shows that time is relative to the observer.</p>
        </div>
        <div class="message-actions">
          <button>Copy</button>
        </div>
      `;

      document.body.appendChild(user);
      document.body.appendChild(assistant);

      const turns = adapter.scrapeTurns();
      expect(turns.length).toBe(2);
      expect(turns[1]?.role).toBe('assistant');
      expect(turns[1]?.content).toBe('Special relativity shows that time is relative to the observer.');
      expect(turns[1]?.content).not.toContain('Einstein');
      expect(turns[1]?.content).not.toContain('Copy');
    });

    it('harvests mixed user turn selectors across multiple turns without dropping any', async () => {
      // Turn 1 matches modern data-testid
      const u1 = document.createElement('div');
      u1.setAttribute('data-testid', 'user-message');
      u1.textContent = 'Modern user message';

      const a1 = document.createElement('div');
      a1.className = 'font-claude-response';
      a1.innerHTML = '<div class="row-start-2 font-claude-response-body"><p>Response 1</p></div>';

      // Turn 2 matches fallback class
      const u2 = document.createElement('div');
      u2.className = 'UserMessage';
      u2.textContent = 'Fallback UserMessage class message';

      const a2 = document.createElement('div');
      a2.className = 'font-claude-response';
      a2.innerHTML = '<div class="row-start-2 font-claude-response-body"><p>Response 2</p></div>';

      document.body.appendChild(u1);
      document.body.appendChild(a1);
      document.body.appendChild(u2);
      document.body.appendChild(a2);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(4);
      expect(turns[0]?.content).toBe('Modern user message');
      expect(turns[1]?.content).toBe('Response 1');
      expect(turns[2]?.content).toBe('Fallback UserMessage class message');
      expect(turns[3]?.content).toBe('Response 2');
    });

    it('harvests mixed assistant turn selectors (standard response vs streaming vs message wrapper)', async () => {
      const u1 = document.createElement('div');
      u1.setAttribute('data-testid', 'user-message');
      u1.textContent = 'Question 1';

      const a1 = document.createElement('div');
      a1.className = 'font-claude-response';
      a1.innerHTML = '<div class="row-start-2 font-claude-response-body"><p>Completed response</p></div>';

      const u2 = document.createElement('div');
      u2.setAttribute('data-testid', 'user-message');
      u2.textContent = 'Question 2';

      const a2 = document.createElement('div');
      a2.setAttribute('data-is-streaming', 'true');
      a2.innerHTML = '<p>Currently streaming response text...</p>';

      document.body.appendChild(u1);
      document.body.appendChild(a1);
      document.body.appendChild(u2);
      document.body.appendChild(a2);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(4);
      expect(turns[1]?.content).toBe('Completed response');
      expect(turns[3]?.content).toBe('Currently streaming response text...');
    });

    it('joins multiple .row-start-2 response blocks in a single assistant turn with newlines', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="row-start-1">
          <p>Analyzing problem statement...</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>First part of the analysis.</p>
        </div>
        <div class="row-start-2 font-claude-response-body">
          <p>Second part with detailed recommendations.</p>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.thinking).toBe('Analyzing problem statement...');
      expect(turns[0]?.content).toContain('First part of the analysis.');
      expect(turns[0]?.content).toContain('Second part with detailed recommendations.');
      expect(turns[0]?.type).toBeUndefined();
    });

    it('recovers response content when Claude wraps grid in sub-container and omits row-start-2 class', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';
      assistant.innerHTML = `
        <div class="inner-grid-layout">
          <div class="row-start-1">
            <p>Reasoning about algorithms...</p>
          </div>
          <div class="dynamic-prose-container">
            <p>The optimal time complexity is O(N log N).</p>
          </div>
        </div>
      `;
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.thinking).toBe('Reasoning about algorithms...');
      expect(turns[0]?.content).toContain('The optimal time complexity is O(N log N).');
      expect(turns[0]?.type).toBeUndefined(); // Must NOT be falsely marked thinking-only!
    });

    it('expandContent does not click un-scoped page buttons with aria-expanded="false"', async () => {
      // Profile menu button elsewhere on page
      const profileBtn = document.createElement('button');
      profileBtn.className = 'profile-menu';
      profileBtn.setAttribute('aria-expanded', 'false');
      profileBtn.textContent = 'User Profile';
      const profileClickSpy = vi.spyOn(profileBtn, 'click');

      // Thinking toggle inside row-start-1
      const thinkingBtn = document.createElement('button');
      thinkingBtn.setAttribute('aria-label', 'Show thinking');
      thinkingBtn.setAttribute('aria-expanded', 'false');
      const thinkingClickSpy = vi.spyOn(thinkingBtn, 'click');

      const row1 = document.createElement('div');
      row1.className = 'row-start-1';
      row1.appendChild(thinkingBtn);

      document.body.appendChild(profileBtn);
      document.body.appendChild(row1);

      await adapter.expandContent({ clickDelay: 0 });

      expect(thinkingClickSpy).toHaveBeenCalled();
      expect(profileClickSpy).not.toHaveBeenCalled();
    });

    it('scrapeTurns eliminates ancestor wrappers preventing duplicate turns in real-time persona scraping', () => {
      const outerWrapper = document.createElement('div');
      outerWrapper.className = 'font-claude-message';
      outerWrapper.setAttribute('data-testid', 'outer-wrapper');

      const innerResponse = document.createElement('div');
      innerResponse.className = 'font-claude-response';
      innerResponse.setAttribute('data-message-id', 'unique-assistant-turn');
      innerResponse.innerHTML = `
        <div class="row-start-2 font-claude-response-body">
          <p>Unique single response</p>
        </div>
      `;

      outerWrapper.appendChild(innerResponse);
      document.body.appendChild(outerWrapper);

      const turns = adapter.scrapeTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.id).toBe('unique-assistant-turn');
      expect(turns[0]?.content).toBe('Unique single response');
    });

    it('strips buttons, SVGs, and action chrome nested inside sidebar <a> tags during DOM enumeration', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const sidebarItem = document.createElement('div');
      sidebarItem.setAttribute('data-testid', 'conversation-list-item');

      const link = document.createElement('a');
      link.setAttribute('href', '/chat/nested-menu-conv');
      link.innerHTML = `
        <span>Actual Chat Title - Claude</span>
        <button aria-label="Conversation actions">
          <svg><path d="M0 0h24v24H0z"/></svg>
          Options
        </button>
      `;

      sidebarItem.appendChild(link);
      document.body.appendChild(sidebarItem);

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(1);
      expect(discovered[0]?.conversationId).toBe('nested-menu-conv');
      expect(discovered[0]?.title).toBe('Actual Chat Title');
      expect(discovered[0]?.title).not.toContain('Options');

      fetchSpy.mockRestore();
    });

    it('handles REST API conversation enumeration when response is wrapped in an object envelope', async () => {
      const mockOrg = [{ uuid: 'org-envelope', name: 'Team Org', is_active: true }];
      const mockEnvelope = {
        conversations: [
          { uuid: 'conv-env-1', name: 'Envelope Conversation 1' },
          { uuid: 'conv-env-2', name: 'Envelope Conversation 2' }
        ]
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/organizations/org-envelope/chat_conversations')) {
          return { ok: true, json: async () => mockEnvelope } as any;
        }
        if (urlStr.includes('/api/organizations')) {
          return { ok: true, json: async () => mockOrg } as any;
        }
        return { ok: false } as any;
      });

      const discovered = await adapter.enumerateConversations();
      expect(discovered.length).toBe(2);
      expect(discovered[0]?.conversationId).toBe('conv-env-1');
      expect(discovered[0]?.title).toBe('Envelope Conversation 1');
      expect(discovered[1]?.conversationId).toBe('conv-env-2');
      expect(discovered[1]?.title).toBe('Envelope Conversation 2');

      fetchSpy.mockRestore();
    });

    it('harvests image attachments with responsive srcset when src is absent', async () => {
      const user = document.createElement('div');
      user.setAttribute('data-testid', 'user-message');
      user.innerHTML = `
        <p>Responsive chart attachment:</p>
        <img srcset="https://claude.ai/chart-800.png 800w, https://claude.ai/chart-1600.png 1600w" width="500" height="300" />
      `;
      document.body.appendChild(user);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.attachments?.length).toBe(1);
      expect(turns[0]?.attachments?.[0]?.originalSrc).toBe('https://claude.ai/chart-800.png');
    });

    it('resolveAnchor stops before document.body and main even if element has zero offsetWidth', () => {
      const main = document.createElement('main');
      const inner = document.createElement('div');
      (inner as any).offsetWidth = 0; // Unrendered or detached in test environment
      main.appendChild(inner);
      document.body.appendChild(main);

      const resolved = adapter.resolveAnchor(inner);
      expect(resolved).toBe(inner); // Did not climb to document.body
    });

    it('interceptSubmit fails open and allows submission if onRefine throws or rejects', async () => {
      const input = document.createElement('div');
      input.className = 'ProseMirror';
      input.textContent = 'Prompt with failing refinement';

      const submitBtn = document.createElement('button');
      submitBtn.setAttribute('aria-label', 'Send message');
      const clickSpy = vi.spyOn(submitBtn, 'click');

      document.body.appendChild(input);
      document.body.appendChild(submitBtn);

      const onRefine = vi.fn().mockRejectedValue(new Error('Refinement LLM crashed'));
      const cleanup = adapter.interceptSubmit(onRefine);

      const enterEvt: any = {
        type: 'keydown',
        key: 'Enter',
        shiftKey: false,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        stopImmediatePropagation: vi.fn()
      };

      input.dispatchEvent(enterEvt);
      await Promise.resolve();

      // Even though onRefine rejected, the submit action still executed (fail-open)
      expect(clickSpy).toHaveBeenCalledTimes(1);

      cleanup();
    });

    it('formats self-tool button container without double [Tool]: prefix', async () => {
      const assistant = document.createElement('div');
      assistant.className = 'font-claude-response';

      // A tool button placed directly as the row-start-1 container
      const toolBtn = document.createElement('button');
      toolBtn.className = 'row-start-1 group/row';
      toolBtn.textContent = 'Ran tool: test_tool';

      const responseBody = document.createElement('div');
      responseBody.className = 'row-start-2 font-claude-response-body';
      responseBody.innerHTML = '<p>Test tool completed.</p>';

      assistant.appendChild(toolBtn);
      assistant.appendChild(responseBody);
      document.body.appendChild(assistant);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.thinking).toBe('[Tool]: Ran tool: test_tool');
      expect(turns[0]?.thinking).not.toContain('[Tool]: [Tool]:');
      expect(turns[0]?.content).toBe('Test tool completed.');
    });
  });
});

