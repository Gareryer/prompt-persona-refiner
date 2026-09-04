import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatMemoryKey,
  personaV4ToLegacyComponents,
  legacyComponentsToPersonaV4,
  savePersonaToStorage,
  loadPersonaFromStorage
} from '../../src/core/sidepanel/session-adapter';
import {
  markFormDirty,
  resetFormDirty,
  hasUnsavedChanges,
  cancelRebuild,
  isRebuildCancelled,
  resetRebuildStatus,
  handleSaveDraft,
  savePromptLocal,
  loadSavedPrompts,
  deleteSavedPrompt,
  loadPersonaToEdit,
  extractFromSavedPrompt,
  setupSynthesizedPersonaSave
} from '../../src/core/sidepanel/persona-lifecycle';
import type { PersonaV4 } from '../../src/core/memory/schemas';

describe('Phase 7A: Persona Lifecycle & Session Adapter', () => {
  beforeEach(() => {
    resetFormDirty();
    resetRebuildStatus();
    (globalThis as any).chrome = {
      storage: {
        local: {
          _store: {} as Record<string, any>,
          async get(keys: any) {
            if (typeof keys === 'string') {
              return { [keys]: this._store[keys] };
            }
            const res: Record<string, any> = {};
            for (const k of keys) {
              if (this._store[k] !== undefined) res[k] = this._store[k];
            }
            return res;
          },
          async set(items: Record<string, any>) {
            Object.assign(this._store, items);
          }
        }
      }
    };
  });

  describe('Session Adapter (Strangler Fig Bidi-Schema)', () => {
    it('formats memory keys cleanly for UI labels', () => {
      expect(formatMemoryKey('use_case_keywords')).toBe('Use Case Keywords');
      expect(formatMemoryKey('persona')).toBe('Persona');
      expect(formatMemoryKey('')).toBe('');
    });

    it('converts PersonaV4 to legacy nested session components', () => {
      const persona: PersonaV4 = {
        persona: { instruction: 'Act as lead architect' },
        tone: { instruction: 'Concise and precise' }
      };

      const components = personaV4ToLegacyComponents(persona);
      expect(components.persona).toBeDefined();
      expect(components.persona!.current?.instruction).toBe('Act as lead architect');
      expect(components.persona!.current?.version).toBe(4);
      expect(components.persona!.confidence).toBe(1.0);
      expect(components.tone!.current?.instruction).toBe('Concise and precise');
    });

    it('converts legacy components to flat PersonaV4 object', () => {
      const components = {
        persona: { current: { instruction: 'Senior SRE' } },
        framework: { current: { instruction: 'TDD and Strangler Fig' } }
      };

      const persona = legacyComponentsToPersonaV4(components);
      expect(persona.persona?.instruction).toBe('Senior SRE');
      expect(persona.framework?.instruction).toBe('TDD and Strangler Fig');
      expect(persona.tone).toBeUndefined();
    });

    it('saves persona to session storage using legacy key format', async () => {
      const res = await savePersonaToStorage('Act as Senior Dev', 'test-session-123', true);
      expect(res.success).toBe(true);
      expect(res.sessionKey).toBe('session_test-session-123');

      const loaded = await loadPersonaFromStorage('test-session-123');
      expect(loaded?.persona?.instruction).toBe('Act as Senior Dev');
    });
  });

  describe('Persona Lifecycle Engine', () => {
    it('tracks form dirty state across edits and saves', () => {
      expect(hasUnsavedChanges()).toBe(false);
      markFormDirty();
      expect(hasUnsavedChanges()).toBe(true);
      resetFormDirty();
      expect(hasUnsavedChanges()).toBe(false);
    });

    it('tracks and resets rebuild cancellation status', () => {
      expect(isRebuildCancelled()).toBe(false);
      cancelRebuild();
      expect(isRebuildCancelled()).toBe(true);
      resetRebuildStatus();
      expect(isRebuildCancelled()).toBe(false);
    });

    it('saves a persona draft with full metadata to local storage', async () => {
      const extraction = {
        persona: { instruction: 'Code Quality Reviewer' }
      };

      const res = await handleSaveDraft({
        name: 'Reviewer Persona',
        extractionData: extraction,
        domain: 'engineering',
        tone: 'direct',
        complexity: 'expert',
        keywords: ['clean-code', 'tdd']
      });

      expect(res.success).toBe(true);
      expect(res.draftId).toBeDefined();
      expect(hasUnsavedChanges()).toBe(false);

      const store = (globalThis as any).chrome.storage.local._store;
      expect(store.persona_drafts).toHaveLength(1);
      expect(store.persona_drafts[0].name).toBe('Reviewer Persona');
      expect(store.persona_drafts[0].metadata.domain).toBe('engineering');
    });

    it('manages prompt template CRUD in local storage', async () => {
      const saved = await savePromptLocal({
        title: 'Refactor Code',
        content: 'Refactor this function to be pure and testable.',
        category: 'Coding'
      });

      expect(saved.id).toBeDefined();
      expect(saved.title).toBe('Refactor Code');

      const all = await loadSavedPrompts();
      expect(all).toHaveLength(1);
      expect(all[0]!.title).toBe('Refactor Code');

      const deleted = await deleteSavedPrompt(saved.id);
      expect(deleted).toBe(true);

      const afterDelete = await loadSavedPrompts();
      expect(afterDelete).toHaveLength(0);
    });

    it('normalizes persona data for edit form and marks form dirty', () => {
      const rawPersona = {
        name: 'My Custom Specialist',
        source_prompt: 'Write tests for everything'
      };

      const normalized = loadPersonaToEdit(rawPersona);
      expect(normalized.name).toBe('My Custom Specialist');
      expect(normalized.source_prompt).toBe('Write tests for everything');
      expect(normalized.version).toBe(1);
      expect(hasUnsavedChanges()).toBe(true);
    });

    it('extracts prompt from saved prompt template', () => {
      const res = extractFromSavedPrompt('System architecture prompt');
      expect(res.prompt).toBe('System architecture prompt');
      expect(res.source).toBe('saved_prompt');
    });

    it('bridges synthesized persona save to session storage', async () => {
      const res = await setupSynthesizedPersonaSave({
        personaData: { persona: { instruction: 'Synthesized Persona Prompt' } },
        sessionId: 'syn-session-456',
        name: 'Synthesized AI'
      });

      expect(res.success).toBe(true);
      const loaded = await loadPersonaFromStorage('syn-session-456');
      expect(loaded?.persona?.instruction).toBe('Synthesized Persona Prompt');
    });
  });
});
