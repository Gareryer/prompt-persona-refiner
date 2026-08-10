/**
 * @fileoverview Options Page - Main Entry Point
 * 
 * Entry point for the extension's options/settings page. Initializes all
 * configuration UI components when the page loads.
 * 
 * @description
 * The options page provides a user-friendly interface for configuring:
 * - AI Model connections (Gemini, OpenAI, Anthropic, OpenRouter)
 * - API key management with secure storage
 * - Model parameters (temperature, max tokens)
 * - Active model selection
 * 
 * This file serves as the bootstrap for the options page, delegating
 * the actual UI rendering to ModelManagerUI.
 * 
 * @module options/index
 * @requires ModelManagerUI - For rendering the model configuration interface
 * 
 * @see {@link ../model/model-manager.js} - Backend model storage
 * @see {@link ./model-manager-ui.js} - UI component
 */

// ============================================================================
// DOM READY HANDLER
// ============================================================================

/**
 * Initialize the options page when DOM is ready
 * 
 * @listens DOMContentLoaded
 * 
 * @description
 * Uses DOMContentLoaded (not window.load) to initialize as soon as the
 * DOM is parsed, without waiting for stylesheets and images. This provides
 * faster perceived load time.
 * 
 * Initialization steps:
 * 1. Create ModelManagerUI instance
 * 2. Initialize with container element ID
 * 3. Handle any errors with user-friendly message
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Options] Initializing options page...');

    // =========================================================================
    // SECTION 0: Theme Controller Initialization
    // =========================================================================
    if (typeof ThemeController !== 'undefined') {
        await ThemeController.init();

        // Set up theme toggle button
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const themeToggleIcon = themeToggleBtn?.querySelector('.theme-toggle-icon');

        // Update icon based on current theme
        const updateThemeIcon = () => {
            if (themeToggleIcon) {
                themeToggleIcon.textContent = ThemeController.getResolvedTheme() === 'dark' ? '🌙' : '☀️';
            }
        };
        updateThemeIcon();

        themeToggleBtn?.addEventListener('click', async () => {
            await ThemeController.toggleTheme();
            updateThemeIcon();
            console.log('[Options] Theme toggled to:', ThemeController.getResolvedTheme());
        });

        // Subscribe to theme changes
        ThemeController.subscribe(updateThemeIcon);
    }

    // =========================================================================
    // SECTION 1: Model Manager UI Initialization
    // =========================================================================
    // The Model Manager UI handles all AI model configuration including
    // API keys, model selection, and connection testing.
    // =========================================================================

    try {
        // Create UI instance
        const modelManagerUI = new ModelManagerUI();

        // Initialize with the container element ID from index.html
        // This triggers: model loading, DOM rendering, event binding
        await modelManagerUI.init('model-manager-container');

        console.log('[Options] Model Manager UI initialized successfully');
    } catch (error) {
        // === ERROR HANDLING ===
        // Display a user-friendly error message in the container
        // This handles cases like:
        // - Script loading failures
        // - Storage access errors
        // - DOM element not found

        console.error('[Options] Failed to initialize Model Manager UI:', error);

        // Find the container and show error message
        const container = document.getElementById('model-manager-container');
        if (container) {
            container.innerHTML = `
                <div class="error-placeholder" style="padding: 24px; color: #ef4444; text-align: center;">
                    <p style="font-size: 1.2em; margin-bottom: 8px;">Failed to load Model Manager</p>
                    <p style="color: #888; margin-bottom: 16px;">${error.message}</p>
                    <p style="font-size: 0.9em;">
                        Please refresh the page and try again.<br>
                        If the problem persists, try reinstalling the extension.
                    </p>
                </div>
            `;
        }
    }
});

// ============================================================================
// FUTURE: Additional Options Sections
// ============================================================================
// When adding new configuration sections (e.g., appearance, behavior),
// initialize them here following the same pattern:
//
// try {
//     const newUI = new NewSectionUI();
//     await newUI.init('new-section-container');
//     console.log('[Options] New Section initialized');
// } catch (error) {
//     console.error('[Options] Failed to initialize New Section:', error);
// }
// ============================================================================
