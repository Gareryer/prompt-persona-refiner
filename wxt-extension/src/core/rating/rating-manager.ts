
export function ratingLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: Record<string, any>): void {
  logger[level](`[RatingManager] ${msg}`, data);
}
/**
 * @fileoverview Complete Rating Manager - User Rating Storage and Retrieval System
 * Ported from rating/rating-manager.js (664 lines)
 * @module rating/rating-manager
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
  public sessionId: string;
  public storageKey: string;
  public _cache: Record<string, RatingData> | null = null;

  constructor(sessionId: string) {
    if (!sessionId) {
      throw new Error('[RatingManager] sessionId is required');
    }
    this.sessionId = sessionId;
    this.storageKey = RATINGS_KEY_PREFIX + sessionId;
  }

  static hasDirectStorageAccess(): boolean {
    return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
  }

  static extractSessionId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'app') {
        return pathParts[1] || null;
      }
      return pathParts[pathParts.length - 1] || null;
    } catch {
      return null;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  load(): Record<string, RatingData> {
    if (this._cache !== null) return this._cache;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          this._cache = JSON.parse(raw);
          return this._cache!;
        }
      }
    } catch (err: any) {
      logger.error('Failed to load ratings from localStorage', { error: err });
    }
    this._cache = {};
    return this._cache;
  }

  save(): boolean {
    if (this._cache === null) return false;
    try {
      if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
        localStorage.setItem(this.storageKey, JSON.stringify(this._cache));
        this.backupToStorage();
        return true;
      }
    } catch (err: any) {
      logger.error('Failed to save ratings to localStorage', { error: err });
    }
    return false;
  }

  async backupToStorage(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local && this._cache) {
      await chrome.storage.local.set({ [this.storageKey]: this._cache });
    }
  }

  getRating(turnIndex: number): RatingData | null {
    const data = this.load();
    const key = 'turn_' + turnIndex;
    return data[key] || null;
  }

  hasRating(turnIndex: number): boolean {
    return this.getRating(turnIndex) !== null;
  }

  getRatedCount(): number {
    return Object.keys(this.load()).length;
  }

  getAverageRating(): number {
    const values = Object.values(this.load());
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, curr) => acc + curr.rating, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  setRating(turnIndex: number, rating: number, feedback?: string): boolean {
    if (rating < 1 || rating > 5) {
      logger.warn('Invalid rating score (must be 1-5)', { rating });
      return false;
    }
    const data = this.load();
    const key = 'turn_' + turnIndex;
    data[key] = {
      rating,
      ratedAt: Date.now(),
      feedback
    };
    return this.save();
  }

  deleteRating(turnIndex: number): boolean {
    const data = this.load();
    const key = 'turn_' + turnIndex;
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
    this._cache = {};
    if (typeof localStorage !== 'undefined' && typeof localStorage.removeItem === 'function') {
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

  async restoreFromStorage(): Promise<boolean> {
    if (!RatingManager.hasDirectStorageAccess()) {
      ratingLog('debug', 'No direct storage access - cannot restore');
      return false;
    }
    try {
      const backupKey = `pa_ratings_backup_${this.sessionId}`;
      const result = await chrome.storage.local.get(backupKey);
      const backup = result?.[backupKey];
      if (backup?.ratings && Object.keys(backup.ratings).length > 0) {
        this._cache = backup.ratings;
        this.save();
        ratingLog('info', `Restored ${Object.keys(this._cache || {}).length} ratings from backup`);
        return true;
      }
      return false;
    } catch (e: any) {
      ratingLog('error', 'Restore from chrome.storage failed', { error: e.message });
      return false;
    }
  }

  static async backupAllRatings(): Promise<void> {
    if (!RatingManager.hasDirectStorageAccess() || typeof localStorage === 'undefined') {
      return;
    }
    try {
      const allBackups: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(RATINGS_KEY_PREFIX)) {
          const sid = key.replace(RATINGS_KEY_PREFIX, '');
          const data = localStorage.getItem(key);
          if (data) {
            allBackups[`pa_ratings_backup_${sid}`] = {
              ratings: JSON.parse(data),
              backedUpAt: Date.now(),
              sessionId: sid
            };
          }
        }
      }
      if (Object.keys(allBackups).length > 0) {
        await chrome.storage.local.set(allBackups);
      }
    } catch (e: any) {
      logger.error('Bulk backup failed', { error: e.message });
    }
  }

  removeRating(turnIndex: number): boolean {
    return this.deleteRating(turnIndex);
  }

  getRatingsArray(): Array<{ turnIndex: number; rating: number; ratedAt: number; feedback?: string }> {
    const data = this.load();
    const result: Array<{ turnIndex: number; rating: number; ratedAt: number; feedback?: string }> = [];
    for (const [key, val] of Object.entries(data)) {
      if (key.startsWith('turn_')) {
        const idx = parseInt(key.replace('turn_', ''), 10);
        if (!isNaN(idx)) {
          result.push({
            turnIndex: idx,
            rating: val.rating,
            ratedAt: val.ratedAt,
            feedback: val.feedback
          });
        }
      }
    }
    return result.sort((a, b) => a.turnIndex - b.turnIndex);
  }


  static clearAll(): boolean {
    try {
      if (typeof localStorage !== 'undefined') {
        const toDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(RATINGS_KEY_PREFIX)) toDelete.push(k);
        }
        for (const k of toDelete) localStorage.removeItem(k);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

}

export function getCurrentRatingManager(url?: string): RatingManager {
  const currentUrl = url || (typeof window !== 'undefined' ? window.location?.href : '');
  const sid = currentUrl ? RatingManager.extractSessionId(currentUrl) : null;
  return new RatingManager(sid || 'default_session');
}

export async function checkRatingEligibility(): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const res = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ type: 'CHECK_RATING_ELIGIBILITY' }, resolve);
      });
      return Boolean(res?.eligible);
    } catch {
      return false;
    }
  }
  return false;
}
