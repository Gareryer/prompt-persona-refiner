/**
 * @fileoverview Rating Injector - DOM Injection for Rating UI Components
 * 
 * Dynamically injects 5-star rating UI elements into Gemini AI response
 * containers. Uses MutationObserver to handle dynamically loaded content
 * as users scroll through conversation history.
 * 
 * @description
 * The Rating Injector is responsible for:
 * 1. Finding model response containers in the Gemini DOM
 * 2. Creating and injecting rating UI components into those containers
 * 3. Observing DOM mutations for new responses (via MutationObserver)
 * 4. Calculating turn indices for proper rating association
 * 5. Preventing double-injection via marker classes
 * 
 * Injection Strategy (in order of preference):
 * 1. After the response-actions div (thumbs up/down buttons)
 * 2. After the response text content element
 * 3. Appended to the response container as last resort
 * 
 * Observer Strategy:
 * - Attempts to find the chat-history scrollable container
 * - Falls back through multiple selectors if not found
 * - Uses document.body as last resort after max retries
 * 
 * @module rating/rating-injector
 * @requires RatingManager - For getting/setting ratings
 * @requires createRatingUI - For creating rating UI elements
 * @requires updateRatingUI - For updating existing rating UIs
 * 
 * @example
 * // Manual initialization (usually auto-initialized)
 * await RatingInjector.initialize();
 * 
 * // Refresh all ratings after storage update
 * await RatingInjector.refreshAll();
 */

// ============================================================================
// SECTION 1: DOM Selectors Configuration
// ============================================================================

/**
 * Selectors for Gemini DOM elements with fallback chains
 * 
 * @constant {Object}
 * @description
 * Gemini's DOM structure can change between updates, so we maintain
 * multiple selector fallbacks for each element type. Selectors are
 * tried in order until one matches.
 */
const RATING_SELECTORS = {
    /**
     * Selectors for the main chat scrollable container
     * Used as the MutationObserver target
     */
    chatHistorySelectors: [
        'infinite-scroller.chat-history',  // Primary - infinite scroll component
        'infinite-scroller',                // Generic infinite scroller
        '.chat-history',                    // Class-only variant
        'chat-window',                      // Modern Gemini chat window component
        'ms-chat-session',                  // Multisession Gemini container
        'ms-chat-history',                  // Modern history wrapper
        'div[class*="chat-history"]',       // Partial class match
        'div[class*="conversation-container"]', // Conversation wrapper
        'div[class*="chat-window"]',        // Window wrapper
        'div[class*="conversation"]',       // Alternative naming
        'main[role="main"]',                // Main landmark
        '[role="main"]',                    // Role selector
        'main'                              // Last resort - observe main content area
    ],

    /** Selector for individual conversation turn containers */
    conversationTurn: '.conversation-turn, div[class*="conversation-turn"], .turn-container',

    /**
     * Selectors for model response containers (AI responses)
     * Rating UI is injected into these
     */
    modelResponseContainers: [
        '.model-response-container',        // Primary container
        '.model-response-text',             // Primary text container
        'div[class*="model-response"]',     // Partial class match
        'div[class*="response-container"]', // Alternative container
        '.model-turn',                      // Turn container
        '[data-role="model"]'               // Data attribute
    ],

    /**
     * Selectors for response action buttons (thumbs up/down, copy, etc.)
     * Rating UI is inserted after these when found
     */
    responseActionsSelectors: [
        '.response-actions',                // Primary selector
        '[class*="response-action"]',       // Partial class match
        '[class*="actions"]',               // Generic actions container
        '.action-buttons'
    ],

    /**
     * Marker class added to injected containers to prevent double-injection
     */
    injectedMarker: 'pa-rating-injected'
};

// ============================================================================
// SECTION 2: Rating Injector Singleton
// ============================================================================

/**
 * RatingInjector Singleton
 * 
 * Manages the injection of rating UI components into the Gemini DOM.
 * Auto-initializes when the DOM is ready.
 * 
 * @namespace RatingInjector
 */
const RatingInjector = {
    /** @type {RatingManager|null} Reference to the session's rating manager */
    _ratingManager: null,

    /** @type {MutationObserver|null} Observer for new DOM content */
    _observer: null,

    /** @type {boolean} Whether initialize() has been called */
    _initialized: false,

    /** @type {number} Current retry count for finding chat container */
    _retryCount: 0,

    /** @type {number} Maximum retries before falling back to document.body */
    _maxRetries: 10,

    /** @type {string|null} Last logged selector (prevents log spam) */
    _lastLoggedSelector: null,

    /** @type {boolean} Whether chat container has been logged */
    _chatContainerLogged: false,

    // ========================================================================
    // SECTION 2.1: Initialization
    // ========================================================================

    /**
     * Initialize the rating injector
     * 
     * @async
     * @description
     * Main entry point. Gets the rating manager, loads existing ratings,
     * injects UI into existing responses, and sets up the MutationObserver
     * for future responses.
     * 
     * Safe to call multiple times - will no-op if already initialized.
     */
    async initialize() {
        // Prevent double initialization
        if (this._initialized) {
            console.log('[RatingInjector] Already initialized');
            return;
        }

        // === GET RATING MANAGER ===
        // Uses getCurrentRatingManager() which extracts session ID from URL
        this._ratingManager = getCurrentRatingManager();
        if (!this._ratingManager) {
            console.log('[RatingInjector] No active session ID on current URL - skipping rating injection');
            return;
        }

        // === LOAD EXISTING RATINGS ===
        // Load from localStorage so we can display existing ratings
        await this._ratingManager.load();
        console.log(`[RatingInjector] Loaded ${this._ratingManager.getRatedCount()} existing ratings`);

        // === INJECT INTO EXISTING RESPONSES ===
        // Handle responses that were already in the DOM when we initialized
        this.injectAll();

        // === SET UP MUTATION OBSERVER ===
        // Watch for new responses as user continues conversation
        this.setupObserver();

        this._initialized = true;
        console.log('[RatingInjector] Initialized successfully');
    },

    // ========================================================================
    // SECTION 2.2: DOM Query Methods
    // ========================================================================

    /**
     * Find all model response containers using fallback selectors
     * 
     * @returns {NodeListOf<Element>|Element[]} Collection of response containers
     * 
     * @description
     * Tries each selector in modelResponseContainers until one finds elements.
     * Logs the successful selector once per selector change.
     */
    findModelResponses() {
        for (const selector of RATING_SELECTORS.modelResponseContainers) {
            const responses = document.querySelectorAll(selector);
            if (responses.length > 0) {
                // Log selector changes only (prevents mutation observer spam)
                if (this._lastLoggedSelector !== selector) {
                    console.log(`[RatingInjector] Using selector: ${selector} (${responses.length} responses)`);
                    this._lastLoggedSelector = selector;
                }
                return responses;
            }
        }
        return [];
    },

    /**
     * Find the response actions element within a container
     * 
     * @param {HTMLElement} container - The response container to search within
     * @returns {HTMLElement|null} The actions element, or null if not found
     */
    findResponseActions(container) {
        for (const selector of RATING_SELECTORS.responseActionsSelectors) {
            const actions = container.querySelector(selector);
            if (actions) {
                return actions;
            }
        }
        return null;
    },

    /**
     * Find the chat history container using fallback selectors
     * 
     * @returns {HTMLElement|null} The chat container, or null if not found
     * 
     * @description
     * This is the element we observe for mutations. Tries multiple selectors
     * to handle different Gemini DOM structures.
     */
    findChatContainer() {
        for (const selector of RATING_SELECTORS.chatHistorySelectors) {
            try {
                const container = document.querySelector(selector);
                if (container) {
                    // Log container discovery once
                    if (!this._chatContainerLogged) {
                        console.log(`[RatingInjector] Chat container found: ${selector}`);
                        this._chatContainerLogged = true;
                    }
                    return container;
                }
            } catch (e) {
                // Invalid selector syntax - skip to next
            }
        }
        return null;
    },

    // ========================================================================
    // SECTION 2.3: Injection Methods
    // ========================================================================

    /**
     * Inject rating UI into all existing model responses
     * 
     * @description
     * Called during initialization to handle responses already in the DOM.
     * Iterates through all found responses and injects rating UI.
     */
    injectAll() {
        const responses = this.findModelResponses();

        if (responses.length > 0) {
            console.log(`[RatingInjector] Injecting into ${responses.length} existing responses`);
        }

        responses.forEach((response, index) => {
            this.injectIntoResponse(response, index);
        });
    },

    /**
     * Inject rating UI into a single response container
     * 
     * @param {HTMLElement} responseContainer - The model response container
     * @param {number} turnIndex - The zero-based conversation turn index
     * 
     * @description
     * Uses three injection strategies in order of preference:
     * 1. After the response-actions div
     * 2. After a text content element
     * 3. Appended to the container
     * 
     * Marks the container with injectedMarker class to prevent double-injection.
     */
    injectIntoResponse(responseContainer, turnIndex) {
        // === SKIP IF ALREADY INJECTED ===
        if (responseContainer.classList.contains(RATING_SELECTORS.injectedMarker)) {
            return;
        }

        // === GET CURRENT RATING ===
        const ratingData = this._ratingManager.getRating(turnIndex);
        const currentRating = ratingData ? ratingData.rating : null;

        // === CREATE RATING UI ===
        const ratingUI = createRatingUI(turnIndex, currentRating, async (ti, rating) => {
            // Callback when user clicks a star
            await this._ratingManager.setRating(ti, rating);
        });

        let inserted = false;

        // === STRATEGY 1: After response-actions div ===
        // This positions the rating near Gemini's thumbs up/down buttons
        const actionsDiv = this.findResponseActions(responseContainer);
        if (actionsDiv && actionsDiv.parentNode) {
            try {
                actionsDiv.parentNode.insertBefore(ratingUI, actionsDiv.nextSibling);
                inserted = true;
                console.log(`[RatingInjector] Injected for turn ${turnIndex} (after actions)`);
            } catch (e) {
                console.warn(`[RatingInjector] Strategy 1 failed:`, e.message);
            }
        }

        // === STRATEGY 2: After text content element ===
        // Find a suitable text element to insert after
        if (!inserted) {
            const textSelectors = [
                '.model-response-text',       // Primary response text
                '[class*="response-text"]',   // Partial match
                '[class*="message-content"]', // Alternative naming
                '[class*="markdown"]',        // Markdown rendered content
                'p:last-of-type',             // Last paragraph
                'div:last-child'              // Last child div
            ];

            for (const selector of textSelectors) {
                try {
                    const textEl = responseContainer.querySelector(selector);
                    if (textEl && textEl.parentNode) {
                        textEl.parentNode.insertBefore(ratingUI, textEl.nextSibling);
                        inserted = true;
                        console.log(`[RatingInjector] Injected for turn ${turnIndex} (after ${selector})`);
                        break;
                    }
                } catch (e) {
                    // Continue to next selector
                }
            }
        }

        // === STRATEGY 3: Append to container ===
        // Last resort - just add to the end of the container
        if (!inserted) {
            try {
                responseContainer.appendChild(ratingUI);
                inserted = true;
                console.log(`[RatingInjector] Injected for turn ${turnIndex} (appended)`);
            } catch (e) {
                console.error(`[RatingInjector] Failed to inject for turn ${turnIndex}:`, e);
            }
        }

        // === MARK AS INJECTED ===
        if (inserted) {
            responseContainer.classList.add(RATING_SELECTORS.injectedMarker);
        }
    },

    // ========================================================================
    // SECTION 2.4: Turn Index Calculation
    // ========================================================================

    /**
     * Calculate the turn index for a response container
     * 
     * @param {HTMLElement} responseContainer - The response container element
     * @returns {number} Zero-based turn index, or -1 if not determinable
     * 
     * @description
     * First tries to find the parent conversation-turn and count its position.
     * Falls back to counting position among all model response containers.
     */
    calculateTurnIndex(responseContainer) {
        // Try to find parent conversation turn
        const turn = responseContainer.closest(RATING_SELECTORS.conversationTurn);

        if (!turn) {
            // Fallback: count position among all model responses
            const allResponses = this.findModelResponses();
            for (let i = 0; i < allResponses.length; i++) {
                if (allResponses[i] === responseContainer ||
                    allResponses[i].contains(responseContainer)) {
                    return i;
                }
            }
            return -1;
        }

        // Count position among conversation turns
        const allTurns = document.querySelectorAll(RATING_SELECTORS.conversationTurn);
        for (let i = 0; i < allTurns.length; i++) {
            if (allTurns[i] === turn) {
                return i;
            }
        }

        return -1;
    },

    // ========================================================================
    // SECTION 2.5: MutationObserver Setup
    // ========================================================================

    /**
     * Set up MutationObserver to detect new responses
     * 
     * @description
     * Finds the chat history container and observes it for new child elements.
     * Retries with backoff if container not found, eventually falling back
     * to observing document.body.
     */
    setupObserver() {
        let chatHistory = this.findChatContainer();

        // Handle container not found
        if (!chatHistory) {
            this._retryCount++;
            if (this._retryCount < this._maxRetries) {
                console.log(`[RatingInjector] Chat container not found, retry ${this._retryCount}/${this._maxRetries}...`);
                setTimeout(() => this.setupObserver(), 1000);
                return;
            } else {
                // Final fallback: observe entire body
                console.log('[RatingInjector] Using document.body as observer target (fallback)');
                chatHistory = document.body;
            }
        }

        // Create and configure the observer
        this._observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.handleNewNode(node);
                        }
                    }
                }
            }
        });

        // Start observing with subtree to catch nested additions
        this._observer.observe(chatHistory, {
            childList: true,
            subtree: true
        });

        console.log('[RatingInjector] MutationObserver active');
    },

    /**
     * Handle a newly added DOM node
     * 
     * @param {HTMLElement} node - The added element
     * 
     * @description
     * Checks if the node is a model response container, or contains any.
     * Injects rating UI with a small delay to ensure DOM is stable.
     */
    handleNewNode(node) {
        // Check if this node itself is a model response
        const isModelResponse = RATING_SELECTORS.modelResponseContainers.some(selector => {
            try {
                return node.matches && node.matches(selector);
            } catch {
                return false;
            }
        });

        if (isModelResponse) {
            const turnIndex = this.calculateTurnIndex(node);
            if (turnIndex >= 0) {
                // Delay to ensure the response content is fully rendered
                setTimeout(() => {
                    this.injectIntoResponse(node, turnIndex);
                }, 100);
            }
        }

        // Also check for child model response containers
        for (const selector of RATING_SELECTORS.modelResponseContainers) {
            try {
                const childResponses = node.querySelectorAll?.(selector);
                if (childResponses && childResponses.length > 0) {
                    childResponses.forEach((response) => {
                        const turnIndex = this.calculateTurnIndex(response);
                        if (turnIndex >= 0) {
                            setTimeout(() => {
                                this.injectIntoResponse(response, turnIndex);
                            }, 100);
                        }
                    });
                }
            } catch {
                // Invalid selector, skip
            }
        }
    },

    // ========================================================================
    // SECTION 2.6: Utility Methods
    // ========================================================================

    /**
     * Refresh all rating UIs from storage
     * 
     * @async
     * @description
     * Reloads ratings from storage and updates all existing rating UI
     * components. Call this after external storage changes.
     */
    async refreshAll() {
        if (this._ratingManager) {
            await this._ratingManager.load();
        }

        const ratingContainers = document.querySelectorAll('.pa-rating-container');

        ratingContainers.forEach((container) => {
            const turnIndex = parseInt(container.dataset.turnIndex);
            const ratingData = this._ratingManager.getRating(turnIndex);
            const rating = ratingData ? ratingData.rating : null;
            updateRatingUI(container, rating);
        });

        console.log(`[RatingInjector] Refreshed ${ratingContainers.length} rating UIs`);
    },

    /**
     * Stop the MutationObserver and reset state
     * 
     * @description
     * Call this when cleaning up (e.g., page navigation).
     * Allows re-initialization by calling initialize() again.
     */
    disconnect() {
        if (this._observer) {
            this._observer.disconnect();
            this._observer = null;
            console.log('[RatingInjector] MutationObserver disconnected');
        }
        this._initialized = false;
    }
};

// ============================================================================
// SECTION 3: Auto-Initialization
// ============================================================================
// Automatically initialize when the DOM is ready.
// Uses a delay to ensure Gemini's dynamic content has loaded.
// ============================================================================

if (typeof window !== 'undefined') {
    /** @type {number} Delay in ms before initialization (allows Gemini to load) */
    const INIT_DELAY_MS = 1500;

    if (document.readyState === 'loading') {
        // DOM still loading - wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => RatingInjector.initialize(), INIT_DELAY_MS);
        });
    } else {
        // DOM already ready - initialize after delay
        setTimeout(() => RatingInjector.initialize(), INIT_DELAY_MS);
    }
}

// ============================================================================
// SECTION 4: Module Exports
// ============================================================================

// Browser environment - attach to window
if (typeof window !== 'undefined') {
    window.RatingInjector = RatingInjector;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RatingInjector };
}
