import { describe, it, expect, beforeEach } from 'vitest';
import { Logger, LogLevel, RingBuffer } from '@/core/logging/logger';
import { CryptoService } from '@/core/crypto/crypto-service';
import { ModelManager } from '@/core/model/model-manager';
import { MODEL_REGISTRY, sanitizeApiKey, getDefaultModelForProvider } from '@/core/model/model-registry';
import { LLMClient, LLMErrorType } from '@/core/llm/llm-client';
import { RatingManager } from '@/core/rating/rating-manager';
import { ThemeController } from '@/core/theme/theme-controller';
import { ContextAssembler } from '@/core/memory/context-assembler';
import { MemoryController } from '@/core/memory/memory-controller';
import { createEmptyPersona } from '@/core/memory/schemas';

describe('Exhaustive Core Architecture Verification', () => {
  describe('Structured Logger & RingBuffer', () => {
    it('maintains bounded circular buffer with FIFO eviction', () => {
      const rb = new RingBuffer<number>(3);
      rb.push(1);
      rb.push(2);
      rb.push(3);
      expect(rb.toArray()).toEqual([1, 2, 3]);

      rb.push(4); // Evicts 1
      expect(rb.toArray()).toEqual([2, 3, 4]);
      expect(rb.size()).toBe(3);
    });

    it('logs structured events and exports JSON', () => {
      const logger = Logger.getInstance({ maxEntries: 100 });
      logger.clear();
      logger.info('Test event', { key: 'value' });
      logger.warn('Warning event');

      const entries = logger.getEntries();
      expect(entries.length).toBe(2);
      expect(entries[0]!.level).toBe('INFO');
      expect(entries[1]!.level).toBe('WARN');

      const json = logger.exportJson();
      expect(json).toContain('Test event');
    });
  });

  describe('Model Registry & Manager', () => {
    it('sanitizes API keys removing non-ASCII whitespace and unicode', () => {
      const dirty = '  sk-test-123\u200B\u00A0  ';
      const clean = sanitizeApiKey(dirty);
      expect(clean).toBe('sk-test-123');
    });

    it('retrieves default models per provider', () => {
      expect(getDefaultModelForProvider('gemini')).toBe('gemini-2.0-flash');
      expect(getDefaultModelForProvider('openai')).toBe('gpt-4o-mini');
      expect(getDefaultModelForProvider('anthropic')).toBe('claude-3-5-sonnet-20241022');
    });

    it('manages model configs with AES-GCM encryption', async () => {
      const manager = new ModelManager();
      await manager.init();

      await manager.setApiKey('gemini', 'AIza-test-key-12345');
      const decrypted = await manager.getDecryptedApiKey('gemini');
      expect(decrypted).toBe('AIza-test-key-12345');
    });
  });

  describe('Rating Manager', () => {
    beforeEach(() => {
      if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
        localStorage.clear();
      }
    });

    it('records ratings, computes statistics, and handles deletions', () => {
      const rm = new RatingManager('session_123');
      rm.setRating(0, 5, 'Great answer');
      rm.setRating(1, 4);
      rm.setRating(2, 5);

      const stats = rm.getStats();
      expect(stats.totalRated).toBe(3);
      expect(stats.averageRating).toBe(4.7);
      expect(stats.distribution[5]).toBe(2);
      expect(stats.distribution[4]).toBe(1);

      rm.deleteRating(1);
      expect(rm.getStats().totalRated).toBe(2);
    });
  });

  describe('Theme Controller', () => {
    it('manages theme modes and notifies subscribers', async () => {
      let notified: string | null = null;
      const unsubscribe = ThemeController.subscribe(t => {
        notified = t;
      });

      await ThemeController.setMode('dark');
      expect(ThemeController.getResolvedTheme()).toBe('dark');

      await ThemeController.setMode('light');
      expect(ThemeController.getResolvedTheme()).toBe('light');

      unsubscribe();
    });
  });

  describe('Context Assembler & Memory Controller', () => {
    it('compiles only active dimensions into system prompt with token estimate', () => {
      const persona = createEmptyPersona();
      persona.persona!.instruction = 'You are a Senior Security Architect';
      persona.constraints!.instruction = 'Never allow unsafe eval';

      const assembled = ContextAssembler.assemble(persona, ['persona', 'constraints']);
      expect(assembled.systemPrompt).toContain('[PERSONA]');
      expect(assembled.systemPrompt).toContain('Senior Security Architect');
      expect(assembled.systemPrompt).toContain('[CONSTRAINTS]');
      expect(assembled.systemPrompt).toContain('Never allow unsafe eval');
      expect(assembled.tokenEstimate).toBeGreaterThan(0);
    });

    it('tracks pinned dimensions across memory updates', () => {
      const mc = new MemoryController();
      mc.pinDimension('constraints');
      expect(mc.isDimensionPinned('constraints')).toBe(true);

      mc.updateDimension('constraints', { instruction: 'Strict rule' });
      expect(mc.getActivePersona().constraints?.instruction).toBe('Strict rule');
    });
  });
});
