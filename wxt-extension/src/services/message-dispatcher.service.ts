import { StorageRepository } from '../core/storage/repository';
import { SupabaseClientAdapter } from '../adapters/storage/supabase-client';
import { assembleRefinementContext } from '../core/memory/context-assembler';
import { renderDiffHtml } from '../core/refiner/diff-engine';
import { parseExtractionResponse } from '../core/extractor/resilient-parser';
import type { ProtocolMap } from '../lib/messaging/protocol';

export class MessageDispatcherService {
  constructor(
    private storage: StorageRepository = new StorageRepository(),
    private supabase: SupabaseClientAdapter = new SupabaseClientAdapter()
  ) {}

  async dispatch<K extends keyof ProtocolMap>(
    type: K,
    payload: any
  ): Promise<ProtocolMap[K]['response']> {
    switch (type) {
      case 'CHECK_API_KEY': {
        const settings = await this.storage.getSettings();
        const hasKey = Boolean(settings.activeModelProvider && settings.activeModelName);
        return { hasKey, canOpenOptions: true } as any;
      }

      case 'OPEN_OPTIONS_PAGE': {
        if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        return { success: true } as any;
      }

      case 'GET_SETTINGS': {
        return (await this.storage.getSettings()) as any;
      }

      case 'UPDATE_SETTINGS': {
        return (await this.storage.updateSettings(payload)) as any;
      }

      case 'GET_PERSONAS': {
        return (await this.storage.getPersonas()) as any;
      }

      case 'SAVE_PERSONA': {
        const success = await this.storage.savePersona(payload.id, payload.persona);
        return { success } as any;
      }

      case 'DELETE_PERSONA': {
        const success = await this.storage.deletePersona(payload.id);
        return { success } as any;
      }

      case 'PUBLISH_PERSONA': {
        const persona = await this.storage.getPersona(payload.id);
        if (!persona) {
          return { success: false, error: 'Persona not found' } as any;
        }
        const result = await this.supabase.publishPersona(persona);
        return { success: result.success, publicId: result.id, error: result.error } as any;
      }

      case 'REFINE_PROMPT': {
        const { rawPrompt, personaId, activeDimensions } = payload || {};
        if (!rawPrompt) {
          return { success: false, error: 'Empty prompt' } as any;
        }
        let persona = null;
        if (personaId) {
          persona = await this.storage.getPersona(personaId);
        }
        if (!persona) {
          const activeId = await this.storage.getActivePersonaId();
          if (activeId) persona = await this.storage.getPersona(activeId);
        }

        if (!persona) {
          return { success: false, error: 'No active persona configured' } as any;
        }

        const assembled = assembleRefinementContext(persona, activeDimensions);
        const refinedPrompt = `${assembled.systemPrompt}\n\n[USER PROMPT]\n${rawPrompt}`.trim();
        const diffHtml = renderDiffHtml(rawPrompt, refinedPrompt);

        return { success: true, refinedPrompt, diffHtml } as any;
      }

      case 'EXTRACT_PERSONA': {
        const { prompt } = payload || {};
        if (!prompt) {
          return { success: false, error: 'No prompt provided' } as any;
        }
        const parsed = parseExtractionResponse(prompt);
        if (parsed) {
          return { success: true, data: parsed.persona } as any;
        }
        return { success: false, error: 'Could not parse valid persona from prompt' } as any;
      }

      default:
        return { success: false, error: `Unknown message type: ${String(type)}` } as any;
    }
  }
}
