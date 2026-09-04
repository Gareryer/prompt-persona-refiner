/**
 * @fileoverview Component Schemas v4 - Verbatim-First 7-Dimension Persona Schema
 * Ported from memory/component-schemas.js (641 lines)
 * @module memory/component-schemas
 */

export interface SchemaProperty {
  type: string;
  description?: string;
  items?: { type: string };
  properties?: Record<string, SchemaProperty>;
  required?: string[];
}

export interface DimensionSchema {
  type: string;
  properties: Record<string, SchemaProperty>;
  required: string[];
}

export const ComponentSchemas = {
  version: 4,

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
    domain: ['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'],
    style: [
      'Professional', 'Casual', 'Technical', 'Friendly', 'Direct',
      'Empathetic', 'Authoritative', 'Formal', 'Informal', 'Academic',
      'Conversational', 'Objective', 'Supportive', 'Educational',
      'Instructive', 'Expert'
    ],
    reasoning: [
      'Deductive', 'Inductive', 'Chain-of-Thought', 'Tree-of-Thought',
      'Step-by-Step', 'Analytical', 'Creative', 'Socratic'
    ],
    outputType: [
      'Markdown', 'Plaintext', 'JSON', 'Code', 'HTML', 'Structured', 'Custom'
    ]
  },

  schemas: {
    persona: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "Complete identity description: 'You are [Name], a [role]. Your purpose is [purpose]. You have [credentials]...'"
        }
      },
      required: ['instruction']
    },
    context: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Domain knowledge, scope boundaries, terminology, project-specific context'
        },
        metadata: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Primary domain category'
            },
            scope_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Topics in scope'
            }
          }
        }
      },
      required: ['instruction']
    },
    tone: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "Full style guide: 'Write with a [voice]. Be [adjectives]. Avoid [phrases]...'"
        },
        metadata: {
          type: 'object',
          properties: {
            style_tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Style descriptors'
            },
            banned_phrases: {
              type: 'array',
              items: { type: 'string' },
              description: 'Phrases to avoid'
            }
          }
        }
      },
      required: ['instruction']
    },
    framework: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "Methodology and workflow: 'Follow the [method]. Step 1: [action]. If [condition], then...'"
        },
        metadata: {
          type: 'object',
          properties: {
            reasoning_type: {
              type: 'string',
              description: 'Reasoning approach'
            }
          }
        }
      },
      required: ['instruction']
    },
    constraints: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "Full rules text: 'NEVER do [X]. ALWAYS do [Y]. Maximum [Z] words.'"
        },
        metadata: {
          type: 'object',
          properties: {
            prohibitions: {
              type: 'array',
              items: { type: 'string' },
              description: 'NEVER rules'
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'MUST rules'
            },
            response_length: {
              type: 'string',
              description: 'Length limit'
            }
          }
        }
      },
      required: ['instruction']
    },
    format: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: "Format instructions: 'Format as [type]. Use [structure]. Start with [greeting]...'"
        },
        metadata: {
          type: 'object',
          properties: {
            output_type: {
              type: 'string',
              description: 'Primary output format'
            }
          }
        }
      },
      required: ['instruction']
    },
    exemplar: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'Few-shot exemplar patterns'
        }
      },
      required: ['instruction']
    }
  } as Record<string, DimensionSchema>,

  getSchema(dimensionId: string): DimensionSchema | undefined {
    return this.schemas[dimensionId];
  },

  buildCombinedSchema(enabledDimensions?: string[] | null): Record<string, any> {
    const ids = enabledDimensions || this.componentIds;
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const id of ids) {
      if (this.schemas[id]) {
        properties[id] = this.schemas[id];
        required.push(id);
      }
    }

    properties.metadata = {
      type: 'object',
      properties: {
        suggested_name: { type: 'string' },
        suggested_title: { type: 'string' },
        domain: { type: 'string' },
        primary_intent: { type: 'string' }
      },
      required: ['suggested_name', 'domain']
    };

    return {
      type: 'object',
      properties,
      required
    };
  },

  validate(dimensionId: string, data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      errors.push(`Dimension '${dimensionId}' must be an object`);
      return { valid: false, errors };
    }

    if (!data.instruction && typeof data.instruction !== 'string') {
      errors.push(`Dimension '${dimensionId}' is missing required 'instruction' string`);
    }

    return { valid: errors.length === 0, errors };
  },

  createEmpty(componentId: string): { instruction: string; version: number; source: string; metadata?: Record<string, any> } {
    const base: { instruction: string; version: number; source: string; metadata?: Record<string, any> } = {
      instruction: '',
      version: 4,
      source: 'manual'
    };

    switch (componentId) {
      case 'context':
        base.metadata = { domain: null, scope_tags: [] };
        break;
      case 'tone':
        base.metadata = { style_tags: [], banned_phrases: [] };
        break;
      case 'framework':
        base.metadata = { reasoning_type: null };
        break;
      case 'constraints':
        base.metadata = { prohibitions: [], requirements: [], response_length: null };
        break;
      case 'format':
        base.metadata = { output_type: null };
        break;
    }

    return base;
  },

  migrateFromV3(componentId: string, v3Data: any): { instruction: string; version: number; source: string; metadata?: Record<string, any> } {
    if (!v3Data) return this.createEmpty(componentId);

    const v4: { instruction: string; version: number; source: string; metadata?: Record<string, any> } = {
      instruction: '',
      version: 4,
      source: 'migration'
    };

    switch (componentId) {
      case 'persona': {
        const parts: string[] = [];
        if (v3Data.name) parts.push(`You are ${v3Data.name}.`);
        if (v3Data.role) parts.push(`Role: ${v3Data.role}.`);
        if (v3Data.purpose) parts.push(`Purpose: ${v3Data.purpose}.`);
        if (v3Data.credentials?.qualifications?.length) {
          parts.push(`Qualifications: ${v3Data.credentials.qualifications.join(', ')}.`);
        }
        v4.instruction = parts.join(' ');
        break;
      }
      case 'context': {
        const parts: string[] = [];
        if (v3Data.domain) parts.push(`Domain: ${v3Data.domain}.`);
        if (v3Data.knowledge_boundaries?.scope) {
          parts.push(`Scope: ${v3Data.knowledge_boundaries.scope}.`);
        }
        if (v3Data.terminology?.length) {
          const terms = v3Data.terminology.map((t: any) => `${t.term}: ${t.definition}`);
          parts.push(`Terminology: ${terms.join('; ')}.`);
        }
        v4.instruction = parts.join(' ');
        v4.metadata = {
          domain: v3Data.domain || null,
          scope_tags: v3Data.knowledge_boundaries?.out_of_scope || []
        };
        break;
      }
      case 'tone': {
        const parts: string[] = [];
        if (v3Data.voice) parts.push(`Voice: ${v3Data.voice}.`);
        if (v3Data.style) parts.push(`Style: ${v3Data.style}.`);
        if (v3Data.verbosity?.level) parts.push(`Verbosity: ${v3Data.verbosity.level}.`);
        if (v3Data.banned_phrases?.length) {
          parts.push(`Avoid: ${v3Data.banned_phrases.join(', ')}.`);
        }
        v4.instruction = parts.join(' ');
        v4.metadata = {
          style_tags: v3Data.style ? [v3Data.style] : [],
          banned_phrases: v3Data.banned_phrases || []
        };
        break;
      }
      case 'framework': {
        const parts: string[] = [];
        if (v3Data.methodology?.name) parts.push(`Methodology: ${v3Data.methodology.name}.`);
        if (v3Data.methodology?.steps?.length) {
          const steps = v3Data.methodology.steps.map((s: any) =>
            typeof s === 'string' ? s : `${s.name || ''}: ${s.action || ''}`
          );
          parts.push(`Steps: ${steps.join(' → ')}.`);
        }
        if (v3Data.reasoning_pattern) parts.push(`Reasoning: ${v3Data.reasoning_pattern}.`);
        v4.instruction = parts.join(' ');
        v4.metadata = { reasoning_type: null };
        break;
      }
      case 'constraints': {
        const parts: string[] = [];
        if (v3Data.prohibitions?.length) {
          const rules = v3Data.prohibitions.map((p: any) => typeof p === 'string' ? p : p.rule);
          parts.push(`NEVER: ${rules.join('; ')}.`);
        }
        if (v3Data.requirements?.length) {
          const reqs = v3Data.requirements.map((r: any) => typeof r === 'string' ? r : r.rule);
          parts.push(`MUST: ${reqs.join('; ')}.`);
        }
        if (v3Data.thresholds?.length) {
          const limits = v3Data.thresholds.map((t: any) => `${t.metric}: ${t.limit}`);
          parts.push(`Limits: ${limits.join(', ')}.`);
        }
        v4.instruction = parts.join(' ');
        v4.metadata = {
          prohibitions: v3Data.prohibitions?.map((p: any) => typeof p === 'string' ? p : p.rule) || [],
          requirements: v3Data.requirements?.map((r: any) => typeof r === 'string' ? r : r.rule) || [],
          response_length: v3Data.thresholds?.find((t: any) =>
            t.metric?.toLowerCase().includes('length') || t.metric?.toLowerCase().includes('word')
          )?.limit || null
        };
        break;
      }
      case 'format': {
        const parts: string[] = [];
        if (v3Data.output_type) parts.push(`Output type: ${v3Data.output_type}.`);
        if (v3Data.structure) {
          const prefs: string[] = [];
          if (v3Data.structure.use_headers) prefs.push('headers');
          if (v3Data.structure.use_lists) prefs.push('lists');
          if (v3Data.structure.use_code_blocks) prefs.push('code blocks');
          if (v3Data.structure.use_tables) prefs.push('tables');
          if (prefs.length) parts.push(`Use: ${prefs.join(', ')}.`);
        }
        if (v3Data.special_syntax?.length) {
          parts.push(`Special syntax: ${v3Data.special_syntax.join(', ')}.`);
        }
        v4.instruction = parts.join(' ');
        v4.metadata = { output_type: v3Data.output_type || null };
        break;
      }
      case 'exemplar': {
        const parts: string[] = [];
        if (v3Data.good_examples?.length) {
          v3Data.good_examples.forEach((ex: any, i: number) => {
            parts.push(`Example ${i + 1}:`);
            if (ex.input) parts.push(`User: ${ex.input}`);
            if (ex.output) parts.push(`AI: ${ex.output}`);
            parts.push('---');
          });
        }
        v4.instruction = parts.join('\n');
        break;
      }
      default:
        v4.instruction = JSON.stringify(v3Data);
    }

    return v4;
  },

  getDimensionLabels(): Record<string, string> {
    return {
      persona: 'Persona',
      context: 'Domain Context',
      tone: 'Tone & Style',
      framework: 'Framework',
      constraints: 'Constraints',
      format: 'Output Format',
      exemplar: 'Examples'
    };
  },

  buildSchemaHintsPrompt(componentIds: string[] | null = null): string {
    const ids = componentIds || this.componentIds;
    const hints: Record<string, any> = {};
    for (const id of ids) {
      hints[id] = this.createEmpty(id);
      hints[id].instruction = `<${id} instructions here>`;
    }
    return JSON.stringify(hints, null, 2);
  }
};

fs.writeFileSync(path.join(memDir, 'component-schemas.ts'), compSchemasCode, 'utf-8');
console.log('Updated src/core/memory/component-schemas.ts');
