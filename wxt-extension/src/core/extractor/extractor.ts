
export const EXTRACTION_PROMPT = `You are an expert prompt engineer and persona architect. Analyze the provided conversation history and extract the underlying user persona, intent, domain context, tone preferences, constraints, formatting rules, and exemplars according to the Persona V4 schema.`;

export function extLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data?: Record<string, any>): void {
  logger[level](`[PersonaExtractor] ${msg}`, data);
}
/**
 * @fileoverview Complete Persona Extractor with Multi-Pass Resilience & Draft Management
 * Ported from extractor/extractor.js (567 lines)
 * @module extractor/extractor
 */

import type { PersonaV4 } from '../memory/schemas';
import { buildExtractionPrompt } from './prompt-builder';
import { parseExtractionResponse } from './resilient-parser';
import { LLMClient } from '../llm/llm-client';
import { logger } from '../logging/logger';

export interface PersonaDraft {
  id: string;
  source_prompt: string;
  memory_layer: PersonaV4;
  metadata: Record<string, any>;
  provider: string;
  llm_model: string;
  created_at: string;
  is_public: boolean;
}

export interface ExtractedPersonaResult {
  memory_layer: PersonaV4;
  metadata: Record<string, any>;
}

export class PersonaExtractor {
  public drafts: PersonaDraft[] = [];
  public currentDraft: PersonaDraft | null = null;

  constructor(private llmClient?: LLMClient) {}

  async init(): Promise<void> {
    logger.info('Initializing PersonaExtractor...');
    await this.loadDrafts();
    logger.info('PersonaExtractor ready', { draftCount: this.drafts.length });
  }

  async loadDrafts(): Promise<PersonaDraft[]> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const res = await chrome.storage.local.get(['persona_drafts']);
      this.drafts = (res.persona_drafts as PersonaDraft[]) || [];
    }
    return this.drafts;
  }

  async saveDrafts(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ persona_drafts: this.drafts });
    }
  }

  async extractFromPrompt(prompt: string): Promise<{ success: boolean; data?: ExtractedPersonaResult; error?: string }> {
    if (!prompt || prompt.trim().length < 10) {
      return { success: false, error: 'Prompt is too short' };
    }

    logger.info('Starting extraction...', { promptLength: prompt.length });

    try {
      const extractionPrompt = buildExtractionPrompt(prompt);
      let responseText = '';

      if (this.llmClient) {
        const response = await this.llmClient.call(extractionPrompt, { json: true });
        responseText = response?.text || JSON.stringify(response);
      } else if (typeof chrome !== 'undefined' && Boolean(chrome.runtime?.sendMessage)) {
        const modelConfig = await this.getModelConfig();
        if (!modelConfig) {
          return { success: false, error: 'No LLM model configured.' };
        }
        const resp = await this.callLLM(prompt, modelConfig);
        if (!resp.success) {
          return { success: false, error: resp.error || 'LLM call failed' };
        }
        responseText = resp.text || '';
      }

      const parsed = this.parseExtractionResponse(responseText);
      if (!parsed) {
        return { success: false, error: 'Failed to parse LLM extraction response' };
      }

      this.currentDraft = {
        id: this.generateDraftId(),
        source_prompt: prompt,
        memory_layer: parsed.memory_layer,
        metadata: parsed.metadata,
        provider: 'auto',
        llm_model: 'auto',
        created_at: new Date().toISOString(),
        is_public: false
      };

      return { success: true, data: parsed };
    } catch (err: any) {
      logger.error('Extraction failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  async getModelConfig(): Promise<{ provider: string; model: string; apiKey?: string } | null> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return null;
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_MODEL_CONFIG' }, (response) => {
        if (response?.provider && response?.model) {
          resolve(response);
        } else {
          resolve(null);
        }
      });
    });
  }

  async callLLM(prompt: string, modelConfig: any): Promise<{ success: boolean; text?: string; error?: string }> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false, error: 'Extension runtime unavailable' };
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'EXTRACT_PERSONA',
        payload: { prompt, modelConfig }
      }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { success: false, error: 'Empty response' });
        }
      });
    });
  }

  parseExtractionResponse(text: string): ExtractedPersonaResult | null {
    if (!text || typeof text !== 'string') return null;

    try {
      let cleaned = text.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          return null;
        }
      }

      if (!parsed.memory_layer && parsed.persona) {
        parsed = {
          memory_layer: parsed,
          metadata: parsed.metadata || {
            suggested_name: 'Extracted Persona',
            suggested_title: 'AI Expert',
            domain: 'Tech'
          }
        };
      }

      if (!parsed.memory_layer || !parsed.metadata) {
        return null;
      }

      return parsed as ExtractedPersonaResult;
    } catch (err: any) {
      logger.error('JSON parse failed in parseExtractionResponse', { error: err.message });
      return null;
    }
  }

  generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async saveCurrentDraft(name?: string): Promise<{ success: boolean; draft?: PersonaDraft }> {
    if (!this.currentDraft) return { success: false };
    if (name) {
      this.currentDraft.metadata.suggested_name = name;
    }
    this.drafts.push(this.currentDraft);
    await this.saveDrafts();
    return { success: true, draft: this.currentDraft };
  }

  async updateDraft(draftId: string, updates: Partial<PersonaDraft>): Promise<{ success: boolean }> {
    const index = this.drafts.findIndex(d => d.id === draftId);
    if (index === -1) return { success: false };
    this.drafts[index] = { ...this.drafts[index]!, ...updates };
    await this.saveDrafts();
    return { success: true };
  }

  async deleteDraft(draftId: string): Promise<{ success: boolean }> {
    this.drafts = this.drafts.filter(d => d.id !== draftId);
    await this.saveDrafts();
    return { success: true };
  }

  getDrafts(): PersonaDraft[] {
    return this.drafts;
  }

  getCurrentDraft(): PersonaDraft | null {
    return this.currentDraft;
  }

  async importToMemoryLayer(memoryLayer: PersonaV4, personaId: string | null = null): Promise<{ success: boolean }> {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return { success: false };
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'IMPORT_PERSONA_MEMORY',
        payload: { memoryLayer, personaId }
      }, (response) => {
        resolve({ success: Boolean(response?.success) });
      });
    });
  }

  async publishDraft(draftId: string, isPublic: boolean = false): Promise<{ success: boolean; persona?: any; error?: string }> {
    const draft = this.drafts.find(d => d.id === draftId);
    if (!draft) {
      return { success: false, error: 'Draft not found' };
    }
    extLog('info', 'Publishing draft...', { id: draftId, isPublic });
    try {
      const { SupabaseClient } = await import('../supabase/supabase-client');
      const supabase = await SupabaseClient.getInstance();
      if (!supabase.isAuthenticated()) {
        const { error } = await supabase.signInAnonymously();
        if (error) return { success: false, error: 'Authentication failed' };
      }
      const res = await supabase.createPersona({
        name: draft.metadata.suggested_name,
        memory_layer: draft.memory_layer,
        source_prompt: draft.source_prompt,
        provider: draft.provider,
        is_public: isPublic
      });
      return { success: !res.error, persona: res.data, error: res.error?.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

}
