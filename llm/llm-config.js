/**
 * @fileoverview LLM Config Manager - Model Manager Integration Layer
 * 
 * This module serves as the bridge between the Memory Layer (which needs LLM
 * capabilities) and the Model Manager (which stores user's API configurations).
 * 
 * @description
 * The LLMConfigManager provides a unified interface to:
 * 1. Load the currently active model configuration
 * 2. Create configured LLMClient instances ready for API calls
 * 3. Check if an API key is configured
 * 4. Fall back to legacy storage format for backwards compatibility
 * 
 * This abstraction allows the Memory Layer to be agnostic about where/how
 * model configurations are stored, supporting both the new ModelManager
 * system and legacy single-key storage from older extension versions.
 * 
 * @module llm/llm-config
 * @requires ModelManager - For reading model configurations
 * @requires LLMClient - For creating configured API clients
 * 
 * @example
 * // Check if LLM is configured
 * const hasKey = await llmConfigManager.isConfigured();
 * 
 * // Get a ready-to-use LLM client
 * const client = await llmConfigManager.getClient();
 * const response = await client.call("Analyze this text...");
 */

/**
 * LLMConfigManager Class
 * 
 * Singleton class that manages LLM configuration loading and client creation.
 * Abstracts the complexity of multi-provider support and legacy migration.
 * 
 * @class LLMConfigManager
 */
class LLMConfigManager {
    /**
     * Create a new LLMConfigManager instance
     * 
     * @constructor
     * @description Initializes the manager with null ModelManager reference.
     * The ModelManager is lazily loaded on first use to avoid initialization
     * order issues between modules.
     */
    constructor() {
        /** @type {ModelManager|null} Cached ModelManager reference */
        this._modelManager = null;
    }

    // ========================================================================
    // SECTION 1: ModelManager Access
    // ========================================================================

    /**
     * Get or create the ModelManager singleton instance
     * 
     * @private
     * @returns {ModelManager|null} The ModelManager instance, or null if unavailable
     * 
     * @description
     * Uses lazy initialization to get the ModelManager instance via the global
     * getModelManager() function. Returns null if ModelManager script hasn't
     * loaded yet (can happen in certain injection timing scenarios).
     */
    _getModelManager() {
        // Return cached instance if already obtained
        if (!this._modelManager) {
            // Check if getModelManager global function exists
            if (typeof getModelManager === 'function') {
                this._modelManager = getModelManager();
                console.log('[LLMConfigManager] Connected to ModelManager');
            } else {
                // ModelManager not available - will use legacy fallback
                console.warn('[LLMConfigManager] ModelManager not available, using legacy mode');
                return null;
            }
        }
        return this._modelManager;
    }

    // ========================================================================
    // SECTION 2: Configuration Loading
    // ========================================================================

    /**
     * Load the current model configuration
     * 
     * @async
     * @returns {Promise<Object>} Configuration object containing:
     *   - provider: The LLM provider name ('gemini', 'openai', etc.)
     *   - model: The specific model ID
     *   - apiKeys: Object mapping providers to their API keys
     *   - activeModelConfig: Full model config (when using ModelManager)
     * 
     * @description
     * Attempts to load configuration from ModelManager first. If ModelManager
     * is not available (older extension version or initialization timing),
     * falls back to legacy chrome.storage.local format.
     */
    async load() {
        const manager = this._getModelManager();

        // If no ModelManager, use legacy configuration loading
        if (!manager) {
            console.log('[LLMConfigManager] Loading legacy configuration...');
            return this._getLegacyConfig();
        }

        // Initialize ModelManager and get active model
        await manager.init();
        const activeModel = await manager.getActiveModel();

        // If no active model configured, return defaults
        if (!activeModel) {
            console.warn('[LLMConfigManager] No active model - returning defaults');
            return {
                provider: 'gemini',
                model: 'gemini-2.0-flash-exp',
                apiKeys: {}
            };
        }

        // Return normalized configuration object
        console.log(`[LLMConfigManager] Loaded config for: ${activeModel.name}`);
        return {
            provider: activeModel.provider,
            model: activeModel.model,
            apiKeys: {
                [activeModel.provider]: activeModel.apiKey
            },
            // Include full config for advanced usage (parameters, etc.)
            activeModelConfig: activeModel
        };
    }

    // ========================================================================
    // SECTION 3: MAIN World Bridge Communication
    // ========================================================================
    // In MAIN world, we cannot directly access chrome.storage, so we use
    // the extension bridge (pa-storage-request/pa-storage-response events).
    // ========================================================================

    /**
     * Make a storage request via the extension bridge
     * 
     * @private
     * @param {string} action - Storage action ('get', 'set', 'remove')
     * @param {string[]} keys - Storage keys to operate on
     * @returns {Promise<*>} The storage operation result
     * @throws {Error} If bridge times out or returns an error
     * 
     * @description
     * Creates a CustomEvent to request storage access from the extension bridge
     * (which runs in ISOLATED world and has chrome.storage access). Uses a
     * request/response pattern with unique IDs for correlation.
     */
    _makeBridgeRequest(action, keys) {
        return new Promise((resolve, reject) => {
            // Generate unique request ID for response correlation
            const requestId = `llm_conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            /**
             * Response handler - matches responses to this specific request
             * @param {CustomEvent} event - The pa-storage-response event
             */
            const handler = (event) => {
                const { requestId: resId, success, data, error } = event.detail || {};

                // Only process responses matching our request ID
                if (resId === requestId) {
                    // Clean up listener immediately
                    window.removeEventListener('pa-storage-response', handler);

                    if (success) {
                        resolve(data);
                    } else {
                        reject(new Error(error || 'Bridge request failed'));
                    }
                }
            };

            // Register response listener before sending request
            window.addEventListener('pa-storage-response', handler);

            // Dispatch storage request to extension bridge
            window.dispatchEvent(new CustomEvent('pa-storage-request', {
                detail: { action, keys, requestId }
            }));

            // Timeout after 2 seconds - config loads should be fast
            setTimeout(() => {
                window.removeEventListener('pa-storage-response', handler);
                reject(new Error('Bridge timeout - extension may need reload'));
            }, 2000);
        });
    }

    /**
     * Load configuration from legacy storage format
     * 
     * @private
     * @async
     * @returns {Promise<Object>} Legacy configuration normalized to current format
     * 
     * @description
     * Supports the original extension storage format that used:
     * - geminiApiKey: The Gemini API key
     * - selectedModel: The model ID string
     * 
     * This enables backwards compatibility during migration to the new
     * ModelManager system.
     */
    async _getLegacyConfig() {
        try {
            let result;

            // Check if we have direct chrome.storage access (ISOLATED world, Options page)
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                // Direct storage access available
                result = await chrome.storage.local.get(['geminiApiKey', 'selectedModel']);
                console.log('[LLMConfigManager] Loaded legacy config via direct storage');
            } else {
                // MAIN world - use bridge for storage access
                result = await this._makeBridgeRequest('get', ['geminiApiKey', 'selectedModel']);
                console.log('[LLMConfigManager] 🌉 Loaded legacy config via bridge');
            }

            // Return empty config if storage was empty
            if (!result) {
                return { provider: 'gemini', model: 'gemini-2.0-flash-exp', apiKeys: {} };
            }

            // Normalize legacy format to current structure
            return {
                provider: 'gemini',  // Legacy only supported Gemini
                model: result.selectedModel || 'gemini-2.0-flash-exp',
                apiKeys: {
                    gemini: result.geminiApiKey || ''
                }
            };
        } catch (e) {
            // Log warning but don't fail - return defaults
            console.warn('[LLMConfigManager] Legacy config load failed:', e.message);
            return { provider: 'gemini', model: 'gemini-2.0-flash-exp', apiKeys: {} };
        }
    }

    // ========================================================================
    // SECTION 4: API Key Access
    // ========================================================================

    /**
     * Get the API key for a specific provider
     * 
     * @async
     * @param {string} provider - Provider name ('gemini', 'openai', 'anthropic', 'openrouter')
     * @returns {Promise<string>} The API key, or empty string if not configured
     * 
     * @description
     * Searches through all configured models to find an enabled one matching
     * the requested provider, then returns its API key.
     */
    async getApiKey(provider) {
        const manager = this._getModelManager();

        // No ModelManager - cannot get provider-specific key
        if (!manager) {
            console.warn(`[LLMConfigManager] Cannot get ${provider} key - no ModelManager`);
            return '';
        }

        // Initialize and search for matching model
        await manager.init();
        const models = await manager.getAllModels();

        // Find first enabled model for this provider
        const model = models.find(m => m.provider === provider && m.enabled);

        if (model) {
            console.log(`[LLMConfigManager] Found API key for ${provider}`);
            return model.apiKey;
        }

        console.warn(`[LLMConfigManager] No enabled ${provider} model found`);
        return '';
    }

    // ========================================================================
    // SECTION 5: LLM Client Creation
    // ========================================================================

    /**
     * Get a fully configured LLMClient instance
     * 
     * @async
     * @returns {Promise<LLMClient>} Ready-to-use LLM client instance
     * 
     * @description
     * This is the primary method for obtaining an LLM client. It:
     * 1. Loads the active model configuration
     * 2. Creates an LLMClient with proper credentials
     * 3. Passes through any custom parameters (temperature, maxTokens)
     * 
     * Returns a client even if unconfigured (for graceful degradation).
     * 
     * @example
     * const client = await llmConfigManager.getClient();
     * if (client.isConfigured()) {
     *     const response = await client.call("Hello!");
     * }
     */
    async getClient() {
        const manager = this._getModelManager();

        // Fallback to legacy config if no ModelManager
        if (!manager) {
            console.log('[LLMConfigManager] Creating client from legacy config...');
            const config = await this._getLegacyConfig();
            return new LLMClient({
                provider: config.provider,
                apiKey: config.apiKeys[config.provider] || '',
                model: config.model
            });
        }

        // Load active model from ModelManager
        await manager.init();
        const activeModel = await manager.getActiveModel();

        // Return unconfigured client if no active model
        if (!activeModel) {
            console.warn('[LLMConfigManager] No active model - returning unconfigured client');
            return new LLMClient({
                provider: 'gemini',
                apiKey: '',
                model: 'gemini-2.0-flash-exp'
            });
        }

        // Log which model we're using
        console.log(`[LLMConfigManager] 🤖 Creating client: ${activeModel.name} (${activeModel.model})`);

        // Create client with full configuration including advanced parameters
        return new LLMClient({
            provider: activeModel.provider,
            apiKey: activeModel.apiKey,
            model: activeModel.model,
            // Pass through optional parameters if configured
            temperature: activeModel.parameters?.temperature,
            maxTokens: activeModel.parameters?.maxOutputTokens || activeModel.parameters?.max_tokens
        });
    }

    // ========================================================================
    // SECTION 6: Configuration Status
    // ========================================================================

    /**
     * Check if an API key is configured for the active model
     * 
     * @async
     * @returns {Promise<boolean>} True if API key exists and is non-empty
     * 
     * @description
     * Quick check to determine if the extension has been configured with
     * valid API credentials. Used to show/hide UI elements and prevent
     * unnecessary API calls.
     */
    async isConfigured() {
        const manager = this._getModelManager();

        // Check legacy config if no ModelManager
        if (!manager) {
            const config = await this._getLegacyConfig();
            const hasKey = !!(config.apiKeys[config.provider]);
            console.log(`[LLMConfigManager] Legacy config check: ${hasKey ? 'configured' : 'not configured'}`);
            return hasKey;
        }

        // Check active model for API key
        await manager.init();
        const activeModel = await manager.getActiveModel();
        const hasKey = !!(activeModel?.apiKey);
        console.log(`[LLMConfigManager] Config check: ${hasKey ? 'configured' : 'not configured'}`);
        return hasKey;
    }

    /**
     * Get the full active model configuration object
     * 
     * @async
     * @returns {Promise<Object|null>} Full model config object, or null if not available
     * 
     * @description
     * Returns the complete model configuration including all parameters,
     * useful for displaying model details in the UI or for advanced use cases.
     */
    async getActiveModelConfig() {
        const manager = this._getModelManager();

        if (!manager) {
            console.warn('[LLMConfigManager] Cannot get model config - no ModelManager');
            return null;
        }

        await manager.init();
        return await manager.getActiveModel();
    }

    // ========================================================================
    // SECTION 7: Deprecated Methods
    // ========================================================================

    /**
     * Set the active provider (DEPRECATED)
     * 
     * @deprecated Since v2.0 - Use Model Manager UI instead
     * @async
     * @param {string} provider - Provider name
     * @param {string} model - Model ID (unused)
     * 
     * @description
     * This method is kept for backwards compatibility but should not be used.
     * Model selection should be done through the Options page Model Manager UI.
     */
    async setActiveProvider(provider, model) {
        console.warn('[LLMConfigManager] setActiveProvider() is DEPRECATED - use Model Manager UI');

        const manager = this._getModelManager();
        if (!manager) return;

        // Find and activate the matching model
        await manager.init();
        const models = await manager.getAllModels();
        const targetModel = models.find(m => m.provider === provider);

        if (targetModel) {
            await manager.enableModel(targetModel.id);
            await manager.setActiveModel(targetModel.id);
            console.log(`[LLMConfigManager] Activated ${provider} model: ${targetModel.name}`);
        }
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
// Create a single shared instance for use throughout the extension.
// This ensures consistent state across all modules.
// ============================================================================

/** @type {LLMConfigManager} Singleton instance */
const llmConfigManager = new LLMConfigManager();

// ============================================================================
// MODULE EXPORTS
// ============================================================================
// Export for both browser (window) and Node.js (module.exports) environments.
// ============================================================================

// Browser environment - attach to window object
if (typeof window !== 'undefined') {
    window.LLMConfigManager = LLMConfigManager;
    window.llmConfigManager = llmConfigManager;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLMConfigManager, llmConfigManager };
}

// Log ready state
console.log('[LLMConfigManager] Model Manager integration ready');
