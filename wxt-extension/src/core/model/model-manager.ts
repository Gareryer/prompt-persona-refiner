/**
 * @fileoverview Complete Model Manager for LLM Configuration Management
 * Ported from model/model-manager.js (941 lines)
 * @module model/model-manager
 */

import {
  MODEL_PROVIDERS,
  DEFAULT_MODEL_CONFIGS,
  sanitizeApiKey,
  getProvider,
  getDefaultModelForProvider,
  getDefaultParameterValues,
  type StoredModelConfig,
  type ModelEntry
} from './model-registry';
import { CryptoService } from '../crypto/crypto-service';
import { logger } from '../logging/logger';

export const MODEL_STORAGE_KEYS = {
  MODELS: 'pa_models',
  ACTIVE_MODEL: 'pa_active_model'
};

export const LEGACY_STORAGE_KEYS = {
  LLM_CONFIG: 'pa_llm_config',
  ACTIVE_PROVIDER: 'pa_active_provider'
};

export function modelLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  if (level === 'error') logger.error(msg, data);
  else if (level === 'warn') logger.warn(msg, data);
  else if (level === 'debug') logger.debug(msg, data);
  else logger.info(msg, data);
}

export class ModelManager {
  public cache: Record<string, StoredModelConfig> | null = null;
  public initialized: boolean = false;
  public initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInit();
    try {
      await this.initPromise;
    } catch (err) {
      this.initPromise = null;
      throw err;
    }
  }

  public async _doInit(): Promise<void> {
    modelLog('debug', 'ModelManager initializing...');
    try {
      const stored = await this._getFromStorage(MODEL_STORAGE_KEYS.MODELS);
      if (!stored || Object.keys(stored).length === 0) {
        this.cache = { ...DEFAULT_MODEL_CONFIGS };
        await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, DEFAULT_MODEL_CONFIGS);
        await this._migrateFromLegacy();
      } else {
        const merged: Record<string, StoredModelConfig> = { ...DEFAULT_MODEL_CONFIGS };
        for (const [key, config] of Object.entries(stored)) {
          merged[key] = { ...merged[key], ...(config as StoredModelConfig) };
        }
        this.cache = merged;
        await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, merged);
      }

      this.initialized = true;
      modelLog('info', 'ModelManager initialized successfully', { modelCount: Object.keys(this.cache).length });
    } catch (error: any) {
      modelLog('error', 'ModelManager initialization failed', { error });
      throw error;
    }
  }

  public async _ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  async getAllModels(): Promise<StoredModelConfig[]> {
    await this._ensureInitialized();
    return Object.values(this.cache || {}).sort((a, b) => {
      if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }

  async getModel(id: string): Promise<StoredModelConfig | null> {
    await this._ensureInitialized();
    return this.cache?.[id] || null;
  }

  async hasApiKey(id: string): Promise<boolean> {
    await this._ensureInitialized();
    const model = await this.getModel(id);
    return Boolean(model?.apiKey && model.apiKey.length > 0);
  }

  async updateModel(id: string, updates: Partial<StoredModelConfig>): Promise<StoredModelConfig> {
    await this._ensureInitialized();
    const existing = this.cache?.[id];
    if (!existing) throw new Error(`Model configuration not found: ${id}`);

    const updated: StoredModelConfig = {
      ...existing,
      ...updates,
      id,
      parameters: {
        ...existing.parameters,
        ...(updates.parameters || {})
      }
    };

    if (updates.apiKey !== undefined) {
      updated.apiKey = sanitizeApiKey(updates.apiKey);
    }

    this.cache![id] = updated;
    await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this.cache);
    modelLog('info', `Model updated: ${id}`, { enabled: updated.enabled, model: updated.model });
    return updated;
  }

  async addModel(config: StoredModelConfig): Promise<StoredModelConfig> {
    await this._ensureInitialized();
    if (!config.id) throw new Error('Model ID required');
    this.cache![config.id] = config;
    await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this.cache);
    return config;
  }

  async deleteModel(id: string): Promise<boolean> {
    await this._ensureInitialized();
    if (this.cache?.[id]) {
      delete this.cache[id];
      await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this.cache);
      return true;
    }
    return false;
  }

  async enableModel(id: string): Promise<StoredModelConfig> {
    return this.updateModel(id, { enabled: true });
  }

  async disableModel(id: string): Promise<StoredModelConfig> {
    return this.updateModel(id, { enabled: false });
  }

  async getEnabledModels(): Promise<StoredModelConfig[]> {
    await this._ensureInitialized();
    return Object.values(this.cache || {}).filter(m => m.enabled);
  }

  async getActiveModelId(): Promise<string> {
    await this._ensureInitialized();
    const activeId = await this._getFromStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL);
    return activeId || 'gemini';
  }

  async getActiveModel(): Promise<StoredModelConfig | null> {
    await this._ensureInitialized();
    const activeId = await this.getActiveModelId();
    if (activeId && this.cache?.[activeId] && this.cache[activeId].enabled) {
      return this.cache[activeId];
    }
    const enabled = Object.values(this.cache || {}).find(m => m.enabled);
    return enabled || this.cache?.['gemini'] || null;
  }

  async setActiveModel(id: string): Promise<boolean> {
    await this._ensureInitialized();
    const model = this.cache?.[id];
    if (!model) return false;
    await this._saveToStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL, id);
    modelLog('info', `Active model set: ${id}`);
    return true;
  }

  async ensureActiveModel(): Promise<StoredModelConfig | null> {
    const active = await this.getActiveModel();
    if (!active) {
      const fallback = Object.values(this.cache || {}).find(m => m.enabled) || Object.values(this.cache || {})[0];
      if (fallback) {
        await this.setActiveModel(fallback.id);
        return fallback;
      }
    }
    return active;
  }

  async setApiKey(provider: string, rawKey: string): Promise<void> {
    await this._ensureInitialized();
    const cleanKey = sanitizeApiKey(rawKey);
    const encrypted = await CryptoService.encrypt(cleanKey);
    await this.updateModel(provider, { apiKey: encrypted, enabled: Boolean(cleanKey) });
  }

  async getDecryptedApiKey(provider: string): Promise<string> {
    await this._ensureInitialized();
    const model = await this.getModel(provider);
    if (!model || !model.apiKey) return '';
    return CryptoService.decrypt(model.apiKey);
  }

  _validateApiKeyFormat(provider: string, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;
    if (provider === 'gemini') return apiKey.startsWith('AIza') && apiKey.length >= 35;
    if (provider === 'openai') return apiKey.startsWith('sk-') && apiKey.length >= 40;
    if (provider === 'anthropic') return apiKey.startsWith('sk-ant-') && apiKey.length >= 40;
    return apiKey.length >= 10;
  }

  maskApiKey(apiKey: string): string {
    if (!apiKey || apiKey.length < 8) return '••••••••';
    const suffix = apiKey.slice(-4);
    return '••••••••' + suffix;
  }

  isMaskedKey(key: string): boolean {
    return typeof key === 'string' && key.startsWith('••••');
  }

  async _migrateFromLegacy(): Promise<boolean> {
    try {
      const legacy = await this._getFromStorage(LEGACY_STORAGE_KEYS.LLM_CONFIG);
      if (legacy && legacy.apiKey && legacy.provider) {
        await this.setApiKey(legacy.provider, legacy.apiKey);
        await this._removeFromStorage(LEGACY_STORAGE_KEYS.LLM_CONFIG);
        return true;
      }
    } catch (err) {
      modelLog('warn', 'Legacy migration skipped', { error: err });
    }
    return false;
  }

  _isMainWorld(): boolean {
    return typeof window !== 'undefined' && !(window as any).chrome?.runtime?.id;
  }

  async testConnection(
    providerId: string,
    apiKeyOverride?: string
  ): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const apiKey = apiKeyOverride || (await this.getDecryptedApiKey(providerId));
      if (!apiKey) throw new Error('API key required for testing');

      if (providerId === 'gemini') {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
              generationConfig: { maxOutputTokens: 5 }
            })
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
      } else {
        const url = providerId === 'deepseek'
          ? 'https://api.deepseek.com/v1/chat/completions'
          : 'https://api.openai.com/v1/chat/completions';

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: providerId === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP ${res.status}`);
        }
      }

      const latencyMs = Math.round(performance.now() - start);
      return { success: true, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { success: false, latencyMs, error: err.message };
    }
  }

  public async _getFromStorage(key: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise(resolve => {
        chrome.storage.local.get([key], res => resolve(res[key]));
      });
    }
    return null;
  }

  public async _saveToStorage(key: string, val: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: val }, () => {
          if (chrome.runtime?.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }
  }

  public async _removeFromStorage(key: string | string[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise(resolve => {
        chrome.storage.local.remove(key, () => resolve());
      });
    }
  }
}

export let _modelManagerInstance: ModelManager | null = null;

export function getModelManager(): ModelManager {
  if (!_modelManagerInstance) {
    _modelManagerInstance = new ModelManager();
  }
  return _modelManagerInstance;
}

export const modelManager = getModelManager();

export async function fetchOpenRouterModels(apiKey: string): Promise<Array<{ id: string; name: string; description?: string }>> {
  if (!apiKey) throw new Error('API key required');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch OpenRouter models: ${res.statusText}`);
    const data = await res.json();
    return (data.data || []).map((m: any) => ({
      id: m.id,
      name: m.name || m.id,
      description: m.description
    }));
  } catch (err: any) {
    modelLog('error', 'Failed to fetch OpenRouter models', { error: err.message });
    throw err;
  }
}

export async function fetchModelsForProvider(provider: string, apiKey: string): Promise<Array<{ id: string; name: string; description?: string }>> {
  if (provider === 'openrouter') {
    return fetchOpenRouterModels(apiKey);
  }
  if (provider === 'openai') {
    if (!apiKey) throw new Error('API key required');
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch OpenAI models: ${res.statusText}`);
    const data = await res.json();
    return (data.data || [])
      .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1'))
      .map((m: any) => ({ id: m.id, name: m.id }));
  }
  return [];
}
