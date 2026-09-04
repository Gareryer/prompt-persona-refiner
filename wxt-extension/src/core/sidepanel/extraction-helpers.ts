/**
 * @fileoverview Sidepanel Extraction Processing and Review Helpers
 * Ported from sidepanel/sidepanel.js (Extraction sections)
 * @module sidepanel/extraction-helpers
 */

import type { PersonaV4 } from '../memory/schemas';

export function validateExtractionResponse(response: any): boolean {
  if (!response || typeof response !== 'object') return false;
  const candidate = response.memory_layer || response;
  return Boolean(candidate.persona || candidate.context || candidate.metadata);
}

export function parseExtractionResult(raw: string | object): { memory_layer: PersonaV4; metadata: any } | null {
  try {
    const parsed: any = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (validateExtractionResponse(parsed)) {
      return {
        memory_layer: parsed.memory_layer || parsed,
        metadata: parsed.metadata || {}
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function populateExtractionResults(result: { memory_layer: PersonaV4; metadata: any }): void {
  // Populate sidepanel input fields from extraction payload
}

export function renderExtTopicSummary(topics: string[]): string {
  return `<div class="ext-topics">${topics.map(t => `<span class="badge">${t}</span>`).join('')}</div>`;
}

export function renderExtIntent(intent: string): string {
  return `<p class="ext-intent"><strong>Intent:</strong> ${intent}</p>`;
}

export function renderExtEntities(entities: string[]): string {
  return `<div class="ext-entities">${entities.map(e => `<span class="entity-chip">${e}</span>`).join('')}</div>`;
}

export function updateSectionBadge(section: string, count: number): void {
  if (typeof document === 'undefined') return;
  const badge = document.querySelector(`.badge-${section}`);
  if (badge) badge.textContent = String(count);
}

export function initializeSectionBadges(): void {
  // Badges initialization hook
}

export function setupBadgeListeners(): void {
  // Badges update listeners hook
}

export function setupFormDirtyTracking(): { isDirty: boolean; setDirty: (d: boolean) => void } {
  let isDirty = false;
  return {
    get isDirty() { return isDirty; },
    setDirty: (d: boolean) => { isDirty = d; }
  };
}

export function handleExtractPersona(): void {
  // Main extraction trigger hook
}

export const V4_DIMENSION_KEYS = [
  'persona',
  'context',
  'tone',
  'framework',
  'constraints',
  'format',
  'exemplar'
] as const;

export function formatDimensionText(dimensionId: string, data: any): string {
  if (!data) return '';
  if (typeof data === 'string') return data;

  switch (dimensionId) {
    case 'tone':
      if (data.style_tags && Array.isArray(data.style_tags)) {
        return `Style: ${data.style_tags.join(', ')}\nBanned: ${(data.banned_phrases || []).join(', ')}`;
      }
      break;
    case 'constraints':
      if (data.hard_rules || data.soft_rules) {
        const hard = (data.hard_rules || []).map((r: string) => `- MUST: ${r}`).join('\n');
        const soft = (data.soft_rules || []).map((r: string) => `- PREFER: ${r}`).join('\n');
        return [hard, soft].filter(Boolean).join('\n\n');
      }
      break;
    case 'format':
      if (data.output_type || data.schema) {
        return `Type: ${data.output_type || 'Custom'}\n\n${data.schema || data.template || ''}`.trim();
      }
      break;
    case 'exemplar':
      if (data.patterns && Array.isArray(data.patterns)) {
        return data.patterns.map((p: any) => `Example: ${p.input || ''}\nResponse: ${p.output || ''}`).join('\n\n');
      }
      break;
  }

  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2);
  }
  return String(data);
}

export function formatPersonaText(persona: any): string {
  if (!persona) return '';
  if (typeof persona === 'string') return persona;
  if (persona.instruction) return persona.instruction;
  if (persona.role_definition) {
    return `${persona.role_definition}\n\n${persona.system_instructions || ''}`.trim();
  }
  return JSON.stringify(persona, null, 2);
}

export function isValidPersonaData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  return Boolean(data.instruction || data.role_definition || data.name);
}

export function isCloudSyncAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__SUPABASE_CONNECTED__);
}

export function mapCloudPersonaToLocal(cloudPersona: any): any {
  if (!cloudPersona) return null;
  return {
    id: cloudPersona.id,
    name: cloudPersona.name || 'Untitled Persona',
    role_definition: cloudPersona.role_definition || '',
    system_instructions: cloudPersona.system_instructions || '',
    domain_focus: cloudPersona.domain_focus || [],
    interaction_style: cloudPersona.interaction_style || {},
    updated_at: cloudPersona.updated_at || new Date().toISOString(),
    synced_at: Date.now()
  };
}
