/**
 * Unified Media Extractor for the Harvester Subsystem.
 * Clean-room TypeScript port of Clio's image extraction pipeline.
 *
 * Supports:
 * - base64 data: URIs (direct in-memory Blob conversion)
 * - blob: URLs (in-page Blob references via fetch)
 * - authenticated https: URLs (via fetch with credentials: 'include')
 * - Batched concurrent downloads with configurable pool size (default: 10)
 * - Strict Fail-Open contract: network/CORS/decode errors log diagnostic entries without throwing
 * - Standardized image path formatting: images/001.png
 */

import type { HarvestAttachment, HarvestTurn } from '../types';

export interface ImageFetchSuccess {
  success: true;
  originalSrc: string;
  turnIndex: number;
  imageIndex: number;
  path: string;
  filename: string;
  blob: Blob;
  mimeType: string;
}

export interface ImageFetchError {
  success: false;
  originalSrc: string;
  turnIndex: number;
  imageIndex: number;
  path: string;
  filename: string;
  error: string;
}

export type ImageFetchResult = ImageFetchSuccess | ImageFetchError;

export interface ExtractedImageFile {
  path: string;
  filename: string;
  blob: Blob;
  mimeType: string;
  originalSrc: string;
  turnIndex: number;
  imageIndex: number;
}

export interface ExtractedImageError {
  turnIndex: number;
  imageIndex: number;
  originalSrc: string;
  path: string;
  error: string;
}

export interface ExtractImagesResult {
  images: ExtractedImageFile[];
  errors: ExtractedImageError[];
}

export interface MediaExtractorOptions {
  concurrency?: number;
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export interface FetchImageOptions {
  signal?: AbortSignal;
  credentials?: RequestCredentials;
}

export class MediaExtractor {
  /**
   * Resolves the appropriate file extension given a MIME type or URL.
   * Priority: normalized MIME type -> URL file extension -> fallback 'png'.
   */
  static getImageExtension(mimeType?: string, url?: string): string {
    if (mimeType) {
      const cleanMime = mimeType.split(';')[0]?.trim().toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
        'image/svg': 'svg',
        'image/avif': 'avif',
        'image/bmp': 'bmp',
        'image/x-bmp': 'bmp',
        'image/vnd.wap.wbmp': 'bmp',
        'image/x-icon': 'ico',
        'image/vnd.microsoft.icon': 'ico',
        'image/tiff': 'tiff',
        'image/heic': 'heic',
        'image/heif': 'heif',
        'image/apng': 'apng',
        'image/x-png': 'png'
      };

      if (mimeMap[cleanMime]) {
        return mimeMap[cleanMime]!;
      }
    }

    if (url && !url.startsWith('data:')) {
      try {
        const cleanUrl = url.split('?')[0]?.split('#')[0] || '';
        const match = cleanUrl.match(/\.([a-zA-Z0-9]{3,4})$/);
        if (match && match[1]) {
          const ext = match[1].toLowerCase();
          if (ext === 'jpeg') return 'jpg';
          const validExtensions = new Set([
            'jpg', 'png', 'webp', 'gif', 'svg', 'avif', 'bmp', 'ico', 'tiff', 'heic', 'heif', 'apng'
          ]);
          if (validExtensions.has(ext)) {
            return ext;
          }
        }
      } catch {
        // Fall through on malformed URLs
      }
    } else if (url && url.startsWith('data:')) {
      // If no mimeType was supplied, inspect the data URI mediatype header
      const match = url.match(/^data:([^;,]+)/i);
      if (match && match[1]) {
        return this.getImageExtension(match[1]);
      }
    }

    return 'png';
  }

  /**
   * Converts a data: URI to a binary Blob (RFC 2397 compliant).
   * Handles raw base64, whitespace, and percent-encoded non-base64 URIs.
   */
  static dataUrlToBlob(dataUrl: string): Blob {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1 || !dataUrl.startsWith('data:')) {
      throw new Error('Invalid data URI format');
    }

    const header = dataUrl.slice(5, commaIndex); // Between "data:" and ","
    const rawData = dataUrl.slice(commaIndex + 1);

    const parts = header.split(';');
    let mimeType = 'image/png';
    let isBase64 = false;

    if (parts.length > 0 && parts[0] && !parts[0].includes('=')) {
      mimeType = parts[0].trim() || 'image/png';
    }

    for (let i = 0; i < parts.length; i++) {
      if (parts[i]?.trim().toLowerCase() === 'base64') {
        isBase64 = true;
      }
    }

    if (isBase64) {
      const cleanBase64 = rawData.replace(/\s+/g, '');
      if (typeof atob === 'function') {
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
      }

      if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from(cleanBase64, 'base64');
        return new Blob([buf], { type: mimeType });
      }

      throw new Error('Neither atob nor Buffer is available to decode base64');
    }

    // Non-base64 (percent-encoded or plain text)
    let decoded: string;
    try {
      decoded = decodeURIComponent(rawData);
    } catch {
      decoded = rawData;
    }
    return new Blob([decoded], { type: mimeType });
  }

  /**
   * Converts a binary Blob into a base64 data: URI.
   * Uses FileReader when available, falling back to chunked btoa or Buffer.
   */
  static async blobToDataUrl(blob: Blob): Promise<string> {
    if (typeof FileReader !== 'undefined') {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('FileReader did not return a string'));
          }
        };
        reader.onerror = () => {
          reject(reader.error || new Error('Failed to read blob'));
        };
        reader.readAsDataURL(blob);
      });
    }

    // Node / Service Worker fallback
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let base64 = '';
    if (typeof Buffer !== 'undefined') {
      base64 = Buffer.from(bytes).toString('base64');
    } else if (typeof btoa === 'function') {
      const CHUNK_SIZE = 8192;
      let binary = '';
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE, bytes.length);
        const chunk = bytes.subarray(i, end);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      base64 = btoa(binary);
    } else {
      throw new Error('Neither Buffer nor btoa is available to encode base64');
    }

    const type = blob.type || 'application/octet-stream';
    return `data:${type};base64,${base64}`;
  }

  /**
   * Formats destination path for an image given its index and extension.
   * e.g. images/001.png, images/002.jpg
   */
  static formatImagePath(imageIndex: number, ext: string): string {
    const padded = String(imageIndex + 1).padStart(3, '0');
    return `images/${padded}.${ext}`;
  }

  /**
   * Fetches a single image from a data URI, blob URL, or https URL.
   * Strict Fail-Open contract: returns error object instead of throwing.
   */
  static async fetchImage(
    src: string,
    turnIndex: number,
    imageIndex: number,
    options?: FetchImageOptions
  ): Promise<ImageFetchResult> {
    const extFallback = this.getImageExtension(undefined, src) || 'png';
    const destinationPath = this.formatImagePath(imageIndex, extFallback);

    if (!src || typeof src !== 'string' || !src.trim()) {
      return {
        success: false,
        originalSrc: src,
        turnIndex,
        imageIndex,
        path: destinationPath,
        filename: destinationPath,
        error: 'Empty or invalid image source URL'
      };
    }

    try {
      // 1. Data URI: Direct synchronous-like conversion to Blob
      if (src.startsWith('data:')) {
        const blob = this.dataUrlToBlob(src);
        const ext = this.getImageExtension(blob.type, src);
        const path = this.formatImagePath(imageIndex, ext);
        return {
          success: true,
          originalSrc: src,
          turnIndex,
          imageIndex,
          path,
          filename: path,
          blob,
          mimeType: blob.type || 'image/png'
        };
      }

      // 2. Blob: URL or HTTP(S): URL fetch
      const credentials = options?.credentials ?? 'include';
      const response = await fetch(src, {
        credentials,
        signal: options?.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Fetch failed'}`);
      }

      const headerMime = response.headers.get('content-type') || '';
      const rawBlob = await response.blob();
      const mimeType = rawBlob.type || headerMime || 'image/png';
      const blob = rawBlob.type ? rawBlob : rawBlob.slice(0, rawBlob.size, mimeType);
      const ext = this.getImageExtension(mimeType, src);
      const path = this.formatImagePath(imageIndex, ext);

      return {
        success: true,
        originalSrc: src,
        turnIndex,
        imageIndex,
        path,
        filename: path,
        blob,
        mimeType: blob.type || 'image/png'
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        originalSrc: src,
        turnIndex,
        imageIndex,
        path: destinationPath,
        filename: destinationPath,
        error: message
      };
    }
  }

  /**
   * Extracts all image attachments from a list of conversation turns in parallel batches.
   * Updates turn attachments in-place with resolved paths, blobs, and errors.
   * Concurrency is bounded (default: 10).
   */
  static async extractImages(
    turns: HarvestTurn[],
    options?: MediaExtractorOptions
  ): Promise<ExtractImagesResult> {
    const tasks: Array<{
      turn: HarvestTurn;
      attachment: HarvestAttachment;
      turnIndex: number;
      imageIndex: number;
    }> = [];

    // Collect all image attachments in turn order
    for (const turn of turns) {
      if (!turn.attachments || !Array.isArray(turn.attachments)) continue;
      for (const att of turn.attachments) {
        if (att.type === 'image' && (att.originalSrc || att.blob || att.dataUrl)) {
          if (!att.originalSrc && att.dataUrl) {
            att.originalSrc = att.dataUrl;
          }
          tasks.push({
            turn,
            attachment: att,
            turnIndex: typeof turn.turnIndex === 'number' ? turn.turnIndex : 0,
            imageIndex: tasks.length
          });
        }
      }
    }

    const images: ExtractedImageFile[] = [];
    const errors: ExtractedImageError[] = [];

    if (tasks.length === 0) {
      return { images, errors };
    }

    const concurrency = Math.max(1, options?.concurrency ?? 10);
    const signal = options?.signal;
    const credentials = options?.credentials;

    // Worker pool concurrency limiter
    let currentIndex = 0;
    const executeWorker = async () => {
      while (currentIndex < tasks.length) {
        if (signal?.aborted) {
          break;
        }

        const taskIndex = currentIndex++;
        const task = tasks[taskIndex]!;

        // Handle pre-existing Blob without redundant network requests
        if (task.attachment.blob) {
          const ext = this.getImageExtension(
            task.attachment.blob.type,
            task.attachment.filename || task.attachment.originalSrc
          );
          const path = this.formatImagePath(task.imageIndex, ext);
          task.attachment.filename = path;
          delete task.attachment.error;
          images.push({
            path,
            filename: path,
            blob: task.attachment.blob,
            mimeType: task.attachment.blob.type || 'image/png',
            originalSrc: task.attachment.originalSrc || path,
            turnIndex: task.turnIndex,
            imageIndex: task.imageIndex
          });
          continue;
        }

        const result = await this.fetchImage(task.attachment.originalSrc, task.turnIndex, task.imageIndex, {
          signal,
          credentials
        });

        // Mutate attachment in place
        task.attachment.filename = result.path;

        if (result.success) {
          task.attachment.blob = result.blob;
          delete task.attachment.error;
          images.push({
            path: result.path,
            filename: result.filename,
            blob: result.blob,
            mimeType: result.mimeType,
            originalSrc: result.originalSrc,
            turnIndex: result.turnIndex,
            imageIndex: result.imageIndex
          });
        } else {
          task.attachment.error = result.error;
          errors.push({
            turnIndex: result.turnIndex,
            imageIndex: result.imageIndex,
            originalSrc: result.originalSrc,
            path: result.path,
            error: result.error
          });
        }
      }
    };

    const workerCount = Math.min(concurrency, tasks.length);
    const workers = Array.from({ length: workerCount }, () => executeWorker());
    await Promise.all(workers);

    // Keep images and errors sorted by imageIndex
    images.sort((a, b) => a.imageIndex - b.imageIndex);
    errors.sort((a, b) => a.imageIndex - b.imageIndex);

    return { images, errors };
  }
}
