import { describe, it, expect } from 'vitest';
import { buildExtractionPrompt } from '@/core/extractor/prompt-builder';
import { parseExtractionResponse } from '@/core/extractor/resilient-parser';
import { diffWords, renderDiffHtml } from '@/core/refiner/diff-engine';
import { assembleRefinementContext } from '@/core/memory/context-assembler';
import type { PersonaV4 } from '@/core/memory/schemas';

describe('Batch 2: Pure Domain Logic & LLM Parsers', () => {
  it('generates an extraction prompt containing the input query', () => {
    const prompt = buildExtractionPrompt('Refactor this React hook');
    expect(prompt).toContain('PERSONA ARCHITECT');
    expect(prompt).toContain('Refactor this React hook');
  });

  it('resiliently extracts JSON wrapped in markdown blocks', () => {
    const raw = ['Here is the extracted persona:',
      '```json',
      '{',
      '  "memory_layer": {',
      '    "persona": { "instruction": "You are a React architect." },',
      '    "tone": { "instruction": "Direct and concise." }',
      '  },',
      '  "metadata": {',
      '    "suggested_name": "React Mentor"',
      '  }',
      '}',
      '```',
      'Hope this helps!'].join('\n');

    const result = parseExtractionResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.persona.persona?.instruction).toBe('You are a React architect.');
    expect(result?.persona.metadata?.suggested_name).toBe('React Mentor');
  });

  it('handles JSON with trailing commas gracefully', () => {
    const raw = ['{',
      '  "memory_layer": {',
      '    "persona": { "instruction": "You are a Node expert." }',
      '  },',
      '  "metadata": {',
      '    "suggested_name": "Node Pro"',
      '  }',
      '}'].join('\n');
    const result = parseExtractionResponse(raw);
    expect(result).not.toBeNull();
    expect(result?.persona.persona?.instruction).toBe('You are a Node expert.');
  });

  it('computes word-level diff correctly', () => {
    const original = 'Please build a simple dashboard';
    const modified = 'Please build a high-performance modern dashboard';

    const fragments = diffWords(original, modified);
    expect(fragments.length).toBeGreaterThan(1);
    
    const html = renderDiffHtml(original, modified);
    expect(html).toContain('diff-added');
    expect(html).toContain('high-performance');
    expect(html).toContain('modern');
  });

  it('assembles refinement context from active dimensions', () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'You are an engineer.' },
      constraints: { instruction: 'Never use any.' }
    };

    const assembled = assembleRefinementContext(persona, ['persona', 'constraints']);
    expect(assembled.activeDimensions).toEqual(['persona', 'constraints']);
    expect(assembled.systemPrompt).toContain('[PERSONA]');
    expect(assembled.systemPrompt).toContain('[CONSTRAINTS]');
    expect(assembled.systemPrompt).toContain('Never use any.');
  });
});