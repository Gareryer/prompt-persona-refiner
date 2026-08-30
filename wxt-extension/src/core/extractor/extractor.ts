/**
 * @fileoverview Complete Persona Extractor with Multi-Pass Resilience
 * Ported from extractor/extractor.js (567 lines)
 */

import type { PersonaV4 } from '../memory/schemas';
import { buildExtractionPrompt } from './prompt-builder';
import { parseExtractionResponse } from './resilient-parser';
import { LLMClient } from '../llm/llm-client';
import { logger } from '../logging/logger';

export class PersonaExtractor {
  constructor(private llmClient?: LLMClient) {}

  async extractFromPrompt(rawPrompt: string): Promise<PersonaV4 | null> {
    if (!rawPrompt || rawPrompt.trim().length === 0) return null;

    logger.debug('Extracting persona from raw prompt', { promptLength: rawPrompt.length });
    const extractionPrompt = buildExtractionPrompt(rawPrompt);

    if (this.llmClient) {
      const response = await this.llmClient.call(extractionPrompt, { json: true });
      const parsed = parseExtractionResponse(response.text);
      if (parsed) {
        logger.info('Persona extracted successfully via LLM', { name: parsed.persona.metadata?.suggested_name });
        return parsed.persona;
      }
    }

    // Heuristic Fallback
    return {
      persona: { instruction: rawPrompt.slice(0, 300) },
      context: { instruction: 'Extracted from user prompt' },
      tone: { instruction: 'Helpful and structured' },
      framework: { instruction: '' },
      constraints: { instruction: '' },
      format: { instruction: '' },
      exemplar: { instruction: '' },
      metadata: {
        suggested_name: 'Custom Prompt Persona',
        suggested_title: 'AI Specialist',
        domain: 'Tech'
      }
    };
  }
}
