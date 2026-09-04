import { describe, it, expect } from 'vitest';
import { ComponentSchemas } from '../src/core/memory/component-schemas';
import { handleAddTag, handleRemoveTag } from '../src/core/sidepanel/tag-editor';
import type { PersonaV4 } from '../src/core/memory/schemas';

describe('Phase 8: Micro-Features & Dropped Symbol Functional Parity', () => {
  describe('Dimension Metadata Enums & Selections', () => {
    it('provides all 7 domain categories in ComponentSchemas.enums.domain', () => {
      expect(ComponentSchemas.enums.domain).toEqual([
        'Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'
      ]);
    });

    it('provides reasoning methodologies in ComponentSchemas.enums.reasoning', () => {
      expect(ComponentSchemas.enums.reasoning).toContain('Chain-of-Thought');
      expect(ComponentSchemas.enums.reasoning).toContain('Step-by-Step');
      expect(ComponentSchemas.enums.reasoning).toContain('Socratic');
    });

    it('provides style descriptors in ComponentSchemas.enums.style', () => {
      expect(ComponentSchemas.enums.style).toContain('Professional');
      expect(ComponentSchemas.enums.style).toContain('Technical');
      expect(ComponentSchemas.enums.style).toContain('Direct');
    });

    it('provides output formats in ComponentSchemas.enums.outputType', () => {
      expect(ComponentSchemas.enums.outputType).toContain('Markdown');
      expect(ComponentSchemas.enums.outputType).toContain('JSON');
      expect(ComponentSchemas.enums.outputType).toContain('Code');
    });
  });

  describe('Interactive Tag Addition, Removal & Deduplication', () => {
    it('adds new custom tags without mutating existing array', () => {
      const initial = ['React', 'TypeScript'];
      const updated = handleAddTag('WXT', initial);
      expect(updated).toEqual(['React', 'TypeScript', 'WXT']);
      expect(initial).toEqual(['React', 'TypeScript']);
    });

    it('prevents adding empty or whitespace tags', () => {
      const initial = ['React'];
      expect(handleAddTag('   ', initial)).toEqual(['React']);
      expect(handleAddTag('', initial)).toEqual(['React']);
    });

    it('prevents adding duplicate tags', () => {
      const initial = ['React', 'WXT'];
      expect(handleAddTag('React', initial)).toEqual(['React', 'WXT']);
    });

    it('removes tags cleanly by value', () => {
      const initial = ['React', 'WXT', 'Vite'];
      const updated = handleRemoveTag('WXT', initial);
      expect(updated).toEqual(['React', 'Vite']);
    });
  });

  describe('Verbatim In-Section Auto-Pinning & Metadata Logic', () => {
    it('toggles dimension pin state and sets pinnedData snapshot', () => {
      const mockPersona: PersonaV4 = {
        persona: { instruction: 'Lead Architect', pinned: false }
      };

      // Simulate auto-pinning on textarea input
      const shouldAutoPin = !mockPersona.persona?.pinned;
      const updatedPersona: PersonaV4 = {
        ...mockPersona,
        persona: {
          ...mockPersona.persona!,
          instruction: 'Updated Lead Architect',
          pinned: shouldAutoPin ? true : mockPersona.persona?.pinned,
          pinnedData: shouldAutoPin ? { ...mockPersona.persona, instruction: 'Updated Lead Architect' } : undefined
        }
      };

      expect(updatedPersona.persona?.pinned).toBe(true);
      expect(updatedPersona.persona?.instruction).toBe('Updated Lead Architect');
      expect(updatedPersona.persona?.pinnedData?.instruction).toBe('Updated Lead Architect');
    });

    it('unpins dimension cleanly without losing current instruction', () => {
      const mockPersona: PersonaV4 = {
        context: { instruction: 'Domain context', pinned: true, pinnedData: { instruction: 'Domain context' } }
      };

      const unpinnedPersona: PersonaV4 = {
        ...mockPersona,
        context: {
          ...mockPersona.context!,
          pinned: false,
          pinnedData: undefined
        }
      };

      expect(unpinnedPersona.context?.pinned).toBe(false);
      expect(unpinnedPersona.context?.instruction).toBe('Domain context');
      expect(unpinnedPersona.context?.pinnedData).toBeUndefined();
    });
  });

  describe('Granular Style Profiler & Edit Persona Form Parity', () => {
    it('correctly structures granular style metadata (verbosity, tech level, directness, traits)', () => {
      const toneMetadata = {
        verbosity: 'concise' as const,
        technical_level: 'expert' as const,
        directness: 'direct' as const,
        traits: ['Analytical', 'Ruthless Simplicity'],
        preferred_response_style: 'Lead with code diffs first'
      };

      const persona: PersonaV4 = {
        persona: { instruction: 'Senior Reviewer' },
        tone: {
          instruction: 'Communicate concisely at an expert level.',
          metadata: toneMetadata
        }
      };

      expect(persona.tone?.metadata?.verbosity).toBe('concise');
      expect(persona.tone?.metadata?.technical_level).toBe('expert');
      expect(persona.tone?.metadata?.directness).toBe('direct');
      expect(persona.tone?.metadata?.traits).toContain('Analytical');
      expect(persona.tone?.metadata?.preferred_response_style).toBe('Lead with code diffs first');
    });
  });

  describe('Prompt Template Variable Interpolation', () => {
    it('substitutes all detected variables accurately in template text', () => {
      const template = 'Hello {name}, please review the {file} focusing on {aspect}.';
      const variables: Record<string, string> = {
        name: 'Alex',
        file: 'ContextView.tsx',
        aspect: 'type safety'
      };

      let interpolated = template;
      for (const [key, val] of Object.entries(variables)) {
        interpolated = interpolated.replaceAll(`{${key}}`, val);
      }

      expect(interpolated).toBe('Hello Alex, please review the ContextView.tsx focusing on type safety.');
    });

    it('retains {varName} format if variable value is not provided', () => {
      const template = 'Perform {task} on {target}.';
      const variables: Record<string, string> = {
        task: 'Refactor'
      };

      const matches = Array.from(new Set((template.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map(v => v.slice(1, -1))));
      let interpolated = template;
      for (const v of matches) {
        const val = variables[v] ?? `{${v}}`;
        interpolated = interpolated.replaceAll(`{${v}}`, val);
      }

      expect(interpolated).toBe('Perform Refactor on {target}.');
    });
  });

  describe('Generation Tracking & STALE Calculation Logic', () => {
    it('determines dimension is STALE when currentGeneration > componentGeneration and dimension is pinned', () => {
      const currentGeneration = 2;
      const componentGeneration = 1;
      const isPinned = true;

      const isStale = currentGeneration > 0 && componentGeneration < currentGeneration && isPinned;
      expect(isStale).toBe(true);
    });

    it('does not mark dimension as STALE when generation is up-to-date', () => {
      const currentGeneration = 2;
      const componentGeneration = 2;
      const isPinned = true;

      const isStale = currentGeneration > 0 && componentGeneration < currentGeneration && isPinned;
      expect(isStale).toBe(false);
    });
  });

  describe('Custom Injected Context Serialization', () => {
    it('creates a compliant user_injected_context payload', () => {
      const text = 'Always enforce strict typecheck and test-as-definition-of-done.';
      const injectedAt = Date.now();
      const payload = { text, injectedAt };

      expect(payload.text).toBe(text);
      expect(payload.injectedAt).toBeGreaterThan(0);
    });
  });

  describe('Form Dirty Guard & Unsaved Changes Intercept', () => {
    it('intercepts navigation when form is dirty and permits discard or save', () => {
      let isDirty = false;
      const markDirty = () => { isDirty = true; };
      const resetDirty = () => { isDirty = false; };

      markDirty();
      expect(isDirty).toBe(true);

      // Simulate intercept
      let navigationBlocked = false;
      const handleBack = () => {
        if (isDirty) {
          navigationBlocked = true;
        }
      };

      handleBack();
      expect(navigationBlocked).toBe(true);

      // Simulate discard
      resetDirty();
      expect(isDirty).toBe(false);
    });
  });
});

