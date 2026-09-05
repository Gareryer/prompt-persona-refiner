import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom } from '../fixtures/mock-dom';
import { ChatGPTAdapter } from '@/adapters/chatbots/chatgpt/adapter';
import { CHATGPT_SELECTORS } from '@/adapters/chatbots/chatgpt/selectors';
import { ChatGPTTurnScraper } from '@/adapters/chatbots/chatgpt/turn-scraper';
import { VirtualMessageCache } from '@/core/harvest/scroller/virtual-cache';
import { TextSanitizer } from '@/core/harvest/extraction/text-sanitizer';
import type { IHarvesterAdapter } from '@/adapters/chatbots/types';

setupMockDom();

describe('Phase 1: ChatGPT Harvester Adapter & Virtualization Engine', () => {
  let adapter: ChatGPTAdapter;

  beforeEach(() => {
    setupMockDom();
    adapter = new ChatGPTAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('Contract & Platform Verification', () => {
    it('implements IHarvesterAdapter and IChatbotAdapter contract', () => {
      expect(adapter.platform).toBe('chatgpt');
      expect(adapter.requiresVirtualizationCache()).toBe(true);
      expect(typeof adapter.getScrollContainer).toBe('function');
      expect(typeof adapter.getLoadingIndicatorSelector).toBe('function');
      expect(typeof adapter.getExpandButtonSelectors).toBe('function');
      expect(typeof adapter.getMessageId).toBe('function');
      expect(typeof adapter.getTurnIndex).toBe('function');
      expect(typeof adapter.scrapeHarvestTurns).toBe('function');
      expect(typeof adapter.sanitizeTurnNode).toBe('function');
      expect(typeof adapter.enumerateConversations).toBe('function');
    });

    it('matches chatgpt.com and chat.openai.com domains', () => {
      expect(adapter.matches('chatgpt.com')).toBe(true);
      expect(adapter.matches('chat.openai.com')).toBe(true);
      expect(adapter.matches('https://chatgpt.com/c/123')).toBe(true);
      expect(adapter.matches('gemini.google.com')).toBe(false);
      expect(adapter.matches('claude.ai')).toBe(false);
    });

    it('provides resilient selector definitions', () => {
      const selectors = adapter.getSelectors();
      expect(selectors).toBeDefined();
      expect(selectors?.input?.length).toBeGreaterThan(0);
      expect(selectors?.submitButton?.length).toBeGreaterThan(0);
      expect(selectors?.scrollContainer?.length).toBeGreaterThan(0);
      expect(selectors?.userMessage?.length).toBeGreaterThan(0);
      expect(selectors?.assistantMessage?.length).toBeGreaterThan(0);
    });
  });

  describe('Ancestor Scroller Detection', () => {
    it('resolves true scrolling ancestor when main has overflow: visible', () => {
      // ChatGPT DOM structure:
      // <div class="group/scroll-root overflow-y-auto" style="overflow-y: auto; height: 800px; scroll-height: 2000px;">
      //   <div class="composer-parent">
      //     <main style="overflow: visible; height: 1800px; scroll-height: 1800px;">
      //       <div data-testid="conversation-turn-0">...</div>
      //     </main>
      //   </div>
      // </div>
      const scrollRoot = document.createElement('div');
      scrollRoot.className = 'group/scroll-root overflow-y-auto';
      scrollRoot.style.overflowY = 'auto';
      (scrollRoot as any).scrollHeight = 2500;
      (scrollRoot as any).clientHeight = 800;

      const middleWrapper = document.createElement('div');
      middleWrapper.className = 'composer-parent';

      const main = document.createElement('main');
      main.style.overflowY = 'visible';
      (main as any).scrollHeight = 2000;
      (main as any).clientHeight = 2000;

      middleWrapper.appendChild(main);
      scrollRoot.appendChild(middleWrapper);
      document.body.appendChild(scrollRoot);

      const resolved = adapter.getScrollContainer();
      expect(resolved).not.toBeNull();
      expect(resolved).toBe(scrollRoot);
    });

    it('falls back to main or selector match if layout height is pre-computed', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      const resolved = adapter.getScrollContainer();
      expect(resolved).not.toBeNull();
      expect(resolved === main || resolved === document.body).toBe(true);
    });
  });

  describe('DOM Virtualization Handling (VirtualMessageCache)', () => {
    it('declares requiresVirtualizationCache as true', () => {
      expect(adapter.requiresVirtualizationCache()).toBe(true);
    });

    it('resolves messageId from data-message-id', () => {
      const el = document.createElement('div');
      el.setAttribute('data-message-id', 'msg-uuid-1234');
      expect(adapter.getMessageId(el)).toBe('msg-uuid-1234');

      const parent = document.createElement('div');
      parent.appendChild(el);
      expect(adapter.getMessageId(parent)).toBe('msg-uuid-1234');
    });

    it('resolves turnIndex from data-testid="conversation-turn-X"', () => {
      const turnContainer = document.createElement('article');
      turnContainer.setAttribute('data-testid', 'conversation-turn-7');

      const messageEl = document.createElement('div');
      messageEl.setAttribute('data-message-author-role', 'assistant');
      turnContainer.appendChild(messageEl);

      expect(adapter.getTurnIndex(turnContainer)).toBe(7);
      expect(adapter.getTurnIndex(messageEl)).toBe(7);
    });

    it('captures and clones rendered messages into VirtualMessageCache', () => {
      const cache = new VirtualMessageCache();

      const el = document.createElement('div');
      el.setAttribute('data-message-id', 'm-1');
      el.setAttribute('data-testid', 'conversation-turn-0');
      el.textContent = 'Rendered user prompt';

      cache.set('m-1', el, 0);

      expect(cache.size).toBe(1);
      expect(cache.has('m-1')).toBe(true);

      const cachedEl = cache.get('m-1');
      expect(cachedEl).toBeDefined();
      expect(cachedEl?.textContent).toBe('Rendered user prompt');
      // Verify deep clone isolation: modifying original element does not mutate cached copy
      el.textContent = 'Mutated prompt';
      expect(cachedEl?.textContent).toBe('Rendered user prompt');
    });

    it('captures rendered messages directly from DOM root via captureFromRoot', () => {
      const cache = new VirtualMessageCache();
      const container = document.createElement('div');
      container.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="u-0">Hello there</div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="a-1">Hi, how can I help?</div>
        </article>
      `;
      document.body.appendChild(container);

      const captured = cache.captureFromRoot(container, adapter);
      expect(captured).toBe(2);
      expect(cache.size).toBe(2);
      expect(cache.has('u-0')).toBe(true);
      expect(cache.has('a-1')).toBe(true);

      const entries = cache.getEntries();
      expect(entries[0]?.turnIndex).toBe(0);
      expect(entries[1]?.turnIndex).toBe(1);
    });

    it('enforces FIFO eviction when maxEntries threshold is exceeded', () => {
      const cache = new VirtualMessageCache({ maxEntries: 3 });

      for (let i = 0; i < 5; i++) {
        const el = document.createElement('div');
        el.setAttribute('data-message-id', `m-${i}`);
        cache.set(`m-${i}`, el, i);
      }

      expect(cache.size).toBe(3);
      // First two entries (m-0, m-1) should have been evicted
      expect(cache.has('m-0')).toBe(false);
      expect(cache.has('m-1')).toBe(false);
      expect(cache.has('m-2')).toBe(true);
      expect(cache.has('m-3')).toBe(true);
      expect(cache.has('m-4')).toBe(true);
    });
  });

  describe('scrapeHarvestTurns: Turn Extraction & Sanitization', () => {
    it('extracts multi-turn user and assistant dialogue in correct order', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            <div class="whitespace-pre-wrap">Write a binary search in TypeScript</div>
          </div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="msg-a1" data-message-model-slug="gpt-4o">
            <div class="markdown">
              <p>Here is the implementation:</p>
              <pre><code class="language-typescript">function binarySearch(arr: number[], target: number): number {
  let left = 0, right = arr.length - 1;
  while (left &lt;= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] &lt; target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}</code></pre>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);

      const userTurn = turns[0]!;
      expect(userTurn.role).toBe('user');
      expect(userTurn.id).toBe('msg-u1');
      expect(userTurn.turnIndex).toBe(0);
      expect(userTurn.content).toContain('Write a binary search in TypeScript');

      const assistantTurn = turns[1]!;
      expect(assistantTurn.role).toBe('assistant');
      expect(assistantTurn.id).toBe('msg-a1');
      expect(assistantTurn.turnIndex).toBe(1);
      expect(assistantTurn.modelSlug).toBe('gpt-4o');
      expect(assistantTurn.content).toContain('```typescript\nfunction binarySearch');
      expect(assistantTurn.content).toContain('return -1;\n}\n```');
    });

    it('parses OpenAI reasoning headers and isolates them from response prose', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            <div class="whitespace-pre-wrap">Solve this logic puzzle</div>
          </div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="msg-a1" data-message-model-slug="o1-preview">
            <div class="flex items-start gap-3 pb-2">
              <button>Reasoned for 8 seconds</button>
            </div>
            <div class="markdown">
              <p>The puzzle solution is that the green house is in the middle.</p>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);

      const assistantTurn = turns[1]!;
      expect(assistantTurn.role).toBe('assistant');
      expect(assistantTurn.modelSlug).toBe('o1-preview');
      expect(assistantTurn.thinking).toBe('Reasoned for 8 seconds');
      // Crucial: "Reasoned for 8 seconds" must NOT bleed into response content
      expect(assistantTurn.content).not.toContain('Reasoned for 8 seconds');
      expect(assistantTurn.content).toBe('The puzzle solution is that the green house is in the middle.');
    });

    it('preserves CodeMirror code blocks (pre .cm-content) via TextSanitizer', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            Show CodeMirror block
          </div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="msg-a1">
            <div class="markdown">
              <p>Here is code inside CodeMirror:</p>
              <pre data-language="python"><div class="cm-content">def factorial(n):
    return 1 if n &lt;= 1 else n * factorial(n - 1)</div></pre>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);

      const assistantTurn = turns[1]!;
      expect(assistantTurn.content).toContain('```python\ndef factorial(n):\n    return 1 if n <= 1 else n * factorial(n - 1)\n```');
    });

    it('harvests genuine image attachments while filtering out avatars and UI icons', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <img class="avatar" src="https://chatgpt.com/avatars/user.png" />
          <img alt="Uploaded screenshot" src="https://chatgpt.com/files/uploaded-chart.png" />
          <div data-message-author-role="user" data-message-id="msg-u1">
            Check this image
          </div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="msg-a1">
            <div class="markdown">
              <p>I generated this image for you:</p>
              <img alt="DALL-E masterpiece" src="https://oaidalleapiprodscus.blob.core.windows.net/output.png" />
              <img class="icon" aria-hidden="true" src="https://chatgpt.com/icons/sparkle.svg" />
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);

      const userTurn = turns[0]!;
      expect(userTurn.attachments).toBeDefined();
      expect(userTurn.attachments?.length).toBe(1);
      expect(userTurn.attachments?.[0]?.originalSrc).toBe('https://chatgpt.com/files/uploaded-chart.png');

      const assistantTurn = turns[1]!;
      expect(assistantTurn.attachments).toBeDefined();
      expect(assistantTurn.attachments?.length).toBe(1);
      expect(assistantTurn.attachments?.[0]?.originalSrc).toBe('https://oaidalleapiprodscus.blob.core.windows.net/output.png');
    });

    it('strips interactive action bars, copy buttons, and feedback widgets', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="assistant" data-message-id="msg-a1">
            <div class="markdown">
              <p>Safe prose content.</p>
            </div>
            <div class="message-actions">
              <button data-testid="copy-turn-action-button">Copy</button>
              <button data-testid="feedback-thumb-up">Like</button>
              <button data-testid="feedback-thumb-down">Dislike</button>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]?.content).toBe('Safe prose content.');
      expect(turns[0]?.content).not.toContain('Copy');
      expect(turns[0]?.content).not.toContain('Like');
    });

    it('restores unmounted messages from VirtualMessageCache when evicted from live DOM', async () => {
      // Scenario: User scrolled up. Turn 0 was unmounted by React virtualizer and is NO LONGER in live DOM,
      // but was captured by VirtualMessageCache earlier during the upward scroll walk.
      const cache = adapter.virtualCache;

      const evictedUserTurn = document.createElement('div');
      evictedUserTurn.setAttribute('data-message-author-role', 'user');
      evictedUserTurn.setAttribute('data-message-id', 'evicted-u0');
      evictedUserTurn.setAttribute('data-testid', 'conversation-turn-0');
      evictedUserTurn.innerHTML = '<div class="whitespace-pre-wrap">Earlier question that was evicted from DOM</div>';

      cache.set('evicted-u0', evictedUserTurn, 0);

      // Only Turn 1 remains in the live DOM
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="live-a1">
            <div class="markdown"><p>Currently visible response</p></div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(2);
      expect(turns[0]?.id).toBe('evicted-u0');
      expect(turns[0]?.role).toBe('user');
      expect(turns[0]?.turnIndex).toBe(0);
      expect(turns[0]?.content).toContain('Earlier question that was evicted from DOM');

      expect(turns[1]?.id).toBe('live-a1');
      expect(turns[1]?.role).toBe('assistant');
      expect(turns[1]?.turnIndex).toBe(1);
      expect(turns[1]?.content).toContain('Currently visible response');
    });
  });

  describe('Sidebar History Enumeration', () => {
    it('enumerates conversations from sidebar navigation links', async () => {
      const nav = document.createElement('nav');
      nav.innerHTML = `
        <a href="/c/671b281f-8294-800c-8822-b2a8fe47b669">
          <div class="title">React Hooks Architecture</div>
        </a>
        <a href="/c/883a4521-1122-3344-5566-778899aabbcc">
          <div class="title">TypeScript Generics Guide</div>
        </a>
        <a href="/c/671b281f-8294-800c-8822-b2a8fe47b669">
          <div class="title">Duplicate Item</div>
        </a>
      `;
      document.body.appendChild(nav);

      const items = await adapter.enumerateConversations();
      expect(items.length).toBe(2);

      expect(items[0]?.conversationId).toBe('671b281f-8294-800c-8822-b2a8fe47b669');
      expect(items[0]?.title).toBe('React Hooks Architecture');
      expect(items[0]?.url).toBe('https://chatgpt.com/c/671b281f-8294-800c-8822-b2a8fe47b669');
      expect(items[0]?.site).toBe('chatgpt');

      expect(items[1]?.conversationId).toBe('883a4521-1122-3344-5566-778899aabbcc');
      expect(items[1]?.title).toBe('TypeScript Generics Guide');
    });

    it('respects AbortSignal during enumeration', async () => {
      const nav = document.createElement('nav');
      nav.innerHTML = `
        <a href="/c/c-1">Item 1</a>
        <a href="/c/c-2">Item 2</a>
      `;
      document.body.appendChild(nav);

      const controller = new AbortController();
      controller.abort();

      const items = await adapter.enumerateConversations(controller.signal);
      expect(items).toEqual([]);
    });
  });

  describe('Status, Title & Metadata Helpers', () => {
    it('detects streaming status when stop button is present', () => {
      expect(adapter.isStreaming()).toBe(false);

      const stopBtn = document.createElement('button');
      stopBtn.setAttribute('data-testid', 'stop-button');
      document.body.appendChild(stopBtn);

      expect(adapter.isStreaming()).toBe(true);

      stopBtn.remove();
      expect(adapter.isStreaming()).toBe(false);
    });

    it('extracts title from h1 or document.title', () => {
      const h1 = document.createElement('h1');
      h1.textContent = 'Data Structures in Go - ChatGPT';
      document.body.appendChild(h1);

      expect(adapter.extractTitle()).toBe('Data Structures in Go');

      h1.remove();
      document.title = 'Clean Architecture';
      expect(adapter.extractTitle()).toBe('Clean Architecture');
    });

    it('extracts conversationId from URL pathname or active sidebar link', () => {
      (globalThis as any).window.location.pathname = '/c/99887766-5544-3322-1100-aabbccddeeff';
      expect(adapter.extractConversationId()).toBe('99887766-5544-3322-1100-aabbccddeeff');

      (globalThis as any).window.location.pathname = '/';
      const activeLink = document.createElement('a');
      activeLink.className = 'active';
      activeLink.setAttribute('href', '/c/active-conv-id');
      const nav = document.createElement('nav');
      nav.appendChild(activeLink);
      document.body.appendChild(nav);

      expect(adapter.extractConversationId()).toBe('active-conv-id');
    });
  });

  describe('IChatbotAdapter Real-Time Prompt Refiner Compatibility', () => {
    it('interacts with active composer input and button', () => {
      const textarea = document.createElement('textarea');
      textarea.id = 'prompt-textarea';
      document.body.appendChild(textarea);

      expect(adapter.getActiveInput()).toBe(textarea);
      adapter.setInputText('Refined prompt for Allie');
      expect(adapter.getInputText()).toBe('Refined prompt for Allie');

      const sendBtn = document.createElement('button');
      sendBtn.setAttribute('data-testid', 'send-button');
      document.body.appendChild(sendBtn);

      expect(adapter.getSubmitButton()).toBe(sendBtn);
    });

    it('intercepts submit and invokes onRefine callback before submission', async () => {
      const input = document.createElement('textarea');
      input.id = 'prompt-textarea';
      input.value = 'Raw user prompt';

      const sendBtn = document.createElement('button');
      sendBtn.setAttribute('data-testid', 'send-button');

      document.body.appendChild(input);
      document.body.appendChild(sendBtn);

      let refinedPrompt = '';
      const cleanup = adapter.interceptSubmit(async (text) => {
        refinedPrompt = `Refined: ${text}`;
        return true;
      });

      sendBtn.click();
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(refinedPrompt).toBe('Refined: Raw user prompt');
      cleanup();
    });

    it('scrapes completed turns for real-time persona analysis via scrapeTurns', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div data-message-author-role="user" data-message-id="u1">Explain quantum computing</div>
        <div data-message-author-role="assistant" data-message-id="a1">Quantum computing uses qubits...</div>
      `;
      document.body.appendChild(container);

      const turns = adapter.scrapeTurns();
      expect(turns.length).toBe(2);
      expect(turns[0]?.role).toBe('user');
      expect(turns[0]?.content).toBe('Explain quantum computing');
      expect(turns[1]?.role).toBe('assistant');
      expect(turns[1]?.content).toBe('Quantum computing uses qubits...');
    });
  });

  describe('Adversarial Edge Cases, Hardening & Deep Virtualization Verification', () => {
    it('preserves multi-line CodeMirror 6 code blocks with .cm-line elements without smashing lines together', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="assistant" data-message-id="cm-multi">
            <div class="markdown">
              <pre><div class="cm-content">
                <div class="cm-line">const port = 3000;</div>
                <div class="cm-line">const host = '0.0.0.0';</div>
                <div class="cm-line">server.listen(port, host);</div>
              </div></pre>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      const content = turns[0]!.content;
      // All 3 lines must have newlines between them, not smashed as "const port = 3000;const host..."
      expect(content).toContain('const port = 3000;\n');
      expect(content).toContain('const host = \'0.0.0.0\';\n');
      expect(content).toContain('server.listen(port, host);');
    });

    it('detects language from ancestor .code-block container with data-language or sibling header', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="assistant" data-message-id="lang-test">
            <div class="markdown">
              <div class="code-block" data-language="rust">
                <div class="code-header">
                  <span class="language-label">rust</span>
                </div>
                <pre><code>fn main() { println!("Hello world"); }</code></pre>
              </div>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]!.content).toContain('```rust\nfn main() { println!("Hello world"); }\n```');
    });

    it('extracts OpenAI reasoning header when placed on turn container (article) outside assistant role element', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-1">
          <div class="flex items-start gap-3 pb-2">
            <button>Thought for 15 seconds</button>
          </div>
          <div data-message-author-role="assistant" data-message-id="reason-container-test">
            <div class="markdown">
              <p>Here is the analyzed outcome.</p>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]!.thinking).toBe('Thought for 15 seconds');
      expect(turns[0]!.content).toBe('Here is the analyzed outcome.');
      expect(turns[0]!.content).not.toContain('Thought for 15 seconds');
    });

    it('extracts model slug when placed on ancestor turnContainer (article)', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-1" data-message-model-slug="o3-mini">
          <div data-message-author-role="assistant" data-message-id="slug-container-test">
            <div class="markdown"><p>Response from o3-mini.</p></div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]!.modelSlug).toBe('o3-mini');
    });

    it('deduplicates live DOM and virtual cache turns even when data-message-id is absent', async () => {
      // Simulate live DOM having Turn 0 (user) without data-message-id
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user">
            <div class="whitespace-pre-wrap">Question without message ID</div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      // Pre-populate virtualCache with Turn 0 snapshot captured during scroll
      adapter.virtualCache.captureFromRoot(main, adapter);
      expect(adapter.virtualCache.size).toBe(1);

      // Scrape turns: must NOT create duplicate Turn 0
      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);
      expect(turns[0]!.turnIndex).toBe(0);
      expect(turns[0]!.content).toContain('Question without message ID');
    });

    it('preserves natural alternating DOM order when turns lack data-testid or turnIndex', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <div data-message-author-role="user">Turn A (User)</div>
        <div data-message-author-role="assistant">Turn B (Assistant)</div>
        <div data-message-author-role="user">Turn C (User)</div>
        <div data-message-author-role="assistant">Turn D (Assistant)</div>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(4);
      expect(turns[0]!.role).toBe('user');
      expect(turns[0]!.content).toContain('Turn A (User)');
      expect(turns[1]!.role).toBe('assistant');
      expect(turns[1]!.content).toContain('Turn B (Assistant)');
      expect(turns[2]!.role).toBe('user');
      expect(turns[2]!.content).toContain('Turn C (User)');
      expect(turns[3]!.role).toBe('assistant');
      expect(turns[3]!.content).toContain('Turn D (Assistant)');
    });

    it('recovers deep 50+ turn conversation where 35 turns were evicted by React virtualizer', async () => {
      // Setup: 52 total turns (0 to 51).
      // Turns 0..34 are evicted from live DOM, but exist in adapter.virtualCache.
      // Turns 35..51 remain mounted in the live DOM.
      const cache = adapter.virtualCache;

      for (let i = 0; i < 35; i++) {
        const isUser = i % 2 === 0;
        const el = document.createElement('div');
        el.setAttribute('data-message-author-role', isUser ? 'user' : 'assistant');
        el.setAttribute('data-message-id', `msg-deep-${i}`);
        el.setAttribute('data-testid', `conversation-turn-${i}`);
        el.innerHTML = isUser
          ? `<div class="whitespace-pre-wrap">User deep message ${i}</div>`
          : `<div class="markdown"><p>Assistant deep message ${i}</p></div>`;

        cache.set(`msg-deep-${i}`, el, i);
      }

      // Mount only turns 35..51 into the live DOM
      const main = document.createElement('main');
      for (let i = 35; i < 52; i++) {
        const isUser = i % 2 === 0;
        const article = document.createElement('article');
        article.setAttribute('data-testid', `conversation-turn-${i}`);
        article.innerHTML = `
          <div data-message-author-role="${isUser ? 'user' : 'assistant'}" data-message-id="msg-deep-${i}">
            ${isUser ? `<div class="whitespace-pre-wrap">User deep message ${i}</div>` : `<div class="markdown"><p>Assistant deep message ${i}</p></div>`}
          </div>
        `;
        main.appendChild(article);
      }
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(52);

      // Verify strict sequential ordering and integrity from 0 to 51
      for (let i = 0; i < 52; i++) {
        expect(turns[i]!.turnIndex).toBe(i);
        expect(turns[i]!.id).toBe(`msg-deep-${i}`);
        const expectedRole = i % 2 === 0 ? 'user' : 'assistant';
        expect(turns[i]!.role).toBe(expectedRole);
        expect(turns[i]!.content).toContain(`deep message ${i}`);
      }
    });

    it('rejects sidebar navigation with overflow-y-auto when scroll-root is absent', () => {
      // Simulate sidebar appearing before main in document order
      const navSidebar = document.createElement('nav');
      const sidebarScroll = document.createElement('div');
      sidebarScroll.className = 'overflow-y-auto';
      (sidebarScroll as any).scrollHeight = 3000;
      (sidebarScroll as any).clientHeight = 600;
      navSidebar.appendChild(sidebarScroll);
      document.body.appendChild(navSidebar);

      const main = document.createElement('main');
      (main as any).scrollHeight = 1000;
      (main as any).clientHeight = 1000;
      document.body.appendChild(main);

      const scroller = adapter.getScrollContainer();
      // Must NOT return sidebarScroll!
      expect(scroller).not.toBe(sidebarScroll);
      expect(scroller === main || scroller === document.body).toBe(true);
    });
  });
});
