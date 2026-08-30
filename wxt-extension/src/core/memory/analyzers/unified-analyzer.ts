/**
 * @fileoverview UNIFIED ANALYZER v3 - Single-Call Comprehensive Analysis
 * Ported from memory/analyzers/unified-analyzer.js (443 lines)
 * @module memory/analyzers/unified-analyzer
 */

import { ComponentSchemas } from '../component-schemas';
import type { ScrapedMessageTurn } from './recent-focus';

export const UnifiedAnalyzer = {
  id: 'unified_analyzer',
  inputSource: 'both',

  _formatConversation(messages: ScrapedMessageTurn[]): string {
    return messages.map((pair) => {
      let text = `--- Turn ${pair.id} ---\n`;
      if (pair.user?.prompt) text += `User: ${pair.user.prompt}\n`;
      if (pair.model?.response) {
        const resp = pair.model.response;
        text += `Assistant: ${resp.substring(0, 500)}${resp.length > 500 ? '...' : ''}\n`;
      }
      if (pair.rating?.value) {
        text += `[User Rating: ${pair.rating.value}/5 stars]\n`;
      }
      return text;
    }).join('\n');
  },

  _getRatingContext(messages: ScrapedMessageTurn[]): string {
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

    let basePrompt = `You are the "PERSONA ARCHITECT" - synthesizing Structured Expert Personas from conversation history into 7 balanced, modular dimensions.

## YOUR MISSION
Synthesize a comprehensive, modular Expert Persona from the conversation history across ALL 7 dimensions: ${dimensionList}, plus top-level metadata.

## CRITICAL BALANCE & LENGTH CONSTRAINTS (MANDATORY)
1. **CONCISE & DENSE**: Each dimension's 'instruction' field MUST be 2 to 4 sentences (under 80 words). NEVER write runaway monologues, repetitive essays, or endless descriptions.
2. **DISTRIBUTE ACROSS ALL DIMENSIONS**: Do NOT dump all information into 'persona'. Keep 'persona' strictly for identity/credentials (under 80 words), and populate each specific dimension with its dedicated guidance and structured metadata chips.
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

CRITICAL: Return ONLY the valid JSON object with ALL 8 top-level keys.`;

    if (includeSchemaHints) {
      basePrompt += `\n\nCRITICAL: Return ONLY valid JSON (no markdown, no code blocks).`;
    }

    return basePrompt;
  },

  async analyze(
    scrapedData: { messages?: ScrapedMessageTurn[] },
    llmClient: any,
    options: { enabledComponents?: string[] | null } = {}
  ): Promise<Record<string, any> | null> {
    if (!scrapedData?.messages?.length) return null;
    const prompt = this.getPrompt(scrapedData.messages, options.enabledComponents || null);
    const result = await llmClient.call(prompt, { json: true });
    return result?.json || result || null;
  }
};
