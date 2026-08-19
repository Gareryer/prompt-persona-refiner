/**
 * ============================================================================
 * UNIFIED ANALYZER v3 - Single-Call Comprehensive Analysis
 * ============================================================================
 * 
 * Updated for 7-dimension industry standard schema:
 * persona, context, exemplar, format, tone, framework, constraints
 * 
 * PURPOSE: Synthesize conversation data into persona from scraped pairs
 * Used for INTERNAL persona synthesis (not external prompt extraction)
 * 
 * Output: Returns structured data matching ComponentSchemas v3 dimensions.
 * 
 * ============================================================================
 */

const UnifiedAnalyzer = {
  id: 'unified_analyzer',
  inputSource: 'both',

  /**
   * Format conversation for prompt
   * @param {Array} messages - Scraped message pairs
   * @returns {string}
   */
  _formatConversation(messages) {
    return messages.map((pair, i) => {
      let text = `--- Turn ${pair.id} ---\n`;
      if (pair.user?.prompt) text += `User: ${pair.user.prompt}\n`;
      if (pair.model?.response) {
        // Truncate long responses
        const resp = pair.model.response;
        text += `Assistant: ${resp.substring(0, 500)}${resp.length > 500 ? '...' : ''}\n`;
      }
      if (pair.rating?.value) {
        text += `[User Rating: ${pair.rating.value}/5 stars]\n`;
      }
      return text;
    }).join('\n');
  },

  /**
   * Get rating context if available
   * @param {Array} messages
   * @returns {string}
   */
  _getRatingContext(messages) {
    const ratedCount = messages.filter(m => m.rating?.value).length;
    if (ratedCount === 0) return '';

    const avgRating = (messages.reduce((sum, m) => sum + (m.rating?.value || 0), 0) / ratedCount).toFixed(1);

    return `
RATING CONTEXT:
${ratedCount} of ${messages.length} responses rated. Average: ${avgRating}/5 stars.
- 5 stars: Very satisfied, perfectly aligned
- 4 stars: Good, mostly aligned  
- 3 stars: Acceptable
- 2 stars: Unsatisfied
- 1 star: Very unsatisfied
Use ratings to identify what approaches work best for this user.
`;
  },

  /**
   * Get schema for API call (delegates to centralized ComponentSchemas)
   * @param {string[]} enabledComponents - List of component IDs to include
   * @returns {Object} Combined JSON Schema
   */
  _buildSchema(enabledComponents) {
    if (typeof ComponentSchemas !== 'undefined') {
      return ComponentSchemas.buildCombinedSchema(enabledComponents);
    }
    // Fallback if ComponentSchemas not loaded (shouldn't happen)
    console.warn('[UnifiedAnalyzer] ComponentSchemas not available, using inline fallback');
    return { type: "object", properties: {}, required: [] };
  },

  /**
   * Build unified prompt for conversation synthesis (V4 Schema)
   * Balanced 7-dimension synthesis with strict length budgets
   * @param {Array} messages - Scraped message pairs
   * @param {string[]} enabledComponents - List of dimension IDs to include (null = all)
   * @param {boolean} includeSchemaHints - Include explicit schema structure in prompt
   * @returns {string}
   */
  getPrompt(messages, enabledComponents = null, includeSchemaHints = false) {
    const conversationText = this._formatConversation(messages);
    const ratingContext = this._getRatingContext(messages);
    const recentMessages = messages.slice(-3);
    const recentText = this._formatConversation(recentMessages);

    // 7-dimension schema
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

    let basePrompt = `You are the "PERSONA ARCHITECT" - synthesizing Structured Expert Personas from conversation history into 7 balanced, modular dimensions.

## YOUR MISSION
Synthesize a comprehensive, modular Expert Persona from the conversation history across ALL 7 dimensions: ${dimensionList}, plus top-level metadata.

## CRITICAL BALANCE & LENGTH CONSTRAINTS (MANDATORY)
1. **CONCISE & DENSE**: Each dimension's \`instruction\` field MUST be 2 to 4 sentences (under 80 words). NEVER write runaway monologues, repetitive essays, or endless descriptions.
2. **DISTRIBUTE ACROSS ALL DIMENSIONS**: Do NOT dump all information into \`persona\`. Keep \`persona\` strictly for identity/credentials (under 80 words), and populate each specific dimension with its dedicated guidance and structured metadata chips.
3. **GROUNDED & SPECIFIC**: Mention the exact product/technology/domain being discussed (e.g. Claude naming, React, AWS). If not explicitly stated, infer top-tier credentials for that specific subject.

${ratingContext}

CONVERSATION TO ANALYZE:
${conversationText}

RECENT MESSAGES (last 3 turns):
${recentText}

## 7-DIMENSION SPECIFICATIONS

### 1. persona (Identity, Credentials, Background)
- **instruction**: 2-3 sentences (50-70 words max). 'You are [Name], a [Title] specializing in [Primary Subject from conversation] with [Years] years of experience. You hold [Specific credentials: PhD, CFA, etc.]. Your core mission is [Specific goal].'
- **version**: 4, **source**: "synthesis"

### 2. context (Domain, Scope Boundaries, Terminology)
- **instruction**: 2-3 sentences (40-60 words max). 'Apply deep expertise in [Domain], focusing on [Key Areas]. Leverage mastery of [Key Tools/Concepts] to guide responses.'
- **metadata.domain**: One of ["Tech", "Creative", "Business", "Education", "Health", "Lifestyle", "Other"]
- **metadata.scope_tags**: 3-6 specific discrete topics/technologies (e.g., ["Anthropic Claude", "AI Model Naming", "Computational Semiotics"])

### 3. tone (Voice, Style, Banned Phrases)
- **instruction**: 1-2 sentences (20-40 words max). 'Communicate with [Voice/Style], prioritizing [Clarity/Rigor]. Avoid [Anti-patterns].'
- **metadata.style_tags**: 2-4 discrete style descriptors (e.g., ["Technical", "Academic", "Authoritative", "Precise"])
- **metadata.banned_phrases**: Array of phrases/clichés to avoid

### 4. framework (Methodology, Reasoning, Workflow)
- **instruction**: 2-3 sentences (40-60 words max). 'Structure reasoning using [Named Methodology]. Step 1: [Analysis]. Step 2: [Execution].'
- **metadata.reasoning_type**: One of ["Analytical", "Step-by-Step", "First-Principles", "Chain-of-Thought", "Deductive", "Creative", "Socratic"]

### 5. constraints (Rules, Prohibitions, Requirements)
- **instruction**: 2-3 sentences (40-60 words max). 'Always [Core Requirement]. Never [Core Prohibition]. Ensure responses are [Quality Standard].'
- **metadata.prohibitions**: 2-4 discrete rules (e.g., ["Using superficial definitions", "Omitting linguistic origins"])
- **metadata.requirements**: 2-4 discrete rules (e.g., ["Cite documented etymological roots", "Provide structural analysis"])
- **metadata.response_length**: Length directive (e.g., "Detailed and structured")

### 6. format (Output Type & Structure Preferences)
- **instruction**: 1-2 sentences (20-40 words max). 'Format responses with [Structure]. Use [Markdown headings/Lists/Tables] for clarity.'
- **metadata.output_type**: One of ["Markdown", "Plaintext", "JSON", "Code", "HTML", "Structured", "Custom"]

### 7. exemplar (Few-Shot Examples)
- **instruction**: 2-4 lines (40-80 words max) showing a representative input and ideal expert response snippet.

### 8. metadata (Top-Level Summary)
- **suggested_name**: 2-4 word memorable name (e.g., "AI Nomenclature Architect")
- **suggested_title**: Professional title (e.g., "Chief Computational Lexicographer")
- **domain**: Lowercase domain category ("tech", "creative", "business", etc.)
- **primary_intent**: One sentence describing core persona purpose

## REQUIRED OUTPUT JSON FORMAT
Return a SINGLE JSON object containing ALL dimensions and metadata:
{
  "persona": { "instruction": "You are Dr. Elara Vance, Chief Lexicographer of AI Nomenclature with 20 years of experience in computational linguistics and semiotics, holding a PhD from Cambridge. Your mission is to deconstruct AI model naming conventions and reveal their etymological and strategic framing.", "version": 4, "source": "synthesis" },
  "context": { "instruction": "Apply deep domain expertise in AI branding and computational semiotics, focusing on Anthropic Claude model nomenclature and historical linguistic roots.", "version": 4, "source": "synthesis", "metadata": { "domain": "Tech", "scope_tags": ["Anthropic Claude", "AI Model Naming", "Computational Linguistics", "Semiotics"] } },
  "tone": { "instruction": "Communicate with academic rigor, precision, and scholarly authority. Avoid colloquialisms and superficial explanations.", "version": 4, "source": "synthesis", "metadata": { "style_tags": ["Technical", "Authoritative", "Academic", "Precise"], "banned_phrases": ["simple name", "just a branding choice"] } },
  "framework": { "instruction": "Structure analysis using semiotic deconstruction and historical etymology. Step 1: Identify root origins. Step 2: Connect to technological capabilities.", "version": 4, "source": "synthesis", "metadata": { "reasoning_type": "Analytical" } },
  "constraints": { "instruction": "Always ground interpretations in documented linguistic evidence. Never use generic tech buzzwords or ungrounded claims.", "version": 4, "source": "synthesis", "metadata": { "prohibitions": ["Generic buzzwords", "Superficial summaries"], "requirements": ["Linguistic evidence", "Etymological origins"], "response_length": "Structured" } },
  "format": { "instruction": "Format responses using clean Markdown with hierarchical headings, bullet points, and comparative tables.", "version": 4, "source": "synthesis", "metadata": { "output_type": "Markdown" } },
  "exemplar": { "instruction": "User: Why did Anthropic name their model 'Opus'?\\nAI: 'Opus' stems from Latin meaning 'a work of art or masterwork', signifying peak reasoning capability in contrast to 'Sonnet' (structural harmony) and 'Haiku' (concise efficiency).", "version": 4, "source": "synthesis" },
  "metadata": { "suggested_name": "AI Nomenclature Architect", "suggested_title": "Chief Computational Lexicographer", "domain": "tech", "primary_intent": "Analyze and deconstruct AI model naming conventions and semiotics." }
}

CRITICAL: Return ONLY the valid JSON object with ALL 8 top-level keys. Each instruction MUST be concise and under 80 words.`;

    // Add explicit schema structure for non-Gemini providers
    if (includeSchemaHints && typeof ComponentSchemas !== 'undefined') {
      basePrompt += `

CRITICAL: Return ONLY valid JSON (no markdown, no code blocks).`;
    }

    return basePrompt;
  },

  /**
   * Run unified analysis
   * @param {Object} scrapedData - Scraped conversation data
   * @param {LLMClient} llmClient - Configured LLM client
   * @param {Object} options - Analysis options
   * @param {string[]} options.enabledComponents - List of dimension IDs to include (null = all)
   * @returns {Promise<Object>} Analysis results for enabled dimensions
   */
  async analyze(scrapedData, llmClient, options = {}) {
    if (!scrapedData?.messages?.length) {
      console.warn('[UnifiedAnalyzer] No messages to analyze');
      return null;
    }

    if (!llmClient?.isConfigured()) {
      console.warn('[UnifiedAnalyzer] LLM client not configured');
      return null;
    }

    const enabledComponents = options.enabledComponents || null;
    const dimensionCount = enabledComponents ? enabledComponents.length : 7;

    console.log(`[UnifiedAnalyzer] Analyzing ${scrapedData.messages.length} messages (${dimensionCount} dimensions)...`);
    const startTime = performance.now();

    try {
      // Always include schema hints in prompt for consistent behavior across all providers
      const provider = llmClient.provider || 'unknown';
      console.log(`[UnifiedAnalyzer] Provider: ${provider} - using 7-dimension schema`);

      // Build prompt WITH schema hints (always)
      const prompt = this.getPrompt(scrapedData.messages, enabledComponents, true);
      const schema = this._buildSchema(enabledComponents);

      // Call LLM with schema enforcement and ample token budget (8192 tokens for 7-dimension synthesis)
      const rawResult = await llmClient.call(prompt, {
        json: true,
        schema: schema,
        maxTokens: 8192
      });

      const duration = Math.round(performance.now() - startTime);
      console.log(`[UnifiedAnalyzer] Complete in ${duration}ms (provider: ${provider})`);

      // ================================================================
      // RESPONSE NORMALIZATION - Handle various LLM response structures
      // ================================================================
      let result = rawResult;

      // Check for parse errors from LLMClient
      if (result?.parseError) {
        console.error('[UnifiedAnalyzer] LLM returned unparseable response:', result.raw?.substring(0, 500));
        return null;
      }

      if (!result || typeof result !== 'object') {
        console.error('[UnifiedAnalyzer] Invalid response object from LLMClient');
        return null;
      }

      // Handle wrapped responses from various LLM structures
      if (result?.memory_layer && typeof result.memory_layer === 'object') {
        console.log('[UnifiedAnalyzer] Unwrapping memory_layer from response');
        result = result.memory_layer;
      }
      if (result?.dimensions && typeof result.dimensions === 'object') {
        console.log('[UnifiedAnalyzer] Unwrapping dimensions from response');
        result = result.dimensions;
      }
      if (result?.components && typeof result.components === 'object') {
        console.log('[UnifiedAnalyzer] Unwrapping components from response');
        result = result.components;
      }
      if (result?.data && typeof result.data === 'object' && !result.persona) {
        console.log('[UnifiedAnalyzer] Unwrapping data from response');
        result = result.data;
      } else if (result?.output && typeof result.output === 'object' && !result.persona) {
        console.log('[UnifiedAnalyzer] Unwrapping output from response');
        result = result.output;
      }

      // ================================================================
      // KEY ALIAS MAPPING - Map non-canonical names to canonical dimensions
      // ================================================================
      const keyAliases = {
        context: ['domain_context', 'domain', 'knowledge', 'scope', 'domain_scope'],
        exemplar: ['examples', 'exemplars', 'few_shot', 'samples', 'few_shot_examples'],
        format: ['output_format', 'outputType', 'structure', 'format_instructions', 'output_preferences'],
        framework: ['methodology', 'reasoning', 'workflow', 'reasoning_pattern', 'reasoning_framework'],
        constraints: ['rules', 'prohibitions', 'custom_context', 'requirements', 'limits', 'constraints_rules'],
        persona: ['persona_synthesizer', 'synthesized_persona', 'identity', 'role', 'expert_persona']
      };

      for (const [canonicalKey, aliases] of Object.entries(keyAliases)) {
        if (!result[canonicalKey]) {
          for (const alias of aliases) {
            if (result[alias] !== undefined) {
              console.log(`[UnifiedAnalyzer] Mapping alias '${alias}' to canonical dimension '${canonicalKey}'`);
              result[canonicalKey] = result[alias];
              break;
            }
          }
        }
      }

      // ================================================================
      // VALIDATION & FALLBACK RECOVERY - Ensure all requested dimensions exist
      // ================================================================
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
        console.warn('[UnifiedAnalyzer] Response contains no recognized dimension keys:', Object.keys(result));
        return null;
      }

      for (const key of expectedKeys) {
        if (result[key]) {
          // Normalize string to object
          if (typeof result[key] === 'string') {
            result[key] = { instruction: result[key] };
          }

          // If result[key] is an object but lacks an explicit instruction string, synthesize via migrateFromV3
          if (!result[key].instruction && typeof ComponentSchemas !== 'undefined' && typeof ComponentSchemas.migrateFromV3 === 'function') {
            const migrated = ComponentSchemas.migrateFromV3(key, result[key]);
            result[key].instruction = migrated.instruction || '';
            result[key].metadata = {
              ...(migrated.metadata || {}),
              ...(result[key].metadata || {})
            };
          }

          const defaultEmpty = typeof ComponentSchemas !== 'undefined'
            ? ComponentSchemas.createEmpty(key)
            : { instruction: '', version: 4, source: 'synthesis' };

          result[key] = {
            ...defaultEmpty,
            ...result[key],
            instruction: result[key].instruction || '',
            metadata: {
              ...(defaultEmpty.metadata || {}),
              ...(result[key].metadata || {})
            },
            analyzedAt: timestamp,
            messageCount: scrapedData.messages.length,
            _synthesized: true
          };
        } else {
          // Fill missing dimension with clean V4 schema default
          console.warn(`[UnifiedAnalyzer] Missing dimension '${key}' - populating default structure`);
          const empty = typeof ComponentSchemas !== 'undefined'
            ? ComponentSchemas.createEmpty(key)
            : { instruction: '', version: 4, source: 'synthesis' };
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
      console.error('[UnifiedAnalyzer] Analysis failed:', error);
      return null;
    }
  }
};

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
  window.UnifiedAnalyzer = UnifiedAnalyzer;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UnifiedAnalyzer };
}

console.log('[UnifiedAnalyzer] Loaded v3 - 7-dimension schema (persona, context, exemplar, format, tone, framework, constraints)');
