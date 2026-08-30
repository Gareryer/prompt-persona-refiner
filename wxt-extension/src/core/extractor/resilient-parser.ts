import { validatePersonaV4, type PersonaV4, cleanInstruction } from '../memory/schemas';

export interface ExtractionResult {
  persona: PersonaV4;
  rawJson: string;
}

/**
 * Robustly parses and extracts JSON from various LLM response shapes.
 */
export function parseExtractionResponse(rawText: string): ExtractionResult | null {
  if (!rawText || typeof rawText !== 'string') return null;

  let cleaned = cleanInstruction(rawText);

  // Try direct parse first
  let parsedObj: any = null;
  try {
    parsedObj = JSON.parse(cleaned);
  } catch {
    // Attempt regex extraction of outermost JSON object
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsedObj = JSON.parse(match[0]);
      } catch {
        // Attempt minor syntax fixes (trailing commas, unbalanced quotes)
        const repaired = match[0]
          .replace(/,\s*([}\]])/g, '$1') // trailing commas
          .replace(/([\r\n]+)/g, ' '); // unescaped newlines inside strings
        try {
          parsedObj = JSON.parse(repaired);
        } catch {
          return null;
        }
      }
    }
  }

  if (!parsedObj || typeof parsedObj !== 'object') {
    return null;
  }

  // Handle both { memory_layer, metadata } shape and flat shape
  const candidate: any = {};
  if (parsedObj.memory_layer) {
    Object.assign(candidate, parsedObj.memory_layer);
  }
  if (parsedObj.metadata) {
    candidate.metadata = parsedObj.metadata;
  }

  // If top-level was already flat dimensions
  for (const dim of ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar']) {
    if (parsedObj[dim] && !candidate[dim]) {
      candidate[dim] = parsedObj[dim];
    }
  }

  const validation = validatePersonaV4(candidate);
  if (!validation.success || !validation.data) {
    return null;
  }

  return {
    persona: validation.data,
    rawJson: JSON.stringify(validation.data, null, 2)
  };
}
