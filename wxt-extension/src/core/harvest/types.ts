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
  type: 'image';
  originalSrc: string;
  filename?: string;
  blob?: Blob;
  dataUrl?: string;
  turnIndex: number;
  error?: string;
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
  partialSuccess?: boolean;
  warnings?: string[];
  scrollAttempts?: number;
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
  last_error?: string;
  attempts?: number;
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
