import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom } from '../fixtures/mock-dom';
import { TextSanitizer } from '@/core/harvest/extraction/text-sanitizer';
import { GeminiAdapter } from '@/adapters/chatbots/gemini/adapter';
import { GeminiContainerPairer } from '@/adapters/chatbots/gemini/container-pairer';
import { GEMINI_SELECTORS } from '@/adapters/chatbots/gemini/selectors';
import type { IHarvesterAdapter } from '@/adapters/chatbots/types';

setupMockDom();

describe('Phase 1: Gemini Harvester & Core Type Foundations', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    setupMockDom();
    adapter = new GeminiAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('TextSanitizer', () => {
    it('strips <script>, <style>, and <noscript> tags without affecting body text', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Hello Gemini</p>
        <script>alert("hack");</script>
        <style>.anim { color: red; }</style>
        <noscript>Turn on JS</noscript>
        <span>Response text</span>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('Hello Gemini');
      expect(result).toContain('Response text');
      expect(result).not.toContain('alert');
      expect(result).not.toContain('.anim');
      expect(result).not.toContain('Turn on JS');
    });

    it('converts <pre><code> blocks into markdown fences with detected language', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Here is some code:</p>
        <pre><code class="language-typescript">const answer = 42;
console.log(answer);</code></pre>
        <p>Done.</p>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('```typescript\nconst answer = 42;\nconsole.log(answer);\n```');
      expect(result).toContain('Here is some code:');
      expect(result).toContain('Done.');
    });

    it('detects language from data-language attribute', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <pre data-language="python"><code>def greet():
    print("hello")</code></pre>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('```python\ndef greet():\n    print("hello")\n```');
    });

    it('detects language from inner .code-language label', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="code-block">
          <span class="code-language">Rust</span>
          <code>fn main() { println!("hi"); }</code>
        </div>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('```rust\nfn main() { println!("hi"); }\n```');
    });

    it('normalizes excessive blank lines and trims edges', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        

        Line 1


        Line 2



      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('strips interactive buttons, action bars, and UI chrome from response text', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="model-response-text">Here is your solution.</div>
        <button class="copy-btn">Copy code</button>
        <div class="message-actions">
          <button aria-label="Good response">Thumbs up</button>
          <button aria-label="Share">Share</button>
        </div>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toBe('Here is your solution.');
      expect(result).not.toContain('Copy code');
      expect(result).not.toContain('Thumbs up');
    });

    it('preserves nested list hierarchy and markdown indentation', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>- Overview</p>
        <p>  - Sub-bullet A</p>
        <p>    - Deep nested item</p>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('- Overview\n  - Sub-bullet A\n    - Deep nested item');
    });

    it('synthesizes KaTeX and MathML mathematical equations into LaTeX markdown', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Einstein discovered that:</p>
        <span class="katex">
          <span class="katex-mathml">
            <math xmlns="http://www.w3.org/1998/Math/MathML">
              <semantics>
                <annotation encoding="application/x-tex">E = mc^2</annotation>
              </semantics>
            </math>
          </span>
          <span class="katex-html" aria-hidden="true">
            <span class="base">E=mc2</span>
          </span>
        </span>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('Einstein discovered that:\n$E = mc^2$');
      expect(result).not.toContain('E=mc2');
    });

    it('synthesizes block/display KaTeX equations with $$ fences', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="katex-display">
          <span class="katex">
            <annotation encoding="application/x-tex">\\sum_{i=1}^n i = \\frac{n(n+1)}{2}</annotation>
          </span>
        </div>
      `;
      const result = TextSanitizer.extractTextContent(container);
      expect(result).toBe('$$\n\\sum_{i=1}^n i = \\frac{n(n+1)}{2}\n$$');
    });

    it('handles null, undefined, or empty elements safely', () => {
      expect(TextSanitizer.extractTextContent(null)).toBe('');
      const empty = document.createElement('div');
      expect(TextSanitizer.extractTextContent(empty)).toBe('');
    });

    describe('sanitizeFilename', () => {
      it('replaces illegal filesystem characters with underscores', () => {
        expect(TextSanitizer.sanitizeFilename('report: 2026/09/05 <final>?')).toBe(
          'report_2026_09_05_final'
        );
      });

      it('strips trailing periods and whitespace for Windows NTFS safety', () => {
        expect(TextSanitizer.sanitizeFilename('quarterly_report.')).toBe('quarterly_report');
        expect(TextSanitizer.sanitizeFilename('summary...   ')).toBe('summary');
      });

      it('collapses multiple underscores and spaces', () => {
        expect(TextSanitizer.sanitizeFilename('foo   bar___baz')).toBe('foo_bar_baz');
      });

      it('truncates to maxLen', () => {
        const longName = 'a'.repeat(250);
        const sanitized = TextSanitizer.sanitizeFilename(longName, 50);
        expect(sanitized.length).toBeLessThanOrEqual(50);
      });

      it('defaults to "untitled" for empty or whitespace-only inputs', () => {
        expect(TextSanitizer.sanitizeFilename('')).toBe('untitled');
        expect(TextSanitizer.sanitizeFilename('   ')).toBe('untitled');
        expect(TextSanitizer.sanitizeFilename('???///')).toBe('untitled');
      });
    });

    describe('cleanTitle', () => {
      it('strips provider branding suffix', () => {
        expect(TextSanitizer.cleanTitle('Quantum Mechanics - Gemini')).toBe('Quantum Mechanics');
        expect(TextSanitizer.cleanTitle('Claude Chat - Claude')).toBe('Claude Chat');
        expect(TextSanitizer.cleanTitle('Coding Task - ChatGPT')).toBe('Coding Task');
      });

      it('collapses double-rendered tooltip text for phrases with spaces', () => {
        expect(TextSanitizer.cleanTitle('Project AlphaProject Alpha')).toBe('Project Alpha');
        expect(TextSanitizer.cleanTitle('Chat NameChat Name')).toBe('Chat Name');
      });

      it('preserves valid repetitive dictionary words without truncating them', () => {
        expect(TextSanitizer.cleanTitle('Murmur')).toBe('Murmur');
        expect(TextSanitizer.cleanTitle('Bonbon')).toBe('Bonbon');
        expect(TextSanitizer.cleanTitle('Beriberi')).toBe('Beriberi');
        expect(TextSanitizer.cleanTitle('EchoEcho')).toBe('EchoEcho');
      });

      it('normalizes bare provider app names to Untitled Conversation', () => {
        expect(TextSanitizer.cleanTitle('Gemini')).toBe('Untitled Conversation');
        expect(TextSanitizer.cleanTitle('Google Gemini')).toBe('Untitled Conversation');
        expect(TextSanitizer.cleanTitle('Claude')).toBe('Untitled Conversation');
      });

      it('handles empty titles with fallback', () => {
        expect(TextSanitizer.cleanTitle('')).toBe('Untitled Conversation');
        expect(TextSanitizer.cleanTitle('   ')).toBe('Untitled Conversation');
      });
    });

    describe('getTimestamp', () => {
      it('generates filename-safe ISO timestamp', () => {
        const d = new Date('2026-09-05T20:30:00.000Z');
        expect(TextSanitizer.getTimestamp(d)).toBe('2026-09-05T20-30-00');
      });
    });
  });

  describe('GeminiAdapter - IHarvesterAdapter Contract', () => {
    it('implements IHarvesterAdapter interface', () => {
      const harvester: IHarvesterAdapter = adapter;
      expect(harvester.platform).toBe('gemini');
      expect(typeof harvester.getScrollContainer).toBe('function');
      expect(typeof harvester.getLoadingIndicatorSelector).toBe('function');
      expect(typeof harvester.getExpandButtonSelectors).toBe('function');
      expect(typeof harvester.requiresVirtualizationCache).toBe('function');
      expect(typeof harvester.scrapeHarvestTurns).toBe('function');
      expect(typeof harvester.sanitizeTurnNode).toBe('function');
    });

    it('requiresVirtualizationCache returns false for Gemini', () => {
      expect(adapter.requiresVirtualizationCache()).toBe(false);
    });

    it('resolves scrollContainer matching #chat-history', () => {
      const scroller = document.createElement('div');
      scroller.id = 'chat-history';
      document.body.appendChild(scroller);

      expect(adapter.getScrollContainer()).toBe(scroller);
    });

    it('returns valid loadingIndicatorSelector', () => {
      const selector = adapter.getLoadingIndicatorSelector();
      expect(selector).toContain('mat-progress-spinner');
      expect(selector).toContain('.mdc-circular-progress');
    });

    it('returns expandButtonSelectors for thinking toggles', () => {
      const selectors = adapter.getExpandButtonSelectors();
      expect(selectors.length).toBeGreaterThan(0);
      expect(selectors.some(s => s.includes('model-thoughts'))).toBe(true);
    });

    it('detects streaming status via isStreaming()', () => {
      expect(adapter.isStreaming()).toBe(false);

      const stopBtn = document.createElement('button');
      stopBtn.setAttribute('aria-label', 'Stop generation');
      document.body.appendChild(stopBtn);

      expect(adapter.isStreaming()).toBe(true);

      stopBtn.remove();
      const generating = document.createElement('div');
      generating.className = 'streaming-indicator';
      document.body.appendChild(generating);

      expect(adapter.isStreaming()).toBe(true);
    });

    it('extracts conversation title from DOM landmarks with document.title fallback', () => {
      document.title = 'Fallback Title - Gemini';
      expect(adapter.extractTitle()).toBe('Fallback Title');

      const titleEl = document.createElement('h1');
      titleEl.setAttribute('data-conversation-title', 'true');
      titleEl.textContent = 'Custom DOM Title - Gemini';
      document.body.appendChild(titleEl);

      expect(adapter.extractTitle()).toBe('Custom DOM Title');
    });

    it('extracts conversationId from window.location.pathname', () => {
      const originalPathname = window.location.pathname;
      window.location.pathname = '/app/a1b2c3d4e5f6';

      expect(adapter.extractConversationId()).toBe('a1b2c3d4e5f6');

      window.location.pathname = originalPathname;
    });


    it('enumerates sidebar conversations correctly', async () => {
      const nav = document.createElement('nav');
      nav.innerHTML = `
        <a data-conversation-id="conv1" href="/app/conv1">First Chat - Gemini</a>
        <a href="/app/conv2">Second ChatSecond Chat</a>
        <a href="/app/conv1">Duplicate First Chat</a>
        <a href="/other/link">Irrelevant link</a>
      `;
      document.body.appendChild(nav);

      const list = await adapter.enumerateConversations();
      expect(list).toHaveLength(2);
      expect(list[0]).toEqual({
        site: 'gemini',
        conversationId: 'conv1',
        url: 'https://gemini.google.com/app/conv1',
        title: 'First Chat'
      });
      expect(list[1]).toEqual({
        site: 'gemini',
        conversationId: 'conv2',
        url: 'https://gemini.google.com/app/conv2',
        title: 'Second Chat'
      });
    });

    it('sanitizeTurnNode removes thinking toggle buttons', () => {
      const cloned = document.createElement('div');
      cloned.innerHTML = `
        <div class="content">Answer text</div>
        <model-thoughts><button>Show thoughts</button></model-thoughts>
      `;
      adapter.sanitizeTurnNode(cloned);
      expect(cloned.querySelector('button')).toBeNull();
      expect(cloned.textContent).toContain('Answer text');
    });
  });

  describe('GeminiContainerPairer - Structured Container Pairing', () => {
    it('pairs <user-query> and <model-response> in .conversation-container', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>
          <div class="query-text">What is the capital of France?</div>
        </user-query>
        <model-response>
          <div class="model-response-text">The capital of France is Paris.</div>
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(2);

      expect(turns[0]).toMatchObject({
        id: 'gemini-u-0',
        turnIndex: 0,
        role: 'user',
        content: 'What is the capital of France?'
      });

      expect(turns[1]).toMatchObject({
        id: 'gemini-a-0',
        turnIndex: 1,
        role: 'assistant',
        content: 'The capital of France is Paris.'
      });
    });

    it('isolates Chain-of-Thought thinking traces and excludes them from assistant body content', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>
          <div class="query-text">Explain relativity</div>
        </user-query>
        <model-response>
          <model-thoughts>
            <button>Thinking</button>
            <div class="thoughts-body">1. Recall Einstein 1905\n2. Frame equations</div>
          </model-thoughts>
          <div class="model-response-text">
            Relativity describes how space and time are linked for objects moving at a consistent speed.
          </div>
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(2);

      const assistantTurn = turns[1]!;
      expect(assistantTurn.role).toBe('assistant');
      expect(assistantTurn.thinking).toBe('1. Recall Einstein 1905\n2. Frame equations');
      expect(assistantTurn.content).not.toContain('Recall Einstein');
      expect(assistantTurn.content).toContain('Relativity describes how space and time are linked');
    });

    it('extracts embedded images into attachments while filtering out profile avatars', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>
          <img class="avatar" src="https://lh3.googleusercontent.com/avatar.jpg" />
          <img src="blob:https://gemini.google.com/uploaded-img-1" />
          <div class="query-text">Analyze this chart</div>
        </user-query>
        <model-response>
          <div class="model-response-text">Here is the chart analysis:</div>
          <img src="https://lh3.googleusercontent.com/generated-plot-2.png" />
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(2);

      // User attachments
      expect(turns[0]!.attachments).toBeDefined();
      expect(turns[0]!.attachments).toHaveLength(1);
      expect(turns[0]!.attachments![0]).toEqual({
        type: 'image',
        originalSrc: 'blob:https://gemini.google.com/uploaded-img-1',
        turnIndex: 0
      });

      // Assistant attachments
      expect(turns[1]!.attachments).toBeDefined();
      expect(turns[1]!.attachments).toHaveLength(1);
      expect(turns[1]!.attachments![0]).toEqual({
        type: 'image',
        originalSrc: 'https://lh3.googleusercontent.com/generated-plot-2.png',
        turnIndex: 1
      });
    });

    it('preserves code blocks with language fences in harvested content', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>Write a python script</user-query>
        <model-response>
          <p>Here is your script:</p>
          <pre data-language="python"><code>import os
print(os.getcwd())</code></pre>
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns[1]!.content).toContain('```python\nimport os\nprint(os.getcwd())\n```');
    });

    it('falls back gracefully to un-nested pairing when .conversation-container is absent', async () => {
      const root = document.createElement('div');
      root.innerHTML = `
        <user-query>Standalone Question 1</user-query>
        <model-response>Standalone Answer 1</model-response>
        <user-query>Standalone Question 2</user-query>
        <model-response>Standalone Answer 2</model-response>
      `;
      document.body.appendChild(root);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(4);
      expect(turns[0]!.role).toBe('user');
      expect(turns[0]!.content).toBe('Standalone Question 1');
      expect(turns[1]!.role).toBe('assistant');
      expect(turns[1]!.content).toBe('Standalone Answer 1');
      expect(turns[2]!.role).toBe('user');
      expect(turns[2]!.content).toBe('Standalone Question 2');
      expect(turns[3]!.role).toBe('assistant');
      expect(turns[3]!.content).toBe('Standalone Answer 2');
    });

    it('handles container with only user-query (in-flight prompt)', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>Waiting for reply...</user-query>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(1);
      expect(turns[0]!.role).toBe('user');
      expect(turns[0]!.content).toBe('Waiting for reply...');
    });

    it('deduplicates ancestor wrapper containers without duplicating turns', async () => {
      const outer = document.createElement('div');
      outer.setAttribute('data-conversation-id', 'root-conv-123');
      outer.innerHTML = `
        <div class="conversation-container">
          <user-query><div class="query-text">Question 1</div></user-query>
          <model-response><div class="model-response-text">Answer 1</div></model-response>
        </div>
        <div class="conversation-container">
          <user-query><div class="query-text">Question 2</div></user-query>
          <model-response><div class="model-response-text">Answer 2</div></model-response>
        </div>
      `;
      document.body.appendChild(outer);

      const turns = await adapter.scrapeHarvestTurns();
      // Must NOT extract 4 turns from outer wrapper + 4 turns from inner containers
      expect(turns).toHaveLength(4);
      expect(turns[0]!.content).toBe('Question 1');
      expect(turns[1]!.content).toBe('Answer 1');
      expect(turns[2]!.content).toBe('Question 2');
      expect(turns[3]!.content).toBe('Answer 2');
      expect(turns[0]!.id).toBe('gemini-u-0');
      expect(turns[1]!.id).toBe('gemini-a-0');
      expect(turns[2]!.id).toBe('gemini-u-1');
      expect(turns[3]!.id).toBe('gemini-a-1');
    });

    it('handles multiple turns inside a single container without dropping subsequent turns', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query><div class="query-text">First Prompt</div></user-query>
        <model-response><div class="model-response-text">First Reply</div></model-response>
        <user-query><div class="query-text">Followup Prompt</div></user-query>
        <model-response><div class="model-response-text">Followup Reply</div></model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(4);
      expect(turns.map(t => t.content)).toEqual([
        'First Prompt',
        'First Reply',
        'Followup Prompt',
        'Followup Reply'
      ]);
    });

    it('completely isolates thinking headers and metadata without leaking into assistant content', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query><div class="query-text">Complex Question</div></user-query>
        <model-response>
          <model-thoughts>
            <div class="thinking-header">
              <button>Thinking Process</button>
              <span class="elapsed">Thought for 18 seconds</span>
            </div>
            <div class="thoughts-body">
              Step 1: Check constraints\nStep 2: Derive theorem
            </div>
          </model-thoughts>
          <div class="model-response-text">The theorem is proved.</div>
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(2);
      const assistantTurn = turns[1]!;
      expect(assistantTurn.thinking).toContain('Step 1: Check constraints');
      expect(assistantTurn.content).toBe('The theorem is proved.');
      expect(assistantTurn.content).not.toContain('Thought for 18 seconds');
      expect(assistantTurn.content).not.toContain('Thinking Process');
    });

    it('deduplicates duplicate image sources in a single turn and filters out presentation icons', async () => {
      const container = document.createElement('div');
      container.className = 'conversation-container';
      container.innerHTML = `
        <user-query>
          <img src="https://lh3.googleusercontent.com/chart.png" alt="thumbnail" />
          <img src="https://lh3.googleusercontent.com/chart.png" alt="full-preview" />
          <img src="https://www.gstatic.com/sparkle.svg" class="icon" />
        </user-query>
        <model-response>
          <p>Analysis complete</p>
        </model-response>
      `;
      document.body.appendChild(container);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns[0]!.attachments).toBeDefined();
      expect(turns[0]!.attachments).toHaveLength(1);
      expect(turns[0]!.attachments![0]!.originalSrc).toBe('https://lh3.googleusercontent.com/chart.png');
    });

    it('sorts turns by document tree order when assistant greets before user in fallback mode', async () => {
      const root = document.createElement('div');
      root.innerHTML = `
        <model-response><div class="model-response-text">Welcome to Gemini!</div></model-response>
        <user-query><div class="query-text">Hi there</div></user-query>
      `;
      document.body.appendChild(root);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toHaveLength(2);
      expect(turns[0]!.role).toBe('assistant');
      expect(turns[0]!.content).toBe('Welcome to Gemini!');
      expect(turns[1]!.role).toBe('user');
      expect(turns[1]!.content).toBe('Hi there');
    });

    it('extractConversationId ignores reserved routes and falls back to DOM attribute', () => {
      const originalPath = window.location.pathname;
      window.location.pathname = '/app/activity';
      expect(adapter.extractConversationId()).toBe('');

      window.location.pathname = '/app/new';
      expect(adapter.extractConversationId()).toBe('');

      window.location.pathname = '/app';
      const domEl = document.createElement('div');
      domEl.setAttribute('data-conversation-id', 'fallback-id-999');
      document.body.appendChild(domEl);

      expect(adapter.extractConversationId()).toBe('fallback-id-999');

      window.location.pathname = originalPath;
    });

    it('returns empty array when no messages exist', async () => {
      const turns = await adapter.scrapeHarvestTurns();
      expect(turns).toEqual([]);
    });
  });
});
