/**
 * ============================================================================
 * GEMINI CONVERSATION SCRAPER - Internal API
 * ============================================================================
 * 
 * Core scraping functionality for Prompt Assistant - AI Context-Aware Engineer
 * This is an internal dependency used by the Session Memory Architecture.
 * 
 * ============================================================================
 * USAGE
 * ============================================================================
 * 
 * // Step 1: Check if chat history exists (REQUIRED before scraping)
 * const scraper = new GeminiConversationScraper();
 * if (!scraper.hasHistory()) {
 *     // No chat history - skip scraping stage
 *     return null;
 * }
 * 
 * // Step 2: Scrape conversation
 * const conversation = scraper.scrape();
 * 
 * ============================================================================
 * OUTPUT FORMAT (Internal Standard)
 * ============================================================================
 * 
 * {
 *   metadata: {
 *     title: string,                    // Conversation title from page
 *     dates: {
 *       created: "MM/DD/YYYY HH:MM:SS", // Extraction timestamp
 *       updated: "MM/DD/YYYY HH:MM:SS",
 *       exported: "MM/DD/YYYY HH:MM:SS"
 *     },
 *     stats: {
 *       pairCount: number,              // Number of prompt-response pairs
 *       totalBytes: number,             // Total content bytes
 *       wasTruncated: boolean           // Whether content was truncated
 *     }
 *   },
 *   messages: [
 *     {
 *       id: number,                     // Sequential pair ID (1, 2, 3...)
 *       user: { prompt: string },       // User's prompt text
 *       model: { response: string },    // Model's response text
 *       rating: {                       // User's satisfaction rating (if provided)
 *         value: number | null,         // 1-5 stars or null if unrated
 *         ratedAt: number | null        // Timestamp when rated
 *       }
 *     },
 *     ...
 *   ]
 * }
 * 
 * ============================================================================
 * EMPTY SESSION HANDLING
 * ============================================================================
 * 
 * New Gemini chat sessions have NO prior prompts/responses.
 * ALWAYS check hasHistory() before scraping to avoid empty results.
 * 
 * When hasHistory() returns false:
 * - Do NOT call scrape()
 * - Skip the scraping stage entirely
 * - Proceed with extension flow without conversation context
 * 
 * ============================================================================
 */

// Logger helper for scraper
const scrapeLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'Scraper', ...data });
    } else {
        console.log(`[Scraper] ${msg}`, data);
    }
};

scrapeLog('info', 'Loading GeminiConversationScraper...');

// ============================================================
// Configuration
// ============================================================

const SCRAPER_CONFIG = {
    // Limits
    maxTurns: 50,               // Maximum conversation turns to extract
    maxBytesTotal: 50000,       // Maximum total bytes (50KB)
    maxBytesPerMessage: 2000,   // Max bytes per message before truncation

    // Token estimation
    charsPerToken: 4,           // Approximate chars per token
    maxTokens: 12000,           // Token budget for scraped content

    // Output format
    outputFormat: 'json',       // 'json' | 'markdown' | 'text'

    // Debug
    debug: false
};

// ============================================================
// Selectors (in priority order)
// ============================================================

const GEMINI_SELECTORS = {
    // Primary message container selectors (verified Dec 2024)
    messageContainers: [
        // VERIFIED WORKING (user test Dec 12, 2024)
        '.model-response-text',           // model responses
        '.query-text',                    // user query text
        '.user-query-container',          // user query container
        '.query-content',                 // query content wrapper

        // Broader patterns
        'div[class*="query"]',            // user queries
        'div[class*="response"]',         // responses (broad)

        // Fallback patterns
        '.conversation-turn',
        '[data-message-id]',
        '.message-content',
        '.chat-message'
    ],

    // User message indicators (class, attribute, or ancestor) - VERIFIED Dec 2024
    userIndicators: [
        { type: 'ancestor', selector: '.user-query-container' },
        { type: 'ancestor', selector: '.query-content' },
        { type: 'class', value: 'query-text' },
        { type: 'class', value: 'user-query-bubble-container' },
        { type: 'ancestor', selector: '.user-message' },
        { type: 'ancestor', selector: '[data-role="user"]' },
        { type: 'attribute', name: 'data-is-user', value: 'true' }
    ],

    // Model message indicators
    modelIndicators: [
        { type: 'ancestor', selector: '.model-message' },
        { type: 'ancestor', selector: '[data-role="model"]' },
        { type: 'ancestor', selector: '[data-author="assistant"]' },
        { type: 'class', value: 'model-response-text' },
        { type: 'class', value: 'model-turn' },
        { type: 'attribute', name: 'data-is-model', value: 'true' }
    ]
};

// ============================================================
// Core Types
// ============================================================

/**
 * @typedef {Object} ScrapedTurn
 * @property {number} index - Turn index (0-based)
 * @property {'user'|'model'} role - Message author
 * @property {string} content - Message text content
 * @property {number} timestamp - Extraction timestamp
 * @property {number} byteLength - Content byte size
 * @property {Object} metadata - Additional metadata
 */

/**
 * @typedef {Object} ScrapedSession
 * @property {string} sessionId - Unique session identifier
 * @property {number} scrapedAt - Timestamp of scraping
 * @property {number} turnCount - Total turns extracted
 * @property {number} totalBytes - Total content bytes
 * @property {ScrapedTurn[]} turns - Extracted turns
 * @property {boolean} hasHistory - Whether any history exists
 * @property {boolean} wasTruncated - Whether content was truncated
 * @property {string} format - Output format used
 */

// ============================================================
// Core Scraper Class
// ============================================================

class GeminiConversationScraper {
    constructor(config = {}) {
        this.config = { ...SCRAPER_CONFIG, ...config };
        this.sessionId = this._generateSessionId();
        this._ratingManager = null;
        this._ratingsLoaded = false;
    }

    /**
     * Check if chat history exists before scraping
     * @returns {boolean}
     */
    hasHistory() {
        const containers = this._findMessageContainers();
        return containers.length > 0;
    }

    /**
     * Get rating for a turn index (synchronous, uses cache)
     * @param {number} turnIndex
     * @returns {Object|null}
     */
    _getRating(turnIndex) {
        // Get rating manager if available
        if (!this._ratingManager && typeof getCurrentRatingManager === 'function') {
            this._ratingManager = getCurrentRatingManager();
        }

        if (this._ratingManager) {
            return this._ratingManager.getRating(turnIndex);
        }

        return null;
    }

    /**
     * Load ratings before scraping (async, call before scrape for ratings)
     * @returns {Promise<void>}
     */
    async loadRatings() {
        if (this._ratingsLoaded) return;

        if (!this._ratingManager && typeof getCurrentRatingManager === 'function') {
            this._ratingManager = getCurrentRatingManager();
        }

        if (this._ratingManager) {
            await this._ratingManager.load();
            this._ratingsLoaded = true;
        }
    }

    /**
     * Main scraping method - extracts conversation from current page
     * @param {Object} options - Override config options
     * @returns {Object} Formatted conversation object
     */
    scrape(options = {}) {
        scrapeLog('debug', '[scrape] START');
        console.log('[Scraper] scrape START');

        // Step 1: Merge config
        const config = { ...this.config, ...options };
        scrapeLog('debug', '[scrape] Config merged', {
            maxTurns: config.maxTurns,
            maxBytes: config.maxBytesTotal
        });
        console.log('[Scraper] scrape: Config ready');
        const now = new Date();

        // Helper to format date as MM/DD/YYYY HH:MM:SS
        const formatDate = (date) => {
            const d = new Date(date);
            const pad = (n) => n.toString().padStart(2, '0');
            return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        };

        // Step 2: Find message containers
        scrapeLog('debug', '[scrape] Finding message containers');
        console.log('[Scraper] scrape: Finding message containers...');
        const containers = this._findMessageContainers();
        scrapeLog('debug', '[scrape] Containers found', { count: containers.length });
        console.log('[Scraper] scrape: Found containers:', containers.length);

        if (containers.length === 0) {
            scrapeLog('warn', '[scrape] No chat history found');
            console.log('[Scraper] scrape: No chat history found');
            if (config.debug) console.log('[Scraper] No chat history found');
            return {
                metadata: {
                    title: "Empty conversation",
                    dates: {
                        created: null,
                        updated: null,
                        exported: formatDate(now)
                    }
                },
                messages: [],
                turns: []
            };
        }

        // Step 3: Extract turns
        scrapeLog('debug', '[scrape] Extracting turns');
        console.log('[Scraper] scrape: Extracting turns...');
        const { turns, totalBytes, wasTruncated } = this._extractTurns(containers, config);
        scrapeLog('debug', '[scrape] Turns extracted', {
            turnCount: turns.length,
            totalBytes,
            wasTruncated
        });
        console.log(`[Scraper] scrape: Extracted ${turns.length} turns, ${totalBytes} bytes`);

        if (config.debug) {
            console.log(`[Scraper] Extracted ${turns.length} turns, ${totalBytes} bytes`);
        }

        // Step 4: Get conversation title
        scrapeLog('debug', '[scrape] Getting title');
        console.log('[Scraper] scrape: Getting title...');
        const titleEl = document.querySelector('h1, [class*="title"], title');
        const title = titleEl?.textContent?.trim() || document.title || "Gemini conversation";
        scrapeLog('debug', '[scrape] Title found', { title: title.slice(0, 50) });
        console.log('[Scraper] scrape: Title:', title.slice(0, 50));

        // Step 5: Format messages
        scrapeLog('debug', '[scrape] Formatting message pairs');
        console.log('[Scraper] scrape: Formatting message pairs...');
        const messages = [];
        let pairId = 1;

        for (let i = 0; i < turns.length; i++) {
            const turn = turns[i];

            if (turn.role === 'user') {
                // Create a new conversation pair
                const pair = {
                    id: pairId,
                    user: { prompt: turn.content },
                    model: { response: null },
                    rating: { value: null, ratedAt: null }
                };

                // Check if next turn is a model response
                if (i + 1 < turns.length && turns[i + 1].role === 'model') {
                    pair.model.response = turns[i + 1].content;
                    i++; // Skip the next turn since we've paired it
                }

                // Add rating if available (turn index is 0-based, pair id is 1-based)
                const turnIndex = pairId - 1;
                const ratingData = this._getRating(turnIndex);
                if (ratingData) {
                    pair.rating.value = ratingData.rating;
                    pair.rating.ratedAt = ratingData.ratedAt;
                }

                messages.push(pair);
                pairId++;
            } else if (turn.role === 'model' && messages.length === 0) {
                // Model response without a preceding user prompt (edge case)
                messages.push({
                    id: pairId++,
                    user: { prompt: null },
                    model: { response: turn.content },
                    rating: { value: null, ratedAt: null }
                });
            }
        }

        return {
            metadata: {
                title: title,
                dates: {
                    created: formatDate(now),
                    updated: formatDate(now),
                    exported: formatDate(now)
                },
                stats: {
                    pairCount: messages.length,
                    totalBytes: totalBytes,
                    wasTruncated: wasTruncated
                }
            },
            messages: messages,
            turns: turns
        };
    }

    /**
     * Find message containers - both user queries AND model responses
     * @returns {Element[]}
     */
    _findMessageContainers() {
        const allMessages = [];

        // Find user messages
        const userSelectors = ['.query-text', '.user-query-container', 'div[class*="query-text"]'];
        let userElements = [];
        for (const selector of userSelectors) {
            try {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                    userElements = Array.from(found);
                    if (this.config.debug) {
                        console.log(`[Scraper] Found ${userElements.length} user messages with: ${selector}`);
                    }
                    break;
                }
            } catch (e) { continue; }
        }

        // Find model messages
        const modelSelectors = ['.model-response-text', 'div[class*="response-text"]', 'div[class*="model-response"]'];
        let modelElements = [];
        for (const selector of modelSelectors) {
            try {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                    modelElements = Array.from(found);
                    if (this.config.debug) {
                        console.log(`[Scraper] Found ${modelElements.length} model messages with: ${selector}`);
                    }
                    break;
                }
            } catch (e) { continue; }
        }

        // Mark elements with their role for later identification
        userElements.forEach(el => el._scraperRole = 'user');
        modelElements.forEach(el => el._scraperRole = 'model');

        // Combine all messages
        allMessages.push(...userElements, ...modelElements);

        // Sort by DOM position (document order)
        allMessages.sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
            if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
            return 0;
        });

        if (this.config.debug) {
            console.log(`[Scraper] Total messages found: ${allMessages.length} (${userElements.length} user, ${modelElements.length} model)`);
        }

        return allMessages;
    }

    /**
     * Extract turns from container elements
     * @param {Element[]} containers
     * @param {Object} config
     * @returns {{turns: ScrapedTurn[], totalBytes: number, wasTruncated: boolean}}
     */
    _extractTurns(containers, config) {
        const turns = [];
        let totalBytes = 0;
        let wasTruncated = false;

        // Apply turn limit
        const maxContainers = Math.min(containers.length, config.maxTurns);
        const targetContainers = containers.slice(-maxContainers);

        for (let i = 0; i < targetContainers.length; i++) {
            const container = targetContainers[i];

            // Check byte limit
            if (totalBytes >= config.maxBytesTotal) {
                wasTruncated = true;
                break;
            }

            // Extract content
            let content = this._extractContent(container);

            // Truncate if needed
            if (content.length > config.maxBytesPerMessage) {
                content = content.substring(0, config.maxBytesPerMessage) + '...';
            }

            // Determine role
            const role = this._determineRole(container);

            // Create turn object
            const turn = {
                index: i,
                role,
                content,
                timestamp: Date.now(),
                byteLength: content.length,
                metadata: {
                    selector: container.className || container.tagName,
                    hasCodeBlocks: content.includes('```') || container.querySelector('pre, code') !== null
                }
            };

            turns.push(turn);
            totalBytes += content.length;
        }

        return { turns, totalBytes, wasTruncated };
    }

    /**
     * Extract text content from a container
     * @param {Element} container
     * @returns {string}
     */
    _extractContent(container) {
        // Clone to avoid modifying DOM
        const clone = container.cloneNode(true);

        // Remove hidden elements
        const hidden = clone.querySelectorAll('[hidden], [style*="display: none"], .sr-only');
        hidden.forEach(el => el.remove());

        // Preserve code blocks formatting
        const codeBlocks = clone.querySelectorAll('pre, code');
        codeBlocks.forEach(block => {
            if (block.tagName === 'PRE') {
                block.textContent = '\n```\n' + block.textContent + '\n```\n';
            }
        });

        // Get text content
        let text = clone.innerText || clone.textContent || '';

        // Clean up
        text = text
            .replace(/\n{3,}/g, '\n\n')  // Collapse multiple newlines
            .trim();

        return text;
    }

    /**
     * Determine the role (user/model) of a message container
     * @param {Element} container
     * @returns {'user'|'model'}
     */
    _determineRole(container) {
        // First check if role was pre-marked by _findMessageContainers
        if (container._scraperRole) {
            return container._scraperRole;
        }

        // Check user indicators
        for (const indicator of GEMINI_SELECTORS.userIndicators) {
            if (this._matchesIndicator(container, indicator)) {
                return 'user';
            }
        }

        // Check model indicators
        for (const indicator of GEMINI_SELECTORS.modelIndicators) {
            if (this._matchesIndicator(container, indicator)) {
                return 'model';
            }
        }

        // Default to model (safer assumption for context)
        return 'model';
    }

    /**
     * Check if container matches an indicator
     * @param {Element} container
     * @param {Object} indicator
     * @returns {boolean}
     */
    _matchesIndicator(container, indicator) {
        switch (indicator.type) {
            case 'ancestor':
                return container.closest(indicator.selector) !== null;
            case 'class':
                return container.classList.contains(indicator.value);
            case 'attribute':
                return container.getAttribute(indicator.name) === indicator.value;
            default:
                return false;
        }
    }

    /**
     * Format output as markdown or text
     * @param {ScrapedTurn[]} turns
     * @param {'markdown'|'text'} format
     * @returns {string}
     */
    _formatOutput(turns, format) {
        if (format === 'markdown') {
            return turns.map(turn => {
                const roleHeader = turn.role === 'user' ? '## 👤 User' : '## 🤖 Model';
                return `${roleHeader}\n\n${turn.content}`;
            }).join('\n\n---\n\n');
        }

        if (format === 'text') {
            return turns.map(turn => {
                const rolePrefix = turn.role === 'user' ? '[USER]' : '[MODEL]';
                return `${rolePrefix}\n${turn.content}`;
            }).join('\n\n');
        }

        return JSON.stringify(turns, null, 2);
    }

    /**
     * Generate unique session ID
     * @returns {string}
     */
    _generateSessionId() {
        return `gscrape_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
}

// ============================================================
// Custom Scraper Interface for Session Memory
// ============================================================

/**
 * Custom scraper method interface for Session Memory Architecture
 * This is the entry point used by the memory layer.
 * 
 * @param {Object} config - Scraping configuration
 * @param {number} config.maxTurns - Maximum turns to extract (default: 50)
 * @param {number} config.maxBytes - Maximum bytes to extract (default: 50000)
 * @param {boolean} config.includeTimestamps - Include timestamps (default: true)
 * @param {boolean} config.includeMetadata - Include metadata (default: true)
 * @returns {Promise<ScrapedTurn[]>} - Array of scraped turns
 */
async function customScraperMethod(config = {}) {
    const scraper = new GeminiConversationScraper({
        maxTurns: config.maxTurns || 50,
        maxBytesTotal: config.maxBytes || 50000,
        debug: config.debug || false
    });

    // Check if history exists first
    if (!scraper.hasHistory()) {
        console.log('[CustomScraper] No chat history - skipping scrape');
        return [];
    }

    // Perform scrape
    const result = scraper.scrape();

    // Return turns array for memory integration
    return result.turns;
}

// ============================================================
// Legacy Compatibility
// ============================================================

/**
 * Legacy getChatHistory function for backward compatibility
 * Returns simplified format used by existing observer.js
 */
function getChatHistory() {
    const scraper = new GeminiConversationScraper({
        maxTurns: 5,
        maxBytesPerMessage: 500
    });

    if (!scraper.hasHistory()) {
        return [];
    }

    const result = scraper.scrape();

    // Convert to legacy format
    return result.turns.map(turn => ({
        role: turn.role,
        text: turn.content
    }));
}

/**
 * Get previous user prompts with model response ratings
 * Used for refinement context to help LLM understand conversation progression
 * @param {number} count - Number of previous prompts to retrieve (default: 5)
 * @returns {Array<{prompt: string, rating: number|null, turnIndex: number}>}
 */
function getPreviousPromptsWithRatings(count = 5) {
    const scraper = new GeminiConversationScraper({
        maxTurns: count * 2, // Get enough turns to have N user prompts
        maxBytesPerMessage: 300
    });

    if (!scraper.hasHistory()) {
        return [];
    }

    const result = scraper.scrape();

    // Get rating manager if available
    const ratingManager = typeof getCurrentRatingManager === 'function'
        ? getCurrentRatingManager()
        : null;

    // Extract user prompts with their corresponding model response ratings
    const prompts = [];

    for (const message of result.messages || []) {
        if (message.user?.prompt) {
            const turnIndex = message.id;

            // Get rating for this turn's model response (if any)
            let rating = null;
            if (ratingManager) {
                const ratingData = ratingManager.getRating(turnIndex);
                if (ratingData?.rating) {
                    rating = ratingData.rating; // 1-5 stars
                }
            }

            prompts.push({
                prompt: message.user.prompt.substring(0, 300),
                rating,
                turnIndex
            });
        }
    }

    // Return last N prompts (most recent first)
    return prompts.slice(-count).reverse();
}

// ============================================================
// Exports
// ============================================================

// Make available globally
console.log('[Scraper] Registering GeminiConversationScraper on window...');
window.GeminiConversationScraper = GeminiConversationScraper;
window.customScraperMethod = customScraperMethod;
window.getChatHistory = getChatHistory;
window.getPreviousPromptsWithRatings = getPreviousPromptsWithRatings;
console.log('[Scraper] Registration complete. GeminiConversationScraper ready.');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        GeminiConversationScraper,
        customScraperMethod,
        getChatHistory,
        getPreviousPromptsWithRatings,
        SCRAPER_CONFIG,
        GEMINI_SELECTORS
    };
}
