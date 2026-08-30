import { describe, it, expect } from 'vitest';
import {
  validatePersonaV4,
  cleanInstruction,
  DIMENSION_IDS,
  SCHEMA_VERSION,
  type PersonaV4
} from '@/core/memory/schemas';

describe('V4 7-Dimension Persona Schemas', () => {
  it('has version 4 and 7 dimensions in processing order', () => {
    expect(SCHEMA_VERSION).toBe(4);
    expect(DIMENSION_IDS).toEqual([
      'persona',
      'context',
      'tone',
      'framework',
      'constraints',
      'format',
      'exemplar'
    ]);
  });

  it('validates a complete golden master V4 persona', () => {
    const goldenPersona: PersonaV4 = {
      metadata: {
        suggested_name: 'Prompt Architect',
        suggested_title: 'AI Systems Engineer',
        domain: 'Tech',
        primary_intent: 'Design robust LLM prompt pipelines',
        target_audience: 'Developers',
        key_strengths: ['Prompt Engineering', 'TypeScript', 'Architecture'],
        complexity_level: 'Advanced',
        trigger_keywords: ['prompt', 'refine', 'persona']
      },
      persona: {
        instruction: 'You are a Senior AI Architect specializing in prompt refinement and memory architectures.'
      },
      context: {
        instruction: 'Focus on Chrome Extension MV3, WXT framework, TypeScript, and modern chatbot SPAs.',
        metadata: {
          domain: 'Tech',
          scope_tags: ['WXT', 'TypeScript', 'MV3']
        }
      },
      tone: {
        instruction: 'Write with technical precision, clarity, and calibrated uncertainty. Avoid buzzwords.',
        metadata: {
          style_tags: ['Technical', 'Direct', 'Expert'],
          banned_phrases: ['game changer', 'paradigm shift']
        }
      },
      framework: {
        instruction: 'Apply Leaf-to-Root dependency ordering and the 5-Gate SLADE verification pipeline.',
        metadata: {
          reasoning_type: 'Step-by-Step'
        }
      },
      constraints: {
        instruction: 'NEVER perform destructive operations without confirmation. ALWAYS maintain zero legacy regressions.',
        metadata: {
          prohibitions: ['Do not guess on conflict', 'Do not break legacy build'],
          requirements: ['Pass all 5 gates before commit'],
          response_length: 'Concise'
        }
      },
      format: {
        instruction: 'Format using standard Markdown with Mermaid diagrams and structured tables.',
        metadata: {
          output_type: 'Markdown'
        }
      },
      exemplar: {
        instruction: 'User: How do we migrate?\\nAI: We use the Strangler Fig pattern.'
      }
    };

    const validation = validatePersonaV4(goldenPersona);
    expect(validation.success).toBe(true);
    expect(validation.data?.metadata?.suggested_name).toBe('Prompt Architect');
  });

  it('allows partial dimensions while preserving instruction integrity', () => {
    const partialPersona = {
      persona: {
        instruction: 'You are a minimalist developer.'
      },
      tone: {
        instruction: 'Direct and concise.'
      }
    };

    const validation = validatePersonaV4(partialPersona);
    expect(validation.success).toBe(true);
    expect(validation.data?.persona?.instruction).toBe('You are a minimalist developer.');
    expect(validation.data?.context).toBeUndefined();
  });

  it('rejects dimensions with empty instructions', () => {
    const invalidPersona = {
      persona: {
        instruction: ''
      }
    };

    const validation = validatePersonaV4(invalidPersona);
    expect(validation.success).toBe(false);
    expect(validation.error?.issues[0]?.message).toContain('Persona instruction is required');
  });

  it('cleans markdown backticks from raw LLM output', () => {
    const raw = '```json\n{"instruction": "test"}\n```';
    const cleaned = cleanInstruction(raw);
    expect(cleaned).toBe('{"instruction": "test"}');
  });
});
