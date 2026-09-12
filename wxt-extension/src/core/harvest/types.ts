/**
 * Core type definitions for the Harvester Subsystem (Archival & Export).
 * Clean-room TypeScript porting aligned with Clio module inventory & WXT modular architecture.
 */

export type HarvestPlatform =
  | 'gemini'
  | 'claude'
  | 'chatgpt'
  | 'deepseek'
  | 'grok'
  | 'meta';

export interface HarvestAttachment {
  type: 'image' | 'file' | 'artifact';
  originalSrc?: string;
  url?: string;
  name?: string | null;
  label?: string;
  kind?: string | null;
  downloadable?: boolean;
  filename?: string | null;
  blob?: Blob;
  dataUrl?: string;
  turnIndex?: number;
  error?: string;
}

export interface HarvestOrderInfo {
  orderedBy: string;
  capturedMessages: number;
  withOrderKey: number;
  withoutOrderKey: number;
  neverMeasuredOnSettledDom: number;
}

export interface HarvestTurn {
  id: string;
  turnIndex: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  rawText?: string;
  thinking?: string | null;
  modelSlug?: string;
  attachments?: HarvestAttachment[];
  timestamp: number;
  type?: 'thinking-only' | string;
}

export interface HarvestConversationMetadata {
  site: HarvestPlatform;
  accountLabel: string;
  conversationId: string;
  title: string;
  url: string;
  extractedAt: string;
  messageCount: number;
  imageCount: number;
  fileCount?: number;
  partialSuccess?: boolean;
  warnings?: string[];
  scrollAttempts?: number;
  orderInfo?: HarvestOrderInfo;
}

export interface HarvestConversationRecord {
  metadata: HarvestConversationMetadata;
  messages: HarvestTurn[];
  images?: HarvestAttachment[];
}

export type DownloadStatus = 'pending' | 'in_progress' | 'done' | 'error';

export interface ConversationLedgerRow {
  site: HarvestPlatform;
  account_label: string;
  conversation_id: string;
  title: string;
  url: string;
  discovered_at: number;
  content_extracted_at?: number;
  download_status: DownloadStatus;
  zip_name?: string;
  downloaded_at?: number;
  last_error?: string;
  attempts?: number;
  messages?: HarvestTurn[];
  metadata?: HarvestConversationMetadata;
}

export type ConversationRecord = ConversationLedgerRow;

export interface AccountRecord {
  account_label: string;
  site?: HarvestPlatform | string;
  discovered_at?: number;
  last_harvest_at?: number;
  metadata?: Record<string, unknown>;
}

export interface QueueRecord {
  flat_key: string;
  site: HarvestPlatform;
  account_label: string;
  conversation_id: string;
  title?: string;
  url?: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
  attempts: number;
  queued_at: number;
  started_at?: number;
  completed_at?: number;
  last_error?: string;
}

export interface DiscoveredConversation {
  site: HarvestPlatform;
  conversationId: string;
  url: string;
  title: string;
}

export interface HarvestRunRecord {
  run_id?: number;
  started_at: number;
  completed_at?: number;
  total_queued: number;
  done_count: number;
  error_count: number;
  status: 'running' | 'completed' | 'aborted';
}

export interface ProcessResult {
  success: boolean;
  conversationId: string;
  site?: HarvestPlatform;
  zipName?: string;
  messageCount?: number;
  error?: string;
}

export interface BatchProgress {
  total: number;
  processed: number;
  done: number;
  failed: number;
  currentItem?: QueueRecord;
}

export interface BatchSummary {
  runId?: number;
  totalQueued: number;
  doneCount: number;
  errorCount: number;
  startedAt: number;
  completedAt: number;
  status: 'completed' | 'aborted';
}

export interface HarvestStatusCounts {
  total: number;
  pending: number;
  done: number;
  error: number;
  in_progress: number;
}

