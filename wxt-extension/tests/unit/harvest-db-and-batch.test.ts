import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { setupMockDom } from '../fixtures/mock-dom';
import {
  HarvestDB,
  defaultHarvestDb,
  openDb,
  convKey,
  flatKey,
  parseFlatKey,
  upsertAccount,
  listAccounts,
  upsertConversation,
  getConversation,
  listConversations,
  markDownloaded,
  markDownloadError,
  statusCounts,
  enqueueExtraction,
  dequeueNext,
  queueCount,
  recordRun,
  listRuns,
  getSetting,
  setSetting,
  clearAll,
  QueueManager,
  HarvestOrchestrator,
  processOne,
  runBatch,
  waitForTabComplete,
  sendExtractWithRecovery,
  buildPlatformConversationUrl,
  type TabWorkerDeps
} from '@/core/harvest';
import type {
  ConversationRecord,
  HarvestConversationRecord,
  QueueRecord,
  HarvestPlatform
} from '@/core/harvest/types';

setupMockDom();

// Helper creating mock conversation record
function createMockExtractionRecord(
  conversationId: string,
  site: HarvestPlatform = 'gemini',
  title = 'Test Conversation'
): HarvestConversationRecord {
  return {
    metadata: {
      site,
      accountLabel: 'test-user',
      conversationId,
      title,
      url: `https://${site}.com/chat/${conversationId}`,
      extractedAt: new Date().toISOString(),
      messageCount: 2,
      imageCount: 0
    },
    messages: [
      {
        id: 'msg-1',
        turnIndex: 0,
        role: 'user',
        content: 'Hello AI',
        timestamp: Date.now() - 5000
      },
      {
        id: 'msg-2',
        turnIndex: 1,
        role: 'assistant',
        content: 'Hello human! How can I help you today?',
        timestamp: Date.now() - 1000
      }
    ],
    images: []
  };
}

describe('Phase 4: IndexedDB Persistence & Batch Queue Subsystem', () => {
  let testDb: HarvestDB;
  let dbName: string;

  beforeEach(async () => {
    setupMockDom();
    dbName = `clio-archive-test-${Math.random().toString(36).slice(2, 10)}`;
    testDb = new HarvestDB({ dbName });
    await testDb.clearAll();
  });

  afterEach(async () => {
    await testDb.clearAll();
    await testDb.close();
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  // =========================================================================
  // 1. HarvestDB Schema & Stores
  // =========================================================================
  describe('1. HarvestDB - Schema & Object Stores Initialization', () => {
    it('opens database and provisions all 5 required object stores and indexes', async () => {
      const rawDb = await testDb.openDb();
      expect(rawDb.name).toBe(dbName);
      expect(rawDb.version).toBe(1);

      const storeNames = Array.from(rawDb.objectStoreNames);
      expect(storeNames).toContain('accounts');
      expect(storeNames).toContain('conversations');
      expect(storeNames).toContain('extraction_queue');
      expect(storeNames).toContain('harvest_runs');
      expect(storeNames).toContain('settings');

      // Verify conversations store keyPath & index
      const tx = rawDb.transaction(['conversations', 'extraction_queue'], 'readonly');
      const convStore = tx.objectStore('conversations');
      expect(convStore.keyPath).toEqual(['site', 'account_label', 'conversation_id']);
      expect(convStore.indexNames.contains('by_download_status')).toBe(true);

      // Verify extraction_queue store keyPath & index
      const queueStore = tx.objectStore('extraction_queue');
      expect(queueStore.keyPath).toBe('flat_key');
      expect(queueStore.indexNames.contains('by_status')).toBe(true);
    });

    it('generates consistent composite and flat keys and parses flat keys', () => {
      const target = {
        site: 'gemini' as HarvestPlatform,
        account_label: 'work-profile',
        conversation_id: 'conv-xyz-123'
      };

      expect(testDb.convKey(target)).toEqual(['gemini', 'work-profile', 'conv-xyz-123']);
      expect(testDb.flatKey(target)).toBe('gemini::work-profile::conv-xyz-123');

      const parsed = testDb.parseFlatKey('claude::personal::session-uuid-999');
      expect(parsed.site).toBe('claude');
      expect(parsed.account_label).toBe('personal');
      expect(parsed.conversation_id).toBe('session-uuid-999');
    });
  });

  // =========================================================================
  // 2. HarvestDB Accounts Store
  // =========================================================================
  describe('2. HarvestDB - Accounts Store', () => {
    it('upserts and retrieves user account profiles', async () => {
      await testDb.upsertAccount({
        account_label: 'default',
        site: 'gemini',
        metadata: { email: 'user@example.com' }
      });

      await testDb.upsertAccount({
        account_label: 'pro-account',
        site: 'claude'
      });

      const accounts = await testDb.listAccounts();
      expect(accounts.length).toBe(2);

      const defaultAcc = accounts.find(a => a.account_label === 'default');
      expect(defaultAcc).toBeDefined();
      expect(defaultAcc?.site).toBe('gemini');
      expect(defaultAcc?.metadata?.email).toBe('user@example.com');
      expect(typeof defaultAcc?.discovered_at).toBe('number');
    });

    it('updates an existing account profile without creating duplicates', async () => {
      await testDb.upsertAccount({
        account_label: 'shared',
        site: 'chatgpt'
      });

      await testDb.upsertAccount({
        account_label: 'shared',
        site: 'chatgpt',
        metadata: { tier: 'plus' }
      });

      const accounts = await testDb.listAccounts();
      expect(accounts.length).toBe(1);
      expect(accounts[0]?.metadata?.tier).toBe('plus');
    });
  });

  // =========================================================================
  // 3. HarvestDB Conversations Store & Idempotent Upsert
  // =========================================================================
  describe('3. HarvestDB - Conversations Store & Idempotent Upsert', () => {
    it('saves and retrieves a conversation by composite key', async () => {
      const record: ConversationRecord = {
        site: 'gemini',
        account_label: 'test-user',
        conversation_id: 'conv-001',
        title: 'Initial Prompting Discussion',
        url: 'https://gemini.google.com/app/conv-001',
        discovered_at: 1000000,
        download_status: 'pending',
        attempts: 0
      };

      const saved = await testDb.upsertConversation(record);
      expect(saved.title).toBe('Initial Prompting Discussion');

      const fetched = await testDb.getConversation({
        site: 'gemini',
        account_label: 'test-user',
        conversation_id: 'conv-001'
      });

      expect(fetched).toBeDefined();
      expect(fetched?.title).toBe('Initial Prompting Discussion');
      expect(fetched?.download_status).toBe('pending');

      // Also retrieve via 3-tuple array
      const fetchedByTuple = await testDb.getConversation(['gemini', 'test-user', 'conv-001']);
      expect(fetchedByTuple?.conversation_id).toBe('conv-001');
    });

    it('strictly preserves download_status, zip_name, and downloaded_at during idempotent upsert', async () => {
      // 1. Initial conversation inserted as completed archive
      const initial: ConversationRecord = {
        site: 'claude',
        account_label: 'work',
        conversation_id: 'c-42',
        title: 'Original Title',
        url: 'https://claude.ai/chat/c-42',
        discovered_at: 1000,
        download_status: 'done',
        zip_name: 'claude_original_title_2026-09-01.zip',
        downloaded_at: 5000,
        attempts: 1
      };
      await testDb.upsertConversation(initial);

      // 2. Crawler re-encounters conversation with new title and default 'pending' status
      const updateEncounter: ConversationRecord = {
        site: 'claude',
        account_label: 'work',
        conversation_id: 'c-42',
        title: 'Renamed Title By User',
        url: 'https://claude.ai/chat/c-42',
        discovered_at: 9000,
        download_status: 'pending', // Re-scan default status
        attempts: 0
      };

      const updated = await testDb.upsertConversation(updateEncounter);

      // Verify title updated but archival artifacts are strictly protected
      expect(updated.title).toBe('Renamed Title By User');
      expect(updated.download_status).toBe('done'); // Must NOT revert to 'pending'
      expect(updated.zip_name).toBe('claude_original_title_2026-09-01.zip');
      expect(updated.downloaded_at).toBe(5000);
      expect(updated.discovered_at).toBe(1000); // Preserves earliest discovery

      // Check directly in DB
      const direct = await testDb.getConversation({
        site: 'claude',
        account_label: 'work',
        conversation_id: 'c-42'
      });
      expect(direct?.download_status).toBe('done');
      expect(direct?.zip_name).toBe('claude_original_title_2026-09-01.zip');
    });

    it('lists conversations and supports filtering by site, account, and status', async () => {
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'alice',
        conversation_id: 'g-1',
        title: 'Gemini Chat 1',
        url: '',
        discovered_at: Date.now(),
        download_status: 'done'
      });

      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'bob',
        conversation_id: 'g-2',
        title: 'Gemini Chat 2',
        url: '',
        discovered_at: Date.now(),
        download_status: 'pending'
      });

      await testDb.upsertConversation({
        site: 'claude',
        account_label: 'alice',
        conversation_id: 'c-1',
        title: 'Claude Chat 1',
        url: '',
        discovered_at: Date.now(),
        download_status: 'error'
      });

      const all = await testDb.listConversations();
      expect(all.length).toBe(3);

      const geminiOnly = await testDb.listConversations({ site: 'gemini' });
      expect(geminiOnly.length).toBe(2);

      const aliceOnly = await testDb.listConversations({ account_label: 'alice' });
      expect(aliceOnly.length).toBe(2);

      const doneOnly = await testDb.listConversations({ download_status: 'done' });
      expect(doneOnly.length).toBe(1);
      expect(doneOnly[0]?.conversation_id).toBe('g-1');

      const errorOnly = await testDb.listConversations({ download_status: 'error' });
      expect(errorOnly.length).toBe(1);
      expect(errorOnly[0]?.conversation_id).toBe('c-1');
    });

    it('transitions status correctly on markDownloaded and markDownloadError', async () => {
      const keyObj = {
        site: 'chatgpt' as HarvestPlatform,
        account_label: 'user',
        conversation_id: 'gpt-10'
      };

      await testDb.upsertConversation({
        ...keyObj,
        title: 'GPT Conversation',
        url: '',
        discovered_at: Date.now(),
        download_status: 'pending'
      });

      // 1. Mark error
      await testDb.markDownloadError(keyObj, new Error('Network timeout'));
      let conv = await testDb.getConversation(keyObj);
      expect(conv?.download_status).toBe('error');
      expect(conv?.last_error).toBe('Network timeout');
      expect(conv?.attempts).toBe(1);

      // 2. Mark downloaded
      await testDb.markDownloaded(keyObj, { zip_name: 'gpt-10.zip' });
      conv = await testDb.getConversation(keyObj);
      expect(conv?.download_status).toBe('done');
      expect(conv?.zip_name).toBe('gpt-10.zip');
      expect(typeof conv?.downloaded_at).toBe('number');
    });

    it('aggregates status counts correctly', async () => {
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'u',
        conversation_id: '1',
        title: '1',
        url: '',
        discovered_at: 1,
        download_status: 'done'
      });
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'u',
        conversation_id: '2',
        title: '2',
        url: '',
        discovered_at: 1,
        download_status: 'done'
      });
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'u',
        conversation_id: '3',
        title: '3',
        url: '',
        discovered_at: 1,
        download_status: 'pending'
      });
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'u',
        conversation_id: '4',
        title: '4',
        url: '',
        discovered_at: 1,
        download_status: 'error'
      });
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'u',
        conversation_id: '5',
        title: '5',
        url: '',
        discovered_at: 1,
        download_status: 'in_progress'
      });

      const stats = await testDb.statusCounts();
      expect(stats.total).toBe(5);
      expect(stats.done).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.error).toBe(1);
      expect(stats.in_progress).toBe(1);
    });
  });

  // =========================================================================
  // 4. HarvestDB Extraction Queue & Dequeue
  // =========================================================================
  describe('4. HarvestDB - Extraction Queue & Dequeue Mechanics', () => {
    it('enqueues an item and assigns pending state', async () => {
      const q = await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'main',
        conversation_id: 'q-item-1',
        title: 'Queued Item 1',
        url: 'https://gemini.google.com/app/q-item-1'
      });

      expect(q.flat_key).toBe('gemini::main::q-item-1');
      expect(q.status).toBe('pending');
      expect(q.attempts).toBe(0);

      // Verify conversation catalog entry was also seeded
      const conv = await testDb.getConversation(['gemini', 'main', 'q-item-1']);
      expect(conv).toBeDefined();
      expect(conv?.download_status).toBe('pending');
    });

    it('does not re-enqueue a conversation that is already completed', async () => {
      // 1. Mark conversation done in catalog
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'main',
        conversation_id: 'completed-1',
        title: 'Already Finished',
        url: '',
        discovered_at: 100,
        download_status: 'done',
        downloaded_at: 200,
        zip_name: 'done.zip'
      });

      // 2. Attempt to enqueue
      const res = await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'main',
        conversation_id: 'completed-1'
      });

      expect(res.status).toBe('done');

      // Attempt dequeue: queue must be empty
      const next = await testDb.dequeueNext();
      expect(next).toBeNull();
    });

    it('atomically claims the next pending queue item and transitions it to in_progress', async () => {
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'first',
        title: 'First'
      });

      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'second',
        title: 'Second'
      });

      // Dequeue 1
      const item1 = await testDb.dequeueNext();
      expect(item1).not.toBeNull();
      expect(item1?.conversation_id).toBe('first');
      expect(item1?.status).toBe('in_progress');
      expect(typeof item1?.started_at).toBe('number');

      // Dequeue 2
      const item2 = await testDb.dequeueNext();
      expect(item2).not.toBeNull();
      expect(item2?.conversation_id).toBe('second');
      expect(item2?.status).toBe('in_progress');

      // Dequeue 3 (empty)
      const item3 = await testDb.dequeueNext();
      expect(item3).toBeNull();
    });

    it('synchronizes queue item status on markDownloaded and markDownloadError', async () => {
      const target = {
        site: 'claude' as HarvestPlatform,
        account_label: 'dev',
        conversation_id: 'sync-test'
      };

      await testDb.enqueueExtraction({
        ...target,
        title: 'Sync Test'
      });

      // Claim item
      await testDb.dequeueNext();

      // Error transition
      await testDb.markDownloadError(target, new Error('CORS blocked'));
      const rawDb = await testDb.openDb();
      const tx1 = rawDb.transaction('extraction_queue', 'readonly');
      const qErr = await new Promise<QueueRecord>(resolve => {
        const req = tx1.objectStore('extraction_queue').get(testDb.flatKey(target));
        req.onsuccess = () => resolve(req.result);
      });
      expect(qErr.status).toBe('error');
      expect(qErr.last_error).toBe('CORS blocked');
      expect(qErr.attempts).toBe(1);

      // Success transition
      await testDb.markDownloaded(target, { zip_name: 'synced.zip' });
      const tx2 = rawDb.transaction('extraction_queue', 'readonly');
      const qDone = await new Promise<QueueRecord>(resolve => {
        const req = tx2.objectStore('extraction_queue').get(testDb.flatKey(target));
        req.onsuccess = () => resolve(req.result);
      });
      expect(qDone.status).toBe('done');
      expect(typeof qDone.completed_at).toBe('number');
    });
  });

  // =========================================================================
  // 5. HarvestDB Runs, Settings & Clear
  // =========================================================================
  describe('5. HarvestDB - Runs, Settings & Clear', () => {
    it('records and lists harvest execution run summaries with auto-increment ID', async () => {
      const id1 = await testDb.recordRun({
        started_at: 1000,
        completed_at: 2000,
        total_queued: 10,
        done_count: 9,
        error_count: 1,
        status: 'completed'
      });

      const id2 = await testDb.recordRun({
        started_at: 3000,
        total_queued: 5,
        done_count: 0,
        error_count: 0,
        status: 'running'
      });

      expect(typeof id1).toBe('number');
      expect(typeof id2).toBe('number');
      expect(id2).toBeGreaterThan(id1);

      const runs = await testDb.listRuns();
      expect(runs.length).toBe(2);
      expect(runs[0]?.total_queued).toBe(10);
      expect(runs[1]?.status).toBe('running');
    });

    it('stores and retrieves settings by key', async () => {
      await testDb.setSetting('batchPaceMs', 2500);
      await testDb.setSetting('autoZipCompress', true);
      await testDb.setSetting('filterOptions', { tags: ['ai', 'code'] });

      expect(await testDb.getSetting('batchPaceMs')).toBe(2500);
      expect(await testDb.getSetting('autoZipCompress')).toBe(true);
      expect(await testDb.getSetting('filterOptions')).toEqual({ tags: ['ai', 'code'] });
      expect(await testDb.getSetting('non_existent')).toBeUndefined();
    });

    it('clears all 5 stores atomically via clearAll', async () => {
      await testDb.upsertAccount({ account_label: 'test' });
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'test',
        conversation_id: 'c-1',
        title: 'T',
        url: '',
        discovered_at: 1,
        download_status: 'pending'
      });
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'test',
        conversation_id: 'c-1'
      });
      await testDb.recordRun({
        started_at: 1,
        total_queued: 1,
        done_count: 0,
        error_count: 0,
        status: 'running'
      });
      await testDb.setSetting('k', 'v');

      await testDb.clearAll();

      expect((await testDb.listAccounts()).length).toBe(0);
      expect((await testDb.listConversations()).length).toBe(0);
      expect(await testDb.dequeueNext()).toBeNull();
      expect((await testDb.listRuns()).length).toBe(0);
      expect(await testDb.getSetting('k')).toBeUndefined();
    });

    it('works with standalone Clio functions on default database instance', async () => {
      await clearAll();

      await upsertAccount({ account_label: 'standalone-user', site: 'gemini' });
      const accounts = await listAccounts();
      expect(accounts.length).toBe(1);

      await upsertConversation({
        site: 'gemini',
        account_label: 'standalone-user',
        conversation_id: 'conv-std',
        title: 'Standalone Test',
        url: '',
        discovered_at: 1,
        download_status: 'pending'
      });

      const conv = await getConversation(['gemini', 'standalone-user', 'conv-std']);
      expect(conv?.title).toBe('Standalone Test');

      const count = await statusCounts();
      expect(count.total).toBe(1);
      expect(count.pending).toBe(1);

      await setSetting('clio_key', 'clio_val');
      expect(await getSetting('clio_key')).toBe('clio_val');

      await clearAll();
      expect((await listAccounts()).length).toBe(0);
    });
  });

  // =========================================================================
  // 6. QueueManager Controller
  // =========================================================================
  describe('6. QueueManager - High-Level Seeding & Claiming', () => {
    let qm: QueueManager;

    beforeEach(() => {
      qm = new QueueManager(testDb);
    });

    it('seeds the queue from discovered conversation summaries and tracks counts', async () => {
      // Pre-seed one completed conversation
      await testDb.upsertConversation({
        site: 'gemini',
        account_label: 'main-user',
        conversation_id: 'already-done',
        title: 'Already Harvested Chat',
        url: '',
        discovered_at: 100,
        download_status: 'done',
        zip_name: 'done.zip'
      });

      const discoveredList = [
        { conversationId: 'already-done', title: 'Already Harvested Chat (Updated Title)' },
        { conversationId: 'new-chat-1', title: 'First New Chat' },
        { conversationId: 'new-chat-2', title: 'Second New Chat' }
      ];

      const seedRes = await qm.seedQueue(discoveredList, 'gemini', 'main-user');
      expect(seedRes.enumerated).toBe(3);
      expect(seedRes.queued).toBe(2);
      expect(seedRes.skipped).toBe(1);

      // Verify that the already-done conversation preserved its done status
      const existing = await testDb.getConversation({
        site: 'gemini',
        account_label: 'main-user',
        conversation_id: 'already-done'
      });
      expect(existing?.download_status).toBe('done');
      expect(existing?.title).toBe('Already Harvested Chat (Updated Title)');

      // Verify stats
      const stats = await qm.getStats();
      expect(stats.total).toBe(3);
      expect(stats.done).toBe(1);
      expect(stats.pending).toBe(2);
    });

    it('claims items sequentially, marks success, and clears queue', async () => {
      await qm.seedQueue(
        [{ conversationId: 'task-1', title: 'Task 1' }, { conversationId: 'task-2', title: 'Task 2' }],
        'claude',
        'tester'
      );

      const first = await qm.claimNext();
      expect(first?.conversation_id).toBe('task-1');

      await qm.markSuccess(first!, 'task-1.zip');
      const conv1 = await testDb.getConversation(first!);
      expect(conv1?.download_status).toBe('done');

      const second = await qm.claimNext();
      expect(second?.conversation_id).toBe('task-2');

      await qm.markFailure(second!, 'Network disconnected');
      const conv2 = await testDb.getConversation(second!);
      expect(conv2?.download_status).toBe('error');

      await qm.clearQueue();
      const third = await qm.claimNext();
      expect(third).toBeNull();
    });
  });

  // =========================================================================
  // 7. TabWorker & Helpers
  // =========================================================================
  describe('7. TabWorker - Navigation, Script Injection & Single Process', () => {
    it('builds canonical conversation URLs for all supported platforms', () => {
      expect(buildPlatformConversationUrl('gemini', '12345')).toBe('https://gemini.google.com/app/12345');
      expect(buildPlatformConversationUrl('claude', 'uuid-abc')).toBe('https://claude.ai/chat/uuid-abc');
      expect(buildPlatformConversationUrl('chatgpt', 'uuid-def')).toBe('https://chatgpt.com/c/uuid-def');
      expect(buildPlatformConversationUrl('deepseek', 'ds-1')).toBe('https://chat.deepseek.com/a/chat/s/ds-1');
      expect(buildPlatformConversationUrl('grok', 'gk-1')).toBe('https://x.com/i/grok?conversation=gk-1');
      expect(buildPlatformConversationUrl('meta', 'm-1')).toBe('https://www.meta.ai/c/m-1');
    });

    it('waitForTabComplete resolves when tab status becomes complete', async () => {
      let registeredListener: ((id: number, info: any) => void) | null = null;
      (globalThis as any).chrome = {
        tabs: {
          onUpdated: {
            addListener: vi.fn((fn: any) => {
              registeredListener = fn;
            }),
            removeListener: vi.fn()
          }
        }
      };

      const waitPromise = waitForTabComplete(42, 5000);
      expect(registeredListener).not.toBeNull();

      // Trigger completion for tab 42
      registeredListener!(42, { status: 'complete' });
      await expect(waitPromise).resolves.toBeUndefined();
    });

    it('waitForTabComplete rejects when tab navigation times out', async () => {
      (globalThis as any).chrome = {
        tabs: {
          onUpdated: {
            addListener: vi.fn(),
            removeListener: vi.fn()
          }
        }
      };

      await expect(waitForTabComplete(99, 10)).rejects.toThrow(/Timed out waiting for tab 99/);
    });

    it('sendExtractWithRecovery catches dropped connection, executes script re-injection, and retries', async () => {
      let callCount = 0;
      const executeScriptMock = vi.fn().mockResolvedValue([]);

      (globalThis as any).chrome = {
        runtime: { lastError: undefined },
        tabs: {
          sendMessage: vi.fn((tabId: number, msg: any, callback: Function) => {
            callCount++;
            if (callCount === 1) {
              (globalThis as any).chrome.runtime.lastError = {
                message: 'Could not establish connection. Receiving end does not exist.'
              };
              callback(null);
            } else {
              (globalThis as any).chrome.runtime.lastError = undefined;
              callback({
                success: true,
                data: createMockExtractionRecord('retry-conv-id')
              });
            }
          })
        },
        scripting: {
          executeScript: executeScriptMock
        }
      };

      const record = await sendExtractWithRecovery(77, { sleep: async () => {} });
      expect(executeScriptMock).toHaveBeenCalledWith({
        target: { tabId: 77 },
        files: ['content-scripts/content.js']
      });
      expect(record.metadata.conversationId).toBe('retry-conv-id');
      expect(callCount).toBe(2);
    });

    it('processOne executes complete extraction pipeline with mock dependencies', async () => {
      const mockRecord = createMockExtractionRecord('proc-1', 'gemini', 'Extracted Discussion');
      const mockBlob = new Blob(['mock-zip-bytes'], { type: 'application/zip' });

      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockResolvedValue(mockRecord),
        buildZip: vi.fn().mockResolvedValue(mockBlob),
        downloadZip: vi.fn().mockResolvedValue(101),
        db: testDb
      };

      const conv: ConversationRecord = {
        site: 'gemini',
        account_label: 'alice',
        conversation_id: 'proc-1',
        title: 'Extracted Discussion',
        url: 'https://gemini.google.com/app/proc-1',
        discovered_at: Date.now(),
        download_status: 'pending'
      };
      await testDb.upsertConversation(conv);

      const result = await processOne(12, conv, mockDeps);

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('proc-1');
      expect(result.zipName).toMatch(/^gemini_Extracted_Discussion_/);
      expect(result.messageCount).toBe(2);

      // Verify DB marked as downloaded
      const updated = await testDb.getConversation(conv);
      expect(updated?.download_status).toBe('done');
      expect(updated?.zip_name).toBe(result.zipName);
    });

    it('processOne traps errors, marks download error in DB, and returns failure object', async () => {
      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockRejectedValue(new Error('Tab crashed')),
        db: testDb
      };

      const conv: ConversationRecord = {
        site: 'claude',
        account_label: 'alice',
        conversation_id: 'c-err',
        title: 'Failing Chat',
        url: '',
        discovered_at: Date.now(),
        download_status: 'pending'
      };
      await testDb.upsertConversation(conv);

      const result = await processOne(15, conv, mockDeps);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Tab crashed');

      const updated = await testDb.getConversation(conv);
      expect(updated?.download_status).toBe('error');
      expect(updated?.last_error).toBe('Tab crashed');
    });
  });

  // =========================================================================
  // 8. TabWorker - Batch Crawler Loop (runBatch)
  // =========================================================================
  describe('8. TabWorker - runBatch Crawler Master Loop', () => {
    it('runs batch to completion across queued conversations', async () => {
      // Seed queue with 3 conversations
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'b-1',
        title: 'Batch 1'
      });
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'b-2',
        title: 'Batch 2'
      });
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'b-3',
        title: 'Batch 3'
      });

      const onProgress = vi.fn();
      const onItemComplete = vi.fn();

      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockImplementation((_tabId, _url, site) => {
          return Promise.resolve(createMockExtractionRecord('auto-id', site));
        }),
        buildZip: vi.fn().mockResolvedValue(new Blob(['zip'])),
        downloadZip: vi.fn().mockResolvedValue(1),
        sleep: vi.fn().mockResolvedValue(undefined),
        db: testDb
      };

      const summary = await runBatch(
        {
          tabId: 10,
          paceMs: 50,
          onProgress,
          onItemComplete
        },
        mockDeps
      );

      expect(summary.status).toBe('completed');
      expect(summary.totalQueued).toBe(3);
      expect(summary.doneCount).toBe(3);
      expect(summary.errorCount).toBe(0);
      expect(typeof summary.runId).toBe('number');

      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onItemComplete).toHaveBeenCalledTimes(3);

      // Verify all items transitioned to done in DB
      const stats = await testDb.statusCounts();
      expect(stats.done).toBe(3);
      expect(stats.pending).toBe(0);
    });

    it('respects maxItems ceiling', async () => {
      for (let i = 1; i <= 5; i++) {
        await testDb.enqueueExtraction({
          site: 'gemini',
          account_label: 'u',
          conversation_id: `limit-${i}`,
          title: `Limit ${i}`
        });
      }

      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockImplementation(() => Promise.resolve(createMockExtractionRecord('id'))),
        buildZip: vi.fn().mockResolvedValue(new Blob(['zip'])),
        downloadZip: vi.fn().mockResolvedValue(1),
        sleep: vi.fn().mockResolvedValue(undefined),
        db: testDb
      };

      const summary = await runBatch(
        {
          tabId: 10,
          maxItems: 2,
          paceMs: 10
        },
        mockDeps
      );

      expect(summary.doneCount).toBe(2);
      expect(summary.status).toBe('completed');

      const stats = await testDb.statusCounts();
      expect(stats.done).toBe(2);
      expect(stats.pending).toBe(3);
    });

    it('handles cancellation and records status as aborted', async () => {
      for (let i = 1; i <= 4; i++) {
        await testDb.enqueueExtraction({
          site: 'gemini',
          account_label: 'u',
          conversation_id: `cancel-${i}`,
          title: `Cancel ${i}`
        });
      }

      let cancelled = false;
      let counter = 0;

      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockImplementation(() => {
          counter++;
          if (counter >= 1) {
            cancelled = true;
          }
          return Promise.resolve(createMockExtractionRecord('id'));
        }),
        buildZip: vi.fn().mockResolvedValue(new Blob(['zip'])),
        downloadZip: vi.fn().mockResolvedValue(1),
        sleep: vi.fn().mockResolvedValue(undefined),
        db: testDb
      };

      const summary = await runBatch(
        {
          tabId: 10,
          isCancelled: () => cancelled,
          paceMs: 10
        },
        mockDeps
      );

      expect(summary.status).toBe('aborted');
      expect(summary.doneCount).toBe(1);

      const runs = await testDb.listRuns();
      expect(runs[runs.length - 1]?.status).toBe('aborted');
    });

    it('handles pause and resumes when unpaused', async () => {
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'pause-1'
      });
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'pause-2'
      });

      let paused = true;
      let sleepCalls = 0;

      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockImplementation(() => Promise.resolve(createMockExtractionRecord('id'))),
        buildZip: vi.fn().mockResolvedValue(new Blob(['zip'])),
        downloadZip: vi.fn().mockResolvedValue(1),
        sleep: vi.fn().mockImplementation(async () => {
          sleepCalls++;
          if (sleepCalls >= 2) {
            paused = false; // Unpause after 2 sleep cycles
          }
        }),
        db: testDb
      };

      const summary = await runBatch(
        {
          tabId: 10,
          isPaused: () => paused,
          paceMs: 5
        },
        mockDeps
      );

      expect(summary.status).toBe('completed');
      expect(summary.doneCount).toBe(2);
      expect(sleepCalls).toBeGreaterThanOrEqual(2);
    });

    it('invokes onError callback when a single conversation fails', async () => {
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'u',
        conversation_id: 'err-test'
      });

      const onError = vi.fn();
      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockRejectedValue(new Error('Scraper error')),
        sleep: vi.fn().mockResolvedValue(undefined),
        db: testDb
      };

      const summary = await runBatch(
        {
          tabId: 10,
          onError
        },
        mockDeps
      );

      expect(summary.errorCount).toBe(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ conversation_id: 'err-test' }),
        expect.any(Error)
      );
    });
  });

  // =========================================================================
  // 9. HarvestOrchestrator Facade
  // =========================================================================
  describe('9. HarvestOrchestrator Facade', () => {
    let orchestrator: HarvestOrchestrator;

    beforeEach(() => {
      orchestrator = new HarvestOrchestrator(testDb);
    });

    it('extractActiveTab runs complete tab extraction, packaging, and download', async () => {
      const mockRecord = createMockExtractionRecord('tab-active-1', 'gemini', 'Active Tab Chat');
      const mockBlob = new Blob(['zip-data'], { type: 'application/zip' });

      const customDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockResolvedValue(mockRecord),
        buildZip: vi.fn().mockResolvedValue(mockBlob),
        downloadZip: vi.fn().mockResolvedValue(999),
        db: testDb
      };

      const result = await orchestrator.extractActiveTab({
        tabId: 105,
        download: true,
        customDeps
      });

      expect(result.success).toBe(true);
      expect(result.record?.metadata.conversationId).toBe('tab-active-1');
      expect(result.downloadId).toBe(999);
      expect(result.zipFilename).toMatch(/^gemini_Active_Tab_Chat_/);

      // Verify DB state
      const conv = await testDb.getConversation({
        site: 'gemini',
        account_label: 'test-user',
        conversation_id: 'tab-active-1'
      });
      expect(conv?.download_status).toBe('done');
      expect(conv?.zip_name).toBe(result.zipFilename);
    });

    it('extractActiveTab traps failure and returns error object', async () => {
      const customDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockRejectedValue(new Error('Content script timeout'))
      };

      const result = await orchestrator.extractActiveTab({
        tabId: 105,
        customDeps
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content script timeout');
    });

    it('startBatchHarvest provides pause, resume, cancel handle and resolves summary', async () => {
      const mockDeps: Partial<TabWorkerDeps> = {
        navigateAndExtract: vi.fn().mockImplementation(() => Promise.resolve(createMockExtractionRecord('orch-id'))),
        buildZip: vi.fn().mockResolvedValue(new Blob(['zip'])),
        downloadZip: vi.fn().mockResolvedValue(1),
        sleep: vi.fn().mockResolvedValue(undefined),
        db: testDb
      };

      const handle = orchestrator.startBatchHarvest({
        site: 'gemini',
        accountLabel: 'orch-user',
        conversations: [
          { conversationId: 'o-1', title: 'Orch 1' },
          { conversationId: 'o-2', title: 'Orch 2' }
        ],
        paceMs: 5,
        customDeps: mockDeps
      });

      expect(handle.isPaused()).toBe(false);
      expect(handle.isCancelled()).toBe(false);

      handle.pause();
      expect(handle.isPaused()).toBe(true);

      handle.resume();
      expect(handle.isPaused()).toBe(false);

      const summary = await handle.promise;
      expect(summary.status).toBe('completed');
      expect(summary.totalQueued).toBe(2);
      expect(summary.doneCount).toBe(2);

      const stats = await orchestrator.getStats();
      expect(stats.done).toBe(2);
    });
  });

  // =========================================================================
  // 10. Adversarial Stress Tests & Edge Case Hardening
  // =========================================================================
  describe('10. Adversarial Stress Tests & Edge Case Hardening', () => {
    it('guarantees atomic commit on dequeueNext so immediate read sees in_progress', async () => {
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'user-atomic',
        conversation_id: 'conv-atomic-1',
        title: 'Atomic Conversation'
      });

      // Immediately after dequeueNext resolves, getConversation must already reflect in_progress
      const claimed = await testDb.dequeueNext();
      expect(claimed).not.toBeNull();
      expect(claimed?.conversation_id).toBe('conv-atomic-1');

      const conv = await testDb.getConversation(claimed!);
      expect(conv?.download_status).toBe('in_progress');
    });

    it('handles concurrent dequeueNext calls without race collisions or duplicate claims', async () => {
      for (let i = 1; i <= 4; i++) {
        await testDb.enqueueExtraction({
          site: 'gemini',
          account_label: 'concurrent-user',
          conversation_id: `concurrent-${i}`,
          title: `Concurrent ${i}`
        });
      }

      // Fire 4 dequeueNext calls concurrently
      const claims = await Promise.all([
        testDb.dequeueNext(),
        testDb.dequeueNext(),
        testDb.dequeueNext(),
        testDb.dequeueNext()
      ]);

      const claimedIds = claims.map(c => c?.conversation_id).filter(Boolean);
      expect(claimedIds.length).toBe(4);

      // Verify every claimed item is distinct (no duplicates)
      const uniqueIds = new Set(claimedIds);
      expect(uniqueIds.size).toBe(4);

      // 5th dequeue must return null
      const extraClaim = await testDb.dequeueNext();
      expect(extraClaim).toBeNull();
    });

    it('preserves last_error, content_extracted_at, and url during idempotent upsert', async () => {
      const initial: ConversationRecord = {
        site: 'claude',
        account_label: 'err-test-acc',
        conversation_id: 'conv-err-preserve',
        title: 'Original Title',
        url: 'https://claude.ai/chat/conv-err-preserve',
        discovered_at: 1000,
        content_extracted_at: 2000,
        download_status: 'error',
        last_error: 'HTTP 429 Too Many Requests',
        attempts: 3
      };
      await testDb.upsertConversation(initial);

      // Re-scan without url, last_error, or content_extracted_at
      const rescan: ConversationRecord = {
        site: 'claude',
        account_label: 'err-test-acc',
        conversation_id: 'conv-err-preserve',
        title: 'Title Changed on Web',
        url: '',
        discovered_at: 5000,
        download_status: 'pending'
      };

      const updated = await testDb.upsertConversation(rescan);
      expect(updated.title).toBe('Title Changed on Web');
      expect(updated.download_status).toBe('error');
      expect(updated.last_error).toBe('HTTP 429 Too Many Requests');
      expect(updated.content_extracted_at).toBe(2000);
      expect(updated.url).toBe('https://claude.ai/chat/conv-err-preserve');
      expect(updated.attempts).toBe(3);
    });

    it('fast-counts queue items via queueCount method and standalone helper', async () => {
      expect(await testDb.queueCount()).toBe(0);

      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'q-counter',
        conversation_id: 'qc-1'
      });
      await testDb.enqueueExtraction({
        site: 'gemini',
        account_label: 'q-counter',
        conversation_id: 'qc-2'
      });

      expect(await testDb.queueCount()).toBe(2);
      expect(await testDb.queueCount('pending')).toBe(2);
      expect(await testDb.queueCount('in_progress')).toBe(0);

      // Dequeue 1
      await testDb.dequeueNext();
      expect(await testDb.queueCount('pending')).toBe(1);
      expect(await testDb.queueCount('in_progress')).toBe(1);
      expect(await testDb.queueCount()).toBe(2);
    });

    it('waitForTabComplete rejects immediately when tab is closed via chrome.tabs.onRemoved', async () => {
      let removedListener: ((tabId: number) => void) | null = null;
      let updatedListener: ((tabId: number, info: any) => void) | null = null;

      (globalThis as any).chrome = {
        tabs: {
          onUpdated: {
            addListener: vi.fn((fn: any) => {
              updatedListener = fn;
            }),
            removeListener: vi.fn()
          },
          onRemoved: {
            addListener: vi.fn((fn: any) => {
              removedListener = fn;
            }),
            removeListener: vi.fn()
          }
        }
      };

      const waitPromise = waitForTabComplete(88, 30000);
      expect(removedListener).not.toBeNull();

      // Trigger removal of tab 88
      removedListener!(88);

      await expect(waitPromise).rejects.toThrow(/Tab 88 was closed before navigation completed/);
    });

    it('sendExtractWithRecovery targets content-scripts/gemini.js for Gemini and content.js for Claude', async () => {
      const executeScriptMock = vi.fn().mockResolvedValue([]);

      (globalThis as any).chrome = {
        runtime: { lastError: undefined },
        tabs: {
          sendMessage: vi.fn((tabId: number, msg: any, callback: Function) => {
            (globalThis as any).chrome.runtime.lastError = {
              message: 'Could not establish connection. Receiving end does not exist.'
            };
            callback(null);
          })
        },
        scripting: {
          executeScript: executeScriptMock
        }
      };

      // 1. Gemini target
      await expect(
        sendExtractWithRecovery(50, { sleep: async () => {}, site: 'gemini' })
      ).rejects.toThrow();

      expect(executeScriptMock).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 50 },
          files: ['content-scripts/gemini.js']
        })
      );

      // 2. Claude target
      executeScriptMock.mockClear();
      await expect(
        sendExtractWithRecovery(60, { sleep: async () => {}, site: 'claude' })
      ).rejects.toThrow();

      expect(executeScriptMock).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 60 },
          files: ['content-scripts/content.js']
        })
      );
    });

    it('QueueManager.seedQueue deduplicates entries within the same input batch and sets canonical URLs', async () => {
      const qm = new QueueManager(testDb);
      const duplicateList = [
        { conversationId: 'batch-dup-1', title: 'Batch Dup' },
        { conversationId: 'batch-dup-1', title: 'Batch Dup (Duplicate)' },
        { conversationId: 'batch-unique-2', title: 'Unique' }
      ];

      const res = await qm.seedQueue(duplicateList, 'gemini', 'dup-tester');
      expect(res.enumerated).toBe(3);
      expect(res.queued).toBe(2);
      expect(res.skipped).toBe(0);

      // Check URL was defaulted to canonical platform format
      const conv = await testDb.getConversation({
        site: 'gemini',
        account_label: 'dup-tester',
        conversation_id: 'batch-unique-2'
      });
      expect(conv?.url).toBe('https://gemini.google.com/app/batch-unique-2');
    });

    it('tolerates camelCase keys (conversationId, accountLabel) seamlessly across all DB methods', async () => {
      const meta = {
        site: 'gemini' as HarvestPlatform,
        accountLabel: 'camel-user',
        conversationId: 'camel-id-123'
      };

      expect(testDb.convKey(meta)).toEqual(['gemini', 'camel-user', 'camel-id-123']);
      expect(testDb.flatKey(meta)).toBe('gemini::camel-user::camel-id-123');

      // Enqueue using camelCase
      const q = await testDb.enqueueExtraction({
        site: 'gemini',
        accountLabel: 'camel-user',
        conversationId: 'camel-id-123',
        title: 'Camel Case Chat'
      });
      expect(q.flat_key).toBe('gemini::camel-user::camel-id-123');

      // Get using camelCase
      const conv = await testDb.getConversation(meta);
      expect(conv?.title).toBe('Camel Case Chat');

      // Mark error using camelCase
      await testDb.markDownloadError(meta, 'Temporary error');
      const errored = await testDb.getConversation(meta);
      expect(errored?.download_status).toBe('error');

      // Mark downloaded using camelCase
      await testDb.markDownloaded(meta, { zip_name: 'camel.zip' });
      const done = await testDb.getConversation(meta);
      expect(done?.download_status).toBe('done');
      expect(done?.zip_name).toBe('camel.zip');
    });

    it('buildPlatformConversationUrl preserves full HTTP/HTTPS URLs without duplication', () => {
      const fullUrl = 'https://chatgpt.com/c/custom-session-uuid';
      expect(buildPlatformConversationUrl('chatgpt', fullUrl)).toBe(fullUrl);

      const standardId = 'custom-session-uuid';
      expect(buildPlatformConversationUrl('chatgpt', standardId)).toBe('https://chatgpt.com/c/custom-session-uuid');
    });
  });
});
