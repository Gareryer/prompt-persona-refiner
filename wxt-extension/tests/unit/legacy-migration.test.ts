import { describe, it, expect, beforeEach } from 'vitest';
import { LegacyMigrator, type MigrationStorageAdapter } from '@/adapters/storage/legacy-migrator';
import { validatePersonaV4 } from '@/core/memory/schemas';
import { CryptoService } from '@/core/crypto/crypto-service';

class MockStorageAdapter implements MigrationStorageAdapter {
  private store = new Map<string, any>();

  constructor(initialData: Record<string, any> = {}) {
    for (const [k, v] of Object.entries(initialData)) {
      this.store.set(k, JSON.parse(JSON.stringify(v)));
    }
  }

  async get<T = any>(keys: string | string[]): Promise<Record<string, T>> {
    const keyList = Array.isArray(keys) ? keys : [keys];
    const res: Record<string, any> = {};
    for (const k of keyList) {
      if (this.store.has(k)) {
        res[k] = JSON.parse(JSON.stringify(this.store.get(k)));
      }
    }
    return res;
  }

  async set(items: Record<string, any>): Promise<void> {
    for (const [k, v] of Object.entries(items)) {
      this.store.set(k, JSON.parse(JSON.stringify(v)));
    }
  }

  getRaw(key: string): any {
    return this.store.get(key);
  }
}

describe('Gate 2: Legacy Storage Migration & Snapshot Replay', () => {
  it('migrates legacy V3 personas into valid PersonaV4 with verbatim text preservation', async () => {
    const legacySnapshot = {
      personas: {
        'persona-architect-1': {
          id: 'persona-architect-1',
          name: 'Chief Cloud Architect',
          domain: 'Tech',
          persona: {
            name: 'Alex',
            role: 'Enterprise Systems Architect',
            purpose: 'Design resilient distributed systems'
          },
          context: {
            domain: 'Cloud Infrastructure',
            knowledge_boundaries: {
              scope: 'AWS and GCP enterprise architectures',
              out_of_scope: ['legacy on-prem mainframes']
            },
            terminology: [
              { term: 'RTO', definition: 'Recovery Time Objective' },
              { term: 'RPO', definition: 'Recovery Point Objective' }
            ]
          },
          tone: {
            voice: 'Authoritative yet pragmatic',
            style: 'Technical',
            verbosity: { level: 'concise' },
            banned_phrases: ['obviously', 'as everyone knows']
          },
          framework: {
            methodology: {
              name: 'Well-Architected Framework',
              steps: ['Assess', 'Design', 'Review']
            },
            reasoning_pattern: 'First-Principles'
          },
          constraints: {
            prohibitions: ['single points of failure', 'unencrypted data at rest'],
            requirements: ['multi-region failover', 'least-privilege IAM']
          }
        }
      }
    };

    const storage = new MockStorageAdapter(legacySnapshot);
    const result = await LegacyMigrator.migrate(storage);

    expect(result.migrated).toBe(true);
    expect(result.personasMigrated).toBe(1);

    const migratedPersonas = storage.getRaw('personas');
    const migrated = migratedPersonas['persona-architect-1'];

    expect(migrated).toBeDefined();
    // Validate that instruction contains preserved verbatim fields
    expect(migrated.persona.instruction).toContain('You are Alex.');
    expect(migrated.persona.instruction).toContain('Role: Enterprise Systems Architect.');
    expect(migrated.context.instruction).toContain('AWS and GCP enterprise architectures');
    expect(migrated.context.instruction).toContain('RTO: Recovery Time Objective');
    expect(migrated.tone.instruction).toContain('Authoritative yet pragmatic');
    expect(migrated.tone.instruction).toContain('Avoid: obviously, as everyone knows');
    expect(migrated.framework.instruction).toContain('Well-Architected Framework');
    expect(migrated.constraints.instruction).toContain('NEVER: single points of failure');
    expect(migrated.constraints.instruction).toContain('MUST: multi-region failover');

    // Schema Validation: Must pass PersonaV4 Zod validation
    const validation = validatePersonaV4(migrated);
    expect(validation.success).toBe(true);
  });

  it('encrypts legacy plain-text API keys and creates model configurations', async () => {
    const legacySnapshot = {
      geminiApiKey: 'AIzaSyTestGeminiKey12345',
      openaiApiKey: 'sk-proj-testOpenAiKey67890',
      selectedModel: 'gemini-2.0-flash',
      theme: 'dark'
    };

    const storage = new MockStorageAdapter(legacySnapshot);
    const result = await LegacyMigrator.migrate(storage);

    expect(result.migrated).toBe(true);
    expect(result.modelsMigrated).toBe(2);
    expect(result.settingsMigrated).toBe(true);

    const paModels = storage.getRaw('pa_models');
    expect(paModels['gemini-2.0-flash']).toBeDefined();
    expect(paModels['gemini-2.0-flash'].apiKey).toMatch(/^enc:v1:/);

    expect(paModels['gpt-4o']).toBeDefined();
    expect(paModels['gpt-4o'].apiKey).toMatch(/^enc:v1:/);

    // Verify round-trip decryption of migrated key
    const decryptedGeminiKey = await CryptoService.decrypt(paModels['gemini-2.0-flash'].apiKey);
    expect(decryptedGeminiKey).toBe('AIzaSyTestGeminiKey12345');

    // Settings migration
    const userSettings = storage.getRaw('user_settings');
    expect(userSettings.theme).toBe('dark');
    expect(userSettings.activeModelName).toBe('gemini-2.0-flash');

    // Sentinel flag
    expect(storage.getRaw(LegacyMigrator.MIGRATION_FLAG)).toBe(true);
  });

  it('is strictly idempotent on subsequent runs', async () => {
    const legacySnapshot = {
      geminiApiKey: 'sample-key',
      theme: 'light'
    };

    const storage = new MockStorageAdapter(legacySnapshot);
    const firstRun = await LegacyMigrator.migrate(storage);
    expect(firstRun.migrated).toBe(true);

    const secondRun = await LegacyMigrator.migrate(storage);
    expect(secondRun.migrated).toBe(false);
    expect(secondRun.reason).toBe('already_migrated');
    expect(secondRun.modelsMigrated).toBe(0);
  });
});
