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
4. **PROPORTIONAL CREDENTIALS**: If the conversation is brief or covers a single focused task, calibrate the persona's credentials and scope proportionally to the subject without inventing exaggerated, fictitious academic backgrounds.

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
- **suggested_name**: Exactly 2 to 3 words. A punchy, memorable archetype name (e.g., "Prompt Architect", "Code Mentor", "UX Strategist", "Lexicon Guide"). NEVER include subtitles, hyphens, colons, or multi-part clauses.
- **suggested_title**: Professional role in 2 to 4 words (e.g., "AI Lexicographer")
- **domain**: Lowercase domain category ("tech", "creative", "business", "education", "health", "lifestyle", "other")
- **primary_intent**: One concise sentence describing core persona purpose

## REQUIRED OUTPUT JSON FORMAT
Return a SINGLE JSON object containing ALL dimensions and metadata:
{
  "persona": { "instruction": "You are Dr. Elara Vance, an AI Lexicographer specializing in model nomenclature with 15 years of experience. Your mission is to deconstruct AI naming conventions and reveal their strategic framing.", "version": 4, "source": "synthesis" },
  "context": { "instruction": "Apply deep domain expertise in AI branding and computational semiotics, focusing on Anthropic Claude model nomenclature and historical linguistic roots.", "version": 4, "source": "synthesis", "metadata": { "domain": "Tech", "scope_tags": ["Anthropic Claude", "AI Model Naming", "Computational Linguistics", "Semiotics"] } },
  "tone": { "instruction": "Communicate with academic rigor, precision, and scholarly authority. Avoid colloquialisms and superficial explanations.", "version": 4, "source": "synthesis", "metadata": { "style_tags": ["Technical", "Authoritative", "Academic", "Precise"], "banned_phrases": ["simple name", "just a branding choice"] } },
  "framework": { "instruction": "Structure analysis using semiotic deconstruction and historical etymology. Step 1: Identify root origins. Step 2: Connect to technological capabilities.", "version": 4, "source": "synthesis", "metadata": { "reasoning_type": "Analytical" } },
  "constraints": { "instruction": "Always ground interpretations in documented linguistic evidence. Never use generic tech buzzwords or ungrounded claims.", "version": 4, "source": "synthesis", "metadata": { "prohibitions": ["Generic buzzwords", "Superficial summaries"], "requirements": ["Linguistic evidence", "Etymological origins"], "response_length": "Structured" } },
  "format": { "instruction": "Format responses using clean Markdown with hierarchical headings, bullet points, and comparative tables.", "version": 4, "source": "synthesis", "metadata": { "output_type": "Markdown" } },
  "exemplar": { "instruction": "User: Why did Anthropic name their model 'Opus'?\\nAI: 'Opus' stems from Latin meaning 'a work of art or masterwork', signifying peak reasoning capability in contrast to 'Sonnet' (structural harmony) and 'Haiku' (concise efficiency).", "version": 4, "source": "synthesis" },
  "metadata": { "suggested_name": "Lexicon Guide", "suggested_title": "AI Lexicographer", "domain": "tech", "primary_intent": "Analyze and deconstruct AI model naming conventions and semiotics." }
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

      // Convert array response to object if needed
      if (Array.isArray(result)) {
        console.log('[UnifiedAnalyzer] Converting dimension array to object');
        const obj = {};
        for (const item of result) {
          if (item && typeof item === 'object') {
            const key = (item.id || item.name || item.dimension || item.component || item.type || '').toLowerCase().trim();
            if (key) {
              obj[key] = item;
            }
          }
        }
        if (Object.keys(obj).length > 0) {
          result = obj;
        }
      }

      // Handle wrapped responses from various LLM structures
      const unwrappers = ['memory_layer', 'dimensions', 'components', 'persona_components', 'synthesis', 'data', 'output'];
      for (const prop of unwrappers) {
        if (result?.[prop] && typeof result[prop] === 'object' && !Array.isArray(result[prop])) {
          console.log(`[UnifiedAnalyzer] Unwrapping/merging '${prop}' from response`);
          result = { ...result[prop], ...result };
        }
      }

      // Lowercase all top-level keys for case-insensitive matching
      const normalizedResult = {};
      for (const [k, v] of Object.entries(result)) {
        normalizedResult[k.toLowerCase().trim()] = v;
      }
      result = { ...result, ...normalizedResult };

      // ================================================================
      // KEY ALIAS MAPPING - Map non-canonical names to canonical dimensions
      // ================================================================
      const keyAliases = {
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
              console.log(`[UnifiedAnalyzer] Mapping alias '${lowerAlias}' to canonical dimension '${canonicalKey}'`);
              result[canonicalKey] = result[lowerAlias];
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
          } else if (Array.isArray(result[key])) {
            // Normalize array of items/strings to instruction text
            const textLines = result[key].map(item => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                if (item.instruction) return item.instruction;
                if (item.text) return item.text;
                if (item.user && item.ai) return `User: ${item.user}\nAI: ${item.ai}`;
                if (item.rule) return item.rule;
                return JSON.stringify(item);
              }
              return String(item);
            }).filter(Boolean);
            result[key] = { instruction: textLines.join('\n') };
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
