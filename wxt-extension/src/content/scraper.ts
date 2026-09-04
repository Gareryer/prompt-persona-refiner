
export function pad(num: number, size: number = 2): string {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

export function formatDate(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
/**
 * @fileoverview Complete Gemini Conversation Scraper with Rating Metadata Integration
 * Ported from content/scraper.js (646 lines)
 * @module content/scraper
 */

import { logger } from '../core/logging/logger';
import { RatingManager } from '../core/rating/rating-manager';

export const SCRAPER_CONFIG = {
  MAX_CONTAINERS: 50,
  MAX_CONTENT_BYTES: 100000,
  DEFAULT_FORMAT: 'raw',
  SELECTORS: {
    user: ['.user-query', '[data-role="user"]', '.query-text'],
    model: ['.model-response-text', '[data-role="model"]', '.response-text']
  }
};

export const GEMINI_SELECTORS = {
  conversationTurn: 'user-query, model-response',
  userQuery: '.user-query, [data-role="user"]',
  modelResponse: '.model-response-text, [data-role="model"]',
  title: 'header h1, .conversation-title'
};

export function scrapeLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  if (level === 'error') logger.error(msg, data);
  else if (level === 'warn') logger.warn(msg, data);
  else if (level === 'debug') logger.debug(msg, data);
  else logger.info(msg, data);
}

export interface ScrapedTurn {
  role: 'user' | 'model';
  content: string;
  turnIndex: number;
  rating?: number | null;
  ratedAt?: number;
  timestamp: number;
}

export interface ScrapeResult {
  sessionId: string;
  title: string;
  turns: ScrapedTurn[];
  totalTurns: number;
  scrapedAt: number;
  wasTruncated: boolean;
}

export class GeminiConversationScraper {
  private ratingManager: RatingManager | null = null;
  private sessionId: string;

  constructor(sessionId?: string) {
    this.sessionId = sessionId || this._generateSessionId();
    this.loadRatings();
  }

  loadRatings(): void {
    try {
      this.ratingManager = new RatingManager(this.sessionId);
      this.ratingManager.load();
    } catch {
      this.ratingManager = null;
    }
  }

  _getRating(turnIndex: number): { rating: number; ratedAt: number } | null {
    if (!this.ratingManager) return null;
    const r = this.ratingManager.getRating(turnIndex);
    return r ? { rating: r.rating, ratedAt: r.ratedAt } : null;
  }

  hasHistory(): boolean {
    if (typeof document === 'undefined') return false;
    const containers = this._findMessageContainers();
    return containers.length > 0;
  }

  _findMessageContainers(): HTMLElement[] {
    if (typeof document === 'undefined') return [];
    const nodes = document.querySelectorAll<HTMLElement>(
      '.user-query, .model-response-text, [data-role="user"], [data-role="model"]'
    );
    return Array.from(nodes);
  }

  _determineRole(node: HTMLElement): 'user' | 'model' {
    if (node.classList.contains('user-query') || node.getAttribute('data-role') === 'user') {
      return 'user';
    }
    return 'model';
  }

  _matchesIndicator(node: HTMLElement, indicators: string[]): boolean {
    return indicators.some(ind => node.matches(ind));
  }

  _extractContent(node: HTMLElement): string {
    return node.textContent?.trim() || '';
  }

  _extractTurns(maxContainers: number = SCRAPER_CONFIG.MAX_CONTAINERS): { turns: ScrapedTurn[]; wasTruncated: boolean } {
    const containers = this._findMessageContainers();
    const wasTruncated = containers.length > maxContainers;
    const targetContainers = containers.slice(0, maxContainers);

    const turns: ScrapedTurn[] = [];
    targetContainers.forEach((c, idx) => {
      const role = this._determineRole(c);
      const content = this._extractContent(c);
      const ratingInfo = role === 'model' ? this._getRating(idx) : null;

      turns.push({
        role,
        content,
        turnIndex: idx,
        rating: ratingInfo?.rating || null,
        ratedAt: ratingInfo?.ratedAt,
        timestamp: Date.now()
      });
    });

    return { turns, wasTruncated };
  }

  _formatOutput(turns: ScrapedTurn[], format: string = 'raw'): string {
    if (format === 'json') return JSON.stringify(turns, null, 2);
    return turns.map(t => `[${t.role.toUpperCase()}]: ${t.content}`).join('\n\n');
  }

  _generateSessionId(): string {
    if (typeof window !== 'undefined') {
      const extracted = RatingManager.extractSessionId(window.location.href);
      if (extracted) return extracted;
    }
    return 'session_' + Date.now();
  }

  scrape(options: { maxContainers?: number; format?: string } = {}): ScrapeResult {
    const max = options.maxContainers || SCRAPER_CONFIG.MAX_CONTAINERS;
    const { turns, wasTruncated } = this._extractTurns(max);
    const titleEl = typeof document !== 'undefined' ? document.querySelector(GEMINI_SELECTORS.title) : null;

    return {
      sessionId: this.sessionId,
      title: titleEl?.textContent?.trim() || 'Gemini Conversation',
      turns,
      totalTurns: turns.length,
      scrapedAt: Date.now(),
      wasTruncated
    };
  }
}

export function customScraperMethod(options?: any): ScrapeResult {
  const scraper = new GeminiConversationScraper();
  return scraper.scrape(options);
}

export function getChatHistory(maxContainers?: number): ScrapedTurn[] {
  const scraper = new GeminiConversationScraper();
  return scraper.scrape({ maxContainers }).turns;
}

export function getPreviousPromptsWithRatings(): Array<{ prompt: string; rating?: number | null }> {
  const scraper = new GeminiConversationScraper();
  const turns = scraper.scrape().turns;
  const prompts: Array<{ prompt: string; rating?: number | null }> = [];

  for (let i = 0; i < turns.length; i++) {
    const currentTurn = turns[i];
    if (currentTurn && currentTurn.role === 'user') {
      const nextModelTurn = turns[i + 1]?.role === 'model' ? turns[i + 1] : undefined;
      prompts.push({
        prompt: currentTurn.content,
        rating: nextModelTurn?.rating
      });
    }
  }
  return prompts;
}