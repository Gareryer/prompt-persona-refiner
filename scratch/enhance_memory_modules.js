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

// 2. Full unified-analyzer.ts with resilient normalization pipeline
const unifiedCode = `/**
 * @fileoverview UNIFIED ANALYZER v3 - Single-Call Comprehensive Analysis
 * Ported from memory/analyzers/unified-analyzer.js (443 lines)
 * @module memory/analyzers/unified-analyzer
 */

import { ComponentSchemas } from '../component-schemas';
import type { ScrapedMessageTurn } from './recent-focus';
import { logger } from '../../logging/logger';

export const UnifiedAnalyzer = {
  id: 'unified_analyzer',
  inputSource: 'both',

  _formatConversation(messages: ScrapedMessageTurn[]): string {
    return messages.map((pair) => {
      let text = \`--- Turn \${pair.id} ---\\n\`;
      if (pair.user?.prompt) text += \`User: \${pair.user.prompt}\\n\`;
      if (pair.model?.response) {
        const resp = pair.model.response;
        text += \`Assistant: \${resp.substring(0, 500)}\${resp.length > 500 ? '...' : ''}\\n\`;
      }
      if (pair.rating?.value) {
        text += \`[User Rating: \${pair.rating.value}/5 stars]\\n\`;
      }
      return text;
    }).join('\\n');
  },

  _getRatingContext(messages: ScrapedMessageTurn[]): string {
    const ratedCount = messages.filter(m => m.rating?.value).length;
    if (ratedCount === 0) return '';

    const avgRating = (messages.reduce((sum, m) => sum + (m.rating?.value || 0), 0) / ratedCount).toFixed(1);

    return \`
RATING CONTEXT:
\${ratedCount} of \${messages.length} responses rated. Average: \${avgRating}/5 stars.
- 5 stars: Very satisfied, perfectly aligned
- 4 stars: Good, mostly aligned  
- 3 stars: Acceptable
- 2 stars: Unsatisfied
- 1 star: Very unsatisfied
Use ratings to identify what approaches work best for this user.
\`;
  },

  _buildSchema(enabledComponents?: string[] | null): Record<string, any> {
    return ComponentSchemas.buildCombinedSchema(enabledComponents);
  },

  getPrompt(
    messages: ScrapedMessageTurn[],
    enabledComponents: string[] | null = null,
    includeSchemaHints: boolean = false
  ): string {
    const conversationText = this._formatConversation(messages);
    const ratingContext = this._getRatingContext(messages);
    const recentMessages = messages.slice(-3);
    const recentText = this._formatConversation(recentMessages);

    const allDimensions = [
      'persona',
      'context',
      'exemplar',
      'format',
      'tone',
      'framework',
      'constraints'
    ];
    const dimensions = enabledComponents
      ? allDimensions.filter(d => enabledComponents.includes(d))
      : allDimensions;

    const dimensionList = dimensions.join(', ');

    let basePrompt = \`You are the "PERSONA ARCHITECT" - synthesizing Structured Expert Personas from conversation history into 7 balanced, modular dimensions.

## YOUR MISSION
Synthesize a comprehensive, modular Expert Persona from the conversation history across ALL 7 dimensions: \${dimensionList}, plus top-level metadata.

## CRITICAL BALANCE & LENGTH CONSTRAINTS (MANDATORY)
1. **CONCISE & DENSE**: Each dimension's 'instruction' field MUST be 2 to 4 sentences (under 80 words). NEVER write runaway monologues, repetitive essays, or endless descriptions.
2. **DISTRIBUTE ACROSS ALL DIMENSIONS**: Do NOT dump all information into 'persona'. Keep 'persona' strictly for identity/credentials (under 80 words), and populate each specific dimension with its dedicated guidance and structured metadata chips.
3. **GROUNDED & SPECIFIC**: Mention the exact product/technology/domain being discussed (e.g. Claude naming, React, AWS). If not explicitly stated, infer top-tier credentials for that specific subject.
4. **PROPORTIONAL CREDENTIALS**: If the conversation is brief or covers a single focused task, calibrate the persona's credentials and scope proportionally to the subject without inventing exaggerated, fictitious academic backgrounds.

\${ratingContext}

CONVERSATION TO ANALYZE:
\${conversationText}

RECENT MESSAGES (last 3 turns):
\${recentText}

## 7-DIMENSION SPECIFICATIONS

### 1. persona (Identity, Credentials, Background)
- **instruction**: 2-3 sentences (50-70 words max). 'You are [Name], a [Title] specializing in [Primary Subject from conversation] with [Years] years of experience. You hold [Specific credentials: PhD, CFA, etc.]. Your core mission is [Specific goal].'
- **version**: 4, **source**: "synthesis"

### 2. context (Domain, Scope Boundaries, Terminology)
- **instruction**: 2-3 sentences (40-60 words max). 'Apply deep expertise in [Domain], focusing on [Key Areas]. Leverage mastery of [Key Tools/Concepts] to guide responses.'
- **metadata.domain**: One of ["Tech", "Creative", "Business", "Education", "Health", "Lifestyle", "Other"]
- **metadata.scope_tags**: 3-6 specific discrete topics/technologies

### 3. tone (Voice, Style, Banned Phrases)
- **instruction**: 1-2 sentences (20-40 words max). 'Communicate with [Voice/Style], prioritizing [Clarity/Rigor]. Avoid [Anti-patterns].'
- **metadata.style_tags**: 2-4 discrete style descriptors
- **metadata.banned_phrases**: Array of phrases/clichés to avoid

### 4. framework (Methodology, Reasoning, Workflow)
- **instruction**: 2-3 sentences (40-60 words max). 'Structure reasoning using [Named Methodology]. Step 1: [Analysis]. Step 2: [Execution].'
- **metadata.reasoning_type**: One of ["Analytical", "Step-by-Step", "First-Principles", "Chain-of-Thought", "Deductive", "Creative", "Socratic"]

### 5. constraints (Rules, Prohibitions, Requirements)
- **instruction**: 2-3 sentences (40-60 words max). 'Always [Core Requirement]. Never [Core Prohibition]. Ensure responses are [Quality Standard].'
- **metadata.prohibitions**: 2-4 discrete rules
- **metadata.requirements**: 2-4 discrete rules
- **metadata.response_length**: Length directive

### 6. format (Output Type & Structure Preferences)
- **instruction**: 1-2 sentences (20-40 words max). 'Format responses with [Structure]. Use [Markdown headings/Lists/Tables] for clarity.'
- **metadata.output_type**: One of ["Markdown", "Plaintext", "JSON", "Code", "HTML", "Structured", "Custom"]

### 7. exemplar (Few-Shot Examples)
- **instruction**: 2-4 lines (40-80 words max) showing a representative input and ideal expert response snippet.

### 8. metadata (Top-Level Summary)
- **suggested_name**: Exactly 2 to 3 words. A punchy, memorable archetype name.
- **suggested_title**: Professional role in 2 to 4 words
- **domain**: Lowercase domain category
- **primary_intent**: One concise sentence describing core persona purpose

## REQUIRED OUTPUT JSON FORMAT
Return a SINGLE JSON object containing ALL dimensions and metadata:
{
  "persona": { "instruction": "...", "version": 4, "source": "synthesis" },
  "context": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "domain": "Tech", "scope_tags": ["..."] } },
  "tone": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "style_tags": ["..."], "banned_phrases": ["..."] } },
  "framework": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "reasoning_type": "Analytical" } },
  "constraints": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "prohibitions": ["..."], "requirements": ["..."], "response_length": "Structured" } },
  "format": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "output_type": "Markdown" } },
  "exemplar": { "instruction": "...", "version": 4, "source": "synthesis" },
  "metadata": { "suggested_name": "...", "suggested_title": "...", "domain": "tech", "primary_intent": "..." }
}

CRITICAL: Return ONLY the valid JSON object with ALL 8 top-level keys.\`;

    if (includeSchemaHints) {
      basePrompt += \`\\n\\nCRITICAL: Return ONLY valid JSON (no markdown, no code blocks).\`;
    }

    return basePrompt;
  },

  async analyze(
    scrapedData: { messages?: ScrapedMessageTurn[] },
    llmClient: any,
    options: { enabledComponents?: string[] | null } = {}
  ): Promise<Record<string, any> | null> {
    if (!scrapedData?.messages?.length) {
      logger.warn('No messages to analyze in UnifiedAnalyzer');
      return null;
    }

    if (!llmClient?.isConfigured?.() && !llmClient?.call) {
      logger.warn('LLM client not configured for UnifiedAnalyzer');
      return null;
    }

    const enabledComponents = options.enabledComponents || null;

    try {
      const prompt = this.getPrompt(scrapedData.messages, enabledComponents, true);
      const schema = this._buildSchema(enabledComponents);

      const rawResult = await llmClient.call(prompt, {
        json: true,
        schema,
        maxTokens: 8192
      });

      let result = rawResult?.json || rawResult;

      if (!result || typeof result !== 'object') {
        logger.error('Invalid response object from LLMClient in UnifiedAnalyzer');
        return null;
      }

      // Convert array response to object if needed
      if (Array.isArray(result)) {
        const obj: Record<string, any> = {};
        for (const item of result) {
          if (item && typeof item === 'object') {
            const key = (item.id || item.name || item.dimension || item.component || item.type || '').toLowerCase().trim();
            if (key) obj[key] = item;
          }
        }
        if (Object.keys(obj).length > 0) result = obj;
      }

      // Handle wrapped responses from various LLM structures
      const unwrappers = ['memory_layer', 'dimensions', 'components', 'persona_components', 'synthesis', 'data', 'output', 'response', 'result', 'analysis', 'expert_persona'];
      for (const prop of unwrappers) {
        if (result?.[prop] && typeof result[prop] === 'object' && !Array.isArray(result[prop])) {
          result = { ...result[prop], ...result };
        }
      }

      // Lowercase all top-level keys for case-insensitive matching
      const normalizedResult: Record<string, any> = {};
      for (const [k, v] of Object.entries(result)) {
        normalizedResult[k.toLowerCase().trim()] = v;
      }
      result = { ...result, ...normalizedResult };

      // Key alias mapping
      const keyAliases: Record<string, string[]> = {
        persona: ['persona_synthesizer', 'synthesized_persona', 'identity', 'role', 'expert_persona', 'persona_instruction', 'system_prompt', 'persona_prompt', 'expert_identity'],
        context: ['domain_context', 'domain', 'knowledge', 'scope', 'domain_scope', 'context_scope', 'background_context', 'domain_knowledge'],
        tone: ['tone_and_style', 'tone_style', 'style', 'voice', 'voice_and_tone', 'tone_preferences', 'communication_style', 'tone_guide', 'style_guide', 'tone_and_voice', 'voice_tone'],
        framework: ['methodology', 'reasoning', 'workflow', 'reasoning_pattern', 'reasoning_framework', 'method', 'framework_methodology', 'thinking_process', 'approach'],
        constraints: ['rules', 'prohibitions', 'custom_context', 'requirements', 'limits', 'constraints_rules', 'negative_constraints', 'guidelines', 'boundaries', 'rules_and_constraints', 'restrictions', 'limitations'],
        format: ['output_format', 'outputtype', 'output_type', 'structure', 'format_instructions', 'output_preferences', 'output', 'format_structure', 'output_style'],
        exemplar: ['examples', 'exemplars', 'few_shot', 'samples', 'few_shot_examples', 'example_patterns', 'patterns', 'few_shot_patterns', 'sample_dialogues', 'example_interactions', 'sample_conversations', 'few_shot_exemplars']
      };

      for (const [canonicalKey, aliases] of Object.entries(keyAliases)) {
        if (!result[canonicalKey]) {
          for (const alias of aliases) {
            const lowerAlias = alias.toLowerCase();
            if (result[lowerAlias] !== undefined) {
              result[canonicalKey] = result[lowerAlias];
              break;
            }
          }
        }
      }

      // Section deconstruction fallback
      const primaryText = (typeof result.persona?.instruction === 'string' && result.persona.instruction)
        || (typeof result.persona === 'string' && result.persona)
        || (typeof result.instruction === 'string' && result.instruction)
        || '';

      if (primaryText && (!result.context || !result.tone || !result.framework || !result.constraints || !result.format || !result.exemplar)) {
        const sectionRegex = /##+\\s*(?:\\d+\\.\\s*)?([A-Za-z &]+)[\\r\\n]+([\\s\\S]*?)(?=(?:##+\\s*(?:\\d+\\.\\s*)?[A-Za-z &]+|$))/g;
        let match: RegExpExecArray | null;
        while ((match = sectionRegex.exec(primaryText)) !== null) {
          const rawHeading = match[1].toLowerCase().trim();
          const sectionContent = match[2].trim();
          if (!sectionContent) continue;

          for (const [canonicalKey, aliases] of Object.entries(keyAliases)) {
            if (!result[canonicalKey] && (rawHeading.includes(canonicalKey) || aliases.some(a => rawHeading.includes(a)))) {
              result[canonicalKey] = { instruction: sectionContent };
              break;
            }
          }
        }
      }

      const expectedKeys = enabledComponents || [
        'persona',
        'context',
        'exemplar',
        'format',
        'tone',
        'framework',
        'constraints'
      ];

      const timestamp = Date.now();
      const hasAnyValidDimension = expectedKeys.some(k => result[k]);
      if (!hasAnyValidDimension) {
        logger.warn('Response contains no recognized dimension keys in UnifiedAnalyzer');
        return null;
      }

      for (const key of expectedKeys) {
        if (result[key]) {
          if (typeof result[key] === 'string') {
            result[key] = { instruction: result[key] };
          } else if (Array.isArray(result[key])) {
            const textLines = result[key].map((item: any) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                if (item.instruction) return item.instruction;
                if (item.text) return item.text;
                if (item.user && item.ai) return \`User: \${item.user}\\nAI: \${item.ai}\`;
                if (item.rule) return item.rule;
                return JSON.stringify(item);
              }
              return String(item);
            }).filter(Boolean);
            result[key] = { instruction: textLines.join('\\n') };
          }

          if (!result[key].instruction && typeof ComponentSchemas.migrateFromV3 === 'function') {
            const migrated = ComponentSchemas.migrateFromV3(key, result[key]);
            result[key].instruction = migrated.instruction || '';
            result[key].metadata = {
              ...(migrated.metadata || {}),
              ...(result[key].metadata || {})
            };
          }

          const defaultEmpty = ComponentSchemas.createEmpty(key);
          result[key] = {
            ...defaultEmpty,
            ...result[key],
            instruction: (result[key].instruction !== undefined && result[key].instruction !== null)
              ? String(result[key].instruction).trim()
              : '',
            metadata: {
              ...(defaultEmpty.metadata || {}),
              ...(result[key].metadata || {})
            },
            analyzedAt: timestamp,
            messageCount: scrapedData.messages.length,
            _synthesized: true
          };
        } else {
          const empty = ComponentSchemas.createEmpty(key);
          result[key] = {
            ...empty,
            analyzedAt: timestamp,
            messageCount: scrapedData.messages.length,
            _synthesized: true
          };
        }
      }

      return result;
    } catch (error) {
      logger.error('UnifiedAnalyzer execution failed', { error });
      return null;
    }
  }
};
`;

fs.writeFileSync(path.join(memDir, 'analyzers/unified-analyzer.ts'), unifiedCode, 'utf-8');
console.log('Updated src/core/memory/analyzers/unified-analyzer.ts');
