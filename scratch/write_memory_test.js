import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ContextAssembler,
  MemoryController,
  AnalyzerRegistry,
  RecentFocus,
  UnifiedAnalyzer,
  ComponentSchemas,
  MEMORY_SCHEMA_VERSION,
  SESSION_KEY_PREFIX,
  MEMORY_SIZE_LIMITS
} from '../../src/core/memory';

describe('Phase 2 Memory Engine Deep Methods', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    AnalyzerRegistry.clear();
  });

  describe('ComponentSchemas v4', () => {
    it('provides all 7 dimension schemas and enums', () => {
      expect(ComponentSchemas.version).toBe(4);
      expect(ComponentSchemas.componentIds).toHaveLength(7);
      expect(ComponentSchemas.enums.domain).toContain('Tech');
      expect(ComponentSchemas.enums.outputType).toContain('Markdown');

      const toneSchema = ComponentSchemas.getSchema('tone');
      expect(toneSchema).toBeDefined();
      expect(toneSchema?.properties.instruction).toBeDefined();

      const combined = ComponentSchemas.buildCombinedSchema(['persona', 'tone']);
      expect(combined.properties.persona).toBeDefined();
      expect(combined.properties.tone).toBeDefined();
      expect(combined.properties.metadata).toBeDefined();
    });

    it('validates dimension data compliance', () => {
      const valid = ComponentSchemas.validate('persona', { instruction: 'You are an expert' });
      expect(valid.valid).toBe(true);

      const invalid = ComponentSchemas.validate('persona', { role: 'expert' });
      expect(invalid.valid).toBe(false);
      expect(invalid.errors.length).toBeGreaterThan(0);
    });
  });

  describe('MemoryController Deep Methods', () => {
    it('initializes with session key and schema version', () => {
      const mc = new MemoryController('session_abc_123');
      expect(mc.sessionId).toBe('session_abc_123');
      expect(mc.storageKey).toBe('session_session_abc_123');
      expect(MEMORY_SCHEMA_VERSION).toBe(2);
      expect(SESSION_KEY_PREFIX).toBe('session_');
    });

    it('extracts session IDs from URLs', () => {
      expect(MemoryController.extractSessionId('https://gemini.google.com/app/e05784e5eae72133')).toBe('e05784e5eae72133');
      expect(MemoryController.extractSessionId('https://gemini.google.com/app/new_chat')).toBe('new_chat');
      expect(MemoryController.extractSessionId('https://gemini.google.com/app')).toBe('app');
    });

    it('detects and corrects char-array LLM bugs in sanitization', () => {
      const mc = new MemoryController('test_char_array');
      const charArray = { 0: 'H', 1: 'e', 2: 'l', 3: 'l', 4: 'o' };
      expect(mc._isCharArray(charArray)).toBe(true);
      expect(mc._sanitizeComponentData(charArray)).toBe('Hello');
    });

    it('truncates oversized strings in component sanitization', () => {
      const mc = new MemoryController('test_truncation');
      const hugeString = 'a'.repeat(20000);
      const sanitized = mc._truncateString(hugeString, 1000);
      expect(sanitized.length).toBeLessThanOrEqual(1005);
      expect(sanitized.endsWith('...')).toBe(true);
    });

    it('manages component pinning and effective resolution', async () => {
      const mc = new MemoryController('test_pinning');
      await mc.setComponent('persona', {
        instruction: 'Original persona instruction'
      });

      expect(await mc.isComponentPinned('persona')).toBe(false);
      const pinned = await mc.pinComponent('persona');
      expect(pinned).toBe(true);
      expect(await mc.isComponentPinned('persona')).toBe(true);

      const effective = await mc.getEffectiveComponent('persona');
      expect(effective.instruction).toBe('Original persona instruction');

      // Update current without modifying pinnedData
      await mc.setComponent('persona', {
        instruction: 'Overwritten persona instruction'
      });

      const effectiveStillPinned = await mc.getEffectiveComponent('persona');
      expect(effectiveStillPinned.instruction).toBe('Original persona instruction');

      await mc.unpinComponent('persona');
      expect(await mc.isComponentPinned('persona')).toBe(false);
    });

    it('tracks generations across selective rebuilds', async () => {
      const mc = new MemoryController('test_generations');
      const gen1 = await mc.getCurrentGeneration();
      const gen2 = await mc.incrementGeneration();
      expect(gen2).toBe(gen1 + 1);
    });
  });

  describe('ContextAssembler Deep Pipeline', () => {
    it('assembles unified context from MemoryController', async () => {
      const mc = new MemoryController('session_assembler_test');
      await mc.setComponent('persona', {
        instruction: 'You are a Principal Software Architect.'
      });
      await mc.setComponent('context', {
        instruction: 'TypeScript 5.9, React 19, WXT browser extensions.',
        metadata: { domain: 'Tech', scope_tags: ['Architecture', 'WXT'] }
      });

      const assembler = new ContextAssembler(mc);
      const assembled = await assembler.assemble();

      expect(assembled.assembledAt).toBeDefined();
      expect(assembled.summary.hasContext).toBe(true);
      expect(assembled.refinementContext.persona).toBeDefined();
      expect(assembled.refinementContext.domain).toBeDefined();

      const formatted = await assembler.formatForRefinement();
      expect(formatted).toContain('## 🎭 PERSONA');
      expect(formatted).toContain('## 🌐 DOMAIN & SCOPE');

      const json = await assembler.getContextJSON();
      expect(json.persona.instruction).toContain('Principal Software Architect');
    });

    it('handles backward compatibility for v3 structured formats', async () => {
      const mc = new MemoryController('session_legacy_test');
      await mc.setComponent('persona_synthesizer', {
        synthesizedPersona: 'Legacy Lead Developer',
        primaryDomain: 'Web Engineering'
      });

      const assembler = new ContextAssembler(mc);
      const assembled = await assembler.assemble();
      expect(assembled.refinementContext.persona.role).toBe('Legacy Lead Developer');
    });
  });

  describe('AnalyzerRegistry', () => {
    it('registers, queries, and unregisters analyzers', () => {
      const analyzer = {
        id: 'custom_analyzer',
        name: 'Custom Analyzer',
        analyze: vi.fn().mockResolvedValue({ success: true })
      };

      expect(AnalyzerRegistry.register(analyzer)).toBe(true);
      expect(AnalyzerRegistry.getAnalyzer('custom_analyzer')).toBe(analyzer);
      expect(AnalyzerRegistry.getAnalyzerIds()).toContain('custom_analyzer');
      expect(AnalyzerRegistry.getAllAnalyzers()).toHaveLength(1);

      expect(AnalyzerRegistry.unregister('custom_analyzer')).toBe(true);
      expect(AnalyzerRegistry.getAnalyzer('custom_analyzer')).toBeUndefined();
    });
  });

  describe('RecentFocus Analyzer', () => {
    it('constructs prompt with ratings context', () => {
      const messages = [
        { id: 1, user: { prompt: 'Help with WXT build' }, model: { response: 'Here is how...' }, rating: { value: 5 } },
        { id: 2, user: { prompt: 'How about Shadow DOM?' }, model: { response: 'Use createShadowRootUi...' }, rating: { value: 4 } }
      ];

      const prompt = RecentFocus.getPrompt(messages);
      expect(prompt).toContain('RECENT RATINGS:');
      expect(prompt).toContain('5★ → 4★');
      expect(prompt).toContain('Help with WXT build');
      expect(prompt).toContain('ANALYZE THE IMMEDIATE CONTEXT');
    });
  });

  describe('UnifiedAnalyzer', () => {
    it('builds comprehensive 7-dimension synthesis prompt', () => {
      const messages = [
        { id: 1, user: { prompt: 'Write a refiner for Gemini' }, model: { response: 'Code here' } }
      ];

      const prompt = UnifiedAnalyzer.getPrompt(messages);
      expect(prompt).toContain('PERSONA ARCHITECT');
      expect(prompt).toContain('7-DIMENSION SPECIFICATIONS');
      expect(prompt).toContain('persona (Identity, Credentials, Background)');
      expect(prompt).toContain('context (Domain, Scope Boundaries, Terminology)');
      expect(prompt).toContain('REQUIRED OUTPUT JSON FORMAT');
    });
  });
});
`;

fs.writeFileSync(testPath, testCode, 'utf-8');
console.log('Created tests/unit/memory-engine.test.ts');
