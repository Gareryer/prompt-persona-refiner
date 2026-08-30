import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageBackend, StorageRepository } from '@/core/storage/repository';
import type { PersonaV4 } from '@/core/memory/schemas';

describe('Batch 3: Storage Layer & Repository', () => {
  let backend: InMemoryStorageBackend;
  let repo: StorageRepository;

  beforeEach(() => {
    backend = new InMemoryStorageBackend();
    repo = new StorageRepository(backend);
  });

  it('saves and retrieves a Persona V4 object', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'You are an architect.' },
      metadata: { suggested_name: 'Lead Architect' }
    };

    const saved = await repo.savePersona('arch-001', persona);
    expect(saved).toBe(true);

    const fetched = await repo.getPersona('arch-001');
    expect(fetched).not.toBeNull();
    expect(fetched?.persona?.instruction).toBe('You are an architect.');
    expect(fetched?.metadata?.suggested_name).toBe('Lead Architect');
  });

  it('deletes a persona cleanly', async () => {
    const persona: PersonaV4 = {
      persona: { instruction: 'To be deleted.' }
    };
    await repo.savePersona('temp-001', persona);
    expect(await repo.getPersona('temp-001')).not.toBeNull();

    await repo.deletePersona('temp-001');
    expect(await repo.getPersona('temp-001')).toBeNull();
  });

  it('manages drafts queue with LIFO ordering', async () => {
    await repo.saveDraft({
      id: 'draft-1',
      source_prompt: 'prompt 1',
      persona: { persona: { instruction: 'p1' } },
      provider: 'gemini',
      llm_model: 'gemini-2.0',
      created_at: new Date().toISOString(),
      is_public: false
    });

    await repo.saveDraft({
      id: 'draft-2',
      source_prompt: 'prompt 2',
      persona: { persona: { instruction: 'p2' } },
      provider: 'openai',
      llm_model: 'gpt-4o',
      created_at: new Date().toISOString(),
      is_public: false
    });

    const drafts = await repo.getDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts[0]!.id).toBe('draft-2');
  });

  it('updates and persists user settings', async () => {
    const initial = await repo.getSettings();
    expect(initial.theme).toBe('system');

    const updated = await repo.updateSettings({ theme: 'dark', autoRefineOnEnter: true });
    expect(updated.theme).toBe('dark');
    expect(updated.autoRefineOnEnter).toBe(true);

    const reFetched = await repo.getSettings();
    expect(reFetched.theme).toBe('dark');
  });

  it('enqueues and clears sync queue actions', async () => {
    await repo.enqueueSyncAction({
      id: 'sync-1',
      action: 'create',
      entity: 'persona',
      payload: { name: 'Test' },
      timestamp: Date.now()
    });

    let queue = await repo.getSyncQueue();
    expect(queue.length).toBe(1);
    expect(queue[0]!.id).toBe('sync-1');

    await repo.clearSyncQueue();
    queue = await repo.getSyncQueue();
    expect(queue.length).toBe(0);
  });
});
