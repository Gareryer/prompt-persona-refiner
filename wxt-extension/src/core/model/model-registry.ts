/**
 * @fileoverview Exhaustive Model Registry & Provider Definitions
 * Ported from model/model-registry.js (532 lines)
 */

export interface ModelParameterDef {
  name: string;
  label: string;
  type: 'number' | 'integer' | 'string' | 'boolean';
  default: any;
  min?: number;
  max?: number;
  step?: number;
  description: string;
}

export interface ModelEntry {
  id: string;
  name: string;
  description?: string;
  default?: boolean;
  contextWindow?: number;
  maxTokens?: number;
  supportsJson?: boolean;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  color: string;
  defaultBaseURL: string;
  apiKeyUrl: string;
  apiKeyPlaceholder: string;
  supportsCustomURL: boolean;
  supportsDynamicModels?: boolean;
  supportsCustomModel?: boolean;
  models: ModelEntry[];
  parameters: ModelParameterDef[];
}

export interface StoredModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  baseURL: string;
  parameters: Record<string, any>;
}

export const MODEL_PROVIDERS: Record<string, ProviderDefinition> = {
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    color: '#4285F4',
    defaultBaseURL: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKeyUrl: 'https://aistudio.google.com/',
    apiKeyPlaceholder: 'AIza...',
    supportsCustomURL: false,
    supportsDynamicModels: true,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', default: true, contextWindow: 1048576, maxTokens: 8192, supportsJson: true },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1048576, maxTokens: 8192, supportsJson: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextWindow: 1048576, maxTokens: 8192, supportsJson: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 2097152, maxTokens: 8192, supportsJson: true },
      { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', contextWindow: 1048576, maxTokens: 8192, supportsJson: true }
    ],
    parameters: [
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
        description: 'Higher = more creative, Lower = more deterministic'
      },
      {
        name: 'maxOutputTokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 8192,
        min: 1,
        max: 32768,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    color: '#10A37F',
    defaultBaseURL: 'https://api.openai.com/v1',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyPlaceholder: 'sk-...',
    supportsCustomURL: false,
    supportsDynamicModels: true,
    models: [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', default: true, contextWindow: 128000, maxTokens: 4096, supportsJson: true },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxTokens: 4096, supportsJson: true },
      { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Strict JSON)', contextWindow: 128000, maxTokens: 16384, supportsJson: true }
    ],
    parameters: [
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 1,
        min: 0,
        max: 2,
        step: 0.1,
        description: 'Higher = more creative, Lower = more deterministic'
      },
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 4096,
        min: 1,
        max: 16384,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    color: '#D97706',
    defaultBaseURL: 'https://api.anthropic.com/v1',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyPlaceholder: 'sk-ant-...',
    supportsCustomURL: false,
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', default: true, contextWindow: 200000, maxTokens: 8192, supportsJson: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000, maxTokens: 8192, supportsJson: true }
    ],
    parameters: [
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 4096,
        min: 1,
        max: 8192,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    color: '#0EA5E9',
    defaultBaseURL: 'https://api.deepseek.com/v1',
    apiKeyUrl: 'https://platform.deepseek.com/api_keys',
    apiKeyPlaceholder: 'sk-...',
    supportsCustomURL: false,
    supportsDynamicModels: true,
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', default: true, contextWindow: 64000, maxTokens: 8192, supportsJson: true },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)', contextWindow: 64000, maxTokens: 8192, supportsJson: true }
    ],
    parameters: [
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
        description: 'Higher = more creative, Lower = more deterministic'
      },
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 4096,
        min: 1,
        max: 8192,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  },

  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    color: '#6366F1',
    defaultBaseURL: 'https://openrouter.ai/api/v1',
    apiKeyUrl: 'https://openrouter.ai/keys',
    apiKeyPlaceholder: 'sk-or-...',
    supportsCustomURL: false,
    supportsDynamicModels: true,
    models: [
      { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', default: true, contextWindow: 1048576, maxTokens: 8192, supportsJson: true },
      { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', contextWindow: 128000, maxTokens: 4096, supportsJson: true },
      { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)', contextWindow: 128000, maxTokens: 4096, supportsJson: true }
    ],
    parameters: [
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
        description: 'Higher = more creative, Lower = more deterministic'
      },
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 4096,
        min: 1,
        max: 16384,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  },

  custom: {
    id: 'custom',
    name: 'Custom Endpoint',
    color: '#6B7280',
    defaultBaseURL: '',
    apiKeyUrl: '',
    apiKeyPlaceholder: 'Your API key...',
    supportsCustomURL: true,
    supportsCustomModel: true,
    models: [],
    parameters: [
      {
        name: 'temperature',
        label: 'Temperature',
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
        description: 'Higher = more creative, Lower = more deterministic'
      },
      {
        name: 'max_tokens',
        label: 'Max Tokens',
        type: 'integer',
        default: 4096,
        min: 1,
        max: 32768,
        step: 256,
        description: 'Maximum tokens in the response'
      }
    ]
  }
};

export const DEFAULT_MODEL_CONFIGS: Record<string, StoredModelConfig> = {
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    enabled: true,
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKey: '',
    baseURL: MODEL_PROVIDERS['gemini']?.defaultBaseURL || '',
    parameters: {
      temperature: 0.7,
      maxOutputTokens: 4096
    }
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    enabled: false,
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    baseURL: MODEL_PROVIDERS['openai']?.defaultBaseURL || '',
    parameters: {
      temperature: 1,
      max_tokens: 4096
    }
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: false,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    baseURL: MODEL_PROVIDERS['anthropic']?.defaultBaseURL || '',
    parameters: {
      max_tokens: 4096
    }
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    enabled: false,
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: '',
    baseURL: MODEL_PROVIDERS['deepseek']?.defaultBaseURL || '',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    enabled: false,
    provider: 'openrouter',
    model: 'google/gemini-2.0-flash-exp:free',
    apiKey: '',
    baseURL: MODEL_PROVIDERS['openrouter']?.defaultBaseURL || '',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  }
};

export function sanitizeApiKey(apiKey: string): string {
  if (!apiKey) return '';
  return apiKey.replace(/[^\x20-\x7E]/g, '').trim();
}

export function getProvider(providerId: string): ProviderDefinition | null {
  return MODEL_PROVIDERS[providerId] || null;
}

export function getProviderIds(): string[] {
  return Object.keys(MODEL_PROVIDERS);
}

export function getModelsForProvider(providerId: string): ModelEntry[] {
  const provider = MODEL_PROVIDERS[providerId];
  return provider ? provider.models : [];
}

export function getDefaultModelForProvider(providerId: string): string | null {
  const models = getModelsForProvider(providerId);
  const defaultModel = models.find(m => m.default);
  return defaultModel ? defaultModel.id : (models[0]?.id || null);
}

export function getParametersForProvider(providerId: string): ModelParameterDef[] {
  const provider = MODEL_PROVIDERS[providerId];
  return provider ? provider.parameters : [];
}

export function getDefaultParameterValues(providerId: string): Record<string, any> {
  const params = getParametersForProvider(providerId);
  const defaults: Record<string, any> = {};
  for (const param of params) {
    defaults[param.name] = param.default;
  }
  return defaults;
}

export async function fetchGeminiModels(apiKey: string): Promise<ModelEntry[]> {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) throw new Error('API key required');

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models',
    { headers: { 'x-goog-api-key': cleanKey } }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  return (data.models || [])
    .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
    .map((m: any) => ({
      id: m.name.replace('models/', ''),
      name: m.displayName || m.name.replace('models/', ''),
      description: m.description
    }))
    .sort((a: ModelEntry, b: ModelEntry) => a.name.localeCompare(b.name));
}

export async function fetchOpenAIModels(apiKey: string): Promise<ModelEntry[]> {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) throw new Error('API key required');

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${cleanKey}` }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Failed to fetch models: ${response.status}`);
  }

  const data = await response.json();
  return (data.data || [])
    .filter((m: any) => m.id.includes('gpt') || m.id.includes('o1') || m.id.includes('o3'))
    .map((m: any) => ({ id: m.id, name: m.id }))
    .sort((a: ModelEntry, b: ModelEntry) => a.name.localeCompare(b.name));
}

export const MODEL_REGISTRY = MODEL_PROVIDERS;
