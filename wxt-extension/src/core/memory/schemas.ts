import { z } from 'zod';

export const SCHEMA_VERSION = 4 as const;

export const DIMENSION_IDS = [
  'persona',
  'context',
  'tone',
  'framework',
  'constraints',
  'format',
  'exemplar'
] as const;

export type DimensionId = (typeof DIMENSION_IDS)[number];

export const ENUMS = {
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
};

// Dimension Schemas
export const PersonaDimensionSchema = z.object({
  instruction: z.string().min(1, 'Persona instruction is required')
});

export const ContextMetadataSchema = z.object({
  domain: z.string().optional(),
  scope_tags: z.array(z.string()).optional()
}).optional();

export const ContextDimensionSchema = z.object({
  instruction: z.string().min(1, 'Context instruction is required'),
  metadata: ContextMetadataSchema
});

export const ToneMetadataSchema = z.object({
  style_tags: z.array(z.string()).optional(),
  banned_phrases: z.array(z.string()).optional()
}).optional();

export const ToneDimensionSchema = z.object({
  instruction: z.string().min(1, 'Tone instruction is required'),
  metadata: ToneMetadataSchema
});

export const FrameworkMetadataSchema = z.object({
  reasoning_type: z.string().optional()
}).optional();

export const FrameworkDimensionSchema = z.object({
  instruction: z.string().min(1, 'Framework instruction is required'),
  metadata: FrameworkMetadataSchema
});

export const ConstraintsMetadataSchema = z.object({
  prohibitions: z.array(z.string()).optional(),
  requirements: z.array(z.string()).optional(),
  response_length: z.string().optional()
}).optional();

export const ConstraintsDimensionSchema = z.object({
  instruction: z.string().min(1, 'Constraints instruction is required'),
  metadata: ConstraintsMetadataSchema
});

export const FormatMetadataSchema = z.object({
  output_type: z.string().optional()
}).optional();

export const FormatDimensionSchema = z.object({
  instruction: z.string().min(1, 'Format instruction is required'),
  metadata: FormatMetadataSchema
});

export const ExemplarDimensionSchema = z.object({
  instruction: z.string().min(1, 'Exemplar instruction is required')
});

export const PersonaMetadataSchema = z.object({
  suggested_name: z.string().optional(),
  suggested_title: z.string().optional(),
  domain: z.string().optional(),
  primary_intent: z.string().optional(),
  target_audience: z.string().optional(),
  key_strengths: z.array(z.string()).optional(),
  complexity_level: z.string().optional(),
  trigger_keywords: z.array(z.string()).optional()
});

export const PersonaV4Schema = z.object({
  metadata: PersonaMetadataSchema.optional(),
  persona: PersonaDimensionSchema.optional(),
  context: ContextDimensionSchema.optional(),
  tone: ToneDimensionSchema.optional(),
  framework: FrameworkDimensionSchema.optional(),
  constraints: ConstraintsDimensionSchema.optional(),
  format: FormatDimensionSchema.optional(),
  exemplar: ExemplarDimensionSchema.optional()
});

export type PersonaDimension = z.infer<typeof PersonaDimensionSchema>;
export type ContextDimension = z.infer<typeof ContextDimensionSchema>;
export type ToneDimension = z.infer<typeof ToneDimensionSchema>;
export type FrameworkDimension = z.infer<typeof FrameworkDimensionSchema>;
export type ConstraintsDimension = z.infer<typeof ConstraintsDimensionSchema>;
export type FormatDimension = z.infer<typeof FormatDimensionSchema>;
export type ExemplarDimension = z.infer<typeof ExemplarDimensionSchema>;
export type PersonaMetadata = z.infer<typeof PersonaMetadataSchema>;
export type PersonaV4 = z.infer<typeof PersonaV4Schema>;

export type DimensionValue =
  | PersonaDimension
  | ContextDimension
  | ToneDimension
  | FrameworkDimension
  | ConstraintsDimension
  | FormatDimension
  | ExemplarDimension;

/**
 * Validates a candidate Persona V4 payload against the Zod schema.
 */
export function validatePersonaV4(data: unknown): { success: boolean; data?: PersonaV4; error?: z.ZodError } {
  const result = PersonaV4Schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Strips markdown codeblocks and sanitizes string content.
 */
export function cleanInstruction(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/^[`]{3}(?:json)?/gim, '')
    .replace(/[`]{3}$/gim, '')
    .trim();
}
