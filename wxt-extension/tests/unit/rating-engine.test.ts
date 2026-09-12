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
  updateRatingUI,
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
      expect(ui.className).toContain('allie-rating-container');
      expect(ui.dataset.turnIndex).toBe('2');
      expect(ui.dataset.currentRating).toBe('4');
      expect(ui.dataset.rated).toBe('true');
    });

    it('highlights and sets star ratings properly', () => {
      const container = (globalThis as any).document.createElement('div');
      for (let i = 1; i <= 5; i++) {
        const star = (globalThis as any).document.createElement('button');
        star.className = 'allie-star';
        container.appendChild(star);
      }
      highlightStars(container, 3);
      setStarsRating(container, 4);
    });

    it('updateRatingUI fills stars, updates label and dataset', () => {
      const container = (globalThis as any).document.createElement('div');

      const starsContainer = (globalThis as any).document.createElement('div');
      starsContainer.className = 'allie-stars-container';
      for (let i = 1; i <= 5; i++) {
        const star = (globalThis as any).document.createElement('button');
        star.className = 'allie-star';
        starsContainer.appendChild(star);
      }
      container.appendChild(starsContainer);

      const label = (globalThis as any).document.createElement('span');
      label.className = 'allie-rating-label';
      label.textContent = 'Rate this response:';
      container.appendChild(label);

      container.querySelector = vi.fn((selector: string) => {
        if (selector === '.allie-stars-container') return starsContainer;
        if (selector === '.allie-rating-label') return label;
        return null;
      });

      updateRatingUI(container, 3);

      const stars = starsContainer.children as any[];
      const filled = stars.filter((s: any) => s.classList.contains('allie-star-filled'));
      expect(filled.length).toBe(3);
      expect(stars.slice(3).every((s: any) => !s.classList.contains('allie-star-filled'))).toBe(true);
      expect(label.textContent).toBe('Your rating:');
      expect(container.dataset.currentRating).toBe('3');
      expect(container.dataset.rated).toBe('true');
    });

    it('updateRatingUI with zero rating clears stars and resets label', () => {
      const container = (globalThis as any).document.createElement('div');

      const starsContainer = (globalThis as any).document.createElement('div');
      starsContainer.className = 'allie-stars-container';
      for (let i = 1; i <= 5; i++) {
        const star = (globalThis as any).document.createElement('button');
        star.className = 'allie-star';
        starsContainer.appendChild(star);
      }
      container.appendChild(starsContainer);

      const label = (globalThis as any).document.createElement('span');
      label.className = 'allie-rating-label';
      container.appendChild(label);
      container.querySelector = vi.fn((selector: string) => {
        if (selector === '.allie-stars-container') return starsContainer;
        if (selector === '.allie-rating-label') return label;
        return null;
      });

      updateRatingUI(container, 2);
      updateRatingUI(container, 0);

      const filled = (starsContainer.children as any[]).filter((s: any) => s.classList.contains('allie-star-filled'));
      expect(filled.length).toBe(0);
      expect(label.textContent).toBe('Rate this response:');
      expect(container.dataset.currentRating).toBe('0');
      expect(container.dataset.rated).toBe('false');
    });

    it('updateRatingUI is idempotent and re-renders on rating change', () => {
      const container = (globalThis as any).document.createElement('div');

      const starsContainer = (globalThis as any).document.createElement('div');
      starsContainer.className = 'allie-stars-container';
      for (let i = 1; i <= 5; i++) {
        const star = (globalThis as any).document.createElement('button');
        star.className = 'allie-star';
        starsContainer.appendChild(star);
      }
      container.appendChild(starsContainer);

      const label = (globalThis as any).document.createElement('span');
      label.className = 'allie-rating-label';
      container.appendChild(label);
      container.querySelector = vi.fn((selector: string) => {
        if (selector === '.allie-stars-container') return starsContainer;
        if (selector === '.allie-rating-label') return label;
        return null;
      });

      updateRatingUI(container, 2);
      updateRatingUI(container, 4);

      const stars = starsContainer.children as any[];
      expect(stars.filter((s: any) => s.classList.contains('allie-star-filled')).length).toBe(4);
      expect(stars[0].textContent).toBe('★');
      expect(stars[4].textContent).toBe('☆');
    });
  });

  describe('RatingInjector', () => {
    it('initializes and cleans up gracefully', () => {
      const injector = new RatingInjector('session_injector');
      expect(injector.ratingManager.getSessionId()).toBe('session_injector');
      expect(() => injector.init()).not.toThrow();
      expect(() => injector.destroy()).not.toThrow();
    });

    it('queries DOM using adapter assistantMessage selectors and injects rating UI', () => {
      const nodeA = (globalThis as any).document.createElement('div');
      const nodeB = (globalThis as any).document.createElement('div');
      const qsaSpy = vi.spyOn((globalThis as any).document, 'querySelectorAll').mockReturnValue([nodeA, nodeB]);

      const injector = new RatingInjector('session_adaptive_test');
      injector.injectRatings();

      expect(qsaSpy).toHaveBeenCalled();
      const queriedSelector = qsaSpy.mock.calls[0]?.[0] as string;
      expect(queriedSelector).toBeDefined();
      expect(nodeA.appendChild).toHaveBeenCalled();
      expect(nodeB.appendChild).toHaveBeenCalled();
      expect(injector.injectedTurns.size).toBe(2);

      // Subsequent call does not re-inject already tracked nodes
      nodeA.appendChild.mockClear();
      injector.injectRatings();
      expect(nodeA.appendChild).not.toHaveBeenCalled();

      qsaSpy.mockRestore();
    });
  });
});