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

    // Top-level metadata
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
  }
};
