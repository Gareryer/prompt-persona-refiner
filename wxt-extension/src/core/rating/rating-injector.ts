
export const RATING_SELECTORS = {
  turnContainer: '[class*="model-response"], [class*="response-container"], .model-turn',
  turnContent: '.model-turn, message-content, [class*="message-content"]',
  ratingBar: '.allie-rating-bar'
} as const;

export const INIT_DELAY_MS = 500;
/**
 * @fileoverview Rating Component DOM Injector
 * Ported from rating/rating-injector.js (460 lines)
 * @module rating/rating-injector
 */

import { RatingManager } from './rating-manager';
import { createRatingUI } from './rating-ui';
import { logger } from '../logging/logger';

export class RatingInjector {
  public ratingManager: RatingManager;
  public observer: MutationObserver | null = null;
  public injectedTurns: Set<number> = new Set();

  constructor(sessionId: string) {
    this.ratingManager = new RatingManager(sessionId);
  }

  init(): void {
    if (typeof document === 'undefined') return;
    this.injectRatings();
    this.observeNewTurns();
    logger.info('RatingInjector initialized', { sessionId: this.ratingManager.sessionId });
  }

  injectRatings(): void {
    if (typeof document === 'undefined') return;
    const responseNodes = document.querySelectorAll<HTMLElement>('.model-response-text, [data-role="model"]');

    responseNodes.forEach((node, idx) => {
      if (this.injectedTurns.has(idx)) return;
      if (node.querySelector('.allie-rating-container')) return;

      const currentRatingData = this.ratingManager.getRating(idx);
      const currentRating = currentRatingData ? currentRatingData.rating : null;

      const ratingUI = createRatingUI(idx, currentRating, async (turn, score) => {
        this.ratingManager.setRating(turn, score);
      });

      node.appendChild(ratingUI);
      this.injectedTurns.add(idx);
    });
  }

  observeNewTurns(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;

    this.observer = new MutationObserver(() => {
      this.injectRatings();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.allie-rating-container').forEach(el => el.remove());
    }
    this.injectedTurns.clear();
  }
}
