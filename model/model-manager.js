/**
 * @fileoverview Model Manager for LLM Configuration Management
 * 
 * CRUD operations for LLM model configurations stored in chrome.storage.
 * Supports multiple providers: Gemini, OpenAI, OpenRouter, Anthropic.
 * 
 * Key Features:
 * - Model configuration create/read/update/delete
 * - Enable/disable models
 * - API key validation and connection testing
 * - Legacy format migration
 * - Cache invalidation on storage changes (B6 fix)
 * 
 * Storage Keys:
 * - pa_models: All model configurations  
 * - pa_active_model: Currently active model ID
 * 
 * @module model/model-manager
 * @requires chrome.storage
 * 
 * @example
 * const manager = new ModelManager();
 * await manager.init();
 * 
 * // Get all models
 * const models = await manager.getAllModels();
 * 
 * // Update a model
 * await manager.updateModel('gemini', { apiKey: 'new-key', enabled: true });
 * 
 * // Test connection
 * const result = await manager.testConnection('gemini');
 */

/**
 * Structured logger for model manager
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional context
 */
const modelLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'ModelManager', ...data });
    } else {
        console.log(`[ModelManager] ${msg}`, data);
    }
};

/**
 * Storage keys
 */
const MODEL_STORAGE_KEYS = {
    MODELS: 'pa_models',
    ACTIVE_MODEL: 'pa_active_model'
};

/**
 * Legacy storage keys for migration
 */
const LEGACY_STORAGE_KEYS = {
    GEMINI_API_KEY: 'geminiApiKey',
    OPENAI_API_KEY: 'openaiApiKey',
    SELECTED_MODEL: 'selectedModel',
    LLM_CONFIG: 'llm_config'
};

/**
 * ModelManager - Manages LLM model configurations
 */
class ModelManager {
    constructor() {
        this._cache = null;
        this._initialized = false;
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize the ModelManager
     * - Migrates from legacy format if needed
     * - Creates default models if first run
     * - CRITICAL: In MAIN world, don't overwrite if storage returns empty (timing issue)
     */
    async init() {
        if (this._initialized) return;

        console.log('[ModelManager] Initializing...');

        try {
            // Check if we need to migrate from legacy format
            await this._migrateFromLegacy();

            // Load or create models
            const stored = await this._getFromStorage(MODEL_STORAGE_KEYS.MODELS);

            if (!stored || Object.keys(stored).length === 0) {
                // CRITICAL FIX: In MAIN world (content script), storage may return empty
                // due to bridge timing. Don't overwrite - just use defaults in memory.
                // Options page (non-MAIN world) handles actual first-run setup.
                if (this._isMainWorld()) {
                    console.log('[ModelManager] MAIN world: Using defaults (not overwriting storage)');
                    this._cache = { ...DEFAULT_MODEL_CONFIGS };
                    // DON'T save - let Options page handle actual storage
                } else {
                    // Non-MAIN world (Options page) - safe to create defaults
                    console.log('[ModelManager] First run - creating default models');
                    await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, DEFAULT_MODEL_CONFIGS);
                    this._cache = { ...DEFAULT_MODEL_CONFIGS };
                }
            } else {
                // Ensure all default models exist
                const merged = { ...DEFAULT_MODEL_CONFIGS };
                for (const [key, config] of Object.entries(stored)) {
                    merged[key] = { ...merged[key], ...config };
                }
                this._cache = merged;
                // Only save merged config from non-MAIN world
                if (!this._isMainWorld()) {
                    await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, merged);
                }
            }

            this._initialized = true;
            console.log('[ModelManager] Initialized with', Object.keys(this._cache).length, 'models');
        } catch (error) {
            console.error('[ModelManager] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Ensure manager is initialized before operations
     */
    async _ensureInitialized() {
        if (!this._initialized) {
            await this.init();
        }
    }

    // ========================================================================
    // CRUD Operations
    // ========================================================================

    /**
     * Get all model configurations
     * @returns {Promise<Object[]>}
     */
    async getAllModels() {
        await this._ensureInitialized();
        return Object.values(this._cache).sort((a, b) => {
            // Enabled first, then alphabetically
            if (a.enabled !== b.enabled) return b.enabled ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Get a specific model configuration
     * @param {string} id - Model ID
     * @returns {Promise<Object|null>}
     */
    async getModel(id) {
        await this._ensureInitialized();

        const cached = this._cache[id];

        // CRITICAL: In MAIN world, if cached model has no API key, 
        // try to refresh from storage (timing issue workaround)
        if (cached && !cached.apiKey && this._isMainWorld()) {
            console.log('[ModelManager] getModel: Refreshing from storage (no API key in cache)');
            try {
                const freshData = await this._getFromStorage(MODEL_STORAGE_KEYS.MODELS);
                if (freshData && freshData[id] && freshData[id].apiKey) {
                    console.log('[ModelManager] getModel: Found API key in storage, updating cache');
                    // Update cache with fresh data
                    this._cache[id] = { ...DEFAULT_MODEL_CONFIGS[id], ...freshData[id] };
                    return this._cache[id];
                }
            } catch (e) {
                console.warn('[ModelManager] getModel: Failed to refresh from storage:', e);
            }
        }

        return cached || null;
    }

    /**
     * Update a model configuration
     * @param {string} id - Model ID
     * @param {Object} updates - Properties to update
     * @returns {Promise<void>}
     */
    async updateModel(id, updates) {
        modelLog('debug', '[updateModel] START', { id, updates: Object.keys(updates) });
        console.log('[ModelManager] updateModel START:', id);

        // Step 1: Ensure initialized
        modelLog('debug', '[updateModel] Ensuring initialized');
        console.log('[ModelManager] updateModel: Ensuring initialized...');
        await this._ensureInitialized();
        modelLog('debug', '[updateModel] Initialized');

        // Step 2: Validate model exists
        if (!this._cache[id]) {
            modelLog('error', '[updateModel] Model not found', { id });
            console.error('[ModelManager] updateModel: Model not found:', id);
            throw new Error(`Model ${id} does not exist`);
        }
        modelLog('debug', '[updateModel] Model exists', {
            currentName: this._cache[id].name
        });
        console.log('[ModelManager] updateModel: Model found:', this._cache[id].name);

        // Step 3: Merge updates
        modelLog('debug', '[updateModel] Merging updates');
        console.log('[ModelManager] updateModel: Merging updates...');
        this._cache[id] = {
            ...this._cache[id],
            ...updates,
            // Deep merge parameters if provided
            parameters: updates.parameters
                ? { ...this._cache[id].parameters, ...updates.parameters }
                : this._cache[id].parameters
        };
        modelLog('debug', '[updateModel] Merged', {
            updatedFields: Object.keys(updates).length
        });

        // Step 4: Save to storage
        modelLog('debug', '[updateModel] Saving to storage');
        console.log('[ModelManager] updateModel: Saving to storage...');
        await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this._cache);

        modelLog('info', '[updateModel] COMPLETE', { id });
        console.log('[ModelManager] updateModel COMPLETE:', id);
    }

    /**
     * Add a new custom model
     * @param {Object} config - Model configuration
     * @returns {Promise<string>} - New model ID
     */
    async addModel(config) {
        await this._ensureInitialized();

        // Generate unique ID for custom models
        const id = config.id || `custom_${Date.now()}`;

        if (this._cache[id]) {
            throw new Error(`Model ${id} already exists`);
        }

        // Validate required fields
        if (!config.name || !config.provider) {
            throw new Error('Name and provider are required');
        }

        this._cache[id] = {
            id,
            name: config.name,
            enabled: config.enabled ?? false,
            provider: config.provider,
            model: config.model || '',
            apiKey: config.apiKey || '',
            baseURL: config.baseURL || '',
            parameters: config.parameters || {}
        };

        await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this._cache);
        console.log('[ModelManager] Added model:', id);
        return id;
    }

    /**
     * Delete a model configuration
     * @param {string} id - Model ID
     * @returns {Promise<void>}
     */
    async deleteModel(id) {
        await this._ensureInitialized();

        // Don't allow deleting default models
        if (DEFAULT_MODEL_CONFIGS[id]) {
            throw new Error('Cannot delete default models');
        }

        if (!this._cache[id]) {
            throw new Error(`Model ${id} does not exist`);
        }

        delete this._cache[id];

        // If this was the active model, clear active
        const activeId = await this.getActiveModelId();
        if (activeId === id) {
            await this.setActiveModel(null);
        }

        await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, this._cache);
        console.log('[ModelManager] Deleted model:', id);
    }

    // ========================================================================
    // Enable / Disable
    // ========================================================================

    /**
     * Enable a model
     * @param {string} id - Model ID
     * @returns {Promise<void>}
     */
    async enableModel(id) {
        console.log(`[ModelManager] enableModel: Starting for ${id}`);
        await this.updateModel(id, { enabled: true });
        console.log(`[ModelManager] enableModel: Model ${id} updated to enabled=true`);

        // Dispatch event for SmartAutoRun to know API is now configured
        // Try chrome.runtime.sendMessage for ISOLATED world contexts
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
            try {
                console.log(`[ModelManager] enableModel: Sending LLM_CONFIG_SAVED via chrome.runtime`);
                chrome.runtime.sendMessage({
                    type: 'LLM_CONFIG_SAVED',
                    configured: true,
                    modelId: id
                });
            } catch (e) {
                console.log(`[ModelManager] enableModel: chrome.runtime.sendMessage failed`, e.message);
            }
        }

        // Also dispatch via window.postMessage for MAIN world (where SmartAutoRun listens)
        // This ensures SmartAutoRun can detect model enablement without page reload
        if (typeof window !== 'undefined') {
            console.log(`[ModelManager] enableModel: Sending LLM_CONFIG_SAVED via window.postMessage`);
            window.postMessage({
                source: 'ext-bridge',
                type: 'LLM_CONFIG_SAVED',
                payload: { configured: true, modelId: id },
                requestId: `model_enable_${Date.now()}`
            }, '*');
        }

        modelLog('info', 'Model enabled', { id });
        console.log(`[ModelManager] enableModel: Complete for ${id}`);
    }

    /**
     * Disable a model
     * @param {string} id - Model ID
     * @returns {Promise<void>}
     */
    async disableModel(id) {
        await this.updateModel(id, { enabled: false });

        // If this was the active model, switch to another enabled one
        const activeId = await this.getActiveModelId();
        if (activeId === id) {
            const enabled = await this.getEnabledModels();
            if (enabled.length > 0) {
                await this.setActiveModel(enabled[0].id);
            } else {
                await this.setActiveModel(null);
            }
        }
    }

    /**
     * Get all enabled models
     * @returns {Promise<Object[]>}
     */
    async getEnabledModels() {
        await this._ensureInitialized();
        return Object.values(this._cache).filter(m => m.enabled);
    }

    // ========================================================================
    // Active Model Selection
    // ========================================================================

    /**
     * Get the currently active model ID
     * @returns {Promise<string|null>}
     */
    async getActiveModelId() {
        const data = await this._getFromStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL);
        return data?.activeModelId || null;
    }

    /**
     * Get the currently active model configuration
     * @returns {Promise<Object|null>}
     */
    async getActiveModel() {
        const activeId = await this.getActiveModelId();
        console.log('[ModelManager] getActiveModel: activeId=', activeId);

        if (!activeId) {
            console.log('[ModelManager] getActiveModel: No active model ID set');
            return null;
        }

        const model = await this.getModel(activeId);
        if (model) {
            console.log('[ModelManager] getActiveModel: Found model', {
                id: model.id,
                name: model.name,
                provider: model.provider,
                enabled: model.enabled,
                hasApiKey: !!model.apiKey,
                apiKeyLength: model.apiKey?.length || 0
            });
        } else {
            console.log('[ModelManager] getActiveModel: Model not found for ID:', activeId);
        }
        return model;
    }

    /**
     * Set the active model
     * @param {string|null} id - Model ID or null to clear
     * @returns {Promise<void>}
     */
    async setActiveModel(id) {
        if (id) {
            const model = await this.getModel(id);
            if (!model) {
                throw new Error(`Model ${id} does not exist`);
            }
            if (!model.enabled) {
                throw new Error(`Model ${id} is not enabled`);
            }
        }

        console.log(`[ModelManager] setActiveModel: Setting active model to ${id}`);
        await this._saveToStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL, { activeModelId: id });

        // Notify SmartAutoRun in MAIN world that a model is now active
        // This triggers analysis if there's already conversation data without memory
        if (id && typeof window !== 'undefined') {
            console.log(`[ModelManager] setActiveModel: Sending LLM_CONFIG_SAVED via window.postMessage`);
            window.postMessage({
                source: 'ext-bridge',
                type: 'LLM_CONFIG_SAVED',
                payload: { configured: true, modelId: id },
                requestId: `model_active_${Date.now()}`
            }, '*');
        }

        console.log(`[ModelManager] setActiveModel: Complete - active model is now ${id}`);
    }

    /**
     * Auto-select the first enabled model if no active model
     * @returns {Promise<string|null>}
     */
    async ensureActiveModel() {
        let activeId = await this.getActiveModelId();

        if (activeId) {
            const model = await this.getModel(activeId);
            if (model && model.enabled) {
                return activeId;
            }
        }

        // Select first enabled model
        const enabled = await this.getEnabledModels();
        if (enabled.length > 0) {
            await this.setActiveModel(enabled[0].id);
            return enabled[0].id;
        }

        return null;
    }

    // ========================================================================
    // Connection Testing
    // ========================================================================

    /**
     * Test connection for a model
     * @param {string} id - Model ID
     * @returns {Promise<{success: boolean, error?: string}>}
     */
    async testConnection(id) {
        const model = await this.getModel(id);
        if (!model) {
            return { success: false, error: 'Model not found' };
        }

        if (!model.apiKey) {
            return { success: false, error: 'API key not configured' };
        }

        try {
            // Use LLMClient if available
            if (typeof LLMClient !== 'undefined') {
                const client = new LLMClient({
                    provider: model.provider,
                    apiKey: model.apiKey,
                    model: model.model
                });

                // Send a minimal test message
                await client.call('Say "OK"', {
                    maxTokens: 10,
                    temperature: 0
                });

                return { success: true };
            } else {
                // Fallback: just verify API key format
                return this._validateApiKeyFormat(model);
            }
        } catch (error) {
            console.error('[ModelManager] Connection test failed:', error);
            return {
                success: false,
                error: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Basic API key format validation
     * @private
     */
    _validateApiKeyFormat(model) {
        const key = model.apiKey;

        switch (model.provider) {
            case 'gemini':
                if (!key.startsWith('AIza')) {
                    return { success: false, error: 'Gemini API keys should start with "AIza"' };
                }
                break;
            case 'openai':
                if (!key.startsWith('sk-')) {
                    return { success: false, error: 'OpenAI API keys should start with "sk-"' };
                }
                break;
            case 'anthropic':
                if (!key.startsWith('sk-ant-')) {
                    return { success: false, error: 'Anthropic API keys should start with "sk-ant-"' };
                }
                break;
            case 'openrouter':
                if (!key.startsWith('sk-or-')) {
                    return { success: false, error: 'OpenRouter API keys should start with "sk-or-"' };
                }
                break;
        }

        return { success: true };
    }

    // ========================================================================
    // Security Utilities
    // ========================================================================

    /**
     * Mask an API key for display
     * @param {string} key - The API key
     * @returns {string} - Masked key
     */
    maskApiKey(key) {
        if (!key) return '';
        if (key.length <= 8) return '*'.repeat(key.length);

        const prefix = key.substring(0, 4);
        const suffix = key.substring(key.length - 4);
        const masked = '*'.repeat(Math.min(key.length - 8, 20));

        return `${prefix}${masked}${suffix}`;
    }

    /**
     * Check if a displayed value is a masked key
     * @param {string} value 
     * @returns {boolean}
     */
    isMaskedKey(value) {
        return value && value.includes('*');
    }

    // ========================================================================
    // Migration from Legacy Format
    // ========================================================================

    /**
     * Migrate from legacy storage format
     * @private
     */
    async _migrateFromLegacy() {
        try {
            const legacy = await this._getFromStorage([
                LEGACY_STORAGE_KEYS.GEMINI_API_KEY,
                LEGACY_STORAGE_KEYS.OPENAI_API_KEY,
                LEGACY_STORAGE_KEYS.SELECTED_MODEL,
                LEGACY_STORAGE_KEYS.LLM_CONFIG
            ]);

            if (!legacy) return;

            let migrated = false;
            const models = { ...DEFAULT_MODEL_CONFIGS };

            // Migrate Gemini API key
            if (legacy[LEGACY_STORAGE_KEYS.GEMINI_API_KEY]) {
                models.gemini.apiKey = legacy[LEGACY_STORAGE_KEYS.GEMINI_API_KEY];
                models.gemini.enabled = true;
                migrated = true;
                console.log('[ModelManager] Migrated Gemini API key');
            }

            // Migrate OpenAI API key
            if (legacy[LEGACY_STORAGE_KEYS.OPENAI_API_KEY]) {
                models.openai.apiKey = legacy[LEGACY_STORAGE_KEYS.OPENAI_API_KEY];
                models.openai.enabled = true;
                migrated = true;
                console.log('[ModelManager] Migrated OpenAI API key');
            }

            // Migrate from llm_config if present
            if (legacy[LEGACY_STORAGE_KEYS.LLM_CONFIG]) {
                const llmConfig = legacy[LEGACY_STORAGE_KEYS.LLM_CONFIG];
                if (llmConfig.provider && llmConfig.apiKey) {
                    const provider = llmConfig.provider.toLowerCase();
                    if (models[provider]) {
                        models[provider].apiKey = llmConfig.apiKey;
                        models[provider].enabled = true;
                        if (llmConfig.model) {
                            models[provider].model = llmConfig.model;
                        }
                        migrated = true;
                        console.log('[ModelManager] Migrated from llm_config:', provider);
                    }
                }
            }

            if (migrated) {
                // Save migrated data
                await this._saveToStorage(MODEL_STORAGE_KEYS.MODELS, models);

                // Set active model to first enabled
                const firstEnabled = Object.values(models).find(m => m.enabled);
                if (firstEnabled) {
                    await this._saveToStorage(MODEL_STORAGE_KEYS.ACTIVE_MODEL, {
                        activeModelId: firstEnabled.id
                    });
                }

                // Remove legacy keys
                await this._removeFromStorage([
                    LEGACY_STORAGE_KEYS.GEMINI_API_KEY,
                    LEGACY_STORAGE_KEYS.OPENAI_API_KEY,
                    LEGACY_STORAGE_KEYS.SELECTED_MODEL,
                    LEGACY_STORAGE_KEYS.LLM_CONFIG
                ]);

                console.log('[ModelManager] Migration complete');
            }
        } catch (error) {
            console.error('[ModelManager] Migration failed:', error);
            // Don't throw - continue with fresh install
        }
    }

    // ========================================================================
    // Storage Helpers (MAIN world bridge-aware)
    // ========================================================================

    /**
     * Check if we're in MAIN world (chrome.storage implies extension context)
     */
    _isMainWorld() {
        // In authorized extension contexts (background, options, sidepanel),
        // chrome.storage.local is available. In MAIN world, it's missing or restricted.
        return !(typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);
    }

    /**
     * Bridge request ID counter
     */
    static _bridgeRequestId = 0;
    static _bridgeRequests = new Map();
    static _bridgeInitialized = false;

    /**
     * Initialize bridge listener (once)
     */
    _initBridgeListener() {
        if (ModelManager._bridgeInitialized) return;
        ModelManager._bridgeInitialized = true;

        window.addEventListener('pa-storage-response', (event) => {
            const { requestId, success, data, error } = event.detail;
            const pending = ModelManager._bridgeRequests.get(requestId);
            if (pending) {
                ModelManager._bridgeRequests.delete(requestId);
                if (success) {
                    pending.resolve(data);
                } else {
                    pending.reject(new Error(error || 'Bridge request failed'));
                }
            }
        });

        // B6 FIX: Listen for storage changes to invalidate cache
        window.addEventListener('pa-storage-changed', (event) => {
            const { changes } = event.detail;
            if (changes && (changes[MODEL_STORAGE_KEYS.MODELS] || changes[MODEL_STORAGE_KEYS.ACTIVE_MODEL])) {
                console.log('[ModelManager] B6 FIX: Storage changed externally, invalidating cache');
                // Invalidate cache so next operation fetches fresh data
                if (window._modelManagerInstance) {
                    window._modelManagerInstance._cache = null;
                    window._modelManagerInstance._initialized = false;
                }
            }
        });
    }

    /**
     * Make a bridge storage request
     */
    _makeBridgeRequest(action, key, data = null, keys = null) {
        this._initBridgeListener();

        return new Promise((resolve, reject) => {
            const requestId = ++ModelManager._bridgeRequestId;

            const timeout = setTimeout(() => {
                ModelManager._bridgeRequests.delete(requestId);
                reject(new Error('Bridge request timeout'));
            }, 5000);

            ModelManager._bridgeRequests.set(requestId, {
                resolve: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });

            window.dispatchEvent(new CustomEvent('pa-storage-request', {
                detail: { action, key, keys, data, requestId }
            }));
        });
    }

    /**
     * Get data from chrome.storage.local (via bridge in MAIN world)
     * @private
     */
    async _getFromStorage(keys) {
        // Always use bridge in MAIN world
        if (this._isMainWorld()) {
            try {
                if (Array.isArray(keys)) {
                    return await this._makeBridgeRequest('get', null, null, keys);
                } else {
                    return await this._makeBridgeRequest('get', keys);
                }
            } catch (error) {
                modelLog('error', 'Bridge storage get failed', { error: error.message });
                return Array.isArray(keys) ? {} : null;
            }
        }

        // Fallback for non-MAIN world (shouldn't happen but just in case)
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get(keys, (result) => {
                    if (Array.isArray(keys)) {
                        resolve(result);
                    } else {
                        resolve(result[keys]);
                    }
                });
            } else {
                resolve(Array.isArray(keys) ? {} : null);
            }
        });
    }

    /**
     * Save data to chrome.storage.local (via bridge in MAIN world)
     * @private
     */
    async _saveToStorage(key, value) {
        // Always use bridge in MAIN world
        if (this._isMainWorld()) {
            try {
                await this._makeBridgeRequest('set', key, value);
                return;
            } catch (error) {
                modelLog('error', 'Bridge storage set failed', { error: error.message });
                throw error;
            }
        }

        // Fallback for non-MAIN world
        return new Promise((resolve, reject) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ [key]: value }, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            } else {
                reject(new Error('No storage available'));
            }
        });
    }

    /**
     * Remove data from chrome.storage.local (via bridge in MAIN world)
     * @private
     */
    async _removeFromStorage(keys) {
        // Always use bridge in MAIN world
        if (this._isMainWorld()) {
            try {
                const keyArray = Array.isArray(keys) ? keys : [keys];
                for (const key of keyArray) {
                    await this._makeBridgeRequest('remove', key);
                }
                return;
            } catch (error) {
                modelLog('error', 'Bridge storage remove failed', { error: error.message });
                return;
            }
        }

        // Fallback for non-MAIN world
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.remove(keys, resolve);
            } else {
                resolve();
            }
        });
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let _modelManagerInstance = null;

/**
 * Get the ModelManager singleton
 * @returns {ModelManager}
 */
function getModelManager() {
    if (!_modelManagerInstance) {
        _modelManagerInstance = new ModelManager();
    }
    return _modelManagerInstance;
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.ModelManager = ModelManager;
    window.getModelManager = getModelManager;
    window.MODEL_STORAGE_KEYS = MODEL_STORAGE_KEYS;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModelManager,
        getModelManager,
        MODEL_STORAGE_KEYS
    };
}
