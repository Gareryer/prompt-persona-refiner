import { describe, it, expect, beforeEach } from 'vitest';
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
});
