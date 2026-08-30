/**
 * @fileoverview Complete Context Assembler v4 - Unified Context Builder
 * Ported from memory/context-assembler.js (576 lines)
 */

import type { PersonaV4, DimensionId } from './schemas';
import { logger } from '../logging/logger';

export interface AssembledRefinement {
  systemPrompt: string;
  userPrompt: string;
  assembledAt: number;
  activeDimensions: DimensionId[];
  tokenEstimate: number;
}

export class ContextAssembler {
  static assemble(persona: PersonaV4, activeDimensions?: DimensionId[]): AssembledRefinement {
    const start = performance.now();
    const dimensionsToInclude = activeDimensions || [
      'persona',
      'context',
      'tone',
      'framework',
      'constraints',
      'format',
      'exemplar'
    ];

    const sections: string[] = [];
    const includedIds: DimensionId[] = [];

    // 1. Header / Persona Identity
    if (dimensionsToInclude.includes('persona') && persona.persona?.instruction?.trim()) {
      sections.push(`[PERSONA]\n${persona.persona.instruction.trim()}`);
      includedIds.push('persona');
    }

    // 2. Domain Context
    if (dimensionsToInclude.includes('context') && persona.context?.instruction?.trim()) {
      sections.push(`[CONTEXT]\n${persona.context.instruction.trim()}`);
      includedIds.push('context');
    }

    // 3. Tone & Style
    if (dimensionsToInclude.includes('tone') && persona.tone?.instruction?.trim()) {
      sections.push(`[TONE]\n${persona.tone.instruction.trim()}`);
      includedIds.push('tone');
    }

    // 4. Framework & Methods
    if (dimensionsToInclude.includes('framework') && persona.framework?.instruction?.trim()) {
      sections.push(`[FRAMEWORK]\n${persona.framework.instruction.trim()}`);
      includedIds.push('framework');
    }

    // 5. Constraints & Invariants
    if (dimensionsToInclude.includes('constraints') && persona.constraints?.instruction?.trim()) {
      sections.push(`[CONSTRAINTS]\n${persona.constraints.instruction.trim()}`);
      includedIds.push('constraints');
    }

    // 6. Format Preferences
    if (dimensionsToInclude.includes('format') && persona.format?.instruction?.trim()) {
      sections.push(`[FORMAT]\n${persona.format.instruction.trim()}`);
      includedIds.push('format');
    }

    // 7. Exemplars
    if (dimensionsToInclude.includes('exemplar') && persona.exemplar?.instruction?.trim()) {
      sections.push(`[EXEMPLAR]\n${persona.exemplar.instruction.trim()}`);
      includedIds.push('exemplar');
    }

    const systemPrompt = sections.join('\n\n');
    const tokenEstimate = Math.ceil(systemPrompt.length / 4);

    logger.debug('Context assembled', {
      durationMs: Math.round(performance.now() - start),
      tokenEstimate,
      includedCount: includedIds.length
    });

    return {
      systemPrompt,
      userPrompt: '',
      assembledAt: Date.now(),
      activeDimensions: includedIds,
      tokenEstimate
    };
  }

  static buildRefinedPrompt(userPrompt: string, persona: PersonaV4, activeDimensions?: DimensionId[]): string {
    const assembled = this.assemble(persona, activeDimensions);
    if (!assembled.systemPrompt) return userPrompt;
    return `${assembled.systemPrompt}\n\n[USER REQUEST]\n${userPrompt}`.trim();
  }
}

export function assembleRefinementContext(persona: PersonaV4, activeDimensions?: DimensionId[]) {
  return ContextAssembler.assemble(persona, activeDimensions);
}
