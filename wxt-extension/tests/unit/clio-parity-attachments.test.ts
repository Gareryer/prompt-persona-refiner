import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom } from '../fixtures/mock-dom';
import { MediaExtractor } from '@/core/harvest/extraction/media-extractor';
import { ChatGPTAdapter } from '@/adapters/chatbots/chatgpt/adapter';
import { CHATGPT_SELECTORS } from '@/adapters/chatbots/chatgpt/selectors';

setupMockDom();

describe('Clio Parity: In-Scroll File Attachments & Citation Filtering (#264, #263)', () => {
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

  describe('ChatGPT In-Scroll File Card Harvesting', () => {
    it('harvests uploaded file attachments with name, label, and download link', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            <div class="whitespace-pre-wrap">Please analyze this dataset</div>
            <div class="bg-token-main-surface-secondary rounded-2xl p-2">
              <div class="font-semibold">financial_report_2026.csv</div>
              <div class="text-xs text-token-text-tertiary">CSV Spreadsheet</div>
              <a href="blob:https://chatgpt.com/download-123" download="financial_report_2026.csv">Download</a>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const userTurn = turns[0]!;
      expect(userTurn.attachments).toBeDefined();
      expect(userTurn.attachments?.length).toBe(1);

      const attachment = userTurn.attachments![0]!;
      expect(attachment.name).toBe('financial_report_2026.csv');
      expect(attachment.type).toBe('file');
      expect(attachment.kind).toContain('CSV');
      expect(attachment.downloadable).toBe(true);
      expect(attachment.url).toBe('blob:https://chatgpt.com/download-123');
    });

    it('harvests image attachments alongside file attachments without collision', async () => {
      const main = document.createElement('main');
      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            <div class="whitespace-pre-wrap">Look at this screenshot and code</div>
            <img src="https://files.oaiusercontent.com/file-screenshot123" alt="UI Screenshot" />
            <div class="bg-token-main-surface-secondary">
              <div class="title">notes.txt</div>
              <a href="https://chatgpt.com/download-notes" download="notes.txt">Download</a>
            </div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(1);

      const turn = turns[0]!;
      expect(turn.attachments?.length).toBe(2);

      const imgAtt = turn.attachments?.find(a => a.kind === 'image');
      const fileAtt = turn.attachments?.find(a => a.kind === 'file');

      expect(imgAtt).toBeDefined();
      expect(imgAtt?.url).toContain('file-screenshot123');

      expect(fileAtt).toBeDefined();
      expect(fileAtt?.name).toBe('notes.txt');
    });
  });

  describe('MediaExtractor Citation Favicon Filtering', () => {
    it('excludes Google favicon proxy URLs from image extraction (Clio citation filter)', async () => {
      const turns = [
        {
          id: 'turn-1',
          turnIndex: 0,
          role: 'assistant' as const,
          content: 'According to this source...',
          timestamp: Date.now(),
          attachments: [
            { type: 'image' as const, originalSrc: 'https://s2.googleusercontent.com/s2/favicons?domain=wikipedia.org' },
            { type: 'image' as const, originalSrc: 'https://t1.gstatic.com/faviconV2?url=https://arxiv.org' },
            { type: 'image' as const, originalSrc: 'https://example.com/legitimate-diagram.png' }
          ]
        }
      ];

      // Mock global fetch for legitimate diagram
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/png' }),
        blob: () => Promise.resolve(new Blob(['fake-bytes'], { type: 'image/png' }))
      } as any);

      try {
        const result = await MediaExtractor.extractImages(turns);
        // The 2 favicon proxy URLs must be filtered out; only legitimate diagram extracted
        expect(result.images.length).toBe(1);
        expect(result.errors.length).toBe(0);
        expect(result.images[0]!.originalSrc).toBe('https://example.com/legitimate-diagram.png');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('MediaExtractor.fetchImage rejects blacklisted citation favicon URLs', async () => {
      const favicon1 = await MediaExtractor.fetchImage('https://s2.googleusercontent.com/s2/favicons?domain=example.com', 0, 0);
      const favicon2 = await MediaExtractor.fetchImage('https://t1.gstatic.com/faviconV2?client=chrome&url=http://foo.com', 0, 1);

      expect(favicon1.success).toBe(false);
      if (!favicon1.success) {
        expect(favicon1.error).toBe('Ignored citation favicon');
      }
      expect(favicon2.success).toBe(false);
      if (!favicon2.success) {
        expect(favicon2.error).toBe('Ignored citation favicon');
      }
    });
  });

  describe('Selector & Decoration Parity', () => {
    it('defines citationDecoration and uploadedFileCard on CHATGPT_SELECTORS', () => {
      expect(CHATGPT_SELECTORS.citationDecoration).toBeDefined();
      expect(CHATGPT_SELECTORS.citationDecoration).toContain('[aria-label="Sources"]');
      expect(CHATGPT_SELECTORS.uploadedFileCard).toBeDefined();
      expect(CHATGPT_SELECTORS.downloadAffordance).toBeDefined();
    });
  });
});
