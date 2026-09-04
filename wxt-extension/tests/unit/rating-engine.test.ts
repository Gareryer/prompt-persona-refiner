import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStorage: Record<string, string> = {};

(globalThis as any).localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  get length() { return Object.keys(mockStorage).length; }
};

(globalThis as any).document = {
  body: {
    appendChild: vi.fn(),
    querySelectorAll: vi.fn().mockReturnValue([])
  },
  createElement: (tag: string) => {
    const el: any = {
      tagName: tag.toUpperCase(),
      className: '',
      dataset: {},
      textContent: '',
      children: [] as any[],
      type: 'button',
      setAttribute: vi.fn(),
      classList: {
        add: vi.fn((cls: string) => { el.className += ' ' + cls; }),
        remove: vi.fn((cls: string) => { el.className = el.className.replace(cls, ''); }),
        contains: (cls: string) => el.className.includes(cls)
      },
      appendChild: vi.fn((c: any) => { el.children.push(c); }),
      querySelectorAll: vi.fn(() => el.children),
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn((evt: string, cb: Function) => {
        el['on_' + evt] = cb;
      }),
      remove: vi.fn()
    };
    return el;
  },
  querySelectorAll: vi.fn().mockReturnValue([])
};

(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  }
};

import {
  RatingManager,
  RATINGS_KEY_PREFIX,
  createRatingUI,
  highlightStars,
  setStarsRating,
  RatingInjector
} from '../../src/core/rating';

describe('Rating Subsystem Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as any).localStorage.clear();
  });

  describe('RatingManager', () => {
    it('initializes with session ID and correct storage key', () => {
      const rm = new RatingManager('session_123');
      expect(rm.getSessionId()).toBe('session_123');
      expect(rm.storageKey).toBe(RATINGS_KEY_PREFIX + 'session_123');
    });

    it('extracts session ID from various Gemini URLs', () => {
      expect(RatingManager.extractSessionId('https://gemini.google.com/app/chat-abc-123')).toBe('chat-abc-123');
      expect(RatingManager.extractSessionId('https://gemini.google.com/app/xyz789')).toBe('xyz789');
      expect(RatingManager.extractSessionId('invalid-url')).toBe(null);
    });

    it('sets, gets, checks, and deletes ratings per conversation turn', () => {
      const rm = new RatingManager('session_test');
      expect(rm.hasRating(0)).toBe(false);

      rm.setRating(0, 5, 'Excellent response');
      expect(rm.hasRating(0)).toBe(true);
      expect(rm.getRating(0)?.rating).toBe(5);
      expect(rm.getRating(0)?.feedback).toBe('Excellent response');

      rm.setRating(1, 3);
      expect(rm.getRatedCount()).toBe(2);
      expect(rm.getAverageRating()).toBe(4);

      rm.deleteRating(0);
      expect(rm.hasRating(0)).toBe(false);
      expect(rm.getRatedCount()).toBe(1);
    });

    it('calculates distribution and average stats accurately', () => {
      const rm = new RatingManager('session_stats');
      rm.setRating(0, 5);
      rm.setRating(1, 5);
      rm.setRating(2, 4);
      rm.setRating(3, 2);

      const stats = rm.getStats();
      expect(stats.totalRated).toBe(4);
      expect(stats.averageRating).toBe(4);
      expect(stats.distribution[5]).toBe(2);
      expect(stats.distribution[4]).toBe(1);
      expect(stats.distribution[2]).toBe(1);
      expect(stats.distribution[1]).toBe(0);
    });

    it('handles direct storage check and backup', async () => {
      expect(RatingManager.hasDirectStorageAccess()).toBe(true);
      const rm = new RatingManager('session_backup');
      rm.setRating(0, 5);
      await rm.backupToStorage();
      expect((globalThis as any).chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Rating UI Factory', () => {
    it('creates rating UI container with 5 stars and label', () => {
      const ui = createRatingUI(2, 4);
      expect(ui).toBeDefined();
      expect(ui.className).toContain('pa-rating-container');
      expect(ui.dataset.turnIndex).toBe('2');
      expect(ui.dataset.currentRating).toBe('4');
      expect(ui.dataset.rated).toBe('true');
    });

    it('highlights and sets star ratings properly', () => {
      const container = (globalThis as any).document.createElement('div');
      for (let i = 1; i <= 5; i++) {
        const star = (globalThis as any).document.createElement('button');
        star.className = 'pa-star';
        container.appendChild(star);
      }
      highlightStars(container, 3);
      setStarsRating(container, 4);
    });
  });

  describe('RatingInjector', () => {
    it('initializes and cleans up gracefully', () => {
      const injector = new RatingInjector('session_injector');
      expect(injector.ratingManager.getSessionId()).toBe('session_injector');
      expect(() => injector.init()).not.toThrow();
      expect(() => injector.destroy()).not.toThrow();
    });
  });
});