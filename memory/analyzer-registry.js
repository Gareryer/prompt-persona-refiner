/**
 * @fileoverview Analyzer Registry - LLM-Based Analyzer Management System
 * 
 * Central registry for managing LLM-powered conversation analyzers.
 * Provides a plugin-like architecture where analyzers can be registered,
 * retrieved, and managed dynamically.
 * 
 * @description
 * The Memory Architecture uses multiple analyzers to extract different types
 * of context from conversations:
 * - PersonaAnalyzer: Infers user's communication style and expertise
 * - TopicSummaryAnalyzer: Tracks conversation topics and themes
 * - UserIntentAnalyzer: Detects what the user is trying to accomplish
 * - RecentFocusAnalyzer: Identifies current conversation focus
 * 
 * This registry provides the infrastructure to:
 * 1. Register analyzers with unique IDs
 * 2. Retrieve analyzers by ID or get all registered
 * 3. Validate analyzer interface compliance
 * 4. Clear all analyzers (for testing/reset)
 * 
 * NOTE: The runOne() and runAll() methods have been DEPRECATED.
 * Analysis is now handled by UnifiedAnalyzer which makes a single LLM call
 * to extract all context types at once. This registry is kept for the
 * RecentFocus auto-refresh feature which runs independently.
 * 
 * @module memory/analyzer-registry
 * 
 * @example
 * // Register a custom analyzer
 * AnalyzerRegistry.register({
 *     id: 'my-analyzer',
 *     analyze: async (scrapedData, memory, llmClient) => {
 *         // Perform analysis...
 *         return { confidence: 0.9, data: {...} };
 *     }
 * });
 * 
 * // Check if analyzer exists
 * const analyzer = AnalyzerRegistry.getAnalyzer('my-analyzer');
 */

// ============================================================================
// LOGGER SETUP
// ============================================================================

/**
 * Structured logger for AnalyzerRegistry
 * 
 * Uses the centralized Logger if available, otherwise falls back to console.
 * All logs are tagged with [AnalyzerRegistry] for filtering.
 * 
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional data to include
 */
const arLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'AnalyzerRegistry', ...data });
    } else {
        const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        logFn(`[AnalyzerRegistry] ${msg}`, Object.keys(data).length ? data : '');
    }
};

// ============================================================================
// SECTION 1: Analyzer Interface Definition
// ============================================================================

/**
 * @typedef {Object} Analyzer
 * @description Interface that all analyzers must implement
 * 
 * @property {string} id - Unique identifier for the analyzer
 * @property {string} [name] - Human-readable name (for UI display)
 * @property {string} [description] - What this analyzer does
 * @property {Function} analyze - The analysis function
 * 
 * @example
 * const myAnalyzer = {
 *     id: 'persona',
 *     name: 'Persona Analyzer',
 *     description: 'Infers user communication style',
 *     analyze: async (scrapedData, memory, llmClient) => {
 *         return { confidence: 0.85, persona: {...} };
 *     }
 * };
 */

// ============================================================================
// SECTION 2: Registry Implementation
// ============================================================================

/**
 * AnalyzerRegistry Singleton
 * 
 * Global registry for managing LLM-powered analyzers. Uses a Map for
 * efficient O(1) lookups by analyzer ID.
 * 
 * @namespace AnalyzerRegistry
 */
const AnalyzerRegistry = {
    /**
     * Internal storage for registered analyzers
     * @private
     * @type {Map<string, Analyzer>}
     */
    _analyzers: new Map(),

    // ========================================================================
    // SECTION 2.1: Registration Methods
    // ========================================================================

    /**
     * Register a new analyzer with the registry
     * 
     * @param {Analyzer} analyzer - Analyzer object implementing the Analyzer interface
     * @returns {boolean} True if registration succeeded, false if invalid
     * 
     * @description
     * Validates that the analyzer:
     * 1. Has a non-empty 'id' property
     * 2. Has an 'analyze' function
     * 
     * If an analyzer with the same ID already exists, it will be replaced
     * (with a warning logged).
     * 
     * @example
     * const success = AnalyzerRegistry.register({
     *     id: 'topic-summary',
     *     analyze: async (data, mem, llm) => ({ topics: [...] })
     * });
     */
    register(analyzer) {
        // === INTERFACE VALIDATION ===
        // Ensure analyzer has required properties
        if (!analyzer.id || typeof analyzer.analyze !== 'function') {
            arLog('error', 'Invalid analyzer - missing id or analyze()', {
                hasId: !!analyzer.id,
                hasAnalyze: typeof analyzer.analyze === 'function'
            });
            console.error('[AnalyzerRegistry] Invalid analyzer:', analyzer);
            return false;
        }

        // === DUPLICATE CHECK ===
        // Warn if replacing an existing analyzer
        if (this._analyzers.has(analyzer.id)) {
            arLog('warn', `Replacing existing analyzer: ${analyzer.id}`);
            console.warn(`[AnalyzerRegistry] Replacing existing analyzer: ${analyzer.id}`);
        }

        // === REGISTRATION ===
        this._analyzers.set(analyzer.id, analyzer);
        arLog('info', `Registered analyzer: ${analyzer.id}`);
        console.log(`[AnalyzerRegistry] Registered: ${analyzer.id}`);
        return true;
    },

    /**
     * Unregister/remove an analyzer from the registry
     * 
     * @param {string} analyzerId - The ID of the analyzer to remove
     * @returns {boolean} True if analyzer was found and removed
     * 
     * @example
     * AnalyzerRegistry.unregister('obsolete-analyzer');
     */
    unregister(analyzerId) {
        const existed = this._analyzers.has(analyzerId);
        const deleted = this._analyzers.delete(analyzerId);

        if (deleted) {
            arLog('info', `Unregistered analyzer: ${analyzerId}`);
            console.log(`[AnalyzerRegistry] Unregistered: ${analyzerId}`);
        }

        return deleted;
    },

    // ========================================================================
    // SECTION 2.2: Retrieval Methods
    // ========================================================================

    /**
     * Get a specific analyzer by its ID
     * 
     * @param {string} analyzerId - The unique ID of the analyzer
     * @returns {Analyzer|undefined} The analyzer object, or undefined if not found
     * 
     * @example
     * const personaAnalyzer = AnalyzerRegistry.getAnalyzer('persona');
     * if (personaAnalyzer) {
     *     const result = await personaAnalyzer.analyze(data, mem, llm);
     * }
     */
    getAnalyzer(analyzerId) {
        return this._analyzers.get(analyzerId);
    },

    /**
     * Get all registered analyzers as an array
     * 
     * @returns {Analyzer[]} Array of all registered analyzer objects
     * 
     * @description
     * Returns a new array containing all analyzer objects. Safe to modify
     * as it doesn't affect the internal Map.
     * 
     * @example
     * const analyzers = AnalyzerRegistry.getAllAnalyzers();
     * console.log(`${analyzers.length} analyzers registered`);
     */
    getAllAnalyzers() {
        return Array.from(this._analyzers.values());
    },

    /**
     * Get list of all registered analyzer IDs
     * 
     * @returns {string[]} Array of analyzer ID strings
     * 
     * @description
     * Useful for logging, debugging, or iterating over registered analyzers
     * by ID without loading the full analyzer objects.
     * 
     * @example
     * console.log('Registered analyzers:', AnalyzerRegistry.getAnalyzerIds());
     */
    getAnalyzerIds() {
        return Array.from(this._analyzers.keys());
    },

    // ========================================================================
    // SECTION 2.3: Deprecated Execution Methods
    // ========================================================================
    // NOTE: runOne() and runAll() have been REMOVED from this version
    // 
    // Analysis is now handled by UnifiedAnalyzer which makes a SINGLE LLM
    // call to extract all context types at once. This is more efficient
    // and provides better context coherence.
    // 
    // These registration methods are kept for the RecentFocus auto-refresh
    // feature which still operates as an independent analyzer.
    // ========================================================================

    // ========================================================================
    // SECTION 2.4: Utility Methods
    // ========================================================================

    /**
     * Clear all registered analyzers
     * 
     * @description
     * Removes all analyzers from the registry. Used for:
     * - Testing (clean slate between tests)
     * - Extension reset/reload scenarios
     * - Debugging registration issues
     * 
     * @example
     * AnalyzerRegistry.clear();
     * console.log(AnalyzerRegistry.getAnalyzerIds()); // []
     */
    clear() {
        const count = this._analyzers.size;
        this._analyzers.clear();
        arLog('info', `Cleared ${count} analyzers`);
        console.log(`[AnalyzerRegistry] All ${count} analyzers cleared`);
    }
};

// ============================================================================
// SECTION 3: Module Exports
// ============================================================================
// Export for both browser (window) and Node.js (module.exports) environments.
// This enables the registry to be used in content scripts and unit tests.
// ============================================================================

// Browser environment - attach to window for global access
if (typeof window !== 'undefined') {
    window.AnalyzerRegistry = AnalyzerRegistry;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnalyzerRegistry };
}

// Log ready state
arLog('info', 'AnalyzerRegistry initialized');
console.log('[AnalyzerRegistry] Registry ready');
