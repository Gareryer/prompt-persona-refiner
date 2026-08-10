/**
 * ============================================================================
 * MEMORY CONTROLLER - Per-Session Storage Manager
 * ============================================================================
 * 
 * Manages persistent memory storage for a single chat session.
 * Each MemoryController instance is bound to a specific session ID
 * derived from the Gemini URL (e.g., "e05784e5eae72133").
 * 
 * Storage: chrome.storage.local (persistent across browser restarts)
 * Isolation: Each session has its own namespace ("session_{id}")
 * 
 * ============================================================================
 * USAGE
 * ============================================================================
 * 
 * const sessionId = MemoryController.extractSessionId(window.location.href);
 * const memory = new MemoryController(sessionId);
 * 
 * // Load existing memory (or initialize empty)
 * await memory.load();
 * 
 * // Set a component (from analyzer output)
 * await memory.setComponent('context', {
 *   type: 'coding',
 *   goal: 'Build a REST API'
 * });
 * 
 * // Get a component
 * const context = await memory.getComponent('context');
 * 
 * // Get all components as unified context
 * const context = await memory.getUnifiedContext();
 * 
 * ============================================================================
 */

/**
 * Storage schema version for migrations
 * v1: Original 6-component schema
 * v2: 7-dimension industry standard schema (persona, context, exemplar, format, tone, framework, constraints)
 */
const MEMORY_SCHEMA_VERSION = 2;

/**
 * Dimension names for 7-dimension schema
 */
const DIMENSION_NAMES = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'];

// Note: Legacy component names removed - using 7-dimension schema only

/**
 * Storage key prefix for session data
 */
const SESSION_KEY_PREFIX = 'session_';

/**
 * Memory size limits (in bytes)
 * Chrome storage.local has 5MB default limit (10MB with unlimitedStorage)
 */
const MEMORY_SIZE_LIMITS = {
    maxSessionSize: 500 * 1024,       // 500KB per session
    maxComponentSize: 50 * 1024,      // 50KB per component
    maxStringFieldSize: 10 * 1024,    // 10KB per string field
    warningThreshold: 0.8             // Warn at 80% capacity
};

// Logger helper for MemoryController
const memCtrlLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'MemoryController', ...data });
    } else {
        console.log(`[MemoryController] ${msg}`, data);
    }
};

/**
 * MemoryController - Per-session storage manager
 */
class MemoryController {
    /**
     * @param {string} sessionId - Unique session identifier from URL
     */
    constructor(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') {
            throw new Error('[MemoryController] Invalid sessionId');
        }

        this.sessionId = sessionId;
        this.storageKey = `${SESSION_KEY_PREFIX}${sessionId}`;
        this._cache = null; // In-memory cache for performance
    }

    // ========================================================================
    // Static Utilities
    // ========================================================================

    /**
     * Extract session ID from Gemini URL
     * @param {string} url - Full URL (e.g., "https://gemini.google.com/app/e05784e5eae72133")
     * @returns {string|null} Session ID or null if not found
     */
    static extractSessionId(url) {
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/').filter(Boolean);

            // Expected format: /app/{sessionId}
            if (pathParts.length >= 2 && pathParts[0] === 'app') {
                return pathParts[1];
            }

            // Fallback: last path segment
            if (pathParts.length > 0) {
                return pathParts[pathParts.length - 1];
            }

            return null;
        } catch (e) {
            console.error('[MemoryController] Failed to extract session ID:', e);
            return null;
        }
    }

    /**
     * Check if running in Chrome extension context
     * Note: We always use bridge in MAIN world now
     * @returns {boolean}
     */
    static isExtensionContext() {
        // Always return true since we use bridge for MAIN world
        return true;
    }

    // ========================================================================
    // Bridge Storage (for MAIN world compatibility)
    // ========================================================================

    static _bridgeRequestId = 0;
    static _bridgeRequests = new Map();
    static _bridgeInitialized = false;

    /**
     * Initialize bridge listener (once)
     */
    static _initBridgeListener() {
        if (MemoryController._bridgeInitialized) return;
        MemoryController._bridgeInitialized = true;

        window.addEventListener('pa-storage-response', (event) => {
            const { requestId, success, data, error } = event.detail;
            const pending = MemoryController._bridgeRequests.get(requestId);
            if (pending) {
                MemoryController._bridgeRequests.delete(requestId);
                if (success) {
                    pending.resolve(data);
                } else {
                    pending.reject(new Error(error || 'Bridge request failed'));
                }
            }
        });
    }

    /**
     * Make a bridge storage request
     */
    static _makeBridgeRequest(action, key, data = null) {
        MemoryController._initBridgeListener();

        return new Promise((resolve, reject) => {
            const requestId = ++MemoryController._bridgeRequestId;

            const timeout = setTimeout(() => {
                MemoryController._bridgeRequests.delete(requestId);
                reject(new Error('Bridge request timeout'));
            }, 5000);

            MemoryController._bridgeRequests.set(requestId, {
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
                detail: { action, key, data, requestId }
            }));
        });
    }

    // ========================================================================
    // Core Operations
    // ========================================================================

    /**
     * Load session memory from storage (via bridge)
     * @returns {Promise<SessionMemory>}
     */
    async load() {
        try {
            const result = await MemoryController._makeBridgeRequest('get', this.storageKey);

            if (result) {
                this._cache = result;
                console.log(`[MemoryController] Loaded session: ${this.sessionId}`);
                return this._cache;
            }

            // Initialize new session memory
            this._cache = this._getEmptyMemory();
            await this.save();
            console.log(`[MemoryController] Initialized new session: ${this.sessionId}`);
            return this._cache;

        } catch (e) {
            console.error('[MemoryController] Load failed:', e);
            return this._getEmptyMemory();
        }
    }

    /**
     * Save current memory state to storage (via bridge)
     * @returns {Promise<void>}
     */
    async save() {
        if (!this._cache) {
            console.warn('[MemoryController] No cache to save');
            return;
        }

        try {
            this._cache.lastUpdated = Date.now();
            await MemoryController._makeBridgeRequest('set', this.storageKey, this._cache);
            console.log(`[MemoryController] Saved session: ${this.sessionId}`);
        } catch (e) {
            console.error('[MemoryController] Save failed:', e);
        }
    }

    /**
     * Get a specific component by analyzer ID
     * @param {string} analyzerId - Analyzer identifier (e.g., "persona")
     * @returns {Promise<ComponentData|null>}
     */
    async getComponent(analyzerId) {
        if (!this._cache) {
            await this.load();
        }

        return this._cache.components[analyzerId] || null;
    }

    /**
     * Set/update a component with intelligent merge
     * @param {string} analyzerId - Analyzer identifier
     * @param {Object} data - New analysis output
     * @returns {Promise<void>}
     */
    /**
     * Set/update a component with intelligent merge and generation tracking
     * @param {string} analyzerId - Analyzer identifier
     * @param {Object} data - New analysis output
     * @param {Object} options - Optional settings
     * @param {number} options.generation - Override generation (defaults to current)
     * @returns {Promise<void>}
     */
    async setComponent(analyzerId, data, options = {}) {
        memCtrlLog('debug', `[setComponent] START: ${analyzerId}`, {
            dataKeys: Object.keys(data || {}),
            hasOptions: Object.keys(options).length > 0
        });
        console.log(`[MemoryController] setComponent START: ${analyzerId}`);

        // Step 1: Cache check
        if (!this._cache) {
            memCtrlLog('debug', '[setComponent] Loading cache (was null)');
            console.log(`[MemoryController] setComponent: Loading cache...`);
            await this.load();
        }
        memCtrlLog('debug', '[setComponent] Cache ready');

        // Step 2: Schema validation
        if (typeof ComponentSchemas !== 'undefined') {
            memCtrlLog('debug', '[setComponent] Validating against schema');
            console.log(`[MemoryController] setComponent: Validating schema for ${analyzerId}`);
            const validation = ComponentSchemas.validate(analyzerId, data);
            if (!validation.valid) {
                memCtrlLog('warn', `[setComponent] Schema validation failed: ${analyzerId}`, {
                    errors: validation.errors,
                    componentId: analyzerId
                });
                console.warn(`[MemoryController] Schema validation failed for ${analyzerId}:`, validation.errors);
            } else {
                memCtrlLog('debug', '[setComponent] Schema validation passed');
                console.log(`[MemoryController] setComponent: Schema valid for ${analyzerId}`);
            }
        }

        // Step 3: Sanitize data
        memCtrlLog('debug', '[setComponent] Sanitizing data');
        console.log(`[MemoryController] setComponent: Sanitizing data for ${analyzerId}`);
        const sanitizedData = this._sanitizeComponentData(data);
        memCtrlLog('debug', '[setComponent] Data sanitized', {
            originalKeys: Object.keys(data || {}).length,
            sanitizedKeys: Object.keys(sanitizedData || {}).length
        });

        // Step 4: Check for existing component
        const existing = this._cache.components[analyzerId];
        const generation = options.generation ?? this._cache.currentGeneration ?? 0;
        memCtrlLog('debug', '[setComponent] Checking existing', {
            hasExisting: !!existing,
            generation
        });
        console.log(`[MemoryController] setComponent: Existing=${!!existing}, Gen=${generation}`);

        if (existing) {
            // Step 5a: Merge with existing
            memCtrlLog('debug', '[setComponent] Merging with existing component');
            console.log(`[MemoryController] setComponent: Merging existing history for ${analyzerId}`);
            const historyLength = (existing.history || []).length;
            this._cache.components[analyzerId] = {
                current: sanitizedData,
                history: [
                    ...(existing.history || []),
                    { data: existing.current, timestamp: existing.updatedAt }
                ].slice(-5),
                confidence: Math.min(1, (existing.confidence || 0.5) + 0.1),
                updatedAt: Date.now(),
                generation: generation
            };
            memCtrlLog('debug', '[setComponent] Merged', {
                prevHistoryLen: historyLength,
                newHistoryLen: this._cache.components[analyzerId].history.length,
                confidence: this._cache.components[analyzerId].confidence
            });
            console.log(`[MemoryController] setComponent: Merged with ${historyLength} history items`);
        } else {
            // Step 5b: Create new component
            memCtrlLog('debug', `[setComponent] ➕ Creating new component`);
            console.log(`[MemoryController] setComponent: Creating new component for ${analyzerId}`);
            this._cache.components[analyzerId] = {
                current: sanitizedData,
                history: [],
                confidence: 0.5,
                updatedAt: Date.now(),
                generation: generation
            };
            memCtrlLog('debug', '[setComponent] New component created');
        }

        // Step 6: Save to storage
        memCtrlLog('debug', '[setComponent] Saving to storage');
        console.log(`[MemoryController] setComponent: Saving ${analyzerId} to storage...`);
        await this.save();
        memCtrlLog('debug', `[setComponent] COMPLETE: ${analyzerId}`);
        console.log(`[MemoryController] setComponent COMPLETE: ${analyzerId}`);
    }

    /**
     * Increment generation counter (called before selective rebuild)
     * @returns {Promise<number>} New generation number
     */
    async incrementGeneration() {
        if (!this._cache) {
            await this.load();
        }

        this._cache.currentGeneration = (this._cache.currentGeneration || 0) + 1;
        memCtrlLog('info', 'Generation incremented', {
            sessionId: this.sessionId,
            generation: this._cache.currentGeneration
        });
        await this.save();
        return this._cache.currentGeneration;
    }

    /**
     * Get current generation number
     * @returns {Promise<number>}
     */
    async getCurrentGeneration() {
        if (!this._cache) {
            await this.load();
        }
        return this._cache.currentGeneration || 0;
    }

    /**
     * Get component generation number
     * @param {string} analyzerId
     * @returns {Promise<number|null>}
     */
    async getComponentGeneration(analyzerId) {
        if (!this._cache) {
            await this.load();
        }
        const component = this._cache.components[analyzerId];
        return component?.generation ?? null;
    }

    /**
     * Check if component is current (matches current generation)
     * @param {string} analyzerId
     * @returns {Promise<boolean>}
     */
    async isComponentCurrent(analyzerId) {
        if (!this._cache) {
            await this.load();
        }
        const component = this._cache.components[analyzerId];
        if (!component) return false;
        return component.generation === this._cache.currentGeneration;
    }

    // ========================================================================
    // Persona Pinning Methods
    // ========================================================================

    /**
     * Pin the current persona to prevent automatic updates
     * When pinned, persona won't be overwritten by SmartAutoRun or Rebuild Memory
     * @returns {Promise<void>}
     */
    async pinPersona() {
        if (!this._cache) {
            await this.load();
        }

        const personaComponent = this._cache.components.persona;
        if (!personaComponent?.current) {
            memCtrlLog('warn', 'Cannot pin persona: No persona data exists');
            return;
        }

        // Store pinned flag and copy current data to pinnedData
        personaComponent.pinned = true;
        personaComponent.pinnedData = { ...personaComponent.current };
        personaComponent.pinnedAt = Date.now();

        // Also update in canonical location (new 'persona' key)
        this._cache.components.persona = personaComponent;

        memCtrlLog('info', 'Persona pinned', {
            sessionId: this.sessionId,
            persona: (personaComponent.pinnedData.role || personaComponent.pinnedData.synthesizedPersona || '').substring(0, 50) + '...'
        });

        await this.save();
    }

    /**
     * Unpin persona to allow automatic updates again
     * @returns {Promise<void>}
     */
    async unpinPersona() {
        if (!this._cache) {
            await this.load();
        }

        const personaComponent = this._cache.components.persona;
        if (personaComponent) {
            personaComponent.pinned = false;
            delete personaComponent.pinnedData;
            delete personaComponent.pinnedAt;

            // Ensure canonical location is updated
            this._cache.components.persona = personaComponent;

            memCtrlLog('info', 'Persona unpinned', { sessionId: this.sessionId });
            await this.save();
        }
    }

    /**
     * Check if persona is currently pinned
     * @returns {Promise<boolean>}
     */
    async isPersonaPinned() {
        if (!this._cache) {
            await this.load();
        }
        return (this._cache.components.persona?.pinned?.pinned) === true;
    }

    /**
     * Get the effective persona (pinned or current)
     * @returns {Promise<Object|null>}
     */
    async getEffectivePersona() {
        if (!this._cache) {
            await this.load();
        }

        const personaComponent = this._cache.components.persona;
        if (!personaComponent) return null;

        // Return pinned data if pinned, otherwise return current
        if (personaComponent.pinned && personaComponent.pinnedData) {
            return personaComponent.pinnedData;
        }
        return personaComponent.current || null;
    }

    /**
     * Update pinned persona data (when user edits pinned persona)
     * @param {Object} data - New persona data
     * @returns {Promise<void>}
     */
    async updatePinnedPersona(data) {
        if (!this._cache) {
            await this.load();
        }

        const personaComponent = this._cache.components.persona;
        if (!personaComponent?.pinned) {
            memCtrlLog('warn', 'Cannot update pinned persona: Persona is not pinned');
            return;
        }

        personaComponent.pinnedData = {
            ...personaComponent.pinnedData,
            ...data,
            updatedAt: Date.now()
        };

        // Ensure canonical location is updated
        this._cache.components.persona = personaComponent;

        memCtrlLog('info', 'Pinned persona updated', { sessionId: this.sessionId });
        await this.save();
    }

    // ========================================================================
    // Generic Component Pinning Methods
    // ========================================================================

    /**
     * Pin any component to prevent automatic updates during Rebuild Memory
     * Pinned components show VERBATIM badge and are excluded from analysis
     * 
     * @param {string} componentId - Component identifier (persona, context, tone, etc.)
     * @returns {Promise<boolean>} True if successfully pinned
     */
    async pinComponent(componentId) {
        if (!this._cache) {
            await this.load();
        }

        const component = this._cache.components[componentId];
        if (!component?.current) {
            memCtrlLog('warn', `Cannot pin ${componentId}: No data exists`);
            return false;
        }

        // Store pinned flag and preserve current data
        component.pinned = true;
        component.pinnedData = { ...component.current };
        component.pinnedAt = Date.now();

        memCtrlLog('info', `Component pinned: ${componentId}`, { sessionId: this.sessionId });
        await this.save();
        return true;
    }

    /**
     * Unpin a component to allow automatic updates again
     * 
     * @param {string} componentId - Component identifier
     * @returns {Promise<boolean>} True if successfully unpinned
     */
    async unpinComponent(componentId) {
        if (!this._cache) {
            await this.load();
        }

        const component = this._cache.components[componentId];
        if (!component) {
            memCtrlLog('warn', `Cannot unpin ${componentId}: Component not found`);
            return false;
        }

        component.pinned = false;
        delete component.pinnedData;
        delete component.pinnedAt;

        memCtrlLog('info', `Component unpinned: ${componentId}`, { sessionId: this.sessionId });
        await this.save();
        return true;
    }

    /**
     * Check if a component is currently pinned
     * 
     * @param {string} componentId - Component identifier
     * @returns {Promise<boolean>} True if pinned
     */
    async isComponentPinned(componentId) {
        if (!this._cache) {
            await this.load();
        }
        return this._cache.components[componentId]?.pinned === true;
    }

    /**
     * Get effective component data (pinned or current)
     * 
     * @param {string} componentId - Component identifier
     * @returns {Promise<Object|null>} Component data
     */
    async getEffectiveComponent(componentId) {
        if (!this._cache) {
            await this.load();
        }

        const component = this._cache.components[componentId];
        if (!component) return null;

        // Return pinned data if pinned, otherwise return current
        if (component.pinned && component.pinnedData) {
            return component.pinnedData;
        }
        return component.current || null;
    }

    /**
     * Get all components as unified context
     * @returns {Promise<UnifiedContext>}
     */
    async getUnifiedContext() {
        if (!this._cache) {
            await this.load();
        }

        const context = {
            sessionId: this.sessionId,
            retrievedAt: Date.now(),
            components: {}
        };

        // Extract current state from each component
        for (const [analyzerId, componentData] of Object.entries(this._cache.components)) {
            context.components[analyzerId] = {
                data: componentData.current,
                confidence: componentData.confidence,
                updatedAt: componentData.updatedAt,
                generation: componentData.generation
            };
        }

        return context;
    }

    /**
     * Check if any components exist
     * @returns {Promise<boolean>}
     */
    async hasContext() {
        if (!this._cache) {
            await this.load();
        }

        return Object.keys(this._cache.components).length > 0;
    }

    /**
     * Clear all memory for this session
     * @returns {Promise<void>}
     */
    async clear() {
        try {
            await MemoryController._makeBridgeRequest('remove', this.storageKey);
            this._cache = null;
            console.log(`[MemoryController] Cleared session: ${this.sessionId}`);
        } catch (e) {
            console.error('[MemoryController] Clear failed:', e);
        }
    }

    // ========================================================================
    // Internal Helpers
    // ========================================================================

    /**
     * Create empty session memory structure
     * @returns {SessionMemory}
     */
    _getEmptyMemory() {
        return {
            version: MEMORY_SCHEMA_VERSION,
            sessionId: this.sessionId,
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            currentGeneration: 0, // Generation tracking for selective rebuild
            components: {}
        };
    }

    /**
     * Estimate byte size of an object
     * @param {any} obj
     * @returns {number}
     */
    _estimateSize(obj) {
        try {
            return new Blob([JSON.stringify(obj)]).size;
        } catch {
            // Fallback: rough estimate
            return JSON.stringify(obj).length * 2;
        }
    }

    /**
     * Truncate string to fit byte limit
     * @param {string} str
     * @param {number} maxBytes
     * @returns {string}
     */
    _truncateString(str, maxBytes) {
        if (!str || typeof str !== 'string') return str;

        const encoder = new TextEncoder();
        const bytes = encoder.encode(str);

        if (bytes.length <= maxBytes) return str;

        // Binary search for the right truncation point
        let low = 0, high = str.length;
        while (low < high) {
            const mid = Math.floor((low + high + 1) / 2);
            if (encoder.encode(str.slice(0, mid)).length <= maxBytes - 3) {
                low = mid;
            } else {
                high = mid - 1;
            }
        }

        return str.slice(0, low) + '...';
    }

    /**
     * Sanitize component data to fit size limits
     * @param {Object} data
     * @returns {Object}
     */
    _sanitizeComponentData(data) {
        if (!data || typeof data !== 'object') return data;

        // Check if this is a char-array (LLM bug: {0:'T', 1:'h', ...})
        if (this._isCharArray(data)) {
            console.log('[MemoryController] Detected char-array bug, converting to string');
            return Object.values(data).join('');
        }

        const sanitized = {};

        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                sanitized[key] = this._truncateString(value, MEMORY_SIZE_LIMITS.maxStringFieldSize);
            } else if (Array.isArray(value)) {
                // Limit arrays to prevent unbounded growth
                sanitized[key] = value.slice(0, 50).map(item =>
                    typeof item === 'string'
                        ? this._truncateString(item, MEMORY_SIZE_LIMITS.maxStringFieldSize / 10)
                        : item
                );
            } else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects (also handles char-arrays)
                sanitized[key] = this._sanitizeComponentData(value);
            } else {
                sanitized[key] = value;
            }
        }

        // Final size check
        const size = this._estimateSize(sanitized);
        if (size > MEMORY_SIZE_LIMITS.maxComponentSize) {
            console.warn(`[MemoryController] Component data truncated from ${size} to limit`);
            // Remove non-essential fields if still too large
            delete sanitized.history;
            delete sanitized.metadata;
        }

        return sanitized;
    }

    /**
     * Detect char-array objects (LLM bug where strings become {0:'T', 1:'h', ...})
     * @param {Object} obj - Object to check
     * @returns {boolean} True if this looks like a char-array
     */
    _isCharArray(obj) {
        if (typeof obj !== 'object' || obj === null) return false;
        if (Array.isArray(obj)) return false;

        const keys = Object.keys(obj);
        if (keys.length === 0) return false;

        // Check if all keys are numeric indices (0, 1, 2, ...)
        const isNumericKeys = keys.every(k => /^\d+$/.test(k));
        if (!isNumericKeys) return false;

        // Check if all values are single characters
        const values = Object.values(obj);
        const isSingleChars = values.every(v => typeof v === 'string' && v.length === 1);

        return isSingleChars && keys.length > 10; // Only fix if it looks like a string (>10 chars)
    }

    /**
     * Check storage quota usage
     * @returns {Promise<{used: number, total: number, percentage: number}>}
     */
    async getStorageUsage() {
        try {
            // Note: getBytesInUse isn't supported by our simple bridge
            // so we'll approximate by getting the data string length
            const data = await MemoryController._makeBridgeRequest('get', this.storageKey);

            let usage = 0;
            if (data) {
                usage = JSON.stringify(data).length;
            }

            const total = 5 * 1024 * 1024; // 5MB default limit (approx)
            return {
                used: usage,
                total,
                percentage: (usage / total) * 100
            };
        } catch {
            return { used: 0, total: 0, percentage: 0 };
        }
    }
}

// ============================================================================
// Exports
// ============================================================================

// Make available globally (for content scripts in MAIN world)
if (typeof window !== 'undefined') {
    window.MemoryController = MemoryController;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MemoryController, MEMORY_SCHEMA_VERSION, SESSION_KEY_PREFIX };
}
