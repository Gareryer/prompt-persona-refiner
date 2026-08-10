/**
 * @fileoverview Memory Layer Entry Point for Prompt Assistant Extension
 * 
 * Central orchestrator for the Memory Architecture Layer.
 * Coordinates LLM-powered analysis of conversation context.
 * 
 * Key Components:
 * - MemoryController: Per-session storage management
 * - ContextAssembler: Unified context formatting
 * - SmartAutoRun: Intelligent auto-analysis triggering
 * - Analysis mutex to prevent overlapping runs (B4 fix)
 * 
 * Schema v3 (7-Dimension Industry Standard):
 * - persona, context, exemplar, format, tone, framework, constraints
 * 
 * Analyzers Registered:
 * - UnifiedAnalyzer: Combined analysis for all 7 dimensions
 * - RecentFocus: Current conversation focus tracking (legacy)
 * 
 * @module memory
 * @requires MemoryController
 * @requires ContextAssembler
 * @requires llmConfigManager
 * 
 * @example
 * // Full analysis with LLM
 * const result = await analyzeSession(window.location.href);
 * 
 * // Access unified context
 * const contextString = await result.context.formatForRefinement();
 */

/**
 * Structured logger for memory layer
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional context
 */
const memLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'Memory', ...data });
    } else {
        console.log(`[Memory] ${msg}`, data);
    }
};

memLog('info', 'Loading Memory Architecture Layer...');

// ============================================================================
// Register all analyzers on load
// ============================================================================

(function initializeAnalyzers() {
    if (typeof AnalyzerRegistry === 'undefined') {
        memLog('warn', 'AnalyzerRegistry not loaded');
        return;
    }

    // Register only RecentFocus for auto-refresh feature (every N refinements)
    // Main analysis uses UnifiedAnalyzer (single LLM call for all 6 components)
    if (typeof RecentFocus !== 'undefined') {
        AnalyzerRegistry.register(RecentFocus);
        memLog('info', 'Registered RecentFocus for auto-refresh (unified mode active)');
    }
})();

// ============================================================================
// Convenience Functions
// ============================================================================

// B4 FIX: Global analysis mutex to prevent overlapping runs
let analysisInProgress = false;
let analysisPromise = null;

/**
 * Run complete analysis pipeline on a session
 * @param {string} url - Current page URL
 * @param {Object} options - Analysis options
 * @param {string[]} options.enabledAnalyzers - List of analyzer IDs to run (null = run all)
 * @param {boolean} options.incrementGeneration - Whether to increment generation before run (default: true for selective, false for full)
 * @returns {Promise<{memory: MemoryController, context: ContextAssembler, results: Object}>}
 */
async function analyzeSession(url, options = {}) {
    // B4 FIX: Mutex check - if analysis is already in progress, wait for it
    if (analysisInProgress && analysisPromise) {
        memLog('info', 'Analysis already in progress, waiting for existing run...');
        return analysisPromise;
    }

    // Set mutex
    analysisInProgress = true;

    // Wrap in try/finally to ensure mutex is released
    analysisPromise = (async () => {
        try {
            // Extract session ID
            const sessionId = MemoryController.extractSessionId(url);
            if (!sessionId) {
                throw new Error('Could not extract session ID from URL');
            }

            console.log(`[Memory] Analyzing session: ${sessionId}`);

            // Initialize memory controller
            const memory = new MemoryController(sessionId);
            await memory.load();

            // Get LLM client
            if (typeof llmConfigManager === 'undefined') {
                throw new Error('LLM Config Manager not available');
            }

            const llmClient = await llmConfigManager.getClient();

            // Log which model is being used
            if (llmClient.isConfigured()) {
                console.log(`[Memory] Using model: ${llmClient.model} (${llmClient.provider})`);
                if (llmClient.defaultTemperature !== undefined) {
                    console.log(`[Memory] Parameters: temp=${llmClient.defaultTemperature}, maxTokens=${llmClient.defaultMaxTokens}`);
                }
            } else {
                console.warn('[Memory] LLM not configured - please set up API key in settings');
                return {
                    memory,
                    context: new ContextAssembler(memory),
                    results: { success: [], failed: [], skipped: true, reason: 'No API key configured' }
                };
            }

            // Get scraper and check for history
            if (typeof GeminiConversationScraper === 'undefined') {
                throw new Error('GeminiConversationScraper not available');
            }

            const scraper = new GeminiConversationScraper();

            if (!scraper.hasHistory()) {
                console.log('[Memory] No conversation history to analyze');
                return {
                    memory,
                    context: new ContextAssembler(memory),
                    results: { success: [], failed: [], skipped: true, reason: 'No chat history' }
                };
            }

            // Scrape conversation
            const scrapedData = scraper.scrape();
            console.log(`[Memory] Scraped ${scrapedData.messages.length} message pairs`);

            // Increment generation if this is a selective rebuild
            // (for selective rebuild, we want a new generation so old filtered-out data is marked stale)
            const isSelectiveRebuild = Array.isArray(options.enabledAnalyzers);
            const shouldIncrementGen = options.incrementGeneration ?? isSelectiveRebuild;

            if (shouldIncrementGen) {
                const newGen = await memory.incrementGeneration();
                console.log(`[Memory] Generation incremented to ${newGen} for selective rebuild`);
            }

            // =========================================================================
            // UNIFIED ANALYZER: Single LLM call for all 7 dimensions
            // =========================================================================
            // Schema v3: persona, context, exemplar, format, tone, framework, constraints
            // Replaces: Old 6-component schema
            // Benefit: Single API call for comprehensive analysis
            // =========================================================================

            let results = { success: [], failed: [], filtered: [] };

            if (typeof UnifiedAnalyzer === 'undefined') {
                memLog('error', 'UnifiedAnalyzer not loaded - cannot analyze');
                return {
                    memory,
                    context: new ContextAssembler(memory),
                    results: { success: [], failed: [{ id: 'unified_analyzer', error: 'Not loaded' }], skipped: true, reason: 'UnifiedAnalyzer not available' }
                };
            }

            try {
                // Pass enabled analyzers to UnifiedAnalyzer (respects toggle states)
                let enabledComponents = options.enabledAnalyzers || null;

                // === FILTER OUT PINNED COMPONENTS ===
                // Pinned components show VERBATIM badge and are excluded from rebuild
                const pinnedComponents = [];
                const allDimensions = ['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar'];

                for (const componentId of allDimensions) {
                    const component = await memory.getComponent(componentId);
                    if (component?.pinned === true) {
                        pinnedComponents.push(componentId);
                    }
                }

                if (pinnedComponents.length > 0) {
                    memLog('info', `[PINNED] Skipping pinned components in analysis: ${pinnedComponents.join(', ')}`);

                    if (enabledComponents) {
                        // Remove pinned components from the list
                        enabledComponents = enabledComponents.filter(c => !pinnedComponents.includes(c));
                    } else {
                        // Full analysis mode - use all dimensions minus pinned ones
                        enabledComponents = allDimensions.filter(c => !pinnedComponents.includes(c));
                    }

                    // Track filtered components in results
                    for (const pinnedId of pinnedComponents) {
                        results.filtered.push({ id: pinnedId, reason: 'pinned' });
                    }
                }

                memLog('info', 'Starting UnifiedAnalyzer (7-dimension schema)', {
                    enabledCount: enabledComponents ? enabledComponents.length : 7,
                    enabled: enabledComponents || 'all',
                    pinnedCount: pinnedComponents.length
                });

                const startTime = performance.now();
                const unifiedResults = await UnifiedAnalyzer.analyze(scrapedData, llmClient, {
                    enabledComponents: enabledComponents
                });
                const duration = Math.round(performance.now() - startTime);

                memLog('info', 'UnifiedAnalyzer API call completed', { durationMs: duration });

                if (unifiedResults) {
                    const generation = await memory.getCurrentGeneration();

                    // Use new 7-dimension schema or fall back to enabled list
                    const dimensionIds = enabledComponents || [
                        'persona',
                        'context',
                        'exemplar',
                        'format',
                        'tone',
                        'framework',
                        'constraints'
                    ];

                    memLog('info', 'Storing analysis results', {
                        generation,
                        dimensionCount: dimensionIds.length
                    });

                    // SPECIAL HANDLING: Metadata & Persona Name/Title
                    // UnifiedAnalyzer returns a top-level 'metadata' object with 'suggested_name' and 'suggested_title'
                    // We need to inject these into the persona component so the UI can display them
                    if (unifiedResults.metadata && unifiedResults.persona) {
                        if (unifiedResults.metadata.suggested_name) {
                            unifiedResults.persona.name = unifiedResults.metadata.suggested_name;
                            memLog('debug', 'Injecting suggested_name into persona', { name: unifiedResults.persona.name });
                        }
                        if (unifiedResults.metadata.suggested_title) {
                            unifiedResults.persona.title = unifiedResults.metadata.suggested_title;
                            memLog('debug', 'Injecting suggested_title into persona', { title: unifiedResults.persona.title });
                        }
                        // Also persist valid top-level metadata into persona for future reference
                        unifiedResults.persona.analysis_metadata = unifiedResults.metadata;
                    }

                    for (const dimensionId of dimensionIds) {
                        const data = unifiedResults[dimensionId];
                        if (data) {
                            await memory.setComponent(dimensionId, data, 0.9, generation);
                            memLog('debug', `  ${dimensionId} stored`, {
                                fields: Object.keys(data).length
                            });
                            results.success.push(dimensionId);
                        } else {
                            memLog('warn', `  ${dimensionId} missing from response`);
                            results.failed.push({ id: dimensionId, error: 'No data in response' });
                        }
                    }

                    memLog('info', 'UnifiedAnalyzer complete (7 dimensions)', {
                        success: results.success.length,
                        failed: results.failed.length,
                        total: dimensionIds.length,
                        durationMs: duration
                    });
                } else {
                    results.failed.push({ id: 'unified_analyzer', error: 'No response' });
                    console.error('[Memory] UnifiedAnalyzer returned null');
                }
            } catch (error) {
                console.error('[Memory] UnifiedAnalyzer failed:', error);
                results.failed.push({ id: 'unified_analyzer', error: error.message });
            }

            // Create context assembler
            const context = new ContextAssembler(memory);
            await context.assemble();

            console.log('[Memory] Analysis complete:', results);

            return { memory, context, results };
        } finally {
            // B4 FIX: Always release the mutex
            analysisInProgress = false;
            analysisPromise = null;
            memLog('debug', 'Analysis mutex released');
        }
    })();

    return analysisPromise;
}

/**
 * Quick check if LLM is configured
 * @returns {Promise<boolean>}
 */
async function isLLMConfigured() {
    if (typeof llmConfigManager === 'undefined') return false;
    return await llmConfigManager.isConfigured();
}

/**
 * Get current session ID from URL
 * @returns {string|null}
 */
function getCurrentSessionId() {
    return MemoryController.extractSessionId(window.location.href);
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.analyzeSession = analyzeSession;
    window.isLLMConfigured = isLLMConfigured;
    window.getCurrentSessionId = getCurrentSessionId;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { analyzeSession, isLLMConfigured, getCurrentSessionId };
}

// ============================================================================
// Message Listener for Sidepanel Rebuild Request (via Extension Bridge)
// ============================================================================
// Since this runs in MAIN world, we receive messages via window.postMessage
// from bridge/extension-bridge.js which runs in ISOLATED world

window.addEventListener('message', async (event) => {
    // Only process messages from our extension bridge
    if (event.data?.source !== 'ext-bridge') return;

    const { type, payload, requestId } = event.data;

    // Helper to send response back to bridge
    const sendBridgeResponse = (result) => {
        window.postMessage({
            source: 'ext-bridge-response',
            requestId: requestId,
            result: result
        }, '*');
    };

    if (type === 'REBUILD_MEMORY_REQUEST') {
        console.log('[Memory] Rebuild request received via bridge', {
            enabledAnalyzers: payload.enabledAnalyzers
        });

        try {
            // Run analysis with optional enabledAnalyzers filter
            const result = await analyzeSession(window.location.href, {
                enabledAnalyzers: payload.enabledAnalyzers
            });

            sendBridgeResponse({
                success: true,
                analyzed: result.results.success.length,
                failed: result.results.failed.length,
                filtered: result.results.filtered?.length || 0
            });
        } catch (error) {
            console.error('[Memory] Rebuild failed:', error);
            sendBridgeResponse({ success: false, error: error.message });
        }
    }

    // Handle LLM config changes for SmartAutoRun
    if (type === 'LLM_CONFIG_SAVED' && payload.configured) {
        memLog('info', 'SmartAutoRun: API key enabled via bridge, re-checking prerequisites');
        SmartAutoRun._initialized = false;
        SmartAutoRun._hasRunInitial = false;
        SmartAutoRun.initialize();
    }
});

// ============================================================================
// Smart Auto-Run Controller
// ============================================================================
// Prevents API waste by only running analysis when:
// 1. API key is configured
// 2. Chat has history (not empty)
// 3. At least 2 complete prompt+response pairs exist
// 4. Response streaming is complete

const SmartAutoRun = {
    _initialized: false,
    _observer: null,
    _pendingAnalysis: false,
    _hasRunInitial: false,
    MIN_TURNS: 2, // Minimum complete turns before auto-run

    /**
     * Check if prerequisites are met for auto-run
     */
    async canRun() {
        // 1. Check API is configured
        if (typeof llmConfigManager === 'undefined') {
            return { canRun: false, reason: 'llmConfigManager not available' };
        }

        const isConfigured = await llmConfigManager.isConfigured();
        if (!isConfigured) {
            return { canRun: false, reason: 'API not configured' };
        }

        // 2. Check chat has history
        if (typeof GeminiConversationScraper === 'undefined') {
            return { canRun: false, reason: 'Scraper not available' };
        }

        const scraper = new GeminiConversationScraper({ maxTurns: 10 });
        if (!scraper.hasHistory()) {
            return { canRun: false, reason: 'Empty chat - no data to analyze' };
        }

        // 3. Check minimum turn count
        const result = scraper.scrape();
        const completeTurns = (result.messages || []).filter(m =>
            m.user?.prompt && m.model?.response
        ).length;

        if (completeTurns < this.MIN_TURNS) {
            return {
                canRun: false,
                reason: `Need ${this.MIN_TURNS} complete turns, have ${completeTurns}`
            };
        }

        // 4. Check if memory already exists for this session
        const sessionId = MemoryController.extractSessionId(window.location.href);
        if (sessionId) {
            const memory = new MemoryController(sessionId);
            await memory.load();
            const hasExistingMemory = await memory.hasContext();

            if (hasExistingMemory) {
                return { canRun: false, reason: 'Memory already exists', hasMemory: true };
            }
        }

        return { canRun: true, completeTurns };
    },

    /**
     * Set up observer to detect new responses
     */
    setupResponseObserver() {
        if (this._observer) return;

        const chatContainer = document.querySelector('[class*="conversation"]') ||
            document.querySelector('[class*="chat-history"]') ||
            document.body;

        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this._checkForCompletedResponse(node);
                        }
                    }
                }
            }
        });

        this._observer.observe(chatContainer, { childList: true, subtree: true });
        memLog('debug', 'SmartAutoRun: Response observer active');
    },

    /**
     * Check if a new node indicates a completed response
     */
    async _checkForCompletedResponse(node) {
        // Already ran initial analysis
        if (this._hasRunInitial) return;

        // Look for model response completion indicators
        const isModelResponse = node.matches?.('[class*="model-response"]') ||
            node.matches?.('[class*="response-container"]') ||
            node.querySelector?.('[class*="model-response"]');

        if (!isModelResponse) return;

        // Debounce - wait for streaming to complete
        if (this._pendingAnalysis) return;
        this._pendingAnalysis = true;

        // Wait 2 seconds for streaming to complete
        setTimeout(async () => {
            this._pendingAnalysis = false;

            const { canRun, completeTurns, reason } = await this.canRun();

            if (canRun) {
                memLog('info', 'SmartAutoRun: Threshold reached, running initial analysis', {
                    completeTurns
                });
                this._hasRunInitial = true;
                await this.runAnalysis();
                this.cleanup();
            } else {
                memLog('debug', 'SmartAutoRun: Not ready yet', { reason });
            }
        }, 2000);
    },

    /**
     * Run memory analysis (silent, no notification)
     */
    async runAnalysis() {
        try {
            const url = window.location.href;
            await analyzeSession(url);
            memLog('info', 'SmartAutoRun: Initial analysis complete');
        } catch (error) {
            memLog('error', 'SmartAutoRun: Analysis failed', { error: error.message });
        }
    },

    /**
     * Cleanup observer after initial run
     */
    cleanup() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
        }
    },

    /**
     * Initialize smart auto-run
     */
    async initialize() {
        if (this._initialized) return;
        this._initialized = true;

        memLog('debug', 'SmartAutoRun: Initializing...');

        const { canRun, reason, hasMemory } = await this.canRun();

        if (canRun) {
            // Already has sufficient data - run immediately (e.g., page navigation to existing chat)
            memLog('info', 'SmartAutoRun: Prerequisites met, running analysis');
            this._hasRunInitial = true;
            await this.runAnalysis();
        } else if (hasMemory) {
            // Memory already exists - no need to do anything
            memLog('debug', 'SmartAutoRun: Memory already exists, skipping');
        } else {
            memLog('debug', 'SmartAutoRun: Waiting for prerequisites', { reason });
            // Set up observer to wait for data
            this.setupResponseObserver();
        }
    }
};

// Initialize Smart Auto-Run when memory layer loads
SmartAutoRun.initialize();

memLog('info', 'Memory Architecture Layer ready (LLM-powered)');
