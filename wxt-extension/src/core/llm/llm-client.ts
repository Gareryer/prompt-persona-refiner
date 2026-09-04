/**
 * @fileoverview Complete Multi-Provider LLM Client with Resilient Retries
 * Ported from llm/llm-client.js (868 lines)
 * @module llm/llm-client
 */

import { logger } from '../logging/logger';
import { sanitizeApiKey } from '../model/model-registry';

export const DEFAULT_MODELS = {
  gemini: 'gemini-2.0-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  openrouter: 'google/gemini-2.0-flash-exp:free'
};

export const API_ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions'
};

export const LLM_PROVIDERS = {
  GEMINI: 'gemini',
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  DEEPSEEK: 'deepseek',
  OPENROUTER: 'openrouter'
} as const;

export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  interCallDelayMs: 500
};

export const RETRYABLE_ERRORS = [
  'RATE_LIMIT',
  'NETWORK',
  'HTTP_429',
  'HTTP_500',
  'HTTP_502',
  'HTTP_503'
];

export const LLM_ERROR_TYPES = {
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  NETWORK: 'NETWORK',
  TOKEN_LIMIT: 'TOKEN_LIMIT',
  AUTH: 'AUTH',
  MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
  UNKNOWN: 'UNKNOWN'
} as const;

export enum LLMErrorType {
  RATE_LIMIT = 'RATE_LIMIT',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  NETWORK = 'NETWORK',
  TOKEN_LIMIT = 'TOKEN_LIMIT',
  AUTH = 'AUTH',
  MALFORMED_RESPONSE = 'MALFORMED_RESPONSE',
  UNKNOWN = 'UNKNOWN'
}

export interface LLMCallConfig {
  provider: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
  systemPrompt?: string;
  baseURL?: string;
  timeoutMs?: number;
}

export interface LLMResponsePayload {
  text: string;
  json?: any;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  model: string;
  provider: string;
}

export class LLMClient {
  public provider: string;
  public apiKey: string;
  public model?: string;
  public temperature?: number;
  public maxTokens?: number;
  public baseURL?: string;

  constructor(config: Partial<LLMCallConfig> = {}) {
    this.provider = config.provider || 'gemini';
    this.apiKey = sanitizeApiKey(config.apiKey || '');
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.baseURL = config.baseURL;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  _sanitizeApiKey(key: string): string {
    return sanitizeApiKey(key);
  }

  configure(options: Partial<LLMCallConfig>): void {
    if (options.provider) this.provider = options.provider;
    if (options.apiKey !== undefined) this.apiKey = sanitizeApiKey(options.apiKey);
    if (options.model) this.model = options.model;
    if (options.temperature !== undefined) this.temperature = options.temperature;
    if (options.maxTokens !== undefined) this.maxTokens = options.maxTokens;
    if (options.baseURL) this.baseURL = options.baseURL;
  }

  async _proxyFetch(url: string, options: any): Promise<any> {
    const res = await fetch(url, options);
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  async _delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  _calculateBackoff(attempt: number): number {
    return Math.min(RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1), RETRY_CONFIG.maxDelayMs);
  }

  _classifyError(error: any, status?: number): LLMErrorType {
    const msg = String(error?.message || error || '').toLowerCase();
    if (status === 429 || msg.includes('rate limit') || msg.includes('quota')) return LLMErrorType.RATE_LIMIT;
    if (status === 401 || status === 403 || msg.includes('unauthorized') || msg.includes('api key')) return LLMErrorType.AUTH;
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch')) return LLMErrorType.NETWORK;
    return LLMErrorType.UNKNOWN;
  }

  async _callWithRetry<T>(fn: () => Promise<T>, maxRetries: number = RETRY_CONFIG.maxRetries): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const errType = this._classifyError(err);
        if (attempt < maxRetries && (errType === LLMErrorType.RATE_LIMIT || errType === LLMErrorType.NETWORK)) {
          await this._delay(this._calculateBackoff(attempt));
        } else {
          break;
        }
      }
    }
    throw lastError;
  }

  async _callGemini(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<string> {
    const model = options.model || this.model || DEFAULT_MODELS.gemini;
    const apiKey = options.apiKey || this.apiKey;
    const url = `${API_ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? this.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? this.maxTokens ?? 8192
      }
    };
    if (options.json) body.generationConfig.responseMimeType = 'application/json';
    if (options.systemPrompt) body.systemInstruction = { parts: [{ text: options.systemPrompt }] };

    const res = await this._proxyFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${res.text}`);
    const data = JSON.parse(res.text);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async _callOpenAI(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<string> {
    const apiKey = options.apiKey || this.apiKey;
    const url = API_ENDPOINTS.openai;
    const res = await this._proxyFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model || this.model || DEFAULT_MODELS.openai,
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature ?? 0.7
      })
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}: ${res.text}`);
    const data = JSON.parse(res.text);
    return data.choices?.[0]?.message?.content || '';
  }

  async _callAnthropic(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<string> {
    const apiKey = options.apiKey || this.apiKey;
    const url = API_ENDPOINTS.anthropic;
    const res = await this._proxyFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: options.model || this.model || DEFAULT_MODELS.anthropic,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens ?? 4096
      })
    });
    if (!res.ok) throw new Error(`Anthropic HTTP ${res.status}: ${res.text}`);
    const data = JSON.parse(res.text);
    return data.content?.[0]?.text || '';
  }

  async _callOpenRouter(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<string> {
    const apiKey = options.apiKey || this.apiKey;
    const url = API_ENDPOINTS.openrouter;
    const res = await this._proxyFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: options.model || this.model || DEFAULT_MODELS.openrouter,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) throw new Error(`OpenRouter HTTP ${res.status}: ${res.text}`);
    const data = JSON.parse(res.text);
    return data.choices?.[0]?.message?.content || '';
  }

  _fixTruncatedJSON(jsonStr: string): string {
    let str = jsonStr.trim();
    if (!str.startsWith('{') && !str.startsWith('[')) return str;
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === '\\' && inString) {
        escape = !escape;
        continue;
      }
      if (char === '"' && !escape) {
        inString = !inString;
      }
      escape = false;
      if (!inString) {
        if (char === '{' || char === '[') stack.push(char);
        else if (char === '}' && stack[stack.length - 1] === '{') stack.pop();
        else if (char === ']' && stack[stack.length - 1] === '[') stack.pop();
      }
    }

    if (inString) str += '"';
    while (stack.length > 0) {
      const open = stack.pop();
      if (open === '{') str += '}';
      else if (open === '[') str += ']';
    }
    return str;
  }

  _parseJSON(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return JSON.parse(this._fixTruncatedJSON(text));
    }
  }

  getAvailableModels(): string[] {
    return Object.values(DEFAULT_MODELS);
  }

  async _executeCall(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<string> {
    const provider = options.provider || this.provider;
    if (provider === 'gemini') return this._callGemini(prompt, options);
    if (provider === 'anthropic') return this._callAnthropic(prompt, options);
    if (provider === 'openrouter') return this._callOpenRouter(prompt, options);
    return this._callOpenAI(prompt, options);
  }

  async call(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<LLMResponsePayload> {
    const start = performance.now();
    const resultText = await this._callWithRetry(() => this._executeCall(prompt, options));
    const durationMs = Math.round(performance.now() - start);

    let parsedJson = undefined;
    if (options.json) {
      try {
        parsedJson = this._parseJSON(resultText);
      } catch {
        // ignore json error
      }
    }

    return {
      text: resultText,
      json: parsedJson,
      durationMs,
      model: options.model || this.model || 'default',
      provider: options.provider || this.provider
    };
  }
}

import { getModelManager } from '../model/model-manager';
import type { StoredModelConfig } from '../model/model-registry';

export class LLMConfigManager {
  private _modelManager: any = null;

  _getModelManager() {
    if (!this._modelManager) {
      this._modelManager = getModelManager();
    }
    return this._modelManager;
  }

  async load(): Promise<{ provider: string; model: string; apiKeys: Record<string, string>; activeModelConfig?: any }> {
    const manager = this._getModelManager();
    if (!manager) return { provider: 'gemini', model: 'gemini-2.0-flash', apiKeys: {} };
    await manager.init();
    const activeModel = await manager.getActiveModel();
    if (!activeModel) return { provider: 'gemini', model: 'gemini-2.0-flash', apiKeys: {} };
    return {
      provider: activeModel.provider,
      model: activeModel.model,
      apiKeys: { [activeModel.provider]: activeModel.apiKey },
      activeModelConfig: activeModel
    };
  }

  async getApiKey(provider: string): Promise<string> {
    const manager = this._getModelManager();
    if (!manager) return '';
    await manager.init();
    const models = await manager.getAllModels();
    const model = models.find((m: any) => m.provider === provider && m.enabled);
    return model ? model.apiKey : '';
  }

  async getClient(): Promise<LLMClient> {
    const manager = this._getModelManager();
    if (!manager) {
      return new LLMClient({ provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' });
    }
    await manager.init();
    const activeModel = await manager.getActiveModel();
    if (!activeModel) {
      return new LLMClient({ provider: 'gemini', apiKey: '', model: 'gemini-2.0-flash' });
    }
    return new LLMClient({
      provider: activeModel.provider,
      apiKey: activeModel.apiKey,
      model: activeModel.model,
      temperature: activeModel.parameters?.temperature,
      maxTokens: activeModel.parameters?.maxOutputTokens || activeModel.parameters?.max_tokens
    });
  }

  async isConfigured(): Promise<boolean> {
    const manager = this._getModelManager();
    if (!manager) return false;
    await manager.init();
    const activeModel = await manager.getActiveModel();
    return Boolean(activeModel?.apiKey);
  }

  async getActiveModelConfig(): Promise<any> {
    const manager = this._getModelManager();
    if (!manager) return null;
    await manager.init();
    const model = await manager.getActiveModel();
    return model ? { ...model, parameters: { ...(model.parameters || {}) } } : null;
  }
}

export const llmConfigManager = new LLMConfigManager();
