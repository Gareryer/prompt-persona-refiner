/**
 * ============================================================================
 * MODEL REGISTRY - Provider and Model Definitions
 * ============================================================================
 * 
 * Static definitions for supported LLM providers and their models.
 * This registry provides metadata used by the Model Manager UI.
 * 
 * ============================================================================
 */

/**
 * Provider definitions with model lists and parameter schemas
 */
const MODEL_PROVIDERS = {
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
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', default: true },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
            { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' }
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
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', default: true },
            { id: 'gpt-4o', name: 'GPT-4o' },
            { id: 'gpt-4o-2024-08-06', name: 'GPT-4o (Strict JSON)' }
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
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', default: true },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
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
            { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', default: true },
            { id: 'google/gemini-flash-1.5-8b:free', name: 'Gemini 1.5 Flash 8B (Free)' },
            { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)' },
            { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', name: 'Llama 3.2 11B (Free)' },
            { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama 3.1 8B (Free)' },
            { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)' },
            { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (Free)' },
            { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini 128k (Free)' },
            { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)' },
            { id: 'openai/gpt-oss-120b:free', name: 'GPT OSS 120B (Free)' },
            { id: 'allenai/olmo-3.1-32b-think:free', name: 'Olmo 3.1 32B Think (Free)' },
            { id: 'nvidia/nemotron-3-nano-30b-a3b:free', name: 'Nvidia Nemotron 30B (Free)' }
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

/**
 * Default model configurations for first-time users
 */
const DEFAULT_MODEL_CONFIGS = {
    gemini: {
        id: 'gemini',
        name: 'Gemini',
        enabled: false,
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKey: '',
        baseURL: MODEL_PROVIDERS.gemini.defaultBaseURL,
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
        baseURL: MODEL_PROVIDERS.openai.defaultBaseURL,
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
        baseURL: MODEL_PROVIDERS.anthropic.defaultBaseURL,
        parameters: {
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
        baseURL: MODEL_PROVIDERS.openrouter.defaultBaseURL,
        parameters: {
            temperature: 0.7,
            max_tokens: 4096
        }
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sanitize API key by removing non-ASCII characters
 * This prevents "String contains non ISO-8859-1 code point" errors
 * when API keys are copy-pasted with invisible unicode characters
 * @param {string} apiKey 
 * @returns {string} - Cleaned API key with only ASCII characters
 */
function sanitizeApiKey(apiKey) {
    if (!apiKey) return '';
    // Remove all non-printable ASCII and non-ASCII characters
    // Keep only printable ASCII (0x20-0x7E)
    const sanitized = apiKey.replace(/[^\x20-\x7E]/g, '').trim();
    if (sanitized !== apiKey) {
        console.warn('[ModelRegistry] API key contained non-ASCII characters, sanitized');
    }
    return sanitized;
}

/**
 * Get provider definition by ID
 * @param {string} providerId 
 * @returns {Object|null}
 */
function getProvider(providerId) {
    return MODEL_PROVIDERS[providerId] || null;
}

/**
 * Get all provider IDs
 * @returns {string[]}
 */
function getProviderIds() {
    return Object.keys(MODEL_PROVIDERS);
}

/**
 * Get models for a provider
 * @param {string} providerId 
 * @returns {Array}
 */
function getModelsForProvider(providerId) {
    const provider = MODEL_PROVIDERS[providerId];
    return provider ? provider.models : [];
}

/**
 * Get default model for a provider
 * @param {string} providerId 
 * @returns {string|null}
 */
function getDefaultModelForProvider(providerId) {
    const models = getModelsForProvider(providerId);
    const defaultModel = models.find(m => m.default);
    return defaultModel ? defaultModel.id : (models[0]?.id || null);
}

/**
 * Get parameter definitions for a provider
 * @param {string} providerId 
 * @returns {Array}
 */
function getParametersForProvider(providerId) {
    const provider = MODEL_PROVIDERS[providerId];
    return provider ? provider.parameters : [];
}

/**
 * Get default parameter values for a provider
 * @param {string} providerId 
 * @returns {Object}
 */
function getDefaultParameterValues(providerId) {
    const params = getParametersForProvider(providerId);
    const defaults = {};
    for (const param of params) {
        defaults[param.name] = param.default;
    }
    return defaults;
}

/**
 * Fetch available models from Gemini API
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function fetchGeminiModels(apiKey) {
    const cleanKey = sanitizeApiKey(apiKey);
    if (!cleanKey) {
        throw new Error('API key required');
    }

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models',
            {
                headers: {
                    'x-goog-api-key': cleanKey
                }
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch models');
        }

        const data = await response.json();

        // Filter models that support generateContent
        const models = data.models
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => ({
                id: m.name.replace('models/', ''),
                name: m.displayName || m.name.replace('models/', ''),
                description: m.description
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return models;
    } catch (error) {
        console.error('[ModelRegistry] Failed to fetch Gemini models:', error);
        throw error;
    }
}

/**
 * Fetch available models from OpenAI API
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function fetchOpenAIModels(apiKey) {
    const cleanKey = sanitizeApiKey(apiKey);
    if (!cleanKey) {
        throw new Error('API key required');
    }

    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${cleanKey}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch models');
        }

        const data = await response.json();

        // Filter to GPT models that support chat completions
        const chatModels = data.data
            .filter(m => m.id.includes('gpt') || m.id.includes('o1'))
            .map(m => ({
                id: m.id,
                name: m.id
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return chatModels;
    } catch (error) {
        console.error('[ModelRegistry] Failed to fetch OpenAI models:', error);
        throw error;
    }
}

/**
 * Fetch available models from OpenRouter API
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function fetchOpenRouterModels(apiKey) {
    const cleanKey = sanitizeApiKey(apiKey);
    if (!cleanKey) {
        throw new Error('API key required');
    }

    try {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${cleanKey}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch models');
        }

        const data = await response.json();

        // Map to our format
        const models = data.data
            .map(m => ({
                id: m.id,
                name: m.name || m.id,
                description: m.description,
                contextLength: m.context_length,
                pricing: m.pricing
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return models;
    } catch (error) {
        console.error('[ModelRegistry] Failed to fetch OpenRouter models:', error);
        throw error;
    }
}

/**
 * Unified function to fetch models for any supported provider
 * @param {string} providerId
 * @param {string} apiKey
 * @returns {Promise<Array>}
 */
async function fetchModelsForProvider(providerId, apiKey) {
    switch (providerId) {
        case 'gemini':
            return fetchGeminiModels(apiKey);
        case 'openai':
            return fetchOpenAIModels(apiKey);
        case 'openrouter':
            return fetchOpenRouterModels(apiKey);
        case 'anthropic':
            // Anthropic doesn't have a public models API, return static list
            return MODEL_PROVIDERS.anthropic.models;
        default:
            throw new Error(`Dynamic model fetching not supported for ${providerId}`);
    }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.MODEL_PROVIDERS = MODEL_PROVIDERS;
    window.DEFAULT_MODEL_CONFIGS = DEFAULT_MODEL_CONFIGS;
    window.ModelRegistry = {
        getProvider,
        getProviderIds,
        getModelsForProvider,
        getDefaultModelForProvider,
        getParametersForProvider,
        getDefaultParameterValues,
        fetchGeminiModels,
        fetchOpenAIModels,
        fetchOpenRouterModels,
        fetchModelsForProvider
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MODEL_PROVIDERS,
        DEFAULT_MODEL_CONFIGS,
        getProvider,
        getProviderIds,
        getModelsForProvider,
        getDefaultModelForProvider,
        getParametersForProvider,
        getDefaultParameterValues,
        fetchGeminiModels,
        fetchOpenAIModels,
        fetchOpenRouterModels,
        fetchModelsForProvider
    };
}

