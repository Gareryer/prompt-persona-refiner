/**
 * @fileoverview Complete Component Schemas v4 - Verbatim-First 7-Dimension Persona Schema
 * Ported from memory/component-schemas.js (641 lines)
 */

import { z } from 'zod';

export const SCHEMA_VERSION = 4;

export const ComponentSchemas = {
  version: SCHEMA_VERSION,
  componentIds: [
    'persona',
    'context',
    'tone',
    'framework',
    'constraints',
    'format',
    'exemplar'
  ] as const,

  enums: {
    domain: ['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'] as const,
    style: [
      'Professional', 'Casual', 'Technical', 'Friendly', 'Direct',
      'Empathetic', 'Authoritative', 'Formal', 'Informal', 'Academic',
      'Conversational', 'Objective', 'Supportive', 'Educational',
      'Instructive', 'Expert'
    ] as const,
    reasoning: [
      'Deductive', 'Inductive', 'Chain-of-Thought', 'Tree-of-Thought',
      'Step-by-Step', 'Analytical', 'Creative', 'Socratic'
    ] as const,
    outputType: [
      'Markdown', 'Plaintext', 'JSON', 'Code', 'HTML', 'Structured', 'Custom'
    ] as const
  }
};

export const DIMENSION_IDS = ComponentSchemas.componentIds;
export type DimensionId = typeof ComponentSchemas.componentIds[number];

export const DimensionContentSchema = z.object({
  instruction: z.string().min(1, 'Persona instruction is required'),
  version: z.number().optional().default(4),
  pinned: z.boolean().optional(),
  pinnedData: z.record(z.any()).optional(),
  generation: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  updatedAt: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export type DimensionContent = {
  instruction: string;
  version?: number;
  pinned?: boolean;
  pinnedData?: Record<string, any>;
  generation?: number;
  confidence?: number;
  updatedAt?: number;
  metadata?: Record<string, any>;
};

export const PersonaMetadataSchema = z.object({
  suggested_name: z.string().default('AI Persona'),
  suggested_title: z.string().optional().default('Specialist'),
  domain: z.string().optional().default('Tech'),
  author: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  version: z.string().optional().default('1.0.0'),
  is_public: z.boolean().optional().default(false),
  rating: z.number().optional(),
  rating_count: z.number().optional(),
  downloads: z.number().optional()
});

export type PersonaMetadata = {
  suggested_name?: string;
  suggested_title?: string;
  domain?: string;
  author?: string;
  tags?: string[];
  version?: string;
  is_public?: boolean;
  rating?: number;
  rating_count?: number;
  downloads?: number;
  primary_intent?: string;
  target_audience?: string;
  [key: string]: any;
};

export const PersonaV4Schema = z.object({
  id: z.string().optional(),
  persona: DimensionContentSchema.optional(),
  context: DimensionContentSchema.optional(),
  tone: DimensionContentSchema.optional(),
  framework: DimensionContentSchema.optional(),
  constraints: DimensionContentSchema.optional(),
  format: DimensionContentSchema.optional(),
  exemplar: DimensionContentSchema.optional(),
  metadata: PersonaMetadataSchema.optional().default({})
});

export type PersonaV4 = {
  id?: string;
  persona?: DimensionContent;
  context?: DimensionContent;
  tone?: DimensionContent;
  framework?: DimensionContent;
  constraints?: DimensionContent;
  format?: DimensionContent;
  exemplar?: DimensionContent;
  metadata?: PersonaMetadata;
};

export function cleanInstruction(text: string): string {
  if (!text) return '';
  return text
    .replace(/^\s*```(?:json)?/gm, '')
    .replace(/^```\s*$/gm, '')
    .replace(/\r\n/g, '\n')
    .trim();
}

export function createEmptyPersona(): PersonaV4 {
  return {
    persona: { instruction: '' },
    context: { instruction: '' },
    tone: { instruction: '' },
    framework: { instruction: '' },
    constraints: { instruction: '' },
    format: { instruction: '' },
    exemplar: { instruction: '' },
    metadata: {
      suggested_name: 'New Persona',
      suggested_title: 'AI Specialist',
      domain: 'Tech',
      tags: [],
      version: '1.0.0',
      is_public: false
    }
  };
}

export function validatePersona(data: unknown): { success: boolean; data?: PersonaV4; errors?: string[]; error?: z.ZodError } {
  const result = PersonaV4Schema.safeParse(data);
  if (result.success) return { success: true, data: result.data as PersonaV4 };
  return {
    success: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
    error: result.error
  };
}

export const validatePersonaV4 = validatePersona;
