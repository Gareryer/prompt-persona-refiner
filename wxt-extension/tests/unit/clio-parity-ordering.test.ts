import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setupMockDom, MockElement } from '../fixtures/mock-dom';
import { VirtualMessageCache } from '@/core/harvest/scroller/virtual-cache';
import { ChatGPTAdapter } from '@/adapters/chatbots/chatgpt/adapter';
import { ClaudeAdapter } from '@/adapters/chatbots/claude/adapter';
import { GeminiAdapter } from '@/adapters/chatbots/gemini/adapter';

setupMockDom();

describe('Clio Parity: Bottom-Anchored Virtualization & Turn Ordering (#264)', () => {
  let cache: VirtualMessageCache;
  let scroller: HTMLElement;

  beforeEach(() => {
    setupMockDom();
    cache = new VirtualMessageCache({ maxEntries: 50 });
    scroller = document.createElement('div');
    (scroller as any).scrollHeight = 2000;
    (scroller as any).clientHeight = 800;
    scroller.scrollTop = 0;
    document.body.appendChild(scroller);
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('VirtualMessageCache - measureFromBottom Invariant', () => {
    it('computes measureFromBottom as (scrollHeight - offsetTop) when scroller provided', () => {
      const el1 = document.createElement('article');
      (el1 as any).offsetTop = 400; // bottomDistance = 2000 - 400 = 1600
      scroller.appendChild(el1);

      const el2 = document.createElement('article');
      (el2 as any).offsetTop = 1500; // bottomDistance = 2000 - 1500 = 500
      scroller.appendChild(el2);

      cache.set('msg-1', el1, 0, scroller);
      cache.set('msg-2', el2, 1, scroller);

      const entry1 = cache.getEntry('msg-1')!;
      const entry2 = cache.getEntry('msg-2')!;

      expect(entry1.measureFromBottom).toBe(1600);
      expect(entry2.measureFromBottom).toBe(500);

      // In chronological order, earlier message (el1) is farther from bottom (1600 > 500)
      const sorted = cache.getAllSorted();
      expect(sorted.map(e => e.id)).toEqual(['msg-1', 'msg-2']);
    });

    it('remeasures settled DOM elements on demand', () => {
      const el = document.createElement('article');
      el.setAttribute('data-message-id', 'msg-1');
      (el as any).offsetTop = 1000;
      scroller.appendChild(el);

      cache.set('msg-1', el, 0, scroller);
      expect(cache.getEntry('msg-1')!.measureFromBottom).toBe(1000);

      // Layout shift occurs during upward scroll (scrollHeight expands to 3000, offsetTop becomes 1200)
      (scroller as any).scrollHeight = 3000;
      (el as any).offsetTop = 1200;

      const updatedCount = cache.remeasureSettled(scroller);
      expect(updatedCount).toBe(1);
      // New measureFromBottom: 3000 - 1200 = 1800
      expect(cache.getEntry('msg-1')!.measureFromBottom).toBe(1800);
    });

    it('falls back to monotonic sequence ordering if elements lack measureFromBottom', () => {
      const el1 = document.createElement('article');
      const el2 = document.createElement('article');

      // Set without scroller (e.g. elements not yet mounted or measurements unavailable)
      cache.set('msg-a', el1, 0);
      cache.set('msg-b', el2, 1);

      expect(cache.getEntry('msg-a')!.measureFromBottom).toBeUndefined();
      expect(cache.getEntry('msg-b')!.measureFromBottom).toBeUndefined();

      const sorted = cache.getAllSorted();
      expect(sorted.map(e => e.id)).toEqual(['msg-a', 'msg-b']);

      const stats = cache.getCaptureOrderStats();
      expect(stats.total).toBe(2);
      expect(stats.fromBottom).toBe(0);
      expect(stats.bySeqFallback).toBe(2);
      expect(stats.sortedBy).toBe('seq');
    });

    it('reports capture order stats when bottom-distance metrics are recorded', () => {
      const el1 = document.createElement('article');
      (el1 as any).offsetTop = 200;
      scroller.appendChild(el1);

      cache.set('msg-1', el1, 0, scroller);

      const stats = cache.getCaptureOrderStats();
      expect(stats.total).toBe(1);
      expect(stats.fromBottom).toBe(1);
      expect(stats.bySeqFallback).toBe(0);
      expect(stats.sortedBy).toBe('measureFromBottom');
    });
  });

  describe('Harvester Adapter Configuration & Site-Scoping Parity', () => {
    it('configures ordersFromCapture = true for ChatGPT only', () => {
      const chatgpt = new ChatGPTAdapter();
      const claude = new ClaudeAdapter();
      const gemini = new GeminiAdapter();

      expect(chatgpt.ordersFromCapture).toBe(true);
      expect(claude.ordersFromCapture).toBe(false);
      expect(gemini.ordersFromCapture).toBe(false);
    });

    it('ChatGPT adapter preserves bottom-distance turn ordering during scrapeHarvestTurns', async () => {
      const adapter = new ChatGPTAdapter();
      const main = document.createElement('main');

      main.innerHTML = `
        <article data-testid="conversation-turn-0">
          <div data-message-author-role="user" data-message-id="msg-u1">
            <div class="whitespace-pre-wrap">First question</div>
          </div>
        </article>
        <article data-testid="conversation-turn-1">
          <div data-message-author-role="assistant" data-message-id="msg-a1" data-message-model-slug="gpt-4o">
            <div class="markdown"><p>First answer</p></div>
          </div>
        </article>
        <article data-testid="conversation-turn-2">
          <div data-message-author-role="user" data-message-id="msg-u2">
            <div class="whitespace-pre-wrap">Second question</div>
          </div>
        </article>
        <article data-testid="conversation-turn-3">
          <div data-message-author-role="assistant" data-message-id="msg-a2" data-message-model-slug="gpt-4o">
            <div class="markdown"><p>Second answer</p></div>
          </div>
        </article>
      `;
      document.body.appendChild(main);

      const turns = await adapter.scrapeHarvestTurns();
      expect(turns.length).toBe(4);
      expect(turns.map(t => t.id)).toEqual(['msg-u1', 'msg-a1', 'msg-u2', 'msg-a2']);
      expect(turns.map(t => t.turnIndex)).toEqual([0, 1, 2, 3]);
    });
  });
});
