/**
 * @fileoverview Component Schemas v4 - Verbatim-First 7-Dimension Persona Schema
 * 
 * @description
 * Schema v4 redesigns the memory layer to prioritize VERBATIM text preservation.
 * Each dimension has:
 * - `instruction`: Primary free-form text (NEVER lost, always preserved)
 * - `metadata`: Optional structured fields for UI organization/filtering
 * 
 * This eliminates information loss that occurred in v3 when rich descriptions
 * were forced into rigid enum fields.
 * 
 * 7 DIMENSIONS:
 * 1. persona     - Identity, credentials, background
 * 2. context     - Domain, scope, terminology
 * 3. tone        - Voice, style, banned phrases
 * 4. framework   - Methodology, reasoning, workflow
 * 5. constraints - Rules, prohibitions, requirements
 * 6. format      - Output type, structure preferences
 * 7. exemplar    - Few-shot examples (VERBATIM only)
 * 
 * @module memory/component-schemas
 * @requires none
 * 
 * @example
 * const schema = ComponentSchemas.getSchema('tone');
 * const combined = ComponentSchemas.buildCombinedSchema(['persona', 'tone']);
 */

// ============================================================================
// SECTION 1: SCHEMA DEFINITION
// ============================================================================

const ComponentSchemas = {
    /**
     * Schema version for migrations
     * @type {number}
     */
    version: 4,

    /**
     * All dimension IDs in processing order
     * @type {string[]}
     */
    componentIds: [
        'persona',
        'context',
        'tone',
        'framework',
        'constraints',
        'format',
        'exemplar'
    ],

    // ========================================================================
    // SECTION 2: ENUM DEFINITIONS (for UI chip options)
    // ========================================================================

    /**
     * Pre-populated chip options for single/multi-select UI
     * @type {Object}
     */
    enums: {
        /** Domain categories for context dimension */
        domain: ['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'],

        /** Style tags for tone dimension (multi-select) */
        style: [
            'Professional', 'Casual', 'Technical', 'Friendly', 'Direct',
            'Empathetic', 'Authoritative', 'Formal', 'Informal', 'Academic',
            'Conversational', 'Objective', 'Supportive', 'Educational',
            'Instructive', 'Expert'
        ],

        /** Reasoning types for framework dimension (single-select) */
        reasoning: [
            'Deductive', 'Inductive', 'Chain-of-Thought', 'Tree-of-Thought',
            'Step-by-Step', 'Analytical', 'Creative', 'Socratic'
        ],

        /** Output types for format dimension (single-select) */
        outputType: [
            'Markdown', 'Plaintext', 'JSON', 'Code', 'HTML', 'Structured', 'Custom'
        ]
    },

    // ========================================================================
    // SECTION 3: V4 SCHEMAS (Verbatim-First Design)
    // ========================================================================

    /**
     * Individual component schemas
     * Each dimension follows the pattern:
     * - instruction (string, required): Verbatim text content
     * - metadata (object, optional): Structured fields for UI
     * @type {Object}
     */
    schemas: {
        // ====================================================================
        // DIMENSION 1: PERSONA - Identity, credentials, background
        // Textarea only - no structured metadata needed
        // ====================================================================
        persona: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Complete identity description: 'You are [Name], a [role]. Your purpose is [purpose]. You have [credentials]...'"
                }
            },
            required: ["instruction"]
        },

        // ====================================================================
        // DIMENSION 2: CONTEXT - Domain, scope, terminology
        // Metadata: domain (single-select), scope_tags (multi-select)
        // ====================================================================
        context: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Domain knowledge, scope boundaries, terminology, project-specific context"
                },
                metadata: {
                    type: "object",
                    properties: {
                        domain: {
                            type: "string",
                            description: "Primary domain category: Tech, Creative, Business, Education, Health, Lifestyle, Other"
                        },
                        scope_tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Topics in scope (multi-select + custom tags)"
                        }
                    },
                    required: ["domain", "scope_tags"]
                }
            },
            required: ["instruction", "metadata"]
        },

        // ====================================================================
        // DIMENSION 3: TONE - Voice, style, banned phrases
        // Metadata: style_tags (multi-select), banned_phrases (multi-select)
        // ====================================================================
        tone: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Full style guide: 'Write with a [voice]. Be [adjectives]. Avoid [phrases]...'"
                },
                metadata: {
                    type: "object",
                    properties: {
                        style_tags: {
                            type: "array",
                            items: { type: "string" },
                            description: "Style descriptors (multi-select from enum + custom)"
                        },
                        banned_phrases: {
                            type: "array",
                            items: { type: "string" },
                            description: "Phrases to avoid (multi-select + custom)"
                        }
                    },
                    required: ["style_tags", "banned_phrases"]
                }
            },
            required: ["instruction", "metadata"]
        },

        // ====================================================================
        // DIMENSION 4: FRAMEWORK - Methodology, reasoning, workflow
        // Metadata: reasoning_type (single-select chip)
        // ====================================================================
        framework: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Methodology and workflow: 'Follow the [method]. Step 1: [action]. If [condition], then...'"
                },
                metadata: {
                    type: "object",
                    properties: {
                        reasoning_type: {
                            type: "string",
                            description: "Reasoning approach (single-select chip)"
                        }
                    },
                    required: ["reasoning_type"]
                }
            },
            required: ["instruction", "metadata"]
        },

        // ====================================================================
        // DIMENSION 5: CONSTRAINTS - Rules, prohibitions, requirements
        // Metadata: prohibitions, requirements, response_length (auto-generated if empty)
        // ====================================================================
        constraints: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Full rules text: 'NEVER do [X]. ALWAYS do [Y]. Maximum [Z] words.'"
                },
                metadata: {
                    type: "object",
                    properties: {
                        prohibitions: {
                            type: "array",
                            items: { type: "string" },
                            description: "NEVER rules (auto-generated if empty)"
                        },
                        requirements: {
                            type: "array",
                            items: { type: "string" },
                            description: "MUST rules (auto-generated if empty)"
                        },
                        response_length: {
                            type: "string",
                            description: "Length limit e.g., '500 words' (auto-generated if empty)"
                        }
                    },
                    required: ["prohibitions", "requirements", "response_length"]
                }
            },
            required: ["instruction", "metadata"]
        },

        // ====================================================================
        // DIMENSION 6: FORMAT - Output type, structure preferences
        // Metadata: output_type (single-select chip)
        // ====================================================================
        format: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Format instructions: 'Format as [type]. Use [structure]. Start with [greeting]...'"
                },
                metadata: {
                    type: "object",
                    properties: {
                        output_type: {
                            type: "string",
                            description: "Primary output format (single-select chip)"
                        }
                    },
                    required: ["output_type"]
                }
            },
            required: ["instruction", "metadata"]
        },

        // ====================================================================
        // DIMENSION 7: EXEMPLAR - Few-shot examples
        // Textarea only - examples are inherently verbatim
        // ====================================================================
        exemplar: {
            type: "object",
            properties: {
                instruction: {
                    type: "string",
                    description: "Raw few-shot examples: 'User: ...\\nAI: ...\\n---\\nUser: ...\\nAI: ...'"
                }
            },
            required: ["instruction"]
        },

        // ====================================================================
        // TOP-LEVEL METADATA: Persona summary & taxonomy
        // ====================================================================
        metadata: {
            type: "object",
            properties: {
                suggested_name: {
                    type: "string",
                    description: "2-4 word memorable name for this persona based on role/domain"
                },
                suggested_title: {
                    type: "string",
                    description: "Professional title or role (e.g., 'Chief AI Architect', 'Senior Tax Consultant')"
                },
                domain: {
                    type: "string",
                    description: "Primary domain: 'tech' | 'creative' | 'business' | 'education' | 'health' | 'lifestyle' | 'other'"
                },
                primary_intent: {
                    type: "string",
                    description: "One sentence describing persona purpose"
                }
            },
            required: ["suggested_name", "suggested_title", "domain", "primary_intent"]
        }
    },

    // ========================================================================
    // SECTION 4: HELPER METHODS
    // ========================================================================

    /**
     * Get schema for a specific component
     * 
     * @param {string} componentId - Component identifier
     * @returns {Object|null} Schema or null if not found
     * 
     * @example
     * const toneSchema = ComponentSchemas.getSchema('tone');
     */
    getSchema(componentId) {
        return this.schemas[componentId] || null;
    },

    /**
     * Get enum options for a specific field
     * 
     * @param {string} enumKey - Key from enums object
     * @returns {string[]|null} Array of options or null
     * 
     * @example
     * const styles = ComponentSchemas.getEnumOptions('style');
     */
    getEnumOptions(enumKey) {
        return this.enums[enumKey] || null;
    },

    /**
     * Build combined schema for multiple components (for API response)
     * 
     * @param {string[]|null} componentIds - Array of component IDs (null = all)
     * @returns {Object} Combined JSON Schema
     * 
     * @example
     * const fullSchema = ComponentSchemas.buildCombinedSchema();
     * const partialSchema = ComponentSchemas.buildCombinedSchema(['persona', 'tone']);
     */
    buildCombinedSchema(componentIds = null) {
        const ids = componentIds ? [...componentIds] : [...this.componentIds];
        if (!ids.includes('metadata')) {
            ids.push('metadata');
        }
        const properties = {};
        const required = [];

        for (const id of ids) {
            if (this.schemas[id]) {
                properties[id] = this.schemas[id];
                required.push(id);
            }
        }

        return {
            type: "object",
            properties,
            required
        };
    },

    /**
     * Validate data against component schema (basic validation)
     * 
     * @param {string} componentId - Component identifier
     * @param {Object} data - Data to validate
     * @returns {{ valid: boolean, errors: string[] }} Validation result
     * 
     * @example
     * const result = ComponentSchemas.validate('tone', toneData);
     * if (!result.valid) console.log(result.errors);
     */
    validate(componentId, data) {
        const schema = this.schemas[componentId];
        if (!schema) {
            return { valid: false, errors: [`Unknown component: ${componentId}`] };
        }

        const errors = [];

        // === Check instruction field (required for all v4 dimensions except metadata) ===
        if (componentId !== 'metadata') {
            if (typeof data?.instruction !== 'string') {
                errors.push(`Missing or invalid 'instruction' field`);
            }
        }

        // === Validate metadata if present ===
        if (data.metadata && typeof data.metadata !== 'object') {
            errors.push(`'metadata' should be an object`);
        }

        return { valid: errors.length === 0, errors };
    },

    /**
     * Create empty v4 dimension with default structure
     * 
     * @param {string} componentId - Component identifier
     * @returns {Object} Empty dimension object
     * 
     * @example
     * const emptyTone = ComponentSchemas.createEmpty('tone');
     */
    createEmpty(componentId) {
        const base = {
            instruction: '',
            version: 4,
            source: 'manual'
        };

        // Add empty metadata based on dimension
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
            default:
                // persona and exemplar have no metadata
                break;
        }

        return base;
    },

    /**
     * Migrate v3 dimension data to v4 format
     * Converts structured v3 fields into verbatim instruction text
     * 
     * @param {string} componentId - Component identifier
     * @param {Object} v3Data - v3 format data
     * @returns {Object} v4 format data
     * 
     * @example
     * const v4Tone = ComponentSchemas.migrateFromV3('tone', v3ToneData);
     */
    migrateFromV3(componentId, v3Data) {
        if (!v3Data) return this.createEmpty(componentId);

        const v4 = {
            instruction: '',
            version: 4,
            source: 'migration'
        };

        switch (componentId) {
            case 'persona':
                // Build instruction from v3 fields
                const personaParts = [];
                if (v3Data.name) personaParts.push(`You are ${v3Data.name}.`);
                if (v3Data.role) personaParts.push(`Role: ${v3Data.role}.`);
                if (v3Data.purpose) personaParts.push(`Purpose: ${v3Data.purpose}.`);
                if (v3Data.credentials?.qualifications?.length) {
                    personaParts.push(`Qualifications: ${v3Data.credentials.qualifications.join(', ')}.`);
                }
                v4.instruction = personaParts.join(' ');
                break;

            case 'context':
                const contextParts = [];
                if (v3Data.domain) contextParts.push(`Domain: ${v3Data.domain}.`);
                if (v3Data.knowledge_boundaries?.scope) {
                    contextParts.push(`Scope: ${v3Data.knowledge_boundaries.scope}.`);
                }
                if (v3Data.terminology?.length) {
                    const terms = v3Data.terminology.map(t => `${t.term}: ${t.definition}`);
                    contextParts.push(`Terminology: ${terms.join('; ')}.`);
                }
                v4.instruction = contextParts.join(' ');
                v4.metadata = {
                    domain: v3Data.domain || null,
                    scope_tags: v3Data.knowledge_boundaries?.out_of_scope || []
                };
                break;

            case 'tone':
                const toneParts = [];
                if (v3Data.voice) toneParts.push(`Voice: ${v3Data.voice}.`);
                if (v3Data.style) toneParts.push(`Style: ${v3Data.style}.`);
                if (v3Data.verbosity?.level) toneParts.push(`Verbosity: ${v3Data.verbosity.level}.`);
                if (v3Data.banned_phrases?.length) {
                    toneParts.push(`Avoid: ${v3Data.banned_phrases.join(', ')}.`);
                }
                v4.instruction = toneParts.join(' ');
                v4.metadata = {
                    style_tags: v3Data.style ? [v3Data.style] : [],
                    banned_phrases: v3Data.banned_phrases || []
                };
                break;

            case 'framework':
                const fwParts = [];
                if (v3Data.methodology?.name) fwParts.push(`Methodology: ${v3Data.methodology.name}.`);
                if (v3Data.methodology?.steps?.length) {
                    const steps = v3Data.methodology.steps.map(s =>
                        typeof s === 'string' ? s : `${s.name || ''}: ${s.action || ''}`
                    );
                    fwParts.push(`Steps: ${steps.join(' → ')}.`);
                }
                if (v3Data.reasoning_pattern) fwParts.push(`Reasoning: ${v3Data.reasoning_pattern}.`);
                v4.instruction = fwParts.join(' ');
                v4.metadata = {
                    reasoning_type: null // Would need to infer from v3 data
                };
                break;

            case 'constraints':
                const cParts = [];
                if (v3Data.prohibitions?.length) {
                    const rules = v3Data.prohibitions.map(p =>
                        typeof p === 'string' ? p : p.rule
                    );
                    cParts.push(`NEVER: ${rules.join('; ')}.`);
                }
                if (v3Data.requirements?.length) {
                    const reqs = v3Data.requirements.map(r =>
                        typeof r === 'string' ? r : r.rule
                    );
                    cParts.push(`MUST: ${reqs.join('; ')}.`);
                }
                if (v3Data.thresholds?.length) {
                    const limits = v3Data.thresholds.map(t => `${t.metric}: ${t.limit}`);
                    cParts.push(`Limits: ${limits.join(', ')}.`);
                }
                v4.instruction = cParts.join(' ');
                v4.metadata = {
                    prohibitions: v3Data.prohibitions?.map(p => typeof p === 'string' ? p : p.rule) || [],
                    requirements: v3Data.requirements?.map(r => typeof r === 'string' ? r : r.rule) || [],
                    response_length: v3Data.thresholds?.find(t =>
                        t.metric?.toLowerCase().includes('length') || t.metric?.toLowerCase().includes('word')
                    )?.limit || null
                };
                break;

            case 'format':
                const fmtParts = [];
                if (v3Data.output_type) fmtParts.push(`Output type: ${v3Data.output_type}.`);
                if (v3Data.structure) {
                    const prefs = [];
                    if (v3Data.structure.use_headers) prefs.push('headers');
                    if (v3Data.structure.use_lists) prefs.push('lists');
                    if (v3Data.structure.use_code_blocks) prefs.push('code blocks');
                    if (v3Data.structure.use_tables) prefs.push('tables');
                    if (prefs.length) fmtParts.push(`Use: ${prefs.join(', ')}.`);
                }
                if (v3Data.special_syntax?.length) {
                    fmtParts.push(`Special syntax: ${v3Data.special_syntax.join(', ')}.`);
                }
                v4.instruction = fmtParts.join(' ');
                v4.metadata = {
                    output_type: v3Data.output_type || null
                };
                break;

            case 'exemplar':
                const exParts = [];
                if (v3Data.good_examples?.length) {
                    v3Data.good_examples.forEach((ex, i) => {
                        exParts.push(`Example ${i + 1}:`);
                        if (ex.input) exParts.push(`User: ${ex.input}`);
                        if (ex.output) exParts.push(`AI: ${ex.output}`);
                        exParts.push('---');
                    });
                }
                if (v3Data.bad_examples?.length) {
                    exParts.push('BAD EXAMPLES:');
                    v3Data.bad_examples.forEach(ex => {
                        if (ex.wrong_output) exParts.push(`Wrong: ${ex.wrong_output}`);
                        if (ex.why_wrong) exParts.push(`Why: ${ex.why_wrong}`);
                        exParts.push('---');
                    });
                }
                v4.instruction = exParts.join('\n');
                break;

            default:
                v4.instruction = JSON.stringify(v3Data);
        }

        return v4;
    },

    /**
     * Get dimension display labels
     * 
     * @returns {Object} Map of component IDs to display names
     */
    getDimensionLabels() {
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

    /**
     * Build prompt hints for LLM extraction
     * Shows the expected v4 structure
     * 
     * @param {string[]|null} componentIds - Component IDs to include
     * @returns {string} JSON string with example structure
     */
    buildSchemaHintsPrompt(componentIds = null) {
        const ids = componentIds || this.componentIds;
        const hints = {};

        for (const id of ids) {
            hints[id] = this.createEmpty(id);
            hints[id].instruction = `<${id} instructions here>`;
        }

        return JSON.stringify(hints, null, 2);
    }
};

// ============================================================================
// SECTION 5: EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ComponentSchemas = ComponentSchemas;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ComponentSchemas };
}

console.log('[ComponentSchemas] Loaded - v' + ComponentSchemas.version + ' (Verbatim-First Schema)');
