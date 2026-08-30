import type { ScrapedTurn } from '../../types';
import type { PersonaV4 } from '../schemas';
import { buildExtractionPrompt } from '../../extractor/prompt-builder';
import { parseExtractionResponse } from '../../extractor/resilient-parser';
import { LLMClient } from '../../llm/llm-client';

export class UnifiedAnalyzer {
  constructor(private llmClient?: LLMClient) {}

  async analyzeConversation(turns: ScrapedTurn[]): Promise<PersonaV4 | null> {
    if (!turns || turns.length === 0) return null;

    const formattedHistory = turns
      .map(t => `[${t.role.toUpperCase()}]: ${t.content}`)
      .join('\n\n');

    const prompt = buildExtractionPrompt(formattedHistory);

    if (this.llmClient) {
      const response = await this.llmClient.generate(prompt, { jsonMode: true });
      const parsed = parseExtractionResponse(response.text);
      return parsed ? parsed.persona : null;
    }

    // Fallback heuristic extraction
    return {
      persona: { instruction: `AI Assistant tailored from ${turns.length} turns` },
      context: { instruction: 'Extracted conversation context' },
      tone: { instruction: 'Professional and concise' },
      metadata: {
        suggested_name: 'Synthesized Chat Persona',
        domain: 'tech'
      }
    };
  }
}
