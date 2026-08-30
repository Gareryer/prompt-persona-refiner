/**
 * @fileoverview Complete Multi-Provider LLM Client with Resilient Retries
 * Ported from llm/llm-client.js (868 lines)
 */

import { logger } from '../logging/logger';
import { sanitizeApiKey } from '../model/model-registry';

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
  private provider: string;
  private apiKey: string;
  private model?: string;
  private temperature?: number;
  private maxTokens?: number;
  private baseURL?: string;

  constructor(config: LLMCallConfig) {
    this.provider = config.provider || 'gemini';
    this.apiKey = sanitizeApiKey(config.apiKey || '');
    this.model = config.model;
    this.temperature = config.temperature;
    this.maxTokens = config.maxTokens;
    this.baseURL = config.baseURL;
  }

  async call(prompt: string, options: Partial<LLMCallConfig> = {}): Promise<LLMResponsePayload> {
    const provider = options.provider || this.provider;
    const apiKey = sanitizeApiKey(options.apiKey || this.apiKey);
    if (!apiKey) throw new Error(`[LLMClient] No API key configured for provider: ${provider}`);

    const start = performance.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        let resultText = '';
        if (provider === 'gemini') {
          resultText = await this.callGemini(prompt, apiKey, options);
        } else if (provider === 'anthropic') {
          resultText = await this.callAnthropic(prompt, apiKey, options);
        } else {
          resultText = await this.callOpenAICompatible(prompt, apiKey, provider, options);
        }

        const durationMs = Math.round(performance.now() - start);
        let parsedJson = undefined;
        if (options.json) {
          try {
            parsedJson = JSON.parse(resultText);
          } catch {
            // Leave json undefined
          }
        }

        return {
          text: resultText,
          json: parsedJson,
          durationMs,
          model: options.model || this.model || 'default',
          provider
        };
      } catch (err: any) {
        lastError = err;
        const errType = this.classifyError(err);
        logger.warn(`LLM call attempt ${attempt} failed (${errType})`, { error: err.message });

        if (attempt < RETRY_CONFIG.maxRetries && (errType === LLMErrorType.RATE_LIMIT || errType === LLMErrorType.NETWORK)) {
          const delay = Math.min(RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt - 1), RETRY_CONFIG.maxDelayMs);
          await new Promise(r => setTimeout(r, delay));
        } else {
          break;
        }
      }
    }

    throw lastError || new Error('LLM call failed after retries');
  }

  private async callGemini(prompt: string, apiKey: string, options: Partial<LLMCallConfig>): Promise<string> {
    const model = options.model || this.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? this.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? this.maxTokens ?? 8192
      }
    };

    if (options.json) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    if (options.systemPrompt) {
      body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini Error ${res.status}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callAnthropic(prompt: string, apiKey: string, options: Partial<LLMCallConfig>): Promise<string> {
    const model = options.model || this.model || 'claude-3-5-sonnet-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const body: any = {
      model,
      max_tokens: options.maxTokens ?? this.maxTokens ?? 4096,
      messages: [{ role: 'user', content: prompt }]
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic Error ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  private async callOpenAICompatible(
    prompt: string,
    apiKey: string,
    provider: string,
    options: Partial<LLMCallConfig>
  ): Promise<string> {
    const baseURL = options.baseURL || this.baseURL || (
      provider === 'deepseek' ? 'https://api.deepseek.com/v1' :
      provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
      'https://api.openai.com/v1'
    );
    const url = `${baseURL}/chat/completions`;

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: options.model || this.model || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
      messages,
      temperature: options.temperature ?? this.temperature ?? 0.7
    };

    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `${provider.toUpperCase()} Error ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private classifyError(err: any): LLMErrorType {
    const msg = (err?.message || '').toLowerCase();
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) return LLMErrorType.RATE_LIMIT;
    if (msg.includes('401') || msg.includes('invalid api key') || msg.includes('unauthorized')) return LLMErrorType.AUTH;
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('timeout')) return LLMErrorType.NETWORK;
    if (msg.includes('maximum context') || msg.includes('too long')) return LLMErrorType.TOKEN_LIMIT;
    return LLMErrorType.UNKNOWN;
  }
}
