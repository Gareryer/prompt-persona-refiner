/**
 * @fileoverview Complete Rating Manager - User Rating Storage and Retrieval System
 * Ported from rating/rating-manager.js (664 lines)
 */

import { logger } from '../logging/logger';

export interface RatingData {
  rating: number;
  ratedAt: number;
  feedback?: string;
}

export interface RatingStats {
  averageRating: number;
  totalRated: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export const RATINGS_KEY_PREFIX = 'pa_ratings_';

export class RatingManager {
  private sessionId: string;
  private storageKey: string;
  private cache: Record<string, RatingData> | null = null;

  constructor(sessionId: string) {
    if (!sessionId) {
      throw new Error('[RatingManager] sessionId is required');
    }
    this.sessionId = sessionId;
    this.storageKey = `${RATINGS_KEY_PREFIX}${sessionId}`;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  load(): Record<string, RatingData> {
    if (this.cache !== null) return this.cache;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          this.cache = JSON.parse(raw);
          return this.cache!;
        }
      }
    } catch (err: any) {
      logger.error('Failed to load ratings from localStorage', err);
    }
    this.cache = {};
    return this.cache;
  }

  save(): boolean {
    if (this.cache === null) return false;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.cache));
        logger.debug('Ratings saved for session', { sessionId: this.sessionId, count: Object.keys(this.cache).length });
        return true;
      }
    } catch (err: any) {
      logger.error('Failed to save ratings to localStorage', err);
    }
    return false;
  }

  getRating(turnIndex: number): RatingData | null {
    const data = this.load();
    const key = `turn_${turnIndex}`;
    return data[key] || null;
  }

  setRating(turnIndex: number, rating: number, feedback?: string): boolean {
    if (rating < 1 || rating > 5) {
      logger.warn('Invalid rating score (must be 1-5)', { rating });
      return false;
    }
    const data = this.load();
    const key = `turn_${turnIndex}`;
    data[key] = {
      rating,
      ratedAt: Date.now(),
      feedback
    };
    return this.save();
  }

  deleteRating(turnIndex: number): boolean {
    const data = this.load();
    const key = `turn_${turnIndex}`;
    if (data[key]) {
      delete data[key];
      return this.save();
    }
    return false;
  }

  getAllRatings(): Record<string, RatingData> {
    return { ...this.load() };
  }

  getStats(): RatingStats {
    const data = this.load();
    const values = Object.values(data);
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (values.length === 0) {
      return { averageRating: 0, totalRated: 0, distribution };
    }

    let sum = 0;
    for (const item of values) {
      const score = Math.min(5, Math.max(1, Math.round(item.rating))) as 1 | 2 | 3 | 4 | 5;
      distribution[score]++;
      sum += item.rating;
    }

    return {
      averageRating: Math.round((sum / values.length) * 10) / 10,
      totalRated: values.length,
      distribution
    };
  }

  clear(): void {
    this.cache = {};
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.storageKey);
    }
    logger.info('Ratings cleared for session', { sessionId: this.sessionId });
  }

  static getAllSessionIds(): string[] {
    const sessionIds: string[] = [];
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RATINGS_KEY_PREFIX)) {
          sessionIds.push(key.replace(RATINGS_KEY_PREFIX, ''));
        }
      }
    }
    return sessionIds;
  }
}
