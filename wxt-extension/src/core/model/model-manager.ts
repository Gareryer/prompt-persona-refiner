/**
 * @fileoverview Complete Model Manager for LLM Configuration Management
 * Ported from model/model-manager.js (941 lines)
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

export class ModelManager {
  private cache: Record<string, StoredModelConfig> | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.doInit();
    try {
      await this.initPromise;
    } catch (err) {
      this.initPromise = null;
      throw err;
    }
  }

  private async doInit(): Promise<void> {
    logger.debug('ModelManager initializing...');
    try {
      const stored = await this.getFromStorage(MODEL_STORAGE_KEYS.MODELS);
      if (!stored || Object.keys(stored).length === 0) {
        this.cache = { ...DEFAULT_MODEL_CONFIGS };
        await this.saveToStorage(MODEL_STORAGE_KEYS.MODELS, DEFAULT_MODEL_CONFIGS);
      } else {
        const merged: Record<string, StoredModelConfig> = { ...DEFAULT_MODEL_CONFIGS };
        for (const [key, config] of Object.entries(stored)) {
          merged[key] = { ...merged[key], ...(config as StoredModelConfig) };
        }
        this.cache = merged;
        await this.saveToStorage(MODEL_STORAGE_KEYS.MODELS, merged);
      }

      this.initialized = true;
      logger.info('ModelManager initialized successfully', { modelCount: Object.keys(this.cache).length });
    } catch (error: any) {
      logger.error('ModelManager initialization failed', error);
      throw error;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) await this.init();
  }

  async getAllModels(): Promise<StoredModelConfig[]> {
    await this.ensureInitialized();
    return Object.values(this.cache || {}).sort((a, b) => {
      if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }

  async getModel(id: string): Promise<StoredModelConfig | null> {
    await this.ensureInitialized();
    return this.cache?.[id] || null;
  }

  async updateModel(id: string, updates: Partial<StoredModelConfig>): Promise<StoredModelConfig> {
    await this.ensureInitialized();
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
    await this.saveToStorage(MODEL_STORAGE_KEYS.MODELS, this.cache);
    logger.info(`Model updated: ${id}`, { enabled: updated.enabled, model: updated.model });
    return updated;
  }

  async setApiKey(provider: string, rawKey: string): Promise<void> {
    await this.ensureInitialized();
    const cleanKey = sanitizeApiKey(rawKey);
    const encrypted = await CryptoService.encrypt(cleanKey);
    await this.updateModel(provider, { apiKey: encrypted, enabled: Boolean(cleanKey) });
  }

  async getDecryptedApiKey(provider: string): Promise<string> {
    await this.ensureInitialized();
    const model = await this.getModel(provider);
    if (!model || !model.apiKey) return '';
    return CryptoService.decrypt(model.apiKey);
  }

  async getActiveModel(): Promise<StoredModelConfig | null> {
    await this.ensureInitialized();
    const activeId = await this.getFromStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL);
    if (activeId && this.cache?.[activeId] && this.cache[activeId].enabled) {
      return this.cache[activeId];
    }
    // Fallback to first enabled model
    const enabled = Object.values(this.cache || {}).find(m => m.enabled);
    return enabled || this.cache?.['gemini'] || null;
  }

  async setActiveModel(id: string): Promise<boolean> {
    await this.ensureInitialized();
    const model = this.cache?.[id];
    if (!model) return false;
    await this.saveToStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL, id);
    logger.info(`Active model set: ${id}`);
    return true;
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

  private async getFromStorage(key: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise(resolve => {
        chrome.storage.local.get([key], res => resolve(res[key]));
      });
    }
    return null;
  }

  private async saveToStorage(key: string, val: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set({ [key]: val }, () => {
          if (chrome.runtime?.lastError) reject(chrome.runtime.lastError);
          else resolve();
        });
      });
    }
  }
}

export const modelManager = new ModelManager();
