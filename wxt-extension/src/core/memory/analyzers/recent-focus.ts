/**
 * @fileoverview RECENT FOCUS - LLM-Based Immediate Context Analyzer
 * Ported from memory/analyzers/recent-focus.js (128 lines)
 * @module memory/analyzers/recent-focus
 */

export interface ScrapedMessageTurn {
  id: string | number;
  user?: { prompt?: string };
  model?: { response?: string };
  rating?: { value?: number };
}

export const RecentFocus = {
  id: 'recent_focus',
  inputSource: 'both',
  _lookbackCount: 3,

  getPrompt(recentMessages: ScrapedMessageTurn[]): string {
    const conversationText = recentMessages.map((pair) => {
      let text = `--- Turn ${pair.id} ---\n`;
      if (pair.user?.prompt) text += `User: ${pair.user.prompt}\n`;
      if (pair.model?.response) {
        text += `Assistant: ${pair.model.response.substring(0, 600)}${pair.model.response.length > 600 ? '...' : ''}\n`;
      }
      if (pair.rating?.value) {
        text += `[User rated this response: ${pair.rating.value}/5 stars]\n`;
      }
      return text;
    }).join('\n');

    const recentRatings = recentMessages.filter(m => m.rating?.value);
    const ratingContext = recentRatings.length > 0 ? `
RECENT RATINGS:
${recentRatings.length} of the last ${recentMessages.length} responses have been rated.
Recent rating trend: ${recentRatings.map(r => `${r.rating?.value}★`).join(' → ')}

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

  async analyze(scrapedData: { messages?: ScrapedMessageTurn[] }, llmClient: any): Promise<Record<string, any> | null> {
    if (!scrapedData?.messages?.length) {
      return null;
    }

    const recentMessages = scrapedData.messages.slice(-this._lookbackCount);
    if (!recentMessages.length) return null;

    if (!llmClient?.isConfigured?.() && !llmClient?.call) {
      return null;
    }

    try {
      const prompt = this.getPrompt(recentMessages);
      const result = await llmClient.call(prompt, { json: true });

      return {
        ...(result?.json || result || {}),
        turnsAnalyzed: recentMessages.length,
        analyzedAt: Date.now()
      };
    } catch (error) {
      console.error('[RecentFocus] Analysis failed:', error);
      return null;
    }
  }
};
