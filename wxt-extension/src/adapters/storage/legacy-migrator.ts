/**
 * Legacy Storage Migrator
 * Automatically migrates storage data from legacy extension (v0.x - v3.x) into WXT V4 architecture.
 *
 * Responsibilities:
 * 1. Idempotency guard: skips if already migrated (`__wxt_migrated_v1: true`).
 * 2. Persona Schema Upgrade: Migrates v3 personas and memory components to verbatim-first PersonaV4.
 * 3. Model & Key Migration: Encrypts legacy plain-text API keys (geminiApiKey, openaiApiKey, etc.) into pa_models.
 * 4. Settings & Preferences: Maps legacy theme, active model, and flags into typed user_settings.
 * 5. Ratings & Drafts: Preserves ratings backups and draft queues.
 */

import { CryptoService } from '../../core/crypto/crypto-service';
import type { PersonaV4, DimensionContent, DimensionId } from '../../core/memory/schemas';
import type { UserSettings } from '../../lib/storage/items';
import { DEFAULT_USER_SETTINGS } from '../../lib/storage/items';

export interface MigrationStorageAdapter {
  get<T = any>(keys: string | string[]): Promise<Record<string, T>>;
  set(items: Record<string, any>): Promise<void>;
  remove?(keys: string | string[]): Promise<void>;
}

export interface MigrationResult {
  migrated: boolean;
  reason?: string;
  personasMigrated: number;
  modelsMigrated: number;
  settingsMigrated: boolean;
  ratingsMigrated: number;
}

export class LegacyMigrator {
  public static readonly MIGRATION_FLAG = '__wxt_migrated_v1';

  /**
   * Migrate v3 dimension structure to v4 verbatim-first structure.
   */
  static migrateDimensionFromV3(dimId: DimensionId, v3Data: any): DimensionContent {
    if (!v3Data || typeof v3Data !== 'object') {
      return { instruction: '', version: 4 };
    }

    // If already in v4 format with instruction, preserve verbatim
    if (typeof v3Data.instruction === 'string' && v3Data.instruction.trim().length > 0) {
      return {
        instruction: v3Data.instruction,
        version: 4,
        pinned: !!v3Data.pinned,
        metadata: v3Data.metadata || {}
      };
    }

    const parts: string[] = [];
    const metadata: Record<string, any> = {};

    switch (dimId) {
      case 'persona': {
        if (v3Data.name) parts.push(`You are ${v3Data.name}.`);
        if (v3Data.role) parts.push(`Role: ${v3Data.role}.`);
        if (v3Data.purpose) parts.push(`Purpose: ${v3Data.purpose}.`);
        break;
      }
      case 'context': {
        if (v3Data.domain) parts.push(`Domain: ${v3Data.domain}.`);
        if (v3Data.knowledge_boundaries?.scope) parts.push(`Scope: ${v3Data.knowledge_boundaries.scope}.`);
        if (v3Data.terminology && Array.isArray(v3Data.terminology)) {
          const terms = v3Data.terminology.map((t: any) => typeof t === 'string' ? t : `${t.term}: ${t.definition}`);
          parts.push(`Terminology: ${terms.join('; ')}.`);
        }
        metadata.domain = v3Data.domain || null;
        metadata.scope_tags = v3Data.knowledge_boundaries?.out_of_scope || [];
        break;
      }
      case 'tone': {
        if (v3Data.voice) parts.push(`Voice: ${v3Data.voice}.`);
        if (v3Data.style) parts.push(`Style: ${v3Data.style}.`);
        if (v3Data.verbosity?.level) parts.push(`Verbosity: ${v3Data.verbosity.level}.`);
        if (v3Data.banned_phrases?.length) parts.push(`Avoid: ${v3Data.banned_phrases.join(', ')}.`);
        metadata.style_tags = v3Data.style ? [v3Data.style] : [];
        metadata.banned_phrases = v3Data.banned_phrases || [];
        break;
      }
      case 'framework': {
        if (v3Data.methodology?.name) parts.push(`Methodology: ${v3Data.methodology.name}.`);
        if (v3Data.methodology?.steps?.length) {
          const steps = v3Data.methodology.steps.map((s: any) => typeof s === 'string' ? s : `${s.name || ''}: ${s.action || ''}`);
          parts.push(`Steps: ${steps.join(' → ')}.`);
        }
        if (v3Data.reasoning_pattern) parts.push(`Reasoning: ${v3Data.reasoning_pattern}.`);
        metadata.reasoning_type = v3Data.reasoning_pattern || null;
        break;
      }
      case 'constraints': {
        if (v3Data.prohibitions?.length) {
          const rules = v3Data.prohibitions.map((p: any) => typeof p === 'string' ? p : p.rule);
          parts.push(`NEVER: ${rules.join('; ')}.`);
          metadata.prohibitions = rules;
        }
        if (v3Data.requirements?.length) {
          const reqs = v3Data.requirements.map((r: any) => typeof r === 'string' ? r : r.rule);
          parts.push(`MUST: ${reqs.join('; ')}.`);
          metadata.requirements = reqs;
        }
        if (v3Data.thresholds?.length) {
          const limits = v3Data.thresholds.map((t: any) => `${t.metric}: ${t.limit}`);
          parts.push(`Limits: ${limits.join(', ')}.`);
        }
        break;
      }
      case 'format': {
        if (v3Data.output_type) parts.push(`Output type: ${v3Data.output_type}.`);
        metadata.output_type = v3Data.output_type || null;
        break;
      }
      case 'exemplar': {
        if (v3Data.good_examples?.length) {
          v3Data.good_examples.forEach((ex: any, idx: number) => {
            parts.push(`Example ${idx + 1}: User: ${ex.input || ''} -> AI: ${ex.output || ''}`);
          });
        }
        break;
      }
    }

    return {
      instruction: parts.join(' ').trim(),
      version: 4,
      pinned: !!v3Data.pinned,
      metadata
    };
  }

  /**
   * Migrate a full persona from v3 to v4 format.
   */
  static migratePersona(raw: any, id?: string): PersonaV4 {
    if (!raw || typeof raw !== 'object') {
      return {
        id,
        persona: { instruction: '' },
        metadata: { suggested_name: 'Recovered Persona' }
      };
    }

    const dims: (DimensionId)[] = ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar'];
    const migrated: PersonaV4 = {
      id: raw.id || id,
      metadata: {
        suggested_name: raw.metadata?.suggested_name || raw.name || 'Migrated Persona',
        suggested_title: raw.metadata?.suggested_title || raw.title || 'AI Specialist',
        domain: raw.metadata?.domain || raw.domain || 'Tech',
        tags: Array.isArray(raw.metadata?.tags) ? raw.metadata.tags : [],
        version: '4.0.0',
        is_public: !!raw.metadata?.is_public
      }
    };

    for (const dim of dims) {
      const sourceData = raw[dim] || (raw.components && raw.components[dim]);
      if (sourceData) {
        migrated[dim] = this.migrateDimensionFromV3(dim, sourceData);
      }
    }

    return migrated;
  }

  /**
   * Run the full migration over the provided storage adapter.
   */
  static async migrate(storage: MigrationStorageAdapter): Promise<MigrationResult> {
    const checkKeys = [
      this.MIGRATION_FLAG,
      'personas',
      'pa_models',
      'pa_active_model',
      'geminiApiKey',
      'openaiApiKey',
      'selectedModel',
      'theme',
      'user_settings',
      'persona_drafts'
    ];

    const current = await storage.get(checkKeys);

    if (current[this.MIGRATION_FLAG]) {
      return {
        migrated: false,
        reason: 'already_migrated',
        personasMigrated: 0,
        modelsMigrated: 0,
        settingsMigrated: false,
        ratingsMigrated: 0
      };
    }

    const updates: Record<string, any> = {};
    let personasMigrated = 0;
    let modelsMigrated = 0;
    let settingsMigrated = false;
    let ratingsMigrated = 0;

    // 1. Personas Migration
    const rawPersonas = current['personas'] || {};
    const updatedPersonas: Record<string, PersonaV4> = {};

    if (typeof rawPersonas === 'object' && Object.keys(rawPersonas).length > 0) {
      for (const [id, personaData] of Object.entries(rawPersonas)) {
        updatedPersonas[id] = this.migratePersona(personaData, id);
        personasMigrated++;
      }
      updates['personas'] = updatedPersonas;
    }

    // 2. Model Configurations & API Key Encryption
    const existingModels: Record<string, any> = current['pa_models'] || {};
    const geminiKey = current['geminiApiKey'];
    const openaiKey = current['openaiApiKey'];
    const selectedModel = current['selectedModel'];

    if (geminiKey && typeof geminiKey === 'string' && geminiKey.trim()) {
      const encrypted = CryptoService.isEncrypted(geminiKey)
        ? geminiKey
        : await CryptoService.encrypt(geminiKey);

      existingModels['gemini-2.0-flash'] = {
        id: 'gemini-2.0-flash',
        provider: 'gemini',
        modelName: 'gemini-2.0-flash',
        displayName: 'Google Gemini 2.0 Flash',
        apiKey: encrypted,
        temperature: 0.7,
        maxTokens: 4096,
        isCustom: false
      };
      modelsMigrated++;
    }

    if (openaiKey && typeof openaiKey === 'string' && openaiKey.trim()) {
      const encrypted = CryptoService.isEncrypted(openaiKey)
        ? openaiKey
        : await CryptoService.encrypt(openaiKey);

      existingModels['gpt-4o'] = {
        id: 'gpt-4o',
        provider: 'openai',
        modelName: 'gpt-4o',
        displayName: 'OpenAI GPT-4o',
        apiKey: encrypted,
        temperature: 0.7,
        maxTokens: 4096,
        isCustom: false
      };
      modelsMigrated++;
    }

    if (modelsMigrated > 0 || Object.keys(existingModels).length > 0) {
      updates['pa_models'] = existingModels;
    }

    if (selectedModel && !current['pa_active_model']) {
      updates['pa_active_model'] = selectedModel;
    }

    // 3. User Settings & Preferences
    const existingSettings: UserSettings = current['user_settings'] || { ...DEFAULT_USER_SETTINGS };
    const rawTheme = current['theme'];

    if (rawTheme && ['light', 'dark', 'system'].includes(rawTheme)) {
      existingSettings.theme = rawTheme as 'light' | 'dark' | 'system';
      settingsMigrated = true;
    }

    if (current['pa_active_model'] || selectedModel) {
      existingSettings.activeModelName = current['pa_active_model'] || selectedModel;
      settingsMigrated = true;
    }

    if (settingsMigrated) {
      updates['user_settings'] = existingSettings;
    }

    // Mark migration sentinel
    updates[this.MIGRATION_FLAG] = true;
    updates['__wxt_migrated_at'] = Date.now();

    await storage.set(updates);

    return {
      migrated: true,
      personasMigrated,
      modelsMigrated,
      settingsMigrated,
      ratingsMigrated
    };
  }
}
