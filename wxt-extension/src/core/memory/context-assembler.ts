import type { PersonaV4, DimensionId } from './schemas';

export interface AssembledRefinementContext {
  systemPrompt: string;
  activeDimensions: DimensionId[];
  formattedContext: string;
}

/**
 * Assembles a structured prompt from active Persona V4 dimensions.
 */
export function assembleRefinementContext(
  persona: PersonaV4,
  enabledDimensions: DimensionId[] = ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar']
): AssembledRefinementContext {
  const sections: string[] = [];
  const active: DimensionId[] = [];

  for (const dimId of enabledDimensions) {
    const dim = persona[dimId];
    if (dim && dim.instruction) {
      active.push(dimId);
      const title = dimId.toUpperCase();
      sections.push(`[${title}]\n${dim.instruction}`);
    }
  }

  const formattedContext = sections.join('\n\n');
  const systemPrompt = formattedContext.length > 0
    ? `[SYSTEM PERSONA INSTRUCTIONS]\n${formattedContext}`
    : '';

  return {
    systemPrompt,
    activeDimensions: active,
    formattedContext
  };
}
