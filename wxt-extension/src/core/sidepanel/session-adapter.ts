/**
 * @fileoverview Bi-directional Session Schema Adapter for Strangler Fig Storage Parity
 * Bridges between modern flat PersonaV4 objects and legacy nested components.persona.current storage.
 * Ported & enhanced from sidepanel/sidepanel.js (L5980, L7881-L7923)
 * @module sidepanel/session-adapter
 */

import type { PersonaV4 } from '../memory/schemas';
import { logger } from '../logging/logger';

export interface LegacyComponent {
  current?: {
    instruction?: string;
    version?: number;
    source?: string;
    [key: string]: any;
  };
  history?: Array<any>;
  confidence?: number;
  updatedAt?: number;
}

export interface LegacySessionData {
  components: Record<string, LegacyComponent>;
  currentGeneration?: number;
  sessionId?: string;
  updatedAt?: number;
}

/**
 * Format a memory key for display or lookup (L5980)
 */
export function formatMemoryKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Convert modern PersonaV4 object into legacy session components format.
 */
export function personaV4ToLegacyComponents(persona: PersonaV4): Record<string, LegacyComponent> {
  const components: Record<string, LegacyComponent> = {};
  const dimensions = ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar'] as const;

  for (const dim of dimensions) {
    const val = persona[dim];
    if (val && typeof val === 'object') {
      components[dim] = {
        current: {
          version: 4,
          source: 'manual',
          ...val,
          instruction: val.instruction || ''
        },
        history: [],
        confidence: 1.0,
        updatedAt: Date.now()
      };
    }
  }

  return components;
}

/**
 * Convert legacy session components format into modern PersonaV4 object.
 */
export function legacyComponentsToPersonaV4(components: Record<string, any> = {}): PersonaV4 {
  const persona: PersonaV4 = {};
  const dimensions = ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar'] as const;

  for (const dim of dimensions) {
    const comp = components[dim];
    if (comp?.current?.instruction) {
      persona[dim] = {
        instruction: comp.current.instruction,
        ...comp.current
      };
    }
  }

  return persona;
}

/**
 * Save persona to storage using the legacy V4 schema path (session_${sessionId}).
 * Guarantees zero regression with legacy content scripts and scrapers reading from chrome.storage.local.
 * Ported from sidepanel.js L7881-7923
 */
export async function savePersonaToStorage(
  personaText: string,
  sessionId: string,
  showToast: boolean = false
): Promise<{ success: boolean; sessionKey: string }> {
  if (!sessionId) {
    logger.warn('[SessionAdapter] savePersonaToStorage called with empty sessionId');
    return { success: false, sessionKey: '' };
  }

  logger.info('[SessionAdapter] Saving persona to session storage', {
    sessionId,
    length: personaText.length,
    showToast
  });

  const sessionKey = `session_${sessionId}`;
  let sessionData: LegacySessionData = { components: {} };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get(sessionKey);
      if (result[sessionKey]) {
        sessionData = result[sessionKey];
      }
    } catch (err: any) {
      logger.warn('[SessionAdapter] Failed reading existing session data', { error: err?.message });
    }
  }

  if (!sessionData.components) sessionData.components = {};

  if (!sessionData.components.persona) {
    sessionData.components.persona = {
      current: { instruction: personaText, version: 4, source: 'manual' },
      history: [],
      confidence: 1.0,
      updatedAt: Date.now()
    };
  } else {
    if (!sessionData.components.persona.current) {
      sessionData.components.persona.current = {};
    }
    sessionData.components.persona.current.instruction = personaText;
    sessionData.components.persona.current.source = 'manual';
    sessionData.components.persona.updatedAt = Date.now();
  }

  sessionData.updatedAt = Date.now();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [sessionKey]: sessionData });
  }

  logger.info('[SessionAdapter] Persona successfully persisted to V4 storage path', { sessionKey });
  return { success: true, sessionKey };
}

/**
 * Load persona from session storage using legacy key.
 */
export async function loadPersonaFromStorage(sessionId: string): Promise<PersonaV4 | null> {
  if (!sessionId) return null;
  const sessionKey = `session_${sessionId}`;

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(sessionKey);
    const data = result[sessionKey];
    if (data?.components) {
      return legacyComponentsToPersonaV4(data.components);
    }
  }
  return null;
}
