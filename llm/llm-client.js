/**
 * ============================================================================
 * LLM CLIENT - Unified API for BYOK Providers
 * ============================================================================
 * 
 * Unified interface for calling LLM APIs with user-provided API keys.
 * Supports multiple providers: Gemini, OpenAI, Anthropic, OpenRouter.
 * 
 * ============================================================================
 * USAGE
 * ============================================================================
 * 
 * // Initialize with provider and API key
 * const client = new LLMClient({
 *     provider: 'gemini',
 *     apiKey: 'your-api-key',
 *     model: 'gemini-1.5-flash'
 * });
 * 
 * // Make a call
 * const response = await client.call(prompt, { json: true });
 * 
 * ============================================================================
 */

/**
 * Supported providers
 */
const LLM_PROVIDERS = {
    GEMINI: 'gemini',
    OPENAI: 'openai',
    ANTHROPIC: 'anthropic',
    OPENROUTER: 'openrouter'
};

/**
 * Default models per provider
 */
const DEFAULT_MODELS = {
    [LLM_PROVIDERS.GEMINI]: 'gemini-1.5-flash',
    [LLM_PROVIDERS.OPENAI]: 'gpt-4o-mini',
    [LLM_PROVIDERS.ANTHROPIC]: 'claude-3-haiku-20240307',
    [LLM_PROVIDERS.OPENROUTER]: 'google/gemini-flash-1.5'
};

/**
 * API endpoints per provider
 */
const API_ENDPOINTS = {
    [LLM_PROVIDERS.GEMINI]: 'https://generativelanguage.googleapis.com/v1beta/models',
    [LLM_PROVIDERS.OPENAI]: 'https://api.openai.com/v1/chat/completions',
    [LLM_PROVIDERS.ANTHROPIC]: 'https://api.anthropic.com/v1/messages',
    [LLM_PROVIDERS.OPENROUTER]: 'https://openrouter.ai/api/v1/chat/completions'
};

/**
 * Retry configuration for resilient API calls
 */
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,      // Initial delay before retry
    maxDelayMs: 10000,      // Maximum delay cap
    interCallDelayMs: 500   // Delay between consecutive calls (rate limit protection)
};

/**
 * Error types for classification
 */
const LLM_ERROR_TYPES = {
    RATE_LIMIT: 'RATE_LIMIT',           // 429 - Too many requests
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',   // Quota/billing issue
    NETWORK: 'NETWORK',                 // Network connectivity
    TOKEN_LIMIT: 'TOKEN_LIMIT',         // Response too large
    AUTH: 'AUTH',                       // Invalid API key
    MALFORMED_RESPONSE: 'MALFORMED_RESPONSE',
    UNKNOWN: 'UNKNOWN'
};

/**
 * Errors that should trigger retry
 */
const RETRYABLE_ERRORS = [
    LLM_ERROR_TYPES.RATE_LIMIT,
    LLM_ERROR_TYPES.NETWORK
];

/**
 * LLMClient - Unified interface for LLM providers
 */
class LLMClient {
    /**
     * @param {Object} config
     * @param {string} config.provider - Provider name (gemini, openai, anthropic, openrouter)
     * @param {string} config.apiKey - API key for the provider
     * @param {string} config.model - Model to use (optional, uses default)
     * @param {number} config.temperature - Temperature (optional)
     * @param {number} config.maxTokens - Max tokens (optional)
     */
    constructor(config = {}) {
        this.provider = config.provider || LLM_PROVIDERS.GEMINI;

        // Sanitize API key - remove non-ASCII characters that cause fetch errors
        this.apiKey = this._sanitizeApiKey(config.apiKey || '');

        this.model = config.model || DEFAULT_MODELS[this.provider];

        // Store default parameters from config (can be overridden per-call)
        this.defaultTemperature = config.temperature;
        this.defaultMaxTokens = config.maxTokens;

        // Logger helper
        this._log = (level, msg, data = {}) => {
            if (typeof Logger !== 'undefined') {
                Logger.getInstance()[level](msg, { component: 'LLMClient', ...data });
            } else {
                console[level === 'error' ? 'error' : 'log'](`[LLMClient] ${msg}`, data);
            }
        };

        if (!this.apiKey) {
            this._log('warn', `No API key provided for ${this.provider}/${this.model}`, {
                provider: this.provider,
                model: this.model
            });
            console.warn(`[LLMClient] No API key for: ${this.provider} / ${this.model}`);
        } else {
            console.log(`[LLMClient] Configured: ${this.provider}/${this.model} (key: ${this.apiKey.slice(0, 8)}...)`);
        }
    }

    /**
     * Check if client is configured with an API key
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Sanitize API key by removing non-ASCII characters
     * This prevents "String contains non ISO-8859-1 code point" errors
     * @param {string} key 
     * @returns {string}
     */
    _sanitizeApiKey(key) {
        if (!key) return '';
        // Keep only printable ASCII (0x20-0x7E)
        const sanitized = key.replace(/[^\x20-\x7E]/g, '').trim();
        if (sanitized !== key) {
            console.warn('[LLMClient] API key contained non-ASCII characters, sanitized');
        }
        return sanitized;
    }

    /**
     * Proxy fetch through extension bridge (for MAIN world cross-origin requests)
     * MAIN world cannot make cross-origin requests, so we route through background script
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @param {AbortSignal} abortSignal - Optional abort signal for cancellation
     * @returns {Promise<{ok: boolean, status: number, data: any}>}
     */
    async _proxyFetch(url, options, abortSignal = null) {
        // Force proxy bridge on gemini.google.com (MAIN world scripts)
        // CSP on Gemini blocks all external fetch requests, so we MUST use the extension bridge
        const onGeminiPage = typeof window !== 'undefined' &&
            window.location?.hostname?.includes('gemini.google.com');

        // Check if we're in MAIN world (no chrome.runtime.sendMessage available)
        const isMainWorld = typeof chrome === 'undefined' ||
            typeof chrome.runtime === 'undefined' ||
            typeof chrome.runtime.sendMessage === 'undefined';

        // Use proxy bridge if on Gemini page OR if no chrome.runtime access
        if ((onGeminiPage || isMainWorld) && typeof window !== 'undefined') {
            // Use proxy bridge
            return new Promise((resolve, reject) => {
                const requestId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Handle abort signal
                if (abortSignal) {
                    if (abortSignal.aborted) {
                        reject(new DOMException('Request aborted', 'AbortError'));
                        return;
                    }

                    abortSignal.addEventListener('abort', () => {
                        window.removeEventListener('pa-api-proxy-response', handler);
                        // Dispatch abort event to bridge
                        window.dispatchEvent(new CustomEvent('pa-api-proxy-abort', {
                            detail: { requestId }
                        }));
                        reject(new DOMException('Request aborted', 'AbortError'));
                    });
                }

                const handler = (event) => {
                    if (event.detail?.requestId === requestId) {
                        window.removeEventListener('pa-api-proxy-response', handler);

                        if (event.detail.success) {
                            resolve(event.detail.data);
                        } else {
                            reject(new Error(event.detail.error || 'API proxy failed'));
                        }
                    }
                };

                window.addEventListener('pa-api-proxy-response', handler);

                // Send request to extension bridge
                window.dispatchEvent(new CustomEvent('pa-api-proxy-request', {
                    detail: { url, options, requestId }
                }));

                // Timeout after 60 seconds
                setTimeout(() => {
                    window.removeEventListener('pa-api-proxy-response', handler);
                    reject(new Error('API proxy timeout (60s)'));
                }, 60000);
            });
        }

        // Direct fetch for non-MAIN world contexts (Options page, Sidepanel, etc.)
        try {
            const fetchOptions = { ...options };
            if (abortSignal) {
                fetchOptions.signal = abortSignal;
            }

            const response = await fetch(url, fetchOptions);
            const contentType = response.headers.get('content-type') || '';
            let data;

            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }

            return {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                data: data
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Update configuration
     * @param {Object} config
     */
    configure(config) {
        if (config.provider) this.provider = config.provider;
        if (config.apiKey) this.apiKey = config.apiKey;
        if (config.model) this.model = config.model;
    }

    /**
     * Make an LLM API call with automatic retry for transient errors
     * @param {string} prompt - The prompt to send
     * @param {Object} options - Call options
     * @param {boolean} options.json - Request JSON response
     * @param {string} options.systemPrompt - System prompt (optional)
     * @param {number} options.maxTokens - Max tokens (optional)
     * @param {number} options.temperature - Temperature (optional)
     * @param {boolean} options.skipRetry - Skip retry logic (optional)
     * @param {AbortSignal} options.abortSignal - Abort signal for cancellation (optional)
     * @returns {Promise<Object|string>}
     */
    async call(prompt, options = {}) {
        if (!this.apiKey) {
            const error = new Error('[LLMClient] No API key configured. Please set up your API key in settings.');
            error.errorType = LLM_ERROR_TYPES.AUTH;
            throw error;
        }

        // Check if already aborted
        if (options.abortSignal?.aborted) {
            throw new DOMException('Request aborted', 'AbortError');
        }

        // Merge defaults with per-call options
        const mergedOptions = {
            ...options,
            temperature: options.temperature ?? this.defaultTemperature,
            maxTokens: options.maxTokens ?? this.defaultMaxTokens
        };

        // Use retry wrapper unless explicitly disabled
        if (options.skipRetry) {
            return this._executeCall(prompt, mergedOptions);
        }

        return this._callWithRetry(prompt, mergedOptions);
    }

    /**
     * Execute call with retry logic and exponential backoff
     */
    async _callWithRetry(prompt, options) {
        let lastError = null;

        for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
            try {
                // Add inter-call delay to prevent rate limiting (except first call)
                if (attempt > 0) {
                    const delay = this._calculateBackoff(attempt);
                    console.log(`[LLMClient] Retry ${attempt}/${RETRY_CONFIG.maxRetries}, waiting ${delay}ms...`);
                    await this._delay(delay);
                }

                const result = await this._executeCall(prompt, options);

                // Add small delay after successful call for rate limit protection
                await this._delay(RETRY_CONFIG.interCallDelayMs);

                return result;
            } catch (error) {
                lastError = error;
                const errorType = this._classifyError(error);
                error.errorType = errorType;

                console.warn(`[LLMClient] Attempt ${attempt + 1} failed:`, errorType, error.message);

                // Don't retry non-retryable errors
                if (!RETRYABLE_ERRORS.includes(errorType)) {
                    console.error(`[LLMClient] Non-retryable error: ${errorType}`);
                    throw error;
                }

                // Don't retry if we've exhausted attempts
                if (attempt === RETRY_CONFIG.maxRetries) {
                    console.error(`[LLMClient] Max retries (${RETRY_CONFIG.maxRetries}) exhausted`);
                    throw error;
                }
            }
        }

        throw lastError;
    }

    /**
     * Execute the actual API call (no retry logic)
     */
    async _executeCall(prompt, options) {
        const provider = this.provider;

        switch (provider) {
            case LLM_PROVIDERS.GEMINI:
                return await this._callGemini(prompt, options);
            case LLM_PROVIDERS.OPENAI:
                return await this._callOpenAI(prompt, options);
            case LLM_PROVIDERS.ANTHROPIC:
                return await this._callAnthropic(prompt, options);
            case LLM_PROVIDERS.OPENROUTER:
                return await this._callOpenRouter(prompt, options);
            default:
                throw new Error(`[LLMClient] Unknown provider: ${provider}`);
        }
    }

    /**
     * Classify error type for retry decision
     */
    _classifyError(error) {
        const message = error.message?.toLowerCase() || '';
        const status = error.status || 0;

        // Rate limiting
        if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
            return LLM_ERROR_TYPES.RATE_LIMIT;
        }

        // Quota/billing
        if (message.includes('quota') || message.includes('billing') || message.includes('exceeded')) {
            return LLM_ERROR_TYPES.QUOTA_EXCEEDED;
        }

        // Auth errors
        if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('invalid api key')) {
            return LLM_ERROR_TYPES.AUTH;
        }

        // Token limits
        if (message.includes('token') && (message.includes('limit') || message.includes('maximum'))) {
            return LLM_ERROR_TYPES.TOKEN_LIMIT;
        }

        // Network errors
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('econnrefused')) {
            return LLM_ERROR_TYPES.NETWORK;
        }

        // JSON parse errors
        if (message.includes('json') || message.includes('parse')) {
            return LLM_ERROR_TYPES.MALFORMED_RESPONSE;
        }

        return LLM_ERROR_TYPES.UNKNOWN;
    }

    /**
     * Calculate exponential backoff delay
     */
    _calculateBackoff(attempt) {
        const delay = Math.min(
            RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
            RETRY_CONFIG.maxDelayMs
        );
        // Add jitter (±20%) to prevent thundering herd
        const jitter = delay * 0.2 * (Math.random() - 0.5);
        return Math.floor(delay + jitter);
    }

    /**
     * Delay helper
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Call Gemini API
     * @param {string} prompt - The prompt
     * @param {Object} options - Call options
     * @param {Object} options.schema - JSON Schema for structured output (optional)
     */
    async _callGemini(prompt, options) {
        console.log('[LLMClient] _callGemini START');
        this._log('debug', '[_callGemini] START', { model: this.model, hasSchema: !!options.schema });

        // Step 1: Build URL
        const url = `${API_ENDPOINTS[LLM_PROVIDERS.GEMINI]}/${this.model}:generateContent?key=${this.apiKey}`;
        console.log('[LLMClient] _callGemini: URL constructed');

        // Step 2: Build request body
        console.log('[LLMClient] _callGemini: Building request body...');
        const body = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: options.temperature || 0.7,
                maxOutputTokens: options.maxTokens || 4096
            }
        };
        console.log('[LLMClient] _callGemini: Body constructed', { promptLength: prompt.length });

        // Step 3: JSON mode with optional schema enforcement
        if (options.json) {
            body.generationConfig.responseMimeType = 'application/json';
            console.log('[LLMClient] _callGemini: JSON mode enabled');

            if (options.schema) {
                body.generationConfig.responseSchema = options.schema;
                console.log('[LLMClient] _callGemini: JSON Schema enforcement enabled');
                this._log('debug', '[_callGemini] Schema enforcement enabled');
            }
        }

        // Step 4: Execute fetch (via proxy for MAIN world)
        console.log('[LLMClient] _callGemini: Sending request...');
        this._log('debug', '[_callGemini] Sending request');
        const startTime = performance.now();

        const proxyResponse = await this._proxyFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }, options.abortSignal);

        const fetchDuration = Math.round(performance.now() - startTime);
        console.log(`[LLMClient] _callGemini: Response received (${fetchDuration}ms), status=${proxyResponse.status}`);
        this._log('debug', '[_callGemini] Response received', { status: proxyResponse.status, durationMs: fetchDuration });

        // Step 5: Handle errors
        if (!proxyResponse.ok) {
            console.error('[LLMClient] _callGemini: API error');
            const error = proxyResponse.data;
            throw new Error(`Gemini API error: ${error?.error?.message || proxyResponse.statusText || 'Unknown error'}`);
        }

        // Step 6: Parse response (data is already parsed by proxy)
        console.log('[LLMClient] _callGemini: Processing response...');
        const data = proxyResponse.data;
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('[LLMClient] _callGemini: Response processed', { textLength: text.length });
        this._log('debug', '[_callGemini] COMPLETE', { responseLength: text.length });

        return options.json ? this._parseJSON(text) : text;
    }

    /**
     * Call OpenAI API
     * @param {string} prompt - The prompt
     * @param {Object} options - Call options
     * @param {Object} options.schema - JSON Schema for structured output (optional)
     */
    async _callOpenAI(prompt, options) {
        const url = API_ENDPOINTS[LLM_PROVIDERS.OPENAI];

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const body = {
            model: this.model,
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 4096
        };

        // JSON mode with optional schema enforcement
        if (options.json) {
            if (options.schema) {
                // Use structured output with schema
                body.response_format = {
                    type: 'json_schema',
                    json_schema: {
                        name: 'analysis_response',
                        strict: true,
                        schema: options.schema
                    }
                };
                console.log('[LLMClient] OpenAI: Using JSON Schema enforcement');
            } else {
                // Basic JSON mode without schema
                body.response_format = { type: 'json_object' };
            }
        }

        const proxyResponse = await this._proxyFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!proxyResponse.ok) {
            const error = proxyResponse.data;
            throw new Error(`OpenAI API error: ${error?.error?.message || proxyResponse.statusText || 'Unknown error'}`);
        }

        const data = proxyResponse.data;
        const text = data.choices?.[0]?.message?.content || '';

        return options.json ? this._parseJSON(text) : text;
    }

    /**
     * Call Anthropic API
     * Note: Anthropic doesn't support native schema enforcement.
     * We add JSON hints to the prompt for best-effort compliance.
     */
    async _callAnthropic(prompt, options) {
        const url = API_ENDPOINTS[LLM_PROVIDERS.ANTHROPIC];

        // Add JSON instruction to prompt if schema provided but no native support
        let enhancedPrompt = prompt;
        if (options.json && options.schema) {
            console.log('[LLMClient] Anthropic: Schema provided but no native enforcement - using prompt hints');
            enhancedPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown code blocks.`;
        }

        const body = {
            model: this.model,
            max_tokens: options.maxTokens || 4096,
            messages: [{ role: 'user', content: enhancedPrompt }]
        };

        if (options.systemPrompt) {
            body.system = options.systemPrompt;
        }

        const proxyResponse = await this._proxyFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!proxyResponse.ok) {
            const error = proxyResponse.data;
            throw new Error(`Anthropic API error: ${error?.error?.message || proxyResponse.statusText || 'Unknown error'}`);
        }

        const data = proxyResponse.data;
        const text = data.content?.[0]?.text || '';

        return options.json ? this._parseJSON(text) : text;
    }

    /**
     * Call OpenRouter API
     * Note: OpenRouter routes to various backends - schema support varies.
     * We add JSON hints to the prompt for best-effort compliance.
     */
    async _callOpenRouter(prompt, options) {
        const url = API_ENDPOINTS[LLM_PROVIDERS.OPENROUTER];

        // Add JSON instruction to prompt if schema provided but no native support
        let enhancedPrompt = prompt;
        if (options.json && options.schema) {
            console.log('[LLMClient] OpenRouter: Schema provided but no native enforcement - using prompt hints');
            enhancedPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. Do not include markdown code blocks.`;
        }

        const messages = [];
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }
        messages.push({ role: 'user', content: enhancedPrompt });

        const body = {
            model: this.model,
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.maxTokens || 4096
        };

        const proxyResponse = await this._proxyFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'HTTP-Referer': 'https://gemini.google.com',
                'X-Title': 'Prompt Assistant Extension'
            },
            body: JSON.stringify(body)
        });

        if (!proxyResponse.ok) {
            const error = proxyResponse.data;
            throw new Error(`OpenRouter API error: ${error?.error?.message || proxyResponse.statusText || 'Unknown error'}`);
        }

        const data = proxyResponse.data;
        const text = data.choices?.[0]?.message?.content || '';

        return options.json ? this._parseJSON(text) : text;
    }

    /**
     * Parse JSON from text, handling markdown code blocks
     */
    _parseJSON(text) {
        // Remove markdown code blocks if present
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) {
            cleaned = cleaned.slice(7);
        } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.slice(3);
        }
        if (cleaned.endsWith('```')) {
            cleaned = cleaned.slice(0, -3);
        }
        cleaned = cleaned.trim();

        try {
            return JSON.parse(cleaned);
        } catch (e) {
            console.warn('[LLMClient] Failed to parse JSON response:', e);
            return { raw: text, parseError: true };
        }
    }

    /**
     * Get available models for current provider
     * @returns {string[]}
     */
    getAvailableModels() {
        switch (this.provider) {
            case LLM_PROVIDERS.GEMINI:
                return [
                    'gemini-1.5-flash',
                    'gemini-1.5-flash-8b',
                    'gemini-1.5-pro',
                    'gemini-2.0-flash-exp'
                ];
            case LLM_PROVIDERS.OPENAI:
                return [
                    'gpt-4o-mini',
                    'gpt-4o',
                    'gpt-4-turbo',
                    'gpt-3.5-turbo'
                ];
            case LLM_PROVIDERS.ANTHROPIC:
                return [
                    'claude-3-haiku-20240307',
                    'claude-3-5-sonnet-20241022',
                    'claude-3-opus-20240229'
                ];
            case LLM_PROVIDERS.OPENROUTER:
                return [
                    'google/gemini-flash-1.5',
                    'google/gemini-pro-1.5',
                    'openai/gpt-4o-mini',
                    'anthropic/claude-3-haiku'
                ];
            default:
                return [];
        }
    }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.LLMClient = LLMClient;
    window.LLM_PROVIDERS = LLM_PROVIDERS;
    window.DEFAULT_MODELS = DEFAULT_MODELS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLMClient, LLM_PROVIDERS, DEFAULT_MODELS };
}
