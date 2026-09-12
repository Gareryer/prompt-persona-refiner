/**
 * Unified ZIP Packaging and Export Subsystem for Harvester.
 * Clean-room TypeScript port of Clio's ZIP builder and downloader.
 *
 * Responsibilities:
 * - Bundles structured conversation.json and images/ asset directory into a single archive
 * - Strips in-memory binary Blobs from serialized JSON to guarantee pure data representation
 * - Supports both Blob attachments and base64 Data URLs
 * - Calculates uncompressed export size estimation (estimateExportSize)
 * - Formats byte counts into human-readable strings (formatBytes)
 * - Safely orchestrates chrome.downloads.download with object URL lifecycle management and DOM fallback
 */

import JSZip from 'jszip';
import type {
  HarvestConversationRecord,
  HarvestConversationMetadata,
  HarvestAttachment,
  HarvestTurn
} from '../types';
import { TextSanitizer } from '../extraction/text-sanitizer';
import { MediaExtractor } from '../extraction/media-extractor';

export interface ZipBuilderOptions {
  /** Optional array of image attachments to include if not already attached to turns */
  images?: HarvestAttachment[];
  /** Deflate compression level between 1 (fastest) and 9 (maximum compression). Default: 6 */
  compressionLevel?: number;
  /** Extra auxiliary files to include in the zip archive (e.g. metadata or readme) */
  extraFiles?: Record<string, string | Blob | Uint8Array | ArrayBuffer>;
}

export interface DownloadZipOptions {
  /** Whether to prompt the user with a save-as file dialog. Default: false */
  saveAs?: boolean;
  /** Delay in ms before revoking the created object URL. Default: 30000 */
  revokeDelayMs?: number;
}

export class ZipBuilder {
  /**
   * Sanitizes a HarvestConversationRecord for JSON serialization by stripping binary Blob references.
   */
  static sanitizeRecordForJson(record: HarvestConversationRecord): Record<string, unknown> {
    const sanitizeAttachment = (att: HarvestAttachment) => {
      const { blob: _blob, dataUrl: _dataUrl, ...rest } = att;
      return rest;
    };

    const sanitizedMessages = record.messages.map((turn: HarvestTurn) => {
      if (!turn.attachments || !Array.isArray(turn.attachments)) {
        return turn;
      }
      return {
        ...turn,
        attachments: turn.attachments.map(sanitizeAttachment)
      };
    });

    const sanitizedImages = record.images?.map(sanitizeAttachment);

    return {
      metadata: record.metadata,
      messages: sanitizedMessages,
      ...(sanitizedImages ? { images: sanitizedImages } : {})
    };
  }

  /**
   * Builds a JSZip archive from a conversation record and image attachments.
   */
  static async buildZip(
    record: HarvestConversationRecord,
    options?: ZipBuilderOptions
  ): Promise<Blob> {
    const zip = new JSZip();

    // 1. Serialize sanitized conversation.json
    const cleanRecord = this.sanitizeRecordForJson(record);
    const jsonString = JSON.stringify(cleanRecord, null, 2);
    zip.file('conversation.json', jsonString);

    // 2. Gather all image attachments
    const imageMap = new Map<string, { blob?: Blob; dataUrl?: string; originalSrc?: string }>();
    const seenAttachments = new Set<HarvestAttachment>();

    const registerImage = (att: HarvestAttachment, fallbackIndex: number) => {
      if (seenAttachments.has(att)) return;
      seenAttachments.add(att);

      const isValidBlob =
        att.blob instanceof Blob ||
        (att.blob && typeof (att.blob as any).arrayBuffer === 'function');
      const hasDataUrl = typeof att.dataUrl === 'string' && att.dataUrl.length > 0;
      const hasSrc = typeof att.originalSrc === 'string' && att.originalSrc.length > 0;

      if (!isValidBlob && !hasDataUrl && !hasSrc) return;

      let filename = att.filename;
      if (!filename) {
        const ext = MediaExtractor.getImageExtension(
          isValidBlob ? att.blob?.type : undefined,
          att.originalSrc || (hasDataUrl ? att.dataUrl : undefined)
        );
        filename = MediaExtractor.formatImagePath(fallbackIndex, ext);
      }

      // Normalize path to have images/ prefix if not already present
      const normalizedPath = filename.startsWith('images/') ? filename : `images/${filename}`;

      if (!imageMap.has(normalizedPath)) {
        imageMap.set(normalizedPath, {
          blob: isValidBlob ? att.blob : undefined,
          dataUrl: hasDataUrl ? att.dataUrl : undefined,
          originalSrc: att.originalSrc
        });
      }
    };

    let counter = 0;

    // A. From record.images
    if (record.images && Array.isArray(record.images)) {
      for (const img of record.images) {
        registerImage(img, counter++);
      }
    }

    // B. From record.messages[].attachments
    if (record.messages && Array.isArray(record.messages)) {
      for (const turn of record.messages) {
        if (turn.attachments && Array.isArray(turn.attachments)) {
          for (const att of turn.attachments) {
            if (att.type === 'image') {
              registerImage(att, counter++);
            }
          }
        }
      }
    }

    // C. From options.images
    if (options?.images && Array.isArray(options.images)) {
      for (const img of options.images) {
        registerImage(img, counter++);
      }
    }

    // 3. Add images to zip (convert Blob to ArrayBuffer for MV3 ServiceWorker & Node compatibility)
    for (const [path, img] of imageMap.entries()) {
      try {
        if (img.blob && (img.blob instanceof Blob || typeof (img.blob as any).arrayBuffer === 'function')) {
          const arrayBuf = await (img.blob as any).arrayBuffer();
          zip.file(path, arrayBuf);
        } else if (img.dataUrl) {
          try {
            const blob = MediaExtractor.dataUrlToBlob(img.dataUrl);
            const arrayBuf = await blob.arrayBuffer();
            zip.file(path, arrayBuf);
          } catch {
            const commaIdx = img.dataUrl.indexOf(',');
            const raw = commaIdx >= 0 ? img.dataUrl.slice(commaIdx + 1) : img.dataUrl;
            if (img.dataUrl.includes(';base64')) {
              zip.file(path, raw.replace(/\s+/g, ''), { base64: true });
            } else {
              zip.file(path, raw);
            }
          }
        } else if (img.originalSrc && (img.originalSrc.startsWith('http://') || img.originalSrc.startsWith('https://'))) {
          try {
            const resp = await fetch(img.originalSrc);
            if (resp.ok) {
              const arrayBuf = await resp.arrayBuffer();
              zip.file(path, arrayBuf);
            }
          } catch {
            // Fail-open: single image fetch failure should not abort archive
          }
        }
      } catch (imgError) {
        console.warn(`[ZipBuilder] Failed to bundle image '${path}' (fail-open):`, imgError);
      }
    }

    // 4. Add extra auxiliary files
    if (options?.extraFiles) {
      for (const [filePath, content] of Object.entries(options.extraFiles)) {
        if (content instanceof Blob && typeof content.arrayBuffer === 'function') {
          const buf = await content.arrayBuffer();
          zip.file(filePath, buf);
        } else {
          zip.file(filePath, content);
        }
      }
    }

    // 5. Generate final compressed ZIP Blob
    const compressionLevel = Math.min(Math.max(options?.compressionLevel ?? 6, 1), 9);
    const blob = await zip.generateAsync({
      type: 'blob',
      mimeType: 'application/zip',
      compression: 'DEFLATE',
      compressionOptions: {
        level: compressionLevel
      }
    });

    return blob;
  }

  /**
   * Alias for buildZip to match Clio's naming convention.
   */
  static async createZip(
    record: HarvestConversationRecord,
    options?: ZipBuilderOptions
  ): Promise<Blob> {
    return this.buildZip(record, options);
  }

  /**
   * Calculates total uncompressed byte size of all record assets and attachments.
   */
  static estimateExportSize(
    record: HarvestConversationRecord,
    options?: { images?: HarvestAttachment[]; extraFiles?: Record<string, string | Blob | Uint8Array | ArrayBuffer> }
  ): number {
    const cleanRecord = this.sanitizeRecordForJson(record);
    const jsonString = JSON.stringify(cleanRecord, null, 2);

    let totalBytes = 0;
    if (typeof TextEncoder !== 'undefined') {
      totalBytes += new TextEncoder().encode(jsonString).length;
    } else {
      totalBytes += jsonString.length;
    }

    const seenAttachments = new Set<HarvestAttachment>();
    const countedPaths = new Set<string>();

    const inspectAttachment = (att: HarvestAttachment, fallbackIndex: number) => {
      if (seenAttachments.has(att)) return;
      seenAttachments.add(att);

      const filename = att.filename || `images/${String(fallbackIndex + 1).padStart(3, '0')}.png`;
      if (countedPaths.has(filename)) return;
      countedPaths.add(filename);

      const isValidBlob =
        att.blob instanceof Blob ||
        (att.blob && typeof (att.blob as any).size === 'number');

      if (isValidBlob) {
        totalBytes += (att.blob as any).size;
      } else if (att.dataUrl) {
        const commaIdx = att.dataUrl.indexOf(',');
        const isBase64 = att.dataUrl.slice(0, Math.max(0, commaIdx)).includes(';base64');
        const dataPart = commaIdx >= 0 ? att.dataUrl.slice(commaIdx + 1) : att.dataUrl;
        if (isBase64) {
          const clean = dataPart.replace(/\s+/g, '');
          const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
          totalBytes += Math.max(0, Math.floor(clean.length * 0.75) - padding);
        } else {
          try {
            const decoded = decodeURIComponent(dataPart);
            totalBytes += typeof TextEncoder !== 'undefined'
              ? new TextEncoder().encode(decoded).length
              : decoded.length;
          } catch {
            totalBytes += dataPart.length;
          }
        }
      }
    };

    let counter = 0;
    if (record.images) {
      for (const img of record.images) inspectAttachment(img, counter++);
    }
    if (record.messages) {
      for (const turn of record.messages) {
        if (turn.attachments) {
          for (const att of turn.attachments) {
            if (att.type === 'image') inspectAttachment(att, counter++);
          }
        }
      }
    }
    if (options?.images) {
      for (const img of options.images) inspectAttachment(img, counter++);
    }
    if (options?.extraFiles) {
      for (const content of Object.values(options.extraFiles)) {
        if (typeof content === 'string') {
          totalBytes += typeof TextEncoder !== 'undefined'
            ? new TextEncoder().encode(content).length
            : content.length;
        } else if (content instanceof Blob) {
          totalBytes += content.size;
        } else if (content instanceof Uint8Array) {
          totalBytes += content.byteLength;
        } else if (content instanceof ArrayBuffer) {
          totalBytes += content.byteLength;
        }
      }
    }

    return totalBytes;
  }

  /**
   * Formats a byte count into a clean, human-readable string.
   * e.g. 1024 -> '1 KB', 1048576 -> '1 MB'
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const dm = Math.max(0, decimals);
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const unitIndex = Math.max(0, Math.min(i, sizes.length - 1));

    const val = parseFloat((bytes / Math.pow(k, unitIndex)).toFixed(dm));
    return `${val} ${sizes[unitIndex]}`;
  }

  /**
   * Generates a standardized zip filename from conversation metadata.
   * Format: {site}_{sanitizedTitle}_{sessionId}_{timestamp}.zip
   * Embedding the permanent session ID guarantees future-proof traceability even if the chat is renamed.
   */
  static generateZipFilename(metadata: HarvestConversationMetadata, date = new Date()): string {
    const rawTitle = metadata.title || 'Untitled Conversation';
    const cleanedTitle = TextSanitizer.cleanTitle(rawTitle);
    const sanitizedTitle = TextSanitizer.sanitizeFilename(cleanedTitle, 50);
    const timestamp = TextSanitizer.getTimestamp(date);
    const site = metadata.site || 'conversation';
    const sessionId = metadata.conversationId
      ? TextSanitizer.sanitizeFilename(metadata.conversationId, 40)
      : '';

    if (sessionId && sessionId !== 'untitled') {
      return `${site}_${sanitizedTitle}_${sessionId}_${timestamp}.zip`;
    }

    return `${site}_${sanitizedTitle}_${timestamp}.zip`;
  }

  /**
   * Triggers the download of a ZIP blob via chrome.downloads.download,
   * falling back to DOM anchor click in web or test environments.
   * Safely manages URL object creation, download completion listening, and revocation.
   *
   * In MV3 Background Service Workers where URL.createObjectURL is undefined in
   * ServiceWorkerGlobalScope, seamlessly falls back to a base64 Data URL.
   *
   * Cross-browser resilience:
   * - Chromium: Uses chrome.downloads.onDeterminingFilename to prevent data: URLs from defaulting to "download.zip".
   * - Firefox & Safari: Safely checks listener availability; Firefox/Safari already respect filename on download options.
   */
  static async downloadZip(
    blob: Blob,
    filename: string,
    options?: DownloadZipOptions
  ): Promise<number | string> {
    const isObjectUrlSupported =
      typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

    let url: string;
    let isBlobUrl = false;

    if (isObjectUrlSupported) {
      try {
        url = URL.createObjectURL(blob);
        isBlobUrl = true;
      } catch {
        // Fall back to data URL if createObjectURL throws in certain worker environments
        url = await MediaExtractor.blobToDataUrl(blob);
      }
    } else {
      url = await MediaExtractor.blobToDataUrl(blob);
    }

    const revokeDelayMs = options?.revokeDelayMs ?? 30000;

    let revokeTimer: any = null;
    const safeRevoke = () => {
      if (!isBlobUrl) return;
      if (revokeTimer) return;
      revokeTimer = setTimeout(() => {
        try {
          if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(url);
          }
        } catch {
          // Ignore revocation errors
        }
      }, revokeDelayMs);
    };

    const immediateRevoke = () => {
      if (!isBlobUrl) return;
      if (revokeTimer) {
        clearTimeout(revokeTimer);
        revokeTimer = null;
      }
      try {
        if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(url);
        }
      } catch {
        // Ignore revocation errors
      }
    };

    // 1. Extension Environment: chrome.downloads.download
    if (typeof chrome !== 'undefined' && chrome?.downloads?.download) {
      return new Promise<number>((resolve, reject) => {
        let expectedDownloadId: number | undefined;
        let determiningListener: any = null;

        const cleanupDetermining = () => {
          if (determiningListener && typeof chrome?.downloads?.onDeterminingFilename?.removeListener === 'function') {
            try {
              chrome.downloads.onDeterminingFilename.removeListener(determiningListener);
            } catch {
              // Ignore removal errors
            }
            determiningListener = null;
          }
        };

        // Chromium-only hook: chrome.downloads.onDeterminingFilename prevents data: URLs from defaulting to "download.zip".
        // Strictly guarded for non-Chromium browsers (Firefox, Safari) where onDeterminingFilename is undefined.
        if (typeof chrome?.downloads?.onDeterminingFilename?.addListener === 'function') {
          determiningListener = (
            item: any,
            suggest: (suggestion?: { filename: string; conflictAction?: string }) => void
          ) => {
            const isMatch =
              (expectedDownloadId !== undefined && item.id === expectedDownloadId) ||
              (item.url === url) ||
              (url.startsWith('data:') && item.url?.startsWith('data:'));

            if (isMatch) {
              try {
                suggest({ filename, conflictAction: 'uniquify' });
              } catch {
                // If suggest throws (e.g. already suggested or aborted), fail-open
              }
              cleanupDetermining();
              return true;
            }
          };

          try {
            chrome.downloads.onDeterminingFilename.addListener(determiningListener);
          } catch {
            determiningListener = null;
          }
        }

        const fallbackTimer = setTimeout(() => {
          cleanupDetermining();
        }, 30000);

        chrome.downloads.download(
          {
            url,
            filename,
            saveAs: options?.saveAs ?? false
          },
          (downloadId?: number) => {
            expectedDownloadId = downloadId;
            const err = chrome.runtime?.lastError;
            if (err || downloadId === undefined) {
              clearTimeout(fallbackTimer);
              cleanupDetermining();
              immediateRevoke();
              reject(new Error(err?.message || 'chrome.downloads.download failed to initiate'));
            } else {
              // Listen for download completion or interruption to safely revoke object URL
              if (chrome.downloads?.onChanged?.addListener) {
                const changeListener = (delta: { id: number; state?: { current?: string } }) => {
                  if (delta.id === downloadId) {
                    const state = delta.state?.current;
                    if (state === 'complete' || state === 'interrupted') {
                      clearTimeout(fallbackTimer);
                      cleanupDetermining();
                      try {
                        chrome.downloads.onChanged.removeListener(changeListener);
                      } catch {
                        // Ignore removal errors
                      }
                      immediateRevoke();
                    }
                  }
                };
                try {
                  chrome.downloads.onChanged.addListener(changeListener);
                } catch {
                  // Ignore listener registration errors
                }
              }

              safeRevoke();
              resolve(downloadId);
            }
          }
        );
      });
    }

    // 2. DOM Fallback (Web / Test / Content script environment)
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Essential for correct filename preservation in browser downloads
      if (a.style) {
        a.style.display = 'none';
      }
      const target = document.body || document.documentElement;
      if (target && typeof target.appendChild === 'function') {
        target.appendChild(a);
        a.click();
        a.remove();
      } else {
        a.click();
      }
      safeRevoke();
      return 'dom-download-triggered';
    }

    // 3. Headless / Node environment
    safeRevoke();
    return url;
  }
}
