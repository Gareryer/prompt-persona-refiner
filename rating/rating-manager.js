/**
 * @fileoverview Rating Manager - User Rating Storage and Retrieval System
 * 
 * Manages 5-star user ratings for Gemini AI responses. Each conversation turn
 * can be rated independently, allowing users to provide feedback on response quality.
 * 
 * @description
 * The Rating Manager provides persistent storage for user ratings with:
 * - Per-session rating storage (each conversation has its own ratings)
 * - Per-turn granularity (rate individual AI responses)
 * - localStorage persistence (survives browser restarts, extension updates)
 * - Cache layer for performance (avoid repeated JSON parsing)
 * 
 * Storage Format:
 * - Key: "pa_ratings_{sessionId}"
 * - Value: JSON object mapping turn keys to rating data
 * 
 * Rating Data Structure:
 * {
 *   "turn_0": { rating: 4, ratedAt: 1703847123456 },
 *   "turn_3": { rating: 5, ratedAt: 1703847234567 }
 * }
 * 
 * @module rating/rating-manager
 * 
 * @example
 * // Initialize for current session
 * const manager = new RatingManager('abc123');
 * manager.load();
 * 
 * // Rate a response
 * manager.setRating(2, 4); // Rate turn 2 with 4 stars
 * 
 * // Read ratings
 * const rating = manager.getRating(2); // { rating: 4, ratedAt: ... }
 */

// ============================================================================
// LOGGER SETUP
// ============================================================================

/**
 * Structured logger for RatingManager
 * 
 * Uses the centralized Logger if available, otherwise falls back to console.
 * All logs are tagged with [RatingManager] for filtering.
 * 
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional data to include
 */
const ratingLog = (level, msg, data = {}) => {
    if (typeof Logger !== 'undefined') {
        Logger.getInstance()[level](msg, { component: 'RatingManager', ...data });
    } else {
        const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
        logFn(`[RatingManager] ${msg}`, Object.keys(data).length ? data : '');
    }
};

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Prefix for localStorage keys to avoid collisions with other data
 * @constant {string}
 */
const RATINGS_KEY_PREFIX = 'pa_ratings_';

// ============================================================================
// SECTION 1: Type Definitions
// ============================================================================

/**
 * @typedef {Object} RatingData
 * @description Data stored for each rated turn
 * @property {number} rating - Star rating value (1-5)
 * @property {number} ratedAt - Unix timestamp when rating was given
 */

/**
 * @typedef {Object} RatingInfo
 * @description Extended rating info for external use
 * @property {number} turnIndex - The conversation turn index (0-based)
 * @property {number} rating - Star rating value (1-5)
 * @property {number} ratedAt - Unix timestamp when rating was given
 */

// ============================================================================
// SECTION 2: RatingManager Class
// ============================================================================

/**
 * RatingManager Class
 * 
 * Manages user ratings for a specific Gemini conversation session.
 * Uses localStorage for persistence and maintains an in-memory cache
 * for efficient access.
 * 
 * @class RatingManager
 */
class RatingManager {
    /**
     * Create a new RatingManager for a specific session
     * 
     * @constructor
     * @param {string} sessionId - Unique session identifier (from URL path)
     * @throws {Error} If sessionId is null, undefined, or empty
     * 
     * @example
     * const manager = new RatingManager('abc123-session-id');
     */
    constructor(sessionId) {
        // === PARAMETER VALIDATION ===
        if (!sessionId) {
            throw new Error('[RatingManager] sessionId is required');
        }

        /** @type {string} The session ID this manager is bound to */
        this.sessionId = sessionId;

        /** @type {string} Full localStorage key for this session's ratings */
        this.storageKey = `${RATINGS_KEY_PREFIX}${sessionId}`;

        /** @type {Object|null} In-memory cache of ratings (null until loaded) */
        this._cache = null;

        ratingLog('debug', `Created RatingManager for session: ${sessionId}`);
    }

    // ========================================================================
    // SECTION 2.1: Static Utility Methods
    // ========================================================================

    /**
     * Check if running in a context with direct chrome.storage access
     * 
     * @static
     * @returns {boolean} True if chrome.storage.local is available
     * 
     * @description
     * Returns true in ISOLATED world (content script) or extension pages.
     * Returns false in MAIN world where we need to use the bridge.
     * Note: RatingManager uses localStorage, not chrome.storage, so this
     * is mainly for compatibility checking.
     */
    static hasDirectStorageAccess() {
        return typeof chrome !== 'undefined' &&
            chrome.storage &&
            chrome.storage.local;
    }

    /**
     * Extract session ID from a Gemini URL
     * 
     * @static
     * @param {string} url - Full URL to parse
     * @returns {string|null} Session ID if found, null otherwise
     * 
     * @description
     * Parses Gemini URLs like:
     * - https://gemini.google.com/app/abc123 → "abc123"
     * - https://gemini.google.com/chat/xyz789 → "xyz789"
     * 
     * @example
     * const sessionId = RatingManager.extractSessionId(window.location.href);
     */
    static extractSessionId(url) {
        try {
            const urlObj = new URL(url);
            // Split path and remove empty segments
            const pathParts = urlObj.pathname.split('/').filter(Boolean);

            // Standard Gemini URL format: /app/{sessionId}
            if (pathParts.length >= 2 && pathParts[0] === 'app') {
                return pathParts[1];
            }

            // Fallback: use last path segment
            return pathParts[pathParts.length - 1] || null;
        } catch {
            // Invalid URL - return null
            ratingLog('warn', 'Failed to extract session ID from URL', { url });
            return null;
        }
    }

    // ========================================================================
    // SECTION 2.2: Storage Operations
    // ========================================================================

    /**
     * Load ratings from localStorage into memory cache
     * 
     * @returns {Object} The loaded ratings object (also cached internally)
     * 
     * @description
     * Reads the persisted ratings from localStorage and parses the JSON.
     * If no data exists or parsing fails, initializes with empty object.
     * Always safe to call - handles errors gracefully.
     * 
     * @example
     * manager.load();
     * console.log(`Loaded ${manager.getRatedCount()} ratings`);
     */
    load() {
        try {
            // Read raw data from localStorage
            const data = window.localStorage.getItem(this.storageKey);

            // Parse JSON or initialize empty
            this._cache = data ? JSON.parse(data) : {};

            const ratingCount = Object.keys(this._cache).length;
            ratingLog('info', `Loaded ${ratingCount} ratings for session ${this.sessionId}`);
            console.log(`[RatingManager] Loaded ${ratingCount} ratings for session ${this.sessionId.slice(0, 8)}...`);
        } catch (e) {
            // JSON parse error or storage access error
            ratingLog('error', 'Load failed', { error: e.message });
            console.error('[RatingManager] Load failed:', e);
            this._cache = {};
        }

        return this._cache;
    }

    /**
     * Save current ratings cache to localStorage
     * 
     * @description
     * Persists the in-memory cache to localStorage as JSON.
     * Called automatically after setRating() and removeRating().
     * Handles errors gracefully (logs but doesn't throw).
     */
    save() {
        try {
            window.localStorage.setItem(this.storageKey, JSON.stringify(this._cache));
            ratingLog('debug', 'Ratings saved to localStorage');

            // Auto-backup to chrome.storage after each save
            this.backupToStorage();
        } catch (e) {
            // Storage quota exceeded or access denied
            ratingLog('error', 'Save failed', { error: e.message });
            console.error('[RatingManager] Save failed:', e);
        }
    }

    // ========================================================================
    // SECTION 2.2.1: Chrome Storage Backup (Blindspot 5 Fix)
    // ========================================================================

    /**
     * Backup ratings to chrome.storage.local
     * 
     * @async
     * @description
     * Backs up the current ratings to chrome.storage.local which persists
     * even when the user clears browsing data. This provides a secondary
     * storage layer for important rating data.
     * 
     * @example
     * await manager.backupToStorage();
     */
    async backupToStorage() {
        if (!RatingManager.hasDirectStorageAccess()) {
            ratingLog('debug', 'No direct storage access - skipping backup');
            return;
        }

        try {
            const backupKey = `pa_ratings_backup_${this.sessionId}`;
            await chrome.storage.local.set({
                [backupKey]: {
                    ratings: this._cache,
                    backedUpAt: Date.now(),
                    sessionId: this.sessionId
                }
            });
            ratingLog('debug', `Backed up ratings to chrome.storage`);
            console.log('[RatingManager] Backed up to chrome.storage');
        } catch (e) {
            ratingLog('error', 'Backup to chrome.storage failed', { error: e.message });
        }
    }

    /**
     * Restore ratings from chrome.storage.local backup
     * 
     * @async
     * @returns {boolean} True if backup was restored, false otherwise
     * 
     * @description
     * Attempts to restore ratings from chrome.storage.local backup.
     * Use this when localStorage is empty but a backup might exist
     * (e.g., after user cleared browsing data).
     * 
     * @example
     * if (manager.getRatedCount() === 0) {
     *     const restored = await manager.restoreFromStorage();
     *     if (restored) console.log('Ratings restored from backup!');
     * }
     */
    async restoreFromStorage() {
        if (!RatingManager.hasDirectStorageAccess()) {
            ratingLog('debug', 'No direct storage access - cannot restore');
            return false;
        }

        try {
            const backupKey = `pa_ratings_backup_${this.sessionId}`;
            const result = await chrome.storage.local.get(backupKey);
            const backup = result[backupKey];

            if (backup && backup.ratings && Object.keys(backup.ratings).length > 0) {
                this._cache = backup.ratings;
                this.save(); // Persist to localStorage

                const ratingCount = Object.keys(this._cache).length;
                const backupAge = Date.now() - backup.backedUpAt;
                const ageMinutes = Math.round(backupAge / 60000);

                ratingLog('info', `Restored ${ratingCount} ratings from backup (${ageMinutes}m old)`);
                console.log(`[RatingManager] Restored ${ratingCount} ratings from backup`);
                return true;
            }

            return false;
        } catch (e) {
            ratingLog('error', 'Restore from chrome.storage failed', { error: e.message });
            return false;
        }
    }

    /**
     * Backup all localStorage ratings to chrome.storage
     * 
     * @static
     * @async
     * @description
     * Scans all localStorage keys for rating data and backs them all
     * up to chrome.storage.local. Useful for one-time bulk backup.
     * 
     * @example
     * await RatingManager.backupAllRatings();
     */
    static async backupAllRatings() {
        if (!RatingManager.hasDirectStorageAccess()) {
            console.warn('[RatingManager] No storage access for bulk backup');
            return;
        }

        try {
            const allBackups = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(RATINGS_KEY_PREFIX)) {
                    const sessionId = key.replace(RATINGS_KEY_PREFIX, '');
                    const data = localStorage.getItem(key);
                    if (data) {
                        allBackups[`pa_ratings_backup_${sessionId}`] = {
                            ratings: JSON.parse(data),
                            backedUpAt: Date.now(),
                            sessionId: sessionId
                        };
                    }
                }
            }

            if (Object.keys(allBackups).length > 0) {
                await chrome.storage.local.set(allBackups);
                console.log(`[RatingManager] Backed up ${Object.keys(allBackups).length} sessions to chrome.storage`);
            }
        } catch (e) {
            console.error('[RatingManager] Bulk backup failed:', e);
        }
    }

    // ========================================================================
    // SECTION 2.3: Rating CRUD Operations
    // ========================================================================

    /**
     * Get the rating for a specific conversation turn
     * 
     * @param {number} turnIndex - Zero-based index of the turn
     * @returns {RatingData|null} Rating data object, or null if not rated
     * 
     * @description
     * Retrieves the rating for a specific turn. Returns null if:
     * - The turn hasn't been rated
     * - The cache hasn't been loaded (with warning)
     * 
     * @example
     * const rating = manager.getRating(0);
     * if (rating) {
     *     console.log(`Turn 0 rated ${rating.rating} stars`);
     * }
     */
    getRating(turnIndex) {
        // Warn if cache not loaded
        if (!this._cache) {
            ratingLog('warn', 'Cache not loaded - call load() first');
            console.warn('[RatingManager] Cache not loaded. Call load() first.');
            return null;
        }

        // Build turn key and lookup
        const key = `turn_${turnIndex}`;
        return this._cache[key] || null;
    }

    /**
     * Set or update the rating for a specific turn
     * 
     * @param {number} turnIndex - Zero-based index of the turn
     * @param {number} rating - Star rating value (1-5)
     * @throws {Error} If rating is not between 1 and 5
     * 
     * @description
     * Sets the rating for a turn and persists to localStorage.
     * Automatically loads cache if not already loaded.
     * Overwrites any existing rating for this turn.
     * 
     * @example
     * manager.setRating(3, 5); // Rate turn 3 with 5 stars
     */
    setRating(turnIndex, rating) {
        // === INPUT VALIDATION ===
        if (rating < 1 || rating > 5) {
            throw new Error('[RatingManager] Rating must be between 1 and 5');
        }

        // === ENSURE CACHE LOADED ===
        if (!this._cache) {
            this.load();
        }

        // === STORE RATING ===
        const key = `turn_${turnIndex}`;
        this._cache[key] = {
            rating: rating,
            ratedAt: Date.now()
        };

        // === PERSIST ===
        this.save();

        ratingLog('info', `Set rating ${rating}★ for turn ${turnIndex}`);
        console.log(`[RatingManager] Set rating ${rating} stars for turn ${turnIndex}`);
    }

    /**
     * Remove the rating for a specific turn
     * 
     * @param {number} turnIndex - Zero-based index of the turn
     * 
     * @description
     * Deletes the rating for a turn. No-op if turn wasn't rated.
     * Automatically persists the change to localStorage.
     * 
     * @example
     * manager.removeRating(3); // Remove rating from turn 3
     */
    removeRating(turnIndex) {
        // Ensure cache loaded
        if (!this._cache) {
            this.load();
        }

        const key = `turn_${turnIndex}`;
        delete this._cache[key];

        // Persist change
        this.save();

        ratingLog('info', `Removed rating for turn ${turnIndex}`);
        console.log(`[RatingManager] Removed rating for turn ${turnIndex}`);
    }

    // ========================================================================
    // SECTION 2.4: Bulk Operations
    // ========================================================================

    /**
     * Get all ratings for this session
     * 
     * @returns {Object} Map of turn keys to rating data
     * 
     * @description
     * Returns the full ratings object. Keys are in format "turn_N".
     * Returns empty object if cache not loaded.
     * 
     * @example
     * const all = manager.getAllRatings();
     * // { "turn_0": { rating: 4, ratedAt: ... }, "turn_2": { rating: 5, ratedAt: ... } }
     */
    getAllRatings() {
        return this._cache || {};
    }

    /**
     * Get ratings as a sorted array for scraper integration
     * 
     * @returns {RatingInfo[]} Array of rating info objects sorted by turnIndex
     * 
     * @description
     * Transforms the internal rating map into a flat array suitable for
     * inclusion in conversation scraper output. Sorted by turn index.
     * 
     * @example
     * const ratings = manager.getRatingsArray();
     * // [{ turnIndex: 0, rating: 4, ratedAt: ... }, { turnIndex: 2, rating: 5, ratedAt: ... }]
     */
    getRatingsArray() {
        const ratings = [];

        // Iterate over cached ratings
        for (const [key, value] of Object.entries(this._cache || {})) {
            // Parse turn index from key format "turn_N"
            const match = key.match(/^turn_(\d+)$/);
            if (match) {
                ratings.push({
                    turnIndex: parseInt(match[1]),
                    rating: value.rating,
                    ratedAt: value.ratedAt
                });
            }
        }

        // Sort by turn index for consistent ordering
        return ratings.sort((a, b) => a.turnIndex - b.turnIndex);
    }

    // ========================================================================
    // SECTION 2.5: Utility Methods
    // ========================================================================

    /**
     * Check if a turn has a rating
     * 
     * @param {number} turnIndex - Zero-based turn index
     * @returns {boolean} True if turn has been rated
     * 
     * @example
     * if (manager.hasRating(2)) {
     *     // Show "rated" indicator
     * }
     */
    hasRating(turnIndex) {
        return this.getRating(turnIndex) !== null;
    }

    /**
     * Get the count of rated turns
     * 
     * @returns {number} Number of turns that have ratings
     * 
     * @example
     * console.log(`${manager.getRatedCount()} of ${totalTurns} turns rated`);
     */
    getRatedCount() {
        return Object.keys(this._cache || {}).length;
    }

    /**
     * Clear all ratings for this session
     * 
     * @description
     * Removes all ratings from cache and localStorage.
     * Use with caution - this is irreversible.
     * 
     * @example
     * manager.clearAll(); // Remove all ratings
     */
    clearAll() {
        this._cache = {};

        try {
            window.localStorage.removeItem(this.storageKey);
            ratingLog('info', `Cleared all ratings for session ${this.sessionId}`);
            console.log(`[RatingManager] Cleared all ratings for session ${this.sessionId.slice(0, 8)}...`);
        } catch (e) {
            ratingLog('error', 'Clear failed', { error: e.message });
            console.error('[RatingManager] Clear failed:', e);
        }
    }
}

// ============================================================================
// SECTION 3: Singleton Instance for Current Session
// ============================================================================
// Provides a convenient way to get a RatingManager for the current page
// without needing to extract the session ID manually.
// ============================================================================

/** @type {RatingManager|null} Cached instance for current session */
let _currentRatingManager = null;

/**
 * Get or create RatingManager for the current page's session
 * 
 * @returns {RatingManager|null} Manager instance, or null if not on a valid session page
 * 
 * @description
 * Factory function that extracts the session ID from the current URL
 * and returns a cached RatingManager instance. Returns null if the
 * current page doesn't have a valid session ID.
 * 
 * @example
 * const manager = getCurrentRatingManager();
 * if (manager) {
 *     manager.load();
 *     manager.setRating(0, 5);
 * }
 */
function getCurrentRatingManager() {
    // Return cached instance if available
    if (_currentRatingManager) {
        return _currentRatingManager;
    }

    // Extract session ID from current URL
    const sessionId = RatingManager.extractSessionId(window.location.href);

    if (sessionId) {
        _currentRatingManager = new RatingManager(sessionId);
        ratingLog('info', `Created RatingManager for current session: ${sessionId}`);
        return _currentRatingManager;
    }

    // Not on a valid session page
    ratingLog('warn', 'Cannot create RatingManager - no session ID in URL');
    return null;
}

// ============================================================================
// SECTION 4: Module Exports
// ============================================================================
// Export for both browser (window) and Node.js (module.exports) environments.
// ============================================================================

// Browser environment - attach to window for global access
if (typeof window !== 'undefined') {
    window.RatingManager = RatingManager;
    window.getCurrentRatingManager = getCurrentRatingManager;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RatingManager, getCurrentRatingManager };
}

// Log ready state
ratingLog('info', 'RatingManager module ready');
console.log('[RatingManager] Rating system ready');
