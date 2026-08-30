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
    getAttribute: vi.fn().mockReturnValue(null)
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

(globalThis as any).document = mockDocument;
(globalThis as any).chrome = { runtime: { id: "mock-ext-id" } };
(globalThis as any).window = {
  getComputedStyle: () => ({ backgroundColor: 'rgb(30, 30, 46)' }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  location: { reload: vi.fn() }
};

import {
  detectPageTheme,
  SplitViewController,
  splitViewController,
  isExtensionContextValid,
  showExtensionReloadNotification,
  ContentTemplates,
  ContentObserver
} from '../../src/content';

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
  });
});
