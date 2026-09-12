/**
 * Harvest Orchestrator Facade.
 * Clean-room TypeScript facade coordinating single-tab extractions
 * and multi-conversation batch crawler runs.
 */

import type {
  HarvestPlatform,
  HarvestConversationRecord,
  DiscoveredConversation,
  ConversationRecord,
  BatchSummary,
  BatchProgress,
  ProcessResult,
  DownloadStatus
} from './types';
import { HarvestDB, defaultHarvestDb } from './storage/harvest-db';
import { QueueManager } from './batch/queue-manager';
import { ZipBuilder } from './packaging/zip-builder';
import {
  runBatch,
  processOne,
  sendExtractWithRecovery,
  type TabWorkerDeps,
  DEFAULT_DEPS
} from './batch/tab-worker';

export interface ExtractTabOptions {
  tabId?: number;
  download?: boolean;
  saveAs?: boolean;
  customDeps?: Partial<TabWorkerDeps>;
}

export interface ExtractTabResult {
  success: boolean;
  record?: HarvestConversationRecord;
  zipBlob?: Blob;
  downloadId?: number | string;
  zipFilename?: string;
  error?: string;
}

export interface BatchHarvestOptions {
  tabId?: number;
  site?: HarvestPlatform;
  accountLabel?: string;
  conversations?: (DiscoveredConversation | ConversationRecord | { conversationId: string; title: string; url?: string })[];
  paceMs?: number;
  maxItems?: number;
  onProgress?: (progress: BatchProgress) => void;
  onItemComplete?: (item: any, result: ProcessResult) => void;
  onError?: (item: any, error: Error) => void;
  customDeps?: Partial<TabWorkerDeps>;
}

export interface BatchHandle {
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isPaused: () => boolean;
  isCancelled: () => boolean;
  promise: Promise<BatchSummary>;
}

export class HarvestOrchestrator {
  private readonly db: HarvestDB;
  private readonly queue: QueueManager;

  constructor(db: HarvestDB = defaultHarvestDb, queue?: QueueManager) {
    this.db = db;
    this.queue = queue ?? new QueueManager(this.db);
  }

  getDb(): HarvestDB {
    return this.db;
  }

  getQueue(): QueueManager {
    return this.queue;
  }

  /**
   * Extracts conversation from an active browser tab or specified tabId,
   * packages into a ZIP archive, triggers silent download, and persists to IndexedDB.
   */
  async extractActiveTab(options?: ExtractTabOptions): Promise<ExtractTabResult> {
    let targetTabId = options?.tabId;
    let targetTabUrl = '';

    // 1. Resolve active tab if not specified
    if (targetTabId === undefined) {
      if (typeof chrome !== 'undefined' && chrome?.tabs?.query) {
        let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tabs[0]?.id) {
          tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        }
        if (!tabs[0]?.id) {
          tabs = await chrome.tabs.query({ active: true });
        }
        if (tabs[0]?.id !== undefined) {
          targetTabId = tabs[0].id;
          targetTabUrl = tabs[0].url || '';
        }
      }
    } else if (typeof chrome !== 'undefined' && chrome?.tabs?.get && targetTabId > 0) {
      try {
        const tab = await chrome.tabs.get(targetTabId);
        targetTabUrl = tab?.url || '';
      } catch {
        // Tab lookup error ignored in test or headless environments
      }
    }

    if (targetTabId === undefined) {
      targetTabId = 0;
    }

    let detectedSite: HarvestPlatform | undefined;
    if (targetTabUrl) {
      if (targetTabUrl.includes('gemini.google.com')) detectedSite = 'gemini';
      else if (targetTabUrl.includes('chatgpt.com')) detectedSite = 'chatgpt';
      else if (targetTabUrl.includes('claude.ai')) detectedSite = 'claude';
      else if (targetTabUrl.includes('deepseek.com')) detectedSite = 'deepseek';
      else if (targetTabUrl.includes('x.com') || targetTabUrl.includes('twitter.com')) detectedSite = 'grok';
      else if (targetTabUrl.includes('meta.ai')) detectedSite = 'meta';
    }

    try {
      // 2. Extract conversation record
      let record: HarvestConversationRecord;
      if (options?.customDeps?.navigateAndExtract) {
        record = await options.customDeps.navigateAndExtract(targetTabId, '', detectedSite || 'gemini');
      } else {
        record = await sendExtractWithRecovery(targetTabId, { site: detectedSite });
      }

      const meta = record.metadata;
      const keyObj = {
        site: meta.site,
        account_label: meta.accountLabel,
        conversation_id: meta.conversationId
      };

      // 3. Upsert into database with full turns and structured metadata
      await this.db.upsertConversation({
        site: meta.site,
        account_label: meta.accountLabel,
        conversation_id: meta.conversationId,
        title: meta.title,
        url: meta.url,
        discovered_at: Date.now(),
        content_extracted_at: Date.now(),
        download_status: options?.download !== false ? 'in_progress' : 'done',
        messages: record.messages,
        metadata: record.metadata
      });

      let zipFilename: string | undefined;
      let zipBlob: Blob | undefined;
      let downloadId: number | string | undefined;

      // 4. Package & Download ZIP only if requested
      if (options?.download !== false) {
        zipFilename = ZipBuilder.generateZipFilename(meta);
        const buildZipFn = options?.customDeps?.buildZip || (r => ZipBuilder.buildZip(r));
        zipBlob = await buildZipFn(record);

        const downloadZipFn =
          options?.customDeps?.downloadZip ||
          ((blob, filename) => ZipBuilder.downloadZip(blob, filename, { saveAs: options?.saveAs }));
        downloadId = await downloadZipFn(zipBlob, zipFilename);

        await this.db.markDownloaded(keyObj, { zip_name: zipFilename });
      } else {
        // Sync-only: mark downloaded/done in DB without building throwaway ZIP
        await this.db.markDownloaded(keyObj, {});
      }

      return {
        success: true,
        record,
        zipBlob,
        downloadId,
        zipFilename
      };
    } catch (err: any) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Starts a batch harvest run across multiple conversations.
   * Returns a BatchHandle with pause, resume, cancel controls and execution Promise.
   */
  startBatchHarvest(options: BatchHarvestOptions = {}): BatchHandle {
    let paused = false;
    let cancelled = false;

    const handle: BatchHandle = {
      pause: () => {
        paused = true;
      },
      resume: () => {
        paused = false;
      },
      cancel: () => {
        cancelled = true;
      },
      isPaused: () => paused,
      isCancelled: () => cancelled,
      promise: (async () => {
        // 1. Seed queue if conversations provided
        if (options.conversations && options.conversations.length > 0) {
          const site = options.site || 'gemini';
          const account = options.accountLabel || 'default';
          await this.queue.seedQueue(options.conversations, site, account);
        }

        // 2. Run batch loop
        const deps: Partial<TabWorkerDeps> = {
          ...options.customDeps,
          db: this.db
        };

        return runBatch(
          {
            tabId: options.tabId,
            site: options.site,
            accountLabel: options.accountLabel,
            paceMs: options.paceMs,
            maxItems: options.maxItems,
            isPaused: () => paused,
            isCancelled: () => cancelled,
            onProgress: options.onProgress,
            onItemComplete: options.onItemComplete,
            onError: options.onError
          },
          deps
        );
      })()
    };

    return handle;
  }

  /**
   * Queries aggregate status counts from the persistence layer.
   */
  async getStats(filter?: {
    site?: string;
    account_label?: string;
  }): Promise<{ total: number; pending: number; done: number; error: number; in_progress: number }> {
    return this.db.statusCounts(filter);
  }

  /**
   * Lists conversations in the database matching an optional filter.
   */
  async listConversations(filter?: {
    site?: string;
    account_label?: string;
    download_status?: DownloadStatus;
  }): Promise<ConversationRecord[]> {
    return this.db.listConversations(filter);
  }

  /**
   * Clears all stores in the underlying database.
   */
  async clearAll(): Promise<void> {
    await this.db.clearAll();
  }
}

/** Default singleton orchestrator */
export const defaultHarvestOrchestrator = new HarvestOrchestrator();
