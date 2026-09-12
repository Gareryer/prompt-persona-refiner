/**
 * Tab Worker and Batch Processing Engine for Harvester.
 * Clean-room TypeScript port of Clio's archive.js.
 *
 * Responsibilities:
 * - Worker tab navigation with timeout handling (waitForTabComplete)
 * - Script re-injection and connection recovery for dropped MV3 content scripts
 * - Single-conversation execution pipeline (processOne)
 * - Paced, pausable, cancellable batch processing loop (runBatch)
 * - Injected dependency bag (DEFAULT_DEPS) for complete test isolation
 */

import type {
  HarvestPlatform,
  HarvestConversationRecord,
  QueueRecord,
  ConversationRecord,
  ProcessResult,
  BatchProgress,
  BatchSummary,
  HarvestRunRecord
} from '../types';
import { ZipBuilder } from '../packaging/zip-builder';
import { HarvestDB, defaultHarvestDb } from '../storage/harvest-db';

export interface TabWorkerDeps {
  navigateAndExtract: (tabId: number, url: string, site: HarvestPlatform) => Promise<HarvestConversationRecord>;
  buildZip: (record: HarvestConversationRecord) => Promise<Blob>;
  downloadZip: (blob: Blob, filename: string) => Promise<number | string>;
  db: HarvestDB;
  sleep: (ms: number) => Promise<void>;
}

export interface BatchControlOptions {
  tabId?: number;
  site?: HarvestPlatform;
  accountLabel?: string;
  paceMs?: number;
  maxItems?: number;
  isPaused?: () => boolean;
  isCancelled?: () => boolean;
  onProgress?: (progress: BatchProgress) => void;
  onItemComplete?: (item: QueueRecord, result: ProcessResult) => void;
  onError?: (item: QueueRecord, error: Error) => void;
}

/**
 * Mapping of harvest platforms to their dedicated modular content script bundles.
 */
export const PLATFORM_SCRIPT_BUNDLES: Record<HarvestPlatform, string> = {
  gemini: 'content-scripts/gemini.js',
  chatgpt: 'content-scripts/chatgpt.js',
  claude: 'content-scripts/claude.js',
  deepseek: 'content-scripts/content.js',
  grok: 'content-scripts/content.js',
  meta: 'content-scripts/content.js'
};

export const FALLBACK_SCRIPT_BUNDLE = 'content-scripts/content.js';

/**
 * Builds canonical URL for a conversation if explicit URL was not provided.
 */
export function buildPlatformConversationUrl(site: HarvestPlatform, conversationId: string): string {
  if (conversationId.startsWith('http://') || conversationId.startsWith('https://')) {
    return conversationId;
  }
  switch (site) {
    case 'gemini':
      return `https://gemini.google.com/app/${conversationId}`;
    case 'claude':
      return `https://claude.ai/chat/${conversationId}`;
    case 'chatgpt':
      return `https://chatgpt.com/c/${conversationId}`;
    case 'deepseek':
      return `https://chat.deepseek.com/a/chat/s/${conversationId}`;
    case 'grok':
      return `https://x.com/i/grok?conversation=${conversationId}`;
    case 'meta':
      return `https://www.meta.ai/c/${conversationId}`;
    default:
      return `https://${site}.com/chat/${conversationId}`;
  }
}

/**
 * Listens for chrome.tabs.onUpdated until tab navigation completes or times out.
 * Rejects immediately if the tab is closed via chrome.tabs.onRemoved.
 */
export async function waitForTabComplete(tabId: number, timeoutMs = 45000): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome?.tabs?.onUpdated) {
    return;
  }

  return new Promise<void>((resolve, reject) => {
    let timer: any = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      try {
        chrome.tabs.onUpdated.removeListener(updatedListener);
      } catch {
        // Ignore removal error
      }
      if (chrome?.tabs?.onRemoved) {
        try {
          chrome.tabs.onRemoved.removeListener(removedListener);
        } catch {
          // Ignore removal error
        }
      }
    };

    const updatedListener = (id: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (id === tabId && changeInfo.status === 'complete') {
        cleanup();
        resolve();
      }
    };

    const removedListener = (closedTabId: number) => {
      if (closedTabId === tabId) {
        cleanup();
        reject(new Error(`Tab ${tabId} was closed before navigation completed`));
      }
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for tab ${tabId} navigation after ${timeoutMs}ms`));
    }, timeoutMs);

    chrome.tabs.onUpdated.addListener(updatedListener);
    if (chrome?.tabs?.onRemoved) {
      chrome.tabs.onRemoved.addListener(removedListener);
    }
  });
}

/**
 * Sends extraction message to tab with automatic script re-injection recovery.
 */
export async function sendExtractWithRecovery(
  tabId: number,
  deps?: { sleep?: (ms: number) => Promise<void>; site?: HarvestPlatform }
): Promise<HarvestConversationRecord> {
  const sleepFn = deps?.sleep || ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)));

  const sendMessage = (action: string) => {
    return new Promise<any>((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome?.tabs?.sendMessage) {
        reject(new Error('chrome.tabs.sendMessage is not available'));
        return;
      }
      chrome.tabs.sendMessage(tabId, { action, type: action }, response => {
        const err = chrome.runtime?.lastError;
        if (err) {
          reject(new Error(err.message || 'Port error'));
        } else {
          resolve(response);
        }
      });
    });
  };

  try {
    const res = await sendMessage('HARVEST_EXTRACT');
    if (res?.success && res.data) return res.data;
    if (res?.metadata && res?.messages) return res;
    throw new Error(res?.error || 'Extraction failed in content script');
  } catch (err: any) {
    const msg = err?.message || '';
    const isDisconnected =
      msg.includes('Receiving end does not exist') ||
      msg.includes('Could not establish connection');

    if (isDisconnected && typeof chrome !== 'undefined' && chrome?.scripting?.executeScript) {
      let site = deps?.site;
      if (!site && chrome?.tabs?.get && tabId > 0) {
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab?.url) {
            if (tab.url.includes('gemini.google.com')) site = 'gemini';
            else if (tab.url.includes('chatgpt.com')) site = 'chatgpt';
            else if (tab.url.includes('claude.ai')) site = 'claude';
            else if (tab.url.includes('deepseek.com')) site = 'deepseek';
            else if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) site = 'grok';
            else if (tab.url.includes('meta.ai')) site = 'meta';
          }
        } catch {
          // Ignore tab lookup failure
        }
      }
      const primaryScript = (site && site in PLATFORM_SCRIPT_BUNDLES)
        ? PLATFORM_SCRIPT_BUNDLES[site as HarvestPlatform]
        : FALLBACK_SCRIPT_BUNDLE;
      const fallbackScript = FALLBACK_SCRIPT_BUNDLE;

      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [primaryScript]
        });
      } catch {
        if (primaryScript !== fallbackScript) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId },
              files: [fallbackScript]
            });
          } catch {
            // If fallback injection fails, continue to retry attempt
          }
        }
      }

      await sleepFn(800);
      const retryRes = await sendMessage('HARVEST_EXTRACT');
      if (retryRes?.success && retryRes.data) return retryRes.data;
      if (retryRes?.metadata && retryRes?.messages) return retryRes;
      throw new Error(retryRes?.error || 'Extraction failed after content script re-injection');
    }

    throw err;
  }
}

/**
 * Default tab navigator and content extractor for extension runtime.
 */
export async function defaultNavigateAndExtract(
  tabId: number,
  url: string,
  site: HarvestPlatform
): Promise<HarvestConversationRecord> {
  if (typeof chrome !== 'undefined' && chrome?.tabs?.update) {
    if (url) {
      await chrome.tabs.update(tabId, { url });
      await waitForTabComplete(tabId);
      await new Promise(r => setTimeout(r, 1000));
    }
    return sendExtractWithRecovery(tabId, { site });
  }
  throw new Error('Chrome extension tabs API is not available');
}

/** Default dependencies for live extension execution */
export const DEFAULT_DEPS: TabWorkerDeps = {
  navigateAndExtract: defaultNavigateAndExtract,
  buildZip: record => ZipBuilder.buildZip(record),
  downloadZip: (blob, filename) => ZipBuilder.downloadZip(blob, filename),
  db: defaultHarvestDb,
  sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
};

/**
 * Executes the complete extraction, ZIP build, download, and ledger recording
 * for a single conversation.
 */
export async function processOne(
  tabId: number,
  conv: QueueRecord | ConversationRecord | { site?: HarvestPlatform; account_label?: string; accountLabel?: string; conversation_id?: string; conversationId?: string; url?: string },
  deps: Partial<TabWorkerDeps> = {}
): Promise<ProcessResult> {
  const mergedDeps: TabWorkerDeps = { ...DEFAULT_DEPS, ...deps };
  const site = conv.site || 'gemini';
  const account_label = (conv as any).account_label ?? (conv as any).accountLabel ?? 'default';
  const conversation_id = (conv as any).conversation_id ?? (conv as any).conversationId ?? '';
  const convKey = { site, account_label, conversation_id };

  try {
    const targetUrl = conv.url || buildPlatformConversationUrl(site, conversation_id);
    const record = await mergedDeps.navigateAndExtract(tabId, targetUrl, site);

    const filename = ZipBuilder.generateZipFilename(record.metadata);
    const blob = await mergedDeps.buildZip(record);
    await mergedDeps.downloadZip(blob, filename);

    await mergedDeps.db.markDownloaded(convKey, { zip_name: filename });

    return {
      success: true,
      conversationId: conversation_id,
      site,
      zipName: filename,
      messageCount: record.messages?.length ?? 0
    };
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await mergedDeps.db.markDownloadError(convKey, err);

    return {
      success: false,
      conversationId: conversation_id,
      site,
      error: errorMsg
    };
  }
}

/**
 * Runs the batch crawler loop across queued conversations.
 * Supports pausing, cancellation, configurable pacing delay, and callbacks.
 */
export async function runBatch(
  control: BatchControlOptions = {},
  deps: Partial<TabWorkerDeps> = {}
): Promise<BatchSummary> {
  const mergedDeps: TabWorkerDeps = { ...DEFAULT_DEPS, ...deps };
  const tabId = control.tabId ?? 0;
  const paceMs = control.paceMs ?? 1500;
  const startedAt = Date.now();

  let doneCount = 0;
  let errorCount = 0;
  let processedCount = 0;
  let isAborted = false;

  let totalQueued = 0;
  if (!control.site && !control.accountLabel && typeof (mergedDeps.db as any).queueCount === 'function') {
    const pendingQ = await (mergedDeps.db as any).queueCount('pending');
    const inProgQ = await (mergedDeps.db as any).queueCount('in_progress');
    totalQueued = pendingQ + inProgQ;
  } else {
    const initialStats = await mergedDeps.db.statusCounts({
      site: control.site,
      account_label: control.accountLabel
    });
    totalQueued = initialStats.pending + initialStats.in_progress;
  }

  if (control.maxItems && control.maxItems > 0) {
    totalQueued = Math.min(totalQueued, control.maxItems);
  }

  while (true) {
    // 1. Check cancellation
    if (control.isCancelled?.()) {
      isAborted = true;
      break;
    }

    // 2. Check pause
    while (control.isPaused?.()) {
      if (control.isCancelled?.()) {
        isAborted = true;
        break;
      }
      await mergedDeps.sleep(200);
    }
    if (isAborted) break;

    // 3. Dequeue next item
    const item = await mergedDeps.db.dequeueNext();
    if (!item) {
      break; // Queue is empty
    }

    // Report progress
    control.onProgress?.({
      total: totalQueued,
      processed: processedCount,
      done: doneCount,
      failed: errorCount,
      currentItem: item
    });

    // 4. Process item
    try {
      const result = await processOne(tabId, item, mergedDeps);
      processedCount++;
      if (result.success) {
        doneCount++;
      } else {
        errorCount++;
        control.onError?.(item, new Error(result.error || 'Download failed'));
      }
      control.onItemComplete?.(item, result);
    } catch (err: any) {
      processedCount++;
      errorCount++;
      control.onError?.(item, err instanceof Error ? err : new Error(String(err)));
    }

    // 5. Check item ceiling
    if (control.maxItems && processedCount >= control.maxItems) {
      break;
    }

    // 6. Pacing delay
    if (paceMs > 0 && !control.isCancelled?.()) {
      await mergedDeps.sleep(paceMs);
    }
  }

  const completedAt = Date.now();
  const status = isAborted ? 'aborted' : 'completed';

  const runSummary: HarvestRunRecord = {
    started_at: startedAt,
    completed_at: completedAt,
    total_queued: totalQueued,
    done_count: doneCount,
    error_count: errorCount,
    status
  };

  const runId = await mergedDeps.db.recordRun(runSummary);

  return {
    runId,
    totalQueued,
    doneCount,
    errorCount,
    startedAt,
    completedAt,
    status
  };
}
