/**
 * @fileoverview Background Service Worker for Prompt Assistant Chrome Extension
 * 
 * This service worker handles:
 * - Message routing between content scripts, sidepanel, and options page
 * - API proxy requests for cross-origin LLM calls (Gemini, OpenAI, OpenRouter, Anthropic)
 * - Sidepanel and split-view state management
 * - Prompt refinement orchestration
 * - Memory rebuild coordination
 * 
 * @module background
 * @requires chrome.runtime
 * @requires chrome.storage
 * @requires chrome.sidePanel
 * @requires chrome.tabs
 * 
 * Message Types Handled:
 * - CHECK_API_KEY: Validate API key configuration
 * - TOGGLE_SIDEPANEL: Open/close sidepanel
 * - TOGGLE_SPLIT_VIEW: Switch between sidepanel and iframe modes
 * - REFINE_PROMPT: Process prompt refinement via LLM
 * - STOP_REFINEMENT: Abort ongoing refinement
 * - API_PROXY_REQUEST: Proxy cross-origin API requests
 * - REBUILD_MEMORY: Trigger memory analysis in content script
 * - LLM_CONFIG_SAVED: Broadcast model configuration changes
 */

/**
 * Structured logger for background script with session storage persistence
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional data to log
 */
const bgLog = (level, msg, data = {}) => {
  const entry = { timestamp: Date.now(), level, message: msg, component: 'Background', ...data };
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
    `[${new Date().toISOString().slice(11, 23)}] [${level.toUpperCase()}] [Background] ${msg}`,
    Object.keys(data).length > 0 ? data : ''
  );
  // Store in session for cross-context access (with safety check)
  if (chrome?.storage?.session) {
    chrome.storage.session.get('_bgLogs', (result) => {
      // Safety check: result can be undefined during SW startup
      if (!result) return;
      const logs = result._bgLogs || [];
      logs.push(entry);
      if (logs.length > 500) logs.shift(); // Ring buffer
      chrome.storage.session.set({ _bgLogs: logs });
    });
  }
};

bgLog('info', 'Background service worker starting...');

// ============================================================================
// First-Run & API Key Onboarding
// ============================================================================

// Open options page on first install if no API key configured
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    bgLog('info', 'Extension installed - checking for API key');
    const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
    if (!geminiApiKey) {
      bgLog('info', 'No API key found - opening options page');
      chrome.runtime.openOptionsPage();
    }
  }
});

// Handle API key validation requests from content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHECK_API_KEY') {
    (async () => {
      try {
        // Check both legacy and new Model Manager storage formats
        const result = await chrome.storage.local.get(['geminiApiKey', 'pa_models', 'pa_active_model']);

        // Legacy format check
        if (result.geminiApiKey && result.geminiApiKey.length > 10) {
          sendResponse({ hasKey: true, canOpenOptions: true });
          return;
        }

        // New Model Manager format - check for any enabled model with API key
        if (result.pa_models) {
          const models = result.pa_models;
          const hasEnabledModelWithKey = Object.values(models).some(
            model => model.enabled && model.apiKey && model.apiKey.length > 10
          );

          if (hasEnabledModelWithKey) {
            sendResponse({ hasKey: true, canOpenOptions: true });
            return;
          }
        }

        sendResponse({ hasKey: false, canOpenOptions: true });
      } catch (error) {
        sendResponse({ hasKey: false, error: error.message });
      }
    })();
    return true; // Keep channel open for async response
  }

  // Open options page from content script
  if (msg.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage();
    return false;
  }
});

// ============================================================================
// Recent Focus Auto-Refresh Configuration
// ============================================================================
const RECENT_FOCUS_REFRESH_INTERVAL = 5; // Auto-refresh Recent Focus every N refinements
let refinementCounter = 0; // Tracks refinements since last Recent Focus refresh

// ============================================================================
// Refinement Abort Controller - Track ongoing requests for cancellation
// ============================================================================
const activeRefinements = new Map(); // tabId -> AbortController
const activeExtractions = new Map(); // 'persona' -> AbortController (for persona extraction)

// Decryption utility for reading encrypted API key
async function getEncryptionKey() {
  const extensionId = chrome.runtime.id;
  const salt = new TextEncoder().encode('prompt-assistant-api-key-salt-v1');
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(extensionId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function decryptApiKey(encryptedData) {
  try {
    const key = await getEncryptionKey();
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

function isEncrypted(value) {
  return value && /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 50;
}

// ============================================================================
// API Proxy - Handle cross-origin requests from content scripts
// ============================================================================

/**
 * Handle API proxy requests from extension-bridge (content script)
 * Background script has cross-origin permissions via host_permissions in manifest
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'API_PROXY_REQUEST') {
    bgLog('info', 'API Proxy: Received request', { url: msg.url?.substring(0, 50) });

    (async () => {
      try {
        const response = await fetch(msg.url, msg.options);

        // Read response body
        const contentType = response.headers.get('content-type') || '';
        let data;

        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        bgLog('info', 'API Proxy: Success', {
          status: response.status,
          ok: response.ok
        });

        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: data
        });
      } catch (error) {
        bgLog('error', 'API Proxy: Failed', { error: error.message });
        sendResponse({
          ok: false,
          error: error.message
        });
      }
    })();

    return true; // Keep channel open for async response
  }

  /**
   * DOWNLOAD_FILE - Download a file with proper filename
   * Uses onDeterminingFilename to force the correct filename
   */
  if (msg.type === 'DOWNLOAD_FILE') {
    console.log('[Background] Received DOWNLOAD_FILE', msg.payload);

    try {
      const { jsonData, filename } = msg.payload;

      if (!jsonData || !filename) {
        console.error('[Background] Missing jsonData or filename');
        sendResponse({ success: false, error: 'Missing jsonData or filename' });
        return true;
      }

      console.log('[Background] Setting up onDeterminingFilename for', { filename });

      // Set up one-time listener to force filename
      const filenameListener = (downloadItem, suggest) => {
        console.log('[Background] onDeterminingFilename triggered', { id: downloadItem.id, filename });
        chrome.downloads.onDeterminingFilename.removeListener(filenameListener);
        suggest({ filename: filename });
        return true; // Signal that we will call suggest
      };
      chrome.downloads.onDeterminingFilename.addListener(filenameListener);

      // Create data URL (Service Workers don't have URL.createObjectURL)
      const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
      const dataUrl = `data:application/json;base64,${base64Data}`;

      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true,
        conflictAction: 'uniquify'
      }, (downloadId) => {

        if (chrome.runtime.lastError) {
          chrome.downloads.onDeterminingFilename.removeListener(filenameListener);
          console.error('[Background] Download failed', chrome.runtime.lastError);
          bgLog('error', 'Download failed', { error: chrome.runtime.lastError.message });
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('[Background] Download started', { downloadId, filename });
          bgLog('info', 'Download started', { downloadId, filename });
          sendResponse({ success: true, downloadId });
        }
      });
    } catch (error) {
      console.error('[Background] DOWNLOAD_FILE exception', error);
      bgLog('error', 'DOWNLOAD_FILE exception', { error: error.message });
      sendResponse({ success: false, error: error.message });
    }
    return true; // Keep channel open for async response
  }


});

// Open sidepanel when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('gemini.google.com')) {
    await chrome.sidePanel.open({ tabId: tab.id });
  } else {
    chrome.runtime.openOptionsPage();
  }
});

// ===========================================================================
// Tab-specific Sidepanel Behavior
// ===========================================================================

/**
 * Check if URL is a Gemini page
 */
function isGeminiUrl(url) {
  return url?.includes('gemini.google.com');
}

/**
 * Update sidepanel availability for a tab based on its URL
 */
async function updateSidepanelForTab(tabId, url) {
  try {
    if (isGeminiUrl(url)) {
      // Enable sidepanel on Gemini tabs
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/index.html',
        enabled: true
      });
    } else {
      // Disable sidepanel on non-Gemini tabs
      await chrome.sidePanel.setOptions({
        tabId,
        enabled: false
      });
    }
  } catch (error) {
    console.error('[Sidepanel] Failed to update options for tab:', tabId, error);
  }
}

// When user switches tabs, update sidepanel availability
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    await updateSidepanelForTab(activeInfo.tabId, tab.url);
  } catch (error) {
    console.error('[Sidepanel] onActivated error:', error);
  }
});

// When tab URL changes, update sidepanel availability  
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    await updateSidepanelForTab(tabId, changeInfo.url);
  }
});

// Clean up session storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  const key = `persona_${tabId}`;
  if (chrome?.storage?.session) {
    chrome.storage.session.remove(key);
  }
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === 'trigger-refine') {
    if (tab?.id && tab.url?.includes('gemini.google.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_REFINE_SHORTCUT' });
    }
  }

  if (command === 'open-sidepanel') {
    if (tab?.id && tab.url?.includes('gemini.google.com')) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Track sidepanel state per tab (Chrome API doesn't provide this)
const sidepanelState = new Map();

// Handle messages from content scripts and sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }

  // Toggle sidepanel open/close from settings icon
  // B1 FIX: Now sends acknowledgment response
  if (message.type === 'TOGGLE_SIDEPANEL') {
    (async () => {
      const tabId = sender.tab?.id;
      if (!tabId) {
        sendResponse({ success: false, error: 'No tab ID' });
        return;
      }

      try {
        const isOpen = sidepanelState.get(tabId) || false;

        if (isOpen) {
          // Close: disable sidepanel to force close
          await chrome.sidePanel.setOptions({ tabId, enabled: false });
          // Re-enable for next open
          await chrome.sidePanel.setOptions({
            tabId,
            path: 'sidepanel/index.html',
            enabled: true
          });
          sidepanelState.set(tabId, false);
          console.log('[Background] Sidepanel closed for tab:', tabId);
          sendResponse({ success: true, isOpen: false });
        } else {
          // Open sidepanel
          await chrome.sidePanel.open({ tabId });
          sidepanelState.set(tabId, true);
          console.log('[Background] Sidepanel opened for tab:', tabId);
          sendResponse({ success: true, isOpen: true });
        }
      } catch (err) {
        console.error('[Background] Toggle error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // B1 FIX: Keep channel open for async response
  }

  // Toggle Split View Mode
  // B1 FIX: Now sends acknowledgment response
  if (message.type === 'TOGGLE_SPLIT_VIEW') {
    (async () => {
      try {
        // Sidepanel/iframe doesn't have sender.tab.id, so query active tab
        let tabId = sender.tab?.id;
        if (!tabId) {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = activeTab?.id;
        }

        console.log('[Background] TOGGLE_SPLIT_VIEW:', {
          tabId,
          fromIframe: message.fromIframe,
          senderUrl: sender.url
        });

        const isFromIframe = message.fromIframe;

        if (tabId) {
          if (isFromIframe) {
            // Disabling Split View (Close iframe, re-enable native panel)
            console.log('[Background] Closing split view...');

            // 1. Tell content script to remove iframe
            chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SPLIT_VIEW' });

            // 2. Re-enable sidepanel for future use
            await chrome.sidePanel.setOptions({
              tabId,
              path: 'sidepanel/index.html',
              enabled: true
            });

            // NOTE: Chrome's sidePanel.open() can ONLY be called from user gesture context
            // (e.g., chrome.action.onClicked). Message handlers don't preserve gesture context.
            // User must click the settings icon to reopen the sidepanel.
            sidepanelState.set(tabId, false);
            console.log('[Background] Split view closed. Click settings icon to open sidepanel.');
            sendResponse({ success: true, splitViewActive: false });
          } else {
            // Enabling Split View (Open iframe, sidepanel will close itself via window.close())
            console.log('[Background] Opening split view, sidepanel will close itself...');

            // Sidepanel closes itself with window.close() after sending this message
            // Just wait a bit for it to fully close, then inject iframe
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SPLIT_VIEW' });
            }, 300);
            sendResponse({ success: true, splitViewActive: true });
          }
        } else {
          console.error('[Background] No tabId found for TOGGLE_SPLIT_VIEW');
          sendResponse({ success: false, error: 'No tab ID found' });
        }
      } catch (error) {
        console.error('[Background] TOGGLE_SPLIT_VIEW error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true; // B1 FIX: Keep channel open for async response
  }

  if (message.type === 'REFINE_PROMPT') {
    handleRefinement(message.payload, sender.tab?.id).then(sendResponse);
    return true;
  }

  // Stop/Abort an ongoing refinement request
  if (message.type === 'STOP_REFINEMENT') {
    const tabId = sender.tab?.id;
    if (tabId && activeRefinements.has(tabId)) {
      activeRefinements.get(tabId).abort();
      activeRefinements.delete(tabId);
      bgLog('info', 'Refinement aborted by user', { tabId });
      sendResponse({ success: true, aborted: true });
    } else {
      sendResponse({ success: true, aborted: false, reason: 'No active refinement' });
    }
    return true;
  }

  // Stop/Abort an ongoing persona extraction request
  if (message.type === 'STOP_EXTRACTION') {
    if (activeExtractions.has('persona')) {
      activeExtractions.get('persona').abort();
      activeExtractions.delete('persona');
      bgLog('info', 'Persona extraction aborted by user');
      sendResponse({ success: true, aborted: true });
    } else {
      sendResponse({ success: true, aborted: false, reason: 'No active extraction' });
    }
    return true;
  }

  // Sidepanel message handlers
  if (message.type === 'GET_SESSION_ID') {
    getCurrentTabSessionId().then(sendResponse);
    return true;
  }

  if (message.type === 'GET_MEMORY') {
    getSessionMemory(message.sessionId).then(sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_COMPONENT') {
    updateMemoryComponent(message.sessionId, message.componentId, message.data).then(sendResponse);
    return true;
  }

  if (message.type === 'TOGGLE_FACT') {
    toggleFact(message.sessionId, message.factPath, message.enabled).then(sendResponse);
    return true;
  }

  if (message.type === 'REBUILD_MEMORY') {
    rebuildSessionMemory(message.sessionId, {
      enabledAnalyzers: message.enabledAnalyzers
    }).then(sendResponse);
    return true;
  }

  if (message.type === 'PIN_PERSONA') {
    pinPersona(message.sessionId).then(sendResponse);
    return true;
  }

  if (message.type === 'UNPIN_PERSONA') {
    unpinPersona(message.sessionId).then(sendResponse);
    return true;
  }

  // === GENERIC COMPONENT PIN/UNPIN ===
  // Used for pinning any section (context, tone, constraints, etc.)
  if (message.type === 'PIN_COMPONENT') {
    pinComponent(message.sessionId, message.componentId).then(sendResponse);
    return true;
  }

  if (message.type === 'UNPIN_COMPONENT') {
    unpinComponent(message.sessionId, message.componentId).then(sendResponse);
    return true;
  }

  // Relay LLM_CONFIG_SAVED to Gemini tabs for SmartAutoRun detection
  // Only broadcast to tabs that don't already have memory (aggressive guard)
  if (message.type === 'LLM_CONFIG_SAVED') {
    console.log(`[Background] LLM_CONFIG_SAVED received from Model Manager`, {
      configured: message.configured,
      modelId: message.modelId
    });
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
        console.log(`[Background] LLM_CONFIG_SAVED: Found ${tabs.length} Gemini tabs to check`);
        let sentCount = 0;
        let skippedCount = 0;

        for (const tab of tabs) {
          if (!tab.id || !tab.url) continue;

          // Extract session ID from tab URL (format: /app/{sessionId})
          const urlMatch = tab.url.match(/\/app\/([a-zA-Z0-9]+)/);
          const sessionId = urlMatch ? urlMatch[1] : null;

          if (!sessionId) {
            // No session ID in URL (e.g., gemini.google.com/app) - skip
            skippedCount++;
            continue;
          }

          // Check if memory already exists for this session
          const sessionKey = `session_${sessionId}`;
          const stored = await chrome.storage.local.get([sessionKey]);

          if (stored[sessionKey]?.components && Object.keys(stored[sessionKey].components).length > 0) {
            // Memory already exists - skip this tab
            skippedCount++;
            continue;
          }

          // No memory - send the message
          chrome.tabs.sendMessage(tab.id, {
            type: 'LLM_CONFIG_SAVED',
            configured: message.configured,
            modelId: message.modelId
          }).catch(err => {
            console.log(`[Background] Could not send to tab ${tab.id}:`, err.message);
          });
          sentCount++;
        }

        console.log(`[Background] LLM_CONFIG_SAVED: sent to ${sentCount} tabs, skipped ${skippedCount} (already have memory)`);
      } catch (error) {
        console.error('[Background] LLM_CONFIG_SAVED broadcast error:', error);
      }
    })();
    return false; // No response needed
  }

  // API Proxy Handler - Forward fetch requests from MAIN world content scripts
  // MAIN world cannot make cross-origin requests, so we proxy through background
  if (message.type === 'API_PROXY_REQUEST') {
    (async () => {
      try {
        bgLog('debug', 'API Proxy: Processing request', {
          url: message.url?.substring(0, 50) + '...',
          method: message.options?.method || 'GET'
        });

        const response = await fetch(message.url, message.options);
        const contentType = response.headers.get('content-type') || '';

        let data;
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: data
        });
      } catch (error) {
        bgLog('error', 'API Proxy: Request failed', { error: error.message });
        sendResponse({
          ok: false,
          status: 0,
          error: error.message
        });
      }
    })();
    return true; // Keep channel open for async response
  }

  // ========================================================================
  // Persona Extractor Message Handlers
  // ========================================================================

  /**
   * GET_MODEL_CONFIG - Return current active model configuration
   * Used by PersonaExtractor to know which LLM to use for extraction
   */
  if (message.type === 'GET_MODEL_CONFIG') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
        const models = result.pa_models || {};
        const activeId = result.pa_active_model;

        // Find active model
        const activeModel = activeId ? models[activeId] : null;

        if (activeModel && activeModel.enabled) {
          // Decrypt API key if needed
          let apiKey = activeModel.apiKey;
          if (isEncrypted(apiKey)) {
            apiKey = await decryptApiKey(apiKey);
          }

          sendResponse({
            provider: activeModel.provider,
            model: activeModel.model,
            apiKey: apiKey,
            modelId: activeId
          });
        } else {
          // Try to find any enabled model
          const enabledModel = Object.entries(models).find(([id, m]) => m.enabled);
          if (enabledModel) {
            let apiKey = enabledModel[1].apiKey;
            if (isEncrypted(apiKey)) {
              apiKey = await decryptApiKey(apiKey);
            }
            sendResponse({
              provider: enabledModel[1].provider,
              model: enabledModel[1].model,
              apiKey: apiKey,
              modelId: enabledModel[0]
            });
          } else {
            sendResponse({ error: 'No model configured' });
          }
        }
      } catch (error) {
        bgLog('error', 'GET_MODEL_CONFIG failed', { error: error.message });
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  /**
   * EXTRACT_PERSONA - Use LLM to extract persona from external prompt
   * Called by PersonaExtractor.extractFromPrompt()
   */
  if (message.type === 'EXTRACT_PERSONA') {
    (async () => {
      const { prompt, modelConfig } = message.payload;
      bgLog('info', 'EXTRACT_PERSONA: Starting extraction', {
        provider: modelConfig?.provider,
        promptLength: prompt?.length
      });

      // Create AbortController for this extraction
      const abortController = new AbortController();

      // Cancel any existing extraction
      if (activeExtractions.has('persona')) {
        activeExtractions.get('persona').abort();
      }
      activeExtractions.set('persona', abortController);

      try {
        // Build the full extraction prompt using Structured Expert Prompting (SEP)
        // Based on MIT/Harvard research: 87% higher accuracy, eliminates persona ambiguity        // Build the full extraction prompt using Rigid-Flexible Mapping Strategy
        const extractionPrompt = `You are the "PERSONA ARCHITECT" - an expert Context-Aware Engineer specializing in Structured Expert Prompting (SEP).

## THE PERSONA DEPTH GAP (CRITICAL)
- Standard extraction "compresses" structured prompts, losing 80% of the value.
- Your mission is ZERO INFORMATION LOSS.
- You must Preservation VERBATIM the specific XML sections from the source prompt.

## XML MAPPING STRATEGY (RIGID-FLEXIBLE)
Start by scanning the input for XML tags (e.g., <role>, <context>, <constraints>).
If found, map them DIRECTLY and VERBATIM to the V4 Schema fields below.

| Source Tag (Regex Match) | Target V4 Dimension | Extraction Rule |
|-------------------------|---------------------|-----------------|
| <role>, <task>, <role_definition> | persona.instruction | VERBATIM / NO SUMMARIZATION |
| <context>, <expertise>, <knowledge> | context.instruction | VERBATIM |
| <tone>, <style>, <voice> | tone.instruction | VERBATIM |
| <constraints>, <task_criteria>, <rules>, <prohibitions> | constraints.instruction | VERBATIM (Critical!) |
| <example>, <output_format>, <response_format> | exemplar.instruction / format.instruction | VERBATIM |
| <response_guidelines>, <structure>, <methodology> | framework.instruction | VERBATIM |

## UNKNOWN TAG LOGIC (AUTO-DETECT)
If you find XML tags NOT listed above (e.g., <neuroplasticity_principles>):
1. Analyze its semantic meaning.
2. Place it VERBATIM into the most relevant dimension (likely framework.instruction or context.instruction).
3. Preserve the original tag name and content exactly.

## PROSE/MARKDOWN LOGIC (FALLBACK)
If NO XML tags are found:
1. Parse the text line-by-line for implicit sections (Headers like "# Goal", "**Constraints**").
2. Map these sections to the appropriate dimensions.
3. Extract content VERBATIM.

## V4 SCHEMA STRUCTURE
{
  "instruction": "REQUIRED - comprehensive expert-level text (NEVER empty or generic)",
  "version": 4,
  "source": "extraction",
  "metadata": { /* Structured fields for UI */ }
}

Given the user/system prompt, extract a Structured Expert Persona.
Return JSON with keys: "memory_layer" and "metadata"

## memory_layer (7-Dimension V4 Schema)

### 1. persona (Identity & Credentials)
SOURCE: <role>, <task>, <role_definition> (or implied role)
RULE: Output MUST be a FLOWING PARAGRAPH, NOT a structured list
{
  "instruction": "Write as a CONCRETE PARAGRAPH (not bullet points or labels): 'You are [Full Name], a [Title] with [X years] of experience in [domain]. You hold [specific credentials: PhD, CFA, PMP, etc.]. Your purpose is [specific mission]. Your methodology involves [specific approach].' Include ALL: name, title, years of experience, specific certifications, purpose, and methodology. NEVER use 'Role:', 'Purpose:', 'Credentials:' labels.",
  "version": 4,
  "source": "extraction"
}

### 2. context (Domain & Knowledge)
SOURCE: <context>, <expertise>, <knowledge>
RULE: MUST return domain + AT LEAST 2 scope_tags
{
  "instruction": "Complete domain knowledge: expertise area, terminology, knowledge boundaries, tools/technologies mentioned. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "domain": REQUIRED - One of: "Tech", "Creative", "Business", "Education", "Health", "Lifestyle", "Other",
    "scope_tags": REQUIRED MINIMUM 2 - Array of specific scope keywords (not generic, e.g., "Tax Policy 2026", "Chrome Extensions")
  }
}

### 3. tone (Voice & Style)
SOURCE: <tone>, <style>, <voice>
RULE: Auto-adopt style that MATCHES the output format requirements
{
  "instruction": "Voice characteristics, personality, banned phrases (VERBATIM), required phrases (VERBATIM). If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "style_tags": REQUIRED - Must align with output format (e.g., if JSON output → ["Technical", "Precise"]; if creative → ["Engaging", "Expressive"]),
    "banned_phrases": Array of VERBATIM phrases to avoid
  }
}

### 4. framework (Methodology & Workflow)  
SOURCE: <response_guidelines>, <structure>, <methodology> (or unknown tags)
RULE: Auto-adopt reasoning type matching task complexity
{
  "instruction": "ALL workflow steps (VERBATIM), methodology, operational modes, thinking patterns. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "reasoning_type": REQUIRED - Choose based on task: 
      - Data analysis → "Deductive" or "Step-by-Step"
      - Problem solving → "First-Principles" or "Tree-of-Thought"
      - Creative → "Analogical" or "Creative"
      - Complex multi-step → "Chain-of-Thought"
  }
}

### 5. constraints (Rules & Limits)
SOURCE: <constraints>, <task_criteria>, <rules>, <prohibitions>
RULE: NEVER GENERIC - Extract ALL rules VERBATIM or adopt top-tier for domain
{
  "instruction": "VERBATIM ONLY: Copy EXACT text of all NEVER/DON'T/MUST/ALWAYS rules. Include numeric limits, word counts, format requirements. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "prohibitions": Array of EXACT prohibition phrases from prompt (if none found, adopt 3+ domain-standard prohibitions),
    "requirements": Array of EXACT requirement phrases from prompt (if none found, adopt 3+ domain-standard requirements),
    "response_length": Extract VERBATIM if specified, otherwise adopt appropriate ("Concise", "500 words max", "Detailed")
  }
}

### 6. format (Output Structure)
SOURCE: <output_format>, <response_format>
RULE: Extract ALL output rules/guidelines VERBATIM
{
  "instruction": "VERBATIM: All output structure rules, header requirements, list formats, code block usage, special syntax patterns, wrapper tags. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "output_type": REQUIRED - One of: "Markdown", "Plaintext", "JSON", "Code", "HTML", "Structured", "Custom"
  }
}

### 7. exemplar (Examples)
SOURCE: <example>, <examples>
RULE: Extract ALL examples VERBATIM, or adopt top-tier examples for domain
{
  "instruction": "VERBATIM: All examples from prompt (good examples, bad examples, edge cases). If NO examples in prompt, generate 2+ TOP-TIER examples that perfectly align with detected domain and persona.",
  "version": 4,
  "source": "extraction"
}

## metadata
- suggested_name: 2-4 words, memorable
- use_case_keywords: Exactly 5 keywords
- primary_intent: One sentence
- target_audience: Who benefits
- complexity_level: "beginner" | "intermediate" | "advanced"
- domain: "tech" | "creative" | "business" | "education" | "health" | "lifestyle" | "other"
- tone: "formal" | "casual" | "friendly" | "professional" | "academic"
- source_type: "external_prompt"

## VALIDATION CHECKLIST (MANDATORY)
Before output, verify:
1. ✓ All XML tags from source are mapped to a dimension
2. ✓ constraints has ACTUAL rules (VERBATIM from <constraints>)
3. ✓ NO summarization of structured sections
4. ✓ All NEVER/MUST/ALWAYS phrases are VERBATIM
5. ✓ NO empty instruction fields

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks.

---
INPUT PROMPT TO ANALYZE:
${prompt}
---

JSON OUTPUT:`;


        // Call LLM with the full extraction prompt (pass abort signal)
        const result = await callLLMForExtraction(extractionPrompt, modelConfig, abortController.signal);

        // Clean up on success
        activeExtractions.delete('persona');
        sendResponse({ ...result, source_prompt: prompt });
      } catch (error) {
        bgLog('error', 'EXTRACT_PERSONA failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * IMPORT_PERSONA_MEMORY - Import a persona's memory layer into current session
   * Called when user imports a persona from Browse view
   */
  if (message.type === 'IMPORT_PERSONA_MEMORY') {
    (async () => {
      const { memoryLayer, personaId, personaName } = message.payload;
      bgLog('info', 'IMPORT_PERSONA_MEMORY: Importing', { hasPersonaId: !!personaId, personaName });

      try {
        // Get current session ID
        const sessionId = await getCurrentTabSessionId();
        if (!sessionId) {
          sendResponse({ success: false, error: 'No active Gemini session' });
          return;
        }

        // Store imported memory layer
        const storageKey = `session_${sessionId}`;
        const result = await chrome.storage.local.get(storageKey);
        const memory = result[storageKey] || { sessionId, components: {} };

        // Merge imported memory layer into session memory
        // Schema v3: 7-dimension industry standard (persona, context, exemplar, format, tone, framework, constraints)
        // Also supports legacy format for backwards compatibility

        const dimensionNames = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'];

        // Import new 7-dimension schema
        for (const dim of dimensionNames) {
          if (memoryLayer[dim]) {
            memory.components[dim] = {
              current: memoryLayer[dim],
              history: [],
              ...(dim === 'persona' ? {
                imported: true,
                importedAt: Date.now(),
                importedPersonaId: personaId,
                personaName: personaName || 'Imported Persona'
              } : {})
            };
          }
        }

        // Backwards compatibility: map old schema to new dimensions
        // Only if new schema fields are empty
        if (!memory.components.persona && memoryLayer.persona_synthesizer) {
          memory.components.persona = {
            current: {
              role: memoryLayer.persona_synthesizer.synthesizedPersona || '',
              purpose: memoryLayer.persona_synthesizer.primaryDomain || '',
              name: memoryLayer.persona_synthesizer.personaName || null,
              title: null,
              creator: null,
              credentials: null
            },
            history: [],
            imported: true,
            importedAt: Date.now(),
            importedPersonaId: personaId,
            personaName: personaName || 'Imported Persona',
            _legacyMigrated: true
          };
        }
        if (!memory.components.context && memoryLayer.topic_summarizer) {
          memory.components.context = {
            current: {
              domain: memoryLayer.topic_summarizer.primaryTopic || '',
              terminology: (memoryLayer.custom_context?.domainTerminology || []).map(t => ({ term: t, definition: '' })),
              knowledge_boundaries: null,
              environment: null
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.tone && memoryLayer.style_profiler) {
          memory.components.tone = {
            current: {
              voice: memoryLayer.style_profiler.tone || '',
              style: memoryLayer.style_profiler.directness === 'direct' ? 'direct' : 'professional',
              verbosity: { level: memoryLayer.style_profiler.verbosity || 'moderate', max_length: null },
              banned_phrases: [],
              required_phrases: [],
              anti_priorities: []
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.constraints && memoryLayer.custom_context) {
          memory.components.constraints = {
            current: {
              prohibitions: (memoryLayer.custom_context.constraints || []).map(c => ({ rule: c, severity: 'hard', context: null })),
              requirements: (memoryLayer.custom_context.requirements || []).map(r => ({ rule: r, context: null })),
              thresholds: Object.entries(memoryLayer.custom_context.numericalLimits || {}).map(([k, v]) => ({ metric: k, limit: String(v), action: '' })),
              safety_rules: []
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.exemplar && memoryLayer.custom_context?.examplesFromPrompt) {
          memory.components.exemplar = {
            current: {
              good_examples: memoryLayer.custom_context.examplesFromPrompt.map(e => ({ scenario: '', input: e, output: '', explanation: null })),
              bad_examples: [],
              edge_cases: (memoryLayer.custom_context.edgeCases || []).map(e => ({ situation: e, handling: '' }))
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.framework && memoryLayer.custom_context?.workflowSteps) {
          memory.components.framework = {
            current: {
              methodology: null,
              reasoning_pattern: null,
              modes: [],
              workflow: memoryLayer.custom_context.workflowSteps.map((s, i) => ({ step: i + 1, action: s, condition: null }))
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.format && memoryLayer.custom_context?.formatInstructions) {
          memory.components.format = {
            current: {
              output_type: 'markdown',
              structure: { use_headers: true, use_lists: true, use_code_blocks: true, use_tables: false },
              citations: null,
              special_syntax: memoryLayer.custom_context.formatInstructions,
              wrapper_tags: []
            },
            history: [],
            _legacyMigrated: true
          };
        }

        memory.lastUpdated = Date.now();
        memory.importedPersona = personaId || null;

        await chrome.storage.local.set({ [storageKey]: memory });
        bgLog('info', 'IMPORT_PERSONA_MEMORY: Success', { sessionId });
        sendResponse({ success: true });
      } catch (error) {
        bgLog('error', 'IMPORT_PERSONA_MEMORY failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * CHECK_RATING_ELIGIBILITY - Check if user should see rating prompt
   * Shows rating UI after 3+ prompt/response pairs with imported persona
   */
  if (message.type === 'CHECK_RATING_ELIGIBILITY') {
    (async () => {
      try {
        const sessionId = await getCurrentTabSessionId();
        if (!sessionId) {
          sendResponse({ eligible: false });
          return;
        }

        const storageKey = `session_${sessionId} `;
        const result = await chrome.storage.local.get(storageKey);
        const memory = result[storageKey];

        // Check if persona was imported
        if (!memory?.importedPersona) {
          sendResponse({ eligible: false });
          return;
        }

        // Check if already rated
        const ratingKey = `rating_${memory.importedPersona} `;
        const ratingResult = await chrome.storage.local.get(ratingKey);
        if (ratingResult[ratingKey]?.submitted) {
          sendResponse({ eligible: false, alreadyRated: true });
          return;
        }

        // Check exchange count (from topic_summarizer history as proxy)
        const exchangeCount = memory.components?.topic_summarizer?.history?.length || 0;
        const MIN_EXCHANGES = 3;

        if (exchangeCount >= MIN_EXCHANGES) {
          sendResponse({
            eligible: true,
            personaId: memory.importedPersona,
            exchangeCount
          });
        } else {
          sendResponse({
            eligible: false,
            personaId: memory.importedPersona,
            exchangeCount,
            remaining: MIN_EXCHANGES - exchangeCount
          });
        }
      } catch (error) {
        bgLog('error', 'CHECK_RATING_ELIGIBILITY failed', { error: error.message });
        sendResponse({ eligible: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * SUBMIT_RATING - Submit a rating for an imported persona
   */
  if (message.type === 'SUBMIT_RATING') {
    (async () => {
      const { personaId, rating } = message.payload;
      bgLog('info', 'SUBMIT_RATING', { personaId, rating });

      try {
        // Validate rating
        if (!personaId || rating < 1 || rating > 5) {
          sendResponse({ success: false, error: 'Invalid rating' });
          return;
        }

        // Store rating locally
        const ratingKey = `rating_${personaId} `;
        await chrome.storage.local.set({
          [ratingKey]: {
            personaId,
            rating,
            submittedAt: Date.now(),
            submitted: true
          }
        });

        // TODO: Submit to Supabase when connected
        // Try to submit to Supabase if available
        bgLog('info', 'Rating stored locally', { personaId, rating });

        sendResponse({ success: true });
      } catch (error) {
        bgLog('error', 'SUBMIT_RATING failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * SCAN_CONTENT - Pre-publish content moderation scan
   * Uses keyword matching to detect potentially problematic content
   */
  if (message.type === 'SCAN_CONTENT') {
    (async () => {
      const { content, personaName } = message.payload;
      bgLog('info', 'SCAN_CONTENT: Starting scan', { personaName });

      try {
        // Moderation word lists
        const severeTerms = [
          'kill', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon',
          'child abuse', 'sexual', 'explicit', 'nude', 'porn',
          'racist', 'nazi', 'hate crime', 'assault'
        ];

        const warningTerms = [
          'hack', 'crack', 'pirate', 'illegal', 'drug', 'addict',
          'violence', 'fight', 'attack', 'hate', 'abuse',
          'password', 'steal', 'scam', 'fraud'
        ];

        const contentLower = content.toLowerCase();

        // Check for severe terms (block)
        const severeFound = severeTerms.filter(term =>
          contentLower.includes(term.toLowerCase())
        );

        if (severeFound.length > 0) {
          sendResponse({
            passed: false,
            severity: 'blocked',
            message: 'Content contains prohibited terms and cannot be published.',
            flaggedTerms: severeFound
          });
          return;
        }

        // Check for warning terms (allow with review)
        const warningFound = warningTerms.filter(term =>
          contentLower.includes(term.toLowerCase())
        );

        if (warningFound.length > 0) {
          sendResponse({
            passed: true,
            severity: 'warning',
            message: 'Content may need review. Proceed with caution.',
            flaggedTerms: warningFound
          });
          return;
        }

        // All clear
        sendResponse({
          passed: true,
          severity: 'clean',
          message: 'Content passed moderation checks.'
        });

      } catch (error) {
        bgLog('error', 'SCAN_CONTENT failed', { error: error.message });
        sendResponse({ passed: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * REPORT_PERSONA - Submit a report for a persona
   */
  if (message.type === 'REPORT_PERSONA') {
    (async () => {
      const { personaId, reason, details } = message.payload;
      bgLog('info', 'REPORT_PERSONA', { personaId, reason });

      try {
        // Store report locally
        const reportKey = `report_${personaId}_${Date.now()} `;
        await chrome.storage.local.set({
          [reportKey]: {
            personaId,
            reason,
            details,
            reportedAt: Date.now(),
            status: 'pending'
          }
        });

        // Also add to reports list
        const result = await chrome.storage.local.get('persona_reports');
        const reports = result.persona_reports || [];
        reports.push({
          id: reportKey,
          personaId,
          reason,
          details,
          reportedAt: Date.now()
        });
        await chrome.storage.local.set({ persona_reports: reports });

        bgLog('info', 'Report submitted', { personaId });
        sendResponse({ success: true });

      } catch (error) {
        bgLog('error', 'REPORT_PERSONA failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// ============================================================================
// Sidepanel Helper Functions
// ============================================================================

/**
 * Get session ID from current active tab
 */
async function getCurrentTabSessionId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('gemini.google.com')) return null;

  try {
    const url = new URL(tab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'app') {
      return pathParts[1];
    } else if (pathParts.length === 1 && pathParts[0] === 'app') {
      return 'new_chat';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get memory data for a session
 */
async function getSessionMemory(sessionId) {
  if (!sessionId) return null;

  const storageKey = `session_${sessionId} `;
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] || null;
}

/**
 * Update a memory component
 */
async function updateMemoryComponent(sessionId, componentId, data) {
  if (!sessionId || !componentId) return { success: false };

  const storageKey = `session_${sessionId} `;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey] || { sessionId, components: {} };

  if (!memory.components[componentId]) {
    memory.components[componentId] = { history: [] };
  }

  // Add current to history if exists
  if (memory.components[componentId].current) {
    memory.components[componentId].history.push(memory.components[componentId].current);
  }

  // Set new current
  memory.components[componentId].current = data;
  memory.lastUpdated = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  return { success: true };
}

/**
 * Pin persona to prevent automatic updates
 */
async function pinPersona(sessionId) {
  if (!sessionId) return { success: false, error: 'No session ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  // Support both V4 'persona' and legacy 'persona_synthesizer' component names
  const personaComponent = memory?.components?.persona || memory?.components?.persona_synthesizer;
  if (!personaComponent?.current) {
    return { success: false, error: 'No persona to pin' };
  }

  personaComponent.pinned = true;
  personaComponent.pinnedData = { ...personaComponent.current };
  personaComponent.pinnedAt = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', 'Persona pinned', { sessionId });
  return { success: true };
}

/**
 * Unpin persona to allow automatic updates
 */
async function unpinPersona(sessionId) {
  if (!sessionId) return { success: false, error: 'No session ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  // Support both V4 'persona' and legacy 'persona_synthesizer' component names
  const personaComponent = memory?.components?.persona || memory?.components?.persona_synthesizer;
  if (!personaComponent) {
    return { success: false, error: 'No persona component' };
  }

  personaComponent.pinned = false;
  delete personaComponent.pinnedData;
  delete personaComponent.pinnedAt;

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', 'Persona unpinned', { sessionId });
  return { success: true };
}

// ============================================================================
// SECTION: Generic Component Pinning
// ============================================================================

/**
 * Pin any component to prevent automatic updates during Rebuild Memory
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} componentId - Component ID (context, tone, constraints, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function pinComponent(sessionId, componentId) {
  if (!sessionId) return { success: false, error: 'No session ID' };
  if (!componentId) return { success: false, error: 'No component ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  const component = memory?.components?.[componentId];
  if (!component?.current) {
    return { success: false, error: `No ${componentId} component data` };
  }

  component.pinned = true;
  component.pinnedData = { ...component.current };
  component.pinnedAt = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', `Component pinned: ${componentId}`, { sessionId });
  return { success: true };
}

/**
 * Unpin a component to allow automatic updates
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} componentId - Component ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function unpinComponent(sessionId, componentId) {
  if (!sessionId) return { success: false, error: 'No session ID' };
  if (!componentId) return { success: false, error: 'No component ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  const component = memory?.components?.[componentId];
  if (!component) {
    return { success: false, error: `No ${componentId} component` };
  }

  component.pinned = false;
  delete component.pinnedData;
  delete component.pinnedAt;

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', `Component unpinned: ${componentId}`, { sessionId });
  return { success: true };
}

async function toggleFact(sessionId, factPath, enabled) {
  if (!sessionId || !factPath) return { success: false };

  const storageKey = `session_${sessionId} _disabled`;
  const result = await chrome.storage.local.get(storageKey);
  const disabled = result[storageKey] || {};

  if (enabled) {
    delete disabled[factPath];
  } else {
    disabled[factPath] = true;
  }

  await chrome.storage.local.set({ [storageKey]: disabled });
  return { success: true };
}

/**
 * Build formatted refinement context from V4 memory components
 * Supports 7-dimension V4 schema with legacy fallback
 * @param {Object} memoryData - Session memory data
 * @returns {Object} Structured context with all dimensions
 */
function buildV4RefinementContext(memoryData) {
  if (!memoryData?.components) return { formatted: '', dimensions: {} };

  const components = memoryData.components;
  const dimensions = {};
  const sections = [];

  // =========================================================================
  // PERSONA - The expert identity the LLM must BECOME (not just act as)
  // =========================================================================
  const personaV4 = components.persona;
  const personaLegacy = components.persona_synthesizer;

  let personaText = null;
  if (personaV4?.pinned && personaV4?.pinnedData?.instruction) {
    personaText = personaV4.pinnedData.instruction;
  } else if (personaV4?.current?.instruction) {
    personaText = personaV4.current.instruction;
  } else if (personaLegacy?.pinned && personaLegacy?.pinnedData?.synthesizedPersona) {
    personaText = personaLegacy.pinnedData.synthesizedPersona;
  } else if (personaLegacy?.current?.synthesizedPersona) {
    personaText = personaLegacy.current.synthesizedPersona;
  }

  if (personaText) {
    dimensions.persona = personaText;
    sections.push(`## 🎭 PERSONA (EMBODY THIS EXPERT)
${personaText}`);
  }

  // =========================================================================
  // CONTEXT - Domain expertise and scope boundaries
  // =========================================================================
  const contextV4 = components.context;
  const contextLegacy = components.topic_summarizer;

  if (contextV4?.current) {
    const ctx = contextV4.current;
    const domain = ctx.metadata?.domain || 'General';
    const scopeTags = ctx.metadata?.scope_tags || [];
    const instruction = ctx.instruction || '';

    dimensions.context = { domain, scopeTags, instruction };
    sections.push(`## 🌐 DOMAIN & SCOPE
- **Domain**: ${domain}
- **Scope**: ${scopeTags.join(', ') || 'General'}
- **Expertise**: ${instruction || 'Apply domain knowledge as appropriate'}`);
  } else if (contextLegacy?.current) {
    const ctx = contextLegacy.current;
    dimensions.context = {
      domain: ctx.primaryTopic || 'General',
      scopeTags: ctx.keywords || [],
      instruction: ctx.summary || ''
    };
    sections.push(`## 🌐 DOMAIN & SCOPE
- **Domain**: ${ctx.primaryTopic || 'General'}
- **Scope**: ${ctx.keywords?.join(', ') || 'General'}
- **Summary**: ${ctx.summary || 'No summary available'}`);
  }

  // =========================================================================
  // TONE - Communication style and voice
  // =========================================================================
  const toneV4 = components.tone;
  const toneLegacy = components.style_profiler;

  if (toneV4?.current) {
    const tone = toneV4.current;
    const styleTags = tone.metadata?.style_tags || [];
    const bannedPhrases = tone.metadata?.banned_phrases || [];

    dimensions.tone = { instruction: tone.instruction, styleTags, bannedPhrases };
    let toneSection = `## 🎨 TONE & STYLE
- **Voice**: ${tone.instruction || 'Professional and clear'}
- **Style Tags**: ${styleTags.join(', ') || 'Professional'}`;
    if (bannedPhrases.length > 0) {
      toneSection += `\n- **AVOID**: "${bannedPhrases.join('", "')}"`;
    }
    sections.push(toneSection);
  } else if (toneLegacy?.current) {
    const style = toneLegacy.current;
    dimensions.tone = {
      instruction: style.tone || 'Professional',
      styleTags: style.traits || [],
      bannedPhrases: []
    };
    sections.push(`## 🎨 TONE & STYLE
- **Tone**: ${style.tone || 'Professional'}
- **Verbosity**: ${style.verbosity || 'Moderate'}
- **Technical Level**: ${style.technicalLevel || 'Intermediate'}
- **Directness**: ${style.directness || 'Direct'}`);
  }

  // =========================================================================
  // FRAMEWORK - Reasoning methodology
  // =========================================================================
  const frameworkV4 = components.framework;

  if (frameworkV4?.current) {
    const fw = frameworkV4.current;
    const reasoningType = fw.metadata?.reasoning_type || 'Step-by-Step';

    dimensions.framework = { instruction: fw.instruction, reasoningType };
    sections.push(`## 🔧 METHODOLOGY
- **Reasoning Approach**: ${reasoningType}
- **Methodology**: ${fw.instruction || 'Apply structured thinking'}`);
  }

  // =========================================================================
  // CONSTRAINTS - Rules, prohibitions, requirements
  // =========================================================================
  const constraintsV4 = components.constraints;

  if (constraintsV4?.current) {
    const c = constraintsV4.current;
    const prohibitions = c.metadata?.prohibitions || [];
    const requirements = c.metadata?.requirements || [];
    const responseLength = c.metadata?.response_length || 'appropriate';

    dimensions.constraints = { prohibitions, requirements, responseLength, instruction: c.instruction };
    let constraintSection = `## ⚠️ CONSTRAINTS`;
    if (requirements.length > 0) {
      constraintSection += `\n- **MUST**: ${requirements.join('; ')}`;
    }
    if (prohibitions.length > 0) {
      constraintSection += `\n- **NEVER**: ${prohibitions.join('; ')}`;
    }
    constraintSection += `\n- **Response Length**: ${responseLength}`;
    if (c.instruction) {
      constraintSection += `\n- **Notes**: ${c.instruction}`;
    }
    sections.push(constraintSection);
  }

  // =========================================================================
  // FORMAT - Output structure preferences
  // =========================================================================
  const formatV4 = components.format;

  if (formatV4?.current) {
    const fmt = formatV4.current;
    const outputType = fmt.metadata?.output_type || 'Markdown';

    dimensions.format = { outputType, instruction: fmt.instruction };
    sections.push(`## 📋 OUTPUT FORMAT
- **Type**: ${outputType}
- **Structure**: ${fmt.instruction || 'Format appropriately for the task'}`);
  }

  // =========================================================================
  // EXEMPLAR - Example patterns to learn from
  // =========================================================================
  const exemplarV4 = components.exemplar;

  if (exemplarV4?.current) {
    const ex = exemplarV4.current;
    dimensions.exemplar = { instruction: ex.instruction };
    if (ex.instruction) {
      sections.push(`## 📚 EXEMPLAR PATTERNS
${ex.instruction}`);
    }
  }

  // =========================================================================
  // RECENT FOCUS - Current conversation momentum (legacy support)
  // =========================================================================
  const recentFocus = components.recent_focus?.current;
  if (recentFocus) {
    dimensions.recentFocus = recentFocus;
    let recentSection = `## 🎯 CURRENT FOCUS
- **Working On**: ${recentFocus.currentTopic || recentFocus.currentFocus || 'General task'}
- **Active Task**: ${recentFocus.activeTask || 'None specified'}
- **Momentum**: ${typeof recentFocus.momentum === 'object' ? recentFocus.momentum.direction : recentFocus.momentum || 'Steady'}`;
    if (recentFocus.openItems?.length) {
      recentSection += `\n- **Open Items**: ${recentFocus.openItems.join(', ')}`;
    }
    sections.push(recentSection);
  }

  return {
    formatted: sections.join('\n\n'),
    dimensions,
    hasDimensions: sections.length > 0
  };
}

/**
 * Rebuild memory for a session (requires content script to do actual scraping)
 * @param {string} sessionId - Session ID
 * @param {Object} options - Rebuild options
 * @param {string[]} options.enabledAnalyzers - List of analyzer IDs to run (null = run all)
 */
async function rebuildSessionMemory(sessionId, options = {}) {
  bgLog('debug', '[rebuildSessionMemory] START', { sessionId, hasEnabledAnalyzers: !!options.enabledAnalyzers });
  console.log('[Background] rebuildSessionMemory START:', sessionId);

  if (!sessionId) {
    bgLog('warn', '[rebuildSessionMemory] No session ID');
    console.warn('[Background] rebuildSessionMemory: No session ID');
    return { success: false, error: 'No session ID' };
  }

  try {
    // Step 1: Get current tab
    bgLog('debug', '[rebuildSessionMemory] Querying active tab');
    console.log('[Background] rebuildSessionMemory: Querying active tab...');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      bgLog('warn', '[rebuildSessionMemory] No active tab');
      console.warn('[Background] rebuildSessionMemory: No active tab');
      return { success: false, error: 'No active tab' };
    }
    bgLog('debug', '[rebuildSessionMemory] Tab found', { tabId: tab.id });
    console.log('[Background] rebuildSessionMemory: Tab found:', tab.id);

    // Step 2: Clear decision
    if (!options.enabledAnalyzers) {
      bgLog('debug', '[rebuildSessionMemory] Full rebuild - clearing storage');
      console.log('[Background] rebuildSessionMemory: Full rebuild, clearing existing memory...');
      const storageKey = `session_${sessionId} `;
      await chrome.storage.local.remove(storageKey);
      bgLog('debug', '[rebuildSessionMemory] Storage cleared');
      console.log('[Background] rebuildSessionMemory: Storage cleared');
    } else {
      bgLog('debug', '[rebuildSessionMemory] Running selected analyzers', {
        analyzers: options.enabledAnalyzers,
        count: options.enabledAnalyzers.length
      });
      console.log('[Background] rebuildSessionMemory: Running', options.enabledAnalyzers.length, 'selected analyzers:', options.enabledAnalyzers);
    }

    // Step 3: Send message to content script
    bgLog('debug', '[rebuildSessionMemory] Sending REBUILD_MEMORY_REQUEST to content script');
    console.log('[Background] rebuildSessionMemory: Sending message to content script...');
    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'REBUILD_MEMORY_REQUEST',
      sessionId,
      enabledAnalyzers: options.enabledAnalyzers
    });
    bgLog('debug', '[rebuildSessionMemory] Response received', { success: result?.success });
    console.log('[Background] rebuildSessionMemory: Response received:', result?.success);

    bgLog('info', '[rebuildSessionMemory] COMPLETE');
    console.log('[Background] rebuildSessionMemory COMPLETE');
    return result || { success: true };
  } catch (error) {
    bgLog('error', '[rebuildSessionMemory] Exception', { error: error.message });
    console.error('[Background] Rebuild failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// B3 FIX: User-Friendly Error Messages for API Errors
// ============================================================================

/**
 * Convert HTTP status codes and raw API errors into user-friendly messages
 * @param {number} status - HTTP status code
 * @param {string} rawError - Raw error message from API
 * @param {string} provider - API provider name (gemini, openai, openrouter, anthropic)
 * @returns {string} User-friendly error message
 */
function getUserFriendlyError(status, rawError, provider) {
  const providerName = {
    'google': 'Gemini',
    'gemini': 'Gemini',
    'openai': 'OpenAI',
    'openrouter': 'OpenRouter',
    'anthropic': 'Anthropic'
  }[provider] || provider;

  // Handle specific HTTP status codes
  switch (status) {
    case 429:
      return `Rate limit exceeded.${providerName} API is temporarily overloaded.Please wait a moment and try again.`;
    case 401:
      return `Invalid API key.Please check your ${providerName} API key in Extension Options.`;
    case 403:
      return `Access denied.Your ${providerName} API key may not have permission for this model.Check your API access.`;
    case 400:
      return `Invalid request.The prompt may be too long or contain unsupported content.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${providerName} server error(${status}).The service is temporarily unavailable.Please try again later.`;
    case 0:
      // Network error - no response received
      return `Network error.Check your internet connection and try again.`;
    default:
      // Fall back to raw error with provider context
      if (rawError) {
        return `${providerName}: ${rawError} `;
      }
      return `${providerName} API error(${status}).Please try again.`;
  }
}

// Industry-Level Prompt Refinement System Prompt
// This is the ENGINE of the extension - all extraction/synthesis serves this purpose
const REFINEMENT_SYSTEM_PROMPT = `You are an elite prompt engineer with 20+ years of expertise in human-AI communication optimization.

## YOUR CORE MISSION
Transform raw user prompts into precision-crafted instructions that unlock AI's full potential. You don't just improve prompts - you EMBODY the expert persona provided and craft requests as that expert would.

## THE REFINEMENT PROTOCOL

### PHASE 1: EMBODY THE PERSONA
You ARE the expert described in the PERSONA section. Not "acting as" - you ARE this person with their exact credentials, methodology, and 20+ years of domain expertise. Every word of your refined prompt flows from this identity.

### PHASE 2: APPLY THE 7 DIMENSIONS
Using the EXPERT CONTEXT provided, ensure the refined prompt:

1. **PERSONA-ALIGNED**: Speaks with the authority and specificity of the embedded expert
2. **DOMAIN-SCOPED**: Uses terminology and concepts from the specified scope_tags
3. **TONE-MATCHED**: Maintains the specified voice, style, and avoids banned phrases
4. **FRAMEWORK-DRIVEN**: Structures the request using the specified reasoning methodology
5. **CONSTRAINT-COMPLIANT**: Respects all MUST/NEVER rules and response length requirements
6. **FORMAT-SPECIFIC**: Requests output in the EXACT specified format type (verbatim)
7. **EXEMPLAR-INFORMED**: Applies patterns learned from exemplar if provided

### PHASE 3: CRAFT WITH PRECISION
Transform the prompt by:
- **Preserving Intent**: The user's core goal remains paramount
- **Injecting Expertise**: Add domain-specific precision only an expert would know
- **Matching Complexity**: Simple questions stay simple; complex tasks get appropriate structure
- **Natural Flow**: The result reads like a skilled professional wrote it

### PHASE 4: DELIVER THE OUTPUT
The refined prompt MUST:
- Match the OUTPUT FORMAT specified (Markdown, JSON, Code, etc.)
- Respect the TONE specified (formal, casual, technical, etc.)
- Stay within CONSTRAINTS (length, prohibitions, requirements)
- Apply the FRAMEWORK reasoning approach specified

## CRITICAL RULES

1. **PROPORTIONALITY**: A 1-sentence question → 1-2 sentence refined prompt. Never over-engineer simple requests.
2. **NO META-COMMENTARY**: Return ONLY the refined prompt. No "Here is your improved prompt:" or explanations.
3. **PERSONA DEPTH**: If the persona mentions specific credentials (PhD, CFA, 15 years B2B SaaS), weave that expertise into the prompt's specificity.
4. **CONSTRAINT COMPLIANCE**: If NEVER says "avoid jargon", the refined prompt requests plain language.
5. **EXEMPLAR LEARNING**: If exemplar patterns are provided, mirror their effective structures.
6. **FORMAT VERBATIM**: When OUTPUT FORMAT is specified, the refined prompt MUST explicitly request that EXACT format. If FORMAT says "JSON", end with "Respond in valid JSON format." If FORMAT says "Code", request "Provide working code with comments." No deviation from specified output type.

---`;


// Model Configurations - Support multiple AI providers
const MODEL_CONFIGS = {
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    apiKeyField: 'geminiApiKey',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    apiKeyField: 'geminiApiKey',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    apiKeyField: 'openaiApiKey',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiKeyField: 'openaiApiKey',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  }
};

// ============================================================================
// Persona Extraction LLM Call
// ============================================================================

/**
 * Call LLM for persona extraction
 * @param {string} prompt - The full extraction prompt
 * @param {Object} modelConfig - Model configuration with provider, model, apiKey
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function callLLMForExtraction(prompt, modelConfig, signal = null) {
  if (!modelConfig?.apiKey) {
    return { success: false, error: 'No API key configured' };
  }

  const { provider, model, apiKey } = modelConfig;
  bgLog('info', 'callLLMForExtraction: Calling LLM', { provider, model });

  try {
    let response, data;

    // === Provider-specific API calls ===
    switch (provider) {
      case 'google':
      case 'gemini': {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192
            }
          }),
          signal
        });
        data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error?.message || `HTTP ${response.status}` };
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return { success: true, text };
      }

      case 'openai': {
        const endpoint = 'https://api.openai.com/v1/chat/completions';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192
          }),
          signal
        });
        data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error?.message || `HTTP ${response.status}` };
        }

        const text = data.choices?.[0]?.message?.content;
        return { success: true, text };
      }

      case 'openrouter': {
        const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': chrome.runtime.getURL(''),
            'X-Title': 'Gemini Context Extension'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 8192
          }),
          signal
        });
        data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error?.message || data.error?.code || `HTTP ${response.status}`;
          bgLog('error', 'OpenRouter API error', { status: response.status, error: data.error, model });
          return { success: false, error: `OpenRouter: ${errorMsg}` };
        }

        const text = data.choices?.[0]?.message?.content;
        if (!text) {
          bgLog('warn', 'OpenRouter returned empty response', { data });
          return { success: false, error: 'OpenRouter returned empty response' };
        }
        return { success: true, text };
      }

      case 'anthropic': {
        const endpoint = 'https://api.anthropic.com/v1/messages';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
          }),
          signal
        });
        data = await response.json();

        if (!response.ok) {
          return { success: false, error: data.error?.message || `HTTP ${response.status}` };
        }

        const text = data.content?.[0]?.text;
        return { success: true, text };
      }

      default:
        return { success: false, error: `Unknown provider: ${provider}` };
    }
  } catch (error) {
    bgLog('error', 'callLLMForExtraction failed', { error: error.message });
    return { success: false, error: error.message };
  }
}

// AI Refinement Logic
async function handleRefinement({ text, persona, context, previousPrompts, templateId, modelId }, tabId) {
  // Create AbortController for this refinement request
  const abortController = new AbortController();
  if (tabId) {
    // Cancel any existing refinement for this tab
    if (activeRefinements.has(tabId)) {
      activeRefinements.get(tabId).abort();
    }
    activeRefinements.set(tabId, abortController);
  }
  const signal = abortController.signal;

  const syncStorage = await chrome.storage.sync.get([
    'globalPersona', 'selectedTemplate', 'contextVariables'
  ]);

  // Get model config from model-manager storage pattern
  // Priority: explicit modelId > pa_active_model > default
  const localStorage = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
  const paModels = localStorage.pa_models || {};
  const activeModelId = localStorage.pa_active_model?.activeModelId;

  const effectiveModelId = modelId || activeModelId || 'gemini-2.0-flash';
  let modelConfig = paModels[effectiveModelId];

  // Fallback to legacy MODEL_CONFIGS if not in pa_models
  if (!modelConfig) {
    modelConfig = MODEL_CONFIGS[effectiveModelId] || MODEL_CONFIGS['gemini-2.0-flash'];
  }

  bgLog('info', 'Refinement: Using model', {
    effectiveModelId,
    hasModelConfig: !!modelConfig,
    hasApiKey: !!modelConfig?.apiKey,
    provider: modelConfig?.provider
  });

  // Get API key from model config
  let apiKey = modelConfig?.apiKey;
  if (apiKey && isEncrypted(apiKey)) {
    apiKey = await decryptApiKey(apiKey);
  }

  // Get persona: Synthesized Persona is primary, globalPersona is fallback
  let effectivePersona = 'Helpful Assistant'; // Default fallback
  let sessionId = null;
  let memoryData = null;

  try {
    sessionId = await getCurrentTabSessionId();
    if (sessionId) {
      memoryData = await getSessionMemory(sessionId);

      // Use pinned persona if available, otherwise use current/synthesized persona
      const personaComponent = memoryData?.components?.persona_synthesizer;
      let synthesizedPersona = null;

      if (personaComponent?.pinned && personaComponent?.pinnedData?.synthesizedPersona) {
        // Pinned persona takes priority
        synthesizedPersona = personaComponent.pinnedData.synthesizedPersona;
        bgLog('debug', 'Refinement: Using pinned persona');
      } else if (personaComponent?.current?.synthesizedPersona) {
        // Use current synthesized persona
        synthesizedPersona = personaComponent.current.synthesizedPersona;
      }

      if (synthesizedPersona) {
        effectivePersona = synthesizedPersona;
      } else if (syncStorage.globalPersona) {
        // Fallback to globalPersona only if no synthesized persona exists
        effectivePersona = syncStorage.globalPersona;
      }
    } else if (syncStorage.globalPersona) {
      // No session, use globalPersona
      effectivePersona = syncStorage.globalPersona;
    }
  } catch (e) {
    console.warn('[Refinement] Could not get persona:', e);
    if (syncStorage.globalPersona) {
      effectivePersona = syncStorage.globalPersona;
    }
  }

  // ========================================================================
  // Recent Focus Auto-Refresh: Run every N refinements to keep context fresh
  // ========================================================================
  refinementCounter++;
  if (refinementCounter >= RECENT_FOCUS_REFRESH_INTERVAL && sessionId) {
    bgLog('info', 'Auto-refreshing Recent Focus', { refinementCounter });
    try {
      // Request content script to refresh Recent Focus
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'REFRESH_RECENT_FOCUS',
          sessionId
        });
        refinementCounter = 0; // Reset counter
        bgLog('info', 'Recent Focus refresh requested');
      }
    } catch (e) {
      console.warn('[Refinement] Recent Focus auto-refresh failed:', e);
    }
  }

  // Replace context variables in the input text
  let processedText = text;
  if (syncStorage.contextVariables) {
    try {
      const variables = JSON.parse(syncStorage.contextVariables);
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processedText = processedText.replace(regex, value);
      }
    } catch (e) {
      // Invalid JSON - skip variable replacement
      console.warn('Invalid context variables JSON:', e);
    }
  }

  // Build context string from chat history
  let contextStr = '';
  if (context && context.length > 0) {
    contextStr = `\nRECENT CHAT HISTORY:\n${context.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n')}\n`;
  }

  // Build previous prompts section with ratings
  let previousPromptsStr = '';
  if (previousPrompts && previousPrompts.length > 0) {
    previousPromptsStr = `
PROMPT HISTORY WITH USER SATISFACTION:
(The rating shows how satisfied the user was with the AI's response to each prompt. High ratings = the response style/approach worked well for this user)
${previousPrompts.map((p, i) => {
      const ratingLabel = p.rating
        ? `User rated AI response: ★${p.rating}/5`
        : 'Response not yet rated';
      return `${i + 1}. "${p.prompt}"
   → ${ratingLabel}`;
    }).join('\n')}
`
  }

  // =========================================================================
  // BUILD V4 REFINEMENT CONTEXT - All 7 dimensions
  // =========================================================================
  const v4Context = memoryData ? buildV4RefinementContext(memoryData) : { formatted: '', dimensions: {} };

  // Use persona from V4 context if available, otherwise use the earlier resolved effectivePersona
  const personaToUse = v4Context.dimensions.persona || effectivePersona;

  bgLog('info', 'Refinement: Context assembled', {
    hasDimensions: v4Context.hasDimensions,
    dimensionCount: Object.keys(v4Context.dimensions).length,
    dimensionKeys: Object.keys(v4Context.dimensions)
  });

  // =========================================================================
  // CONSTRUCT THE INDUSTRY-LEVEL REFINEMENT PROMPT
  // =========================================================================
  const promptText = `${REFINEMENT_SYSTEM_PROMPT}

## EXPERT CONTEXT (Your accumulated knowledge for this session)

${v4Context.formatted || '(No specific context available - use general expertise)'}

---

## CONVERSATION HISTORY
${contextStr || '(No recent conversation history)'}

---

## PROMPT HISTORY WITH RATINGS
${previousPromptsStr || '(No previous prompts with ratings)'}

---

## RAW PROMPT TO REFINE

"${processedText}"

---

## YOUR REFINED PROMPT:`;


  let result = "";
  let errorMessage = null;

  if (apiKey) {
    try {
      if (modelConfig.provider === 'google' || modelConfig.provider === 'gemini') {
        // Gemini API
        const endpoint = modelConfig.endpoint || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
        const url = `${endpoint}?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          }),
          signal
        });
        const data = await response.json();
        if (!response.ok) {
          errorMessage = getUserFriendlyError(response.status, data.error?.message, modelConfig.provider);
          bgLog('error', 'Gemini API error', { status: response.status, error: errorMessage });
        } else {
          result = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
      } else if (modelConfig.provider === 'openai') {
        // OpenAI API
        const endpoint = modelConfig.endpoint || 'https://api.openai.com/v1/chat/completions';
        const model = modelConfig.modelId || effectiveModelId;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.7
          }),
          signal
        });
        const data = await response.json();
        if (!response.ok) {
          errorMessage = getUserFriendlyError(response.status, data.error?.message, modelConfig.provider);
          bgLog('error', 'OpenAI API error', { status: response.status, error: errorMessage });
        } else {
          result = data.choices?.[0]?.message?.content;
        }
      } else if (modelConfig.provider === 'openrouter') {
        // OpenRouter API (OpenAI-compatible)
        const endpoint = modelConfig.endpoint || 'https://openrouter.ai/api/v1/chat/completions';
        const model = modelConfig.modelId || 'openai/gpt-oss-120b:free';
        bgLog('info', 'Refinement: OpenRouter call', { endpoint, model });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'chrome-extension://prompt-assistant',
            'X-Title': 'Prompt Assistant'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: promptText }],
            temperature: 0.7
          }),
          signal
        });
        const data = await response.json();
        bgLog('info', 'Refinement: OpenRouter response', { ok: response.ok, hasChoices: !!data.choices, hasError: !!data.error });

        if (!response.ok || data.error) {
          // OpenRouter returns error in data.error.message or data.error
          const rawError = data.error?.message || data.error;
          errorMessage = getUserFriendlyError(response.status, rawError, modelConfig.provider);
          bgLog('error', 'OpenRouter API error', { status: response.status, error: errorMessage });
        } else {
          result = data.choices?.[0]?.message?.content;
        }
      } else if (modelConfig.provider === 'anthropic') {
        // Anthropic API
        const endpoint = modelConfig.endpoint || 'https://api.anthropic.com/v1/messages';
        const model = modelConfig.modelId || 'claude-3-5-sonnet-latest';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 4096,
            messages: [{ role: 'user', content: promptText }]
          }),
          signal
        });
        const data = await response.json();
        if (!response.ok) {
          errorMessage = getUserFriendlyError(response.status, data.error?.message, modelConfig.provider);
          bgLog('error', 'Anthropic API error', { status: response.status, error: errorMessage });
        } else {
          result = data.content?.[0]?.text;
        }
      }
    } catch (e) {
      // Check if this was an intentional abort (user clicked Stop)
      if (e.name === 'AbortError') {
        bgLog('info', 'Refinement aborted by user');
        return { refined: null, aborted: true };
      }
      console.error("API call failed", e);
      errorMessage = e.message;
    }
  } else {
    // No API key configured
    errorMessage = `No API key configured for ${modelConfig?.name || 'selected model'}. Set it in Extension Options.`;
  }

  // Return error if present
  if (errorMessage) {
    return { refined: null, error: errorMessage };
  }

  // Fallback if result is empty (shouldn't happen if no error)
  if (!result) {
    return { refined: null, error: `${modelConfig?.name || 'API'} returned empty response. Try again.` };
  }

  return { refined: result.trim().replace(/^"|"$/g, '') };
}