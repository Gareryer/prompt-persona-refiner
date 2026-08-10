/**
 * @fileoverview Standalone Theme Controller for Prompt Assistant Extension
 * 
 * @description
 * Manages theme preference independently of host page.
 * Stores preference in chrome.storage.local and applies via data-theme attribute.
 * Supports three modes: system, light, dark.
 * 
 * @module theme/theme-controller
 * 
 * @example
 * // Initialize on page load
 * ThemeController.init();
 * 
 * // Toggle theme
 * ThemeController.toggleTheme();
 * 
 * // Set specific mode
 * ThemeController.setMode('dark');
 */

// ============================================================================
// SECTION 1: Theme Controller Class
// ============================================================================

/**
 * ThemeController - Centralized standalone theme management
 * 
 * @class
 * @description
 * Singleton-style static class that manages theme preference storage,
 * application, and synchronization across all extension contexts.
 */
class ThemeController {
    /** @type {string} Storage key for theme mode */
    static STORAGE_KEY = 'themeMode';

    /** @type {'system'|'light'|'dark'} Default mode when no preference set */
    static DEFAULT_MODE = 'system';

    /** @type {Array<Function>} Subscribers to theme changes */
    static #subscribers = [];

    /** @type {'light'|'dark'|null} Cached resolved theme */
    static #resolvedTheme = null;

    /** @type {MediaQueryList|null} System preference media query */
    static #systemMediaQuery = null;

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Initialize the theme controller
     * Sets up storage listener and applies initial theme
     * 
     * @returns {Promise<void>}
     */
    static async init() {
        // Get current mode and apply
        const mode = await this.getMode();
        this.#applyMode(mode);

        // Listen for storage changes (cross-context sync)
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes[this.STORAGE_KEY]) {
                    const newMode = changes[this.STORAGE_KEY].newValue || this.DEFAULT_MODE;
                    this.#applyMode(newMode);
                    this.#notifySubscribers();
                }
            });
        }

        // Listen for system preference changes
        if (window.matchMedia) {
            this.#systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.#systemMediaQuery.addEventListener('change', async () => {
                const currentMode = await this.getMode();
                if (currentMode === 'system') {
                    this.#applyMode('system');
                    this.#notifySubscribers();
                }
            });
        }

        console.log('[ThemeController] Initialized with mode:', mode);
    }

    /**
     * Get current theme mode from storage
     * 
     * @returns {Promise<'system'|'light'|'dark'>} Current mode
     */
    static async getMode() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return new Promise((resolve) => {
                chrome.storage.local.get([this.STORAGE_KEY], (result) => {
                    resolve(result[this.STORAGE_KEY] || this.DEFAULT_MODE);
                });
            });
        }
        return this.DEFAULT_MODE;
    }

    /**
     * Set theme mode and persist to storage
     * 
     * @param {'system'|'light'|'dark'} mode - Mode to set
     * @returns {Promise<void>}
     */
    static async setMode(mode) {
        if (!['system', 'light', 'dark'].includes(mode)) {
            console.warn('[ThemeController] Invalid mode:', mode);
            return;
        }

        if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: mode });
        }

        this.#applyMode(mode);
        this.#notifySubscribers();

        console.log('[ThemeController] Mode set to:', mode);
    }

    /**
     * Toggle between light and dark themes
     * If on system, switches to opposite of current resolved theme
     * 
     * @returns {Promise<void>}
     */
    static async toggleTheme() {
        const currentMode = await this.getMode();
        let newMode;

        if (currentMode === 'system') {
            // Switch to explicit opposite of current system theme
            newMode = this.getResolvedTheme() === 'dark' ? 'light' : 'dark';
        } else {
            // Toggle between light and dark
            newMode = currentMode === 'dark' ? 'light' : 'dark';
        }

        await this.setMode(newMode);
    }

    /**
     * Cycle through modes: system → light → dark → system
     * 
     * @returns {Promise<void>}
     */
    static async cycleMode() {
        const currentMode = await this.getMode();
        const modes = ['system', 'light', 'dark'];
        const currentIndex = modes.indexOf(currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        await this.setMode(modes[nextIndex]);
    }

    /**
     * Get the resolved theme (light/dark) based on current mode
     * 
     * @returns {'light'|'dark'} Resolved theme
     */
    static getResolvedTheme() {
        return this.#resolvedTheme || 'dark';
    }

    /**
     * Get appropriate icon name for current theme state
     * 
     * @returns {string} Material icon name
     */
    static getIcon() {
        return this.getResolvedTheme() === 'dark' ? 'dark_mode' : 'light_mode';
    }

    /**
     * Subscribe to theme changes
     * 
     * @param {Function} callback - Called with resolved theme when it changes
     * @returns {Function} Unsubscribe function
     */
    static subscribe(callback) {
        this.#subscribers.push(callback);
        return () => {
            const index = this.#subscribers.indexOf(callback);
            if (index > -1) this.#subscribers.splice(index, 1);
        };
    }

    // ========================================================================
    // Private Methods
    // ========================================================================

    /**
     * Apply mode to document
     * @private
     * @param {'system'|'light'|'dark'} mode
     */
    static #applyMode(mode) {
        let resolvedTheme;

        if (mode === 'system') {
            // Use system preference
            resolvedTheme = this.#getSystemPreference();
        } else {
            resolvedTheme = mode;
        }

        this.#resolvedTheme = resolvedTheme;

        // Apply to document
        document.documentElement.dataset.theme = resolvedTheme;
        document.documentElement.dataset.themeMode = mode;

        // Update any theme toggle icons on page
        this.#updateToggleIcons();
    }

    /**
     * Get system color scheme preference
     * @private
     * @returns {'light'|'dark'}
     */
    static #getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    }

    /**
     * Notify all subscribers of theme change
     * @private
     */
    static #notifySubscribers() {
        const theme = this.getResolvedTheme();
        this.#subscribers.forEach(callback => {
            try {
                callback(theme);
            } catch (err) {
                console.error('[ThemeController] Subscriber error:', err);
            }
        });
    }

    /**
     * Update all theme toggle icons on page
     * @private
     */
    static #updateToggleIcons() {
        const icon = this.getIcon();
        document.querySelectorAll('.theme-toggle-icon').forEach(el => {
            el.textContent = icon;
        });
    }
}

// ============================================================================
// SECTION 2: Module Exports
// ============================================================================

// Browser environment - attach to window
if (typeof window !== 'undefined') {
    window.ThemeController = ThemeController;
}

// Node.js environment (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeController };
}

console.log('[ThemeController] Module loaded');
