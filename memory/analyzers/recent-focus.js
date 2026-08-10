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

IMPORTANT:
Only analyze what's happening in these recent turns, not the entire conversation.
Focus on: What are they working on now? What was just asked? What's the current momentum?
${ratingContext}
RECENT CONVERSATION (Last ${recentMessages.length} turns):
${conversationText}

ANALYZE THE IMMEDIATE CONTEXT AND RETURN JSON:
{
  "currentFocus": "What is being actively worked on or discussed right now?",
  "lastRequest": "What did the user most recently ask for or want?",
  "activeTask": "What task/activity is in progress? (e.g., 'implementing feature X', 'debugging Y')",
  "momentum": {
    "direction": "progressing/refining/stuck/pivoting/wrapping-up",
    "observation": "Brief note on why you assessed this"
  },
  "recentSatisfaction": "low/neutral/high based on recent ratings, or 'unknown' if no ratings",
  "openItems": ["Any unresolved questions or pending items"],
  "immediateNeeds": "What does the user likely need next based on current context?",
  "continuityContext": "Key context that should be carried into the next interaction"
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
