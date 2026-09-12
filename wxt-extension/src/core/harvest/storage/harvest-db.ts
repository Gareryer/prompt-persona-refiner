/**
 * Typed IndexedDB persistence layer for the Harvester Subsystem.
 * Clean-room TypeScript port of Clio's storage/db.js.
 *
 * Manages 5 object stores:
 * 1. accounts (keyPath: account_label)
 * 2. conversations (keyPath: ['site', 'account_label', 'conversation_id'], index: by_download_status)
 * 3. extraction_queue (keyPath: flat_key, index: by_status)
 * 4. harvest_runs (keyPath: run_id, autoIncrement: true)
 * 5. settings (keyPath: key)
 */

import type {
  HarvestPlatform,
  DownloadStatus,
  ConversationRecord,
  AccountRecord,
  QueueRecord,
  HarvestRunRecord,
  HarvestStatusCounts
} from '../types';

export const HARVEST_DB_NAME = 'clio-archive';
export const HARVEST_DB_VERSION = 1;

export interface HarvestDbOptions {
  dbName?: string;
  dbVersion?: number;
  indexedDB?: IDBFactory;
}

export class HarvestDB {
  private readonly dbName: string;
  private readonly dbVersion: number;
  private customIdbFactory?: IDBFactory;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(options?: HarvestDbOptions) {
    this.dbName = options?.dbName ?? HARVEST_DB_NAME;
    this.dbVersion = options?.dbVersion ?? HARVEST_DB_VERSION;
    this.customIdbFactory = options?.indexedDB;
  }

  private getIdbFactory(): IDBFactory {
    if (this.customIdbFactory) return this.customIdbFactory;
    if (typeof indexedDB !== 'undefined') return indexedDB;
    if (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB) {
      return (globalThis as any).indexedDB;
    }
    if (typeof window !== 'undefined' && window.indexedDB) {
      return window.indexedDB;
    }
    throw new Error('IndexedDB is not available in the current environment');
  }

  private getIdbKeyRange(): typeof IDBKeyRange | undefined {
    if (typeof IDBKeyRange !== 'undefined') return IDBKeyRange;
    if (typeof globalThis !== 'undefined' && (globalThis as any).IDBKeyRange) {
      return (globalThis as any).IDBKeyRange;
    }
    if (typeof window !== 'undefined' && (window as any).IDBKeyRange) {
      return (window as any).IDBKeyRange;
    }
    return undefined;
  }

  /**
   * Generates composite primary key for conversations store.
   * Tolerates both snake_case and camelCase property names.
   */
  convKey(
    keyObj:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string]
  ): [string, string, string] {
    return this.toConvKey(keyObj);
  }

  /**
   * Generates flat key for extraction_queue store.
   * Format: site::account_label::conversation_id
   */
  flatKey(
    keyObj:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string]
      | string
  ): string {
    return this.toFlatKey(keyObj);
  }

  /**
   * Parses flat key back into composite parts.
   */
  parseFlatKey(key: string): { site: HarvestPlatform; account_label: string; conversation_id: string } {
    const parts = key.split('::');
    return {
      site: (parts[0] || 'gemini') as HarvestPlatform,
      account_label: parts[1] || 'default',
      conversation_id: parts.slice(2).join('::') || ''
    };
  }

  private toConvKey(
    target:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string]
  ): [string, string, string] {
    if (Array.isArray(target)) return target;
    const account = target.account_label ?? target.accountLabel ?? 'default';
    const convId = target.conversation_id ?? target.conversationId ?? '';
    return [target.site, account, convId];
  }

  private toFlatKey(
    target:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string]
      | string
  ): string {
    if (typeof target === 'string') return target;
    if (Array.isArray(target)) return `${target[0]}::${target[1]}::${target[2]}`;
    const account = target.account_label ?? target.accountLabel ?? 'default';
    const convId = target.conversation_id ?? target.conversationId ?? '';
    return `${target.site}::${account}::${convId}`;
  }

  /**
   * Opens the IndexedDB database and executes schema migrations if needed.
   */
  openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const idb = this.getIdbFactory();
      const request = idb.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;

        // 1. accounts
        if (!db.objectStoreNames.contains('accounts')) {
          db.createObjectStore('accounts', { keyPath: 'account_label' });
        }

        // 2. conversations
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', {
            keyPath: ['site', 'account_label', 'conversation_id']
          });
          convStore.createIndex('by_download_status', 'download_status', { unique: false });
        }

        // 3. extraction_queue
        if (!db.objectStoreNames.contains('extraction_queue')) {
          const queueStore = db.createObjectStore('extraction_queue', { keyPath: 'flat_key' });
          queueStore.createIndex('by_status', 'status', { unique: false });
        }

        // 4. harvest_runs
        if (!db.objectStoreNames.contains('harvest_runs')) {
          db.createObjectStore('harvest_runs', { keyPath: 'run_id', autoIncrement: true });
        }

        // 5. settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          this.dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB database'));
      };

      request.onblocked = () => {
        // Upgrade blocked by open connections
      };
    });

    return this.dbPromise;
  }

  /**
   * Closes active database connection.
   */
  async close(): Promise<void> {
    if (this.dbPromise) {
      const db = await this.dbPromise;
      db.close();
      this.dbPromise = null;
    }
  }

  /**
   * Upserts an account profile into the accounts store.
   */
  async upsertAccount(account: AccountRecord): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('accounts', 'readwrite');
      const store = tx.objectStore('accounts');
      const record: AccountRecord = {
        ...account,
        discovered_at: account.discovered_at ?? Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to upsert account'));
    });
  }

  /**
   * Lists all discovered user account profiles.
   */
  async listAccounts(): Promise<AccountRecord[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('accounts', 'readonly');
      const store = tx.objectStore('accounts');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error('Failed to list accounts'));
    });
  }

  /**
   * Idempotently upserts a conversation record into the conversations store.
   * Updates title and metadata while strictly preserving download_status, zip_name,
   * downloaded_at, and earliest discovered_at.
   */
  async upsertConversation(row: ConversationRecord): Promise<ConversationRecord> {
    const db = await this.openDb();
    return new Promise<ConversationRecord>((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const key = this.convKey(row);
      const getReq = store.get(key);
      let merged: ConversationRecord;

      getReq.onsuccess = () => {
        const existing = getReq.result as ConversationRecord | undefined;
        merged = {
          ...row,
          // Strictly preserve archival status & artifacts from previous download
          download_status: existing?.download_status ?? row.download_status ?? 'pending',
          zip_name: existing?.zip_name ?? row.zip_name,
          downloaded_at: existing?.downloaded_at ?? row.downloaded_at,
          discovered_at: existing?.discovered_at ?? row.discovered_at ?? Date.now(),
          attempts: Math.max(existing?.attempts ?? 0, row.attempts ?? 0),
          last_error: row.last_error ?? existing?.last_error,
          content_extracted_at: row.content_extracted_at ?? existing?.content_extracted_at,
          url: row.url || existing?.url || '',
          messages: row.messages ?? existing?.messages,
          metadata: row.metadata ?? existing?.metadata
        };

        const putReq = store.put(merged);
        putReq.onerror = () => reject(putReq.error || new Error('Failed to save conversation'));
      };

      getReq.onerror = () => reject(getReq.error || new Error('Failed to lookup conversation'));
      tx.oncomplete = () => resolve(merged);
      tx.onerror = () => reject(tx.error || new Error('Transaction failed in upsertConversation'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted in upsertConversation'));
    });
  }

  /**
   * Fetches a conversation record by composite key.
   */
  async getConversation(
    keyObj:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string]
  ): Promise<ConversationRecord | undefined> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const req = store.get(this.toConvKey(keyObj));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to get conversation'));
    });
  }

  /**
   * Lists conversations with optional filtering by site, account_label, and download_status.
   */
  async listConversations(filter?: {
    site?: string;
    account_label?: string;
    accountLabel?: string;
    download_status?: DownloadStatus;
  }): Promise<ConversationRecord[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');

      let req: IDBRequest<ConversationRecord[]>;
      if (filter?.download_status && store.indexNames.contains('by_download_status')) {
        const idx = store.index('by_download_status');
        req = idx.getAll(filter.download_status);
      } else {
        req = store.getAll();
      }

      req.onsuccess = () => {
        let results = req.result || [];
        const accountTarget = filter?.account_label ?? filter?.accountLabel;
        if (filter?.site) {
          results = results.filter(r => r.site === filter.site);
        }
        if (accountTarget) {
          results = results.filter(r => r.account_label === accountTarget);
        }
        if (filter?.download_status && (!store.indexNames.contains('by_download_status') || !req)) {
          results = results.filter(r => r.download_status === filter.download_status);
        }
        resolve(results);
      };

      req.onerror = () => reject(req.error || new Error('Failed to list conversations'));
    });
  }

  /**
   * Marks a conversation as downloaded ('done'), timestamps the download,
   * updates the zip_name, and transitions its queue record to 'done'.
   */
  async markDownloaded(
    keyObj:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string],
    details?: { zip_name?: string }
  ): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'extraction_queue'], 'readwrite');
      const convStore = tx.objectStore('conversations');
      const queueStore = tx.objectStore('extraction_queue');

      const convKey = this.toConvKey(keyObj);
      const flatKey = this.toFlatKey(keyObj);

      // 1. Update conversation
      const getConv = convStore.get(convKey);
      getConv.onsuccess = () => {
        const conv = getConv.result as ConversationRecord | undefined;
        if (conv) {
          conv.download_status = 'done';
          conv.downloaded_at = Date.now();
          if (details?.zip_name) conv.zip_name = details.zip_name;
          convStore.put(conv);
        } else {
          const [site, account_label, conversation_id] = convKey;
          convStore.put({
            site: site as HarvestPlatform,
            account_label,
            conversation_id,
            title: 'Untitled Conversation',
            url: '',
            discovered_at: Date.now(),
            download_status: 'done',
            downloaded_at: Date.now(),
            zip_name: details?.zip_name
          });
        }
      };

      // 2. Update queue
      const getQueue = queueStore.get(flatKey);
      getQueue.onsuccess = () => {
        const qItem = getQueue.result as QueueRecord | undefined;
        if (qItem) {
          qItem.status = 'done';
          qItem.completed_at = Date.now();
          queueStore.put(qItem);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to mark downloaded'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted in markDownloaded'));
    });
  }

  /**
   * Records a download error on the conversation and updates retry counters.
   */
  async markDownloadError(
    keyObj:
      | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
      | [string, string, string],
    error: any
  ): Promise<void> {
    const db = await this.openDb();
    const errMsg = error instanceof Error ? error.message : String(error);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'extraction_queue'], 'readwrite');
      const convStore = tx.objectStore('conversations');
      const queueStore = tx.objectStore('extraction_queue');

      const convKey = this.toConvKey(keyObj);
      const flatKey = this.toFlatKey(keyObj);

      // 1. Update conversation
      const getConv = convStore.get(convKey);
      getConv.onsuccess = () => {
        const conv = getConv.result as ConversationRecord | undefined;
        if (conv) {
          conv.download_status = 'error';
          conv.last_error = errMsg;
          conv.attempts = (conv.attempts ?? 0) + 1;
          convStore.put(conv);
        } else {
          const [site, account_label, conversation_id] = convKey;
          convStore.put({
            site: site as HarvestPlatform,
            account_label,
            conversation_id,
            title: 'Untitled Conversation',
            url: '',
            discovered_at: Date.now(),
            download_status: 'error',
            last_error: errMsg,
            attempts: 1
          });
        }
      };

      // 2. Update queue
      const getQueue = queueStore.get(flatKey);
      getQueue.onsuccess = () => {
        const qItem = getQueue.result as QueueRecord | undefined;
        if (qItem) {
          qItem.status = 'error';
          qItem.last_error = errMsg;
          qItem.attempts = (qItem.attempts ?? 0) + 1;
          queueStore.put(qItem);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to mark download error'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted in markDownloadError'));
    });
  }

  /**
   * Aggregates status counts across conversations.
   */
  async statusCounts(filter?: {
    site?: string;
    account_label?: string;
    accountLabel?: string;
  }): Promise<HarvestStatusCounts> {
    const convs = await this.listConversations(filter);
    const counts: HarvestStatusCounts = {
      total: convs.length,
      pending: 0,
      done: 0,
      error: 0,
      in_progress: 0
    };

    for (const c of convs) {
      if (c.download_status === 'done') {
        counts.done++;
      } else if (c.download_status === 'error') {
        counts.error++;
      } else if (c.download_status === 'in_progress') {
        counts.in_progress++;
      } else {
        counts.pending++;
      }
    }

    return counts;
  }

  /**
   * Enqueues a conversation for extraction. If the conversation is already marked done,
   * it returns the existing or done record without re-enqueuing into pending state.
   */
  async enqueueExtraction(item: {
    site: HarvestPlatform;
    account_label?: string;
    accountLabel?: string;
    conversation_id?: string;
    conversationId?: string;
    title?: string;
    url?: string;
  }): Promise<QueueRecord> {
    const db = await this.openDb();
    const site = item.site;
    const account_label = item.account_label ?? item.accountLabel ?? 'default';
    const conversation_id = item.conversation_id ?? item.conversationId ?? '';

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['conversations', 'extraction_queue'], 'readwrite');
      const convStore = tx.objectStore('conversations');
      const queueStore = tx.objectStore('extraction_queue');

      const convKey = this.convKey({ site, account_label, conversation_id });
      const flatKey = this.flatKey({ site, account_label, conversation_id });
      let resolvedRecord: QueueRecord | null = null;

      const convReq = convStore.get(convKey);
      convReq.onsuccess = () => {
        const conv = convReq.result as ConversationRecord | undefined;

        // If conversation is already done, preserve done state
        if (conv && conv.download_status === 'done') {
          const queueReq = queueStore.get(flatKey);
          queueReq.onsuccess = () => {
            if (queueReq.result) {
              resolvedRecord = queueReq.result;
            } else {
              const doneRecord: QueueRecord = {
                flat_key: flatKey,
                site,
                account_label,
                conversation_id,
                title: item.title || conv.title,
                url: item.url || conv.url,
                status: 'done',
                attempts: conv.attempts || 0,
                queued_at: conv.discovered_at || Date.now(),
                completed_at: conv.downloaded_at || Date.now()
              };
              queueStore.put(doneRecord);
              resolvedRecord = doneRecord;
            }
          };
          return;
        }

        // Ensure conversation exists in master catalog
        if (!conv) {
          convStore.put({
            site,
            account_label,
            conversation_id,
            title: item.title || 'Untitled Conversation',
            url: item.url || '',
            discovered_at: Date.now(),
            download_status: 'pending',
            attempts: 0
          });
        }

        // Enqueue into extraction_queue
        const queueReq = queueStore.get(flatKey);
        queueReq.onsuccess = () => {
          const existingQ = queueReq.result as QueueRecord | undefined;
          const status = existingQ?.status === 'in_progress' ? 'in_progress' : 'pending';
          const qRecord: QueueRecord = {
            flat_key: flatKey,
            site,
            account_label,
            conversation_id,
            title: item.title || conv?.title || existingQ?.title,
            url: item.url || conv?.url || existingQ?.url,
            status,
            attempts: existingQ?.attempts ?? 0,
            queued_at: existingQ?.queued_at ?? Date.now()
          };
          queueStore.put(qRecord);
          resolvedRecord = qRecord;
        };
      };

      tx.oncomplete = () => {
        if (resolvedRecord) resolve(resolvedRecord);
      };
      tx.onerror = () => reject(tx.error || new Error('Failed to enqueue extraction'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted in enqueueExtraction'));
    });
  }

  /**
   * Atomically claims the next pending item from the extraction queue
   * and transitions its status to 'in_progress'. Resolves after transaction commits.
   */
  async dequeueNext(): Promise<QueueRecord | null> {
    const db = await this.openDb();
    const idbKeyRange = this.getIdbKeyRange();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(['extraction_queue', 'conversations'], 'readwrite');
      const queueStore = tx.objectStore('extraction_queue');
      const convStore = tx.objectStore('conversations');

      let claimedItem: QueueRecord | null = null;
      let req: IDBRequest<IDBCursorWithValue | null>;
      if (queueStore.indexNames.contains('by_status') && idbKeyRange) {
        const index = queueStore.index('by_status');
        req = index.openCursor(idbKeyRange.only('pending'));
      } else {
        req = queueStore.openCursor();
      }

      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          return;
        }

        const item = cursor.value as QueueRecord;
        if (item.status === 'pending') {
          item.status = 'in_progress';
          item.started_at = Date.now();
          claimedItem = { ...item };
          cursor.update(item);

          // Also transition conversation status to in_progress in conversations catalog
          const convKey = this.convKey(item);
          const convReq = convStore.get(convKey);
          convReq.onsuccess = () => {
            const conv = convReq.result as ConversationRecord | undefined;
            if (conv && conv.download_status !== 'done') {
              conv.download_status = 'in_progress';
              convStore.put(conv);
            }
          };
        } else {
          cursor.continue();
        }
      };

      req.onerror = () => reject(req.error || new Error('Failed to dequeue next item'));
      tx.oncomplete = () => resolve(claimedItem);
      tx.onerror = () => reject(tx.error || new Error('Transaction failed in dequeueNext'));
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted in dequeueNext'));
    });
  }

  /**
   * Fast O(1) count of items in the extraction_queue object store,
   * optionally filtered by status index.
   */
  async queueCount(status?: 'pending' | 'in_progress' | 'done' | 'error'): Promise<number> {
    const db = await this.openDb();
    const idbKeyRange = this.getIdbKeyRange();

    return new Promise((resolve, reject) => {
      const tx = db.transaction('extraction_queue', 'readonly');
      const store = tx.objectStore('extraction_queue');
      let req: IDBRequest<number>;
      if (status && store.indexNames.contains('by_status') && idbKeyRange) {
        req = store.index('by_status').count(idbKeyRange.only(status));
      } else {
        req = store.count();
      }
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Failed to count queue items'));
    });
  }

  /**
   * Appends or updates an execution run record in the harvest_runs store.
   * Returns run_id.
   */
  async recordRun(runSummary: HarvestRunRecord): Promise<number> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('harvest_runs', 'readwrite');
      const store = tx.objectStore('harvest_runs');
      const req = runSummary.run_id !== undefined ? store.put(runSummary) : store.add(runSummary);
      req.onsuccess = () => resolve((req.result ?? runSummary.run_id) as number);
      req.onerror = () => reject(req.error || new Error('Failed to record run'));
    });
  }

  /**
   * Retrieves all historical harvest run records.
   */
  async listRuns(): Promise<HarvestRunRecord[]> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('harvest_runs', 'readonly');
      const store = tx.objectStore('harvest_runs');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error || new Error('Failed to list runs'));
    });
  }

  /**
   * Gets a configuration setting from the settings store.
   */
  async getSetting<T = any>(key: string): Promise<T | undefined> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? (req.result.value as T) : undefined);
      req.onerror = () => reject(req.error || new Error('Failed to get setting'));
    });
  }

  /**
   * Sets a configuration setting in the settings store.
   */
  async setSetting(key: string, value: any): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to set setting'));
    });
  }

  /**
   * Clears all 5 object stores in a single transaction.
   */
  async clearAll(): Promise<void> {
    const db = await this.openDb();
    const storeNames = ['accounts', 'conversations', 'extraction_queue', 'harvest_runs', 'settings'];
    const available = storeNames.filter(name => db.objectStoreNames.contains(name));

    if (available.length === 0) return;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(available, 'readwrite');
      for (const name of available) {
        tx.objectStore(name).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('Failed to clear stores'));
    });
  }
}

/** Default singleton instance matching Clio's storage/db.js module convention */
export const defaultHarvestDb = new HarvestDB();

// Standalone function exports matching Clio's storage/db.js API
export function openDb(): Promise<IDBDatabase> {
  return defaultHarvestDb.openDb();
}

export function convKey(
  keyObj:
    | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
    | [string, string, string]
): [string, string, string] {
  return defaultHarvestDb.convKey(keyObj);
}

export function flatKey(
  keyObj:
    | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
    | [string, string, string]
    | string
): string {
  return defaultHarvestDb.flatKey(keyObj);
}

export function parseFlatKey(key: string): { site: HarvestPlatform; account_label: string; conversation_id: string } {
  return defaultHarvestDb.parseFlatKey(key);
}

export function upsertAccount(account: AccountRecord): Promise<void> {
  return defaultHarvestDb.upsertAccount(account);
}

export function listAccounts(): Promise<AccountRecord[]> {
  return defaultHarvestDb.listAccounts();
}

export function upsertConversation(row: ConversationRecord): Promise<ConversationRecord> {
  return defaultHarvestDb.upsertConversation(row);
}

export function getConversation(
  keyObj:
    | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
    | [string, string, string]
): Promise<ConversationRecord | undefined> {
  return defaultHarvestDb.getConversation(keyObj);
}

export function listConversations(filter?: {
  site?: string;
  account_label?: string;
  accountLabel?: string;
  download_status?: DownloadStatus;
}): Promise<ConversationRecord[]> {
  return defaultHarvestDb.listConversations(filter);
}

export function markDownloaded(
  keyObj:
    | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
    | [string, string, string],
  details?: { zip_name?: string }
): Promise<void> {
  return defaultHarvestDb.markDownloaded(keyObj, details);
}

export function markDownloadError(
  keyObj:
    | { site: string; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string }
    | [string, string, string],
  error: any
): Promise<void> {
  return defaultHarvestDb.markDownloadError(keyObj, error);
}

export function statusCounts(filter?: {
  site?: string;
  account_label?: string;
  accountLabel?: string;
}): Promise<HarvestStatusCounts> {
  return defaultHarvestDb.statusCounts(filter);
}

export function enqueueExtraction(item: {
  site: HarvestPlatform;
  account_label?: string;
  accountLabel?: string;
  conversation_id?: string;
  conversationId?: string;
  title?: string;
  url?: string;
}): Promise<QueueRecord> {
  return defaultHarvestDb.enqueueExtraction(item);
}

export function dequeueNext(): Promise<QueueRecord | null> {
  return defaultHarvestDb.dequeueNext();
}

export function queueCount(status?: 'pending' | 'in_progress' | 'done' | 'error'): Promise<number> {
  return defaultHarvestDb.queueCount(status);
}

export function recordRun(runSummary: HarvestRunRecord): Promise<number> {
  return defaultHarvestDb.recordRun(runSummary);
}

export function listRuns(): Promise<HarvestRunRecord[]> {
  return defaultHarvestDb.listRuns();
}

export function getSetting<T = any>(key: string): Promise<T | undefined> {
  return defaultHarvestDb.getSetting<T>(key);
}

export function setSetting(key: string, value: any): Promise<void> {
  return defaultHarvestDb.setSetting(key, value);
}

export function clearAll(): Promise<void> {
  return defaultHarvestDb.clearAll();
}
