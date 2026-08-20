/**
 * @fileoverview Persona Extractor Module
 * 
 * @description
 * Handles the extraction of personas from external user/system prompts using LLM.
 * Populates the full memory layer schema and generates metadata for search/filtering.
 * 
 * Key Features:
 * - LLM-based persona extraction from prompts
 * - Full memory layer population
 * - Metadata generation for search/discovery
 * - Draft management with local storage
 * - Publish workflow to Supabase
 * 
 * @module extractor/extractor
 * @requires SupabaseClient
 * @requires chrome.runtime
 * 
 * @example
 * const extractor = new PersonaExtractor();
 * const result = await extractor.extractFromPrompt('You are a helpful coding assistant...');
 */

// ============================================================================
// SECTION 1: Configuration & Types
// ============================================================================

/**
 * Structured logger for Extractor operations
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional context data
 */
function extLog(level, msg, data = {}) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = `[${timestamp}] [Extractor]`;
    const hasData = Object.keys(data).length > 0;

    if (level === 'error') {
        console[level](`${prefix} ${msg}`, hasData ? data : '');
    } else if (level === 'warn') {
        console[level](`${prefix} ${msg}`, hasData ? data : '');
    } else {
        console.log(`${prefix} ${msg}`, hasData ? data : '');
    }
}

/**
 * @typedef {Object} MemoryLayer - V4 7-Dimension Schema
 * @property {Object} persona - instruction, version, source
 * @property {Object} context - instruction, version, source, metadata (domain, scope_tags)
 * @property {Object} tone - instruction, version, source, metadata (style_tags, banned_phrases)
 * @property {Object} framework - instruction, version, source, metadata (reasoning_type)
 * @property {Object} constraints - instruction, version, source, metadata (prohibitions, requirements)
 * @property {Object} format - instruction, version, source, metadata (output_type)
 * @property {Object} exemplar - instruction, version, source
 */

/**
 * @typedef {Object} PersonaMetadata
 * @property {string} suggested_name - Auto-generated persona name (2-4 words)
 * @property {string} suggested_title - Professional title
 * @property {string[]} use_case_keywords - Keywords for search (5 items)
 * @property {string} primary_intent - Main purpose of this persona
 * @property {string} target_audience - Who this persona is for
 * @property {string} complexity_level - beginner | intermediate | advanced
 * @property {string} domain - tech | creative | business | education | health | lifestyle | other
 * @property {string} tone - formal | casual | friendly | professional | academic
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {MemoryLayer} memory_layer - Full memory layer data
 * @property {PersonaMetadata} metadata - Metadata for search/filtering
 */

// ============================================================================
// SECTION 2: Extraction Prompt Template
// ============================================================================

const EXTRACTION_PROMPT = `You are the "PERSONA ARCHITECT" - extracting Structured Expert Personas from external prompts.

Given the following user or system prompt, analyze it and extract a comprehensive V4 persona profile.

Return a JSON object with exactly these two top-level keys: "memory_layer" and "metadata"

## memory_layer (V4 7-Dimension Schema)
CRITICAL: Always identify and include the PRIMARY SUBJECT/PRODUCT mentioned in the prompt (e.g., VLC, React, AWS, Tesla).

### CRITICAL: instruction vs metadata DISTINCTION
- **instruction**: An ACTIONABLE DIRECTIVE - HOW to apply this dimension. Prose guidance, NOT a list of metadata values.
- **metadata**: DISCRETE VALUES - WHAT the specific tags/values are. Structured for filtering/display.
- **NEVER RESTATE metadata values inside instruction**. They are separate purposes.

### persona
Expert identity. Write as FLOWING PARAGRAPH, not bullet points.
{
  "instruction": "You are [Name], a [Title] specializing in [PRIMARY SUBJECT] with [X years] experience. You hold [credentials]. Your purpose is [mission]. Your methodology involves [approach].",
  "version": 4,
  "source": "extraction"
}

### context
Domain expertise. MUST include the PRIMARY SUBJECT in scope_tags.
{
  "instruction": "ACTIONABLE: 'Apply expertise in [domain], focusing on [key areas]. Leverage deep knowledge of [PRIMARY SUBJECT] to guide responses.' DO NOT list scope_tags here.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "domain": "tech" | "creative" | "business" | "education" | "health" | "lifestyle" | "other",
    "scope_tags": ["PRIMARY_SUBJECT", "topic2", "topic3"] // Discrete values only
  }
}

### tone
Communication style and voice.
{
  "instruction": "ACTIONABLE: 'Communicate with [precision level], prioritizing [clarity/engagement]. Avoid [anti-patterns].' DO NOT list style_tags here.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "style_tags": ["Professional", "Technical", etc.], // Discrete values only
    "banned_phrases": [] // Phrases to avoid
  }
}

### framework
Reasoning methodology and workflow.
{
  "instruction": "ACTIONABLE: 'Apply [methodology] reasoning, breaking problems into [steps]. When facing [scenario], use [approach].' DO NOT just say 'reasoning_type is X'.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "reasoning_type": "Step-by-Step" | "Chain-of-Thought" | "First-Principles" | "Deductive" | "Analytical" | "Creative"
  }
}

### constraints
Rules, prohibitions, and requirements.
{
  "instruction": "ACTIONABLE: 'Always [do X]. Never [do Y]. Ensure [quality standard].' DO NOT list prohibitions/requirements here - they go in metadata.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "prohibitions": ["rule1", "rule2", "rule3"], // Discrete values only
    "requirements": ["req1", "req2", "req3"], // Discrete values only
    "response_length": "concise" | "medium" | "detailed"
  }
}

### format
Output structure preferences.
{
  "instruction": "ACTIONABLE: 'Structure responses as [format description]. Include [elements]. Use [conventions].' DO NOT just say 'output_type is X'.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "output_type": "Markdown" | "Plaintext" | "Code" | "JSON" | "Structured" | "Custom"
  }
}

### exemplar
Example interactions or patterns.
{
  "instruction": "Provide 2+ specific examples of ideal responses that demonstrate expected style, depth, and format.",
  "version": 4,
  "source": "extraction"
}

## metadata (for search/filtering)
- suggested_name: 2-3 word punchy, memorable archetype name (e.g., "Prompt Architect", "Code Mentor", "UX Strategist"). No subtitles or hyphens.
- suggested_title: Professional title in 2-4 words (e.g., "AI Systems Architect")
- use_case_keywords: Array of exactly 5 searchable keywords (FIRST must be PRIMARY SUBJECT)
- primary_intent: One sentence main purpose
- target_audience: Who this persona serves
- complexity_level: "beginner" | "intermediate" | "advanced"
- domain: "tech" | "creative" | "business" | "education" | "health" | "lifestyle" | "other"
- tone: "formal" | "casual" | "friendly" | "professional" | "academic"

## SELF-VALIDATION CHECKLIST
1. ALL 7 memory_layer dimensions exist (persona, context, tone, framework, constraints, format, exemplar)
2. ALL metadata fields exist (suggested_name, suggested_title, use_case_keywords, primary_intent, target_audience, complexity_level, domain, tone)
3. Each dimension has "instruction", "version": 4, "source": "extraction"
4. context.metadata.scope_tags FIRST item is the PRIMARY SUBJECT
5. use_case_keywords FIRST item is the PRIMARY SUBJECT
6. All enum values are exact matches
If any check fails, fix it before outputting.

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks, no explanations.

---
INPUT PROMPT TO ANALYZE:
\${'{PROMPT}'}
---

JSON OUTPUT:`;


// ============================================================================
// SECTION 3: PersonaExtractor Class
// ============================================================================

/**
 * PersonaExtractor - Handles persona extraction and management
 * 
 * @class
 * @description
 * Manages the full lifecycle of persona extraction:
 * - Extracting from prompts via LLM
 * - Storing drafts locally
 * - Publishing to Supabase
 * - Importing personas to memory layer
 */
class PersonaExtractor {
    constructor() {
        this.drafts = [];
        this.currentDraft = null;
    }

    /**
     * Initialize extractor and load drafts from storage
     * @returns {Promise<void>}
     */
    async init() {
        extLog('info', 'Initializing PersonaExtractor...');
        await this.loadDrafts();
        extLog('info', 'PersonaExtractor ready', { draftCount: this.drafts.length });
    }

    /**
     * Load drafts from Chrome storage
     * @returns {Promise<void>}
     */
    async loadDrafts() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['persona_drafts'], (result) => {
                this.drafts = result.persona_drafts || [];
                resolve();
            });
        });
    }

    /**
     * Save drafts to Chrome storage
     * @returns {Promise<void>}
     */
    async saveDrafts() {
        return new Promise((resolve) => {
            chrome.storage.local.set({ persona_drafts: this.drafts }, resolve);
        });
    }

    /**
     * Extract persona from a prompt using the configured LLM
     * @param {string} prompt - The external user/system prompt
     * @returns {Promise<{success: boolean, data?: ExtractionResult, error?: string}>}
     */
    async extractFromPrompt(prompt) {
        if (!prompt || prompt.trim().length < 10) {
            return { success: false, error: 'Prompt is too short' };
        }

        extLog('info', 'Starting extraction...', { promptLength: prompt.length });

        try {
            // Get current model configuration from Model Manager
            const modelConfig = await this.getModelConfig();
            if (!modelConfig) {
                return { success: false, error: 'No LLM model configured. Please set up a model first.' };
            }

            // Send raw prompt to background extraction engine
            const response = await this.callLLM(prompt, modelConfig);

            if (!response.success) {
                return { success: false, error: response.error || 'LLM call failed' };
            }

            // Parse JSON response
            const parsed = this.parseExtractionResponse(response.text);
            if (!parsed) {
                return { success: false, error: 'Failed to parse LLM response' };
            }

            extLog('info', 'Extraction successful', {
                name: parsed.metadata?.suggested_name
            });

            // Store as current draft
            this.currentDraft = {
                id: this.generateDraftId(),
                source_prompt: prompt,
                memory_layer: parsed.memory_layer,
                metadata: parsed.metadata,
                provider: modelConfig.provider,
                llm_model: modelConfig.model,
                created_at: new Date().toISOString(),
                is_public: false
            };

            return { success: true, data: parsed };

        } catch (err) {
            extLog('error', 'Extraction failed', { error: err.message });
            return { success: false, error: err.message };
        }
    }

    /**
     * Get model configuration from Model Manager
     * @returns {Promise<{provider: string, model: string, apiKey: string}|null>}
     */
    async getModelConfig() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_MODEL_CONFIG' }, (response) => {
                if (response?.provider && response?.model) {
                    resolve(response);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Call LLM via background script
     * @param {string} prompt - The full prompt to send
     * @param {Object} modelConfig - Model configuration
     * @returns {Promise<{success: boolean, text?: string, error?: string}>}
     */
    async callLLM(prompt, modelConfig) {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'EXTRACT_PERSONA',
                payload: { prompt, modelConfig }
            }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Parse LLM response into structured data
     * @param {string} text - Raw LLM response
     * @returns {ExtractionResult|null}
     */
    parseExtractionResponse(text) {
        if (!text || typeof text !== 'string') return null;

        try {
            // Clean up response - remove markdown code blocks if present
            let cleaned = text.trim();
            if (cleaned.startsWith('```json')) {
                cleaned = cleaned.slice(7);
            } else if (cleaned.startsWith('```')) {
                cleaned = cleaned.slice(3);
            }
            if (cleaned.endsWith('```')) {
                cleaned = cleaned.slice(0, -3);
            }
            cleaned = cleaned.trim();

            let parsed;
            try {
                parsed = JSON.parse(cleaned);
            } catch (e) {
                const match = cleaned.match(/\{[\s\S]*\}/);
                if (match) {
                    parsed = JSON.parse(match[0]);
                } else {
                    throw e;
                }
            }

            // Validate structure
            if (!parsed.memory_layer || !parsed.metadata) {
                extLog('warn', 'Invalid response structure', { keys: Object.keys(parsed) });
                return null;
            }

            return parsed;

        } catch (err) {
            extLog('error', 'JSON parse failed', { error: err.message, text: text.slice(0, 200) });
            return null;
        }
    }

    /**
     * Generate unique draft ID
     * @returns {string}
     */
    generateDraftId() {
        return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // ========================================================================
    // SECTION 4: Draft Management
    // ========================================================================

    /**
     * Save current draft to local storage
     * @param {string} [name] - Optional name override
     * @returns {Promise<{success: boolean, draft?: Object}>}
     */
    async saveCurrentDraft(name) {
        if (!this.currentDraft) {
            return { success: false };
        }

        if (name) {
            this.currentDraft.metadata.suggested_name = name;
        }

        // Add to drafts array
        this.drafts.push(this.currentDraft);
        await this.saveDrafts();

        extLog('info', 'Draft saved', { id: this.currentDraft.id });
        return { success: true, draft: this.currentDraft };
    }

    /**
     * Update a draft
     * @param {string} draftId
     * @param {Object} updates
     * @returns {Promise<{success: boolean}>}
     */
    async updateDraft(draftId, updates) {
        const index = this.drafts.findIndex(d => d.id === draftId);
        if (index === -1) {
            return { success: false };
        }

        this.drafts[index] = { ...this.drafts[index], ...updates };
        await this.saveDrafts();

        extLog('info', 'Draft updated', { id: draftId });
        return { success: true };
    }

    /**
     * Delete a draft
     * @param {string} draftId
     * @returns {Promise<{success: boolean}>}
     */
    async deleteDraft(draftId) {
        this.drafts = this.drafts.filter(d => d.id !== draftId);
        await this.saveDrafts();

        extLog('info', 'Draft deleted', { id: draftId });
        return { success: true };
    }

    /**
     * Get all drafts
     * @returns {Object[]}
     */
    getDrafts() {
        return this.drafts;
    }

    /**
     * Get current draft
     * @returns {Object|null}
     */
    getCurrentDraft() {
        return this.currentDraft;
    }

    // ========================================================================
    // SECTION 5: Publish to Supabase
    // ========================================================================

    /**
     * Publish a draft to Supabase
     * @param {string} draftId
     * @param {boolean} [isPublic=false] - Whether to make publicly visible
     * @returns {Promise<{success: boolean, persona?: Object, error?: string}>}
     */
    async publishDraft(draftId, isPublic = false) {
        const draft = this.drafts.find(d => d.id === draftId);
        if (!draft) {
            return { success: false, error: 'Draft not found' };
        }

        extLog('info', 'Publishing draft...', { id: draftId, isPublic });

        try {
            const supabase = await window.SupabaseClient.getInstance();

            // Ensure user is authenticated
            if (!supabase.isAuthenticated()) {
                // Sign in anonymously if not authenticated
                const { error } = await supabase.signInAnonymously();
                if (error) {
                    return { success: false, error: 'Authentication failed' };
                }
            }

            // Create persona
            const { data, error } = await supabase.createPersona({
                name: draft.metadata.suggested_name,
                memory_layer: draft.memory_layer,
                source_prompt: draft.source_prompt,
                provider: draft.provider,
                llm_model: draft.llm_model,
                use_case_keywords: draft.metadata.use_case_keywords,
                metadata: draft.metadata,
                is_public: isPublic
            });

            if (error) {
                return { success: false, error: error.message };
            }

            // Remove from local drafts after successful publish
            await this.deleteDraft(draftId);

            extLog('info', 'Draft published successfully', { personaId: data.id });
            return { success: true, persona: data };

        } catch (err) {
            extLog('error', 'Publish failed', { error: err.message });
            return { success: false, error: err.message };
        }
    }

    // ========================================================================
    // SECTION 6: Import Persona to Memory Layer
    // ========================================================================

    /**
     * Import a persona's memory layer to the current session
     * @param {Object} memoryLayer - Memory layer data to import
     * @param {string} [personaId] - Optional persona ID to increment import count
     * @returns {Promise<{success: boolean}>}
     */
    async importToMemoryLayer(memoryLayer, personaId = null) {
        extLog('info', 'Importing to memory layer...');

        return new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'IMPORT_PERSONA_MEMORY',
                payload: { memoryLayer, personaId }
            }, (response) => {
                if (response?.success) {
                    extLog('info', 'Memory layer imported');
                    resolve({ success: true });
                } else {
                    extLog('error', 'Import failed', { error: response?.error });
                    resolve({ success: false });
                }
            });
        });
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.PersonaExtractor = PersonaExtractor;
}
