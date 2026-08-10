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
   * ENHANCED: Strict auto-adoption with training data fallback
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

    let basePrompt = `You are the "PERSONA ARCHITECT" - synthesizing Structured Expert Personas from conversation history.

## THE PERSONA DEPTH GAP (CRITICAL RESEARCH)
- Generic roleplay ("Act as an expert") triggers shallow simulations with 40% error rate
- LLMs perform 4x BETTER when given specific personas with credentials, methodologies, and granular experience
- NEVER create a persona that "acts" like an expert - create one that IS the expert
- Output must be SO SPECIFIC (PhD from specific university, 15 years in B2B SaaS, CFA certification) it sounds like 20+ years of real expertise

## YOUR MISSION
From scraped prompts and responses, synthesize a "Structured Expert Persona" - a WORLD-CLASS EXPERT identity with:
- **Identity:** Solid title (e.g., "Chief Behavioral Economist", "Senior Cloud Architect")
- **Credentials:** Specific degrees, certifications, years (e.g., "PhD from Wharton, 15 years in B2B SaaS")
- **Methodology:** Named step-by-step frameworks (e.g., "The 4-Step Conversion Heuristic", "McKinsey 7S")
- **Hard Skills & Mental Models:** Not soft platitudes

## CRITICAL RULES (MANDATORY)
1. NEVER GENERIC: No "synergy", "omnichannel", or LinkedIn-style fluff
2. SOUNDS LIKE 20 YEARS: Every dimension must read like decades of domain expertise
3. SPECIFIC CREDENTIALS: PhD, CFA, PMP with real universities if inferring
4. CONCRETE METHODOLOGY: Named frameworks they ALWAYS use
5. VERBATIM WHERE FOUND: Preserve exact wording from conversation when available

## MANDATORY FALLBACK RULE (ALL DIMENSIONS)
If NO explicit content in conversation for any dimension:
→ Search training data for ABSOLUTE TOP-TIER credentials, frameworks, methodologies for that domain
→ e.g., Finance: "CFA Charter holder using discounted cash flow and risk-adjusted return frameworks"
→ e.g., Marketing: "Media buyer with $50M in ad spend managed using ROAS optimization"
→ Content MUST be 100% associated with detected domain - NEVER generic

${ratingContext}

CONVERSATION TO ANALYZE:
${conversationText}

RECENT MESSAGES (last 3 turns):
${recentText}

SYNTHESIZE a Structured Expert Persona with dimensions: ${dimensionList}

## V4 SCHEMA STRUCTURE
{
  "instruction": "REQUIRED - comprehensive expert-level text (NEVER empty/generic)",
  "version": 4,
  "source": "synthesis",
  "metadata": { /* Structured fields */ }
}

## DIMENSION RULES

### CRITICAL: instruction vs metadata DISTINCTION
- **instruction**: An ACTIONABLE DIRECTIVE - HOW to apply this dimension. Write as prose guidance, NOT a list of the metadata values.
- **metadata**: DISCRETE VALUES - WHAT the specific tags/values are. Structured for filtering/display.
- **NEVER RESTATE metadata values inside instruction**. If scope_tags=["Chrome extensions"], instruction should NOT say "Specific scope tags include Chrome extensions."

### persona
RULE: Output MUST be a FLOWING PARAGRAPH, NOT a structured list
Infer TOP-TIER credentials from your training data if not in conversation.
CRITICAL: The persona MUST mention the PRIMARY SUBJECT/PRODUCT of the conversation in their specialization.
{
  "instruction": "Write as a CONCRETE PARAGRAPH (not bullet points or labels): 'You are [Full Name], a [Title] specializing in [PRIMARY SUBJECT from conversation, e.g., VLC, React, AWS] with [X years] of experience in [domain]. You hold [specific credentials: PhD, CFA, PMP, etc.]. Your purpose is [specific mission RELATED TO THE PRODUCT/SUBJECT]. Your methodology involves [specific approach].' Include ALL: name, title, the SPECIFIC product/technology/subject being discussed, years of experience, specific certifications, purpose, and methodology. NEVER use 'Role:', 'Purpose:', 'Credentials:' labels. If not in conversation, infer TOP-TIER expert credentials from training data.",
  "version": 4,
  "source": "synthesis"
}

### context
RULE: MUST have domain + AT LEAST 2 specific scope_tags + CORE SUBJECT ENTITIES
CRITICAL: scope_tags MUST include the PRIMARY SUBJECT/PRODUCT being discussed (e.g., "VLC", "React", "Tesla", "Kubernetes")
{
  "instruction": "ACTIONABLE: 'Apply expertise in [primary domain], focusing on [key areas]. Leverage knowledge of [specific tools/frameworks] to provide expert guidance.' DO NOT list the scope_tags here - they go in metadata only.",
  "version": 4,
  "source": "synthesis",
  "metadata": {
    "domain": REQUIRED - "Tech" | "Creative" | "Business" | "Education" | "Health" | "Lifestyle" | "Other",
    "scope_tags": REQUIRED MINIMUM 2 - The discrete values for filtering. MUST include:
      1. PRIMARY SUBJECT: The main product/tool/entity being discussed (e.g., "VLC", "Chrome", "AWS", "Bitcoin")
      2. Technical domain tags (e.g., "Video Processing", "Machine Learning")
  }
}

### tone  
RULE: style_tags MUST align with detected output format
{
  "instruction": "ACTIONABLE: 'Communicate with [precision level], prioritizing [clarity/engagement/etc]. Avoid [specific anti-patterns].' DO NOT list style_tags here - they go in metadata only.",
  "version": 4,
  "source": "synthesis",
  "metadata": {
    "style_tags": REQUIRED - Discrete values for filtering (e.g., ["Technical", "Precise"]),
    "banned_phrases": Extract from conversation or use domain standard
  }
}

### framework
RULE: Pick reasoning_type that matches task complexity from conversation
{
  "instruction": "ACTIONABLE: 'Apply [methodology name] reasoning, breaking problems into [specific steps]. When facing [scenario], use [specific approach].' DO NOT just say 'reasoning_type is X'.",
  "version": 4,
  "source": "synthesis",
  "metadata": {
    "reasoning_type": REQUIRED - Choose based on conversation:
      - Coding/data → "Step-by-Step" or "First-Principles"
      - Complex problems → "Chain-of-Thought" or "Tree-of-Thought" or "Atom-of-Thought"
      - Research → "Deductive" or "Analytical"
      - Creative → "Analogical" or "Creative"
  }
}

### constraints
RULE: NEVER GENERIC - Use training data for TOP-TIER domain constraints
{
  "instruction": "ACTIONABLE: 'Always [do X]. Never [do Y]. Ensure responses are [quality standard].' This is the prose directive. DO NOT list prohibitions/requirements here - they go in metadata.",
  "version": 4,
  "source": "synthesis",
  "metadata": {
    "prohibitions": Array of 3+ discrete rules (single phrases like "using generic terms"),
    "requirements": Array of 3+ discrete rules (single phrases like "providing concrete examples"),
    "response_length": Infer from conversation pattern or use appropriate default
  }
}

### format
RULE: Extract from conversation patterns or use TOP-TIER for domain
{
  "instruction": "ACTIONABLE: 'Structure responses as [format description]. Include [specific elements]. Use [formatting conventions].' DO NOT just say 'output_type is Markdown'.",
  "version": 4,
  "source": "synthesis",
  "metadata": {
    "output_type": REQUIRED - "Markdown" | "Plaintext" | "Code" | "JSON" | "Structured" | "Other"
  }
}

### exemplar
RULE: From conversation OR generate TOP-TIER examples from training data
{
  "instruction": "Provide specific examples of ideal responses. Include 2+ quality patterns that demonstrate the expected output style and depth.",
  "version": 4,
  "source": "synthesis"
}

## TOP-LEVEL metadata (REQUIRED)
In addition to the 7 dimensions, include a top-level "metadata" object:
{
  "suggested_name": "2-4 word memorable name for this persona based on role/domain",
  "suggested_title": "Professional title or role (e.g., 'Chief AI Architect', 'Senior Tax Consultant')",
  "domain": "tech" | "creative" | "business" | "education" | "health" | "lifestyle" | "other",
  "primary_intent": "One sentence describing persona purpose"
}

## VALIDATION CHECKLIST
1. ✓ metadata.suggested_name is set (NOT generic like "Expert Assistant")
2. ✓ metadata.suggested_title is set (professional role/title)
3. ✓ context.metadata.domain is set  
4. ✓ context.metadata.scope_tags has ≥2 specific items
5. ✓ tone.metadata.style_tags aligns with format output_type
6. ✓ framework.metadata.reasoning_type matches conversation complexity
7. ✓ constraints has REAL rules (not generic placeholders)
8. ✓ NO empty instruction fields
9. ✓ exemplar has examples (from conversation or generated)

## REQUIRED OUTPUT STRUCTURE (EXACT FORMAT)
Return a JSON object with EXACTLY this structure - each dimension as a KEY:
{
  "persona": { "instruction": "...", "version": 4, "source": "synthesis" },
  "context": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "domain": "...", "scope_tags": [...] } },
  "tone": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "style_tags": [...] } },
  "framework": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "reasoning_type": "..." } },
  "constraints": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "prohibitions": [...], "requirements": [...] } },
  "format": { "instruction": "...", "version": 4, "source": "synthesis", "metadata": { "output_type": "..." } },
  "exemplar": { "instruction": "...", "version": 4, "source": "synthesis" },
  "metadata": { "suggested_name": "...", "suggested_title": "...", "domain": "...", "primary_intent": "..." }
}

CRITICAL: The root object MUST have these exact keys: persona, context, tone, framework, constraints, format, exemplar, metadata.
Do NOT return just the content of one dimension - return ALL dimensions as shown above.`;

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

      // Call LLM with schema enforcement
      const rawResult = await llmClient.call(prompt, {
        json: true,
        schema: schema
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

      // Handle wrapped response: { memory_layer: { persona, context, ... } }
      if (result?.memory_layer && typeof result.memory_layer === 'object') {
        console.log('[UnifiedAnalyzer] Unwrapping memory_layer from response');
        result = result.memory_layer;
      }

      // Handle double-wrapped: { data: { memory_layer: {...} } } or { output: {...} }
      if (result?.data?.memory_layer) {
        console.log('[UnifiedAnalyzer] Unwrapping data.memory_layer from response');
        result = result.data.memory_layer;
      } else if (result?.output && typeof result.output === 'object') {
        console.log('[UnifiedAnalyzer] Unwrapping output from response');
        result = result.output;
      }

      // ================================================================
      // VALIDATION - Check for expected dimension keys
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

      const missingKeys = expectedKeys.filter(k => !result[k]);
      if (missingKeys.length > 0) {
        console.warn('[UnifiedAnalyzer] Missing dimensions in response:', missingKeys);
        // Log first 500 chars of raw result for debugging
        const debugPreview = JSON.stringify(rawResult).substring(0, 500);
        console.warn('[UnifiedAnalyzer] Raw response preview:', debugPreview);
      }

      // Add metadata to each dimension
      const timestamp = Date.now();
      for (const key of expectedKeys) {
        if (result[key]) {
          result[key] = {
            ...result[key],
            analyzedAt: timestamp,
            messageCount: scrapedData.messages.length,
            _synthesized: true  // Mark as synthesized from conversation (vs extracted from prompt)
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
