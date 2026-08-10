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
window.addEventListener('pa-storage-request', async (event) => {
    // Destructure request payload with default storage area
    const { action, key, keys, data, requestId, area = 'local' } = event.detail;

    // === EXTENSION CONTEXT VALIDATION ===
    // After extension reload/update, the context becomes invalid.
    // chrome.runtime.id will be undefined in this case.
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

    // Log the incoming request for debugging
    console.log(`[ExtBridge] Storage ${action.toUpperCase()} request`, {
        area,
        key: key || keys?.join(','),
        hasData: data !== undefined
    });

    // Initialize response object with failure state (updated on success)
    let response = { success: false, requestId };

    // === STORAGE AREA VALIDATION ===
    // Ensure the requested storage area exists (local, sync, or session)
    const storageArea = chrome.storage[area];
    if (!storageArea) {
        console.error(`[ExtBridge] Invalid storage area: ${area}`);
        window.dispatchEvent(new CustomEvent('pa-storage-response', {
            detail: { success: false, requestId, error: `Invalid storage area: ${area}` }
        }));
        return;
    }

    try {
        // === HANDLE STORAGE OPERATIONS ===
        switch (action) {
            case 'get':
                // Build keys array - supports both single key and batch get
                const getKeys = keys || (key ? [key] : []);

                // Perform the storage get operation
                const getResult = await storageArea.get(getKeys);

                // Diagnostic logging for debugging storage issues
                console.log(`[ExtBridge] Storage GET result for "${key || keys?.join(',')}"`, {
                    foundKeys: Object.keys(getResult || {}),
                    keyExists: key ? (key in getResult) : 'batch mode',
                    valueType: key ? (typeof getResult[key]) : 'object'
                });

                // Format response data:
                // - Batch get (keys array): return full result object
                // - Single get (key string): return just that key's value or null
                const finalData = keys ? getResult : (getResult[key] ?? null);

                response = {
                    success: true,
                    requestId,
                    data: finalData
                };
                break;

            case 'set':
                // Store the data under the specified key
                await storageArea.set({ [key]: data });
                console.log(`[ExtBridge] Storage SET complete for "${key}"`);
                response = { success: true, requestId };
                break;

            case 'remove':
                // Delete the specified key from storage
                await storageArea.remove(key);
                console.log(`[ExtBridge] Storage REMOVE complete for "${key}"`);
                response = { success: true, requestId };
                break;

            default:
                // Unknown action - return error
                console.warn(`[ExtBridge] Unknown storage action: ${action}`);
                response = { success: false, requestId, error: `Unknown action: ${action}` };
        }
    } catch (error) {
        // === ERROR HANDLING ===
        // Silently ignore extension context invalidation errors (expected on reload)
        // Log other errors for debugging
        const isContextError = error.message?.includes('Extension context invalidated') ||
            error.message?.includes('not allowed from this context');

        if (!isContextError) {
            console.error(`[ExtBridge] Storage ${action} error (${area}):`, error.message);
        }

        response = { success: false, requestId, error: error.message };
    }

    // Dispatch response event back to MAIN world
    window.dispatchEvent(new CustomEvent('pa-storage-response', { detail: response }));
});

// ============================================================================
// SECTION 2: API Proxy Bridge (MAIN world → Background script)
// ============================================================================
// MAIN world scripts cannot make cross-origin fetch requests due to CORS.
// This bridge forwards API requests to the background script which has
// host permissions for the LLM API domains.
// ============================================================================

/**
 * API Proxy Request Event Handler
 * 
 * Forwards cross-origin API requests from MAIN world to the background script,
 * which has the necessary host permissions to make the actual fetch call.
 * 
 * @listens CustomEvent#pa-api-proxy-request
 * @fires CustomEvent#pa-api-proxy-response
 * 
 * @param {CustomEvent} event - The API proxy request event
 * @param {Object} event.detail - Request payload
 * @param {string} event.detail.url - The API endpoint URL
 * @param {Object} event.detail.options - Fetch options (method, headers, body)
 * @param {string} event.detail.requestId - Unique ID to correlate request/response
 */
window.addEventListener('pa-api-proxy-request', async (event) => {
    const { url, options, requestId } = event.detail;

    // === EXTENSION CONTEXT VALIDATION ===
    if (!chrome.runtime?.id) {
        console.warn('[ExtBridge] Extension context invalidated - page refresh required');
        window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
            detail: { success: false, requestId, error: 'Extension reloaded - please refresh the page' }
        }));
        return;
    }

    // Log the proxy request (truncate URL for readability)
    const urlPreview = url.length > 60 ? url.substring(0, 60) + '...' : url;
    console.log(`[ExtBridge] API proxy request: ${urlPreview}`);

    try {
        // Forward request to background script via chrome.runtime.sendMessage
        // Background script handles the actual fetch with cross-origin permissions
        const result = await chrome.runtime.sendMessage({
            type: 'API_PROXY_REQUEST',
            url,
            options
        });

        // Check if background script returned an error
        if (result.error) {
            console.error('[ExtBridge] API proxy error from background:', result.error);
            window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
                detail: { success: false, requestId, error: result.error }
            }));
        } else {
            console.log(`[ExtBridge] API proxy success: HTTP ${result.status}`);
            window.dispatchEvent(new CustomEvent('pa-api-proxy-response', {
                detail: { success: true, requestId, data: result }
            }));
        }
    } catch (error) {
        // === ERROR HANDLING ===
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
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        // Double-check context validity (may have changed since listener setup)
        if (!chrome.runtime?.id) {
            console.warn('[ExtBridge] Context invalidated during message handling');
            return;
        }

        // Define which message types should be forwarded to MAIN world
        const forwardableTypes = [
            'REBUILD_MEMORY_REQUEST',   // Trigger full memory analysis
            'REFRESH_RECENT_FOCUS',     // Update recent focus only
            'LLM_CONFIG_SAVED'          // Model configuration changed
        ];

        // Only process forwardable messages
        if (forwardableTypes.includes(msg.type)) {
            // Generate unique request ID for request/response correlation
            const requestId = `bridge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log(`[ExtBridge] Forwarding ${msg.type} to MAIN world (id: ${requestId})`);

            // Post message to MAIN world using window.postMessage
            // MAIN world scripts listen for messages with source: 'ext-bridge'
            window.postMessage({
                source: 'ext-bridge',
                type: msg.type,
                payload: msg,
                requestId: requestId
            }, '*');

            // === ASYNC RESPONSE HANDLING ===
            // Set up listener for response from MAIN world
            const responseHandler = (event) => {
                // Verify response is from our bridge and matches our request
                if (event.data?.source === 'ext-bridge-response' &&
                    event.data?.requestId === requestId) {
                    // Clean up listener after receiving response
                    window.removeEventListener('message', responseHandler);
                    // Forward response back to background script
                    sendResponse(event.data.result);
                }
            };
            window.addEventListener('message', responseHandler);

            // === TIMEOUT CLEANUP ===
            // Remove listener after 60 seconds to prevent memory leaks
            // (LLM analysis operations can take significant time)
            setTimeout(() => {
                window.removeEventListener('message', responseHandler);
                console.log(`[ExtBridge] ⏰ Response timeout for ${msg.type} (id: ${requestId})`);
            }, 60000);

            // Return true to indicate async response will be sent
            return true;
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
