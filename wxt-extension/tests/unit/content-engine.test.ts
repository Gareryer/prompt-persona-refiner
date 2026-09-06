import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide lightweight DOM mocks for node environment
const elementsMap = new Map<string, any>();

const mockDocument = {
  body: {
    className: '',
    style: {},
    appendChild: vi.fn(),
    querySelectorAll: vi.fn().mockReturnValue([])
  },
  documentElement: {
    className: '',
    classList: {
      contains: (cls: string) => mockDocument.documentElement.className.includes(cls)
    },
    getAttribute: vi.fn().mockReturnValue(null),
    setAttribute: vi.fn()
  },
  getElementById: (id: string) => elementsMap.get(id) || null,
  createElement: (tag: string) => {
    const el = {
      tagName: tag.toUpperCase(),
      id: '',
      style: { cssText: '' },
      className: '',
      children: [] as any[],
      appendChild: vi.fn((child: any) => {
        el.children.push(child);
      }),
      querySelector: (selector: string) => {
        if (selector === 'iframe') {
          return el.children.find((c: any) => c.tagName === 'IFRAME') || null;
        }
        return null;
      },
      remove: vi.fn(() => {
        if (el.id) elementsMap.delete(el.id);
      }),
      textContent: '',
      innerHTML: ''
    };
    return el;
  },
  querySelectorAll: vi.fn().mockReturnValue([])
};

let registeredMessageListener: ((message: any, sender: any, sendResponse: (res: any) => void) => boolean) | null = null;

(globalThis as any).document = mockDocument;
(globalThis as any).chrome = {
  runtime: {
    id: "mock-ext-id",
    onMessage: {
      addListener: vi.fn((listener: any) => {
        registeredMessageListener = listener;
      })
    }
  }
};
(globalThis as any).window = {
  getComputedStyle: () => ({ backgroundColor: 'rgb(30, 30, 46)' }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { reload: vi.fn(), href: 'https://gemini.google.com/app/test-123', hostname: 'gemini.google.com' }
};
(globalThis as any).location = (globalThis as any).window.location;

import {
  detectPageTheme,
  SplitViewController,
  splitViewController,
  isExtensionContextValid,
  showExtensionReloadNotification,
  ContentTemplates,
  ContentObserver
} from '../../src/content';
import * as adapterRegistry from '../../src/adapters/chatbots/registry';
import { MediaExtractor } from '../../src/core/harvest/extraction/media-extractor';

describe('Phase 3 Content Script & Scraper Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDocument.body.className = '';
    mockDocument.documentElement.className = '';
    elementsMap.clear();
  });

  describe('Theme Detector', () => {
    it('detects dark theme from dark-theme class on body', () => {
      mockDocument.body.className = 'dark-theme app-root';
      expect(detectPageTheme()).toBe('dark');
    });

    it('detects light theme from light-theme class on body', () => {
      mockDocument.body.className = 'light-theme app-root';
      expect(detectPageTheme()).toBe('light');
    });

    it('detects theme from html dark class', () => {
      mockDocument.documentElement.className = 'dark';
      expect(detectPageTheme()).toBe('dark');
    });
  });

  describe('Split View Controller', () => {
    it('opens and closes split view controller instance', () => {
      const svc = new SplitViewController();
      expect(svc.isSplitViewActive()).toBe(false);
      svc.openSplitView('chrome-extension://abc/sidepanel.html');
      expect(svc.isSplitViewActive()).toBe(true);
      svc.closeSplitView();
      expect(svc.isSplitViewActive()).toBe(false);
    });

    it('toggles split view state accurately', () => {
      const svc = new SplitViewController();
      const active1 = svc.toggleSplitView(true, 'chrome-extension://abc/sidepanel.html');
      expect(active1).toBe(true);

      const active2 = svc.toggleSplitView(false);
      expect(active2).toBe(false);
    });
  });

  describe('Extension Context Invalidation', () => {
    it('checks context validity', () => {
      expect(isExtensionContextValid()).toBe(true);
    });
  });

  describe('Content Templates', () => {
    it('generates HTML iframe template for split view', () => {
      const frame = ContentTemplates.getSplitViewFrame('https://example.com/sidepanel.html');
      expect(frame).toContain('<iframe');
      expect(frame).toContain('https://example.com/sidepanel.html');
    });

    it('generates review modal comparison HTML', () => {
      const modal = ContentTemplates.getReviewModal('Original prompt text', 'Refined prompt text');
      expect(modal).toContain('Review Refined Prompt');
      expect(modal).toContain('Original prompt text');
      expect(modal).toContain('Refined prompt text');
    });
  });

  describe('ContentObserver', () => {
    it('initializes and cleans up lifecycle observers without error', () => {
      const observer = new ContentObserver();
      expect(() => observer.init()).not.toThrow();
      expect(() => observer.destroy()).not.toThrow();
    });

    it('handles HARVEST_EXTRACT message with full pipeline (scroll, expand, scrape, media, metadata)', async () => {
      const observer = new ContentObserver();
      observer.init();
      expect(registeredMessageListener).toBeDefined();

      const mockAdapter = {
        platform: 'gemini',
        autoScrollHistory: vi.fn().mockResolvedValue({ messagesLoaded: 5, scrollAttempts: 2, warning: null }),
        expandContent: vi.fn().mockResolvedValue(3),
        scrapeHarvestTurns: vi.fn().mockResolvedValue([
          { id: 'turn-0', turnIndex: 0, role: 'user', content: 'Hello', timestamp: 1000 },
          { id: 'turn-1', turnIndex: 1, role: 'assistant', content: 'Hi there!', timestamp: 2000, attachments: [] }
        ]),
        extractConversationId: vi.fn().mockReturnValue('conv-abc-123'),
        extractTitle: vi.fn().mockReturnValue('Test Chat Title')
      };

      vi.spyOn(adapterRegistry, 'resolveChatbotAdapter').mockReturnValue(mockAdapter as any);
      vi.spyOn(MediaExtractor, 'extractImages').mockResolvedValue({
        images: [{
          path: 'images/000.png',
          filename: 'images/000.png',
          blob: new Blob(['img']),
          mimeType: 'image/png',
          originalSrc: 'https://example.com/img.png',
          turnIndex: 1,
          imageIndex: 0
        }],
        errors: []
      });

      let responsePayload: any = null;
      const sendResponse = (res: any) => { responsePayload = res; };

      const handled = registeredMessageListener!({ type: 'HARVEST_EXTRACT', accountLabel: 'user1' }, {}, sendResponse);
      expect(handled).toBe(true);

      // Wait for async handler completion inside onMessage
      await new Promise(r => setTimeout(r, 20));

      expect(mockAdapter.autoScrollHistory).toHaveBeenCalled();
      expect(mockAdapter.expandContent).toHaveBeenCalled();
      expect(mockAdapter.scrapeHarvestTurns).toHaveBeenCalled();
      expect(MediaExtractor.extractImages).toHaveBeenCalled();

      expect(responsePayload).toBeDefined();
      expect(responsePayload.success).toBe(true);
      expect(responsePayload.data.metadata.conversationId).toBe('conv-abc-123');
      expect(responsePayload.data.metadata.title).toBe('Test Chat Title');
      expect(responsePayload.data.metadata.site).toBe('gemini');
      expect(responsePayload.data.metadata.accountLabel).toBe('user1');
      expect(responsePayload.data.metadata.messageCount).toBe(2);
      expect(responsePayload.data.messages.length).toBe(2);
      expect(responsePayload.images.length).toBe(1);

      observer.destroy();
    });

    it('handles HARVEST_EXTRACT using action property for TabWorker compatibility', async () => {
      const observer = new ContentObserver();
      observer.init();

      const mockAdapter = {
        platform: 'claude',
        scrapeHarvestTurns: vi.fn().mockResolvedValue([
          { id: 'c-0', turnIndex: 0, role: 'user', content: 'What is AI?', timestamp: 1000 }
        ]),
        extractConversationId: vi.fn().mockReturnValue('claude-conv-99'),
        extractTitle: vi.fn().mockReturnValue('Claude Conversation')
      };

      vi.spyOn(adapterRegistry, 'resolveChatbotAdapter').mockReturnValue(mockAdapter as any);
      vi.spyOn(MediaExtractor, 'extractImages').mockResolvedValue({ images: [], errors: [] });

      let responsePayload: any = null;
      const sendResponse = (res: any) => { responsePayload = res; };

      const handled = registeredMessageListener!({ action: 'HARVEST_EXTRACT' }, {}, sendResponse);
      expect(handled).toBe(true);

      await new Promise(r => setTimeout(r, 20));

      expect(mockAdapter.scrapeHarvestTurns).toHaveBeenCalled();
      expect(responsePayload).toBeDefined();
      expect(responsePayload.success).toBe(true);
      expect(responsePayload.data.metadata.site).toBe('claude');
      expect(responsePayload.data.metadata.conversationId).toBe('claude-conv-99');

      observer.destroy();
    });

    it('returns graceful error response if adapter does not implement scrapeHarvestTurns', async () => {
      const observer = new ContentObserver();
      observer.init();

      const incompleteAdapter = {
        platform: 'unsupported'
      };

      vi.spyOn(adapterRegistry, 'resolveChatbotAdapter').mockReturnValue(incompleteAdapter as any);

      let responsePayload: any = null;
      const sendResponse = (res: any) => { responsePayload = res; };

      const handled = registeredMessageListener!({ type: 'HARVEST_EXTRACT' }, {}, sendResponse);
      expect(handled).toBe(true);

      await new Promise(r => setTimeout(r, 20));

      expect(responsePayload).toBeDefined();
      expect(responsePayload.success).toBe(false);
      expect(responsePayload.error).toContain('does not implement scrapeHarvestTurns');

      observer.destroy();
    });
  });
});
