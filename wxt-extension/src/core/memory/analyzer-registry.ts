/**
 * @fileoverview Analyzer Registry - LLM-Based Analyzer Management System
 * Ported from memory/analyzer-registry.js (292 lines)
 * @module memory/analyzer-registry
 */

import { logger } from '../logging/logger';

export interface Analyzer {
  id: string;
  name?: string;
  description?: string;
  analyze: (scrapedData: any, memory?: any, llmClient?: any) => Promise<any>;
}

export const AnalyzerRegistry = {
  _analyzers: new Map<string, Analyzer>(),

  register(analyzer: Analyzer): boolean {
    if (!analyzer.id || typeof analyzer.analyze !== 'function') {
      logger.error('Invalid analyzer - missing id or analyze()', {
        hasId: Boolean(analyzer.id),
        hasAnalyze: typeof analyzer.analyze === 'function'
      });
      return false;
    }

    if (this._analyzers.has(analyzer.id)) {
      logger.warn(`Replacing existing analyzer: ${analyzer.id}`);
    }

    this._analyzers.set(analyzer.id, analyzer);
    logger.info(`Registered analyzer: ${analyzer.id}`);
    return true;
  },

  unregister(analyzerId: string): boolean {
    const deleted = this._analyzers.delete(analyzerId);
    if (deleted) {
      logger.info(`Unregistered analyzer: ${analyzerId}`);
    }
    return deleted;
  },

  getAnalyzer(analyzerId: string): Analyzer | undefined {
    return this._analyzers.get(analyzerId);
  },

  getAllAnalyzers(): Analyzer[] {
    return Array.from(this._analyzers.values());
  },

  getAnalyzerIds(): string[] {
    return Array.from(this._analyzers.keys());
  },

  clear(): void {
    const count = this._analyzers.size;
    this._analyzers.clear();
    logger.info(`Cleared ${count} analyzers`);
  }
};
