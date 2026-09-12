import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';
import { setupMockDom } from '../fixtures/mock-dom';
import {
  MediaExtractor,
  ZipBuilder,
  TextSanitizer
} from '@/core/harvest';
import type {
  HarvestConversationRecord,
  HarvestConversationMetadata,
  HarvestTurn,
  HarvestAttachment
} from '@/core/harvest/types';

setupMockDom();

// Sample base64 1x1 transparent PNG
const SAMPLE_BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Sample base64 1x1 JPEG
const SAMPLE_BASE64_JPG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('Phase 2: Unified Media Extraction & ZIP Packaging Subsystem', () => {
  let originalFetch: typeof globalThis.fetch;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    setupMockDom();
    originalFetch = globalThis.fetch;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    // Provide mock object URL handlers for testing environments
    URL.createObjectURL = vi.fn((_blob: Blob) => 'blob:mock-url-' + Math.random().toString(36).slice(2));
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
    delete (globalThis as any).chrome;
  });

  describe('MediaExtractor - Image Extension Discovery', () => {
    it('resolves extensions from standard image MIME types', () => {
      expect(MediaExtractor.getImageExtension('image/jpeg')).toBe('jpg');
      expect(MediaExtractor.getImageExtension('image/jpg')).toBe('jpg');
      expect(MediaExtractor.getImageExtension('image/png')).toBe('png');
      expect(MediaExtractor.getImageExtension('image/webp')).toBe('webp');
      expect(MediaExtractor.getImageExtension('image/gif')).toBe('gif');
      expect(MediaExtractor.getImageExtension('image/svg+xml')).toBe('svg');
      expect(MediaExtractor.getImageExtension('image/avif')).toBe('avif');
      expect(MediaExtractor.getImageExtension('image/bmp')).toBe('bmp');
      expect(MediaExtractor.getImageExtension('image/x-icon')).toBe('ico');
      expect(MediaExtractor.getImageExtension('image/tiff')).toBe('tiff');
    });

    it('handles MIME types with parameters (e.g. charset)', () => {
      expect(MediaExtractor.getImageExtension('image/png; charset=utf-8')).toBe('png');
      expect(MediaExtractor.getImageExtension('IMAGE/JPEG; BOUNDARY=something')).toBe('jpg');
    });

    it('infers extension from URL when MIME type is missing or generic', () => {
      expect(MediaExtractor.getImageExtension(undefined, 'https://example.com/photo.jpg')).toBe('jpg');
      expect(MediaExtractor.getImageExtension('', 'https://example.com/banner.jpeg?token=abc#frag')).toBe('jpg');
      expect(MediaExtractor.getImageExtension('application/octet-stream', 'https://example.com/asset.webp')).toBe('webp');
      expect(MediaExtractor.getImageExtension(undefined, 'https://example.com/graphic.svg')).toBe('svg');
      expect(MediaExtractor.getImageExtension(undefined, 'blob:https://gemini.google.com/chart.png')).toBe('png');
    });

    it('falls back to "png" for unknown MIME and extension-less URLs', () => {
      expect(MediaExtractor.getImageExtension('application/octet-stream', 'https://example.com/no-extension')).toBe('png');
      expect(MediaExtractor.getImageExtension(undefined, undefined)).toBe('png');
      expect(MediaExtractor.getImageExtension('', '')).toBe('png');
    });
  });

  describe('MediaExtractor - Data URI Parsing & Blob Conversion', () => {
    it('converts base64 data: URI into a valid binary Blob', () => {
      const blob = MediaExtractor.dataUrlToBlob(SAMPLE_BASE64_PNG);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('handles base64 data: URI with whitespace and newlines', () => {
      const formatted = SAMPLE_BASE64_PNG.replace('AAAA', 'AA\nAA\r\n');
      const blob = MediaExtractor.dataUrlToBlob(formatted);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('handles percent-encoded non-base64 SVG data: URIs', () => {
      const svgDataUrl = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Ccircle%20r%3D%2210%22%2F%3E%3C%2Fsvg%3E';
      const blob = MediaExtractor.dataUrlToBlob(svgDataUrl);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/svg+xml');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('throws on invalid data URI format', () => {
      expect(() => MediaExtractor.dataUrlToBlob('https://example.com/image.png')).toThrow(
        'Invalid data URI format'
      );
    });

    it('round-trips Blob to data URL and back', async () => {
      const originalBlob = new Blob(['sample-binary-payload'], { type: 'text/plain' });
      const dataUrl = await MediaExtractor.blobToDataUrl(originalBlob);
      expect(dataUrl).toContain('data:text/plain;base64,');

      const convertedBlob = MediaExtractor.dataUrlToBlob(dataUrl);
      expect(convertedBlob.type).toBe('text/plain');
      expect(convertedBlob.size).toBe(originalBlob.size);
    });
  });

  describe('MediaExtractor - Single Image Fetching (fetchImage)', () => {
    it('directly extracts base64 data: URI without network invocation', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const result = await MediaExtractor.fetchImage(SAMPLE_BASE64_PNG, 0, 0);
      expect(fetchSpy).not.toHaveBeenCalled();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toBe('images/001.png');
        expect(result.filename).toBe('images/001.png');
        expect(result.mimeType).toBe('image/png');
        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.turnIndex).toBe(0);
        expect(result.imageIndex).toBe(0);
      }
    });

    it('fetches remote https: URLs with credentials: "include"', async () => {
      const mockBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/jpeg' }),
        blob: async () => mockBlob
      });
      globalThis.fetch = fetchMock;

      const result = await MediaExtractor.fetchImage('https://lh3.googleusercontent.com/photo.jpg', 1, 1);
      expect(fetchMock).toHaveBeenCalledWith('https://lh3.googleusercontent.com/photo.jpg', {
        credentials: 'include',
        signal: undefined
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toBe('images/002.jpg');
        expect(result.filename).toBe('images/002.jpg');
        expect(result.mimeType).toBe('image/jpeg');
        expect(result.blob).toBe(mockBlob);
      }
    });

    it('fetches blob: URLs successfully', async () => {
      const mockBlob = new Blob([new Uint8Array([4, 5, 6])], { type: 'image/webp' });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'image/webp' }),
        blob: async () => mockBlob
      });

      const result = await MediaExtractor.fetchImage('blob:https://gemini.google.com/uuid-123', 2, 0);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.path).toBe('images/001.webp');
        expect(result.blob).toBe(mockBlob);
      }
    });

    describe('Strict Fail-Open Resilience', () => {
      it('catches network errors without throwing and returns diagnostic error object', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (CORS / Network drop)'));

        const result = await MediaExtractor.fetchImage('https://cdn.example.com/blocked.png', 0, 4);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.originalSrc).toBe('https://cdn.example.com/blocked.png');
          expect(result.turnIndex).toBe(0);
          expect(result.imageIndex).toBe(4);
          expect(result.path).toBe('images/005.png');
          expect(result.error).toContain('Failed to fetch (CORS / Network drop)');
        }
      });

      it('catches HTTP error statuses (404, 403, 500) without throwing', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        });

        const result = await MediaExtractor.fetchImage('https://example.com/missing.jpg', 2, 0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('HTTP 404: Not Found');
          expect(result.path).toBe('images/001.jpg');
        }
      });

      it('handles empty, null, or invalid URLs safely without throwing', async () => {
        const result = await MediaExtractor.fetchImage('', 0, 0);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Empty or invalid image source URL');
          expect(result.path).toBe('images/001.png');
        }
      });
    });
  });

  describe('MediaExtractor - Batched Turn-Level Extraction (extractImages)', () => {
    it('extracts all images across multiple turns with sequential paths and updates turns in-place', async () => {
      const mockPng = new Blob([new Uint8Array([1])], { type: 'image/png' });
      const mockJpg = new Blob([new Uint8Array([2])], { type: 'image/jpeg' });

      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('turn0')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'image/png' }),
            blob: async () => mockPng
          };
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          blob: async () => mockJpg
        };
      });

      const turns: HarvestTurn[] = [
        {
          id: 'u0',
          turnIndex: 0,
          role: 'user',
          content: 'Here is an image',
          timestamp: 1000,
          attachments: [
            { type: 'image', originalSrc: 'https://example.com/turn0.png', turnIndex: 0 }
          ]
        },
        {
          id: 'a0',
          turnIndex: 1,
          role: 'assistant',
          content: 'No images here',
          timestamp: 2000
        },
        {
          id: 'u1',
          turnIndex: 2,
          role: 'user',
          content: 'Here is a data URI and a remote image',
          timestamp: 3000,
          attachments: [
            { type: 'image', originalSrc: SAMPLE_BASE64_JPG, turnIndex: 2 },
            { type: 'image', originalSrc: 'https://example.com/turn2.jpg', turnIndex: 2 }
          ]
        }
      ];

      const { images, errors } = await MediaExtractor.extractImages(turns);

      expect(errors).toHaveLength(0);
      expect(images).toHaveLength(3);

      // Verify sequential paths
      expect(images[0]?.path).toBe('images/001.png');
      expect(images[1]?.path).toBe('images/002.jpg');
      expect(images[2]?.path).toBe('images/003.jpg');

      // Verify attachments mutated in place
      expect(turns[0]?.attachments?.[0]?.filename).toBe('images/001.png');
      expect(turns[0]?.attachments?.[0]?.blob).toBe(mockPng);

      expect(turns[2]?.attachments?.[0]?.filename).toBe('images/002.jpg');
      expect(turns[2]?.attachments?.[0]?.blob).toBeInstanceOf(Blob);

      expect(turns[2]?.attachments?.[1]?.filename).toBe('images/003.jpg');
      expect(turns[2]?.attachments?.[1]?.blob).toBe(mockJpg);
    });

    it('handles mixed success and failure without throwing (fail-open preservation of text)', async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('broken')) {
          throw new TypeError('Network connection reset');
        }
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          blob: async () => new Blob(['data'], { type: 'image/png' })
        };
      });

      const turns: HarvestTurn[] = [
        {
          id: 'u0',
          turnIndex: 0,
          role: 'user',
          content: 'Essential conversation prompt',
          timestamp: 1000,
          attachments: [
            { type: 'image', originalSrc: 'https://example.com/ok.png', turnIndex: 0 },
            { type: 'image', originalSrc: 'https://example.com/broken.png', turnIndex: 0 }
          ]
        }
      ];

      const { images, errors } = await MediaExtractor.extractImages(turns);

      // Text is preserved
      expect(turns[0]?.content).toBe('Essential conversation prompt');

      // 1 success, 1 error recorded
      expect(images).toHaveLength(1);
      expect(errors).toHaveLength(1);

      expect(errors[0]?.error).toContain('Network connection reset');
      expect(errors[0]?.path).toBe('images/002.png');

      // Turn attachment has diagnostic error
      expect(turns[0]?.attachments?.[0]?.blob).toBeDefined();
      expect(turns[0]?.attachments?.[1]?.error).toContain('Network connection reset');
      expect(turns[0]?.attachments?.[1]?.blob).toBeUndefined();
    });

    it('respects concurrency limiter options', async () => {
      let activeFetches = 0;
      let maxSimultaneousFetches = 0;

      globalThis.fetch = vi.fn().mockImplementation(async () => {
        activeFetches++;
        if (activeFetches > maxSimultaneousFetches) {
          maxSimultaneousFetches = activeFetches;
        }
        // Small delay to simulate network latency
        await new Promise(res => setTimeout(res, 20));
        activeFetches--;
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/png' }),
          blob: async () => new Blob(['x'], { type: 'image/png' })
        };
      });

      const attachments: HarvestAttachment[] = Array.from({ length: 15 }, (_, i) => ({
        type: 'image',
        originalSrc: `https://example.com/img-${i}.png`,
        turnIndex: 0
      }));

      const turns: HarvestTurn[] = [
        {
          id: 'turn-bulk',
          turnIndex: 0,
          role: 'user',
          content: 'Bulk images',
          timestamp: 1000,
          attachments
        }
      ];

      await MediaExtractor.extractImages(turns, { concurrency: 3 });

      // Peak active fetches must not exceed concurrency limit of 3
      expect(maxSimultaneousFetches).toBeLessThanOrEqual(3);
    });

    it('handles empty turns or turns without image attachments', async () => {
      const result = await MediaExtractor.extractImages([]);
      expect(result.images).toEqual([]);
      expect(result.errors).toEqual([]);

      const noImagesTurn: HarvestTurn[] = [
        { id: '1', turnIndex: 0, role: 'user', content: 'hello', timestamp: 1 }
      ];
      const res2 = await MediaExtractor.extractImages(noImagesTurn);
      expect(res2.images).toEqual([]);
      expect(res2.errors).toEqual([]);
    });
  });

  describe('ZipBuilder - Packaging & Sanitization', () => {
    const mockMetadata: HarvestConversationMetadata = {
      site: 'gemini',
      accountLabel: 'test-account',
      conversationId: 'gem-12345',
      title: 'Quantum Computing Discussion - Gemini',
      url: 'https://gemini.google.com/app/gem-12345',
      extractedAt: '2026-09-05T20:30:00.000Z',
      messageCount: 2,
      imageCount: 1
    };

    const mockImageBlob = new Blob(['image-binary-bytes-data'], { type: 'image/png' });

    const createSampleRecord = (): HarvestConversationRecord => ({
      metadata: { ...mockMetadata },
      messages: [
        {
          id: 'u-0',
          turnIndex: 0,
          role: 'user',
          content: 'Explain qubits',
          timestamp: 1000,
          attachments: [
            {
              type: 'image',
              originalSrc: 'https://example.com/qubit.png',
              filename: 'images/001.png',
              blob: mockImageBlob,
              turnIndex: 0
            }
          ]
        },
        {
          id: 'a-0',
          turnIndex: 1,
          role: 'assistant',
          content: 'A qubit is a two-state quantum system.',
          thinking: 'Quantum superposition model',
          timestamp: 2000
        }
      ]
    });

    it('sanitizeRecordForJson strips binary Blobs while preserving all transcript metadata and attachments', () => {
      const record = createSampleRecord();
      const sanitized = ZipBuilder.sanitizeRecordForJson(record) as any;

      // Messages and turn structure preserved
      expect(sanitized.messages).toHaveLength(2);
      expect(sanitized.messages[0].content).toBe('Explain qubits');
      expect(sanitized.messages[1].thinking).toBe('Quantum superposition model');

      // Attachment properties preserved, but blob is stripped
      const att = sanitized.messages[0].attachments[0];
      expect(att.type).toBe('image');
      expect(att.filename).toBe('images/001.png');
      expect(att.originalSrc).toBe('https://example.com/qubit.png');
      expect(att.blob).toBeUndefined();

      // Ensure JSON serializability without {} blob issues
      const jsonStr = JSON.stringify(sanitized);
      expect(jsonStr).toContain('"images/001.png"');
      expect(jsonStr).not.toContain('"blob"');
    });

    it('buildZip and createZip generate a valid JSZip archive bundling conversation.json and images', async () => {
      const record = createSampleRecord();
      const zipBlob = await ZipBuilder.buildZip(record);

      expect(zipBlob).toBeInstanceOf(Blob);
      expect(zipBlob.size).toBeGreaterThan(0);

      // Verify uncompressing via JSZip
      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

      // 1. conversation.json verification
      const conversationFile = loadedZip.file('conversation.json');
      expect(conversationFile).not.toBeNull();
      const conversationJsonText = await conversationFile!.async('string');
      const parsed = JSON.parse(conversationJsonText);
      expect(parsed.metadata.title).toBe('Quantum Computing Discussion - Gemini');
      expect(parsed.messages[0].content).toBe('Explain qubits');

      // 2. images/001.png verification
      const imageFile = loadedZip.file('images/001.png');
      expect(imageFile).not.toBeNull();
      const imgBytes = await imageFile!.async('string');
      expect(imgBytes).toBe('image-binary-bytes-data');

      // Verify createZip alias
      const aliasBlob = await ZipBuilder.createZip(record);
      expect(aliasBlob.size).toBeGreaterThan(0);
    });

    it('bundles data URLs when image blob is absent', async () => {
      const record: HarvestConversationRecord = {
        metadata: { ...mockMetadata },
        messages: [
          {
            id: 'u-0',
            turnIndex: 0,
            role: 'user',
            content: 'Check diagram',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: SAMPLE_BASE64_PNG,
                filename: 'images/001.png',
                dataUrl: SAMPLE_BASE64_PNG,
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const zipBlob = await ZipBuilder.buildZip(record);
      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const imgFile = loadedZip.file('images/001.png');
      expect(imgFile).not.toBeNull();

      const imgBuffer = await imgFile!.async('uint8array');
      expect(imgBuffer.length).toBeGreaterThan(0);
    });

    it('supports extraFiles in options (e.g. README, license)', async () => {
      const record = createSampleRecord();
      const zipBlob = await ZipBuilder.buildZip(record, {
        extraFiles: {
          'README.md': '# Conversation Archive\nExported via Harvester.',
          'VERSION': '1.0.0'
        }
      });

      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      expect(loadedZip.file('README.md')).not.toBeNull();
      expect(await loadedZip.file('README.md')!.async('string')).toContain('# Conversation Archive');
      expect(await loadedZip.file('VERSION')!.async('string')).toBe('1.0.0');
    });
  });

  describe('ZipBuilder - Size Estimation & Formatting', () => {
    it('estimateExportSize computes uncompressed byte size of JSON and image blobs', () => {
      const imageBlob = new Blob(['1234567890'], { type: 'image/png' }); // 10 bytes
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'test',
          conversationId: 'c1',
          title: 'Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: '1',
            turnIndex: 0,
            role: 'user',
            content: 'Test query',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: 'img',
                filename: 'images/001.png',
                blob: imageBlob,
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const estimated = ZipBuilder.estimateExportSize(record);
      // Must include JSON text bytes + 10 bytes of image
      expect(estimated).toBeGreaterThan(10);
      expect(Number.isInteger(estimated)).toBe(true);
    });

    it('estimateExportSize accounts for data URL images when blob is omitted', () => {
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'test',
          conversationId: 'c1',
          title: 'Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: '1',
            turnIndex: 0,
            role: 'user',
            content: 'Test query',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: SAMPLE_BASE64_PNG,
                filename: 'images/001.png',
                dataUrl: SAMPLE_BASE64_PNG,
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const estimated = ZipBuilder.estimateExportSize(record);
      expect(estimated).toBeGreaterThan(50);
    });

    describe('formatBytes', () => {
      it('formats byte counts across magnitude tiers', () => {
        expect(ZipBuilder.formatBytes(0)).toBe('0 Bytes');
        expect(ZipBuilder.formatBytes(500)).toBe('500 Bytes');
        expect(ZipBuilder.formatBytes(1024)).toBe('1 KB');
        expect(ZipBuilder.formatBytes(1536)).toBe('1.5 KB');
        expect(ZipBuilder.formatBytes(1048576)).toBe('1 MB');
        expect(ZipBuilder.formatBytes(1048576 * 2.5)).toBe('2.5 MB');
        expect(ZipBuilder.formatBytes(1073741824)).toBe('1 GB');
      });

      it('handles negative, non-finite, and zero values gracefully', () => {
        expect(ZipBuilder.formatBytes(-50)).toBe('0 Bytes');
        expect(ZipBuilder.formatBytes(NaN)).toBe('0 Bytes');
        expect(ZipBuilder.formatBytes(Infinity)).toBe('0 Bytes');
      });

      it('respects decimal precision parameter', () => {
        expect(ZipBuilder.formatBytes(1536, 0)).toBe('2 KB');
        expect(ZipBuilder.formatBytes(1536, 3)).toBe('1.5 KB');
      });
    });

    describe('generateZipFilename', () => {
      it('generates standardized, filesystem-safe filename with timestamp', () => {
        const d = new Date('2026-09-05T20:30:00.000Z');
        const filename = ZipBuilder.generateZipFilename(
          {
            site: 'gemini',
            accountLabel: 'default',
            conversationId: '123',
            title: 'Neural Networks 101 - Gemini',
            url: 'https://gemini.google.com',
            extractedAt: '2026-09-05',
            messageCount: 2,
            imageCount: 0
          },
          d
        );

        expect(filename).toBe('gemini_Neural_Networks_101_2026-09-05T20-30-00.zip');
      });

      it('handles untitled or empty titles with fallback', () => {
        const d = new Date('2026-09-05T20:30:00.000Z');
        const filename = ZipBuilder.generateZipFilename(
          {
            site: 'claude',
            accountLabel: 'default',
            conversationId: '456',
            title: '',
            url: 'https://claude.ai',
            extractedAt: '2026-09-05',
            messageCount: 0,
            imageCount: 0
          },
          d
        );

        expect(filename).toBe('claude_Untitled_Conversation_2026-09-05T20-30-00.zip');
      });
    });
  });

  describe('ZipBuilder - Download Dispatching (downloadZip)', () => {
    it('dispatches via chrome.downloads.download when available and manages URL lifecycle', async () => {
      const mockDownload = vi.fn().mockImplementation((_opts, callback) => {
        callback(42); // Returns downloadId 42
      });

      (globalThis as any).chrome = {
        downloads: {
          download: mockDownload
        },
        runtime: {}
      };

      const testBlob = new Blob(['test-zip-content'], { type: 'application/zip' });
      const downloadId = await ZipBuilder.downloadZip(testBlob, 'test.zip', { revokeDelayMs: 10 });

      expect(downloadId).toBe(42);
      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.zip',
          saveAs: false
        }),
        expect.any(Function)
      );

      // Verify object URL revocation after delay
      await new Promise(res => setTimeout(res, 25));
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('seamlessly falls back to base64 Data URL in Service Workers where URL.createObjectURL is undefined', async () => {
      const originalCreate = URL.createObjectURL;
      delete (URL as any).createObjectURL;

      const mockDownload = vi.fn().mockImplementation((_opts, callback) => {
        callback(101);
      });

      (globalThis as any).chrome = {
        downloads: {
          download: mockDownload
        },
        runtime: {}
      };

      const testBlob = new Blob(['service-worker-blob'], { type: 'application/zip' });
      const downloadId = await ZipBuilder.downloadZip(testBlob, 'sw-export.zip', { revokeDelayMs: 10 });

      expect(downloadId).toBe(101);
      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/^data:application\/zip;base64,/),
          filename: 'sw-export.zip',
          saveAs: false
        }),
        expect.any(Function)
      );

      // Verify no crash on revocation
      await new Promise(res => setTimeout(res, 25));

      URL.createObjectURL = originalCreate;
    });

    it('falls back to data URL when URL.createObjectURL throws an error', async () => {
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation(() => {
        throw new Error('Illegal invocation in worker');
      });

      const mockDownload = vi.fn().mockImplementation((_opts, callback) => {
        callback(102);
      });

      (globalThis as any).chrome = {
        downloads: {
          download: mockDownload
        },
        runtime: {}
      };

      const testBlob = new Blob(['throw-blob'], { type: 'application/zip' });
      const downloadId = await ZipBuilder.downloadZip(testBlob, 'throw-export.zip');

      expect(downloadId).toBe(102);
      expect(mockDownload).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringMatching(/^data:application\/zip;base64,/),
          filename: 'throw-export.zip'
        }),
        expect.any(Function)
      );

      URL.createObjectURL = originalCreate;
    });

    it('rejects with chrome.runtime.lastError when download fails to initiate', async () => {
      const mockDownload = vi.fn().mockImplementation((_opts, callback) => {
        (globalThis as any).chrome.runtime.lastError = { message: 'Disk space exhausted' };
        callback(undefined);
      });

      (globalThis as any).chrome = {
        downloads: {
          download: mockDownload
        },
        runtime: {}
      };

      const testBlob = new Blob(['test'], { type: 'application/zip' });
      await expect(ZipBuilder.downloadZip(testBlob, 'failed.zip')).rejects.toThrow(
        'Disk space exhausted'
      );
    });

    it('falls back to DOM anchor click when chrome.downloads is unavailable', async () => {
      // Ensure chrome is not defined
      delete (globalThis as any).chrome;

      const clickSpy = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');

      // Mock createElement to spy on <a> tag click
      const origCreateElement = document.createElement;
      document.createElement = vi.fn().mockImplementation((tag: string) => {
        const el = origCreateElement.call(document, tag);
        if (tag === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      const testBlob = new Blob(['test-dom-blob'], { type: 'application/zip' });
      const result = await ZipBuilder.downloadZip(testBlob, 'dom-export.zip', { revokeDelayMs: 10 });

      expect(result).toBe('dom-download-triggered');
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();

      // Restores createElement
      document.createElement = origCreateElement;
    });

    it('falls back to returning blob URL in headless Node environment without document', async () => {
      delete (globalThis as any).chrome;
      const originalDoc = globalThis.document;
      delete (globalThis as any).document;

      const testBlob = new Blob(['test-headless-blob'], { type: 'application/zip' });
      const result = await ZipBuilder.downloadZip(testBlob, 'headless.zip', { revokeDelayMs: 10 });

      expect(typeof result).toBe('string');
      expect(result).toContain('blob:mock-url-');

      (globalThis as any).document = originalDoc;
    });
  });

  describe('Edge Cases & Resilient Fallbacks', () => {
    it('aborts extraction cleanly when AbortSignal is triggered', async () => {
      const controller = new AbortController();
      controller.abort();

      const turns: HarvestTurn[] = [
        {
          id: 'turn-aborted',
          turnIndex: 0,
          role: 'user',
          content: 'Aborted run',
          timestamp: 1000,
          attachments: [
            { type: 'image', originalSrc: 'https://example.com/img1.png', turnIndex: 0 }
          ]
        }
      ];

      const { images } = await MediaExtractor.extractImages(turns, { signal: controller.signal });
      expect(images).toHaveLength(0);
    });

    it('estimateExportSize correctly sums string, Blob, and Uint8Array in extraFiles', () => {
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'default',
          conversationId: 'c1',
          title: 'Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 0,
          imageCount: 0
        },
        messages: []
      };

      const baseSize = ZipBuilder.estimateExportSize(record);
      const extraString = '12345'; // 5 bytes
      const extraBlob = new Blob(['1234567890']); // 10 bytes
      const extraUint8 = new Uint8Array([1, 2, 3]); // 3 bytes

      const totalWithExtras = ZipBuilder.estimateExportSize(record, {
        extraFiles: {
          'test.txt': extraString,
          'test.bin': extraBlob,
          'test.raw': extraUint8
        }
      });

      expect(totalWithExtras).toBe(baseSize + 5 + 10 + 3);
    });

    it('buildZip auto-assigns images/001.png path if filename is absent on attachment', async () => {
      const blob = new Blob(['auto-named-image'], { type: 'image/png' });
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'default',
          conversationId: 'c1',
          title: 'Auto Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: 'u0',
            turnIndex: 0,
            role: 'user',
            content: 'Auto named image',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: 'https://example.com/source.png',
                blob,
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const zipBlob = await ZipBuilder.buildZip(record);
      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

      expect(loadedZip.file('images/001.png')).not.toBeNull();
      const content = await loadedZip.file('images/001.png')!.async('string');
      expect(content).toBe('auto-named-image');
    });

    it('formatBytes handles sub-1 byte values gracefully without undefined unit', () => {
      expect(ZipBuilder.formatBytes(0.5)).toBe('0.5 Bytes');
      expect(ZipBuilder.formatBytes(0.123, 3)).toBe('0.123 Bytes');
    });

    it('downloadZip sets a.download attribute in DOM fallback mode', async () => {
      delete (globalThis as any).chrome;
      let createdAnchor: HTMLAnchorElement | null = null;
      const origCreateElement = document.createElement;
      document.createElement = vi.fn().mockImplementation((tag: string) => {
        const el = origCreateElement.call(document, tag);
        if (tag === 'a') {
          createdAnchor = el as HTMLAnchorElement;
          el.click = vi.fn();
        }
        return el;
      });

      const testBlob = new Blob(['sample-archive'], { type: 'application/zip' });
      await ZipBuilder.downloadZip(testBlob, 'custom-archive-name.zip', { revokeDelayMs: 10 });

      expect(createdAnchor).not.toBeNull();
      expect(createdAnchor!.download).toBe('custom-archive-name.zip');

      document.createElement = origCreateElement;
    });

    it('downloadZip listens to chrome.downloads.onChanged and revokes URL on completion', async () => {
      let registeredListener: ((delta: any) => void) | null = null;
      const mockAddListener = vi.fn((listener) => {
        registeredListener = listener;
      });
      const mockRemoveListener = vi.fn();

      const mockDownload = vi.fn().mockImplementation((_opts, callback) => {
        callback(99);
      });

      (globalThis as any).chrome = {
        downloads: {
          download: mockDownload,
          onChanged: {
            addListener: mockAddListener,
            removeListener: mockRemoveListener
          }
        },
        runtime: {}
      };

      const testBlob = new Blob(['zip-bytes'], { type: 'application/zip' });
      const downloadId = await ZipBuilder.downloadZip(testBlob, 'chrome-test.zip');
      expect(downloadId).toBe(99);
      expect(mockAddListener).toHaveBeenCalled();

      // Trigger completion event
      expect(registeredListener).not.toBeNull();
      registeredListener!({ id: 99, state: { current: 'complete' } });

      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockRemoveListener).toHaveBeenCalled();
    });

    it('buildZip handles non-base64 percent-encoded SVG data URLs without corruption', async () => {
      const svgText = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
      const percentEncodedSvg = `data:image/svg+xml,${encodeURIComponent(svgText)}`;

      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'default',
          conversationId: 'c-svg',
          title: 'SVG Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: 'u0',
            turnIndex: 0,
            role: 'user',
            content: 'Check SVG',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: percentEncodedSvg,
                dataUrl: percentEncodedSvg,
                filename: 'images/001.svg',
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const zipBlob = await ZipBuilder.buildZip(record);
      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

      const svgFile = loadedZip.file('images/001.svg');
      expect(svgFile).not.toBeNull();
      const extractedSvg = await svgFile!.async('string');
      expect(extractedSvg).toBe(svgText);
    });

    it('buildZip detects correct extension (e.g. webp) for blob attachments lacking filename', async () => {
      const webpBlob = new Blob(['fake-webp'], { type: 'image/webp' });
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'default',
          conversationId: 'c-webp',
          title: 'Webp Title',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: 'u0',
            turnIndex: 0,
            role: 'user',
            content: 'Webp check',
            timestamp: 1000,
            attachments: [
              {
                type: 'image',
                originalSrc: 'https://example.com/asset',
                blob: webpBlob,
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const zipBlob = await ZipBuilder.buildZip(record);
      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());

      expect(loadedZip.file('images/001.webp')).not.toBeNull();
    });

    it('getImageExtension extracts extension directly from data URI header when mimeType is omitted', () => {
      expect(MediaExtractor.getImageExtension(undefined, 'data:image/webp;base64,AAAA')).toBe('webp');
      expect(MediaExtractor.getImageExtension(undefined, 'data:image/avif;base64,AAAA')).toBe('avif');
      expect(MediaExtractor.getImageExtension(undefined, 'data:image/heic;base64,AAAA')).toBe('heic');
    });

    it('estimateExportSize deduplicates duplicate attachment references', () => {
      const sharedBlob = new Blob(['shared-bytes-12345'], { type: 'image/png' });
      const sharedAttachment: HarvestAttachment = {
        type: 'image',
        originalSrc: 'https://example.com/shared.png',
        blob: sharedBlob,
        turnIndex: 0
      };

      const record: HarvestConversationRecord = {
        metadata: {
          site: 'gemini',
          accountLabel: 'default',
          conversationId: 'c1',
          title: 'Dedupe',
          url: 'https://gemini.google.com/',
          extractedAt: '2026-09-05',
          messageCount: 1,
          imageCount: 1
        },
        images: [sharedAttachment],
        messages: [
          {
            id: 'u0',
            turnIndex: 0,
            role: 'user',
            content: 'Dedupe query',
            timestamp: 1000,
            attachments: [sharedAttachment]
          }
        ]
      };

      const totalEstimated = ZipBuilder.estimateExportSize(record);
      const jsonText = JSON.stringify(ZipBuilder.sanitizeRecordForJson(record), null, 2);
      const jsonSize = new TextEncoder().encode(jsonText).length;

      // Must equal exactly the sanitized JSON size + the single 18-byte Blob (not 2x blobs)
      expect(totalEstimated).toBe(jsonSize + sharedBlob.size);
    });

    it('extractImages reuses pre-existing Blob on attachments without calling fetch', async () => {
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      const preExistingBlob = new Blob(['already-downloaded'], { type: 'image/png' });
      const turns: HarvestTurn[] = [
        {
          id: 'u0',
          turnIndex: 0,
          role: 'user',
          content: 'Have blob',
          timestamp: 1000,
          attachments: [
            {
              type: 'image',
              originalSrc: 'https://example.com/ignore-fetch.png',
              blob: preExistingBlob,
              turnIndex: 0
            }
          ]
        }
      ];

      const { images, errors } = await MediaExtractor.extractImages(turns);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(errors).toHaveLength(0);
      expect(images).toHaveLength(1);
      expect(images[0]?.blob).toBe(preExistingBlob);
      expect(images[0]?.path).toBe('images/001.png');
    });

    it('dataUrlToBlob handles multi-parameter data URIs and unescaped percent signs', () => {
      const multiParam = 'data:image/svg+xml;charset=utf-8;base64,PHN2Zz48L3N2Zz4=';
      const blob = MediaExtractor.dataUrlToBlob(multiParam);
      expect(blob.type).toBe('image/svg+xml');

      // Unescaped % in plain text data URI
      const rawPercent = 'data:text/plain,100% genuine';
      const plainBlob = MediaExtractor.dataUrlToBlob(rawPercent);
      expect(plainBlob.type).toBe('text/plain');
    });

    it('buildZip handles attachments with empty object {} blob and falls back to dataUrl without throwing', async () => {
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'chatgpt',
          accountLabel: 'default',
          conversationId: 'chatgpt-ipc-1',
          title: 'ChatGPT IPC Test',
          url: 'https://chatgpt.com/c/chatgpt-ipc-1',
          extractedAt: new Date().toISOString(),
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: 'm1',
            turnIndex: 0,
            role: 'user',
            content: 'Check diagram',
            timestamp: Date.now(),
            attachments: [
              {
                type: 'image',
                filename: 'images/001.png',
                // Simulating empty object after Chrome IPC serialization of a Blob
                blob: {} as any,
                dataUrl: SAMPLE_BASE64_PNG,
                originalSrc: 'https://example.com/img.png',
                turnIndex: 0
              }
            ]
          }
        ]
      };

      const zipBlob = await ZipBuilder.buildZip(record);
      expect(zipBlob).toBeInstanceOf(Blob);

      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const imgFile = loadedZip.file('images/001.png');
      expect(imgFile).not.toBeNull();
      const imgBytes = await imgFile!.async('uint8array');
      expect(imgBytes.length).toBeGreaterThan(0);
    });

    it('buildZip fails-open when an image has invalid data and no dataUrl, producing valid zip', async () => {
      const record: HarvestConversationRecord = {
        metadata: {
          site: 'chatgpt',
          accountLabel: 'default',
          conversationId: 'chatgpt-failopen-1',
          title: 'ChatGPT Fail-Open Test',
          url: 'https://chatgpt.com/c/chatgpt-failopen-1',
          extractedAt: new Date().toISOString(),
          messageCount: 1,
          imageCount: 1
        },
        messages: [
          {
            id: 'm1',
            turnIndex: 0,
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
            attachments: [
              {
                type: 'image',
                filename: 'images/001.png',
                blob: {} as any, // completely unreadable
                turnIndex: 0
              }
            ]
          }
        ]
      };

      // Must not throw "Can't read the data of 'images/001.png'"
      const zipBlob = await ZipBuilder.buildZip(record);
      expect(zipBlob).toBeInstanceOf(Blob);

      const loadedZip = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      expect(loadedZip.file('conversation.json')).not.toBeNull();
    });
  });
});

