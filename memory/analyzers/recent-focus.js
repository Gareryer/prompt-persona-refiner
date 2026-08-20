/**
 * ============================================================================
 * RECENT FOCUS - LLM-Based Immediate Context Analyzer
 * ============================================================================
 * 
 * Uses LLM to understand what's happening RIGHT NOW in the conversation,
 * capturing the immediate context and momentum of the last few turns.
 * 
 * Input: Both (user prompts + model responses) - last 3 turns only
 * Purpose: Provides "working memory" for immediate continuity
 * 
 * ============================================================================
 */

const RecentFocus = {
    id: 'recent_focus',
    inputSource: 'both',
    _lookbackCount: 3,

    /**
     * Build the analysis prompt with purpose context
     */
    getPrompt(recentMessages) {
        const conversationText = recentMessages.map((pair, i) => {
            let text = `--- Turn ${pair.id} ---\n`;
            if (pair.user?.prompt) text += `User: ${pair.user.prompt}\n`;
            if (pair.model?.response) text += `Assistant: ${pair.model.response.substring(0, 600)}${pair.model.response.length > 600 ? '...' : ''}\n`;
            // Include rating for recent context
            if (pair.rating?.value) {
                text += `[User rated this response: ${pair.rating.value}/5 stars]\n`;
            }
            return text;
        }).join('\n');

        // Check for recent ratings
        const recentRatings = recentMessages.filter(m => m.rating?.value);
        const ratingContext = recentRatings.length > 0 ? `
RECENT RATINGS:
${recentRatings.length} of the last ${recentMessages.length} responses have been rated.
Recent rating trend: ${recentRatings.map(r => `${r.rating.value}★`).join(' → ')}

Use ratings to assess:
- Is the conversation going well (high ratings)?
- Is the user frustrated (low ratings)?
- Should the approach change?
` : '';

        return `You are analyzing the MOST RECENT part of a conversation to capture immediate context.

PURPOSE OF YOUR ANALYSIS:
This is "working memory" - what's being discussed RIGHT NOW.
Your analysis helps the persona understand the current state and momentum of the conversation.
This is different from overall summary - it's about the LIVE, IMMEDIATE context.

CRITICAL BREVITY RULES (MANDATORY):
- Keep each property strictly concise (1 sentence max, under 20 words).
- Do NOT generate paragraphs or long narrative descriptions.
${ratingContext}
RECENT CONVERSATION (Last ${recentMessages.length} turns):
${conversationText}

ANALYZE THE IMMEDIATE CONTEXT AND RETURN ONLY JSON:
{
  "currentFocus": "1 concise sentence (<20 words): What is being actively discussed right now?",
  "lastRequest": "1 concise sentence (<20 words): What did the user most recently ask for?",
  "activeTask": "Short phrase (<15 words): What task or activity is in progress?",
  "momentum": {
    "direction": "progressing/refining/stuck/pivoting/wrapping-up",
    "observation": "Brief 1-sentence note (<15 words) on why you assessed this"
  },
  "recentSatisfaction": "low/neutral/high based on recent ratings, or 'unknown' if no ratings",
  "openItems": ["1-3 short bullet items of unresolved questions or pending tasks"],
  "immediateNeeds": "1 concise sentence (<20 words): What does the user need next?",
  "continuityContext": "1 concise sentence (<20 words): Key context to carry forward"
}`;
    },

    /**
     * Analyze recent turns using LLM
     * @param {Object} scrapedData - Scraped conversation data
     * @param {LLMClient} llmClient - Configured LLM client
     * @returns {Promise<Object>}
     */
    async analyze(scrapedData, llmClient) {
        if (!scrapedData?.messages?.length) {
            return null;
        }

        // Get only last N messages
        const recentMessages = scrapedData.messages.slice(-this._lookbackCount);

        if (!recentMessages.length) {
            return null;
        }

        if (!llmClient?.isConfigured()) {
            console.warn('[RecentFocus] LLM client not configured');
            return null;
        }

        try {
            const prompt = this.getPrompt(recentMessages);
            const result = await llmClient.call(prompt, { json: true });

            return {
                ...result,
                turnsAnalyzed: recentMessages.length,
                analyzedAt: Date.now()
            };
        } catch (error) {
            console.error('[RecentFocus] Analysis failed:', error);
            return null;
        }
    }
};

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.RecentFocus = RecentFocus;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RecentFocus };
}
