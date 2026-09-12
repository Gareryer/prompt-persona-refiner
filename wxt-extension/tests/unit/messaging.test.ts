import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageDispatcherService } from '@/services/message-dispatcher.service';
import { InMemoryStorageBackend, StorageRepository } from '@/core/storage/repository';
import type { PersonaV4 } from '@/core/memory/schemas';

describe('Batch 4: Background Message Dispatcher', () => {
  let backend: InMemoryStorageBackend;
  let storage: StorageRepository;
  let dispatcher: MessageDispatcherService;

  beforeEach(() => {
    backend = new InMemoryStorageBackend();
    storage = new StorageRepository(backend);
    dispatcher = new MessageDispatcherService(storage);
  });

  it('handles GET_SETTINGS and UPDATE_SETTINGS messages', async () => {
    const initial = await dispatcher.dispatch('GET_SETTINGS', undefined);
    expect(initial.theme).toBe('system');

    const updated = await dispatcher.dispatch('UPDATE_SETTINGS', { theme: 'dark' });
    expect(updated.theme).toBe('dark');
  });

  it('handles SAVE_PERSONA and GET_PERSONAS messages', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'You are an engineer.' },
      metadata: { suggested_name: 'Code Pro' }
    };

    const saveRes = await dispatcher.dispatch('SAVE_PERSONA', { id: 'p-1', persona });
    expect(saveRes.success).toBe(true);

    const personas = await dispatcher.dispatch('GET_PERSONAS', undefined);
    expect(personas['p-1']?.persona?.instruction).toBe('You are an engineer.');
  });

  it('handles REFINE_PROMPT using the active persona', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'Senior React Engineer' },
      constraints: { instruction: 'Write clean hooks' }
    };
    await storage.savePersona('active-p', persona);
    await storage.setActivePersonaId('active-p');

    const refineRes = await dispatcher.dispatch('REFINE_PROMPT', {
      rawPrompt: 'Build a navbar'
    });

    expect(refineRes.success).toBe(true);
    expect(refineRes.refinedPrompt).toContain('Senior React Engineer');
    expect(refineRes.refinedPrompt).toContain('Build a navbar');
    expect(refineRes.diffHtml).toContain('diff-added');
  });

  it('returns error when refining without an active persona', async () => {
    const refineRes = await dispatcher.dispatch('REFINE_PROMPT', {
      rawPrompt: 'Build a navbar'
    });

    expect(refineRes.success).toBe(false);
    expect(refineRes.error).toContain('No active persona');
  });

  it('returns an empty-prompt error for REFINE_PROMPT without rawPrompt', async () => {
    const res = await dispatcher.dispatch('REFINE_PROMPT', {});
    expect(res.success).toBe(false);
    expect(res.error).toContain('Empty prompt');
  });

  it('handles CHECK_API_KEY based on active provider settings', async () => {
    vi.spyOn(storage, 'getSettings').mockResolvedValue({
      activeModelProvider: '',
      activeModelName: ''
    } as any);
    const resNo = await dispatcher.dispatch('CHECK_API_KEY', undefined);
    expect(resNo.hasKey).toBe(false);
    expect(resNo.canOpenOptions).toBe(true);

    vi.spyOn(storage, 'getSettings').mockResolvedValue({
      activeModelProvider: 'gemini',
      activeModelName: 'gemini-2.0-flash'
    } as any);
    const resYes = await dispatcher.dispatch('CHECK_API_KEY', undefined);
    expect(resYes.hasKey).toBe(true);
  });

  it('rejects EXTRACT_PERSONA without a prompt', async () => {
    const res = await dispatcher.dispatch('EXTRACT_PERSONA', { prompt: '' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('No prompt provided');
  });

  it('rejects EXTRACT_PERSONA when prompt is not a parseable persona', async () => {
    const res = await dispatcher.dispatch('EXTRACT_PERSONA', { prompt: 'this is not a persona block' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Could not parse valid persona');
  });

  it('saves, lists, and deletes personas', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'Delete me.' }
    };
    await dispatcher.dispatch('SAVE_PERSONA', { id: 'del-1', persona });
    const listOne = await dispatcher.dispatch('GET_PERSONAS', undefined);
    expect((listOne as any)['del-1']).toBeDefined();

    const delRes = await dispatcher.dispatch('DELETE_PERSONA', { id: 'del-1' });
    expect(delRes.success).toBe(true);
    const listTwo = await dispatcher.dispatch('GET_PERSONAS', undefined);
    expect((listTwo as any)['del-1']).toBeUndefined();
  });

  it('returns not-found error when publishing a missing persona', async () => {
    const res = await dispatcher.dispatch('PUBLISH_PERSONA', { id: 'missing-999' });
    expect(res.success).toBe(false);
    expect(res.error).toContain('not found');
  });

  it('publishes an existing persona through the supabase adapter', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'Publish me.' }
    };
    await dispatcher.dispatch('SAVE_PERSONA', { id: 'pub-1', persona });

    const supabaseStub = {
      publishPersona: vi.fn().mockResolvedValue({ success: true, id: 'public-abc', error: undefined })
    } as any;
    const withStub = new MessageDispatcherService(storage, supabaseStub);

    const res = await withStub.dispatch('PUBLISH_PERSONA', { id: 'pub-1' });
    expect(res.success).toBe(true);
    expect(res.publicId).toBe('public-abc');
    expect(supabaseStub.publishPersona).toHaveBeenCalled();
  });

  it('opens options page when chrome runtime is available', async () => {
    const openOptionsPage = vi.fn();
    (globalThis as any).chrome = { runtime: { openOptionsPage } };
    try {
      const res = await dispatcher.dispatch('OPEN_OPTIONS_PAGE', undefined);
      expect(res.success).toBe(true);
      expect(openOptionsPage).toHaveBeenCalled();
    } finally {
      delete (globalThis as any).chrome;
    }
  });

  it('injects prompt into the active tab when chrome tabs are available', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([{ id: 7 }]),
        sendMessage
      }
    };
    try {
      const res = await dispatcher.dispatch('INJECT_PROMPT_TO_ACTIVE_TAB', { text: 'Hello world' });
      expect(res.success).toBe(true);
      expect(sendMessage).toHaveBeenCalledWith(7, { type: 'SET_COMPOSER_TEXT', text: 'Hello world' });
    } finally {
      delete (globalThis as any).chrome;
    }
  });

  it('reports no active tab when chrome queries return empty', async () => {
    (globalThis as any).chrome = {
      tabs: { query: vi.fn().mockResolvedValue([]), sendMessage: vi.fn() }
    };
    try {
      const res = await dispatcher.dispatch('INJECT_PROMPT_TO_ACTIVE_TAB', { text: 'Nowhere' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('No active tab');
    } finally {
      delete (globalThis as any).chrome;
    }
  });

  it('returns an unknown-type error for unhandled message types', async () => {
    const res = await dispatcher.dispatch('NON_EXISTENT_TYPE' as any, undefined);
    expect(res.success).toBe(false);
    expect(String(res.error)).toContain('Unknown message type');
  });
});
