/**
 * Work Queue Manager for Harvester Batch Archival.
 * Clean-room TypeScript port of queue operations from Clio's storage/db.js and archive.js.
 *
 * Responsibilities:
 * - High-level queue seeding from enumerated sidebar conversations
 * - Idempotent deduplication of already-archived conversations
 * - Atomic work claiming (dequeueNext)
 * - Error recording and retry accounting
 * - Status aggregation
 */

import type {
  HarvestPlatform,
  ConversationRecord,
  DiscoveredConversation,
  QueueRecord,
  DownloadStatus,
  HarvestStatusCounts
} from '../types';
import { HarvestDB, defaultHarvestDb } from '../storage/harvest-db';
import { buildPlatformConversationUrl } from './tab-worker';

export interface SeedItem {
  conversationId?: string;
  conversation_id?: string;
  title?: string;
  url?: string;
}

export interface SeedResult {
  enumerated: number;
  queued: number;
  skipped: number;
}

export class QueueManager {
  private readonly db: HarvestDB;

  constructor(db: HarvestDB = defaultHarvestDb) {
    this.db = db;
  }

  /**
   * Seeds the harvest queue from a list of discovered sidebar conversations.
   * Skips conversations that have already been marked as 'done' in the ledger,
   * while updating their titles if they have changed.
   * Deduplicates multiple entries for the same conversation ID within the batch.
   */
  async seedQueue(
    convs: (SeedItem | DiscoveredConversation | ConversationRecord)[],
    site: HarvestPlatform,
    accountLabel: string
  ): Promise<SeedResult> {
    // 1. Record/update the account profile
    await this.db.upsertAccount({
      account_label: accountLabel,
      site,
      discovered_at: Date.now()
    });

    let queued = 0;
    let skipped = 0;
    const seenIds = new Set<string>();

    // 2. Process each discovered conversation
    for (const item of convs) {
      const convId =
        (item as any).conversationId ||
        (item as any).conversation_id ||
        (item as any).id;

      if (!convId || seenIds.has(convId)) continue;
      seenIds.add(convId);

      const title = item.title || 'Untitled Conversation';
      const url = item.url || buildPlatformConversationUrl(site, convId);

      const keyObj = {
        site,
        account_label: accountLabel,
        conversation_id: convId
      };

      const existing = await this.db.getConversation(keyObj);

      if (existing && existing.download_status === 'done') {
        // Conversation already archived: update title and url without changing download_status
        await this.db.upsertConversation({
          ...existing,
          title,
          url: url || existing.url
        });
        skipped++;
      } else {
        // Not done yet: upsert as pending and add to extraction_queue
        await this.db.upsertConversation({
          site,
          account_label: accountLabel,
          conversation_id: convId,
          title,
          url,
          discovered_at: existing?.discovered_at ?? Date.now(),
          download_status: 'pending',
          attempts: existing?.attempts ?? 0
        });

        await this.db.enqueueExtraction({
          site,
          account_label: accountLabel,
          conversation_id: convId,
          title,
          url
        });

        queued++;
      }
    }

    return {
      enumerated: convs.length,
      queued,
      skipped
    };
  }

  /**
   * Claims the next pending item from the extraction queue.
   * Atomically marks it as 'in_progress'.
   */
  async claimNext(): Promise<QueueRecord | null> {
    return this.db.dequeueNext();
  }

  /**
   * Marks a conversation and its queue entry as successfully completed.
   */
  async markSuccess(
    keyObj: { site: HarvestPlatform; account_label: string; conversation_id: string } | QueueRecord,
    zipName?: string
  ): Promise<void> {
    await this.db.markDownloaded(
      {
        site: keyObj.site,
        account_label: keyObj.account_label,
        conversation_id: keyObj.conversation_id
      },
      { zip_name: zipName }
    );
  }

  /**
   * Marks a conversation and its queue entry with an error.
   */
  async markFailure(
    keyObj: { site: HarvestPlatform; account_label: string; conversation_id: string } | QueueRecord,
    error: any
  ): Promise<void> {
    await this.db.markDownloadError(
      {
        site: keyObj.site,
        account_label: keyObj.account_label,
        conversation_id: keyObj.conversation_id
      },
      error
    );
  }

  /**
   * Aggregates current status counts.
   */
  async getStats(filter?: {
    site?: string;
    account_label?: string;
    accountLabel?: string;
  }): Promise<HarvestStatusCounts> {
    return this.db.statusCounts(filter);
  }

  /**
   * Fast O(1) count of items currently in the extraction queue.
   */
  async getQueueCount(status?: 'pending' | 'in_progress' | 'done' | 'error'): Promise<number> {
    return this.db.queueCount(status);
  }

  /**
   * Lists conversations in the catalog matching an optional status filter.
   */
  async listConversations(filter?: {
    site?: string;
    account_label?: string;
    download_status?: DownloadStatus;
  }): Promise<ConversationRecord[]> {
    return this.db.listConversations(filter);
  }

  /**
   * Clears all queue items from the extraction_queue object store.
   */
  async clearQueue(): Promise<void> {
    const rawDb = await this.db.openDb();
    if (!rawDb.objectStoreNames.contains('extraction_queue')) return;

    return new Promise((resolve, reject) => {
      const tx = rawDb.transaction('extraction_queue', 'readwrite');
      const store = tx.objectStore('extraction_queue');
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to clear extraction_queue'));
    });
  }

  /**
   * Returns underlying HarvestDB instance.
   */
  getDb(): HarvestDB {
    return this.db;
  }
}
