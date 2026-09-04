/**
 * @fileoverview Persona & Data Import/Export Utilities with Sanity & Moderation Checks
 * Ported from sidepanel/sidepanel.js (L7150-L8330)
 * @module sidepanel/import-export
 */

export const ALLOWED_IMPORT_EXTENSIONS = ['.json', '.txt', '.xml', '.md'] as const;
export const MAX_IMPORT_FILE_SIZE = 1 * 1024 * 1024; // 1 MB

export const EXTRACTION_SCHEMA = {
  version: '4.0.0',
  type: 'object',
  required: ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar']
} as const;

export const VALID_ENUMS = {
  domains: ['general', 'coding', 'writing', 'analysis', 'roleplay', 'stem', 'business'],
  tones: ['professional', 'casual', 'academic', 'concise', 'enthusiastic', 'direct', 'socratic'],
  formats: ['markdown', 'bullet_points', 'step_by_step', 'json', 'code_blocks', 'prose']
} as const;

export const VALID_DIMENSIONS = [
  'persona',
  'context',
  'tone',
  'framework',
  'constraints',
  'format',
  'exemplar'
] as const;

export function sanitizeTextContent(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload\s*=/gi, '')
    .replace(/onerror\s*=/gi, '');
}

export async function readAndSanitizeFile(file: File): Promise<{ content: any; type: string | null; error: string | null }> {
  const fileName = file.name.toLowerCase();
  const extension = fileName.substring(fileName.lastIndexOf('.'));

  if (!ALLOWED_IMPORT_EXTENSIONS.includes(extension as any)) {
    return { content: null, type: null, error: `Unsupported file type: ${extension}` };
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return { content: null, type: null, error: 'File exceeds 1MB limit' };
  }

  try {
    const rawText = await file.text();
    if (extension === '.json') {
      const parsed = JSON.parse(rawText);
      return { content: sanitizeImportedData(parsed), type: extension, error: null };
    }
    return { content: sanitizeTextContent(rawText), type: extension, error: null };
  } catch (err: any) {
    return { content: null, type: null, error: err.message };
  }
}

export function sanitizeImportedData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeImportedData(item));
  }
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'string') {
      clean[k] = sanitizeTextContent(v);
    } else if (typeof v === 'object' && v !== null) {
      clean[k] = sanitizeImportedData(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

export function importPersonaJSON(jsonString: string): { success: boolean; data?: any; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    return { success: true, data: sanitizeImportedData(parsed) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function exportPersonaJSON(persona: any): string {
  return JSON.stringify(persona, null, 2);
}

export function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

export function formatDiffValue(val: any): string {
  if (val === null || val === undefined) return '(empty)';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function diffObjects(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, { before: any; after: any }> {
  const diffs: Record<string, { before: any; after: any }> = {};
  const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

  for (const key of allKeys) {
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    if (JSON.stringify(val1) !== JSON.stringify(val2)) {
      diffs[key] = { before: val1, after: val2 };
    }
  }
  return diffs;
}

export function scanContentForModeration(text: string): { isSafe: boolean; flaggedTerms?: string[] } {
  if (!text || typeof text !== 'string') return { isSafe: true };
  const blockedPatterns = [/\b(hate_speech_example_placeholder)\b/gi];
  const flagged: string[] = [];
  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      flagged.push(pattern.source);
    }
  }
  return { isSafe: flagged.length === 0, flaggedTerms: flagged };
}
