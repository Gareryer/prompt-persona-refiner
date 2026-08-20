/**
 * @fileoverview Extension Bridge for ISOLATED ↔ MAIN World Communication
 * 
 * This content script runs in the ISOLATED world (injected at document_start)
 * to provide a secure bridge between MAIN world scripts and Chrome extension APIs.
 * 
 * @description
 * Chrome's content script isolation means MAIN world scripts (injected into the
 * page's JavaScript context) cannot directly access extension APIs like:
 * - chrome.storage.local/sync/session
 * - chrome.runtime.sendMessage (receiving messages)
 * - chrome.runtime.id (for context validation)
 * 
 * This bridge solves that by:
 * 1. Listening for CustomEvents from MAIN world
 * 2. Performing the requested chrome.* operations
 * 3. Dispatching response CustomEvents back to MAIN world
 * 
 * Communication Protocol:
 * - pa-storage-request → pa-storage-response: Storage CRUD operations
 * - pa-api-proxy-request → pa-api-proxy-response: Cross-origin API calls
 * - pa-storage-changed: Broadcasts chrome.storage.onChanged events
 * - window.postMessage: Forwards background script messages to MAIN world
 * 
 * @module bridge/extension-bridge
 * @requires chrome.storage - For localStorage, syncStorage, sessionStorage access
 * @requires chrome.runtime - For message passing and context validation
 * 
 * @example
 * // From MAIN world - request storage get
 * window.dispatchEvent(new CustomEvent('pa-storage-request', {
 *     detail: { action: 'get', key: 'myKey', requestId: 'req_123' }
 * }));
 * 
 * // Listen for response
 * window.addEventListener('pa-storage-response', (e) => {
 *     if (e.detail.requestId === 'req_123') {
 *         console.log('Got data:', e.detail.data);
 *     }
 * });
 */

// Log bridge initialization for debugging extension lifecycle
console.log('[ExtBridge] 🌉 Initializing extension bridge (ISOLATED world)...');

// ============================================================================
// SECTION 1: Storage Bridge
// ============================================================================
// Handles storage operations requested by MAIN world scripts.
// Supports: get, set, remove operations on local/sync/session storage areas.
// ============================================================================

/**
 * Storage Request Event Handler
 * 
 * Listens for 'pa-storage-request' CustomEvents from MAIN world and performs
 * the requested chrome.storage operation, then dispatches the result back.
 * 
 * @listens CustomEvent#pa-storage-request
 * @fires CustomEvent#pa-storage-response
 * 
 * @param {CustomEvent} event - The storage request event
 * @param {Object} event.detail - Request payload
 * @param {string} event.detail.action - Operation type: 'get', 'set', or 'remove'
 * @param {string} [event.detail.key] - Single storage key (for get/set/remove)
 * @param {string[]} [event.detail.keys] - Multiple keys (for batch get)
 * @param {*} [event.detail.data] - Data to store (for set operation)
 * @param {string} event.detail.requestId - Unique ID to correlate request/response
 * @param {string} [event.detail.area='local'] - Storage area: 'local', 'sync', or 'session'
 */
// Allowed storage keys accessible from web page context via bridge
const ALLOWED_STORAGE_KEY_PATTERNS = [
    /^pa_ratings_/,
    /^session_/,
    /^persona_/,
    /^persona_drafts$/,
    /^globalPersona$/,
    /^selectedTemplate$/,
    /^contextVariables$/,
    /^themeMode$/,
    /^_bgLogs$/,
    /^pa_models$/,
    /^pa_active_model$/
];

function isKeyAllowed(k) {
    if (!k || typeof k !== 'string') return false;
    // Sensitive raw API keys must never be queried directly
    if (k === 'geminiApiKey' || k === 'openaiApiKey' || k === 'anthropicApiKey') return false;
    return ALLOWED_STORAGE_KEY_PATTERNS.some(pattern => pattern.test(k));
}

// Permitted API proxy domains
const ALLOWED_PROXY_DOMAINS = [
    'generativelanguage.googleapis.com',
    'api.openai.com',
    'api.anthropic.com',
    'openrouter.ai'
];

function isProxyUrlAllowed(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
        const parsed = new URL(rawUrl);
        return parsed.protocol === 'https:' && ALLOWED_PROXY_DOMAINS.includes(parsed.hostname);
    } catch {
        return false;
    }
}

window.addEventListener('pa-storage-request', async (event) => {
    // Destructure request payload with default storage area
    const { action, key, keys, data, requestId, area = 'local' } = event.detail || {};

    // === EXTENSION CONTEXT VALIDATION ===
    if (!chrome.runtime?.id) {
        console.warn('[ExtBridge] Extension context invalidated - page refresh required');
        window.dispatchEvent(new CustomEvent('pa-storage-response', {
            detail: {
                success: false,
                requestId,
                error: 'Extension reloaded - please refresh the page'
            }
        }));
        return;
    }

    // === SECURITY: STORAGE KEY ALLOWLIST VALIDATION ===
    const requestedKeys = keys || (key ? [key] : []);
    const unauthorizedKeys = requestedKeys.filter(k => !isKeyAllowed(k));
    if (unauthorizedKeys.length > 0) {
        console.warn('[ExtBridge] Blocked unauthorized storage access for keys:', unauthorizedKeys);
        window.dispatchEvent(new CustomEvent('pa-storage-response', {
            detail: {
                success: false,
                requestId,
                error: `Access to storage key(s) '${unauthorizedKeys.join(', ')}' not permitted by security policy`
            }
        }));
        return;
    }

    // Log the incoming request for debugging
    console.log(`[ExtBridge] Storage ${action?.toUpperCase()} request`, {
        area,
        key: key || keys?.join(','),
        hasData: data !== undefined
    });

    // Initialize response object with failure state (updated on success)
    let response = { success: false, requestId };

    // === STORAGE AREA VALIDATION ===
    const storageArea = chrome.storage[area];
    if (!storageArea) {
        console.error(`[ExtBridge] Invalid storage area: ${area}`);
        window.dispatchEvent(new CustomEvent('pa-storage-response', {
            detail: { success: false, requestId, error: `Invalid storage area: ${area}` }
        }));
        return;
    }

    try {
        switch (action) {
            case 'get':
                const getKeys = keys || (key ? [key] : []);
                const getResult = await storageArea.get(getKeys);
                const finalData = keys ? getResult : (getResult[key] ?? null);

                response = {
                    success: true,
                    requestId,
                    data: finalData
                };
                break;

            case 'set':
                await storageArea.set({ [key]: data });
                response = { success: true, requestId };
                break;

            case 'remove':
                await storageArea.remove(key);
                response = { success: true, requestId };
                break;

            default:
                response = { success: false, requestId, error: `Unknown action: ${action}` };
        }
    } catch (error) {
        const isContextError = error.message?.includes('Extension context invalidated') ||
            error.message?.includes('not allowed from this context');

        if (!isContextError) {
            console.error(`[ExtBridge] Storage ${action} error (${area}):`, error.message);
        }

        response = { success: false, requestId, error: error.message };
    }

    window.dispatchEvent(new CustomEvent('pa-storage-response', { detail: response }));
});

// ============================================================================
// SECTION 2: API Proxy Bridge (MAIN world → Background script)
// ============================================================================

window.addEventListener('pa-api-proxy-request', async (event) => {
    const { url, options, requestId } = event.detail || {};

    // === EXTENSION CONTEXT VALIDATION ===
    if (!chrome.runtime?.id) {
        console.warn('[ExtBridge] Extension context invalidated - page refresh required');
        window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
            detail: { success: false, requestId, error: 'Extension reloaded - please refresh the page' }
        }));
        return;
    }

    // === SECURITY: PROXY DESTINATION DOMAIN VALIDATION ===
    if (!isProxyUrlAllowed(url)) {
        console.warn('[ExtBridge] Blocked proxy request to non-allowlisted URL:', url);
        window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
            detail: {
                success: false,
                requestId,
                error: 'Destination URL is not in the allowed API proxy list'
            }
        }));
        return;
    }

    try {
        const result = await chrome.runtime.sendMessage({
            type: 'API_PROXY_REQUEST',
            url,
            options
        });

        if (!result) {
            window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
                detail: { success: false, requestId, error: 'API proxy received null response from background' }
            }));
            return;
        }

        if (result.error) {
            window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
                detail: { success: false, requestId, error: result.error }
            }));
        } else {
            window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
                detail: { success: true, requestId, data: result }
            }));
        }
    } catch (error) {
        const isContextError = error.message?.includes('Extension context invalidated') ||
            error.message?.includes('not allowed from this context');

        if (!isContextError) {
            console.error('[ExtBridge] API proxy failed:', error.message);
        }

        window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
            detail: { success: false, requestId, error: error.message }
        }));
    }
});

// ============================================================================
// SECTION 3: Message Bridge (Background script → MAIN world)
// ============================================================================
// Forwards messages from the background script to MAIN world scripts.
// This enables background-to-content communication for memory rebuilds,
// config changes, and other cross-context coordination.
// ============================================================================

// Only set up message listener if extension context is valid
if (chrome.runtime?.id) {
    /**
     * Background Message Forwarder
     * 
     * Listens for specific message types from the background script and
     * forwards them to MAIN world via window.postMessage. Also handles
     * async responses from MAIN world back to the background script.
     * 
     * Forwarded Message Types:
     * - REBUILD_MEMORY_REQUEST: Triggers memory analysis in content script
     * - REFRESH_RECENT_FOCUS: Updates the recent focus component
     * - LLM_CONFIG_SAVED: Notifies of model configuration changes
     * 
     * @listens chrome.runtime.onMessage
     */
    // Pending request registry for MAIN-world request/response correlation
    const pendingBridgeRequests = new Map();

    // Single static response listener for all MAIN-world bridge responses
    window.addEventListener('message', (event) => {
        if (event.source !== window) return;
        if (event.data?.source === 'ext-bridge-response' && event.data?.requestId) {
            const pending = pendingBridgeRequests.get(event.data.requestId);
            if (pending) {
                clearTimeout(pending.timeoutId);
                pendingBridgeRequests.delete(event.data.requestId);
                try {
                    pending.sendResponse(event.data.result);
                } catch (e) {
                    console.warn('[ExtBridge] Failed to send response back to background:', e);
                }
            }
        }
    });

    /**
     * Chrome Runtime Message Listener (ISOLATED -> MAIN Tunnel)
     * Forwards background messages to MAIN world scripts.
     */
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!chrome.runtime?.id) {
            console.warn('[ExtBridge] Context invalidated during message handling');
            return;
        }

        const REQUEST_RESPONSE_TYPES = ['REBUILD_MEMORY_REQUEST'];
        const FIRE_AND_FORGET_TYPES = ['REFRESH_RECENT_FOCUS', 'LLM_CONFIG_SAVED'];

        // Fire-and-forget broadcasts
        if (FIRE_AND_FORGET_TYPES.includes(msg.type)) {
            window.postMessage({
                source: 'ext-bridge',
                type: msg.type,
                payload: msg
            }, '*');
            return false; // Close port immediately
        }

        // Request/Response operations
        if (REQUEST_RESPONSE_TYPES.includes(msg.type)) {
            const requestId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            const timeoutId = setTimeout(() => {
                if (pendingBridgeRequests.has(requestId)) {
                    pendingBridgeRequests.delete(requestId);
                    console.log(`[ExtBridge] ⏰ Response timeout for ${msg.type} (id: ${requestId})`);
                }
            }, 60000);

            pendingBridgeRequests.set(requestId, { sendResponse, timeoutId });

            window.postMessage({
                source: 'ext-bridge',
                type: msg.type,
                payload: msg,
                requestId
            }, '*');

            return true; // Keep channel open for async response
        }
    });

    // ============================================================================
    // SECTION 4: Storage Change Notifications
    // ============================================================================
    // Forwards chrome.storage.onChanged events to MAIN world so scripts can
    // react to storage updates made by other contexts (options page, background).
    // ============================================================================

    /**
     * Storage Change Event Forwarder
     * 
     * Listens for changes to chrome.storage and broadcasts them to MAIN world
     * via the 'pa-storage-changed' CustomEvent. This enables cache invalidation
     * and reactive updates in MAIN world scripts.
     * 
     * @listens chrome.storage.onChanged
     * @fires CustomEvent#pa-storage-changed
     * 
     * @param {Object} changes - Object with changed keys and their old/new values
     * @param {string} areaName - The storage area that changed ('local', 'sync', 'session')
     */
    chrome.storage.onChanged.addListener((changes, areaName) => {
        // Currently only forward local storage changes
        // Add 'sync' or 'session' here if needed in the future
        if (areaName === 'local') {
            console.log('[ExtBridge] 📢 Broadcasting storage change:', Object.keys(changes));
            window.dispatchEvent(new CustomEvent('pa-storage-changed', {
                detail: { changes, areaName }
            }));
        }
    });

    // Log successful bridge initialization
    console.log('[ExtBridge] Extension bridge ready and listening');
}
