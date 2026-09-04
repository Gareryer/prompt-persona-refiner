/**
 * @fileoverview Complete Persona Lifecycle Manager
 * Ported from sidepanel/sidepanel.js (L5341-L5624, L6244-L6315, L6559-L6680, L6811-L6960, L7803-L7880)
 * Manages save draft, local prompts, edit normalization, dirty-state guard, rebuild flow.
 * @module sidepanel/persona-lifecycle
 */

import type { PersonaV4 } from '../memory/schemas';
import { logger } from '../logging/logger';
import { SupabaseClient } from '../supabase/supabase-client';
import { isCloudSyncAvailable } from './extraction-helpers';

export interface PersonaDraft {
  id: string;
  name: string;
  persona?: PersonaV4;
  memory_layer?: Record<string, any>;
  metadata?: {
    domain?: string;
    tone?: string;
    complexity_level?: string;
    use_case_keywords?: string[];
    target_audience?: string;
    subdomains?: string[];
    [key: string]: any;
  };
  created_at: string;
  version?: number;
  source_prompt?: string;
  is_public?: boolean;
}

export interface SavedPromptItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  category?: string;
  _isLocal?: boolean;
}

/**
 * Global form dirty-tracking state (L6805-L6827)
 */
let _hasUnsavedChanges = false;
let _rebuildCancelled = false;

export function markFormDirty(): void {
  _hasUnsavedChanges = true;
}

export function resetFormDirty(): void {
  _hasUnsavedChanges = false;
}

export function hasUnsavedChanges(): boolean {
  return _hasUnsavedChanges;
}

export function cancelRebuild(): void {
  _rebuildCancelled = true;
  logger.info('[PersonaLifecycle] Rebuild cancelled by user');
}

export function isRebuildCancelled(): boolean {
  return _rebuildCancelled;
}

export function resetRebuildStatus(): void {
  _rebuildCancelled = false;
}

/**
 * Save a persona draft to chrome.storage.local (L5341-L5407)
 */
export async function handleSaveDraft(params: {
  name: string;
  extractionData: any;
  domain?: string;
  tone?: string;
  complexity?: string;
  keywords?: string[];
  audience?: string;
  subdomains?: string[];
}): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const { name, extractionData, domain, tone, complexity, keywords, audience, subdomains } = params;
  if (!extractionData) {
    return { success: false, error: 'No extraction data available to save.' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Please give your persona a name to save as draft.' };
  }

  const draft: PersonaDraft = {
    id: `draft_${Date.now()}`,
    name: trimmedName,
    ...extractionData,
    metadata: {
      ...(extractionData.metadata || {}),
      domain: domain || undefined,
      tone: tone || undefined,
      complexity_level: complexity || undefined,
      use_case_keywords: keywords || [],
      target_audience: audience !== '-' ? audience : '',
      subdomains: subdomains || []
    },
    created_at: new Date().toISOString()
  };

  try {
    let drafts: PersonaDraft[] = [];
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get('persona_drafts');
      drafts = result.persona_drafts || [];
      drafts.push(draft);
      await chrome.storage.local.set({ persona_drafts: drafts });
    }
    resetFormDirty();
    logger.info('[PersonaLifecycle] Draft saved successfully', { id: draft.id });
    return { success: true, draftId: draft.id };
  } catch (err: any) {
    logger.error('[PersonaLifecycle] Failed saving draft', { error: err });
    return { success: false, error: err.message };
  }
}

/**
 * Publish persona to Supabase Community Hub or fallback to local draft (L5412-L5550)
 * Strangler Fig: Local-first resilient.
 */
export async function handlePublishPersona(params: {
  name: string;
  extractionData: any;
  domain?: string;
  tone?: string;
  complexity?: string;
  keywords?: string[];
  audience?: string;
  subdomains?: string[];
}): Promise<{ success: boolean; id?: string; mode: 'cloud' | 'local_draft'; error?: string }> {
  const { name, extractionData } = params;
  if (!name.trim()) {
    return { success: false, mode: 'local_draft', error: 'Please give your persona a name.' };
  }

  // Check cloud sync availability
  const cloudAvailable = await isCloudSyncAvailable();

  if (cloudAvailable) {
    try {
      const sb = await SupabaseClient.getInstance();
      if (sb.user) {
        const res = await sb.createPersona({
          name: name.trim(),
          description: extractionData.persona?.instruction || '',
          category: params.domain || 'general',
          tags: params.keywords || [],
          persona_data: extractionData,
          is_public: true
        });
        if (res.data) {
          resetFormDirty();
          logger.info('[PersonaLifecycle] Persona published to Supabase', { id: res.data.id });
          return { success: true, id: res.data.id, mode: 'cloud' };
        }
      }
    } catch (err: any) {
      logger.warn('[PersonaLifecycle] Cloud publish failed, falling back to draft', { error: err.message });
    }
  }

  // Fallback: save as local draft
  const draftRes = await handleSaveDraft(params);
  return {
    success: draftRes.success,
    id: draftRes.draftId,
    mode: 'local_draft',
    error: draftRes.error
  };
}

/**
 * Save prompt template to chrome.storage.local (L6297-L6312)
 */
export async function savePromptLocal(promptData: {
  title: string;
  content: string;
  category?: string;
}): Promise<SavedPromptItem> {
  const newPrompt: SavedPromptItem = {
    id: `prompt_${Date.now()}`,
    title: promptData.title.trim() || 'Untitled Prompt',
    content: promptData.content.trim(),
    createdAt: new Date().toISOString(),
    category: promptData.category || 'General',
    _isLocal: true
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get('saved_prompts');
    const prompts: SavedPromptItem[] = result.saved_prompts || [];
    prompts.unshift(newPrompt);
    await chrome.storage.local.set({ saved_prompts: prompts });
  }

  logger.info('[PersonaLifecycle] Saved prompt locally', { id: newPrompt.id, title: newPrompt.title });
  return newPrompt;
}

/**
 * Load all saved prompts from local storage (L6126-L6190)
 */
export async function loadSavedPrompts(): Promise<SavedPromptItem[]> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get('saved_prompts');
    return result.saved_prompts || [];
  }
  return [];
}

/**
 * Delete a saved prompt by ID (L6319-L6355)
 */
export async function deleteSavedPrompt(promptId: string): Promise<boolean> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get('saved_prompts');
    const prompts: SavedPromptItem[] = result.saved_prompts || [];
    const filtered = prompts.filter(p => p.id !== promptId);
    await chrome.storage.local.set({ saved_prompts: filtered });
    return true;
  }
  return false;
}

/**
 * Prepare and normalize a persona object for the Edit form (L6657-L6680)
 */
export function loadPersonaToEdit(persona: any): Record<string, any> {
  markFormDirty();
  return {
    id: persona.id || `persona_${Date.now()}`,
    name: persona.name || persona.metadata?.suggested_name || 'Custom Persona',
    memory_layer: persona.memory_layer || persona,
    metadata: persona.metadata || {},
    provider: persona.provider || '-',
    llm_model: persona.llm_model || '-',
    version: persona.version || 1,
    version_history: persona.version_history || [],
    is_public: Boolean(persona.is_public),
    source_prompt: persona.source_prompt || ''
  };
}

/**
 * Extract persona from a saved prompt content (L6404-L6420)
 */
export function extractFromSavedPrompt(promptContent: string): { prompt: string; source: string } {
  return {
    prompt: promptContent.trim(),
    source: 'saved_prompt'
  };
}

/**
 * Setup Synthesized Persona Save callback post-extraction (L7803-L7880)
 */
export async function setupSynthesizedPersonaSave(params: {
  personaData: any;
  sessionId: string;
  name?: string;
}): Promise<{ success: boolean; sessionKey?: string }> {
  const { personaData, sessionId, name } = params;
  if (!sessionId) return { success: false };

  const instruction = typeof personaData === 'string'
    ? personaData
    : (personaData.persona?.instruction || JSON.stringify(personaData));

  const sessionKey = `session_${sessionId}`;
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const res = await chrome.storage.local.get(sessionKey);
    const existing = res[sessionKey] || { components: {} };
    if (!existing.components) existing.components = {};
    existing.components.persona = {
      current: { instruction, version: 4, source: 'synthesized', name },
      history: existing.components.persona?.history || [],
      confidence: 1.0,
      updatedAt: Date.now()
    };
    await chrome.storage.local.set({ [sessionKey]: existing });
  }

  return { success: true, sessionKey };
}
