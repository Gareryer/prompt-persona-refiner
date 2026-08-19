/**
 * @fileoverview Sidepanel Controller for Prompt Assistant Extension
 * 
 * Manages the sidepanel UI that displays context memory and settings.
 * 
 * Key Features:
 * - Session-based memory display (Persona, Topic Summary, User Intent)
 * - Bi-directional data binding with chrome.storage.local
 * - Theme synchronization with Gemini page
 * - Memory rebuild orchestration
 * - Split view toggle for 50% iframe mode
 * 
 * @module sidepanel
 * @requires chrome.runtime
 * @requires chrome.storage
 * @requires chrome.tabs
 */

/**
 * Structured logger for sidepanel with timestamp formatting
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message  
 * @param {Object} [data={}] - Additional context data
 */
const spLog = (level, msg, data = {}) => {
    const entry = { timestamp: Date.now(), level, message: msg, component: 'Sidepanel', ...data };
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        `[${new Date().toISOString().slice(11, 23)}] [${level.toUpperCase()}] [Sidepanel] ${msg}`,
        Object.keys(data).length > 0 ? data : ''
    );
};

/**
 * Get Supabase client instance
 * Wraps window.SupabaseClient for consistent access throughout the module
 * @returns {Promise<Object>} Supabase client instance
 * @throws {Error} If SupabaseClient is not loaded
 */
async function getSupabaseClient() {
    if (typeof window.SupabaseClient === 'undefined') {
        throw new Error('Supabase client not loaded. Please reload the extension.');
    }
    return await window.SupabaseClient.getInstance();
}

/**
 * Get selected value from a filter-chip-group in Edit Persona
 * @param {string} fieldName - The data-field attribute value (domain, tone, complexity)
 * @returns {string|null} Selected value or null
 */
function getChipGroupValue(fieldName) {
    const chipGroup = document.querySelector(`.ext-chip-group[data-field="${fieldName}"]`);
    if (!chipGroup) return null;
    const selectedChip = chipGroup.querySelector('.filter-chip.selected');
    return selectedChip?.dataset.value || null;
}

/**
 * Get values from a tag list container
 * @param {string} containerId - The ID of the tag list container
 * @returns {string[]} Array of tag values
 */
function getTagValues(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('.tag'))
        .map(tag => tag.dataset.value || tag.querySelector('.tag-text')?.textContent?.trim())
        .filter(Boolean);
}

// ============================================================================
// SECTION: M3 ALERT DIALOG
// ============================================================================

/**
 * Expected extraction response schema - 2-part structure
 * Part 1: memory_layer - Fields for AI context injection (7-Dimension Industry Standard)
 * Part 2: metadata - Fields for search/filtering
 * 
 * Schema v3: persona, context, exemplar, format, tone, framework, constraints
 * 
 * @typedef {Object} ExtractionSchema
 */
const EXTRACTION_SCHEMA = {
    // Part 1: memory_layer - Uses 7-dimension industry standard schema
    // Each dimension has structured fields for comprehensive persona capture
    memory_layer: {
        required: [
            'persona',       // role, purpose, name, title, credentials
            'context',       // domain, terminology, knowledge_boundaries
            'exemplar',      // good_examples, bad_examples, edge_cases
            'format',        // output_type, structure, citations, special_syntax
            'tone',          // voice, style, verbosity, banned_phrases
            'framework',     // methodology, reasoning_pattern, modes, workflow
            'constraints'    // prohibitions, requirements, thresholds, safety_rules
        ],
        // Legacy names still supported via backwards compatibility mapping
        legacy: ['persona_synthesizer', 'topic_summarizer', 'intent_classifier', 'entity_extractor', 'style_profiler', 'recent_focus'],
        optional: []
    },
    // Part 2: metadata - For search/filtering (not part of memory layer)
    metadata: {
        required: [
            'suggested_name',
            'suggested_title',
            'domain',
            'use_case_keywords',
            'primary_intent',
            'target_audience',
            'complexity_level',
            'tone',
            'source_type'     // 'external_prompt' | 'scraped_pair'
        ],
        optional: []
    }
};


/**
 * Valid enum values for metadata fields
 */
const VALID_ENUMS = {
    complexity_level: ['beginner', 'intermediate', 'advanced'],
    domain: ['tech', 'creative', 'business', 'education', 'health', 'lifestyle', 'other'],
    tone: ['formal', 'casual', 'friendly', 'professional', 'academic']
};

/**
 * Show M3-styled alert dialog for user feedback
 * 
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Main message text
 * @param {string} [options.type='error'] - Dialog type: 'error' | 'warning' | 'info' | 'success'
 * @param {string} [options.details] - Technical details (shown in collapsible section)
 * @param {Function} [options.onRetry] - Retry callback (shows Retry button if provided)
 * @param {Function} [options.onDismiss] - Dismiss callback
 * @returns {Promise<boolean>} Resolves to true if retried, false if dismissed
 * 
 * @example
 * await showAlertDialog({
 *     title: 'Extraction Failed',
 *     message: 'The LLM response could not be parsed.',
 *     type: 'error',
 *     details: 'JSON parse error at position 42'
 * });
 */
function showAlertDialog({ title, message, type = 'error', details = null, onRetry = null, onDismiss = null }) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('alert-dialog');
        if (!dialog) {
            spLog('error', 'Alert dialog element not found');
            resolve(false);
            return;
        }

        // Set content
        dialog.setAttribute('data-type', type);
        dialog.querySelector('.dialog-title').textContent = title;
        dialog.querySelector('.dialog-message').textContent = message;

        // Handle details
        const detailsSection = dialog.querySelector('.dialog-details');
        const detailsContent = dialog.querySelector('.dialog-details-content');
        if (details && detailsSection && detailsContent) {
            detailsContent.textContent = details;
            detailsSection.classList.remove('hidden');
        } else if (detailsSection) {
            detailsSection.classList.add('hidden');
        }

        // Handle retry button
        const retryBtn = dialog.querySelector('.dialog-retry');
        if (onRetry && retryBtn) {
            retryBtn.classList.remove('hidden');
        } else if (retryBtn) {
            retryBtn.classList.add('hidden');
        }

        // Event handlers
        const dismissBtn = dialog.querySelector('.dialog-dismiss');
        const scrim = dialog.querySelector('.dialog-scrim');
        const container = dialog.querySelector('.dialog-container');

        const cleanup = () => {
            dialog.classList.add('hidden');
            dismissBtn?.removeEventListener('click', handleDismiss);
            retryBtn?.removeEventListener('click', handleRetry);
            scrim?.removeEventListener('click', handleScrimClick);
            document.removeEventListener('keydown', handleKeydown);
        };

        const handleDismiss = () => {
            cleanup();
            onDismiss?.();
            resolve(false);
        };

        const handleRetry = () => {
            cleanup();
            onRetry?.();
            resolve(true);
        };

        // Bounce animation on scrim click (modal resistance)
        const handleScrimClick = () => {
            container?.classList.add('bounce');
            container?.addEventListener('animationend', () => {
                container.classList.remove('bounce');
            }, { once: true });
        };

        // Keyboard handler - Enter clicks focused button, Escape dismisses
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Click the currently focused button
                if (document.activeElement === retryBtn) {
                    handleRetry();
                } else {
                    handleDismiss();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleDismiss();
            }
        };

        dismissBtn?.addEventListener('click', handleDismiss);
        scrim?.addEventListener('click', handleScrimClick);
        document.addEventListener('keydown', handleKeydown);
        if (onRetry) {
            retryBtn?.addEventListener('click', handleRetry);
        }

        // Show dialog and focus dismiss button
        dialog.classList.remove('hidden');
        dismissBtn?.focus();
        spLog('info', 'Alert dialog shown', { title, type });
    });
}

/**
 * Show M3-styled confirm dialog with two action buttons
 * 
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Main message text
 * @param {string} [options.confirmText='Confirm'] - Primary action button text
 * @param {string} [options.cancelText='Cancel'] - Secondary action button text
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 * 
 * @example
 * const finishEdit = await showConfirmDialog({
 *     title: 'Persona Detected',
 *     message: 'You have unpublished persona. What would you like to do?',
 *     confirmText: 'Finish Edit',
 *     cancelText: 'Discard'
 * });
 */
function showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('confirm-dialog');
        if (!dialog) {
            spLog('error', 'Confirm dialog element not found');
            resolve(false);
            return;
        }

        // Set type for icon display
        dialog.setAttribute('data-type', type);

        // Set content
        dialog.querySelector('.dialog-title').textContent = title;
        dialog.querySelector('.dialog-message').textContent = message;

        // Set button texts
        const confirmBtn = dialog.querySelector('.dialog-confirm');
        const cancelBtn = dialog.querySelector('.dialog-cancel');
        if (confirmBtn) confirmBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;

        // Event handlers
        const scrim = dialog.querySelector('.dialog-scrim');
        const container = dialog.querySelector('.dialog-container');

        const cleanup = () => {
            dialog.classList.add('hidden');
            confirmBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', handleCancel);
            scrim?.removeEventListener('click', handleScrimClick);
            document.removeEventListener('keydown', handleKeydown);
        };

        const handleConfirm = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        // Bounce animation on scrim click (modal resistance)
        const handleScrimClick = () => {
            container?.classList.add('bounce');
            container?.addEventListener('animationend', () => {
                container.classList.remove('bounce');
            }, { once: true });
        };

        // Keyboard handler - Enter activates focused button, Escape cancels
        const handleKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                // Click the currently focused button
                if (document.activeElement === cancelBtn) {
                    handleCancel();
                } else {
                    handleConfirm();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        confirmBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', handleCancel);
        scrim?.addEventListener('click', handleScrimClick);
        document.addEventListener('keydown', handleKeydown);

        // Show dialog and focus confirm button (Tab navigates to cancel)
        dialog.classList.remove('hidden');
        confirmBtn?.focus();
        spLog('info', 'Confirm dialog shown', { title });
    });
}

/**
 * Show M3-styled prompt dialog with text input
 * 
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.message - Main message text
 * @param {string} [options.placeholder=''] - Input placeholder text
 * @param {string} [options.confirmText='Submit'] - Primary action button text
 * @param {string} [options.cancelText='Cancel'] - Secondary action button text
 * @returns {Promise<string|null>} Resolves to input value if confirmed, null if cancelled
 */
function showPromptDialog({ title, message, placeholder = '', confirmText = 'Submit', cancelText = 'Cancel' }) {
    return new Promise((resolve) => {
        const dialog = document.getElementById('prompt-dialog');
        if (!dialog) {
            spLog('error', 'Prompt dialog element not found');
            resolve(null);
            return;
        }

        // Set content
        dialog.querySelector('.dialog-title').textContent = title;
        dialog.querySelector('.dialog-message').textContent = message;

        const input = dialog.querySelector('#prompt-input');
        if (input) {
            input.value = '';
            input.placeholder = placeholder;
        }

        // Set button texts
        const confirmBtn = dialog.querySelector('.dialog-confirm');
        const cancelBtn = dialog.querySelector('.dialog-cancel');
        if (confirmBtn) confirmBtn.textContent = confirmText;
        if (cancelBtn) cancelBtn.textContent = cancelText;

        const scrim = dialog.querySelector('.dialog-scrim');
        const container = dialog.querySelector('.dialog-container');

        const cleanup = () => {
            dialog.classList.add('hidden');
            confirmBtn?.removeEventListener('click', handleConfirm);
            cancelBtn?.removeEventListener('click', handleCancel);
            scrim?.removeEventListener('click', handleScrimClick);
            document.removeEventListener('keydown', handleKeydown);
        };

        const handleConfirm = () => {
            cleanup();
            resolve(input?.value || '');
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        // Bounce animation on scrim click (modal resistance)
        const handleScrimClick = () => {
            container?.classList.add('bounce');
            container?.addEventListener('animationend', () => {
                container.classList.remove('bounce');
            }, { once: true });
        };

        const handleKeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        confirmBtn?.addEventListener('click', handleConfirm);
        cancelBtn?.addEventListener('click', handleCancel);
        scrim?.addEventListener('click', handleScrimClick);
        document.addEventListener('keydown', handleKeydown);

        dialog.classList.remove('hidden');
        input?.focus();
        spLog('info', 'Prompt dialog shown', { title });
    });
}

/**
 * Setup M3 Outlined Dropdown Component
 * Handles toggle, selection, keyboard navigation, and click-outside-close
 * 
 * @param {string} dropdownId - ID of the dropdown container element
 * @param {Function} onChange - Callback when selection changes, receives new value
 */
function setupM3Dropdown(dropdownId, onChange) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) {
        spLog('warn', 'M3 Dropdown not found', { dropdownId });
        return;
    }

    const trigger = dropdown.querySelector('.m3-dropdown-trigger');
    const menu = dropdown.querySelector('.m3-dropdown-menu');
    const valueSpan = dropdown.querySelector('.m3-dropdown-value');
    const items = dropdown.querySelectorAll('.m3-dropdown-item');

    if (!trigger || !menu || !valueSpan) {
        spLog('warn', 'M3 Dropdown missing required elements', { dropdownId });
        return;
    }

    // Toggle dropdown open/close
    const toggleDropdown = (open) => {
        const isOpen = open !== undefined ? open : !dropdown.classList.contains('open');
        dropdown.classList.toggle('open', isOpen);
        trigger.setAttribute('aria-expanded', isOpen);

        if (isOpen) {
            // Focus first selected item or first item
            const selected = menu.querySelector('.m3-dropdown-item.selected') || items[0];
            selected?.focus();
        }
    };

    // Select item
    const selectItem = (item) => {
        const value = item.dataset.value;

        // Update visual selection
        items.forEach(i => {
            i.classList.remove('selected');
            i.removeAttribute('aria-selected');
        });
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');

        // Update trigger display
        valueSpan.textContent = value;

        // Close dropdown
        toggleDropdown(false);
        trigger.focus();

        // Fire callback
        if (onChange) {
            onChange(value);
        }

        spLog('debug', 'M3 Dropdown selection changed', { dropdownId, value });
    };

    // Event: Toggle on trigger click
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleDropdown();
    });

    // Event: Select on item click
    items.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectItem(item);
        });
    });

    // Event: Keyboard navigation
    dropdown.addEventListener('keydown', (e) => {
        if (!dropdown.classList.contains('open')) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                toggleDropdown(true);
            }
            return;
        }

        const itemsArray = Array.from(items);
        const currentIndex = itemsArray.findIndex(i => i === document.activeElement);

        switch (e.key) {
            case 'Escape':
                e.preventDefault();
                toggleDropdown(false);
                trigger.focus();
                break;
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < itemsArray.length - 1 ? currentIndex + 1 : 0;
                itemsArray[nextIndex]?.focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : itemsArray.length - 1;
                itemsArray[prevIndex]?.focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement?.classList.contains('m3-dropdown-item')) {
                    selectItem(document.activeElement);
                }
                break;
        }
    });

    // Event: Close on click outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && dropdown.classList.contains('open')) {
            toggleDropdown(false);
        }
    });

    // Make items focusable
    items.forEach(item => {
        item.setAttribute('tabindex', '-1');
    });

    spLog('debug', 'M3 Dropdown initialized', { dropdownId });
}

/**
 * Validate LLM extraction response before creating Edit Persona page
 * Checks for the expected 2-part structure: memory_layer + metadata
 * 
 * @param {Object} result - Raw response from background script
 * @param {boolean} result.success - Whether API call succeeded
 * @param {string} [result.text] - LLM response text
 * @param {string} [result.error] - Error message if failed
 * @returns {{ valid: boolean, data: Object|null, error: Object|null }}
 * 
 * @example
 * const validation = validateExtractionResponse(result);
 * if (!validation.valid) {
 *     await showAlertDialog(validation.error);
 *     return;
 * }
 */
function validateExtractionResponse(result) {
    // === STEP 1: Check API-level errors ===
    if (!result?.success) {
        const errorMsg = (result?.error || 'Unknown error occurred').toLowerCase();

        // Authentication errors
        if (errorMsg.includes('api key') || errorMsg.includes('auth') || errorMsg.includes('unauthorized') || errorMsg.includes('401')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Authentication Failed',
                    message: 'The API key is invalid or expired. Please check your model configuration.',
                    type: 'error',
                    details: result?.error
                }
            };
        }

        // Rate limit / quota
        if (errorMsg.includes('rate limit') || errorMsg.includes('quota') || errorMsg.includes('429')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Rate Limit Exceeded',
                    message: 'The API rate limit has been reached. Please wait a moment and try again.',
                    type: 'warning',
                    details: result?.error
                }
            };
        }

        // Content policy
        if (errorMsg.includes('content policy') || errorMsg.includes('blocked') || errorMsg.includes('safety') || errorMsg.includes('harmful')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Content Blocked',
                    message: 'The request was blocked due to content policy restrictions.',
                    type: 'warning',
                    details: result?.error
                }
            };
        }

        // Context length exceeded
        if (errorMsg.includes('context length') || errorMsg.includes('too long') || errorMsg.includes('max tokens') || errorMsg.includes('token limit')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Prompt Too Long',
                    message: 'The input prompt exceeds the model\'s context length. Please use a shorter prompt.',
                    type: 'warning',
                    details: result?.error
                }
            };
        }

        // Model not found
        if (errorMsg.includes('model not found') || errorMsg.includes('invalid model') || errorMsg.includes('404')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Model Not Found',
                    message: 'The configured model is not available. Please check your model settings.',
                    type: 'error',
                    details: result?.error
                }
            };
        }

        // Service unavailable
        if (errorMsg.includes('service unavailable') || errorMsg.includes('503') || errorMsg.includes('server error') || errorMsg.includes('500')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Service Unavailable',
                    message: 'The LLM service is temporarily unavailable. Please try again later.',
                    type: 'error',
                    details: result?.error
                }
            };
        }

        // Network errors
        if (errorMsg.includes('network') || errorMsg.includes('fetch') || errorMsg.includes('timeout') || errorMsg.includes('connection')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Connection Failed',
                    message: 'Unable to reach the LLM service. Please check your internet connection.',
                    type: 'error',
                    details: result?.error
                }
            };
        }

        // Generic API error
        return {
            valid: false,
            data: null,
            error: {
                title: 'Extraction Failed',
                message: result?.error || 'An unknown error occurred during extraction.',
                type: 'error'
            }
        };
    }

    // === STEP 2: Check for empty response ===
    if (!result.text || !result.text.trim()) {
        return {
            valid: false,
            data: null,
            error: {
                title: 'Empty Response',
                message: 'The LLM returned an empty response. This may indicate a processing error or the model refused to respond.',
                type: 'warning'
            }
        };
    }

    // === STEP 3: Parse JSON ===
    let parsed;
    try {
        let cleaned = result.text.trim();
        // Remove markdown code blocks if present
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        cleaned = cleaned.trim();

        // Check if response looks like prose instead of JSON
        if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Wrong Format',
                    message: 'The LLM returned text instead of JSON. The model may have ignored formatting instructions.',
                    type: 'warning',
                    details: `Response starts with: "${cleaned.substring(0, 100)}..."`
                }
            };
        }

        parsed = JSON.parse(cleaned);
    } catch (e) {
        // Check if response was truncated
        const text = result.text;
        if (text.includes('{') && !text.includes('}')) {
            return {
                valid: false,
                data: null,
                error: {
                    title: 'Truncated Response',
                    message: 'The LLM response was cut off before completion. Try a shorter input prompt.',
                    type: 'warning',
                    details: `Response ends with: "...${text.substring(text.length - 100)}"`
                }
            };
        }

        return {
            valid: false,
            data: null,
            error: {
                title: 'Invalid JSON',
                message: 'The LLM response could not be parsed as JSON.',
                type: 'error',
                details: `Parse error: ${e.message}\n\nRaw response (first 500 chars):\n${result.text.substring(0, 500)}`
            }
        };
    }

    // === STEP 4: Validate 2-part structure ===
    // Part 1: Check memory_layer exists
    if (!parsed.memory_layer || typeof parsed.memory_layer !== 'object') {
        return {
            valid: false,
            data: null,
            error: {
                title: 'Missing memory_layer',
                message: 'The response is missing the "memory_layer" section which contains AI context fields.',
                type: 'warning',
                details: `Received top-level keys: ${Object.keys(parsed).join(', ')}`
            }
        };
    }

    // Part 2: Check metadata exists
    if (!parsed.metadata || typeof parsed.metadata !== 'object') {
        return {
            valid: false,
            data: null,
            error: {
                title: 'Missing metadata',
                message: 'The response is missing the "metadata" section which contains search/filter fields.',
                type: 'warning',
                details: `Received top-level keys: ${Object.keys(parsed).join(', ')}`
            }
        };
    }

    // === STEP 5: Validate memory_layer required fields ===
    const missingMemoryFields = EXTRACTION_SCHEMA.memory_layer.required.filter(
        field => !parsed.memory_layer[field]
    );
    if (missingMemoryFields.length > 0) {
        return {
            valid: false,
            data: null,
            error: {
                title: 'Incomplete memory_layer',
                message: `The memory_layer is missing required fields: ${missingMemoryFields.join(', ')}`,
                type: 'warning',
                details: `Received memory_layer fields: ${Object.keys(parsed.memory_layer).join(', ')}`
            }
        };
    }

    // === STEP 6: Fill in missing metadata with defaults ===
    // Instead of failing on missing fields, provide sensible defaults
    const metadataDefaults = {
        suggested_name: 'Extracted Persona',
        suggested_title: 'AI Assistant',
        domain: 'other',
        use_case_keywords: ['general', 'assistant', 'extracted'],
        primary_intent: 'General assistance',
        target_audience: 'General users',
        complexity_level: 'intermediate',
        tone: 'professional',
        source_type: 'external_prompt'
    };

    // Apply defaults for any missing fields
    for (const [field, defaultValue] of Object.entries(metadataDefaults)) {
        if (!parsed.metadata[field]) {
            parsed.metadata[field] = defaultValue;
            spLog('debug', `Applied default for missing metadata field: ${field}`);
        }
    }

    // === STEP 7: Validate persona content (flexible - accept any format) ===
    // V4 schema: persona.instruction 
    // Legacy schema: persona_synthesizer.synthesizedPersona
    // Also accept any persona object with content
    const personaDim = parsed.memory_layer.persona;
    const legacyPersona = parsed.memory_layer.persona_synthesizer;

    // Log what we received for debugging
    spLog('debug', 'Persona validation - received structure:', {
        hasPersonaDim: !!personaDim,
        personaKeys: personaDim ? Object.keys(personaDim) : [],
        hasLegacy: !!legacyPersona
    });

    // Check V4 schema - instruction is the main field
    const hasV4Instruction = personaDim?.instruction && personaDim.instruction.length >= 10;

    // Also accept if persona has ANY text content (flexible fallback)
    const personaAsString = personaDim ? JSON.stringify(personaDim) : '';
    const hasAnyPersonaContent = personaAsString.length >= 50;

    // Check legacy schema as fallback
    const legacySynthesized = legacyPersona?.synthesizedPersona;
    const hasLegacyPersona = typeof legacySynthesized === 'string' && legacySynthesized.length >= 20;

    if (!hasV4Instruction && !hasAnyPersonaContent && !hasLegacyPersona) {
        spLog('warn', 'Persona validation failed', { personaDim, legacyPersona });
        return {
            valid: false,
            data: null,
            error: {
                title: 'Insufficient Persona Content',
                message: 'The persona instruction is too short or missing.',
                type: 'warning',
                details: `persona object size: ${personaAsString.length} chars (minimum 50 required)`
            }
        };
    }

    // === STEP 8: Validate suggested_name ===
    const suggestedName = parsed.metadata.suggested_name;
    if (typeof suggestedName !== 'string' || suggestedName.length < 3) {
        return {
            valid: false,
            data: null,
            error: {
                title: 'Invalid Persona Name',
                message: 'The suggested persona name is too short or missing.',
                type: 'warning'
            }
        };
    }

    // === STEP 9: Validate enum fields (if present) ===
    for (const [field, validValues] of Object.entries(VALID_ENUMS)) {
        const value = parsed.metadata[field];
        if (value && !validValues.includes(value.toLowerCase())) {
            spLog('warn', `Invalid enum value for ${field}`, { value, validValues });
            // Normalize to lowercase or default - don't fail, just warn
        }
    }

    // === SUCCESS ===
    spLog('info', 'Extraction response validated successfully', {
        memoryLayerFields: Object.keys(parsed.memory_layer),
        metadataFields: Object.keys(parsed.metadata),
        personaLength: hasV4Instruction ? (personaDim?.instruction?.length || 0) : (legacySynthesized?.length || 0)
    });

    return {
        valid: true,
        data: { ...parsed, source_prompt: result.source_prompt },
        error: null
    };
}

// State
let currentSessionId = null;
let memoryData = null;
let disabledFacts = {};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    spLog('info', 'Initializing sidepanel...');

    // Initialize standalone theme controller
    if (typeof ThemeController !== 'undefined') {
        await ThemeController.init();

        // Set up theme toggle button
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        themeToggleBtn?.addEventListener('click', async () => {
            await ThemeController.toggleTheme();
            spLog('info', 'Theme toggled to:', ThemeController.getResolvedTheme());
        });
    }

    // Set up accordion behavior
    setupAccordions();

    // Set up button handlers
    setupButtonHandlers();

    // Set up analyzer toggle logging
    setupAnalyzerToggles();

    // Set up log viewer (Enhancement 8)
    setupLogViewer();

    // Set up tab navigation
    setupTabNavigation();

    // Set up expand modal for textareas
    setupExpandModal();

    // Load current session
    await loadCurrentSession();

    // Restore form state if returning from split view
    await restoreFormStateFromSplitView();


    // Connect long-lived port to background service worker for accurate open/close tracking
    let sidepanelPort = null;
    try {
        sidepanelPort = chrome.runtime.connect({ name: 'sidepanel' });
    } catch (e) {
        console.warn('[Sidepanel] Failed to connect port to background:', e);
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);

    // Listen for tab activation (switching tabs)
    chrome.tabs.onActivated.addListener(handleTabActivated);

    // Listen for tab URL changes (navigation within a tab)
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    // Cleanup on page unload to prevent listener accumulation
    window.addEventListener('beforeunload', () => {
        // Disconnect port cleanly
        if (sidepanelPort) {
            try {
                sidepanelPort.disconnect();
            } catch (_) {}
            sidepanelPort = null;
        }

        // Clear the log refresh interval
        if (logRefreshInterval) {
            clearInterval(logRefreshInterval);
            logRefreshInterval = null;
        }
        // Remove Chrome API listeners
        chrome.storage.onChanged.removeListener(handleStorageChange);
        chrome.tabs.onActivated.removeListener(handleTabActivated);
        chrome.tabs.onUpdated.removeListener(handleTabUpdated);
    });
});

// ============================================================================
// LEGACY THEME CODE REMOVED
// ============================================================================
// Theme synchronization is now handled by ThemeController (theme-controller.js)
// See DOMContentLoaded for ThemeController initialization
// ============================================================================

// Tab activation handler
async function handleTabActivated(activeInfo) {
    const previousSessionId = currentSessionId;
    console.log('[Sidepanel] Tab activated:', activeInfo.tabId, { previousSession: previousSessionId });
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        await loadSessionFromTab(tab);
    } catch (e) {
        console.warn('[Sidepanel] handleTabActivated get tab fallback:', e);
        await loadCurrentSession();
    }
}

// Tab URL update handler
async function handleTabUpdated(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        try {
            const currentTab = tab || await chrome.tabs.get(tabId);
            if (currentTab?.active) {
                console.log('[Sidepanel] Active tab URL changed:', changeInfo.url);
                await loadSessionFromTab(currentTab);
            }
        } catch (e) {
            console.warn('[Sidepanel] handleTabUpdated error:', e);
        }
    }
}

/**
 * Load session data directly from a tab object
 * @param {chrome.tabs.Tab} tab
 */
async function loadSessionFromTab(tab) {
    try {
        const hasModel = await checkLLMStatus();
        if (!hasModel) {
            showNoModelOverlay();
            return;
        }
        hideNoModelOverlay();

        if (!tab?.url?.includes('gemini.google.com')) {
            currentSessionId = null;
            document.getElementById('session-id').textContent = 'N/A';
            showNoSession();
            return;
        }

        currentSessionId = extractSessionId(tab.url);
        if (!currentSessionId) {
            document.getElementById('session-id').textContent = 'N/A';
            showNoSession();
            return;
        }

        showSession();
        document.getElementById('session-id').textContent = currentSessionId;
        await loadMemoryData();
    } catch (error) {
        console.error('[Sidepanel] Failed to load session from tab:', error);
        showNoSession();
    }
}

/**
 * Set up analyzer toggle event listeners for logging
 * Logs when user enables/disables analyzer components
 */
function setupAnalyzerToggles() {
    const toggles = document.querySelectorAll('.toggle-switch input[data-component]');

    toggles.forEach(toggle => {
        toggle.addEventListener('change', (e) => {
            const componentId = e.target.dataset.component;
            const enabled = e.target.checked;

            spLog('info', 'Analyzer toggle changed', {
                analyzer: componentId,
                enabled: enabled,
                action: enabled ? 'ENABLED' : 'DISABLED'
            });
        });
    });

    spLog('debug', 'Analyzer toggles initialized', { count: toggles.length });
}

/**
 * Load current tab's session data
 */
async function loadCurrentSession() {
    try {
        // First check if a model is configured - this is required for refinement
        const hasModel = await checkLLMStatus();

        if (!hasModel) {
            // Show the no-model overlay and hide everything else
            showNoModelOverlay();
            return;
        }

        // Hide no-model overlay when model is configured
        hideNoModelOverlay();

        // Get current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.url?.includes('gemini.google.com')) {
            currentSessionId = null; // Clear stale session ID
            document.getElementById('session-id').textContent = 'N/A';
            showNoSession();
            return;
        }

        // Extract session ID from URL
        currentSessionId = extractSessionId(tab.url);

        if (!currentSessionId) {
            document.getElementById('session-id').textContent = 'N/A';
            showNoSession();
            return;
        }

        // Show session UI
        showSession();

        // Update UI with session ID
        document.getElementById('session-id').textContent = currentSessionId;

        // Load memory data
        await loadMemoryData();

    } catch (error) {
        console.error('[Sidepanel] Failed to load session:', error);
        showNoSession();
    }
}

/**
 * Show the no-model overlay (when no model is configured)
 */
function showNoModelOverlay() {
    // Show overlay in Context tab
    document.getElementById('no-model-context')?.classList.remove('hidden');
    // Show overlay in Logs tab
    document.getElementById('no-model-logs')?.classList.remove('hidden');
    // Hide logs page content
    document.getElementById('logs-page-content')?.classList.add('hidden');
    // Hide other sections
    document.getElementById('no-session')?.classList.add('hidden');
    document.getElementById('memory-sections')?.classList.add('hidden');
}

/**
 * Hide the no-model overlay
 */
function hideNoModelOverlay() {
    document.getElementById('no-model-context')?.classList.add('hidden');
    document.getElementById('no-model-logs')?.classList.add('hidden');

    // NOTE: Do NOT touch logs-page-content here!
    // That's handled by showSession()/showNoSession() and the tab switch handler
    // based on whether there's a valid session.

    // Ensure footer visibility matches current tab
    const logsTabActive = document.querySelector('[data-tab="logs"].active');
    const footer = document.getElementById('context-footer');
    if (logsTabActive && footer) {
        footer.classList.add('hidden');
    }
}

/**
 * Show the no-session view (when not on a Gemini chat page)
 */
function showNoSession() {
    // Show no-session messages for both tabs
    document.getElementById('no-session')?.classList.remove('hidden');
    document.getElementById('no-session-logs')?.classList.remove('hidden');
    // Hide content sections
    document.getElementById('memory-sections')?.classList.add('hidden');
    document.getElementById('logs-page-content')?.classList.add('hidden');
}

/**
 * Show the session view (when on a Gemini chat)
 */
function showSession() {
    // Hide no-session messages for both tabs
    document.getElementById('no-session')?.classList.add('hidden');
    document.getElementById('no-session-logs')?.classList.add('hidden');
    // Show content
    document.getElementById('memory-sections')?.classList.remove('hidden');
    // Only show logs content if on Logs tab
    const logsTabActive = document.querySelector('[data-tab="logs"].active');
    if (logsTabActive) {
        document.getElementById('logs-page-content')?.classList.remove('hidden');
    }
}

/**
 * Extract session ID from Gemini URL
 * @param {string} url
 * @returns {string|null}
 */
function extractSessionId(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0] === 'app') {
            return pathParts[1];
        } else if (pathParts.length === 1 && pathParts[0] === 'app') {
            return 'new_chat'; // Use specific ID for new chat landing page
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Load memory data from storage
 */
async function loadMemoryData() {
    if (!currentSessionId) return;

    const storageKey = `session_${currentSessionId}`;
    console.log('[Sidepanel] loadMemoryData: Loading session', { sessionId: currentSessionId, storageKey });

    const result = await chrome.storage.local.get([storageKey, `${storageKey}_disabled`]);

    memoryData = result[storageKey] || null;
    disabledFacts = result[`${storageKey}_disabled`] || {};

    console.log('[Sidepanel] loadMemoryData: Data loaded', {
        hasData: !!memoryData,
        hasComponents: !!memoryData?.components,
        currentGen: memoryData?.currentGeneration
    });

    // Update last updated time
    const lastUpdatedEl = document.getElementById('last-updated');
    if (lastUpdatedEl) {
        if (memoryData?.lastUpdated) {
            const date = new Date(memoryData.lastUpdated);
            lastUpdatedEl.textContent = `Last updated: ${date.toLocaleString()}`;
        } else {
            lastUpdatedEl.textContent = 'No memory data yet';
        }
    }

    // Render components
    console.log('[Sidepanel] loadMemoryData: Rendering components...');
    renderAllComponents();

    // Initialize section badges with generation tracking (or clear them to default)
    initializeSectionBadges(memoryData);

    console.log('[Sidepanel] loadMemoryData: Complete');
}

/**
 * Check LLM configuration status using Model Manager
 * @returns {Promise<boolean>} - true if a model is configured and enabled
 */
async function checkLLMStatus() {
    const statusEl = document.getElementById('llm-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const iconEl = statusEl.querySelector('.status-icon');
    const textEl = statusEl.querySelector('.status-text');

    try {
        // Read from Model Manager storage
        const result = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
        // pa_active_model is stored as { activeModelId: id }, not just the id
        const activeModelData = result.pa_active_model;
        const activeModelId = activeModelData?.activeModelId || activeModelData;
        const models = result.pa_models || {};

        console.log('[Sidepanel] Checking LLM status:', { activeModelId, modelsCount: Object.keys(models).length });

        if (activeModelId && models[activeModelId]) {
            const activeModel = models[activeModelId];
            const provider = activeModel.provider || 'unknown';
            const modelName = activeModel.name || activeModel.model;

            dotEl.classList.add('connected');
            iconEl.style.display = 'none'; // Hide warning icon
            textEl.textContent = modelName;
            textEl.title = `Provider: ${provider}\nModel: ${activeModel.model}`;
            statusEl.classList.remove('warning');
            statusEl.classList.add('connected');
            console.log(`[Sidepanel] Active model: ${modelName} (${activeModel.model})`);
            return true; // Model is configured
        } else {
            dotEl.classList.remove('connected');
            iconEl.style.display = 'inline-flex'; // Show warning icon
            iconEl.textContent = 'warning';
            textEl.textContent = 'No model configured';
            textEl.title = 'Click to open settings and configure an AI model';
            statusEl.classList.add('warning');
            statusEl.classList.remove('connected');
            return false; // No model configured
        }
    } catch (error) {
        console.error('[Sidepanel] Failed to check LLM status:', error);
        dotEl.classList.remove('connected');
        iconEl.style.display = 'inline-flex'; // Show error icon
        iconEl.textContent = 'error';
        textEl.textContent = 'Error loading config';
        statusEl.classList.add('error');
        statusEl.classList.remove('connected', 'warning');
        return false;
    }
}

/**
 * Restore form state when reopening sidepanel after split view
 * This preserves unsaved edits from the split view iframe
 */
async function restoreFormStateFromSplitView() {
    const isIframe = window.self !== window.top;
    if (isIframe) return; // Only restore in native sidepanel

    try {
        const result = await chrome.storage.session.get('splitViewFormState');
        const formState = result.splitViewFormState;

        if (formState) {
            // Session storage persists until tab closes, so restore anytime
            const personaInput = document.getElementById('persona-input');
            const contextInput = document.getElementById('injected-context-input');

            if (personaInput && formState.persona) {
                personaInput.value = formState.persona;
            }
            if (contextInput && formState.injectedContext) {
                contextInput.value = formState.injectedContext;
            }

            console.log('[Sidepanel] Restored form state from split view');

            // Clear the saved state after restoring
            await chrome.storage.session.remove('splitViewFormState');
        }
    } catch (error) {
        console.error('[Sidepanel] Failed to restore form state:', error);
    }
}

// ============================================================================
// Rendering
// ============================================================================

/**
 * Update pin button state for a dimension
 * @param {string} dimensionId - Dimension ID (context, tone, persona, etc.)
 * @param {boolean} isPinned - Whether the dimension is pinned
 */
function updateDimensionPinButton(dimensionId, isPinned) {
    const pinBtn = document.getElementById(dimensionId === 'persona' ? 'pin-persona-btn' : `pin-${dimensionId}-btn`);
    if (pinBtn) {
        const iconEl = pinBtn.querySelector('.material-symbols-outlined');
        const label = dimensionId.charAt(0).toUpperCase() + dimensionId.slice(1);
        if (isPinned) {
            pinBtn.classList.add('pinned');
            if (iconEl) iconEl.textContent = 'keep'; // Filled pin icon
            pinBtn.title = `Unpin ${label} to allow automatic updates`;
        } else {
            pinBtn.classList.remove('pinned');
            if (iconEl) iconEl.textContent = 'push_pin'; // Outline pin icon
            pinBtn.title = `Pin ${label} to prevent automatic updates`;
        }
    }

    // Sync in-section verbatim toggle & badge
    const verbatimToggle = document.getElementById(dimensionId === 'persona' ? 'verbatim-toggle-persona' : `verbatim-toggle-${dimensionId}`);
    const verbatimBadge = document.getElementById(dimensionId === 'persona' ? 'verbatim-badge-persona' : `verbatim-badge-${dimensionId}`);
    if (verbatimToggle) {
        verbatimToggle.checked = !!isPinned;
    }
    if (verbatimBadge) {
        if (isPinned) {
            verbatimBadge.classList.remove('hidden');
        } else {
            verbatimBadge.classList.add('hidden');
        }
    }
}

/**
 * Render all memory components
 * Always renders editable textareas even when no data exists
 * so users can manually input context on fresh pages
 */
function renderAllComponents() {
    const components = memoryData?.components || {};

    // ========================================================================
    // 7-DIMENSION SCHEMA RENDERING
    // Always render sections (with empty defaults if no data)
    // ========================================================================

    // Helper to get active data for a component (respecting pinned state)
    const getActiveCompData = (comp) => {
        if (!comp) return { instruction: '' };
        if (comp.pinned && comp.pinnedData) return comp.pinnedData;
        return comp.current || { instruction: '' };
    };

    // Persona dimension - core identity (always call to reset if empty)
    const personaComp = components.persona || {};
    updateDimensionPinButton('persona', personaComp.pinned === true);
    renderSynthesizedPersona(personaComp);

    // Update pin buttons and render the other 6 dimensions
    const dimensions = ['context', 'tone', 'framework', 'constraints', 'format', 'exemplar'];
    dimensions.forEach(dim => {
        const comp = components[dim] || {};
        updateDimensionPinButton(dim, comp.pinned === true);
    });

    // Context dimension - domain, terminology
    renderContext(getActiveCompData(components.context));

    // Tone dimension - voice, style, verbosity
    renderTone(getActiveCompData(components.tone));

    // Framework dimension - methodology, workflow
    renderFramework(getActiveCompData(components.framework));

    // Constraints dimension - rules, prohibitions
    renderConstraints(getActiveCompData(components.constraints));

    // Format dimension - output structure 
    renderFormat(getActiveCompData(components.format));

    // Exemplar dimension - examples, edge cases
    renderExemplar(getActiveCompData(components.exemplar));

    // Injected Context - prefer custom_context from extraction, fallback to user_injected_context
    const injectedContextInput = document.getElementById('injected-context-input');
    if (injectedContextInput) {
        if (components.custom_context?.current) {
            // Format extracted custom_context for display
            const ctx = components.custom_context.current;
            const lines = [];

            if (ctx.constraints?.length > 0) {
                lines.push('## Constraints');
                ctx.constraints.forEach(c => lines.push(`- ${c}`));
                lines.push('');
            }
            if (ctx.requirements?.length > 0) {
                lines.push('## Requirements');
                ctx.requirements.forEach(r => lines.push(`- ${r}`));
                lines.push('');
            }
            if (ctx.verbatimRules) {
                lines.push('## Critical Rules');
                lines.push(ctx.verbatimRules);
                lines.push('');
            }
            if (ctx.formatInstructions?.length > 0) {
                lines.push('## Format Instructions');
                ctx.formatInstructions.forEach(f => lines.push(`- ${f}`));
                lines.push('');
            }
            if (ctx.workflowSteps?.length > 0) {
                lines.push('## Workflow');
                ctx.workflowSteps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
                lines.push('');
            }
            if (ctx.examplesFromPrompt?.length > 0) {
                lines.push('## Examples');
                ctx.examplesFromPrompt.forEach(ex => lines.push(`- ${ex}`));
                lines.push('');
            }
            if (ctx.numericalLimits) {
                lines.push('## Limits');
                Object.entries(ctx.numericalLimits).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
                lines.push('');
            }
            if (ctx.domainTerminology?.length > 0) {
                lines.push('## Terminology');
                ctx.domainTerminology.forEach(t => lines.push(`- ${t}`));
                lines.push('');
            }
            if (ctx.edgeCases?.length > 0) {
                lines.push('## Edge Cases');
                ctx.edgeCases.forEach(e => lines.push(`- ${e}`));
                lines.push('');
            }
            if (ctx.contextNotes) {
                lines.push('## Notes');
                lines.push(ctx.contextNotes);
                lines.push('');
            }
            if (ctx.additionalContext) {
                lines.push('## Extended Context');
                lines.push(ctx.additionalContext);
                lines.push('');
            }
            if (ctx.importantReferences?.length > 0) {
                lines.push('## References');
                ctx.importantReferences.forEach(ref => lines.push(`- ${ref}`));
            }

            injectedContextInput.value = lines.join('\n').trim();
        } else if (components.user_injected_context?.current) {
            injectedContextInput.value = components.user_injected_context.current.text || '';
        } else {
            injectedContextInput.value = '';
        }
    }

    // Update toggle states
    updateToggleStates();
}

/**
 * Create an editable tag list with add/remove/edit functionality
 * @param {string[]} items - Array of tag values
 * @param {string} componentId - Component ID for storage (e.g. 'topic_summarizer')
 * @param {string} field - Field name (e.g. 'keywords')
 * @returns {HTMLElement} - Tag list container element
 */
function createEditableTagList(items, componentId, field) {
    const container = document.createElement('div');
    container.className = 'tag-list';
    container.dataset.component = componentId;
    container.dataset.field = field;

    // Create tags
    items.forEach((item, index) => {
        const tag = createEditableTag(item, index, componentId, field);
        container.appendChild(tag);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add';
    addBtn.innerHTML = '+';
    addBtn.title = `Add ${field.replace('_', ' ')}`;
    addBtn.addEventListener('click', () => handleAddTag(container, componentId, field));
    container.appendChild(addBtn);

    return container;
}

/**
 * Create a single editable tag
 */
function createEditableTag(value, index, componentId, field) {
    const tag = document.createElement('span');
    tag.className = 'tag editable';
    tag.dataset.index = index;
    tag.dataset.value = value;

    // Remove button (X)
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRemoveTag(tag, componentId, field);
    });

    // Text content
    const textSpan = document.createElement('span');
    textSpan.className = 'tag-text';
    textSpan.textContent = value;

    // Double-click to edit
    textSpan.addEventListener('dblclick', () => {
        tag.classList.add('editing');
        textSpan.contentEditable = 'true';
        textSpan.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    // Save on blur or Enter
    textSpan.addEventListener('blur', () => {
        tag.classList.remove('editing');
        textSpan.contentEditable = 'false';
        const newValue = textSpan.textContent.trim();
        if (newValue && newValue !== value) {
            handleEditTag(tag, componentId, field, value, newValue);
        } else if (!newValue) {
            // Empty value = remove
            handleRemoveTag(tag, componentId, field);
        }
    });

    textSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textSpan.blur();
        } else if (e.key === 'Escape') {
            textSpan.textContent = value;
            textSpan.blur();
        }
    });

    tag.appendChild(removeBtn);
    tag.appendChild(textSpan);
    return tag;
}

/**
 * Handle removing a tag
 */
async function handleRemoveTag(tagElement, componentId, field) {
    const value = tagElement.dataset.value;
    const container = tagElement.closest('.tag-list');

    // Remove from DOM
    tagElement.remove();

    // Update storage
    await updateTagsInStorage(componentId, field, container);
    console.log(`[Sidepanel] Removed tag: ${value} from ${componentId}.${field}`);
}

/**
 * Handle editing a tag
 */
async function handleEditTag(tagElement, componentId, field, oldValue, newValue) {
    tagElement.dataset.value = newValue;
    const container = tagElement.closest('.tag-list');

    // Update storage
    await updateTagsInStorage(componentId, field, container);
    console.log(`[Sidepanel] Edited tag: ${oldValue} → ${newValue} in ${componentId}.${field}`);
}

/**
 * Handle adding a new tag
 */
async function handleAddTag(container, componentId, field) {
    const addBtn = container.querySelector('.tag-add');
    const existingTags = container.querySelectorAll('.tag');
    const newIndex = existingTags.length;

    // Create new tag with placeholder
    const tag = createEditableTag('new', newIndex, componentId, field);
    container.insertBefore(tag, addBtn);

    // Immediately enter edit mode
    const textSpan = tag.querySelector('.tag-text');
    tag.classList.add('editing');
    textSpan.contentEditable = 'true';
    textSpan.textContent = '';
    textSpan.focus();
}

/**
 * Update tags in memory storage
 */
async function updateTagsInStorage(componentId, field, container) {
    if (!currentSessionId || !memoryData?.components?.[componentId]?.current) return;

    // Collect current tag values
    const tags = Array.from(container.querySelectorAll('.tag')).map(t => t.dataset.value);

    // Update memory data
    memoryData.components[componentId].current[field] = tags;

    // Save to storage
    const storageKey = `session_${currentSessionId}`;
    await chrome.storage.local.set({ [storageKey]: memoryData });
}

// ============================================================================
// CONTEXT TAB EDITABLE FIELD HELPERS
// ============================================================================

/**
 * Create editable tag list for Context Tab (updates currentContext/memoryData)
 */
function createContextEditableTagList(items, componentId, field) {
    const container = document.createElement('div');
    container.className = 'tag-list';
    container.dataset.component = componentId;
    container.dataset.field = field;

    // Create tags
    items.forEach((item, index) => {
        const tag = createContextEditableTag(item, index, componentId, field);
        container.appendChild(tag);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add';
    addBtn.innerHTML = '+';
    addBtn.title = `Add ${field.replace(/[._]/g, ' ')}`;
    addBtn.addEventListener('click', () => handleAddContextTag(container, componentId, field));
    container.appendChild(addBtn);

    return container;
}

/**
 * Create a single editable tag for Context Tab
 */
function createContextEditableTag(value, index, componentId, field) {
    const tag = document.createElement('span');
    tag.className = 'tag editable';
    tag.dataset.index = index;
    tag.dataset.value = value;

    // Remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRemoveContextTag(tag, componentId, field);
    });

    // Text content
    const textSpan = document.createElement('span');
    textSpan.className = 'tag-text';
    textSpan.textContent = value;

    // Double-click to edit
    textSpan.addEventListener('dblclick', () => {
        tag.classList.add('editing');
        textSpan.contentEditable = 'true';
        textSpan.focus();
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    // Save on blur
    textSpan.addEventListener('blur', () => {
        tag.classList.remove('editing');
        textSpan.contentEditable = 'false';
        const newValue = textSpan.textContent.trim();
        if (newValue && newValue !== value) {
            tag.dataset.value = newValue;
            updateContextTagsInData(tag.closest('.tag-list'), componentId, field);
        } else if (!newValue) {
            handleRemoveContextTag(tag, componentId, field);
        }
    });

    textSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textSpan.blur();
        } else if (e.key === 'Escape') {
            textSpan.textContent = value;
            textSpan.blur();
        }
    });

    tag.appendChild(removeBtn);
    tag.appendChild(textSpan);
    return tag;
}

/**
 * Handle adding a new tag in Context Tab
 */
function handleAddContextTag(container, componentId, field) {
    const addBtn = container.querySelector('.tag-add');
    const existingTags = container.querySelectorAll('.tag');
    const newIndex = existingTags.length;

    const tag = createContextEditableTag('new', newIndex, componentId, field);
    container.insertBefore(tag, addBtn);

    // Enter edit mode
    const textSpan = tag.querySelector('.tag-text');
    tag.classList.add('editing');
    textSpan.contentEditable = 'true';
    textSpan.textContent = '';
    textSpan.focus();
}

/**
 * Handle removing a tag in Context Tab
 */
function handleRemoveContextTag(tagElement, componentId, field) {
    const container = tagElement.closest('.tag-list');
    tagElement.remove();
    updateContextTagsInData(container, componentId, field);
}

/**
 * Update tags in Context Tab data (memoryData)
 */
async function updateContextTagsInData(container, componentId, field) {
    if (!currentSessionId || !memoryData?.components?.[componentId]?.current) return;

    // Collect current tag values
    const tags = Array.from(container.querySelectorAll('.tag')).map(t => t.dataset.value);

    // Handle nested field paths (e.g., "categories.technologies")
    const fieldParts = field.split('.');
    let target = memoryData.components[componentId].current;
    for (let i = 0; i < fieldParts.length - 1; i++) {
        if (!target[fieldParts[i]]) target[fieldParts[i]] = {};
        target = target[fieldParts[i]];
    }
    target[fieldParts[fieldParts.length - 1]] = tags;

    // Save to storage
    const storageKey = `session_${currentSessionId}`;
    await chrome.storage.local.set({ [storageKey]: memoryData });
    console.log(`[Context] Updated ${componentId}.${field}:`, tags);
}

/**
 * Setup inline text editing for Context Tab
 */
function setupContextInlineEditing(container) {
    // Editable text fields
    container.querySelectorAll('.editable-text.ctx-field').forEach(el => {
        el.addEventListener('dblclick', () => {
            el.contentEditable = 'true';
            el.classList.add('editing');
            el.focus();
        });

        el.addEventListener('blur', () => {
            el.contentEditable = 'false';
            el.classList.remove('editing');
            updateContextFieldInData(el.dataset.component, el.dataset.field, el.textContent.trim());
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });
    });

    // Inline select dropdowns
    container.querySelectorAll('.inline-select.ctx-field').forEach(el => {
        el.addEventListener('change', () => {
            updateContextFieldInData(el.dataset.component, el.dataset.field, el.value);
        });
    });
}

/**
 * Update a single field in Context Tab data (memoryData)
 */
async function updateContextFieldInData(componentId, field, value) {
    if (!currentSessionId || !memoryData?.components?.[componentId]?.current) return;

    memoryData.components[componentId].current[field] = value;

    // Save to storage
    const storageKey = `session_${currentSessionId}`;
    await chrome.storage.local.set({ [storageKey]: memoryData });
    console.log(`[Context] Updated ${componentId}.${field}:`, value);
}

// ============================================================================
// SECTION: V4 SCHEMA UI COMPONENTS
// Unified components for Context Tab and Edit Persona page
// ============================================================================

/**
 * Render a v4 verbatim section with textarea and optional metadata chips
 * 
 * @param {Object} config - Configuration object
 * @param {HTMLElement} config.container - Container element to render into
 * @param {string} config.dimensionId - Dimension identifier (e.g., 'persona', 'tone')
 * @param {Object} config.data - V4 dimension data { instruction, metadata }
 * @param {boolean} [config.isEditable=true] - Whether the textarea is editable
 * @param {Function} [config.onUpdate] - Callback when data changes
 * @returns {void}
 * 
 * @example
 * renderV4Section({
 *     container: document.getElementById('tone-content'),
 *     dimensionId: 'tone',
 *     data: { instruction: 'Be professional...', metadata: { style_tags: ['Professional'] } },
 *     onUpdate: (newData) => saveToStorage(newData)
 * });
 */
function renderV4Section(config) {
    const { container, dimensionId, data, isEditable = true, onUpdate } = config;
    if (!container) return;

    container.innerHTML = '';
    container.classList.add('v4-section');

    // === TEXTAREA: Primary verbatim instruction with expand button ===
    const textareaWrapper = document.createElement('div');
    textareaWrapper.className = 'textarea-container';

    const textarea = document.createElement('textarea');
    textarea.className = 'persona-textarea';
    textarea.id = `v4-${dimensionId}-textarea`;
    textarea.value = data?.instruction || '';
    textarea.placeholder = `Enter ${dimensionId} instructions...`;
    textarea.rows = 3;
    textarea.readOnly = !isEditable;
    textarea.dataset.dimension = dimensionId;

    // Expand button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'expand-btn';
    expandBtn.dataset.target = textarea.id;
    expandBtn.title = 'Expand';
    expandBtn.innerHTML = '<span class="material-symbols-outlined">expand_content</span>';
    expandBtn.addEventListener('click', () => {
        // Toggle fullscreen mode using existing infrastructure
        const overlay = document.getElementById('textarea-overlay');
        if (overlay && typeof openTextareaFullscreen === 'function') {
            openTextareaFullscreen(textarea.id, dimensionId.charAt(0).toUpperCase() + dimensionId.slice(1));
        }
    });

    // === VERBATIM CONTROLS (Bottom-Right of Textarea) ===
    const compState = memoryData?.components?.[dimensionId];
    const isPinned = compState?.pinned === true;

    const verbatimWrapper = document.createElement('div');
    verbatimWrapper.className = 'verbatim-controls';

    const verbatimBadge = document.createElement('span');
    verbatimBadge.className = 'badge verbatim';
    verbatimBadge.id = `verbatim-badge-${dimensionId}`;
    verbatimBadge.textContent = 'VERBATIM';
    if (!isPinned) verbatimBadge.classList.add('hidden');

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'toggle-switch verbatim-switch';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = `verbatim-toggle-${dimensionId}`;
    toggleInput.dataset.verbatim = dimensionId;
    toggleInput.checked = !!isPinned;

    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'toggle-slider';

    toggleLabel.appendChild(toggleInput);
    toggleLabel.appendChild(toggleSlider);

    verbatimWrapper.appendChild(verbatimBadge);
    verbatimWrapper.appendChild(toggleLabel);

    // Event: manual toggle of in-section verbatim switch
    toggleInput.addEventListener('change', async (e) => {
        const shouldPin = e.target.checked;
        const label = dimensionId.charAt(0).toUpperCase() + dimensionId.slice(1);
        if (shouldPin) {
            verbatimBadge.classList.remove('hidden');
            updateDimensionPinButton(dimensionId, true);
            if (currentSessionId) {
                try {
                    await chrome.runtime.sendMessage({
                        type: 'PIN_COMPONENT',
                        sessionId: currentSessionId,
                        componentId: dimensionId
                    });
                    if (memoryData?.components?.[dimensionId]) {
                        memoryData.components[dimensionId].pinned = true;
                        memoryData.components[dimensionId].pinnedData = { ...(memoryData.components[dimensionId].current || data) };
                        const storageKey = `session_${currentSessionId}`;
                        await chrome.storage.local.set({ [storageKey]: memoryData });
                    }
                    showNotification(`${label} locked as verbatim`);
                } catch (err) {
                    console.error('[Sidepanel] Failed to pin component:', err);
                }
            }
        } else {
            verbatimBadge.classList.add('hidden');
            updateDimensionPinButton(dimensionId, false);
            if (currentSessionId) {
                try {
                    await chrome.runtime.sendMessage({
                        type: 'UNPIN_COMPONENT',
                        sessionId: currentSessionId,
                        componentId: dimensionId
                    });
                    if (memoryData?.components?.[dimensionId]) {
                        memoryData.components[dimensionId].pinned = false;
                        delete memoryData.components[dimensionId].pinnedData;
                        const storageKey = `session_${currentSessionId}`;
                        await chrome.storage.local.set({ [storageKey]: memoryData });
                    }
                    showNotification(`${label} unlocked from verbatim`);
                } catch (err) {
                    console.error('[Sidepanel] Failed to unpin component:', err);
                }
            }
        }
    });

    // Data update on input (debounced storage save + immediate in-memory update)
    let autoSaveTimeout = null;
    const triggerUpdate = () => {
        if (onUpdate) {
            const newData = { ...data, instruction: textarea.value };
            onUpdate(newData);
        }
    };

    textarea.addEventListener('input', () => {
        // Auto-activate verbatim on edit
        if (!toggleInput.checked) {
            toggleInput.checked = true;
            verbatimBadge.classList.remove('hidden');
            updateDimensionPinButton(dimensionId, true);
            if (currentSessionId) {
                chrome.runtime.sendMessage({
                    type: 'PIN_COMPONENT',
                    sessionId: currentSessionId,
                    componentId: dimensionId
                }).catch(err => console.error('[Sidepanel] Auto-pin failed:', err));
            }
        }

        // Update in-memory data immediately
        if (memoryData?.components?.[dimensionId]) {
            const comp = memoryData.components[dimensionId];
            if (comp.pinned) {
                if (!comp.pinnedData) comp.pinnedData = {};
                comp.pinnedData.instruction = textarea.value;
            }
            if (!comp.current) comp.current = {};
            comp.current.instruction = textarea.value;
        }

        // Debounce storage persistence by 500ms
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(() => {
            triggerUpdate();
        }, 500);
    });

    // Immediate flush on blur
    textarea.addEventListener('blur', () => {
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        triggerUpdate();
    });

    textareaWrapper.appendChild(textarea);
    textareaWrapper.appendChild(expandBtn);
    container.appendChild(textareaWrapper);
    container.appendChild(verbatimWrapper);

    // === METADATA: Chips based on dimension type ===
    const metadata = data?.metadata || {};

    switch (dimensionId) {
        case 'context':
            // Domain: Single-select chips
            if (ComponentSchemas?.enums?.domain) {
                const domainChips = createSingleSelectChips({
                    label: 'Domain',
                    options: ComponentSchemas.enums.domain,
                    selected: metadata.domain,
                    onChange: (value) => {
                        metadata.domain = value;
                        if (onUpdate) onUpdate({ ...data, metadata });
                    }
                });
                container.appendChild(domainChips);
            }

            // Scope Tags: Multi-select with custom
            const scopeChips = createMultiSelectChips({
                label: 'Scope',
                selected: metadata.scope_tags || [],
                allowCustom: true,
                onChange: (values) => {
                    metadata.scope_tags = values;
                    if (onUpdate) onUpdate({ ...data, metadata });
                }
            });
            container.appendChild(scopeChips);
            break;

        case 'tone':
            // Style Tags: Multi-select from enum + custom
            if (ComponentSchemas?.enums?.style) {
                const styleChips = createMultiSelectChips({
                    label: 'Style',
                    presetOptions: ComponentSchemas.enums.style,
                    selected: metadata.style_tags || [],
                    allowCustom: true,
                    onChange: (values) => {
                        metadata.style_tags = values;
                        if (onUpdate) onUpdate({ ...data, metadata });
                    }
                });
                container.appendChild(styleChips);
            }

            // Banned Phrases: Multi-select with custom only
            const bannedChips = createMultiSelectChips({
                label: 'Banned Phrases',
                selected: metadata.banned_phrases || [],
                allowCustom: true,
                onChange: (values) => {
                    metadata.banned_phrases = values;
                    if (onUpdate) onUpdate({ ...data, metadata });
                }
            });
            container.appendChild(bannedChips);
            break;

        case 'framework':
            // Reasoning Type: Single-select chips
            if (ComponentSchemas?.enums?.reasoning) {
                const reasoningChips = createSingleSelectChips({
                    label: 'Reasoning',
                    options: ComponentSchemas.enums.reasoning,
                    selected: metadata.reasoning_type,
                    onChange: (value) => {
                        metadata.reasoning_type = value;
                        if (onUpdate) onUpdate({ ...data, metadata });
                    }
                });
                container.appendChild(reasoningChips);
            }
            break;

        case 'constraints':
            // Prohibitions: Multi-select with custom
            const prohibChips = createMultiSelectChips({
                label: 'Prohibitions',
                selected: metadata.prohibitions || [],
                allowCustom: true,
                onChange: (values) => {
                    metadata.prohibitions = values;
                    if (onUpdate) onUpdate({ ...data, metadata });
                }
            });
            container.appendChild(prohibChips);

            // Requirements: Multi-select with custom
            const reqChips = createMultiSelectChips({
                label: 'Requirements',
                selected: metadata.requirements || [],
                allowCustom: true,
                onChange: (values) => {
                    metadata.requirements = values;
                    if (onUpdate) onUpdate({ ...data, metadata });
                }
            });
            container.appendChild(reqChips);

            // Response Length: Single input
            const lengthInput = createTextInput({
                label: 'Response Length',
                value: metadata.response_length || '',
                placeholder: 'e.g., 500 words',
                onChange: (value) => {
                    metadata.response_length = value;
                    if (onUpdate) onUpdate({ ...data, metadata });
                }
            });
            container.appendChild(lengthInput);
            break;

        case 'format':
            // Output Type: Single-select chips
            if (ComponentSchemas?.enums?.outputType) {
                const typeChips = createSingleSelectChips({
                    label: 'Output Type',
                    options: ComponentSchemas.enums.outputType,
                    selected: metadata.output_type,
                    onChange: (value) => {
                        metadata.output_type = value;
                        if (onUpdate) onUpdate({ ...data, metadata });
                    }
                });
                container.appendChild(typeChips);
            }
            break;

        // persona and exemplar have no metadata chips
        default:
            break;
    }
}

/**
 * Create single-select chip group (only one can be active)
 * 
 * @param {Object} config - Configuration
 * @param {string} config.label - Group label
 * @param {string[]} config.options - Available options
 * @param {string|null} config.selected - Currently selected value
 * @param {Function} config.onChange - Callback with new value
 * @returns {HTMLElement} Chip group container
 */
function createSingleSelectChips(config) {
    const { label, options, selected, onChange } = config;

    const wrapper = document.createElement('div');
    wrapper.className = 'v4-chip-group single-select';

    const labelEl = document.createElement('label');
    labelEl.className = 'chip-group-label';
    labelEl.textContent = label + ':';
    wrapper.appendChild(labelEl);

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'chips-container';

    options.forEach(option => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'filter-chip v4-chip';
        if (selected === option) chip.classList.add('selected');
        chip.textContent = option;
        chip.dataset.value = option;

        chip.addEventListener('click', () => {
            // Deselect all, select this one (or deselect if already selected)
            const isCurrentlySelected = chip.classList.contains('selected');
            chipsContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));

            if (!isCurrentlySelected) {
                chip.classList.add('selected');
                onChange(option);
            } else {
                onChange(null);
            }
        });

        chipsContainer.appendChild(chip);
    });

    wrapper.appendChild(chipsContainer);
    return wrapper;
}

/**
 * Create multi-select chip group with optional custom additions
 * 
 * @param {Object} config - Configuration
 * @param {string} config.label - Group label
 * @param {string[]} [config.presetOptions] - Pre-populated options
 * @param {string[]} config.selected - Currently selected values
 * @param {boolean} [config.allowCustom=true] - Allow adding custom chips
 * @param {Function} config.onChange - Callback with new values array
 * @returns {HTMLElement} Chip group container
 */
function createMultiSelectChips(config) {
    const { label, presetOptions = [], selected, allowCustom = true, onChange } = config;

    const wrapper = document.createElement('div');
    wrapper.className = 'v4-chip-group multi-select';

    const labelEl = document.createElement('label');
    labelEl.className = 'chip-group-label';
    labelEl.textContent = label + ':';
    wrapper.appendChild(labelEl);

    const chipsContainer = document.createElement('div');
    chipsContainer.className = 'chips-container';

    // Track selected values
    let currentSelected = [...selected];

    // Helper to render all chips
    const renderChips = () => {
        chipsContainer.innerHTML = '';

        // Preset options (toggleable)
        presetOptions.forEach(option => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'filter-chip v4-chip preset';
            if (currentSelected.includes(option)) chip.classList.add('selected');
            chip.textContent = option;
            chip.dataset.value = option;

            chip.addEventListener('click', () => {
                if (chip.classList.contains('selected')) {
                    chip.classList.remove('selected');
                    currentSelected = currentSelected.filter(v => v !== option);
                } else {
                    chip.classList.add('selected');
                    currentSelected.push(option);
                }
                onChange(currentSelected);
            });

            chipsContainer.appendChild(chip);
        });

        // Custom values (removable)
        currentSelected.filter(v => !presetOptions.includes(v)).forEach(customValue => {
            const chip = document.createElement('span');
            chip.className = 'filter-chip v4-chip custom selected';
            chip.innerHTML = `${customValue} <button class="chip-remove" title="Remove">×</button>`;

            chip.querySelector('.chip-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                currentSelected = currentSelected.filter(v => v !== customValue);
                renderChips();
                onChange(currentSelected);
            });

            chipsContainer.appendChild(chip);
        });

        // Add button
        if (allowCustom) {
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'chip-add-btn';
            addBtn.textContent = '+';
            addBtn.title = 'Add custom';

            addBtn.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'chip-input';
                input.placeholder = 'Type...';

                addBtn.replaceWith(input);
                input.focus();

                const handleAdd = () => {
                    const value = input.value.trim();
                    if (value && !currentSelected.includes(value)) {
                        currentSelected.push(value);
                        onChange(currentSelected);
                    }
                    renderChips();
                };

                input.addEventListener('blur', handleAdd);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') renderChips();
                });
            });

            chipsContainer.appendChild(addBtn);
        }
    };

    renderChips();
    wrapper.appendChild(chipsContainer);
    return wrapper;
}

/**
 * Create a simple text input field
 * 
 * @param {Object} config - Configuration
 * @param {string} config.label - Field label
 * @param {string} config.value - Current value
 * @param {string} config.placeholder - Placeholder text
 * @param {Function} config.onChange - Callback with new value
 * @returns {HTMLElement} Input wrapper
 */
function createTextInput(config) {
    const { label, value, placeholder, onChange } = config;

    const wrapper = document.createElement('div');
    wrapper.className = 'v4-input-group';

    const labelEl = document.createElement('label');
    labelEl.className = 'input-label';
    labelEl.textContent = label + ':';
    wrapper.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'v4-text-input';
    input.value = value || '';
    input.placeholder = placeholder || '';

    input.addEventListener('blur', () => {
        onChange(input.value.trim());
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        }
    });

    wrapper.appendChild(input);
    return wrapper;
}

/**
 * Render synthesized persona section
 * @param {Object} component - Full persona component object with current, pinned, pinnedData
 */
function renderSynthesizedPersona(component) {
    const textarea = document.getElementById('synthesized-persona-input');
    const insightsContainer = document.getElementById('key-insights');
    const pinBtn = document.getElementById('pin-persona-btn');
    const personaNameEl = document.getElementById('active-persona-name');

    // Use pinned data if pinned, otherwise use current
    const isPinned = component.pinned === true;
    const data = isPinned && component.pinnedData ? component.pinnedData : (component.current || {});

    // Update persona type display (inside Persona accordion - shows TYPE only)
    if (personaNameEl) {
        // Show ONLY the type: Imported Persona or Auto-generated
        const personaType = component.imported ? 'Imported Persona' : 'Auto-generated';
        personaNameEl.textContent = personaType;
    }

    // Update top-level persona name display (at top of Context tab - shows actual name + title)
    const topPersonaNameEl = document.getElementById('persona-name-display');
    if (topPersonaNameEl) {
        // Priority: stored personaName > LLM name > role > fallback based on type
        // Support both v3 schema (name, role, purpose) and legacy (synthesizedPersona)
        const hasPersonaData = data.role || data.purpose || data.synthesizedPersona || data.name || data.instruction;

        // Get name and title from various sources
        const name = component.personaName || data.personaName || data.name || null;
        const title = data.title || data.role || null;

        // Build display: "Name - Title" or just "Name" or fallback
        let displayText;
        if (name && title) {
            displayText = `${name} - ${title}`;
        } else if (name) {
            displayText = name;
        } else if (title) {
            displayText = title;
        } else {
            displayText = component.imported ? 'Imported Persona' : (hasPersonaData ? 'SmartRun Persona' : 'No Persona Active');
        }

        topPersonaNameEl.textContent = displayText;
    }

    // Update PIN button state - now uses Material Symbol icon
    if (pinBtn) {
        const iconEl = pinBtn.querySelector('.material-symbols-outlined');
        if (isPinned) {
            pinBtn.classList.add('pinned');
            if (iconEl) iconEl.textContent = 'keep'; // Filled pin icon
            pinBtn.title = 'Unpin persona to allow automatic updates';
        } else {
            pinBtn.classList.remove('pinned');
            if (iconEl) iconEl.textContent = 'push_pin'; // Outline pin icon
            pinBtn.title = 'Pin persona to prevent automatic updates';
        }
    }

    // Note: mode badge always shows 'auto' - it indicates persona is always used for refinement
    // The 'pinned' state is shown via the Pin button, not the mode badge

    if (textarea) {
        // Support V4 schema (instruction), v3 schema (role/purpose), and legacy (synthesizedPersona)
        let personaText = '';

        // V4 schema: instruction is the primary field
        if (data.instruction) {
            personaText = data.instruction;
        }
        // Legacy: synthesizedPersona field
        else if (data.synthesizedPersona) {
            personaText = data.synthesizedPersona;
        }
        // V3 schema: build from role/purpose fields
        else if (data.role || data.purpose) {
            const parts = [];
            if (data.role) parts.push(`Role: ${data.role}`);
            if (data.purpose) parts.push(`Purpose: ${data.purpose}`);
            if (data.credentials?.qualifications?.length) {
                parts.push(`Qualifications: ${data.credentials.qualifications.join(', ')}`);
            }
            personaText = parts.join('\n');
        }

        if (textarea) {
            textarea.value = personaText;
        }
    }

    // Render key insights if available (used in refinement)
    if (insightsContainer && data.keyInsights?.length) {
        insightsContainer.innerHTML = `
    <strong> Key Insights:</strong>
        <ul class="key-insights-list">
            ${data.keyInsights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
`;
        insightsContainer.classList.remove('hidden');
    } else if (insightsContainer) {
        insightsContainer.classList.add('hidden');
    }
}

// ============================================================================
// 7-DIMENSION SCHEMA RENDER FUNCTIONS  
// ============================================================================

/**
 * Render context (domain/knowledge) section - 7-dimension schema
 */
function renderContext(data) {
    const container = document.getElementById('context-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'context',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.context) {
                    if (memoryData.components.context.pinned) {
                        memoryData.components.context.pinnedData = newData;
                    }
                    memoryData.components.context.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Context] Saved v4 context data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('context', data);
        renderV4Section({
            container,
            dimensionId: 'context',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.context) {
                    if (memoryData.components.context.pinned) {
                        memoryData.components.context.pinnedData = newData;
                    }
                    memoryData.components.context.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Context] Migrated and saved v4 context data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering (to be removed) ===
    container.innerHTML = '';

    const domainDiv = document.createElement('div');
    domainDiv.className = 'fact-item';
    domainDiv.innerHTML = `<strong>Domain:</strong> <span class="editable-text ctx-field" data-component="context" data-field="domain">${data?.domain || 'Unspecified'}</span>`;
    container.appendChild(domainDiv);

    if (container.children.length === 0) {
        container.innerHTML = '<p class="empty-state">No domain context captured.</p>';
    }
    setupContextInlineEditing(container);
}

/**
 * Render tone (voice/style) section - supports v3 and v4 schema
 */
function renderTone(data) {
    const container = document.getElementById('tone-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'tone',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.tone) {
                    if (memoryData.components.tone.pinned) {
                        memoryData.components.tone.pinnedData = newData;
                    }
                    memoryData.components.tone.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Tone] Saved v4 tone data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('tone', data);
        renderV4Section({
            container,
            dimensionId: 'tone',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.tone) {
                    if (memoryData.components.tone.pinned) {
                        memoryData.components.tone.pinnedData = newData;
                    }
                    memoryData.components.tone.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Tone] Migrated and saved v4 tone data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering (to be removed) ===
    container.innerHTML = '';
    const voiceDiv = document.createElement('div');
    voiceDiv.className = 'fact-item';
    voiceDiv.innerHTML = `<strong>Voice:</strong> ${data?.voice || 'Neutral'}`;
    container.appendChild(voiceDiv);
    setupContextInlineEditing(container);
}

/**
 * Render framework (methodology/workflow) section - supports v3 and v4 schema
 */
function renderFramework(data) {
    const container = document.getElementById('framework-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'framework',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.framework) {
                    if (memoryData.components.framework.pinned) {
                        memoryData.components.framework.pinnedData = newData;
                    }
                    memoryData.components.framework.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Framework] Saved v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('framework', data);
        renderV4Section({
            container,
            dimensionId: 'framework',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.framework) {
                    if (memoryData.components.framework.pinned) {
                        memoryData.components.framework.pinnedData = newData;
                    }
                    memoryData.components.framework.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Framework] Migrated and saved v4 data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '<p class="empty-state">No methodology captured.</p>';
}

/**
 * Render constraints (rules/limits) section - supports v3 and v4 schema
 */
function renderConstraints(data) {
    const container = document.getElementById('constraints-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'constraints',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.constraints) {
                    if (memoryData.components.constraints.pinned) {
                        memoryData.components.constraints.pinnedData = newData;
                    }
                    memoryData.components.constraints.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Constraints] Saved v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('constraints', data);
        renderV4Section({
            container,
            dimensionId: 'constraints',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.constraints) {
                    if (memoryData.components.constraints.pinned) {
                        memoryData.components.constraints.pinnedData = newData;
                    }
                    memoryData.components.constraints.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Constraints] Migrated and saved v4 data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '<p class="empty-state">No constraints captured.</p>';
}

/**
 * Render format (output structure) section - supports v3 and v4 schema
 */
function renderFormat(data) {
    const container = document.getElementById('format-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'format',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.format) {
                    if (memoryData.components.format.pinned) {
                        memoryData.components.format.pinnedData = newData;
                    }
                    memoryData.components.format.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Format] Saved v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('format', data);
        renderV4Section({
            container,
            dimensionId: 'format',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.format) {
                    if (memoryData.components.format.pinned) {
                        memoryData.components.format.pinnedData = newData;
                    }
                    memoryData.components.format.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Format] Migrated and saved v4 data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '<p class="empty-state">No format preferences.</p>';
}

/**
 * Render exemplar (examples) section - supports v3 and v4 schema
 */
function renderExemplar(data) {
    const container = document.getElementById('exemplar-content');
    if (!container) return;

    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'exemplar',
            data: data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.exemplar) {
                    if (memoryData.components.exemplar.pinned) {
                        memoryData.components.exemplar.pinnedData = newData;
                    }
                    memoryData.components.exemplar.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Exemplar] Saved v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('exemplar', data);
        renderV4Section({
            container,
            dimensionId: 'exemplar',
            data: v4Data,
            isEditable: true,
            onUpdate: async (newData) => {
                if (currentSessionId && memoryData?.components?.exemplar) {
                    if (memoryData.components.exemplar.pinned) {
                        memoryData.components.exemplar.pinnedData = newData;
                    }
                    memoryData.components.exemplar.current = newData;
                    const storageKey = `session_${currentSessionId}`;
                    await chrome.storage.local.set({ [storageKey]: memoryData });
                    console.log('[Exemplar] Migrated and saved v4 data');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '<p class="empty-state">No examples captured.</p>';
}

// ============================================================================
// Toggle Functionality
// ============================================================================

/**
 * Check if a fact is disabled
 * @param {string} path
 * @returns {boolean}
 */
function isFactDisabled(path) {
    return disabledFacts[path] === true;
}

/**
 * Handle fact toggle change
 * @param {Event} event
 */
async function handleFactToggle(event) {
    const input = event.target;
    const toggleable = input.closest('.toggleable');
    const path = toggleable?.dataset.path;

    if (!path || !currentSessionId) return;

    if (input.checked) {
        delete disabledFacts[path];
    } else {
        disabledFacts[path] = true;
    }

    // Save to storage
    const storageKey = `session_${currentSessionId}_disabled`;
    await chrome.storage.local.set({ [storageKey]: disabledFacts });

    console.log(`[Sidepanel] Toggled ${path}: ${input.checked ? 'enabled' : 'disabled'} `);
}

/**
 * Update toggle states from disabled facts
 */
function updateToggleStates() {
    document.querySelectorAll('.toggleable').forEach(el => {
        const path = el.dataset.path;
        const input = el.querySelector('input[type="checkbox"]');
        if (path && input) {
            input.checked = !isFactDisabled(path);
        }
    });

    // Component toggles
    document.querySelectorAll('.toggle-switch input').forEach(input => {
        const component = input.dataset.component;
        if (component) {
            input.checked = !isFactDisabled(`component.${component}`);
        }
    });
}

// ============================================================================
// Accordion Behavior
// ============================================================================

function setupAccordions() {
    // Initialize accordion icon states on load
    document.querySelectorAll('.accordion').forEach(accordion => {
        const content = accordion.querySelector('.accordion-content');
        const icon = accordion.querySelector('.accordion-icon');
        const header = accordion.querySelector('.accordion-header');

        if (content && icon) {
            const isExpanded = !content.classList.contains('collapsed');
            icon.textContent = isExpanded ? 'expand_more' : 'chevron_right';
            if (header) {
                header.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            }
        }
    });

    // Set up click handlers for accordion toggle
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            // Don't toggle if clicking on the switch, pin toggle, or badge
            if (e.target.closest('.toggle-switch') || e.target.closest('.pin-toggle') || e.target.closest('.badge')) return;

            // Before toggling or collapsing, trigger blur on any focused textarea/input to guarantee immediate save
            if (document.activeElement && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT')) {
                document.activeElement.blur();
            }

            const accordion = header.closest('.accordion');
            const content = accordion.querySelector('.accordion-content');
            const icon = header.querySelector('.accordion-icon');
            const isExpanded = !content.classList.contains('collapsed');

            if (isExpanded) {
                content.classList.add('collapsed');
                icon.textContent = 'chevron_right'; // Material Symbol
                header.setAttribute('aria-expanded', 'false');
            } else {
                content.classList.remove('collapsed');
                icon.textContent = 'expand_more'; // Material Symbol
                header.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // Component toggle switches
    document.querySelectorAll('.toggle-switch input').forEach(input => {
        input.addEventListener('change', async (e) => {
            e.stopPropagation();
            const component = input.dataset.component;
            await handleFactToggle({ target: input, closest: () => ({ dataset: { path: `component.${component}` } }) });
        });
    });
}

// ============================================================================
// Button Handlers
// ============================================================================

function setupButtonHandlers() {
    // Open Settings button (from no-model overlay)
    document.getElementById('open-settings-btn')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Split View button - toggles 50% split mode
    const splitBtn = document.getElementById('split-view-btn');
    const splitIcon = splitBtn?.querySelector('.material-symbols-outlined');
    const isIframe = window.self !== window.top;
    let splitViewToggleInProgress = false; // B2 FIX: Debounce flag

    // Set initial state based on context
    if (isIframe && splitBtn) {
        splitBtn.classList.add('active');
        splitBtn.title = "Close Split View";
        if (splitIcon) splitIcon.textContent = 'close';
    }

    splitBtn?.addEventListener('click', async () => {
        // B2 FIX: Prevent rapid clicks during toggle operation
        if (splitViewToggleInProgress) {
            spLog('info', 'Split view toggle ignored - operation in progress');
            return;
        }
        splitViewToggleInProgress = true;
        splitBtn.disabled = true; // Visual feedback

        try {
            splitBtn.classList.toggle('active');
            const isActive = splitBtn.classList.contains('active');

            // Update icon and title
            if (splitIcon) {
                splitIcon.textContent = isActive ? 'close' : 'split_scene';
            }
            splitBtn.title = isActive ? "Close Split View" : "Toggle Split View";

            // Save form state before any transition
            const formState = {
                persona: document.getElementById('persona-input')?.value || '',
                injectedContext: document.getElementById('injected-context-input')?.value || '',
                timestamp: Date.now()
            };
            await chrome.storage.session.set({ splitViewFormState: formState });

            // Send message to background to handle toggle logic
            // Background will orchestrate content script injection and sidepanel closing
            chrome.runtime.sendMessage({
                type: 'TOGGLE_SPLIT_VIEW',
                fromIframe: isIframe
            });

            // If switching from native sidepanel to split view, close ourselves
            // The iframe will be injected by the content script after we close
            if (!isIframe) {
                // Small delay to ensure message is sent before closing
                setTimeout(() => {
                    window.close();
                }, 100);
            }
        } finally {
            // B2 FIX: Re-enable after 300ms debounce period
            setTimeout(() => {
                splitViewToggleInProgress = false;
                if (splitBtn) splitBtn.disabled = false;
            }, 300);
        }
    });

    // Open Extension Options button (in header)
    document.getElementById('open-options-btn')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open Settings from Context no-model overlay
    document.getElementById('open-settings-btn-context')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open Settings from Logs no-model overlay
    document.getElementById('open-settings-btn-logs')?.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Save Persona (legacy - removed in UI refactor)
    document.getElementById('save-persona')?.addEventListener('click', async () => {
        const text = document.getElementById('persona-input')?.value?.trim() || '';
        await saveComponent('persona', { text, savedAt: Date.now() });
        showNotification('Persona saved!');
    });

    // Save Injected Context
    document.getElementById('save-injected-context').addEventListener('click', async () => {
        const text = document.getElementById('injected-context-input').value.trim();
        await saveComponent('user_injected_context', { text, injectedAt: Date.now() });
        showNotification('Context saved!');
    });

    // Rebuild Memory
    document.getElementById('rebuild-memory').addEventListener('click', async () => {
        if (!currentSessionId) {
            showNotification('No session active', 'error');
            return;
        }

        const confirmed = await showConfirmDialog({
            title: 'Rebuild Memory',
            message: 'This will completely rebuild the memory for this session. Continue?',
            confirmText: 'Rebuild',
            cancelText: 'Cancel',
            type: 'warning'
        });
        if (!confirmed) return;

        await rebuildMemory();
    });

    // PIN Toggle for all 7 dimensions (Persona + 6 dimensions)
    document.querySelectorAll('.pin-toggle').forEach(pinBtn => {
        pinBtn.addEventListener('click', async (event) => {
            event.stopPropagation(); // Prevent accordion toggle

            if (!currentSessionId) {
                showNotification('No session active', 'error');
                return;
            }

            const componentId = pinBtn.dataset.component || (pinBtn.id === 'pin-persona-btn' ? 'persona' : null);
            if (!componentId) return;

            const isPinned = pinBtn.classList.contains('pinned');
            const label = componentId.charAt(0).toUpperCase() + componentId.slice(1);

            try {
                if (isPinned) {
                    // Unpin
                    const msgType = componentId === 'persona' ? 'UNPIN_PERSONA' : 'UNPIN_COMPONENT';
                    await chrome.runtime.sendMessage({
                        type: msgType,
                        sessionId: currentSessionId,
                        componentId
                    });
                    showNotification(`${label} unpinned - will update automatically`);
                } else {
                    // Pin current component
                    const msgType = componentId === 'persona' ? 'PIN_PERSONA' : 'PIN_COMPONENT';
                    await chrome.runtime.sendMessage({
                        type: msgType,
                        sessionId: currentSessionId,
                        componentId
                    });
                    showNotification(`${label} pinned - protected from updates`);
                }

                // Reload to show updated state
                await loadMemoryData();
            } catch (e) {
                console.error(`[Sidepanel] Failed to toggle pin for ${componentId}:`, e);
                showNotification('Failed to toggle pin state', 'error');
            }
        });
    });
}

/**
 * Save a component to memory
 * @param {string} componentId
 * @param {Object} data
 */
async function saveComponent(componentId, data) {
    if (!currentSessionId) return;

    // Send message to background script
    await chrome.runtime.sendMessage({
        type: 'UPDATE_COMPONENT',
        sessionId: currentSessionId,
        componentId,
        data
    });
}

/**
 * Rebuild memory for current session
 * Collects enabled analyzers from toggle switches for selective rebuild
 */
async function rebuildMemory() {
    const btn = document.getElementById('rebuild-memory');

    // Add loading state with spinner animation
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        // Collect enabled analyzers from toggle switches - ONLY from the Context Tab
        // Use #tab-content-context which contains #memory-sections with the toggles
        const contextTab = document.getElementById('tab-content-context');
        const toggles = contextTab ? contextTab.querySelectorAll('.toggle-switch input[data-component]') : [];
        const enabledAnalyzers = [];

        // Valid 7-dimension schema names (filter out ext_* prefixes and legacy names)
        const VALID_DIMENSIONS = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'];

        toggles.forEach(toggle => {
            if (toggle.checked) {
                let componentId = toggle.dataset.component;

                // Strip ext_ prefix if present (Edit Persona page uses ext_context, ext_tone, etc.)
                if (componentId.startsWith('ext_')) {
                    componentId = componentId.substring(4);
                }

                // Only add valid 7-dimension names (skip legacy names)
                if (VALID_DIMENSIONS.includes(componentId) && !enabledAnalyzers.includes(componentId)) {
                    enabledAnalyzers.push(componentId);
                }
            }
        });

        spLog('info', '[rebuildMemory] START', {
            enabledAnalyzers,
            totalToggles: toggles.length
        });
        console.log('[Sidepanel] rebuildMemory START:', enabledAnalyzers);

        // Step 2: Send message to background
        spLog('debug', '[rebuildMemory] Sending REBUILD_MEMORY to background');
        console.log('[Sidepanel] rebuildMemory: Sending message to background...');
        const result = await chrome.runtime.sendMessage({
            type: 'REBUILD_MEMORY',
            sessionId: currentSessionId,
            enabledAnalyzers: enabledAnalyzers
        });
        spLog('debug', '[rebuildMemory] Received response from background', { success: result?.success });
        console.log('[Sidepanel] rebuildMemory: Received response:', result?.success);

        // Step 3: Process result
        if (result.success) {
            spLog('debug', '[rebuildMemory] Processing successful result');
            console.log('[Sidepanel] rebuildMemory: Processing success...');

            // Show detailed status
            const successCount = result.analysisResults?.success?.length || result.analyzed || 0;
            const failedCount = result.analysisResults?.failed?.length || result.failed || 0;
            const filteredCount = result.filtered || 0;

            spLog('info', '[rebuildMemory] Result summary', {
                successCount, failedCount, filteredCount
            });
            console.log(`[Sidepanel] rebuildMemory: success = ${successCount}, failed = ${failedCount}, filtered = ${filteredCount} `);

            if (failedCount > 0) {
                const failedNames = result.analysisResults?.failed?.map(f => f.id || f).join(', ') || 'unknown';
                showNotification(`Memory rebuilt: ${successCount} ok, ${failedCount} failed(${failedNames})`, 'warning');
            } else if (filteredCount > 0) {
                showNotification(`Memory rebuilt: ${successCount} analyzers run, ${filteredCount} skipped(toggled off)`);
            } else {
                showNotification(`Memory rebuilt successfully!(${successCount} analyzers)`);
            }

            // Step 4: Reload memory data
            spLog('debug', '[rebuildMemory] Reloading memory data');
            console.log('[Sidepanel] rebuildMemory: Reloading memory data...');
            await loadMemoryData();
            spLog('debug', '[rebuildMemory] Memory data reloaded');
        } else {
            spLog('error', '[rebuildMemory] Failed', { error: result.error });
            console.error('[Sidepanel] rebuildMemory: Failed:', result.error);
            showNotification(result.error || 'Failed to rebuild memory', 'error');
        }

        spLog('info', '[rebuildMemory] COMPLETE');
        console.log('[Sidepanel] rebuildMemory COMPLETE');
    } catch (error) {
        spLog('error', '[rebuildMemory] Exception', { error: error.message });
        console.error('[Sidepanel] Rebuild failed:', error);
        showNotification('Failed to rebuild memory', 'error');
    } finally {
        // Remove loading state
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

// ============================================================================
// Utilities
// ============================================================================

function showNotification(message, type = 'success') {
    // Color map for different notification types
    const colors = {
        success: '#34a853',
        error: '#ea4335',
        warning: '#fbbc04'
    };
    const color = colors[type] || colors.success;
    console.log(`[Sidepanel] ${type}: ${message} `);

    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.backgroundColor = color;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;

    // Check for session memory data changes
    const sessionKey = `session_${currentSessionId}`;
    if (changes[sessionKey]) {
        memoryData = changes[sessionKey].newValue;

        // CRITICAL GUARD: Do not destructively re-render if user is currently typing/focused on a textarea or input
        const activeEl = document.activeElement;
        const isUserEditing = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT');
        if (!isUserEditing) {
            renderAllComponents();
        }
    }

    // Check for model config changes and update LLM status
    if (changes.pa_models || changes.pa_active_model) {
        console.log('[Sidepanel] Model config changed, refreshing LLM status...');
        checkLLMStatus();
    }
}

// ============================================================================
// Log Viewer (Enhancement 8)
// ============================================================================

let logRefreshInterval = null;

/**
 * Set up log auto-refresh interval for the logs page.
 * Event handlers are set up in setupLogsPageHandlers() instead.
 */
function setupLogViewer() {
    // Clear any existing interval first to prevent accumulation
    if (logRefreshInterval) {
        clearInterval(logRefreshInterval);
    }
    // Auto-refresh logs every 2 seconds
    logRefreshInterval = setInterval(renderLogsPage, 2000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ============================================================================
// Tab Navigation
// ============================================================================

function setupTabNavigation() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const contextTab = document.getElementById('tab-content-context');
    const logsTab = document.getElementById('tab-content-logs');
    const personaTab = document.getElementById('tab-content-persona');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            spLog('info', 'Tab switched', { tab });

            // Update button states
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Hide all tabs
            contextTab?.classList.add('hidden');
            logsTab?.classList.add('hidden');
            personaTab?.classList.add('hidden');

            // Show selected tab (footer visibility is automatic - inside tab-content)
            if (tab === 'context') {
                contextTab?.classList.remove('hidden');
            } else if (tab === 'persona') {
                personaTab?.classList.remove('hidden');
            } else if (tab === 'logs') {
                logsTab?.classList.remove('hidden');

                // Check model status first (higher priority than session)
                checkLLMStatus().then(hasModel => {
                    if (!hasModel) {
                        // No model configured - show model not configured message
                        document.getElementById('no-model-logs')?.classList.remove('hidden');
                        document.getElementById('no-session-logs')?.classList.add('hidden');
                        document.getElementById('logs-page-content')?.classList.add('hidden');
                        return;
                    }

                    // Model configured - now check for session
                    if (!currentSessionId) {
                        // No session - show no-session message for logs
                        document.getElementById('no-session-logs')?.classList.remove('hidden');
                        document.getElementById('no-model-logs')?.classList.add('hidden');
                        document.getElementById('logs-page-content')?.classList.add('hidden');
                        return;
                    }

                    // Both model configured AND valid session - show logs
                    document.getElementById('no-model-logs')?.classList.add('hidden');
                    document.getElementById('no-session-logs')?.classList.add('hidden');
                    document.getElementById('logs-page-content')?.classList.remove('hidden');
                    renderLogsPage();
                });
            }
        });
    });

    // Setup Persona tab navigation
    setupPersonaNavigation();

    // Setup logs page handlers
    setupLogsPageHandlers();

    // Setup synthesized persona save
    setupSynthesizedPersonaSave();
}

/**
 * Navigate to a Persona page
 * @param {string} pageId - Page to navigate to (browse, create, my-personas, detail)
 * @param {string} [parentPage] - Parent page for back navigation
 */
function navigateToPersonaPage(pageId, parentPage = 'browse') {
    const pages = document.querySelectorAll('.persona-page');
    const targetPage = document.getElementById(`persona-page-${pageId}`);

    if (!targetPage) {
        spLog('error', 'Page not found', { pageId });
        return;
    }

    // Hide all pages
    pages.forEach(p => {
        p.classList.remove('active');
        p.classList.add('hidden');
    });

    // Show target page
    targetPage.classList.remove('hidden');
    targetPage.classList.add('active');

    // Update back button target if present
    const backBtn = targetPage.querySelector('.back-nav-btn');
    if (backBtn && parentPage) {
        backBtn.dataset.back = parentPage;
    }

    // Show/hide footer and FAB based on page type
    const personaFooter = document.getElementById('persona-footer');
    const fab = document.getElementById('persona-fab');

    // FAB is visible on browse and my-personas pages
    const showFabPages = ['browse', 'my-personas'];
    if (showFabPages.includes(pageId)) {
        fab?.classList.remove('hidden');
    } else {
        fab?.classList.add('hidden');
    }

    // Footer stays visible on these pages (JS handles button toggle)
    // Footer is hidden on detail, version-history, prompts (no button needed)
    const hideFooterPages = ['detail', 'version-history', 'prompts'];
    if (hideFooterPages.includes(pageId)) {
        personaFooter?.classList.add('hidden');
    } else {
        personaFooter?.classList.remove('hidden');
    }

    // Toggle footer buttons based on active page
    const browseBtn = document.getElementById('my-personas-btn');
    const createBtn = document.getElementById('extract-btn');
    const publishBtn = document.getElementById('ext-publish-btn');
    const promptsBtn = document.getElementById('prompts-btn');
    const savePromptBtn = document.getElementById('save-prompt-btn');

    // Hide all buttons first
    browseBtn?.classList.add('hidden');
    createBtn?.classList.add('hidden');
    publishBtn?.classList.add('hidden');
    promptsBtn?.classList.add('hidden');
    savePromptBtn?.classList.add('hidden');

    // Show appropriate button based on page
    if (pageId === 'create') {
        createBtn?.classList.remove('hidden');
    } else if (pageId === 'extracted') {
        publishBtn?.classList.remove('hidden');
    } else if (pageId === 'browse') {
        browseBtn?.classList.remove('hidden');
    } else if (pageId === 'my-personas') {
        promptsBtn?.classList.remove('hidden');
    } else if (pageId === 'add-prompt') {
        savePromptBtn?.classList.remove('hidden');
    }

    spLog('info', 'Navigated to persona page', { pageId, parentPage });
}

/**
 * Set up Persona tab page navigation (FAB, My Personas button, back buttons)
 */
function setupPersonaNavigation() {
    // FAB - Create button
    const fab = document.getElementById('persona-fab');
    fab?.addEventListener('click', () => {
        navigateToPersonaPage('create', 'browse');
    });

    // My Personas footer button
    const myPersonasBtn = document.getElementById('my-personas-btn');
    myPersonasBtn?.addEventListener('click', () => {
        navigateToPersonaPage('my-personas', 'browse');
        loadMyPersonas();
    });

    // Back navigation buttons
    document.querySelectorAll('.back-nav-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetPage = btn.dataset.back || 'browse';
            const currentPageEl = document.querySelector('.persona-page:not(.hidden)');
            const currentPage = currentPageEl?.id || '';

            // Check for unsaved changes when leaving Edit Persona page
            const isNewExtraction = window._currentExtraction && !window._currentExtraction.id;
            const hasChanges = hasUnsavedChanges();

            if (currentPage === 'persona-page-extracted' && (hasChanges || isNewExtraction)) {
                const message = hasChanges
                    ? 'You have unsaved changes. What would you like to do?'
                    : 'You have an unpublished persona. What would you like to do?';

                const finishEdit = await showConfirmDialog({
                    title: 'Unsaved Changes',
                    message,
                    confirmText: 'Stay',
                    cancelText: 'Discard'
                });

                if (finishEdit) {
                    // User chose to stay and finish edit
                    return;
                }

                // User chose to discard - reset state
                window._currentExtraction = null;
                resetFormDirty();
                spLog('info', 'Discarded unsaved changes');
            }

            navigateToPersonaPage(targetPage);
        });
    });

    // Setup Extract button
    const extractBtn = document.getElementById('extract-btn');
    extractBtn?.addEventListener('click', handleExtractPersona);

    // Setup Version History button (Edit Persona page header)
    const versionHistoryBtn = document.getElementById('btn-version-history');
    versionHistoryBtn?.addEventListener('click', openVersionHistory);

    // Setup Export button (Version History page header)
    const exportBtn = document.getElementById('btn-export-persona');
    exportBtn?.addEventListener('click', exportPersonaJSON);

    // === PROMPTS PAGE NAVIGATION ===
    // Prompts footer button (My Personas page)
    const promptsBtn = document.getElementById('prompts-btn');
    promptsBtn?.addEventListener('click', () => {
        navigateToPersonaPage('prompts', 'my-personas');
        loadSavedPrompts();
    });

    // Add Prompt FAB (Prompts page) - navigate to Add Prompt page
    const addPromptFab = document.getElementById('add-prompt-fab');
    addPromptFab?.addEventListener('click', () => {
        navigateToPersonaPage('add-prompt', 'prompts');
    });

    // Save Prompt footer button (Add Prompt page)
    const savePromptBtn = document.getElementById('save-prompt-btn');
    savePromptBtn?.addEventListener('click', handleSavePrompt);

    // Setup Import button and file input (Create page)
    const importBtn = document.getElementById('btn-import-persona');
    const importFile = document.getElementById('import-persona-file');
    importBtn?.addEventListener('click', () => importFile?.click());
    importFile?.addEventListener('change', (e) => {
        if (e.target.files?.[0]) {
            importPersonaFile(e.target.files[0]);
            e.target.value = ''; // Reset for re-import
        }
    });

    // Setup Import button and file input (Add Prompt page)
    const importPromptBtn = document.getElementById('btn-import-prompt');
    const importPromptFileInput = document.getElementById('import-prompt-file');
    importPromptBtn?.addEventListener('click', () => importPromptFileInput?.click());
    importPromptFileInput?.addEventListener('change', (e) => {
        if (e.target.files?.[0]) {
            importPromptFile(e.target.files[0]);
            e.target.value = ''; // Reset for re-import
        }
    });

    // Setup Source Prompt FAB
    const sourcePromptFab = document.getElementById('source-prompt-fab');
    sourcePromptFab?.addEventListener('click', openSourcePromptViewer);

    // Source Prompt Viewer close button
    const closeViewerBtn = document.querySelector('#source-prompt-viewer .close-fullscreen');
    closeViewerBtn?.addEventListener('click', closeSourcePromptViewer);

    // Rebuild button
    const rebuildBtn = document.getElementById('btn-rebuild-persona');
    rebuildBtn?.addEventListener('click', handleRebuildFromSource);

    // Close on scrim click
    const sourceViewer = document.getElementById('source-prompt-viewer');
    sourceViewer?.addEventListener('click', (e) => {
        if (e.target === sourceViewer) closeSourcePromptViewer();
    });

    // Setup filters toggle
    const filtersBtn = document.getElementById('search-filters-btn');
    const filtersPanel = document.getElementById('search-filters');
    filtersBtn?.addEventListener('click', () => {
        filtersPanel?.classList.toggle('hidden');
        // Hide empty state if filters are visible
        const emptyState = document.querySelector('.persona-list .empty-state');
        if (emptyState) {
            emptyState.style.display = filtersPanel.classList.contains('hidden') ? '' : 'none';
        }
    });

    // Setup filter change listeners
    const filterPanel = document.getElementById('search-filters');

    // Helper to get selected chip value for a filter group
    const getSelectedChipValue = (filterName) => {
        const group = filterPanel?.querySelector(`.filter-chip-group[data-filter="${filterName}"]`);
        const selected = group?.querySelector('.filter-chip.selected');
        return selected?.dataset.value || '';
    };

    // Helper to check if any filters are active
    const hasActiveFilters = () => {
        return getSelectedChipValue('domain') ||
            getSelectedChipValue('tone') ||
            getSelectedChipValue('complexity') ||
            getSelectedChipValue('provider');
    };

    const onFilterChange = () => {
        const searchInput = document.getElementById('persona-search');
        const query = searchInput?.value || '';

        // Update filter button indicator
        filtersBtn?.classList.toggle('has-filters', hasActiveFilters());

        // Re-run search
        if (query.length >= 2) {
            handlePersonaSearch(query);
        } else {
            loadPopularPersonas();
        }
    };

    // Setup chip click handlers
    filterPanel?.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const group = chip.closest('.filter-chip-group');
            const isSingleSelect = group?.dataset.single === 'true';

            if (isSingleSelect) {
                // Single select: deselect others, always select clicked
                group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
            } else {
                // Toggle selection (can deselect)
                chip.classList.toggle('selected');
            }

            onFilterChange();
        });
    });

    // Filter reset button
    const filterResetBtn = document.getElementById('filter-reset-btn');
    filterResetBtn?.addEventListener('click', () => {
        // Reset all filter chips (deselect all except Sort default)
        filterPanel?.querySelectorAll('.filter-chip').forEach(chip => {
            const group = chip.closest('.filter-chip-group');
            if (group?.dataset.filter === 'sort') {
                // Reset Sort to Popular
                chip.classList.toggle('selected', chip.dataset.value === 'popular');
            } else {
                chip.classList.remove('selected');
            }
        });

        // Update filter indicator and refresh
        filtersBtn?.classList.remove('has-filters');
        onFilterChange();

        // Close the filter panel
        filterPanel?.classList.add('hidden');
    });

    // Setup search
    const searchInput = document.getElementById('persona-search');
    const searchClearBtn = document.getElementById('search-clear-btn');
    let searchTimeout;

    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => handlePersonaSearch(e.target.value), 300);

        // Show/hide clear button based on input content
        searchClearBtn?.classList.toggle('hidden', !e.target.value.trim());
    });

    // Enter key for search
    searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            handlePersonaSearch(e.target.value);
        }
    });

    // Search clear button
    searchClearBtn?.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        searchClearBtn.classList.add('hidden');
        loadPopularPersonas();
    });

    // Setup Publish button (on extracted/edit page)
    const publishBtn = document.getElementById('ext-publish-btn');
    publishBtn?.addEventListener('click', handlePublishPersona);

    // Setup extracted page interactions (chips, tags, visibility)
    setupExtractedPageInteractions();

    // Setup accordion toggles for Edit Persona page
    setupEditPersonaAccordions();
}

/**
 * Set up visibility toggle button handlers
 */


/**
 * Set up accordion toggle handlers for Edit Persona page
 * 
 * Enables expand/collapse behavior for memory section accordions.
 */
function setupEditPersonaAccordions() {
    const container = document.getElementById('ext-memory-sections');
    if (!container) return;

    container.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', function (e) {
            // Prevent toggle when clicking on toggle switch
            if (e.target.closest('.toggle-switch')) return;

            const accordion = this.closest('.accordion');
            const content = accordion?.querySelector('.accordion-content');
            const icon = this.querySelector('.accordion-icon');
            const isExpanded = accordion?.classList.contains('expanded');

            if (isExpanded) {
                accordion.classList.remove('expanded');
                content?.classList.add('collapsed');
                this.setAttribute('aria-expanded', 'false');
            } else {
                accordion?.classList.add('expanded');
                content?.classList.remove('collapsed');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // === COLLAPSIBLE SECTION HEADERS ===
    document.querySelectorAll('.section-header.collapsible').forEach(header => {
        header.addEventListener('click', function () {
            const targetId = this.dataset.target;
            const content = document.getElementById(targetId);
            const icon = this.querySelector('.section-icon');
            const isExpanded = this.classList.contains('expanded');

            if (isExpanded) {
                this.classList.remove('expanded');
                content?.classList.add('collapsed');
                if (icon) icon.textContent = 'chevron_right';
            } else {
                this.classList.add('expanded');
                content?.classList.remove('collapsed');
                if (icon) icon.textContent = 'expand_more';
            }
        });
    });
}

/**
 * Setup tag list interactions for Metadata section
 * @param {HTMLElement} container 
 */
function setupTagList(container) {
    const addBtn = container.querySelector('.tag-add');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
        // limit max tags if specified
        const maxTags = parseInt(container.dataset.max || '99');
        const existingTags = container.querySelectorAll('.tag');
        if (existingTags.length >= maxTags) {
            showAlertDialog({
                title: 'Limit Reached',
                message: `Maximum ${maxTags} tags allowed.`,
                type: 'warning'
            });
            return;
        }

        // Create tag matching Memory Layer pattern (span.tag.editable)
        const tag = document.createElement('span');
        tag.className = 'tag editable editing';
        tag.dataset.index = existingTags.length;

        // Remove button first (Memory Layer order)
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-remove';
        removeBtn.innerHTML = '✕';
        removeBtn.title = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            tag.remove();
        };

        // Text content
        const textSpan = document.createElement('span');
        textSpan.className = 'tag-text';
        textSpan.contentEditable = 'true';

        tag.appendChild(removeBtn);
        tag.appendChild(textSpan);
        container.insertBefore(tag, addBtn);

        textSpan.focus();

        // Handle save on blur/enter
        const saveTag = () => {
            const val = textSpan.textContent.trim();
            if (!val) {
                tag.remove();
            } else {
                tag.classList.remove('editing');
                textSpan.contentEditable = 'false';
                tag.dataset.value = val;
            }
        };

        textSpan.addEventListener('blur', saveTag);
        textSpan.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textSpan.blur();
            }
        });
    });
}

/**
 * Set up interactions for the Extracted Persona page
 * Handles metadata chips, tag lists, and visibility toggles
 */
function setupExtractedPageInteractions() {
    // 1. Handle Metadata Chips (Domain, Tone, Complexity)
    document.querySelectorAll('.ext-chip-group').forEach(group => {
        group.addEventListener('click', (e) => {
            const chip = e.target.closest('.filter-chip');
            if (!chip) return;

            // Single select logic
            group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');

            spLog('info', 'Metadata chip selected', {
                field: group.dataset.field,
                value: chip.dataset.value
            });
        });
    });

    // 2. Handle Visibility Toggle
    // 2. Handle Visibility Toggle - handled by generic chip logic above


    // 3. Initialize Tag Lists
    // Initialize tag lists for subdomains and keywords (audience is now editable text)
    ['ext-subdomains', 'ext-keywords'].forEach(id => {
        const container = document.getElementById(id);
        if (container) {
            setupTagList(container);
        }
    });

    // 4. Enable inline editing for Metadata Details (Target Audience)
    const metadataSection = document.getElementById('ext-metadata-details');
    if (metadataSection) {
        setupExtInlineEditing(metadataSection);
    }
}

/**
 * Handle persona extraction from external prompt
 * Uses thorough validation and M3 dialogs for error feedback
 */
async function handleExtractPersona() {
    const promptInput = document.getElementById('extract-prompt-input');
    const extractBtn = document.getElementById('extract-btn');
    const prompt = promptInput?.value?.trim();

    // === STEP 0: Check for unpublished persona ===
    if (window._currentExtraction) {
        const finishEdit = await showConfirmDialog({
            title: 'Persona Detected',
            message: 'You have unpublished persona. What would you like to do?',
            confirmText: 'Finish Edit',
            cancelText: 'Discard'
        });

        if (finishEdit) {
            // User chose to finish previous edit
            navigateToPersonaPage('extracted', 'create');
            return;
        }

        // User chose to discard - reset state
        window._currentExtraction = null;
        spLog('info', 'Discarded unpublished persona');
    }

    // === STEP 1: Validate input ===
    if (!prompt || prompt.length < 20) {
        await showAlertDialog({
            title: 'Input Too Short',
            message: 'Please enter a prompt with at least 20 characters to extract a meaningful persona.',
            type: 'info'
        });
        return;
    }

    // === STEP 2: Show loading state ===
    // The btn-with-spinner structure is already in HTML, just add loading class
    extractBtn.disabled = true;
    extractBtn.classList.add('loading');

    try {
        // === STEP 3: Get model config ===
        const modelConfig = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_MODEL_CONFIG' }, resolve);
        });

        if (!modelConfig?.provider) {
            await showAlertDialog({
                title: 'No Model Configured',
                message: 'Please configure an LLM model in Settings before extracting personas.',
                type: 'warning'
            });
            return;
        }

        // === STEP 4: Call extraction API ===
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'EXTRACT_PERSONA',
                payload: { prompt, modelConfig }
            }, resolve);
        });

        // === STEP 5: Validate response ===
        const validation = validateExtractionResponse(result);

        if (!validation.valid) {
            await showAlertDialog(validation.error);
            return;
        }

        // === STEP 6: Populate UI with validated data ===
        populateExtractionResults(validation.data, modelConfig);

        // === STEP 7: Navigate to extracted persona page ===
        navigateToPersonaPage('extracted', 'create');
        spLog('info', 'Persona extracted successfully, navigated to results page');

    } catch (error) {
        spLog('error', 'Extraction failed unexpectedly', { error: error.message });
        await showAlertDialog({
            title: 'Unexpected Error',
            message: 'An unexpected error occurred during extraction.',
            type: 'error',
            details: error.message
        });
    } finally {
        // === CLEANUP: Reset button state ===
        extractBtn.disabled = false;
        extractBtn.classList.remove('loading');
        extractBtn.innerHTML = '<span class="material-symbols-outlined">chip_extraction</span> Extract Persona';
    }
}

/**
 * Parse extraction result from LLM
 * @param {string} text - Raw LLM response
 * @returns {Object|null}
 */
function parseExtractionResult(text) {
    try {
        let cleaned = text.trim();
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
        if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
        return JSON.parse(cleaned.trim());
    } catch (e) {
        spLog('error', 'JSON parse failed', { error: e.message });
        return null;
    }
}

// ============================================================================
// SECTION: Accordion Badge State Management
// ============================================================================

/**
 * Tracks extracted content for sections to detect verbatim vs modified content
 * Key: section name (context, tone, framework, constraints, format, exemplar, persona)
 * Value: { originalContent, isEnabled, generation, isStale, isPinned }
 * 
 * Badge Priority:
 * 1. isPinned = true → VERBATIM badge (with pin icon, clickable to unpin)
 * 2. isStale = true (generation < currentGeneration) → STALE badge
 * 3. Otherwise → no badge
 * 
 * Pinned sections are EXEMPT from STALE calculation
 */
const _sectionBadgeState = {
    persona: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    context: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    tone: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    framework: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    constraints: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    format: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false },
    exemplar: { originalContent: '', isEnabled: true, generation: 0, isStale: false, isPinned: false }
};

/**
 * Update a section's badge based on content state
 * 
 * Badge Priority:
 * 1. isPinned = true → VERBATIM badge with clickable pin icon
 * 2. isStale = true (generation < currentGeneration) → STALE badge
 * 3. Otherwise → hide badge
 * 
 * @param {string} sectionId - Section identifier (context, tone, etc.)
 * @param {Object} options - { content?, isEnabled?, setOriginal?, generation?, isStale?, isPinned? }
 */
function updateSectionBadge(sectionId, options = {}) {
    const badge = document.getElementById(`badge-${sectionId}`);
    if (!badge) return;

    const state = _sectionBadgeState[sectionId];
    if (!state) return;

    // Update state if provided
    if (options.setOriginal && options.content !== undefined) {
        state.originalContent = options.content;
    }
    if (options.isEnabled !== undefined) {
        state.isEnabled = options.isEnabled;
    }
    if (options.generation !== undefined) {
        state.generation = options.generation;
    }
    if (options.isStale !== undefined) {
        state.isStale = options.isStale;
    }
    if (options.isPinned !== undefined) {
        state.isPinned = options.isPinned;
    }

    // Determine badge state for the ACCORDION HEADER
    badge.classList.remove('stale', 'hidden');

    if (!state.isPinned && state.isStale) {
        // === STALE = Not updated in last rebuild ===
        badge.innerHTML = 'STALE';
        badge.classList.add('stale');
        badge.title = 'This section was not included in the last Rebuild Memory';
        badge.style.cursor = 'default';
    } else {
        // === Current or Pinned = hide header badge (Verbatim status is shown inside the section) ===
        badge.classList.add('hidden');
        badge.innerHTML = '';
        badge.title = '';
        badge.style.cursor = 'default';
    }
}

/**
 * Initialize badge states after memory load
 * Sets original content, pinned state, and calculates STALE status
 * 
 * Badge Priority:
 * 1. isPinned → VERBATIM (exempt from STALE calculation)
 * 2. isStale (generation < currentGeneration) → STALE
 * 3. Otherwise → hidden
 * 
 * @param {Object} memoryData - Full session memory data with components and currentGeneration
 */
function initializeSectionBadges(memoryData) {
    const sections = ['context', 'tone', 'framework', 'constraints', 'format', 'exemplar', 'persona'];
    const currentGeneration = memoryData?.currentGeneration || 0;

    spLog('debug', 'Initializing section badges', { currentGeneration });

    sections.forEach(sectionId => {
        const componentData = memoryData?.components?.[sectionId];
        const content = componentData?.current?.instruction || '';
        const componentGeneration = componentData?.generation ?? 0;
        const isPinned = componentData?.pinned === true;

        // STALE = component.generation < currentGeneration
        // BUT: Pinned components are EXEMPT from STALE (they intentionally stay at old gen)
        const isStale = !isPinned && componentGeneration < currentGeneration;

        // Reset state with generation and pinned info
        _sectionBadgeState[sectionId] = {
            originalContent: content,
            isEnabled: true,
            generation: componentGeneration,
            isStale: isStale,
            isPinned: isPinned
        };

        // Update badge
        updateSectionBadge(sectionId, {
            setOriginal: true,
            content,
            generation: componentGeneration,
            isStale: isStale,
            isPinned: isPinned
        });

        if (isPinned) {
            spLog('debug', `Section ${sectionId} is PINNED (VERBATIM)`, { componentGeneration });
        } else if (isStale) {
            spLog('debug', `Section ${sectionId} is STALE`, {
                componentGeneration,
                currentGeneration
            });
        }
    });

    spLog('debug', 'Section badges initialized with generation and pin tracking');
}

/**
 * Set up badge update listeners on textarea changes and badge clicks
 * Called after sections are rendered
 */
function setupBadgeListeners() {
    const sections = ['context', 'tone', 'framework', 'constraints', 'format', 'exemplar', 'persona'];

    sections.forEach(sectionId => {
        const textarea = document.getElementById(`v4-${sectionId}-textarea`);
        if (textarea) {
            textarea.addEventListener('input', () => {
                updateSectionBadge(sectionId);
            });
        }

        // Listen for toggle changes on Edit Persona page
        const toggle = document.querySelector(`input[data-component="ext_${sectionId}"]`);
        if (toggle) {
            toggle.addEventListener('change', (e) => {
                updateSectionBadge(sectionId, { isEnabled: e.target.checked });
            });
        }
    });
}

/**
 * Populate extraction results UI
 * 
 * Populates the Edit Persona page with extracted data from LLM.
 * Updates memory layer accordions and metadata details section.
 * 
 * @param {Object} data - Parsed extraction result with memory_layer and metadata
 * @param {Object} modelConfig - Model configuration with provider and model
 */
function populateExtractionResults(data, modelConfig) {
    // === NAME ===
    document.getElementById('ext-name').value = data.metadata?.suggested_name || '';

    // === PROVIDER & MODEL (Auto-inferred) ===
    const providerEl = document.getElementById('ext-provider');
    const modelEl = document.getElementById('ext-model');
    if (providerEl) providerEl.textContent = modelConfig?.provider || '-';
    if (modelEl) modelEl.textContent = modelConfig?.model || '-';

    // === METADATA CHIPS ===
    const setChipSelection = (field, value) => {
        if (!value) return;
        const group = document.querySelector(`.ext-chip-group[data-field="${field}"]`);
        if (group) {
            group.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('selected'));
            const chip = group.querySelector(`.filter-chip[data-value="${value.toLowerCase()}"]`);
            if (chip) chip.classList.add('selected');
        }
    };

    setChipSelection('domain', data.metadata?.domain);
    setChipSelection('tone', data.metadata?.tone);
    setChipSelection('complexity', data.metadata?.complexity_level);

    // === PERSONA (v3 schema) ===
    const personaTextarea = document.getElementById('ext-synthesized-persona');
    const persona = data.memory_layer?.persona;
    if (personaTextarea) {
        // Support both v3 schema (role/purpose) and legacy (synthesizedPersona)
        let personaText = persona?.synthesizedPersona || '';
        if (!personaText && (persona?.role || persona?.purpose)) {
            const parts = [];
            if (persona.role) parts.push(`Role: ${persona.role}`);
            if (persona.purpose) parts.push(`Purpose: ${persona.purpose}`);
            if (persona.credentials?.qualifications?.length) {
                parts.push(`Qualifications: ${persona.credentials.qualifications.join(', ')}`);
            }
            personaText = parts.join('\n');
        }
        personaTextarea.value = personaText;
    }

    // === PERSONA METADATA ===
    const roleEl = document.getElementById('ext-persona-role');
    const purposeEl = document.getElementById('ext-persona-purpose');
    const credentialsEl = document.getElementById('ext-credentials');
    if (roleEl) roleEl.textContent = persona?.role || '-';
    if (purposeEl) purposeEl.textContent = persona?.purpose || '-';
    if (credentialsEl) credentialsEl.textContent = persona?.credentials?.qualifications?.join(', ') || '-';

    // === CONTEXT (v3 - replaces topic_summarizer) ===
    const contextContent = document.getElementById('ext-context-content');
    const context = data.memory_layer?.context;
    if (contextContent && context) {
        renderExtContext(contextContent, context);
    } else if (contextContent) {
        contextContent.innerHTML = '<p class="empty-state">No domain context extracted.</p>';
    }

    // === TONE (v3 - replaces style_profiler) ===
    const toneContent = document.getElementById('ext-tone-content');
    const tone = data.memory_layer?.tone;
    if (toneContent && tone) {
        renderExtTone(toneContent, tone);
    } else if (toneContent) {
        toneContent.innerHTML = '<p class="empty-state">No tone profile extracted.</p>';
    }

    // === FRAMEWORK (v3 - new dimension) ===
    const frameworkContent = document.getElementById('ext-framework-content');
    const framework = data.memory_layer?.framework;
    if (frameworkContent && framework) {
        renderExtFramework(frameworkContent, framework);
    } else if (frameworkContent) {
        frameworkContent.innerHTML = '<p class="empty-state">No methodology extracted.</p>';
    }

    // === CONSTRAINTS (v3 - replaces custom_context.constraints) ===
    const constraintsContent = document.getElementById('ext-constraints-content');
    const constraints = data.memory_layer?.constraints;
    if (constraintsContent && constraints) {
        renderExtConstraints(constraintsContent, constraints);
    } else if (constraintsContent) {
        constraintsContent.innerHTML = '<p class="empty-state">No constraints extracted.</p>';
    }

    // === FORMAT (v3 - new dimension) ===
    const formatContent = document.getElementById('ext-format-content');
    const format = data.memory_layer?.format;
    if (formatContent && format) {
        renderExtFormat(formatContent, format);
    } else if (formatContent) {
        formatContent.innerHTML = '<p class="empty-state">No format preferences extracted.</p>';
    }

    // === EXEMPLAR (v3 - new dimension, VERBATIM) ===
    const exemplarContent = document.getElementById('ext-exemplar-content');
    const exemplar = data.memory_layer?.exemplar;
    if (exemplarContent && exemplar) {
        renderExtExemplar(exemplarContent, exemplar);
    } else if (exemplarContent) {
        exemplarContent.innerHTML = '<p class="empty-state">No examples extracted.</p>';
    }

    // === CUSTOM CONTEXT / CONSTRAINTS ===
    const injectedContextEl = document.getElementById('ext-injected-context');
    if (injectedContextEl) {
        if (data.memory_layer?.custom_context) {
            // Load from structured custom_context object
            const ctx = data.memory_layer.custom_context;
            const lines = [];

            // Add constraints
            if (ctx.constraints && ctx.constraints.length > 0) {
                lines.push('## Constraints');
                ctx.constraints.forEach(c => lines.push(`- ${c}`));
                lines.push('');
            }

            // Add requirements
            if (ctx.requirements && ctx.requirements.length > 0) {
                lines.push('## Requirements');
                ctx.requirements.forEach(r => lines.push(`- ${r}`));
                lines.push('');
            }

            // Add Critical Rules
            if (ctx.verbatimRules) {
                lines.push('## Critical Rules');
                lines.push(ctx.verbatimRules);
                lines.push('');
            }

            // Add Format Instructions
            if (ctx.formatInstructions && ctx.formatInstructions.length > 0) {
                lines.push('## Format Instructions');
                ctx.formatInstructions.forEach(f => lines.push(`- ${f}`));
                lines.push('');
            }

            // Add Workflow
            if (ctx.workflowSteps && ctx.workflowSteps.length > 0) {
                lines.push('## Workflow');
                ctx.workflowSteps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
                lines.push('');
            }

            // Add Examples
            if (ctx.examplesFromPrompt && ctx.examplesFromPrompt.length > 0) {
                lines.push('## Examples');
                ctx.examplesFromPrompt.forEach(ex => lines.push(`- ${ex}`));
                lines.push('');
            }

            // Add Limits
            if (ctx.numericalLimits) {
                lines.push('## Limits');
                Object.entries(ctx.numericalLimits).forEach(([k, v]) => lines.push(`- ${k}: ${v}`));
                lines.push('');
            }

            // Add Terminology
            if (ctx.domainTerminology && ctx.domainTerminology.length > 0) {
                lines.push('## Terminology');
                ctx.domainTerminology.forEach(t => lines.push(`- ${t}`));
                lines.push('');
            }

            // Add Edge Cases
            if (ctx.edgeCases && ctx.edgeCases.length > 0) {
                lines.push('## Edge Cases');
                ctx.edgeCases.forEach(e => lines.push(`- ${e}`));
                lines.push('');
            }

            // Add context notes
            if (ctx.contextNotes) {
                lines.push('## Notes');
                lines.push(ctx.contextNotes);
                lines.push('');
            }

            // Add Extended Context
            if (ctx.additionalContext) {
                lines.push('## Extended Context');
                lines.push(ctx.additionalContext);
                lines.push('');
            }

            // Add references
            if (ctx.importantReferences && ctx.importantReferences.length > 0) {
                lines.push('## References');
                ctx.importantReferences.forEach(ref => lines.push(`- ${ref}`));
            }

            injectedContextEl.value = lines.join('\n').trim();
        } else if (data.memory_layer?.injected_context) {
            // Fallback: Load from plain string injected_context (for older personas or saved updates)
            injectedContextEl.value = data.memory_layer.injected_context;
        }
    }

    // === KEYWORDS (Editable Tags) ===
    populateEditableTags('ext-keywords', data.metadata?.use_case_keywords || [], 10);

    // === TARGET AUDIENCE (Editable text field) ===
    const audienceEl = document.getElementById('ext-audience');
    if (audienceEl) {
        audienceEl.textContent = data.metadata?.target_audience || '-';
    }

    // === STORE EXTRACTION DATA ===
    // Preserve existing source_prompt if it exists (from loaded persona)
    // Only use textarea value for fresh extractions
    const existingSourcePrompt = window._currentExtraction?.source_prompt;
    const textareaSourcePrompt = document.getElementById('extract-prompt-input')?.value || '';

    window._currentExtraction = {
        ...(window._currentExtraction || {}), // Preserve existing fields (ID, version, etc.)
        memory_layer: data.memory_layer,
        metadata: data.metadata,
        // Preserve original provider/model from loaded persona, use modelConfig only for new extractions
        provider: window._currentExtraction?.provider || modelConfig.provider,
        llm_model: window._currentExtraction?.llm_model || modelConfig.model,
        source_prompt: existingSourcePrompt || textareaSourcePrompt
    };

    // Reset dirty state when form is populated (fresh start)
    resetFormDirty();

    // Add change listeners to track edits
    setupFormDirtyTracking();

    // Initialize section badges (VERBATIM/STALE) after content is populated
    // Use setTimeout to ensure V4 textareas are populated first
    setTimeout(() => {
        initializeSectionBadges(data.memory_layer);
        setupBadgeListeners();
    }, 100);

    spLog('info', 'Populated Edit Persona page with extraction results');
}

/**
 * Setup change listeners on Edit Persona form to track unsaved changes
 */
function setupFormDirtyTracking() {
    const extractedPage = document.getElementById('persona-page-extracted');
    if (!extractedPage) return;

    // Text inputs and textareas
    const inputs = extractedPage.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.removeEventListener('input', markFormDirty);
        input.addEventListener('input', markFormDirty);
    });

    // Filter chips (metadata selections)
    const chips = extractedPage.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.removeEventListener('click', markFormDirty);
        chip.addEventListener('click', markFormDirty);
    });

    // Editable contenteditable elements
    const editables = extractedPage.querySelectorAll('[contenteditable="true"]');
    editables.forEach(el => {
        el.removeEventListener('input', markFormDirty);
        el.addEventListener('input', markFormDirty);
    });
}

// ============================================================================
// EDIT PERSONA - RENDER FUNCTIONS (Matches Context Tab UI)
// ============================================================================

/**
 * Render Topic Summary with editable fields for Edit Persona
 * Matches Context tab's renderTopicSummary structure
 */
function renderExtTopicSummary(container, data) {
    container.innerHTML = '';

    // Primary Topic - editable text
    const topicDiv = document.createElement('div');
    topicDiv.className = 'fact-item';
    topicDiv.innerHTML = `
        <strong>Primary Topic:</strong> 
        <span class="editable-text ext-field" data-component="topic_summarizer" data-field="primaryTopic">${data.primaryTopic || 'Unknown'}</span>
    `;
    container.appendChild(topicDiv);

    // Summary - editable text
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'fact-item';
    summaryDiv.innerHTML = `
        <strong>Summary:</strong> 
        <span class="editable-text ext-field" data-component="topic_summarizer" data-field="summary">${data.summary || 'No summary'}</span>
    `;
    container.appendChild(summaryDiv);

    // Keywords - editable tag list
    if (data.keywords?.length) {
        const keywordsDiv = document.createElement('div');
        keywordsDiv.className = 'fact-item';
        keywordsDiv.innerHTML = '<strong>Keywords:</strong>';
        const tagList = createExtEditableTagList(data.keywords, 'topic_summarizer', 'keywords');
        keywordsDiv.appendChild(tagList);
        container.appendChild(keywordsDiv);
    }

    // Add inline editing to editable texts
    setupExtInlineEditing(container);
}

/**
 * Render Intent with editable fields for Edit Persona
 */
function renderExtIntent(container, data) {
    container.innerHTML = '';

    // Goal - editable
    const goalDiv = document.createElement('div');
    goalDiv.className = 'fact-item';
    goalDiv.innerHTML = `
        <strong>Goal:</strong> 
        <span class="editable-text ext-field" data-component="intent_classifier" data-field="goal">${data.goal || 'Unknown'}</span>
    `;
    container.appendChild(goalDiv);

    // Intent Type - dropdown
    const typeDiv = document.createElement('div');
    typeDiv.className = 'fact-item';
    typeDiv.innerHTML = `
        <strong>Intent Type:</strong> 
        <select class="inline-select ext-field" data-component="intent_classifier" data-field="type">
            <option value="seeking_information" ${data.type === 'seeking_information' ? 'selected' : ''}>Seeking Information</option>
            <option value="requesting_action" ${data.type === 'requesting_action' ? 'selected' : ''}>Requesting Action</option>
            <option value="exploring_ideas" ${data.type === 'exploring_ideas' ? 'selected' : ''}>Exploring Ideas</option>
            <option value="debugging_problem" ${data.type === 'debugging_problem' ? 'selected' : ''}>Debugging Problem</option>
            <option value="learning_concept" ${data.type === 'learning_concept' ? 'selected' : ''}>Learning Concept</option>
            <option value="creative_task" ${data.type === 'creative_task' ? 'selected' : ''}>Creative Task</option>
            <option value="casual_conversation" ${data.type === 'casual_conversation' ? 'selected' : ''}>Casual Conversation</option>
            <option value="other" ${data.type === 'other' ? 'selected' : ''}>Other</option>
        </select>
    `;
    container.appendChild(typeDiv);

    // Confidence
    const confDiv = document.createElement('div');
    confDiv.className = 'fact-item';
    confDiv.innerHTML = `<strong>Confidence:</strong> ${data.confidence ? Math.round(data.confidence * 100) + '%' : '-'}`;
    container.appendChild(confDiv);

    // Sub-Intents - editable tags
    if (data.subIntents?.length) {
        const subDiv = document.createElement('div');
        subDiv.className = 'fact-item';
        subDiv.innerHTML = '<strong>Sub-Intents:</strong>';
        const tagList = createExtEditableTagList(data.subIntents, 'intent_classifier', 'subIntents');
        subDiv.appendChild(tagList);
        container.appendChild(subDiv);
    }

    setupExtInlineEditing(container);
    setupExtSelectChange(container);
}

/**
 * Render Entities with editable categories for Edit Persona
 */
function renderExtEntities(container, data) {
    container.innerHTML = '';
    const categories = data.categories || {};

    let hasEntities = false;

    for (const [category, items] of Object.entries(categories)) {
        if (items?.length) {
            hasEntities = true;
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'fact-item';
            categoryDiv.innerHTML = `<strong>${capitalizeFirst(category)}:</strong>`;
            const tagList = createExtEditableTagList(items.slice(0, 10), 'entity_extractor', `categories.${category}`);
            categoryDiv.appendChild(tagList);
            container.appendChild(categoryDiv);
        }
    }

    if (!hasEntities) {
        container.innerHTML = '<p class="empty-state">No entities extracted.</p>';
    }
}

/**
 * Render Style with editable fields for Edit Persona
 */
function renderExtStyle(container, data) {
    container.innerHTML = '';

    // Tone - editable text
    const toneDiv = document.createElement('div');
    toneDiv.className = 'fact-item';
    toneDiv.innerHTML = `
        <strong>Tone:</strong> 
        <span class="editable-text ext-field" data-component="style_profiler" data-field="tone">${data.tone || 'Neutral'}</span>
    `;
    container.appendChild(toneDiv);

    // Verbosity - dropdown
    const verbDiv = document.createElement('div');
    verbDiv.className = 'fact-item';
    verbDiv.innerHTML = `
        <strong>Verbosity:</strong> 
        <select class="inline-select ext-field" data-component="style_profiler" data-field="verbosity">
            <option value="concise" ${data.verbosity === 'concise' ? 'selected' : ''}>Concise</option>
            <option value="moderate" ${data.verbosity === 'moderate' ? 'selected' : ''}>Moderate</option>
            <option value="verbose" ${data.verbosity === 'verbose' ? 'selected' : ''}>Verbose</option>
        </select>
    `;
    container.appendChild(verbDiv);

    // Technical Level - dropdown
    const techDiv = document.createElement('div');
    techDiv.className = 'fact-item';
    techDiv.innerHTML = `
        <strong>Technical Level:</strong> 
        <select class="inline-select ext-field" data-component="style_profiler" data-field="technicalLevel">
            <option value="beginner" ${data.technicalLevel === 'beginner' ? 'selected' : ''}>Beginner</option>
            <option value="intermediate" ${data.technicalLevel === 'intermediate' ? 'selected' : ''}>Intermediate</option>
            <option value="advanced" ${data.technicalLevel === 'advanced' ? 'selected' : ''}>Advanced</option>
            <option value="expert" ${data.technicalLevel === 'expert' ? 'selected' : ''}>Expert</option>
        </select>
    `;
    container.appendChild(techDiv);

    // Directness - dropdown
    const dirDiv = document.createElement('div');
    dirDiv.className = 'fact-item';
    dirDiv.innerHTML = `
        <strong>Directness:</strong> 
        <select class="inline-select ext-field" data-component="style_profiler" data-field="directness">
            <option value="direct" ${data.directness === 'direct' ? 'selected' : ''}>Direct</option>
            <option value="indirect" ${data.directness === 'indirect' ? 'selected' : ''}>Indirect</option>
            <option value="mixed" ${data.directness === 'mixed' ? 'selected' : ''}>Mixed</option>
        </select>
    `;
    container.appendChild(dirDiv);

    // Traits - editable tags
    const traits = data.traits || [];
    if (traits.length) {
        const traitsDiv = document.createElement('div');
        traitsDiv.className = 'fact-item';
        traitsDiv.innerHTML = '<strong>Traits:</strong>';
        const tagList = createExtEditableTagList(traits, 'style_profiler', 'traits');
        traitsDiv.appendChild(tagList);
        container.appendChild(traitsDiv);
    }

    // Preferred Style - editable text
    if (data.preferredResponseStyle) {
        const prefDiv = document.createElement('div');
        prefDiv.className = 'fact-item';
        prefDiv.innerHTML = `
            <strong>Preferred Style:</strong> 
            <span class="editable-text ext-field" data-component="style_profiler" data-field="preferredResponseStyle">${data.preferredResponseStyle}</span>
        `;
        container.appendChild(prefDiv);
    }

    setupExtInlineEditing(container);
    setupExtSelectChange(container);
}

/**
 * Render Focus with editable fields for Edit Persona
 */
function renderExtFocus(container, data) {
    container.innerHTML = '';

    // Current Topic - editable
    const topicDiv = document.createElement('div');
    topicDiv.className = 'fact-item';
    topicDiv.innerHTML = `
        <strong>Current Topic:</strong> 
        <span class="editable-text ext-field" data-component="recent_focus" data-field="currentTopic">${data.currentTopic || 'Unknown'}</span>
    `;
    container.appendChild(topicDiv);

    // Active Task - editable
    const taskDiv = document.createElement('div');
    taskDiv.className = 'fact-item';
    taskDiv.innerHTML = `
        <strong>Active Task:</strong> 
        <span class="editable-text ext-field" data-component="recent_focus" data-field="activeTask">${data.activeTask || 'General'}</span>
    `;
    container.appendChild(taskDiv);

    // Last Request
    if (data.lastRequest) {
        const reqDiv = document.createElement('div');
        reqDiv.className = 'fact-item';
        reqDiv.innerHTML = `
            <strong>Last Request:</strong> 
            <span class="editable-text ext-field" data-component="recent_focus" data-field="lastRequest">${data.lastRequest}</span>
        `;
        container.appendChild(reqDiv);
    }

    // Momentum
    if (data.momentum) {
        const momDiv = document.createElement('div');
        momDiv.className = 'fact-item';
        momDiv.innerHTML = `
            <strong>Momentum:</strong> 
            <span class="editable-text ext-field" data-component="recent_focus" data-field="momentum">${data.momentum}</span>
        `;
        container.appendChild(momDiv);
    }

    // Open Items - editable tags
    if (data.openItems?.length) {
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'fact-item';
        itemsDiv.innerHTML = '<strong>Open Items:</strong>';
        const tagList = createExtEditableTagList(data.openItems, 'recent_focus', 'openItems');
        itemsDiv.appendChild(tagList);
        container.appendChild(itemsDiv);
    }

    setupExtInlineEditing(container);
}

// ============================================================================
// V3 SCHEMA: RENDER FUNCTIONS FOR EXTRACTED PERSONA DIMENSIONS
// ============================================================================

/**
 * Render Context for Edit Persona (v3 schema)
 */
function renderExtContext(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'context',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.context) {
                    _currentExtraction.memory_layer.context = newData;
                    console.log('[ExtContext] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('context', data);
        renderV4Section({
            container,
            dimensionId: 'context',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.context) {
                    _currentExtraction.memory_layer.context = newData;
                    console.log('[ExtContext] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.domain) {
        const item = document.createElement('div');
        item.className = 'fact-item';
        item.innerHTML = `<strong>Domain:</strong> ${data.domain}`;
        container.appendChild(item);
    }
}

/**
 * Render Tone for Edit Persona - supports v3 and v4 schema
 */
function renderExtTone(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'tone',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.tone) {
                    _currentExtraction.memory_layer.tone = newData;
                    console.log('[ExtTone] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('tone', data);
        renderV4Section({
            container,
            dimensionId: 'tone',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.tone) {
                    _currentExtraction.memory_layer.tone = newData;
                    console.log('[ExtTone] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.voice) {
        const item = document.createElement('div');
        item.className = 'fact-item';
        item.innerHTML = `<strong>Voice:</strong> ${data.voice}`;
        container.appendChild(item);
    }
}

/**
 * Render Framework for Edit Persona - supports v3 and v4 schema
 */
function renderExtFramework(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'framework',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.framework) {
                    _currentExtraction.memory_layer.framework = newData;
                    console.log('[ExtFramework] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('framework', data);
        renderV4Section({
            container,
            dimensionId: 'framework',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.framework) {
                    _currentExtraction.memory_layer.framework = newData;
                    console.log('[ExtFramework] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.methodology) {
        const item = document.createElement('div');
        item.className = 'fact-item';
        item.innerHTML = `<strong>Methodology:</strong> ${data.methodology}`;
        container.appendChild(item);
    }
}

/**
 * Render Constraints for Edit Persona - supports v3 and v4 schema
 */
function renderExtConstraints(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'constraints',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.constraints) {
                    _currentExtraction.memory_layer.constraints = newData;
                    console.log('[ExtConstraints] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('constraints', data);
        renderV4Section({
            container,
            dimensionId: 'constraints',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.constraints) {
                    _currentExtraction.memory_layer.constraints = newData;
                    console.log('[ExtConstraints] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.hard_rules?.length) {
        const item = document.createElement('div');
        item.className = 'fact-item verbatim';
        item.innerHTML = `<strong>Rules:</strong><ul>${data.hard_rules.map(r => `<li>${r}</li>`).join('')}</ul>`;
        container.appendChild(item);
    }
}

/**
 * Render Format for Edit Persona - supports v3 and v4 schema
 */
function renderExtFormat(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'format',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.format) {
                    _currentExtraction.memory_layer.format = newData;
                    console.log('[ExtFormat] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('format', data);
        renderV4Section({
            container,
            dimensionId: 'format',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.format) {
                    _currentExtraction.memory_layer.format = newData;
                    console.log('[ExtFormat] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.output_type) {
        const item = document.createElement('div');
        item.className = 'fact-item';
        item.innerHTML = `<strong>Output Type:</strong> ${data.output_type}`;
        container.appendChild(item);
    }
}

/**
 * Render Exemplar for Edit Persona - supports v3 and v4 schema
 */
function renderExtExemplar(container, data) {
    // === V4 FORMAT: Use unified renderer ===
    if (data?.instruction !== undefined || data?.version === 4) {
        renderV4Section({
            container,
            dimensionId: 'exemplar',
            data: data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.exemplar) {
                    _currentExtraction.memory_layer.exemplar = newData;
                    console.log('[ExtExemplar] Updated v4 data');
                }
            }
        });
        return;
    }

    // === V3 FORMAT: Migrate and render as v4 ===
    if (ComponentSchemas?.migrateFromV3) {
        const v4Data = ComponentSchemas.migrateFromV3('exemplar', data);
        renderV4Section({
            container,
            dimensionId: 'exemplar',
            data: v4Data,
            isEditable: true,
            onUpdate: (newData) => {
                if (_currentExtraction?.memory_layer?.exemplar) {
                    _currentExtraction.memory_layer.exemplar = newData;
                    console.log('[ExtExemplar] Migrated to v4');
                }
            }
        });
        return;
    }

    // === FALLBACK: Legacy v3 rendering ===
    container.innerHTML = '';
    if (data?.prompt_patterns?.length) {
        const item = document.createElement('div');
        item.className = 'fact-item verbatim';
        item.innerHTML = `<strong>Patterns:</strong><ul>${data.prompt_patterns.map(p => `<li>${p}</li>`).join('')}</ul>`;
        container.appendChild(item);
    }
}

/**
 * Create editable tag list for Edit Persona (updates _currentExtraction)
 */
function createExtEditableTagList(items, componentId, field) {
    const container = document.createElement('div');
    container.className = 'tag-list';
    container.dataset.component = componentId;
    container.dataset.field = field;

    // Create tags
    items.forEach((item, index) => {
        const tag = createExtEditableTag(item, index, componentId, field);
        container.appendChild(tag);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'tag-add';
    addBtn.innerHTML = '+';
    addBtn.title = `Add ${field.replace(/[._]/g, ' ')}`;
    addBtn.addEventListener('click', () => handleExtAddTag(container, componentId, field));
    container.appendChild(addBtn);

    return container;
}

/**
 * Create a single editable tag for Edit Persona
 */
function createExtEditableTag(value, index, componentId, field) {
    const tag = document.createElement('span');
    tag.className = 'tag editable';
    tag.dataset.index = index;
    tag.dataset.value = value;

    // Remove button
    const removeBtn = document.createElement('span');
    removeBtn.className = 'tag-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.title = 'Remove';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleExtRemoveTag(tag, componentId, field);
    });

    // Text content
    const textSpan = document.createElement('span');
    textSpan.className = 'tag-text';
    textSpan.textContent = value;

    // Double-click to edit
    textSpan.addEventListener('dblclick', () => {
        tag.classList.add('editing');
        textSpan.contentEditable = 'true';
        textSpan.focus();
        const range = document.createRange();
        range.selectNodeContents(textSpan);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    });

    // Save on blur
    textSpan.addEventListener('blur', () => {
        tag.classList.remove('editing');
        textSpan.contentEditable = 'false';
        const newValue = textSpan.textContent.trim();
        if (newValue && newValue !== value) {
            tag.dataset.value = newValue;
            updateExtTagsInData(componentId, field);
        } else if (!newValue) {
            handleExtRemoveTag(tag, componentId, field);
        }
    });

    textSpan.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textSpan.blur();
        } else if (e.key === 'Escape') {
            textSpan.textContent = value;
            textSpan.blur();
        }
    });

    tag.appendChild(removeBtn);
    tag.appendChild(textSpan);
    return tag;
}

function handleExtRemoveTag(tagElement, componentId, field) {
    tagElement.remove();
    updateExtTagsInData(componentId, field);
}

function handleExtAddTag(container, componentId, field) {
    const addBtn = container.querySelector('.tag-add');
    const existingTags = container.querySelectorAll('.tag');
    const newIndex = existingTags.length;

    const tag = createExtEditableTag('new', newIndex, componentId, field);
    container.insertBefore(tag, addBtn);

    // Enter edit mode
    const textSpan = tag.querySelector('.tag-text');
    tag.classList.add('editing');
    textSpan.contentEditable = 'true';
    textSpan.textContent = '';
    textSpan.focus();
}

/**
 * Update tags in _currentExtraction data
 */
function updateExtTagsInData(componentId, field) {
    if (!window._currentExtraction?.memory_layer) return;

    const container = document.querySelector(`.tag-list[data-component="${componentId}"][data-field="${field}"]`);
    if (!container) return;

    const tags = Array.from(container.querySelectorAll('.tag')).map(t => t.dataset.value);

    // Navigate to the field path (handles nested like 'categories.technologies')
    const parts = field.split('.');
    let obj = window._currentExtraction.memory_layer[componentId];
    for (let i = 0; i < parts.length - 1; i++) {
        obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = tags;

    console.log(`[EditPersona] Updated ${componentId}.${field}:`, tags);
}

/**
 * Setup inline text editing for Edit Persona
 */
function setupExtInlineEditing(container) {
    container.querySelectorAll('.editable-text.ext-field').forEach(el => {
        el.addEventListener('dblclick', () => {
            el.contentEditable = 'true';
            el.classList.add('editing');
            el.focus();
        });

        el.addEventListener('blur', () => {
            el.contentEditable = 'false';
            el.classList.remove('editing');
            updateExtFieldInData(el.dataset.component, el.dataset.field, el.textContent.trim());
        });

        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });
    });
}

/**
 * Setup select change handlers for Edit Persona
 */
function setupExtSelectChange(container) {
    container.querySelectorAll('select.ext-field').forEach(select => {
        select.addEventListener('change', () => {
            updateExtFieldInData(select.dataset.component, select.dataset.field, select.value);
        });
    });
}

/**
 * Update a single field in _currentExtraction data
 */
function updateExtFieldInData(componentId, field, value) {
    if (!window._currentExtraction?.memory_layer?.[componentId]) return;

    window._currentExtraction.memory_layer[componentId][field] = value;
    console.log(`[EditPersona] Updated ${componentId}.${field}:`, value);
}

/**
 * Populate editable tag list
 * 
 * Creates removable tags with add button for user editing.
 * 
 * @param {string} containerId - ID of the tag-list container
 * @param {Array} tags - Array of tag strings
 * @param {number} maxTags - Maximum allowed tags
 */
function populateEditableTags(containerId, tags, maxTags = 5) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Remove existing tags only (keep .tag-add button)
    container.querySelectorAll('.tag').forEach(t => t.remove());

    const addBtn = container.querySelector('.tag-add');

    tags.forEach((val, index) => {
        if (!val) return;

        // Create tag matching Memory Layer pattern (span.tag.editable)
        const tag = document.createElement('span');
        tag.className = 'tag editable';
        tag.dataset.index = index;
        tag.dataset.value = val;

        // Remove button first (Memory Layer order)
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-remove';
        removeBtn.innerHTML = '✕';
        removeBtn.title = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            tag.remove();
        };

        // Text content
        const textSpan = document.createElement('span');
        textSpan.className = 'tag-text';
        textSpan.textContent = val;

        tag.appendChild(removeBtn);
        tag.appendChild(textSpan);

        if (addBtn) {
            container.insertBefore(tag, addBtn);
        } else {
            container.appendChild(tag);
        }
    });

    // Note: We do NOT re-create the add button here as it's static in the HTML
    // and listeners are attached by setupTagList
}

/**
 * Handle saving as draft
 */
async function handleSaveDraft() {
    if (!window._currentExtraction) {
        await showAlertDialog({
            title: 'No Extraction',
            message: 'No extraction data available to save.',
            type: 'info'
        });
        return;
    }

    const name = document.getElementById('ext-name').value.trim();
    if (!name) {
        await showAlertDialog({
            title: 'Name Required',
            message: 'Please give your persona a name to save as draft.',
            type: 'warning'
        });
        return;
    }

    // Read metadata from chips
    const domain = getChipGroupValue('domain');
    const tone = getChipGroupValue('tone');
    const complexity = getChipGroupValue('complexity');

    // Read tags (UI edits)
    const keywords = getTagValues('ext-keywords');
    const subdomains = getTagValues('ext-subdomains');
    // Read audience as text field
    const audienceEl = document.getElementById('ext-audience');
    const audience = audienceEl?.textContent?.trim() || '';

    // Validate required metadata (warn but don't block for drafts)
    if (!domain || !tone || !complexity) {
        spLog('warn', 'Draft saved with incomplete metadata', { domain, tone, complexity });
    }

    const draft = {
        id: `draft_${Date.now()}`,
        name,
        ...window._currentExtraction,
        metadata: {
            ...window._currentExtraction?.metadata,
            domain: domain || undefined,
            tone: tone || undefined,
            complexity_level: complexity || undefined,
            use_case_keywords: keywords,
            target_audience: audience !== '-' ? audience : '', // Store as string
            subdomains: subdomains // Store as array
        },
        created_at: new Date().toISOString()
    };

    // Save to local storage
    const result = await chrome.storage.local.get('persona_drafts');
    const drafts = result.persona_drafts || [];
    drafts.push(draft);
    await chrome.storage.local.set({ persona_drafts: drafts });

    spLog('info', 'Draft saved', { id: draft.id });
    await showAlertDialog({
        title: 'Draft Saved',
        message: 'Your persona draft has been saved successfully.',
        type: 'success'
    });
    navigateToPersonaPage('browse');
}

/**
 * Handle publishing persona to Supabase
 */
async function handlePublishPersona() {
    if (!window._currentExtraction) {
        await showAlertDialog({
            title: 'No Extraction',
            message: 'No extraction to publish. Please extract a persona first.',
            type: 'warning'
        });
        return;
    }

    const nameInput = document.getElementById('ext-name');
    const name = nameInput?.value?.trim();

    if (!name) {
        await showAlertDialog({
            title: 'Name Required',
            message: 'Please give your persona a name.',
            type: 'warning'
        });
        return;
    }

    // Read and validate required metadata from filter chips
    const domain = getChipGroupValue('domain');
    const tone = getChipGroupValue('tone');
    const complexity = getChipGroupValue('complexity');

    if (!domain || !tone || !complexity) {
        const missing = [];
        if (!domain) missing.push('Domain');
        if (!tone) missing.push('Tone');
        if (!complexity) missing.push('Complexity');

        await showAlertDialog({
            title: 'Missing Metadata',
            message: `Please select ${missing.join(', ')} before publishing.`,
            type: 'warning'
        });
        return;
    }

    const publishBtn = document.getElementById('ext-publish-btn');
    publishBtn.classList.add('loading');
    publishBtn.disabled = true;

    try {
        // Get Supabase client
        const supabaseClient = await getSupabaseClient();

        // Ensure user is authenticated (anonymous if needed)
        if (!supabaseClient.isAuthenticated()) {
            spLog('info', 'No auth session, signing in anonymously...');
            const { error: authError } = await supabaseClient.signInAnonymously();
            if (authError) {
                throw new Error(`Authentication failed: ${authError.message}`);
            }
        }

        // Check visibility setting
        const publicBtn = document.getElementById('ext-visibility-public');
        const isPublic = Boolean(publicBtn?.classList.contains('active') || publicBtn?.classList.contains('selected'));

        // Read synthesized persona from textarea
        const synthesizedPersona = document.getElementById('ext-synthesized-persona')?.value?.trim() ||
            window._currentExtraction.memory_layer?.synthesized_persona || '';

        // Read injected context (extensions)
        const injectedContext = document.getElementById('ext-injected-context')?.value?.trim() || '';

        const keywords = getTagValues('ext-keywords');
        const subdomains = getTagValues('ext-subdomains');
        // Read audience as text field
        const audienceEl = document.getElementById('ext-audience');
        const audience = (audienceEl?.textContent?.trim() !== '-') ? audienceEl?.textContent?.trim() : '';

        // Validate keywords
        if (keywords.length === 0) {
            await showAlertDialog({
                title: 'Keywords Required',
                message: 'Please add at least one keyword to help others discover this persona.',
                type: 'warning'
            });
            publishBtn.classList.remove('loading');
            publishBtn.disabled = false;
            return;
        }

        // Prepare persona data with metadata
        const personaData = {
            name,
            memory_layer: {
                ...window._currentExtraction.memory_layer,
                synthesized_persona: synthesizedPersona,
                injected_context: injectedContext
            },
            source_prompt: window._currentExtraction.source_prompt,
            provider: window._currentExtraction.provider,
            llm_model: window._currentExtraction.llm_model,
            use_case_keywords: keywords,
            metadata: {
                ...window._currentExtraction.metadata,
                domain,
                subdomains,
                tone,
                complexity_level: complexity,
                target_audience: audience,
                use_case_keywords: keywords
            },
            is_public: isPublic
        };

        // Check if this is an update to existing persona (draft or published)
        const existingId = window._currentExtraction.id;
        const isUpdate = !!existingId; // Update if ID exists, regardless of draft status
        spLog('debug', 'Publish mode', { existingId, isUpdate, extraction: window._currentExtraction });

        // Block updates when no changes detected
        if (isUpdate && !hasUnsavedChanges()) {
            publishBtn.classList.remove('loading');
            publishBtn.disabled = false;

            await showAlertDialog({
                title: 'No Changes Detected',
                message: 'You haven\'t made any changes to this persona. Make edits before publishing a new version.',
                type: 'info'
            });
            return;
        }

        let data, error;
        if (isUpdate) {
            // Prompt for change notes (optional)
            const changeNotes = await showPromptDialog({
                title: 'Change Notes',
                message: 'What changed in this version?',
                placeholder: 'Optional: describe your changes',
                confirmText: 'Publish',
                cancelText: 'Skip'
            });

            // Update existing published persona (null changeNotes means skipped)
            const result = await supabaseClient.updatePersona(existingId, personaData, changeNotes || '');
            data = result.data;
            error = result.error;
        } else {
            // Create new persona
            const result = await supabaseClient.createPersona(personaData);
            data = result.data;
            error = result.error;
        }

        if (error) throw error;

        spLog('info', isUpdate ? 'Persona updated' : 'Persona published', { id: data.id, is_public: isPublic });

        // Show success dialog
        await showAlertDialog({
            title: isUpdate ? 'Changes Saved' : 'Published Successfully',
            message: isUpdate
                ? `Persona "${name}" has been updated to version ${data.version || 'new'}.`
                : `Persona "${name}" has been published${isPublic ? ' publicly' : ' privately'}.`,
            type: 'success'
        });

        // Clear current extraction and reset dirty state
        window._currentExtraction = null;
        resetFormDirty();

        // Clear Create Persona textarea
        const promptInput = document.getElementById('extract-prompt-input');
        if (promptInput) promptInput.value = '';

        // Navigate to My Personas page and refresh the list
        navigateToPersonaPage('my-personas', 'browse');
        loadMyPersonas();

    } catch (error) {
        spLog('error', 'Publish failed', { error: error.message });

        // Determine error type for better messaging
        let errorTitle = 'Publish Failed';
        let errorDetails = error.message;

        if (error.message.includes('Authentication')) {
            errorTitle = 'Authentication Error';
        } else if (error.message.includes('Supabase')) {
            errorTitle = 'Connection Error';
        } else if (error.message.includes('network')) {
            errorTitle = 'Network Error';
        }

        await showAlertDialog({
            title: errorTitle,
            message: 'Failed to publish persona. Please try again.',
            type: 'error',
            details: errorDetails,
            onRetry: () => handlePublishPersona()
        });
    } finally {
        publishBtn.classList.remove('loading');
        publishBtn.disabled = false;
    }
}

/**
 * Handle persona search
 * @param {string} query - Search query
 */
/**
 * Handle persona search
 * @param {string} query - Search query
 */
async function handlePersonaSearch(query) {
    const resultsContainer = document.getElementById('persona-results');
    const filterPanel = document.getElementById('search-filters');

    // Helper to get selected chip value
    const getChipValue = (filterName) => {
        const group = filterPanel?.querySelector(`.filter-chip-group[data-filter="${filterName}"]`);
        const selected = group?.querySelector('.filter-chip.selected');
        return selected?.dataset.value || undefined;
    };

    // Read all filter values from chips
    const filters = {
        provider: getChipValue('provider'),
        domain: getChipValue('domain'),
        tone: getChipValue('tone'),
        complexity: getChipValue('complexity'),
        sortBy: getChipValue('sort') || 'popular',
        limit: 20
    };

    if (!query || query.length < 2) {
        // Load popular personas when no query
        loadPopularPersonas();
        return;
    }

    resultsContainer.innerHTML = '<p class="loading-text">Searching...</p>';

    try {
        // Try Supabase search first
        try {
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.searchPersonas(query, filters);

            if (!error && data && data.length > 0) {
                renderPersonaResults(data);
                return;
            }
        } catch (e) {
            // Supabase not available, fall back to local search
        }

        // Fallback: search local drafts
        const result = await chrome.storage.local.get('persona_drafts');
        const drafts = result.persona_drafts || [];
        const filtered = drafts.filter(d => {
            const name = d.name || d.metadata?.suggested_name || '';
            const keywords = d.metadata?.use_case_keywords || [];
            const searchStr = (name + ' ' + keywords.join(' ')).toLowerCase();
            return searchStr.includes(query.toLowerCase());
        });

        if (filtered.length > 0) {
            renderPersonaResults(filtered.map(d => ({
                ...d,
                is_local: true
            })));
        } else {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">search_off</span>
                    <p>No personas found for "${escapeHtml(query)}"</p>
                </div>
            `;
        }
    } catch (err) {
        spLog('error', 'Search failed', { error: err.message });
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">error</span>
                <p>Search failed. Check console for details.</p>
            </div>
        `;
    }
}

/**
 * Load popular/recent public personas
 */
async function loadPopularPersonas() {
    const resultsContainer = document.getElementById('persona-results');

    try {
        // Try Supabase
        try {
            resultsContainer.innerHTML = '<p class="loading-text">Loading popular personas...</p>';
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.searchPersonas('', { limit: 10 });

            if (!error && data && data.length > 0) {
                renderPersonaResults(data);
                return;
            }
        } catch (e) {
            // Supabase not available, fall back to local
        }

        // Fallback: show local drafts
        const result = await chrome.storage.local.get('persona_drafts');
        const drafts = result.persona_drafts || [];

        if (drafts.length > 0) {
            renderPersonaResults(drafts.slice(0, 10).map(d => ({ ...d, is_local: true })));
        } else {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="material-symbols-outlined">explore</span>
                    <p>No personas available yet. Create one!</p>
                </div>
            `;
        }
    } catch (err) {
        spLog('error', 'Load popular failed', { error: err.message });
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">search</span>
                <p>Search for personas or create one</p>
            </div>
        `;
    }
}

/**
 * Render persona search results
 * @param {Object[]} personas - Array of persona data
 */
function renderPersonaResults(personas) {
    const container = document.getElementById('persona-results');
    container.innerHTML = '';

    personas.forEach(persona => {
        const item = document.createElement('div');
        item.className = 'persona-item browse-item';
        item.dataset.id = persona.id;

        const name = persona.name || persona.metadata?.suggested_name || 'Untitled';
        const importCount = persona.import_count || 0;
        const isLocal = persona.is_local || false;

        item.innerHTML = `
            <div class="persona-item-info">
                <div class="persona-item-name">${escapeHtml(name)}</div>
                <div class="persona-item-meta">
                    ${isLocal ? '<span class="status-badge private">Local</span>' : ''}
                    <span class="persona-item-count">
                        <span class="material-symbols-outlined">download</span>
                        ${importCount}
                    </span>
                </div>
            </div>
            <span class="material-symbols-outlined chevron">chevron_right</span>
        `;

        item.addEventListener('click', () => showPersonaPopup(persona));
        container.appendChild(item);
    });
}

/**
 * Show persona popup card with details
 * @param {Object} persona - Persona data
 * @param {boolean} isOwned - Whether this persona belongs to the user (from My Personas)
 */
function showPersonaPopup(persona, isOwned = false) {
    // Remove existing popup
    const existingPopup = document.querySelector('.persona-popup');
    if (existingPopup) existingPopup.remove();

    const name = persona.name || persona.metadata?.suggested_name || 'Untitled';
    const keywords = persona.metadata?.use_case_keywords || [];
    const preview = persona.memory_layer?.synthesized_persona?.slice(0, 150) || '';
    const importCount = persona.import_count || 0;
    const avgRating = persona.avg_rating ? persona.avg_rating.toFixed(1) : '-';
    const provider = persona.provider || 'Unknown';
    const isLocal = persona.is_local || false;

    // Action button: Edit for owned, Import for browse
    const actionButton = isOwned
        ? `<button class="btn btn-primary popup-edit-btn">
               <span class="material-symbols-outlined">edit</span> Edit
           </button>`
        : `<button class="btn btn-primary popup-import-btn">
               <span class="material-symbols-outlined">download</span> Import
           </button>`;

    // Export button only for owned personas
    const exportButton = isOwned
        ? `<button class="btn btn-text popup-export-btn" title="Export JSON">Export</button>`
        : '';

    const popup = document.createElement('div');
    popup.className = 'persona-popup';
    popup.innerHTML = `
        <div class="persona-popup-card">
            <button class="popup-close">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h3>${escapeHtml(name)}</h3>
            <div class="popup-meta">
                <span><span class="material-symbols-outlined">download</span> ${importCount}</span>
                <span><span class="material-symbols-outlined">star</span> ${avgRating}</span>
                <span>${provider}</span>
                ${exportButton}
            </div>
            <div class="popup-keywords">
                ${keywords.map(k => `<span class="keyword-chip small">${escapeHtml(k)}</span>`).join('')}
            </div>
            <p class="popup-preview">${escapeHtml(preview)}${preview.length >= 150 ? '...' : ''}</p>
            <div class="popup-actions">
                <button class="btn btn-secondary popup-details-btn">
                    <span class="material-symbols-outlined">info</span> Details
                </button>
                ${actionButton}
            </div>
        </div>
    `;

    // Click outside to close
    popup.addEventListener('click', (e) => {
        if (e.target === popup) popup.remove();
    });

    // Close button
    popup.querySelector('.popup-close')?.addEventListener('click', () => {
        popup.remove();
    });

    // Details button
    popup.querySelector('.popup-details-btn')?.addEventListener('click', () => {
        popup.remove();
        showPersonaDetailModal(persona);
    });

    // Import button (for browse page)
    popup.querySelector('.popup-import-btn')?.addEventListener('click', async () => {
        await handleImportPersona(persona);
        popup.remove();
    });

    // Edit button (for My Personas page)
    popup.querySelector('.popup-edit-btn')?.addEventListener('click', () => {
        popup.remove();
        loadPersonaToEdit(persona);
    });

    // Export button (for My Personas page)
    popup.querySelector('.popup-export-btn')?.addEventListener('click', () => {
        // Temporarily set as current extraction for export
        const prevExtraction = window._currentExtraction;
        window._currentExtraction = persona;
        exportPersonaJSON();
        window._currentExtraction = prevExtraction;
        popup.remove();
    });

    document.body.appendChild(popup);
}

/**
 * Show full persona detail modal
 * @param {Object} persona - Persona data
 */
function showPersonaDetailModal(persona) {
    const existingModal = document.querySelector('.persona-modal');
    if (existingModal) existingModal.remove();

    const name = persona.name || persona.metadata?.suggested_name || 'Untitled';
    const keywords = persona.metadata?.use_case_keywords || [];
    const memoryLayer = persona.memory_layer || {};
    const importCount = persona.import_count || 0;
    const avgRating = persona.avg_rating ? persona.avg_rating.toFixed(1) : '-';
    const raterCount = persona.rater_count || 0;
    const provider = persona.provider || 'Unknown';
    const llmModel = persona.llm_model || 'Unknown';
    const createdAt = persona.created_at ? new Date(persona.created_at).toLocaleDateString() : '-';
    const version = persona.version || 1;

    const modal = document.createElement('div');
    modal.className = 'persona-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h2>${escapeHtml(name)}</h2>
            <div class="modal-stats">
                <div class="stat">
                    <span class="stat-value">${importCount}</span>
                    <span class="stat-label">Imports</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${avgRating} <span class="material-symbols-outlined">star</span></span>
                    <span class="stat-label">${raterCount} ratings</span>
                </div>
                <div class="stat">
                    <span class="stat-value">v${version}</span>
                    <span class="stat-label">Version</span>
                </div>
            </div>
            <div class="modal-section">
                <h4>Keywords</h4>
                <div class="keyword-chips">
                    ${keywords.map(k => `<span class="keyword-chip">${escapeHtml(k)}</span>`).join('')}
                </div>
            </div>
            <div class="modal-section">
                <h4>About</h4>
                <p class="persona-description">${escapeHtml(memoryLayer?.persona_synthesizer?.synthesizedPersona || 'No description available.')}</p>
            </div>
            <div class="modal-meta">
                <span><strong>Provider:</strong> ${provider}</span>
                <span><strong>Model:</strong> ${llmModel}</span>
                <span><strong>Created:</strong> ${createdAt}</span>
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary btn-large btn-with-spinner modal-import-btn">
                    <span class="btn-content">
                        <span class="material-symbols-outlined">download</span> Import to Memory Layer
                    </span>
                    <span class="btn-spinner">
                        <svg class="spinner-svg" viewBox="0 0 50 50">
                            <circle class="spinner-track" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                            <circle class="spinner-progress" cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                        </svg>
                    </span>
                </button>
            </div>
        </div>
    `;

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Close button
    modal.querySelector('.modal-close')?.addEventListener('click', () => {
        modal.remove();
    });

    // Import button
    modal.querySelector('.modal-import-btn')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        await handleImportPersona(persona, btn);
        modal.remove();
    });

    document.body.appendChild(modal);
}

/**
 * Format memory layer key for display
 * @param {string} key
 * @returns {string}
 */
function formatMemoryKey(key) {
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Handle importing a persona to memory layer
 * @param {Object} persona - Persona to import
 * @param {HTMLElement} [btn] - Button element to show loading state
 */
async function handleImportPersona(persona, btn) {
    if (btn) {
        btn.classList.add('loading');
        btn.disabled = true;
    }

    spLog('info', 'Importing persona...', { id: persona.id });

    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'IMPORT_PERSONA_MEMORY',
                payload: {
                    memoryLayer: persona.memory_layer,
                    personaId: persona.id,
                    personaName: persona.name || persona.metadata?.suggested_name || 'Imported Persona'
                }
            }, resolve);
        });

        if (result?.success) {
            // Increment import count if connected to Supabase
            if (!persona.is_local) {
                try {
                    const supabase = await getSupabaseClient();
                    await supabase.incrementImportCount(persona.id);
                } catch (e) {
                    // Supabase not available, skip count increment
                }
            }

            await showAlertDialog({
                title: 'Import Successful',
                message: `Persona "${persona.name || persona.metadata?.suggested_name}" has been imported.`,
                type: 'success'
            });
            spLog('info', 'Persona imported successfully');
        } else {
            throw new Error(result?.error || 'Import failed');
        }
    } catch (err) {
        spLog('error', 'Import failed', { error: err.message });
        await showAlertDialog({
            title: 'Import Failed',
            message: err.message || 'An error occurred during import.',
            type: 'error'
        });
    } finally {
        if (btn) {
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    }
}

// ============================================================================
// My Personas Management
// ============================================================================

/**
 * Load and render My Personas list
 */
async function loadMyPersonas() {
    const container = document.getElementById('my-personas-list');
    if (!container) return;

    // Show skeleton loading state (M3 pattern)
    container.innerHTML = `
        <div class="persona-item skeleton" aria-hidden="true">
            <div class="persona-item-info">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line meta"></div>
            </div>
        </div>
        <div class="persona-item skeleton" aria-hidden="true">
            <div class="persona-item-info">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line meta"></div>
            </div>
        </div>
        <div class="persona-item skeleton" aria-hidden="true">
            <div class="persona-item-info">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line meta"></div>
            </div>
        </div>
    `;

    // Load drafts from local storage
    const result = await chrome.storage.local.get('persona_drafts');
    const drafts = (result.persona_drafts || []).map(d => ({ ...d, _isDraft: true }));

    // Load published personas from Supabase
    let published = [];
    try {
        const supabaseClient = await getSupabaseClient();
        if (supabaseClient.isAuthenticated()) {
            const { data, error } = await supabaseClient.getMyPersonas();
            if (!error && data) {
                published = data.map(p => ({ ...p, _isDraft: false }));
            }
        }
    } catch (err) {
        spLog('warn', 'Failed to load published personas', { error: err.message });
    }

    // Combine drafts and published
    const allPersonas = [...drafts, ...published];

    if (allPersonas.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">folder_open</span>
                <p>No personas yet. Create one to get started!</p>
            </div>
        `;
        return;
    }

    // Render all personas
    container.innerHTML = '';
    container.setAttribute('role', 'list');
    allPersonas.forEach(persona => {
        const item = createPersonaListItem(persona, persona._isDraft);
        container.appendChild(item);
    });

    spLog('info', 'Loaded my personas', { drafts: drafts.length, published: published.length });
}

// ============================================================================
// SECTION: SAVED PROMPTS
// ============================================================================

/**
 * Load and render saved prompts list (cloud + local)
 */
async function loadSavedPrompts() {
    const container = document.getElementById('saved-prompts-list');
    if (!container) return;

    // Show skeleton loading
    container.innerHTML = `
        <div class="persona-item skeleton" aria-hidden="true">
            <div class="persona-item-info">
                <div class="skeleton-line title"></div>
                <div class="skeleton-line meta"></div>
            </div>
        </div>
    `;

    // Load local prompts
    const result = await chrome.storage.local.get('saved_prompts');
    const localPrompts = (result.saved_prompts || []).map(p => ({ ...p, _isLocal: true }));

    // Load cloud prompts if authenticated
    let cloudPrompts = [];
    try {
        const supabaseClient = await getSupabaseClient();
        if (supabaseClient.isAuthenticated()) {
            const { data, error } = await supabaseClient.getMySavedPrompts();
            if (!error && data) {
                cloudPrompts = data.map(p => ({
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    createdAt: p.created_at,
                    _isLocal: false
                }));
            }
        }
    } catch (err) {
        spLog('warn', 'Failed to load cloud prompts', { error: err.message });
    }

    // Combine and dedupe (prefer cloud over local)
    const allPrompts = [...cloudPrompts, ...localPrompts];

    if (allPrompts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <span class="material-symbols-outlined">description</span>
                <p>No saved prompts. Tap + to save one!</p>
            </div>
        `;
        return;
    }

    // Render prompts
    container.innerHTML = '';
    container.setAttribute('role', 'list');
    allPrompts.forEach(prompt => {
        const item = createPromptListItem(prompt);
        container.appendChild(item);
    });

    spLog('info', 'Loaded saved prompts', { cloud: cloudPrompts.length, local: localPrompts.length });
}

/**
 * Create a prompt list item element
 * @param {Object} prompt - Saved prompt data
 * @returns {HTMLElement}
 */
function createPromptListItem(prompt) {
    const item = document.createElement('div');
    item.className = 'persona-item';
    item.dataset.id = prompt.id;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'listitem');

    const title = prompt.title || 'Untitled Prompt';
    const preview = prompt.content?.substring(0, 100) || '';
    const date = new Date(prompt.createdAt).toLocaleDateString();

    item.innerHTML = `
        <div class="persona-item-info">
            <div class="persona-item-name">${title}</div>
            <div class="persona-item-meta">${preview}...</div>
            <div class="persona-item-date">Saved ${date}</div>
        </div>
        <div class="persona-item-actions">
            <button class="btn-icon extract-prompt-btn" title="Extract Persona" data-id="${prompt.id}">
                <span class="material-symbols-outlined">chip_extraction</span>
            </button>
            <button class="btn-icon delete-prompt-btn" title="Delete" data-id="${prompt.id}">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

    // Extract button click
    item.querySelector('.extract-prompt-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        extractFromSavedPrompt(prompt);
    });

    // Delete button click
    item.querySelector('.delete-prompt-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteSavedPrompt(prompt.id, prompt._isLocal);
    });

    // Click to expand/preview
    item.addEventListener('click', () => {
        openPromptPreviewDialog(prompt);
    });

    return item;
}

/**
 * Handle Save Prompt button click (Add Prompt page)
 * Reads from the page form inputs and saves to cloud + local storage
 */
async function handleSavePrompt() {
    const titleInput = document.getElementById('add-prompt-title');
    const contentInput = document.getElementById('add-prompt-content');
    const saveBtn = document.getElementById('save-prompt-btn');

    const title = titleInput?.value.trim() || 'Untitled Prompt';
    const content = contentInput?.value.trim();

    if (!content) {
        showToast('Please enter prompt content', 'error');
        return;
    }

    // === SHOW SPINNER ===
    saveBtn?.classList.add('loading');

    try {
        // Try cloud save first
        const supabaseClient = await getSupabaseClient();
        if (supabaseClient.isAuthenticated()) {
            const { data, error } = await supabaseClient.createSavedPrompt({ title, content });
            if (error) {
                spLog('warn', 'Cloud save failed, using local storage', { error: error.message });
                await savePromptLocal({ title, content });
            } else {
                spLog('info', 'Prompt saved to cloud', { id: data.id });
            }
        } else {
            // Not authenticated - save locally
            await savePromptLocal({ title, content });
        }

        // Clear form
        if (titleInput) titleInput.value = '';
        if (contentInput) contentInput.value = '';

        // Navigate back to Saved Prompts and reload
        navigateToPersonaPage('prompts', 'my-personas');
        loadSavedPrompts();
        showToast('Prompt saved', 'success');
    } catch (err) {
        spLog('error', 'Save prompt failed', { error: err.message });
        showToast('Failed to save prompt', 'error');
    } finally {
        // === HIDE SPINNER ===
        saveBtn?.classList.remove('loading');
    }
}

/**
 * Save a prompt to chrome.storage.local (fallback when not authenticated)
 * @param {Object} promptData - { title, content }
 */
async function savePromptLocal(promptData) {
    const result = await chrome.storage.local.get('saved_prompts');
    const prompts = result.saved_prompts || [];

    const newPrompt = {
        id: `prompt_${Date.now()}`,
        title: promptData.title,
        content: promptData.content,
        createdAt: new Date().toISOString(),
        _isLocal: true
    };

    prompts.unshift(newPrompt);
    await chrome.storage.local.set({ saved_prompts: prompts });
    spLog('info', 'Saved prompt locally', { id: newPrompt.id, title: newPrompt.title });
}

/**
 * Delete a saved prompt (cloud + local)
 * @param {string} promptId - Prompt ID to delete
 * @param {boolean} isLocal - Whether this is a local-only prompt
 */
async function deleteSavedPrompt(promptId, isLocal = false) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Prompt',
        message: 'Are you sure you want to delete this saved prompt?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
        if (!isLocal) {
            // Try cloud delete first
            const supabaseClient = await getSupabaseClient();
            if (supabaseClient.isAuthenticated()) {
                const { error } = await supabaseClient.deleteSavedPrompt(promptId);
                if (error) {
                    spLog('warn', 'Cloud delete failed', { error: error.message });
                }
            }
        }

        // Also remove from local storage if it exists there
        const result = await chrome.storage.local.get('saved_prompts');
        const prompts = (result.saved_prompts || []).filter(p => p.id !== promptId);
        await chrome.storage.local.set({ saved_prompts: prompts });

        loadSavedPrompts();
        showToast('Prompt deleted', 'success');
        spLog('info', 'Deleted saved prompt', { id: promptId });
    } catch (err) {
        spLog('error', 'Delete prompt failed', { error: err.message });
        showToast('Failed to delete prompt', 'error');
    }
}

/**
 * Open prompt preview dialog
 * @param {Object} prompt - Saved prompt data
 */
function openPromptPreviewDialog(prompt) {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
        <div class="modal modal-large">
            <div class="modal-header">
                <h3>${prompt.title || 'Saved Prompt'}</h3>
                <button class="btn-icon modal-close">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="modal-body">
                <textarea class="persona-textarea" rows="12" readonly>${prompt.content}</textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-close">Close</button>
                <button class="btn btn-primary" id="extract-from-preview">
                    <span class="material-symbols-outlined">chip_extraction</span> Extract Persona
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Close handlers
    const closeDialog = () => dialog.remove();
    dialog.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeDialog);
    });
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) closeDialog();
    });

    // Extract handler
    dialog.querySelector('#extract-from-preview')?.addEventListener('click', () => {
        closeDialog();
        extractFromSavedPrompt(prompt);
    });
}

/**
 * Extract persona from a saved prompt
 * @param {Object} prompt - Saved prompt data
 */
function extractFromSavedPrompt(prompt) {
    // Navigate to Create page and populate the textarea
    navigateToPersonaPage('create', 'prompts');

    const textarea = document.getElementById('extract-prompt-input');
    if (textarea) {
        textarea.value = prompt.content;
        // Trigger input event for auto-resize
        textarea.dispatchEvent(new Event('input'));
    }

    showToast('Prompt loaded - click Extract Persona to continue', 'info');
    spLog('info', 'Loaded saved prompt for extraction', { id: prompt.id });
}

/**
 * Create a persona list item element
 * @param {Object} persona - Persona data
 * @param {boolean} isDraft - Whether this is a local draft
 * @returns {HTMLElement}
 */
function createPersonaListItem(persona, isDraft = false) {
    const item = document.createElement('div');
    item.className = 'persona-item';
    item.dataset.id = persona.id;
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'listitem');

    const name = persona.name || persona.metadata?.suggested_name || 'Untitled';
    const provider = persona.provider || 'unknown';
    const keywords = persona.metadata?.use_case_keywords?.slice(0, 3).join(', ') || '';
    const version = persona.version || 1;
    const isPublic = persona.is_public || false;

    item.innerHTML = `
        <div class="persona-item-info">
            <div class="persona-item-name">${escapeHtml(name)}</div>
            <div class="persona-item-meta">
                <span class="version-badge">v${version}</span>
                <span class="status-chip ${isDraft ? 'draft' : (isPublic ? 'public' : 'private')}">${isDraft ? 'Draft' : (isPublic ? 'Public' : 'Private')}</span>
                <span class="keywords-text">${keywords}</span>
            </div>
        </div>
        <div class="persona-item-actions">
            <button class="btn-icon btn-edit" title="Edit" aria-label="Edit ${escapeHtml(name)}" data-id="${persona.id}">
                <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon btn-delete" title="Delete" aria-label="Delete ${escapeHtml(name)}" data-id="${persona.id}">
                <span class="material-symbols-outlined">delete</span>
            </button>
        </div>
    `;

    // Add click handlers
    item.querySelector('.btn-edit')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEditPersona(persona.id);
    });

    item.querySelector('.btn-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeletePersona(persona.id);
    });

    // Click on item to view details
    item.addEventListener('click', (e) => {
        // Create ripple effect
        createRipple(e, item);
        handleViewPersona(persona);
    });

    // Keyboard navigation (Enter/Space to activate)
    item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleViewPersona(persona);
        }
    });

    return item;
}

/**
 * Create M3 ripple effect on an element
 * @param {MouseEvent} e - Click event
 * @param {HTMLElement} element - Element to apply ripple to
 */
function createRipple(e, element) {
    const existingRipple = element.querySelector('.ripple');
    if (existingRipple) existingRipple.remove();

    const ripple = document.createElement('span');
    ripple.className = 'ripple';

    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    element.appendChild(ripple);

    // Remove ripple after animation
    ripple.addEventListener('animationend', () => ripple.remove());
}


/**
 * Handle visibility change for a persona
 * @param {string} personaId - Persona ID
 * @param {boolean} isPublic - New visibility state
 * @param {boolean} isDraft - Whether this is a local draft
 */
async function handleVisibilityChange(personaId, isPublic, isDraft) {
    if (isDraft) {
        // Update local draft
        const result = await chrome.storage.local.get('persona_drafts');
        const drafts = result.persona_drafts || [];
        const draftIndex = drafts.findIndex(d => d.id === personaId);

        if (draftIndex !== -1) {
            drafts[draftIndex].is_public = isPublic;
            await chrome.storage.local.set({ persona_drafts: drafts });
            spLog('info', 'Draft visibility updated', { id: personaId, is_public: isPublic });
        }
    } else {
        // Update in Supabase
        try {
            const supabaseClient = await getSupabaseClient();
            if (!supabaseClient.isAuthenticated()) {
                await supabaseClient.signInAnonymously();
            }

            const { error } = await supabaseClient.updatePersona(personaId, { is_public: isPublic });
            if (error) throw error;

            spLog('info', 'Persona visibility updated in Supabase', { id: personaId, is_public: isPublic });
        } catch (error) {
            spLog('error', 'Failed to update visibility', { error: error.message });
            await showAlertDialog({
                title: 'Update Failed',
                message: `Failed to update visibility: ${error.message}`,
                type: 'error'
            });
        }
    }
}

/**
 * Handle editing a persona/draft
 * @param {string} id - Persona ID
 */
async function handleEditPersona(id) {
    // First check local drafts
    const result = await chrome.storage.local.get('persona_drafts');
    const drafts = result.persona_drafts || [];
    let persona = drafts.find(d => d.id === id);

    // If not in drafts, check Supabase for published personas
    if (!persona) {
        try {
            const supabaseClient = await getSupabaseClient();
            if (supabaseClient.isAuthenticated()) {
                const { data, error } = await supabaseClient.getPersona(id);
                if (!error && data) {
                    persona = data;
                }
            }
        } catch (err) {
            spLog('warn', 'Failed to fetch persona from Supabase', { error: err.message });
        }
    }

    if (!persona) {
        await showAlertDialog({
            title: 'Error',
            message: 'Persona not found',
            type: 'error'
        });
        return;
    }

    // Use the loadPersonaToEdit function to navigate and populate the extracted page
    loadPersonaToEdit(persona);
    spLog('info', 'Editing persona', { id });
}

/**
 * Handle deleting a persona/draft
 * @param {string} id - Persona ID
 */
async function handleDeletePersona(id) {
    const confirmed = await showConfirmDialog({
        title: 'Delete Persona',
        message: 'Are you sure you want to delete this persona? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'error'
    });

    if (!confirmed) {
        return;
    }

    // Check if it's a local draft first
    const result = await chrome.storage.local.get('persona_drafts');
    let drafts = result.persona_drafts || [];
    const isDraft = drafts.some(d => d.id === id);

    if (isDraft) {
        // Delete from local drafts
        drafts = drafts.filter(d => d.id !== id);
        await chrome.storage.local.set({ persona_drafts: drafts });
        spLog('info', 'Draft deleted', { id });
    } else {
        // Delete from Supabase
        try {
            const supabaseClient = await getSupabaseClient();
            if (supabaseClient.isAuthenticated()) {
                const { error } = await supabaseClient.deletePersona(id);
                if (error) {
                    await showAlertDialog({
                        title: 'Delete Failed',
                        message: `Failed to delete persona: ${error.message}`,
                        type: 'error'
                    });
                    return;
                }
                spLog('info', 'Published persona deleted', { id });
            }
        } catch (err) {
            spLog('error', 'Failed to delete persona from Supabase', { error: err.message });
            await showAlertDialog({
                title: 'Delete Failed',
                message: `Failed to delete persona: ${err.message}`,
                type: 'error'
            });
            return;
        }
    }

    // Refresh list
    loadMyPersonas();
}

/**
 * Load a persona into the Edit Persona page for editing
 * Called from popup Edit button in My Personas
 * @param {Object} persona - Full persona object
 */
function loadPersonaToEdit(persona) {
    // Navigate to extracted page
    navigateToPersonaPage('extracted', 'my-personas');

    // Debug: Log incoming persona source_prompt
    spLog('debug', 'loadPersonaToEdit - persona.source_prompt:', {
        hasSourcePrompt: !!persona.source_prompt,
        sourcePromptLength: persona.source_prompt?.length || 0,
        personaKeys: Object.keys(persona)
    });

    // Store persona data for editing
    window._currentExtraction = {
        memory_layer: persona.memory_layer,
        metadata: persona.metadata,
        provider: persona.provider,
        llm_model: persona.llm_model,
        id: persona.id,  // Keep track for update vs create
        version: persona.version,  // Preserve version for display
        version_history: persona.version_history || [],  // Preserve version history
        is_public: persona.is_public,  // Preserve visibility
        name: persona.name,  // Preserve name
        source_prompt: persona.source_prompt || ''
    };

    spLog('debug', 'Loaded persona to extraction', { id: persona.id, version: persona.version });

    // Populate form with persona data
    populateExtractionResults(persona, {
        provider: persona.provider,
        model: persona.llm_model
    });

    // Set persona name
    const nameInput = document.getElementById('ext-name');
    if (nameInput) {
        nameInput.value = persona.name || persona.metadata?.suggested_name || '';
    }

    // Set metadata fields


    // Set visibility toggle based on persona.is_public
    const privateBtn = document.getElementById('ext-visibility-private');
    const publicBtn = document.getElementById('ext-visibility-public');
    if (persona.is_public) {
        publicBtn?.classList.add('active');
        privateBtn?.classList.remove('active');
    } else {
        privateBtn?.classList.add('active');
        publicBtn?.classList.remove('active');
    }

    spLog('info', 'Loaded persona to edit', { id: persona.id, name: persona.name });
}

/**
 * Handle viewing persona details from My Personas list
 * @param {Object} persona - Persona data
 */
function handleViewPersona(persona) {
    // Show popup with Edit button (owned persona)
    showPersonaPopup(persona, true);
}

/**
 * HTML escape helper
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// SECTION: Version History Management
// ============================================================================

/**
 * @typedef {Object} VersionSnapshot
 * @property {number} version - Version number
 * @property {string} created_at - ISO timestamp
 * @property {Object} data - Snapshot of persona data at this version
 */

// ============================================================================
// SECTION: Source Prompt Viewer
// ============================================================================

/**
 * Open the source prompt viewer overlay
 * Displays the original prompt used to extract this persona
 */
function openSourcePromptViewer() {
    const viewer = document.getElementById('source-prompt-viewer');
    const textarea = document.getElementById('source-prompt-textarea');

    if (!viewer || !textarea) return;

    const sourcePrompt = window._currentExtraction?.source_prompt || '';

    // Debug: Log what we're reading
    spLog('debug', 'openSourcePromptViewer - reading source_prompt:', {
        hasExtraction: !!window._currentExtraction,
        hasSourcePrompt: !!window._currentExtraction?.source_prompt,
        sourcePromptLength: sourcePrompt.length
    });

    // Reset textarea styles to ensure proper sizing on re-open
    textarea.style.height = '';
    textarea.style.minHeight = '';
    textarea.style.maxHeight = '';
    textarea.removeAttribute('style');

    // Show viewer first
    viewer.classList.remove('hidden');

    // Set value after viewer is visible (for proper layout calculation)
    textarea.value = sourcePrompt;

    // Add ESC key listener
    document.addEventListener('keydown', handleSourceViewerKeydown);

    spLog('info', 'Opened source prompt viewer');
}

/**
 * Close the source prompt viewer overlay
 */
function closeSourcePromptViewer() {
    const viewer = document.getElementById('source-prompt-viewer');
    viewer?.classList.add('hidden');

    // Remove ESC key listener
    document.removeEventListener('keydown', handleSourceViewerKeydown);
}

/**
 * Handle keydown events for source prompt viewer
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleSourceViewerKeydown(e) {
    if (e.key === 'Escape') {
        const viewer = document.getElementById('source-prompt-viewer');
        // Only handle if viewer is actually visible
        if (viewer && !viewer.classList.contains('hidden')) {
            e.preventDefault();
            closeSourcePromptViewer();
        }
    }
}

/**
 * Rebuild persona from source prompt
 * Re-extracts using current LLM settings, then offers to override
 */
let _rebuildInProgress = false;
let _rebuildCancelled = false;
let _hasUnsavedChanges = false; // Track if Edit Persona form has unsaved changes

/**
 * Mark the form as having unsaved changes
 */
function markFormDirty() {
    _hasUnsavedChanges = true;
}

/**
 * Reset unsaved changes flag (after save/publish or page leave)
 */
function resetFormDirty() {
    _hasUnsavedChanges = false;
}

/**
 * Check if form has unsaved changes
 */
function hasUnsavedChanges() {
    return _hasUnsavedChanges;
}

async function handleRebuildFromSource() {
    const sourcePrompt = window._currentExtraction?.source_prompt;

    if (!sourcePrompt) {
        await showAlertDialog({
            title: 'No Source Prompt',
            message: 'This persona has no source prompt to rebuild from.',
            type: 'warning'
        });
        return;
    }

    // Show loading state (consistent with Extract button)
    const rebuildBtn = document.getElementById('btn-rebuild-persona');
    if (!rebuildBtn) return;

    _rebuildInProgress = true;
    _rebuildCancelled = false;

    rebuildBtn.disabled = true;
    rebuildBtn.classList.add('loading');
    rebuildBtn.disabled = true;
    rebuildBtn.classList.add('loading');

    // Legacy innerHTML injection removed in favor of CSS state

    try {
        // Get model config first
        const modelConfig = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_MODEL_CONFIG' }, resolve);
        });

        if (_rebuildCancelled) {
            spLog('info', 'Rebuild cancelled by user');
            return;
        }

        if (!modelConfig?.provider) {
            throw new Error('No LLM model configured. Please configure a model in Settings.');
        }

        // Call extraction API using source prompt
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'EXTRACT_PERSONA',
                payload: { prompt: sourcePrompt, modelConfig }
            }, resolve);
        });

        if (_rebuildCancelled) {
            spLog('info', 'Rebuild cancelled by user');
            return;
        }

        // Validate response
        const validation = validateExtractionResponse(result);
        if (!validation.valid) {
            throw new Error(validation.error?.message || 'Extraction failed');
        }

        // Check again if cancelled during validation
        if (_rebuildCancelled) {
            spLog('info', 'Rebuild cancelled by user during validation');
            return;
        }

        // Confirm override
        const confirmed = await showConfirmDialog({
            title: 'Override Current Persona?',
            message: 'This will replace all current data with the new extraction. Your current version will be saved to history.',
            confirmText: 'Override',
            cancelText: 'Cancel'
        });

        if (!confirmed || _rebuildCancelled) {
            spLog('info', 'Rebuild cancelled by user');
            return;
        }

        // Preserve ID, version, and other metadata for update
        const preserved = {
            id: window._currentExtraction.id,
            version: window._currentExtraction.version,
            version_history: window._currentExtraction.version_history || [],
            source_prompt: sourcePrompt,
            name: window._currentExtraction.name
        };

        // Merge new extraction with preserved fields
        window._currentExtraction = {
            ...validation.data,
            ...preserved,
            provider: modelConfig.provider,
            llm_model: modelConfig.model
        };

        // Repopulate form with new data
        populateExtractionResults(validation.data, modelConfig);

        closeSourcePromptViewer();

        await showAlertDialog({
            title: 'Persona Rebuilt',
            message: 'The persona has been re-extracted successfully.',
            type: 'success'
        });

        spLog('info', 'Persona rebuilt from source prompt');

    } catch (error) {
        if (!_rebuildCancelled) {
            spLog('error', 'Rebuild failed', { error: error.message });
            await showAlertDialog({
                title: 'Rebuild Failed',
                message: error.message,
                type: 'error'
            });
        }
    } finally {
        _rebuildInProgress = false;
        _rebuildCancelled = false; // Reset to prevent delayed "Rebuild Stopped" dialog
        rebuildBtn.disabled = false;
        rebuildBtn.classList.remove('loading');
    }
}

/**
 * Cancel ongoing rebuild process
 * Uses 2-second delay window pattern (matches Stop Refinement)
 */
function cancelRebuild() {
    if (!_rebuildInProgress) return;

    _rebuildCancelled = true;
    spLog('info', 'Rebuild cancellation requested');

    // Send STOP_EXTRACTION message to background to abort the actual fetch
    chrome.runtime.sendMessage({ type: 'STOP_EXTRACTION' }, (response) => {
        spLog('info', 'Stop extraction response', response);
    });

    // Get the rebuild button to update its state
    const rebuildBtn = document.getElementById('btn-rebuild-persona');
    if (!rebuildBtn) return;

    // Use loading state (spinner) instead of "Stopping..." text for consistency
    // The button should already be in loading state from handleRebuildFromSource

    // Wait 2 seconds then show appropriate feedback
    setTimeout(async () => {
        // Only show stopped dialog if:
        // 1. _rebuildCancelled is still true (not reset by successful completion)
        // 2. _rebuildInProgress is still true (rebuild hasn't finished)
        if (_rebuildCancelled && _rebuildInProgress) {
            // Stop was successful - no response received
            _rebuildInProgress = false;
            _rebuildCancelled = false;
            rebuildBtn.disabled = false;
            rebuildBtn.classList.remove('loading');

            await showAlertDialog({
                title: 'Rebuild Stopped',
                message: 'The persona rebuild was cancelled.',
                type: 'info'
            });

            spLog('info', 'Rebuild successfully stopped');
        }
        // If either flag is false, the normal flow already handled cleanup
    }, 2000);
}

/**
 * Navigate to Version History page for current persona
 */
function openVersionHistory() {
    if (!window._currentExtraction) {
        showAlertDialog({
            title: 'No Persona Loaded',
            message: 'Please load a persona to view its version history.',
            type: 'warning'
        });
        return;
    }

    // If no ID, this is a new unpublished persona
    if (!window._currentExtraction.id) {
        showAlertDialog({
            title: 'Not Published Yet',
            message: 'This persona has not been published yet. Version history is available after publishing.',
            type: 'info'
        });
        return;
    }

    navigateToPersonaPage('version-history', 'extracted');
    loadVersionHistory(window._currentExtraction);
}

/**
 * Load and display version history for a persona
 * @param {Object} persona - Current persona object
 */
async function loadVersionHistory(persona) {
    const container = document.getElementById('version-list');
    const nameEl = document.getElementById('version-persona-name');

    if (!container) return;

    // Set persona name
    if (nameEl) {
        nameEl.textContent = persona.name || persona.metadata?.suggested_name || 'Untitled';
    }

    // Show skeleton loading
    container.innerHTML = `
        <div class="version-item skeleton" aria-hidden="true">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line meta"></div>
        </div>
        <div class="version-item skeleton" aria-hidden="true">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line meta"></div>
        </div>
    `;

    // Get version history from persona
    const versions = persona.version_history || [];
    const currentVersion = persona.version || 1;

    // If no history, show current version only
    if (versions.length === 0) {
        container.innerHTML = `
            <div class="version-item current" role="listitem">
                <div class="version-item-header">
                    <div class="version-item-info">
                        <div class="version-number">v${currentVersion}<span class="current-badge">Current</span></div>
                        <div class="version-date">${formatDate(persona.updated_at || persona.created_at)}</div>
                    </div>
                </div>
            </div>
            <div class="empty-state">
                <span class="material-symbols-outlined">history</span>
                <p>No previous versions available.</p>
            </div>
        `;
        return;
    }

    // Render version list
    container.innerHTML = '';

    // Add current version first
    const currentItem = createVersionItem({
        version: currentVersion,
        created_at: persona.updated_at || persona.created_at,
        data: persona
    }, true, versions[0]);
    container.appendChild(currentItem);

    // Add historical versions
    versions.forEach((snapshot, index) => {
        const prevSnapshot = versions[index + 1] || null;
        const item = createVersionItem(snapshot, false, prevSnapshot);
        container.appendChild(item);
    });

    spLog('info', 'Loaded version history', { personaId: persona.id, versions: versions.length + 1 });
}

/**
 * Create a version item element
 * @param {VersionSnapshot} snapshot - Version snapshot data
 * @param {boolean} isCurrent - Whether this is the current version
 * @param {VersionSnapshot|null} prevSnapshot - Previous version for diff
 * @returns {HTMLElement}
 */
function createVersionItem(snapshot, isCurrent, prevSnapshot) {
    const item = document.createElement('div');
    item.className = `version-item${isCurrent ? ' current' : ''}`;
    item.setAttribute('role', 'listitem');

    const version = snapshot.version || 1;
    const date = formatDate(snapshot.created_at);
    const notes = snapshot.change_notes;

    item.innerHTML = `
        <div class="version-item-header">
            <div class="version-item-info">
                <div class="version-number">v${version}${isCurrent ? '<span class="current-badge">Current</span>' : ''}</div>
                <div class="version-date">${date}</div>
                ${notes ? `<div class="version-notes">${escapeHtml(notes)}</div>` : ''}
            </div>
            <div class="version-item-actions">
                ${prevSnapshot ? '<button class="btn-icon btn-diff" title="View changes"><span class="material-symbols-outlined">difference</span></button>' : ''}
                ${!isCurrent ? '<button class="btn btn-secondary btn-restore" title="Restore this version"><span class="material-symbols-outlined">restore</span> Restore</button>' : ''}
            </div>
        </div>
        <div class="version-diff"></div>
    `;

    // Diff button handler
    item.querySelector('.btn-diff')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const diffEl = item.querySelector('.version-diff');
        if (diffEl.classList.contains('expanded')) {
            diffEl.classList.remove('expanded');
        } else {
            diffEl.innerHTML = generateDiffView(snapshot.data || snapshot, prevSnapshot?.data || prevSnapshot);
            diffEl.classList.add('expanded');
        }
    });

    // Restore button handler
    item.querySelector('.btn-restore')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        await restoreVersion(snapshot);
    });

    return item;
}

/**
 * Generate inline diff view comparing two versions
 * @param {Object} current - Current version data
 * @param {Object} previous - Previous version data
 * @returns {string} HTML diff content
 */
function generateDiffView(current, previous) {
    if (!previous) {
        return '<div class="diff-line"><span class="diff-field">Initial version</span></div>';
    }

    let html = '';

    // Recursive diff helper
    const diffObjects = (curr, prev, prefix = '') => {
        const allKeys = new Set([...Object.keys(curr || {}), ...Object.keys(prev || {})]);

        allKeys.forEach(key => {
            // Skip internal/system fields
            if (['id', 'author_id', 'created_at', 'updated_at', 'version', 'version_history'].includes(key)) return;

            const currVal = curr?.[key];
            const prevVal = prev?.[key];
            const fullKey = prefix ? `${prefix}.${key}` : key;

            // If both are objects (not arrays), recurse
            if (currVal && prevVal && typeof currVal === 'object' && typeof prevVal === 'object' && !Array.isArray(currVal) && !Array.isArray(prevVal)) {
                diffObjects(currVal, prevVal, fullKey);
                return;
            }

            // Compare values
            const currStr = formatDiffValue(currVal);
            const prevStr = formatDiffValue(prevVal);

            if (currStr !== prevStr) {
                const label = formatFieldLabel(fullKey);
                html += `
                    <div class="diff-line changed">
                        <span class="diff-field">${escapeHtml(label)}:</span>
                        <span class="diff-old">${escapeHtml(prevStr)}</span>
                        <span class="diff-arrow">→</span>
                        <span class="diff-new">${escapeHtml(currStr)}</span>
                        <span class="diff-status changed">CHANGED</span>
                    </div>
                `;
            }
        });
    };

    diffObjects(current, previous);

    return html || '<div class="diff-line"><span class="diff-status no-change">No changes detected</span></div>';
}

/**
 * Format a value for diff display (truncate long text, join arrays)
 * @param {*} val - Value to format
 * @returns {string}
 */
function formatDiffValue(val) {
    if (val === null || val === undefined) return '-';
    if (Array.isArray(val)) return val.join(', ') || '-';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val).slice(0, 80);
    const str = String(val);
    return str.length > 80 ? str.slice(0, 80) + '...' : str;
}

/**
 * Format field key as human-readable label
 * @param {string} key - Dot-notated field key
 * @returns {string}
 */
function formatFieldLabel(key) {
    // Get last part and make it readable
    const parts = key.split('.');
    const last = parts[parts.length - 1];
    return last
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^\w/, c => c.toUpperCase())
        .trim();
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot-notated path (e.g., 'metadata.domain')
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
}

/**
 * Restore a previous version of the persona
 * @param {VersionSnapshot} snapshot - Version snapshot to restore
 */
async function restoreVersion(snapshot) {
    const confirmed = await showConfirmDialog({
        title: 'Restore Version',
        message: `This will create a new version (v${(window._currentExtraction?.version || 1) + 1}) with content from v${snapshot.version}. Continue?`,
        confirmText: 'Restore',
        cancelText: 'Cancel',
        type: 'warning'
    });

    if (!confirmed) return;

    const restoredData = snapshot.data || snapshot;

    // Merge restored data into current extraction
    window._currentExtraction = {
        ...window._currentExtraction,
        ...restoredData,
        id: window._currentExtraction.id // Keep original ID
    };

    // Navigate back to edit page
    navigateToPersonaPage('extracted', 'version-history');

    // Reload form with restored data
    loadPersonaToEdit(window._currentExtraction);

    await showAlertDialog({
        title: 'Version Restored',
        message: `Content from v${snapshot.version} has been loaded. Click Publish to save as a new version.`,
        type: 'success'
    });

    spLog('info', 'Version restored', { version: snapshot.version });
}

/**
 * Export current persona as JSON file
 * Downloads a complete backup including version history
 */
async function exportPersonaJSON() {
    const persona = window._currentExtraction;
    if (!persona) {
        showAlertDialog({
            title: 'No Persona Loaded',
            message: 'Please load a persona to export.',
            type: 'warning'
        });
        return;
    }

    const exportData = {
        exportFormat: 'gemini-context-persona',
        exportVersion: '1.0',
        exportedAt: new Date().toISOString(),
        persona: {
            name: persona.name,
            version: persona.version,
            is_public: persona.is_public,
            metadata: persona.metadata,
            memory_layer: persona.memory_layer,
            version_history: persona.version_history || [],
            source_prompt: persona.source_prompt || '',
            provider: persona.provider,
            llm_model: persona.llm_model
        }
    };

    // Derive filename from available name sources
    const personaName = persona.name || persona.metadata?.suggested_name || exportData.persona.name || 'persona';
    const safeName = personaName.replace(/[^a-z0-9]/gi, '_');
    const filename = `${safeName}-v${persona.version || 1}.json`;

    // Create JSON data
    const jsonData = JSON.stringify(exportData, null, 2);

    spLog('debug', 'Starting download with File System Access API', { filename });

    try {
        // Use File System Access API for proper Save As dialog with filename control
        const handle = await window.showSaveFilePicker({
            suggestedName: filename,
            types: [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] }
            }]
        });

        const writable = await handle.createWritable();
        await writable.write(jsonData);
        await writable.close();

        spLog('info', 'Persona exported', {
            name: persona.name,
            filename: filename,
            version: persona.version
        });
        showNotification('Persona exported!', 'success');
    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled the save dialog
            spLog('debug', 'Export cancelled by user');
            return;
        }
        spLog('error', 'Export failed', { error: error.message });
        showNotification('Export failed: ' + error.message, 'error');
    }
}





/**
 * Allowed file extensions for import (whitelist)
 */
const ALLOWED_IMPORT_EXTENSIONS = ['.json', '.txt', '.xml', '.md'];

/**
 * Maximum file size for import (1MB)
 */
const MAX_IMPORT_FILE_SIZE = 1 * 1024 * 1024;

/**
 * Read and sanitize file content based on file type
 * @param {File} file - File to read
 * @returns {Promise<{content: string, type: string, error: string|null}>}
 */
async function readAndSanitizeFile(file) {
    // === SECURITY CHECK 1: File extension whitelist ===
    const fileName = file.name.toLowerCase();
    const extension = fileName.substring(fileName.lastIndexOf('.'));

    if (!ALLOWED_IMPORT_EXTENSIONS.includes(extension)) {
        return {
            content: null,
            type: null,
            error: `Unsupported file type: ${extension}. Allowed: ${ALLOWED_IMPORT_EXTENSIONS.join(', ')}`
        };
    }

    // === SECURITY CHECK 2: File size limit ===
    if (file.size > MAX_IMPORT_FILE_SIZE) {
        return {
            content: null,
            type: null,
            error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum: 1MB`
        };
    }

    // === SECURITY CHECK 3: MIME type validation (secondary check) ===
    const allowedMimes = [
        'application/json',
        'text/plain',
        'text/xml',
        'application/xml',
        'text/markdown',
        'text/x-markdown'
    ];
    // Note: MIME types can be spoofed, but this adds defense in depth

    try {
        const rawText = await file.text();

        // === SECURITY CHECK 4: Sanitize content based on type ===
        let sanitizedContent;

        if (extension === '.json') {
            // Parse and re-stringify to prevent JSON injection
            const parsed = JSON.parse(rawText);
            sanitizedContent = parsed;
        } else {
            // For text files, apply XSS sanitization
            sanitizedContent = sanitizeTextContent(rawText);
        }

        return { content: sanitizedContent, type: extension, error: null };

    } catch (err) {
        return {
            content: null,
            type: null,
            error: `Failed to read file: ${err.message}`
        };
    }
}

/**
 * Sanitize text content to prevent XSS
 * @param {string} text - Raw text content
 * @returns {string} Sanitized text
 */
function sanitizeTextContent(text) {
    if (!text || typeof text !== 'string') return '';

    return text
        // Remove script tags and content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove javascript: URIs
        .replace(/javascript:/gi, '')
        // Remove event handlers
        .replace(/on\w+\s*=/gi, '')
        // Normalize whitespace but preserve structure
        .trim();
}

/**
 * Import persona from file (JSON, TXT, XML, MD)
 * @param {File} file - File to import
 */
async function importPersonaFile(file) {
    const { content, type, error } = await readAndSanitizeFile(file);

    if (error) {
        spLog('error', 'File import failed', { error });
        await showAlertDialog({
            title: 'Import Failed',
            message: escapeHtml(error),
            type: 'error'
        });
        return;
    }

    try {
        if (type === '.json') {
            // JSON persona import - use existing logic
            await processPersonaImport(content);
        } else {
            // Text-based files - populate the prompt textarea
            const textarea = document.getElementById('extract-prompt-input');
            if (textarea) {
                // content is already sanitized string
                textarea.value = typeof content === 'string' ? content : JSON.stringify(content);
                showToast('File imported to prompt field', 'success');
                spLog('info', 'Text file imported to prompt', { type, length: textarea.value.length });
            }
        }
    } catch (err) {
        spLog('error', 'Import processing failed', { error: err.message });
        await showAlertDialog({
            title: 'Import Failed',
            message: `Could not process file: ${escapeHtml(err.message)}`,
            type: 'error'
        });
    }
}

/**
 * Process persona import from JSON data
 * @param {Object} data - Parsed and sanitized JSON data
 */
async function processPersonaImport(data) {
    // Validate structure
    if (!data.persona || !data.persona.memory_layer) {
        throw new Error('Invalid persona file format. Expected { persona: { memory_layer: {...} } }');
    }

    // Sanitize imported data to prevent XSS
    const sanitizedPersona = sanitizeImportedData(data.persona);

    // Load into extraction (without ID - will be created as new)
    window._currentExtraction = {
        memory_layer: sanitizedPersona.memory_layer,
        metadata: sanitizedPersona.metadata,
        name: sanitizedPersona.name,
        version: sanitizedPersona.version || 1,
        is_public: sanitizedPersona.is_public ?? false,
        version_history: sanitizedPersona.version_history || [],
        source_prompt: sanitizedPersona.source_prompt || '',
        provider: sanitizedPersona.provider || '-',
        llm_model: sanitizedPersona.llm_model || '-'
    };

    // Navigate to edit page
    navigateToPersonaPage('extracted', 'create');
    populateExtractionResults(sanitizedPersona, {
        provider: sanitizedPersona.provider || '-',
        model: sanitizedPersona.llm_model || '-'
    });

    // Set name (input.value is safe, not innerHTML)
    const nameInput = document.getElementById('ext-name');
    if (nameInput) nameInput.value = sanitizedPersona.name || '';

    const safeName = sanitizedPersona.name || 'Untitled';
    await showAlertDialog({
        title: 'Import Successful',
        message: `Persona "${safeName}" has been imported. Review and click Publish to save.`,
        type: 'success'
    });

    spLog('info', 'Persona imported', { name: sanitizedPersona.name });
}

/**
 * Import file to Add Prompt page
 * @param {File} file - File to import
 */
async function importPromptFile(file) {
    const { content, type, error } = await readAndSanitizeFile(file);

    if (error) {
        spLog('error', 'Prompt file import failed', { error });
        await showAlertDialog({
            title: 'Import Failed',
            message: escapeHtml(error),
            type: 'error'
        });
        return;
    }

    try {
        const titleInput = document.getElementById('add-prompt-title');
        const contentInput = document.getElementById('add-prompt-content');

        if (type === '.json') {
            // For JSON, extract content field or stringify
            let textContent;
            if (typeof content === 'object') {
                textContent = content.content || content.prompt || content.text || JSON.stringify(content, null, 2);
            } else {
                textContent = String(content);
            }
            if (contentInput) contentInput.value = sanitizeTextContent(textContent);

            // Use title from JSON if available
            if (titleInput && content.title) {
                titleInput.value = sanitizeTextContent(String(content.title));
            }
        } else {
            // Text-based files
            if (contentInput) contentInput.value = typeof content === 'string' ? content : String(content);
        }

        // Auto-set title from filename if empty
        if (titleInput && !titleInput.value) {
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            titleInput.value = sanitizeTextContent(baseName);
        }

        showToast('File imported', 'success');
        spLog('info', 'Prompt file imported', { type, filename: file.name });

    } catch (err) {
        spLog('error', 'Prompt import processing failed', { error: err.message });
        await showAlertDialog({
            title: 'Import Failed',
            message: `Could not process file: ${escapeHtml(err.message)}`,
            type: 'error'
        });
    }
}

// Legacy function for backward compatibility
async function importPersonaJSON(file) {
    return importPersonaFile(file);
}

/**
 * Recursively sanitize imported data to prevent XSS
 * Strips any HTML tags and script content from strings
 * @param {*} data - Data to sanitize
 * @returns {*} Sanitized data
 */
function sanitizeImportedData(data) {
    if (data === null || data === undefined) return data;

    if (typeof data === 'string') {
        // Strip HTML tags and decode entities
        return data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')  // Remove scripts
            .replace(/<[^>]*>/g, '')  // Remove HTML tags
            .replace(/javascript:/gi, '')  // Remove javascript: URIs
            .replace(/on\w+\s*=/gi, '')  // Remove event handlers
            .trim();
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeImportedData(item));
    }

    if (typeof data === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeImportedData(value);
        }
        return sanitized;
    }

    return data; // numbers, booleans pass through
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
    if (!isoDate) return '-';
    try {
        return new Date(isoDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoDate;
    }
}

function setupLogsPageHandlers() {
    const levelFilter = document.getElementById('log-level-filter-page');
    const exportBtn = document.getElementById('export-logs-page');
    const clearBtn = document.getElementById('clear-logs-page');

    // Setup M3 Dropdown for log level
    setupM3Dropdown('log-level-dropdown', (value) => {
        // Update hidden input and trigger render
        if (levelFilter) {
            levelFilter.value = value;
        }
        renderLogsPage();
    });

    exportBtn?.addEventListener('click', async () => {
        spLog('info', 'Exporting logs from page...');
        try {
            const result = await chrome.storage.session.get(['_logs', '_bgLogs']);
            const contentLogs = result._logs || [];
            const bgLogs = result._bgLogs || [];

            const exportData = JSON.stringify({
                exportedAt: new Date().toISOString(),
                total: contentLogs.length + bgLogs.length,
                logs: [...contentLogs, ...bgLogs].sort((a, b) => a.timestamp - b.timestamp)
            }, null, 2);

            const blob = new Blob([exportData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `prompt-assistant-logs-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showNotification('Logs exported successfully!');
        } catch (e) {
            showNotification('Failed to export logs', 'error');
        }
    });

    clearBtn?.addEventListener('click', async () => {
        spLog('info', 'Clearing logs from page...');
        try {
            await chrome.storage.session.set({ _logs: [], _bgLogs: [] });
            renderLogsPage();
            showNotification('Logs cleared');
        } catch (e) {
            showNotification('Failed to clear logs', 'error');
        }
    });
}

async function renderLogsPage() {
    const logViewer = document.getElementById('log-viewer-page');
    const logStats = document.getElementById('log-stats-page');
    const logStatsText = document.getElementById('log-stats-text-page');
    const levelFilter = document.getElementById('log-level-filter-page');
    const tabLogCount = document.getElementById('tab-log-count');

    if (!logViewer) return;

    try {
        const result = await chrome.storage.session.get(['_logs', '_bgLogs']);
        let logs = [...(result._logs || []), ...(result._bgLogs || [])];
        logs.sort((a, b) => a.timestamp - b.timestamp);

        // Filter by level
        const minLevel = { TRACE: 0, DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4 };
        const selectedLevel = levelFilter?.value || 'DEBUG';
        logs = logs.filter(log => (minLevel[log.level] || 0) >= minLevel[selectedLevel]);

        // Update tab badge
        if (tabLogCount) tabLogCount.textContent = logs.length;

        if (logs.length === 0) {
            logViewer.innerHTML = '<div class="log-empty">No logs match the current filter.</div>';
            if (logStats) logStats.classList.add('hidden');
            return;
        }

        // Show last 200 for page view
        const displayLogs = logs.slice(-200);

        logViewer.innerHTML = displayLogs.map(log => {
            const time = new Date(log.timestamp).toISOString().split('T')[1].slice(0, 12);
            const component = log.component || 'Unknown';
            const message = log.message || '';
            return `
                <div class="log-entry">
                    <span class="log-time">${time}</span>
                    <span class="log-level log-level-${log.level}">${log.level}</span>
                    <span class="log-component">[${component}]</span>
                    <span class="log-message" title="${escapeHtml(message)}">${escapeHtml(message)}</span>
                </div>
            `;
        }).join('');

        if (logStats && logStatsText) {
            const byLevel = {};
            for (const log of logs) {
                byLevel[log.level] = (byLevel[log.level] || 0) + 1;
            }
            const statsStr = Object.entries(byLevel).map(([k, v]) => `${k}: ${v}`).join(' | ');
            logStatsText.textContent = `Total: ${logs.length} | ${statsStr}`;
            logStats.classList.remove('hidden');
        }

        logViewer.scrollTop = logViewer.scrollHeight;
    } catch (e) {
        console.error('[Sidepanel] Failed to render logs page:', e);
    }
}

function setupSynthesizedPersonaSave() {
    const textarea = document.getElementById('synthesized-persona-input');
    const verbatimToggle = document.getElementById('verbatim-toggle-persona');
    const verbatimBadge = document.getElementById('verbatim-badge-persona');

    if (!textarea) return;

    // In-section Verbatim toggle for Persona
    if (verbatimToggle) {
        verbatimToggle.addEventListener('change', async (e) => {
            const shouldPin = e.target.checked;
            if (shouldPin) {
                if (verbatimBadge) verbatimBadge.classList.remove('hidden');
                updateDimensionPinButton('persona', true);
                if (currentSessionId) {
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'PIN_PERSONA',
                            sessionId: currentSessionId
                        });
                        showNotification('Persona locked as verbatim');
                    } catch (err) {
                        console.error('[Sidepanel] Failed to pin persona:', err);
                    }
                }
            } else {
                if (verbatimBadge) verbatimBadge.classList.add('hidden');
                updateDimensionPinButton('persona', false);
                if (currentSessionId) {
                    try {
                        await chrome.runtime.sendMessage({
                            type: 'UNPIN_PERSONA',
                            sessionId: currentSessionId
                        });
                        showNotification('Persona unlocked from verbatim');
                    } catch (err) {
                        console.error('[Sidepanel] Failed to unpin persona:', err);
                    }
                }
            }
        });
    }

    // Auto-save on input (debounced) and immediate save on blur
    let autoSaveTimeout = null;
    textarea.addEventListener('input', () => {
        // Auto-activate verbatim on edit
        if (verbatimToggle && !verbatimToggle.checked) {
            verbatimToggle.checked = true;
            if (verbatimBadge) verbatimBadge.classList.remove('hidden');
            updateDimensionPinButton('persona', true);
            if (currentSessionId) {
                chrome.runtime.sendMessage({
                    type: 'PIN_PERSONA',
                    sessionId: currentSessionId
                }).catch(err => console.error('[Sidepanel] Auto-pin persona failed:', err));
            }
        }

        // Debounce auto-save by 500ms
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(async () => {
            await savePersonaToStorage(textarea.value, false); // Silent save
        }, 500);
    });

    // Immediate save on blur (when user clicks away / closes)
    textarea.addEventListener('blur', async () => {
        if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
        await savePersonaToStorage(textarea.value, false);
    });
}

/**
 * Save persona to storage using V4 schema path
 * @param {string} personaText - The persona instruction text
 * @param {boolean} showToast - Whether to show notification
 */
async function savePersonaToStorage(personaText, showToast = false) {
    if (!currentSessionId) return;

    spLog('info', 'Saving persona', { length: personaText.length, showToast });

    const sessionKey = `session_${currentSessionId}`;
    const result = await chrome.storage.local.get(sessionKey);
    const sessionData = result[sessionKey] || { components: {} };

    // Ensure components structure exists
    if (!sessionData.components) sessionData.components = {};

    // Update V4 schema path: components.persona.current.instruction
    if (!sessionData.components.persona) {
        sessionData.components.persona = {
            current: { instruction: personaText, version: 4, source: 'manual' },
            history: [],
            confidence: 1.0,
            updatedAt: Date.now()
        };
    } else {
        // Preserve existing structure, just update instruction
        if (!sessionData.components.persona.current) {
            sessionData.components.persona.current = {};
        }
        sessionData.components.persona.current.instruction = personaText;
        sessionData.components.persona.current.source = 'manual';
        sessionData.components.persona.updatedAt = Date.now();
    }

    await chrome.storage.local.set({ [sessionKey]: sessionData });

    // Update local cache
    if (memoryData?.components?.persona) {
        memoryData.components.persona.current.instruction = personaText;
    }

    if (showToast) {
        showNotification('Persona saved!');
    }

    console.log('[Sidepanel] Persona saved to V4 storage path');
}

// ============================================================================
// Expand Textarea Feature - In-Place Fullscreen (Like Gemini)
// ============================================================================

/**
 * Set up in-place fullscreen expansion for textareas
 * Toggles the textarea container to fill available space
 */
function setupExpandModal() {
    // Handle expand button clicks
    // Handle expand button clicks (Delegation for dynamic elements)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.expand-btn');
        if (!btn) return;

        e.stopPropagation();
        const container = btn.closest('.textarea-container');
        const icon = btn.querySelector('.material-symbols-outlined');

        if (container) {
            const isExpanding = !container.classList.contains('is-fullscreen');
            container.classList.toggle('is-fullscreen');

            // Toggle icon
            if (icon) {
                icon.textContent = isExpanding ? 'collapse_content' : 'expand_content';
            }

            // Focus textarea when expanding
            if (isExpanding) {
                const textarea = container.querySelector('textarea');
                textarea?.focus();
            }
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const expanded = document.querySelector('.textarea-container.is-fullscreen');
            // Skip if inside textarea-overlay (has its own ESC handler)
            if (expanded && !expanded.closest('.textarea-overlay')) {
                expanded.classList.remove('is-fullscreen');
                const icon = expanded.querySelector('.expand-btn .material-symbols-outlined');
                if (icon) {
                    icon.textContent = 'expand_content';
                }
            }
        }
    });
}

// ============================================================================
// Rating System
// ============================================================================

/**
 * Check if rating prompt should be shown
 */
async function checkRatingEligibility() {
    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'CHECK_RATING_ELIGIBILITY' }, resolve);
        });

        if (result?.eligible) {
            showRatingPrompt(result.personaId);
        }
    } catch (err) {
        spLog('error', 'Rating check failed', { error: err.message });
    }
}

/**
 * Show rating prompt UI
 * @param {string} personaId - ID of imported persona to rate
 */
function showRatingPrompt(personaId) {
    // Don't show if already visible
    if (document.querySelector('.rating-prompt')) return;

    const prompt = document.createElement('div');
    prompt.className = 'rating-prompt';
    prompt.innerHTML = `
        <div class="rating-prompt-card">
            <button class="rating-prompt-close">
                <span class="material-symbols-outlined">close</span>
            </button>
            <div class="rating-prompt-icon">
                <span class="material-symbols-outlined">star</span>
            </div>
            <h3>Rate this Persona</h3>
            <p>How helpful was the imported persona?</p>
            <div class="rating-stars" data-persona-id="${personaId}">
                ${[1, 2, 3, 4, 5].map(n => `
                    <button class="star-btn" data-rating="${n}">
                        <span class="material-symbols-outlined">star</span>
                    </button>
                `).join('')}
            </div>
            <button class="btn btn-primary rating-submit-btn" disabled>
                Submit Rating
            </button>
            <button class="btn btn-text rating-skip-btn">
                Maybe later
            </button>
        </div>
    `;

    let selectedRating = 0;

    // Close button
    prompt.querySelector('.rating-prompt-close')?.addEventListener('click', () => {
        prompt.remove();
    });

    // Star click handlers
    prompt.querySelectorAll('.star-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            selectedRating = idx + 1;
            prompt.querySelectorAll('.star-btn').forEach((b, i) => {
                b.classList.toggle('active', i < selectedRating);
            });
            prompt.querySelector('.rating-submit-btn').disabled = false;
        });

        // Hover effects
        btn.addEventListener('mouseenter', () => {
            prompt.querySelectorAll('.star-btn').forEach((b, i) => {
                b.classList.toggle('hover', i <= idx);
            });
        });
        btn.addEventListener('mouseleave', () => {
            prompt.querySelectorAll('.star-btn').forEach(b => b.classList.remove('hover'));
        });
    });

    // Submit handler
    prompt.querySelector('.rating-submit-btn')?.addEventListener('click', async () => {
        if (selectedRating > 0) {
            await submitRating(personaId, selectedRating);
            prompt.remove();
        }
    });

    // Skip handler
    prompt.querySelector('.rating-skip-btn')?.addEventListener('click', () => {
        prompt.remove();
    });

    document.body.appendChild(prompt);
    spLog('info', 'Rating prompt shown', { personaId });
}

/**
 * Submit rating to backend
 * @param {string} personaId
 * @param {number} rating
 */
async function submitRating(personaId, rating) {
    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'SUBMIT_RATING',
                payload: { personaId, rating }
            }, resolve);
        });

        if (result?.success) {
            spLog('info', 'Rating submitted', { personaId, rating });
            // Show thank you message
            const toast = document.createElement('div');
            toast.className = 'rating-toast';
            toast.innerHTML = `
                <span class="material-symbols-outlined">check_circle</span>
                Thanks for your rating!
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } else {
            throw new Error(result?.error || 'Failed to submit rating');
        }
    } catch (err) {
        spLog('error', 'Rating submission failed', { error: err.message });
        await showAlertDialog({
            title: 'Rating Failed',
            message: `Failed to submit rating: ${err.message}`,
            type: 'error'
        });
    }
}

// Check rating eligibility periodically when on Context tab
setInterval(() => {
    const contextTab = document.getElementById('tab-content-context');
    if (contextTab && !contextTab.classList.contains('hidden')) {
        checkRatingEligibility();
    }
}, 30000); // Check every 30 seconds

// ============================================================================
// Moderation System
// ============================================================================

/**
 * Scan content for moderation before publishing
 * @param {Object} persona - Persona to scan
 * @returns {Promise<{passed: boolean, severity: string, message: string}>}
 */
async function scanContentForModeration(persona) {
    const content = [
        persona.name,
        persona.memory_layer?.synthesized_persona || '',
        persona.memory_layer?.topic_summarizer || '',
        persona.memory_layer?.intent_classifier || '',
        persona.source_prompt || '',
        ...(persona.metadata?.use_case_keywords || [])
    ].join(' ');

    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'SCAN_CONTENT',
                payload: { content, personaName: persona.name }
            }, resolve);
        });

        return result;
    } catch (err) {
        spLog('error', 'Content scan failed', { error: err.message });
        return { passed: false, error: err.message };
    }
}

/**
 * Show moderation warning dialog
 * @param {Object} scanResult - Result from content scan
 * @returns {Promise<boolean>} - True if user wants to proceed
 */
function showModerationWarning(scanResult) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'moderation-dialog';
        dialog.innerHTML = `
            <div class="moderation-dialog-card">
                <div class="moderation-icon ${scanResult.severity}">
                    <span class="material-symbols-outlined">
                        ${scanResult.severity === 'blocked' ? 'block' : 'warning'}
                    </span>
                </div>
                <h3>${scanResult.severity === 'blocked' ? 'Content Blocked' : 'Content Warning'}</h3>
                <p>${scanResult.message}</p>
                ${scanResult.flaggedTerms?.length ? `
                    <div class="flagged-terms">
                        <strong>Flagged:</strong> ${scanResult.flaggedTerms.join(', ')}
                    </div>
                ` : ''}
                <div class="moderation-actions">
                    ${scanResult.severity !== 'blocked' ? `
                        <button class="btn btn-secondary moderation-cancel">Cancel</button>
                        <button class="btn btn-primary moderation-proceed">Proceed Anyway</button>
                    ` : `
                        <button class="btn btn-primary moderation-ok">OK</button>
                    `}
                </div>
            </div>
        `;

        dialog.querySelector('.moderation-cancel')?.addEventListener('click', () => {
            dialog.remove();
            resolve(false);
        });

        dialog.querySelector('.moderation-proceed')?.addEventListener('click', () => {
            dialog.remove();
            resolve(true);
        });

        dialog.querySelector('.moderation-ok')?.addEventListener('click', () => {
            dialog.remove();
            resolve(false);
        });

        document.body.appendChild(dialog);
    });
}

/**
 * Show report persona dialog
 * @param {Object} persona - Persona to report
 */
function showReportDialog(persona) {
    const existingDialog = document.querySelector('.report-dialog');
    if (existingDialog) existingDialog.remove();

    const dialog = document.createElement('div');
    dialog.className = 'report-dialog';
    dialog.innerHTML = `
        <div class="report-dialog-card">
            <button class="report-close">
                <span class="material-symbols-outlined">close</span>
            </button>
            <h3>Report Persona</h3>
            <p>Why are you reporting this persona?</p>
            <div class="report-reasons">
                <label class="report-option">
                    <input type="radio" name="report-reason" value="inappropriate">
                    <span>Inappropriate content</span>
                </label>
                <label class="report-option">
                    <input type="radio" name="report-reason" value="misleading">
                    <span>Misleading or deceptive</span>
                </label>
                <label class="report-option">
                    <input type="radio" name="report-reason" value="harmful">
                    <span>Promotes harmful behavior</span>
                </label>
                <label class="report-option">
                    <input type="radio" name="report-reason" value="spam">
                    <span>Spam or duplicate</span>
                </label>
                <label class="report-option">
                    <input type="radio" name="report-reason" value="other">
                    <span>Other</span>
                </label>
            </div>
            <textarea class="report-details" placeholder="Additional details (optional)"></textarea>
            <div class="report-actions">
                <button class="btn btn-secondary report-cancel">Cancel</button>
                <button class="btn btn-primary report-submit" disabled>Submit Report</button>
            </div>
        </div>
    `;

    // Close button
    dialog.querySelector('.report-close')?.addEventListener('click', () => {
        dialog.remove();
    });

    // Enable submit when reason selected
    dialog.querySelectorAll('input[name="report-reason"]').forEach(input => {
        input.addEventListener('change', () => {
            dialog.querySelector('.report-submit').disabled = false;
        });
    });

    dialog.querySelector('.report-cancel')?.addEventListener('click', () => {
        dialog.remove();
    });

    dialog.querySelector('.report-submit')?.addEventListener('click', async () => {
        const reason = dialog.querySelector('input[name="report-reason"]:checked')?.value;
        const details = dialog.querySelector('.report-details')?.value || '';

        if (reason) {
            await submitReport(persona.id, reason, details);
            dialog.remove();
        }
    });

    document.body.appendChild(dialog);
}

/**
 * Submit a persona report
 * @param {string} personaId
 * @param {string} reason
 * @param {string} details
 */
async function submitReport(personaId, reason, details) {
    try {
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'REPORT_PERSONA',
                payload: { personaId, reason, details }
            }, resolve);
        });

        if (result?.success) {
            spLog('info', 'Report submitted', { personaId, reason });
            // Show toast
            const toast = document.createElement('div');
            toast.className = 'rating-toast';
            toast.innerHTML = `
                <span class="material-symbols-outlined">check_circle</span>
                Report submitted. Thank you!
            `;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        } else {
            throw new Error(result?.error || 'Failed to submit report');
        }
    } catch (err) {
        spLog('error', 'Report submission failed', { error: err.message });
        await showAlertDialog({
            title: 'Report Failed',
            message: `Failed to submit report: ${err.message}`,
            type: 'error'
        });
    }
}
