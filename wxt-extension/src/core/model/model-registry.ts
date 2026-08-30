export interface ModelDefinition {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter';
  contextWindow: number;
  maxOutputTokens: number;
  defaultTemp: number;
  supportsJson: boolean;
  isDefault?: boolean;
}

export const MODEL_REGISTRY: Record<string, ModelDefinition> = {
  'gemini-2.0-flash': {
    id: 'gemini-2.0-flash',
    name: 'Google Gemini 2.0 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    supportsJson: true,
    isDefault: true
  },
  'gemini-1.5-pro': {
    id: 'gemini-1.5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'gemini',
    contextWindow: 2097152,
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    supportsJson: true
  },
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    defaultTemp: 0.7,
    supportsJson: true
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'OpenAI GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    maxOutputTokens: 4096,
    defaultTemp: 0.7,
    supportsJson: true
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    supportsJson: true
  },
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat (V3)',
    provider: 'deepseek',
    contextWindow: 64000,
    maxOutputTokens: 8192,
    defaultTemp: 0.7,
    supportsJson: true
  }
};
