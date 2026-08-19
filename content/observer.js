/**
 * @fileoverview Observer Content Script for Prompt Assistant Extension
 * 
 * Injected into Gemini pages to provide UI enhancements and prompt refinement.
 * 
 * UI Components Created:
 * - Refine Toggle: Enable/disable prompt refinement before sending
 * - Settings Icon: Open sidepanel or options page
 * - Review Modal: Display original vs refined prompt comparison
 * - Split View: 50% iframe mode for sidepanel content
 * 
 * Key Features:
 * - Theme detection and synchronization with sidepanel
 * - DOM selector resilience with fallback patterns
 * - Send button interception for refinement workflow
 * - Keyboard shortcuts (Escape, Ctrl+M)
 * 
 * @module content/observer
 * @requires chrome.runtime
 * @requires chrome.storage
 * 
 * Message Types Handled:
 * - GET_THEME: Return current page theme
 * - TRIGGER_REFINE_SHORTCUT: Open refinement modal via keyboard
 * - TOGGLE_SPLIT_VIEW: Switch to/from iframe mode
 * - REBUILD_MEMORY_REQUEST: Trigger memory analysis
 */

/**
 * Structured logger for observer content script
 * Falls back to console.log if Logger class isn't available
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional context data
 */
const obsLog = (level, msg, data = {}) => {
  if (typeof Logger !== 'undefined') {
    Logger.getInstance()[level](msg, { component: 'Observer', ...data });
  } else {
    console.log(`[Observer] ${msg}`, data);
  }
};

obsLog('info', 'Observer.js loaded');

// ============================================================================
// Theme Detection for Sidepanel Sync
// ============================================================================

/**
 * Detect current page theme based on body class (preferred) or background color (fallback)
 * @returns {'dark' | 'light'} Current theme
 */
function detectPageTheme() {
  const body = document.body;
  if (!body) return 'dark';

  // Primary: Check for Gemini's native theme class
  const bodyClasses = body.className;
  if (bodyClasses.includes('dark-theme')) return 'dark';
  if (bodyClasses.includes('light-theme')) return 'light';

  // Fallback: Check computed background color brightness
  const bgColor = window.getComputedStyle(body).backgroundColor;
  const rgb = bgColor.match(/\d+/g);
  if (rgb) {
    const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
    return brightness < 128 ? 'dark' : 'light';
  }
  return 'dark';
}

// Handle theme requests from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_THEME') {
    const theme = detectPageTheme();
    obsLog('info', `Theme request received, responding with: ${theme}`);
    sendResponse({ theme });
    return true; // Keep channel open for async response
  }
});

/**
 * Check if extension context is still valid
 * @returns {boolean} True if extension context is valid
 */
function isExtensionContextValid() {
  try {
    return chrome.runtime && !!chrome.runtime.id;
  } catch (e) {
    return false;
  }
}

// B5 FIX: Track if notification has been shown (only show once per page load)
let extensionReloadNotificationShown = false;

/**
 * B5 FIX: Show notification when extension context is invalidated
 * Prompts user to refresh the page for continued functionality
 */
function showExtensionReloadNotification() {
  if (extensionReloadNotificationShown) return;
  extensionReloadNotificationShown = true;

  // Create toast notification
  const toast = document.createElement('div');
  toast.id = 'gemini-ext-reload-toast';
  toast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: 'Google Sans', sans-serif;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      border: 1px solid rgba(255,255,255,0.1);
      animation: slideIn 0.3s ease-out;
    ">
      <span class="material-symbols-outlined" style="font-size: 20px;">refresh</span>
      <div>
        <div style="font-weight: 500; margin-bottom: 4px;">Extension Updated</div>
        <div style="opacity: 0.8; font-size: 12px;">Please refresh this page to continue using Prompt Assistant.</div>
      </div>
      <button onclick="location.reload()" style="
        background: #4a9eff;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        margin-left: 12px;
        white-space: nowrap;
      ">Refresh</button>
      <button onclick="this.parentElement.remove()" style="
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        cursor: pointer;
        padding: 4px;
        font-size: 18px;
        line-height: 1;
      ">×</button>
    </div>
    <style>
      @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    </style>
  `;
  document.body.appendChild(toast);
  obsLog('warn', 'Extension context invalidated - showing reload notification');
}

/**
 * B5 FIX: Wrapper for chrome.runtime.sendMessage that handles extension reload
 * @param {Object} message - Message to send
 * @returns {Promise} Response from background script
 */
function safeSendMessage(message) {
  return new Promise((resolve, reject) => {
    if (!isExtensionContextValid()) {
      showExtensionReloadNotification();
      reject(new Error('Extension context invalidated'));
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          // Check if it's a context invalidation error
          if (chrome.runtime.lastError.message?.includes('Extension context invalidated')) {
            showExtensionReloadNotification();
          }
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (e) {
      if (e.message?.includes('Extension context invalidated')) {
        showExtensionReloadNotification();
      }
      reject(e);
    }
  });
}

/**
 * Apply detected theme to document elements for CSS variable detection
 * Sets data-theme on both :root (html) and body for maximum compatibility
 * @param {string} theme - 'light' or 'dark'
 */
function applyThemeToDocument(theme) {
  // Apply to <html> element (:root) for CSS variable scope
  if (document.documentElement) {
    document.documentElement.setAttribute('data-theme', theme);
  }
  // Also apply to body for backward compatibility
  if (document.body) {
    document.body.setAttribute('data-gemini-theme', theme);
  }
  obsLog('info', `Applied theme: ${theme}`);
}

// Watch for theme changes on Gemini page and notify sidepanel
let lastDetectedTheme = null;
const themeObserver = new MutationObserver(() => {
  // Check if extension context is still valid
  if (!isExtensionContextValid()) {
    themeObserver.disconnect();
    return;
  }

  const currentTheme = detectPageTheme();
  if (currentTheme !== lastDetectedTheme) {
    lastDetectedTheme = currentTheme;
    obsLog('info', `Theme changed to: ${currentTheme}`);

    // Apply theme to document for CSS variable detection
    applyThemeToDocument(currentTheme);

    // Notify sidepanel of theme change
    chrome.runtime.sendMessage({ type: 'THEME_CHANGED', theme: currentTheme }).catch(() => {
      // Sidepanel may not be open or context invalidated, ignore error
    });
  }
});

// B8 FIX: Enhanced theme detection with multiple observation points
function initThemeObservation() {
  const observeElement = (element) => {
    if (element) {
      themeObserver.observe(element, {
        attributes: true,
        attributeFilter: ['style', 'class', 'data-theme', 'data-gemini-theme']
      });
    }
  };

  // Observe multiple elements where Gemini might set theme
  observeElement(document.documentElement); // html element
  observeElement(document.body);

  // Initial theme detection
  lastDetectedTheme = detectPageTheme();
  applyThemeToDocument(lastDetectedTheme);

  // B8 FIX: Also listen for system preference changes as fallback
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      obsLog('info', `System theme changed to: ${e.matches ? 'dark' : 'light'}`);
      // Only apply if Gemini doesn't have explicit theme set
      const pageTheme = detectPageTheme();
      if (pageTheme !== lastDetectedTheme) {
        lastDetectedTheme = pageTheme;
        applyThemeToDocument(pageTheme);
      }
    });
  }
}

// Start observing
if (document.body) {
  initThemeObservation();
} else {
  document.addEventListener('DOMContentLoaded', initThemeObservation);
}

// ============================================================================
// DOM Selector Resilience - Centralized selectors with fallbacks
// ============================================================================

/**
 * Centralized selector configuration with fallback arrays
 * If Google updates Gemini's UI, only this config needs updating
 */
const SELECTORS = {
  chatInput: [
    'div[role="textbox"][aria-label="Enter a prompt here"]',
    'div.ql-editor.textarea[role="textbox"]',
    '.ql-editor.textarea',
    'div.ql-editor[role="textbox"]',
    'rich-textarea div[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]'
  ],
  sendButton: [
    'button[aria-label="Send message"]',
    'button[aria-label*="Send"]',
    'button.send-button',
    '.trailing-actions-wrapper button:last-child',
    'button[data-test-id="send-button"]'
  ],
  inputContainer: [
    'div.input-area[data-node-type="input-area"]',
    'input-area-v2',
    'div.input-area-container',
    'div.input-area'
  ],
  trailingActions: [
    '.trailing-actions-wrapper',
    '.input-buttons-wrapper',
    'div[class*="trailing"]'
  ],
  modelPicker: [
    '.model-picker',
    'button[aria-label*="model"]',
    '[data-test-id="model-picker"]'
  ]
};

/**
 * Find an element using multiple fallback selectors
 * @param {string} type - Key from SELECTORS config
 * @param {Element} context - Optional parent element to search within
 * @returns {Element|null} Found element or null
 */
function findElement(type, context = document) {
  const selectors = SELECTORS[type];
  if (!selectors) {
    obsLog('warn', `Unknown selector type: ${type}`);
    return null;
  }

  for (let i = 0; i < selectors.length; i++) {
    try {
      const el = context.querySelector(selectors[i]);
      if (el) {
        // Log if we had to use a fallback selector
        if (i > 0) {
          obsLog('warn', `Selector fallback used for ${type}`, {
            primary: selectors[0],
            usedFallback: selectors[i],
            fallbackIndex: i
          });
        }
        return el;
      }
    } catch (e) {
      // Some selectors (like :has()) may not be supported
      continue;
    }
  }

  obsLog('warn', `Element not found: ${type}`, { triedSelectors: selectors.length });
  return null;
}

function findChatInput() {
  return findElement('chatInput');
}

function findSendButton() {
  return findElement('sendButton');
}

function findInputContainer() {
  // Try centralized selectors first
  const fromConfig = findElement('inputContainer');
  if (fromConfig) return fromConfig;

  // Legacy fallback: traverse from chat input
  const input = findChatInput();
  if (!input) return null;

  let current = input.parentElement;
  for (let i = 0; i < 8; i++) {
    if (!current || current.tagName === 'BODY') break;
    const style = window.getComputedStyle(current);
    if (style.position !== 'static' || parseInt(style.borderRadius) > 8) {
      return current;
    }
    current = current.parentElement;
  }
  return input.parentElement;
}

// --- Components ---

// 1. Settings Icon - Toggles sidepanel
function createSettingsIcon() {
  const wrapper = document.createElement('div');
  wrapper.className = 'gemini-ext-settings-wrapper';

  const btn = document.createElement('div');
  btn.className = 'gemini-ext-settings-btn';
  btn.innerHTML = `<svg viewBox="0 0 256 256" fill="currentColor" width="20" height="20"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z"/></svg>`;
  btn.title = "Toggle Memory Control Panel";

  // Toggle sidepanel on click
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (btn.classList.contains('enabled')) {
      // Send message to background to toggle sidepanel
      chrome.runtime.sendMessage({ type: 'TOGGLE_SIDEPANEL' });
    }
  });

  wrapper.appendChild(btn);

  // Create model indicator dot (child of settings button for overlay positioning)
  const modelDot = document.createElement('div');
  modelDot.className = 'gemini-ext-model-dot inactive';
  modelDot.id = 'gemini-model-indicator';
  modelDot.title = 'Loading...';
  btn.appendChild(modelDot); // Append to btn, not wrapper, for absolute positioning

  // Update model indicator status
  const updateModelIndicator = async () => {
    try {
      if (!chrome.runtime?.id) return;

      const result = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
      const activeModelData = result.pa_active_model;
      const activeModelId = activeModelData?.activeModelId || activeModelData;
      const models = result.pa_models || {};

      if (activeModelId && models[activeModelId]) {
        const activeModel = models[activeModelId];
        modelDot.classList.add('active');
        modelDot.classList.remove('inactive');
        modelDot.title = `✓ ${activeModel.name || activeModel.model}\n${activeModel.provider}`;
      } else {
        modelDot.classList.remove('active');
        modelDot.classList.add('inactive');
        modelDot.title = 'No model configured\nClick to open settings';
      }
    } catch (error) {
      console.error('[ModelIndicator] Error:', error);
      modelDot.classList.remove('active');
      modelDot.classList.add('inactive');
    }
  };

  // Initial load
  updateModelIndicator();

  // Listen for model changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.pa_models || changes.pa_active_model)) {
      updateModelIndicator();
    }
  });

  const api = {
    element: wrapper,
    setEnabled: (isEnabled) => {
      if (isEnabled) {
        btn.classList.add('enabled');
      } else {
        btn.classList.remove('enabled');
      }
    },
    setVisible: (isVisible) => {
      wrapper.style.display = isVisible ? '' : 'none';
    },
    refreshModelIndicator: updateModelIndicator
  };

  wrapper._geminiApi = api;
  return api;
}

// 2. Refine Toggle - Native Gemini button style
function createRefineToggle(onToggle) {
  const wrapper = document.createElement('div');
  wrapper.className = 'gemini-ext-toggle-wrapper visible'; // Always visible

  const label = document.createElement('div');
  label.className = 'gemini-ext-toggle-label';
  label.innerText = "Refine";

  const toggle = document.createElement('div');
  toggle.className = 'gemini-ext-toggle';

  let isOn = localStorage.getItem('gemini_refine_active') === 'true';

  // Set initial state
  if (isOn) {
    toggle.classList.add('checked');
    wrapper.classList.add('active');
  }

  // Update visual state
  const updateState = (newState) => {
    isOn = newState;
    toggle.classList.toggle('checked', isOn);
    wrapper.classList.toggle('active', isOn);
    localStorage.setItem('gemini_refine_active', isOn);
    onToggle(isOn);
  };

  // Make entire wrapper clickable
  wrapper.addEventListener('click', (e) => {
    e.stopPropagation();
    updateState(!isOn);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(toggle);

  const api = {
    element: wrapper,
    getState: () => isOn
  };

  wrapper._geminiApi = api;
  return api;
}

// 3. Send Overlay - REMOVED: Now intercepting native button instead

// 4. Review Modal (Popup) - Redesigned with theme awareness
let modalInstance = null;

function createReviewModal() {
  if (modalInstance) return modalInstance;

  // Detect theme from Gemini's page
  const detectTheme = () => {
    const body = document.body;
    const bgColor = window.getComputedStyle(body).backgroundColor;
    // Parse RGB values to detect if dark or light
    const rgb = bgColor.match(/\d+/g);
    if (rgb) {
      const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
      return brightness < 128 ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark
  };

  const overlay = document.createElement('div');
  overlay.className = `gemini-ext-modal-overlay theme-${detectTheme()}`;

  // Use template from templates.js
  if (typeof window.GeminiTemplates === 'undefined') {
    console.error('[Observer] GeminiTemplates not loaded. Ensure templates.js is loaded before observer.js');
    return null;
  }
  overlay.innerHTML = window.GeminiTemplates.getReviewModalTemplate();

  document.body.appendChild(overlay);

  // Elements - new structure
  const refinedTextarea = overlay.querySelector('#refined-textarea');
  const originalTextarea = overlay.querySelector('#original-textarea');
  const loader = overlay.querySelector('#loading-indicator');
  const stopButtonArea = overlay.querySelector('#stop-button-area');
  const btnClose = overlay.querySelector('.gemini-ext-modal-close');
  const btnRollback = overlay.querySelector('#btn-rollback');
  const btnReRefine = overlay.querySelector('#btn-re-refine');
  const btnCopy = overlay.querySelector('#btn-copy');
  const btnSendFinal = overlay.querySelector('#btn-send-final');
  const btnStop = overlay.querySelector('#btn-stop-refine');
  const charCount = overlay.querySelector('#char-count');
  const diffViewEl = overlay.querySelector('#diff-view');
  const tabs = overlay.querySelectorAll('.gemini-ext-tab');
  const panels = overlay.querySelectorAll('.gemini-ext-content-panel');

  // Navigation buttons
  const navPrevOriginal = overlay.querySelector('#nav-prev-original');
  const navNextOriginal = overlay.querySelector('#nav-next-original');
  const navPrevRefined = overlay.querySelector('#nav-prev-refined');
  const navNextRefined = overlay.querySelector('#nav-next-refined');

  // Pair navigation buttons (switch between raw and refined tabs)
  const navToRefined = overlay.querySelector('#nav-to-refined');
  const navToOriginal = overlay.querySelector('#nav-to-original');

  // State
  // Each pair is { rough: string, refined: string|null }
  // - rough: the prompt that was sent for refinement
  // - refined: the refined result (null if not yet refined)
  let state = {
    pairs: [], // Array of { rough, refined } objects
    pairIndex: -1, // Current pair being edited/created
    originalIndex: -1, // Navigation index for Raw Prompt tab
    refinedIndex: -1, // Navigation index for Refined Prompt tab
    activeTab: 'original', // Which tab is active
    showingPair: false, // Whether currently viewing a matched pair (both sides loaded)
    hasApiKey: true, // Whether API key is configured (assume true, check on modal open)
    currentAbortController: null, // AbortController for current refinement request
    lastRefinementPayload: null, // Store last payload for retry functionality
    isAborted: false // Flag to indicate if current refinement was aborted
  };

  // Empty state elements
  const emptyStateEl = overlay.querySelector('#empty-state-guidance');
  const btnConfigureApi = overlay.querySelector('#btn-configure-api');

  // Error banner elements
  const errorBanner = overlay.querySelector('#refinement-error-banner');
  const errorBannerMessage = overlay.querySelector('#error-banner-message');
  const btnErrorRetry = overlay.querySelector('#btn-error-retry');

  // Feedback element for typing effect messages
  const feedbackEl = overlay.querySelector('#refinement-feedback');

  // Helper: Check internet connection quality
  async function checkConnection() {
    if (!navigator.onLine) return 'poor';
    try {
      const start = performance.now();
      await fetch('https://www.gstatic.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
      const latency = performance.now() - start;
      if (latency < 200) return 'excellent';
      if (latency < 500) return 'good';
      return 'poor';
    } catch {
      return 'poor';
    }
  }

  // Helper: Type text with typing effect
  async function typeText(element, text, speed = 30) {
    element.textContent = '';
    element.classList.add('typing');
    for (const char of text) {
      element.textContent += char;
      await new Promise(r => setTimeout(r, speed));
    }
    element.classList.remove('typing');
  }

  // Helper: Show connection check feedback before refinement
  // Returns true if connection OK, false if offline (blocks refinement)
  async function showConnectionFeedback() {
    obsLog('info', 'Starting connection check');
    stopButtonArea.classList.add('visible');
    loader.classList.add('visible'); // Start progress bar immediately

    // Show feedback, hide stop button during connection check
    btnStop.style.display = 'none';
    feedbackEl.style.display = 'block';

    await typeText(feedbackEl, 'Checking internet connection...');
    const quality = await checkConnection();
    const labels = { excellent: 'Excellent', good: 'Good', poor: 'Poor' };
    obsLog('info', 'Connection check complete', { quality });

    await new Promise(r => setTimeout(r, 400));

    // EARLY EXIT: Block refinement if completely offline
    if (!navigator.onLine) {
      obsLog('warn', 'User is offline - blocking refinement');
      await typeText(feedbackEl, 'No internet connection detected');
      await new Promise(r => setTimeout(r, 600));
      await typeText(feedbackEl, 'Please connect to the internet and try again.');

      // Hide loader and stop area since we're not proceeding
      loader.classList.remove('visible');
      stopButtonArea.classList.remove('visible');

      // Keep feedback visible for a moment, then clear
      await new Promise(r => setTimeout(r, 2000));
      feedbackEl.textContent = '';
      feedbackEl.style.display = 'none';

      return false; // Signal to caller: do not proceed with refinement
    }

    await typeText(feedbackEl, `${labels[quality]} internet connection detected`);

    await new Promise(r => setTimeout(r, 600));
    await typeText(feedbackEl, 'Starting refinement process...');

    await new Promise(r => setTimeout(r, 400));

    // Hide feedback, show stop button during refinement
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';
    btnStop.style.display = 'block';

    return true; // Signal to caller: proceed with refinement
  }

  // Get active textarea based on current tab
  const getActiveTextarea = () => {
    return state.activeTab === 'original' ? originalTextarea : refinedTextarea;
  };

  // Tab switching
  const switchTab = (tabName) => {
    state.activeTab = tabName;
    tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.tab === tabName));
    panels.forEach(p => p.classList.toggle('hidden', p.dataset.panel !== tabName));

    // Update diff view when switching to diff tab
    if (tabName === 'diff') {
      diffViewEl.innerHTML = generateDiffHTML(originalTextarea.value, refinedTextarea.value);
    }

    // Disable Refine button on Diff tab to prevent accidental re-refinement
    if (btnReRefine) {
      btnReRefine.disabled = tabName === 'diff' || !state.hasApiKey;
    }

    // Update char count for active textarea
    updateCharCount();

    // Ensure footer buttons respect API key status on tab switch
    updateEmptyState();
  };

  // Simple diff generator - word-level comparison with HTML highlighting
  const generateDiffHTML = (original, refined) => {
    if (!original || !refined) return '<em>No changes to display</em>';

    // Split into words for comparison
    const origWords = original.split(/\s+/);
    const refWords = refined.split(/\s+/);

    let html = '';
    const maxLen = Math.max(origWords.length, refWords.length);

    for (let i = 0; i < maxLen; i++) {
      const origWord = origWords[i] || '';
      const refWord = refWords[i] || '';

      if (origWord === refWord) {
        html += refWord + ' ';
      } else if (!origWord && refWord) {
        html += `<span class="diff-added">${refWord}</span> `;
      } else if (origWord && !refWord) {
        html += `<span class="diff-removed">${origWord}</span> `;
      } else {
        html += `<span class="diff-removed">${origWord}</span> <span class="diff-added">${refWord}</span> `;
      }
    }
    return html;
  };

  // Update character count based on active tab
  const updateCharCount = () => {
    const activeTextarea = getActiveTextarea();
    if (charCount && activeTextarea) {
      charCount.textContent = activeTextarea.value.length;
    }
  };

  // Input listeners for both textareas
  refinedTextarea.addEventListener('input', () => {
    updateCharCount();
    updateEmptyState(); // Ensure buttons stay disabled if no API key
  });
  originalTextarea.addEventListener('input', () => {
    updateCharCount();
    updateEmptyState(); // Ensure buttons stay disabled if no API key
  });

  const updateUI = () => {
    // Per-tab navigation using separate indices
    const canOriginalPrev = state.originalIndex > 0;
    const canOriginalNext = state.originalIndex < state.pairs.length - 1;

    // For refined, map the indices of pairs that actually have refined content
    const refinedIndices = state.pairs
      .map((p, i) => p.refined !== null ? i : -1)
      .filter(i => i !== -1);

    // Find where the current refinedIndex sits in the list of available refined prompts
    const currentRefinedPos = refinedIndices.indexOf(state.refinedIndex);

    // Enable prev/next only if we can move in the refinedIndices list
    // If currentRefinedPos is -1 (not found), disable buttons
    const canRefinedPrev = currentRefinedPos > 0;
    const canRefinedNext = currentRefinedPos !== -1 && currentRefinedPos < refinedIndices.length - 1;

    // Rollback button (go to previous pair from current pairIndex)
    const canRollback = state.pairIndex > 0;
    btnRollback.disabled = !state.hasApiKey || !canRollback;

    // Chevron buttons - navigate within each tab independently
    if (navPrevOriginal) navPrevOriginal.disabled = !canOriginalPrev;
    if (navNextOriginal) navNextOriginal.disabled = !canOriginalNext;
    if (navPrevRefined) navPrevRefined.disabled = !canRefinedPrev;
    if (navNextRefined) navNextRefined.disabled = !canRefinedNext;

    // Arrow buttons: Enable based on whether the CURRENT pair has the other version
    // nav-to-refined: enabled only if the pair at originalIndex has a refined version
    const currentOriginalPair = state.pairs[state.originalIndex];
    const canGoToRefined = currentOriginalPair && currentOriginalPair.refined !== null;

    // nav-to-original: enabled only if the pair at refinedIndex exists (always has rough)
    const currentRefinedPair = state.pairs[state.refinedIndex];
    const canGoToOriginal = currentRefinedPair !== undefined;

    if (navToRefined) navToRefined.disabled = !canGoToRefined;
    if (navToOriginal) navToOriginal.disabled = !canGoToOriginal;

    updateCharCount();
  };

  // Update empty state visibility based on content and API key status
  const updateEmptyState = () => {
    if (!emptyStateEl) return;

    const hasContent = originalTextarea.value.trim().length > 0 ||
      refinedTextarea.value.trim().length > 0 ||
      state.pairs.length > 0;

    // Disable/enable footer buttons based on API key status
    const footerButtonsDisabled = !state.hasApiKey;
    btnRollback.disabled = footerButtonsDisabled || (state.hasApiKey && state.pairIndex <= 0);
    btnReRefine.disabled = footerButtonsDisabled || state.activeTab === 'diff';
    btnCopy.disabled = footerButtonsDisabled;
    btnSendFinal.disabled = footerButtonsDisabled;

    // Hide empty state if: has content OR API key is configured
    if (hasContent || state.hasApiKey) {
      emptyStateEl.classList.add('hidden');
    } else {
      // Only show if NO API key configured
      emptyStateEl.classList.remove('hidden');
      emptyStateEl.classList.add('api-key-missing');
      if (btnConfigureApi) btnConfigureApi.style.display = '';
    }
  };

  // Check if API key is configured
  const checkApiKey = () => {
    return new Promise(resolve => {
      if (!chrome?.runtime?.sendMessage) {
        resolve(false);
        return;
      }
      chrome.runtime.sendMessage({ type: 'CHECK_API_KEY' }, response => {
        state.hasApiKey = response?.hasKey || false;
        updateEmptyState();
        resolve(state.hasApiKey);
      });
    });
  };

  // Listen for storage changes (Model Manager enable/disable)
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && (changes.pa_models || changes.pa_active_model)) {
        // Re-check API key status when model configuration changes
        checkApiKey();
      }
    });
  }

  // Also listen for LLM_CONFIG_SAVED message (from Model Manager)
  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'LLM_CONFIG_SAVED') {
        // Re-check API key status
        checkApiKey();
      }
    });
  }

  // Configure API button click - open options page via background script
  if (btnConfigureApi) {
    btnConfigureApi.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS_PAGE' });
    });
  }

  // Helper: Save current textarea values back to the pair
  const saveCurrentPairEdits = () => {
    if (state.pairIndex >= 0 && state.pairs[state.pairIndex]) {
      state.pairs[state.pairIndex].rough = originalTextarea.value;
      // Only update refined if it was already set (don't create refined from empty)
      if (state.pairs[state.pairIndex].refined !== null) {
        state.pairs[state.pairIndex].refined = refinedTextarea.value;
      }
    }
  };

  // Navigation button handlers - navigate within each tab independently
  const navigatePrevOriginal = () => {
    if (state.originalIndex > 0) {
      state.originalIndex--;
      const pair = state.pairs[state.originalIndex];
      originalTextarea.value = pair.rough;
      obsLog('info', 'Navigate Original prev', { index: state.originalIndex });
      updateUI();
    }
  };

  const navigateNextOriginal = () => {
    if (state.originalIndex < state.pairs.length - 1) {
      state.originalIndex++;
      const pair = state.pairs[state.originalIndex];
      originalTextarea.value = pair.rough;
      obsLog('info', 'Navigate Original next', { index: state.originalIndex });
      updateUI();
    }
  };

  const navigatePrevRefined = () => {
    // Only navigate through pairs that have refined content
    let targetIndex = state.refinedIndex - 1;
    while (targetIndex >= 0 && state.pairs[targetIndex].refined === null) {
      targetIndex--;
    }
    if (targetIndex >= 0) {
      state.refinedIndex = targetIndex;
      refinedTextarea.value = state.pairs[state.refinedIndex].refined;
      obsLog('info', 'Navigate Refined prev', { index: state.refinedIndex });
      updateUI();
    }
  };

  const navigateNextRefined = () => {
    // Only navigate through pairs that have refined content
    let targetIndex = state.refinedIndex + 1;
    while (targetIndex < state.pairs.length && state.pairs[targetIndex].refined === null) {
      targetIndex++;
    }
    if (targetIndex < state.pairs.length) {
      state.refinedIndex = targetIndex;
      refinedTextarea.value = state.pairs[state.refinedIndex].refined;
      obsLog('info', 'Navigate Refined next', { index: state.refinedIndex });
      updateUI();
    }
  };

  // Attach nav button handlers
  if (navPrevOriginal) navPrevOriginal.onclick = navigatePrevOriginal;
  if (navNextOriginal) navNextOriginal.onclick = navigateNextOriginal;
  if (navPrevRefined) navPrevRefined.onclick = navigatePrevRefined;
  if (navNextRefined) navNextRefined.onclick = navigateNextRefined;

  // Pair navigation handlers - switch to the MATCHING pair in the other tab
  if (navToRefined) {
    navToRefined.onclick = () => {
      // Get the pair at the current originalIndex and show its refined version
      const currentPair = state.pairs[state.originalIndex];
      if (!currentPair || currentPair.refined === null) {
        obsLog('info', 'No refined version for this pair');
        return;
      }

      obsLog('info', 'Navigate to refined version of current pair', {
        originalIndex: state.originalIndex
      });

      // Sync refinedIndex to match the current originalIndex
      // Only update textarea if the index changed (navigating to different pair)
      const indexChanged = state.refinedIndex !== state.originalIndex;
      state.refinedIndex = state.originalIndex;
      if (indexChanged) {
        refinedTextarea.value = currentPair.refined;
      }

      // Sync expanded/collapsed state from original to refined
      const originalContainer = originalTextarea.closest('.gemini-ext-textarea-container');
      const refinedContainer = refinedTextarea.closest('.gemini-ext-textarea-container');
      const isExpanded = originalContainer?.classList.contains('is-fullscreen');

      if (isExpanded) {
        refinedContainer?.classList.add('is-fullscreen');
      } else {
        refinedContainer?.classList.remove('is-fullscreen');
      }

      // Sync expand/collapse button icons
      const refinedExpandBtn = refinedContainer?.querySelector('.gemini-ext-expand-btn');
      if (refinedExpandBtn) {
        const expandIcon = refinedExpandBtn.querySelector('.expand-icon');
        const collapseIcon = refinedExpandBtn.querySelector('.collapse-icon');
        if (expandIcon) expandIcon.style.display = isExpanded ? 'none' : '';
        if (collapseIcon) collapseIcon.style.display = isExpanded ? '' : 'none';
      }

      state.showingPair = true;
      switchTab('refined');
      updateUI();
    };
  }

  if (navToOriginal) {
    navToOriginal.onclick = () => {
      // Get the pair at the current refinedIndex and show its original version
      const currentPair = state.pairs[state.refinedIndex];
      if (!currentPair) {
        obsLog('info', 'No original version for this pair');
        return;
      }

      obsLog('info', 'Navigate to original version of current pair', {
        refinedIndex: state.refinedIndex
      });

      // Sync originalIndex to match the current refinedIndex
      // Only update textarea if the index changed (navigating to different pair)
      const indexChanged = state.originalIndex !== state.refinedIndex;
      state.originalIndex = state.refinedIndex;
      if (indexChanged) {
        originalTextarea.value = currentPair.rough;
      }

      // Sync expanded/collapsed state from refined to original
      const originalContainer = originalTextarea.closest('.gemini-ext-textarea-container');
      const refinedContainer = refinedTextarea.closest('.gemini-ext-textarea-container');
      const isExpanded = refinedContainer?.classList.contains('is-fullscreen');

      if (isExpanded) {
        originalContainer?.classList.add('is-fullscreen');
      } else {
        originalContainer?.classList.remove('is-fullscreen');
      }

      // Sync expand/collapse button icons
      const originalExpandBtn = originalContainer?.querySelector('.gemini-ext-expand-btn');
      if (originalExpandBtn) {
        const expandIcon = originalExpandBtn.querySelector('.expand-icon');
        const collapseIcon = originalExpandBtn.querySelector('.collapse-icon');
        if (expandIcon) expandIcon.style.display = isExpanded ? 'none' : '';
        if (collapseIcon) collapseIcon.style.display = isExpanded ? '' : 'none';
      }

      state.showingPair = true;
      switchTab('original');
      updateUI();
    };
  }

  // Tab click handlers
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // API
  const api = {
    open: (text) => {
      if (state.pairs.length === 0 && text) {
        // Create first pair with rough, no refined yet
        state.pairs = [{ rough: text, refined: null }];
        state.pairIndex = 0;
      }

      // Set textareas from current pair
      const pair = state.pairs[state.pairIndex];
      originalTextarea.value = pair ? pair.rough : (text || "");
      refinedTextarea.value = pair?.refined || "";
      state.showingPair = pair?.refined !== null;

      loader.classList.remove('visible');
      stopButtonArea.classList.remove('visible');
      btnSendFinal.disabled = false;
      btnReRefine.disabled = false;
      overlay.classList.add('open');
      switchTab('original'); // Start with original tab
      updateUI();
      // Auto-focus the textarea after a brief delay so DOM is ready
      setTimeout(() => originalTextarea.focus(), 50);
    },

    addResult: (refinedText) => {
      // Get the rough text that was sent for refinement (current originalTextarea value)
      const roughText = originalTextarea.value;

      // Check if stop was pressed - if so, show feedback but STILL display the result
      // Never discard a response - tokens are valuable
      const wasStopPressed = state.isAborted;
      if (wasStopPressed) {
        obsLog('info', 'Stop was pressed but response arrived - showing result anyway');
        // Show feedback that stop was too late
        if (feedbackEl) {
          feedbackEl.textContent = '⚡ Stop pressed late - response already received successfully.';
          feedbackEl.style.display = 'block';
          stopButtonArea.classList.add('visible');
          btnStop.style.display = 'none'; // Hide stop button when showing feedback
        }
      } else {
        // Normal completion - show success feedback
        if (feedbackEl) {
          feedbackEl.textContent = 'Prompt refined successfully';
          feedbackEl.style.display = 'block';
          stopButtonArea.classList.add('visible');
          btnStop.style.display = 'none'; // Hide stop button when showing feedback
        }
      }

      // Clean up abort controller on completion
      state.currentAbortController = null;
      state.lastRefinementPayload = null;
      state.isAborted = false;

      // Dismiss error banner on successful result
      if (errorBanner) {
        errorBanner.style.display = 'none';
      }

      // UPDATE the current pair with the refined result (don't push a new one)
      // The pair was already created by openWithLoading with refined: null
      if (state.pairs[state.pairIndex]) {
        state.pairs[state.pairIndex].refined = refinedText;
        state.pairs[state.pairIndex].rough = roughText;
        state.refinedIndex = state.pairIndex; // Sync refined index
      } else {
        // Fallback: if no current pair exists, create one
        state.pairs.push({ rough: roughText, refined: refinedText });
        state.pairIndex = state.pairs.length - 1;
        state.originalIndex = state.pairs.length - 1;
        state.refinedIndex = state.pairs.length - 1;
      }
      state.showingPair = true;

      if (overlay.classList.contains('open')) {
        // Update textareas to show the new pair
        originalTextarea.value = roughText;
        refinedTextarea.value = refinedText;
        loader.classList.remove('visible');
        // Keep stopButtonArea visible for feedback, hide the stop button
        stopButtonArea.classList.add('visible');
        btnStop.style.display = 'none';
        btnSendFinal.disabled = false;
        btnReRefine.disabled = false;
        // Enable nav-to-refined button since there's now a refined prompt
        if (navToRefined) navToRefined.disabled = false;
        // Enable nav-to-original button since there's now a matching pair
        if (navToOriginal) navToOriginal.disabled = false;
        switchTab('refined'); // Auto-switch to refined when result arrives
        refinedTextarea.focus();
      }
      updateUI();
    },

    openWithLoading: async (originalText) => {
      // Reset abort state for new refinement
      state.isAborted = false;

      // Dismiss any previous error banner
      if (errorBanner) {
        errorBanner.style.display = 'none';
      }

      // Clear feedback element
      if (feedbackEl) {
        feedbackEl.textContent = '';
        feedbackEl.style.display = 'none';
      }

      // Add new pair to existing history (preserve previous pairs)
      const newPair = { rough: originalText, refined: null };
      state.pairs.push(newPair);
      state.pairIndex = state.pairs.length - 1; // Point to the new pair
      state.originalIndex = state.pairs.length - 1; // Sync original index
      state.showingPair = false;

      originalTextarea.value = originalText;
      refinedTextarea.value = '';
      refinedTextarea.placeholder = 'Refining your prompt...';
      btnSendFinal.disabled = true;
      btnReRefine.disabled = true;
      // Disable nav-to-refined since no refined prompt exists yet
      if (navToRefined) navToRefined.disabled = true;
      // Disable nav-to-original since no matched pair exists yet
      if (navToOriginal) navToOriginal.disabled = true;
      overlay.classList.add('open');
      switchTab('original'); // Start with original when loading
      updateUI();

      // Show connection feedback with typing effect (also starts progress bar)
      // Returns false if user is offline - abort refinement
      const canProceed = await showConnectionFeedback();
      if (!canProceed) {
        obsLog('info', 'Refinement aborted - user is offline');
        return; // Don't proceed with refinement
      }
    },

    showError: (errorMessage, canRetry = true) => {
      // If user intentionally aborted, don't show error - stop button already showed feedback
      if (state.isAborted) {
        obsLog('info', 'Ignoring error display - refinement was aborted');
        loader.classList.remove('visible');
        // Keep stopButtonArea visible for the abort feedback
        return;
      }

      loader.classList.remove('visible');
      stopButtonArea.classList.remove('visible');

      // Clean up abort controller
      state.currentAbortController = null;

      // Show error in dedicated banner (never corrupt textarea)
      if (errorBanner && errorBannerMessage) {
        errorBannerMessage.textContent = errorMessage;
        errorBanner.style.display = 'flex';
      }

      // Keep textarea content intact — don't overwrite with error text
      // Restore the original prompt text if the refined textarea is empty
      const roughText = state.pairs[state.pairIndex]?.rough || '';
      if (!refinedTextarea.value.trim()) {
        refinedTextarea.value = '';
        refinedTextarea.placeholder = 'Refinement failed — click Retry or Refine to try again.';
      }

      // Disable Send (no valid refined prompt to send), enable Refine for retry
      btnSendFinal.disabled = true;
      btnReRefine.disabled = false;
      switchTab('refined'); // Show refined tab
    },

    close: () => overlay.classList.remove('open'),

    resetState: () => {
      state.originalText = "";
      state.history = [];
      state.historyIndex = -1;
      state.activeTab = 'original';
      originalTextarea.value = "";
      refinedTextarea.value = "";
      loader.classList.remove('visible');
      stopButtonArea.classList.remove('visible');
    },

    get state() { return state; },
    set state(newState) { Object.assign(state, newState); },

    onSend: null,
  };

  // Helper: Dismiss error banner
  const dismissErrorBanner = () => {
    if (errorBanner) {
      errorBanner.style.display = 'none';
    }
  };

  // Error banner retry button handler
  if (btnErrorRetry) {
    btnErrorRetry.onclick = () => {
      obsLog('info', 'Error banner retry clicked');
      dismissErrorBanner();
      // Trigger re-refinement using the original prompt text
      btnReRefine.click();
    };
  }

  // Event Handlers
  btnClose.onclick = () => {
    obsLog('info', 'Modal close button clicked');
    // Just hide modal - preserve history for next open
    api.close();
  };

  // Stop button - cancel refinement and allow editing raw prompt
  // Uses 2-second delay to check if a response existed or arrived
  btnStop.onclick = () => {
    obsLog('info', 'Stop refinement button clicked');

    // Capture if there's already a response in textarea at stop time
    const hadResponseAtStop = refinedTextarea.value.trim().length > 0;

    // Set aborted flag - callback will store any late response
    state.isAborted = true;
    state.lateResponse = null;

    // Send STOP_REFINEMENT message to background to abort the actual fetch
    chrome.runtime.sendMessage({ type: 'STOP_REFINEMENT' }, (response) => {
      obsLog('info', 'Stop refinement response', response);
    });

    // Also abort local controller if present
    if (state.currentAbortController) {
      state.currentAbortController.abort();
      state.currentAbortController = null;
      obsLog('info', 'Local abort controller triggered');
    }

    loader.classList.remove('visible');
    // Ensure stopButtonArea stays visible for feedback, just hide the stop button
    stopButtonArea.classList.add('visible');
    btnStop.style.display = 'none';

    // Show temporary feedback while waiting
    if (feedbackEl) {
      feedbackEl.textContent = 'Stopping...';
      feedbackEl.style.display = 'block';
    }

    // Wait 2 seconds, then determine the right scenario
    setTimeout(() => {
      // Check if response existed at stop time OR arrived during wait
      const hasLateResponse = state.lateResponse?.refined;
      const hasResponseNow = refinedTextarea.value.trim().length > 0;

      if (hadResponseAtStop || hasLateResponse || hasResponseNow) {
        // Response existed or arrived - stop was too late
        obsLog('info', 'Stop pressed late - response exists', {
          hadResponseAtStop,
          hasLateResponse: !!hasLateResponse,
          hasResponseNow
        });
        feedbackEl.textContent = 'Response already received.';

        // If late response arrived during wait, show it
        if (hasLateResponse && !hadResponseAtStop) {
          api.addResult(state.lateResponse.refined);
        }
      } else {
        // No response at any point - stop was successful
        obsLog('info', 'Stop was successful - no response received');
        feedbackEl.textContent = 'Refinement Stopped.';
        refinedTextarea.placeholder = 'Click "Refine" to start a new refinement.';
      }

      // Enable buttons after delay
      btnSendFinal.disabled = false;
      btnReRefine.disabled = false;

      // Reset state
      state.isAborted = false;
      state.lateResponse = null;
    }, 2000);
  };

  // Send: Pastes refined prompt and triggers default send
  btnSendFinal.onclick = () => {
    const text = refinedTextarea.value;
    obsLog('info', 'Send final prompt clicked', { charCount: text.length });
    api.close();
    // Call triggerNativeSend directly instead of relying on callback
    if (text.trim()) {
      triggerNativeSend(text);
    }
  };

  // Rollback: Go back to previous refined prompt
  btnRollback.onclick = () => {
    if (state.historyIndex > 0) {
      obsLog('info', 'Rollback to previous version', { historyIndex: state.historyIndex - 1 });
      state.historyIndex--;
      refinedTextarea.value = state.history[state.historyIndex];
      updateUI();
    }
  };

  // Copy: Copy text to clipboard with feedback
  btnCopy.onclick = async () => {
    const text = refinedTextarea.value;
    if (!text.trim()) return;

    obsLog('info', 'Copy to clipboard clicked', { charCount: text.length });
    try {
      await navigator.clipboard.writeText(text);
      const originalHTML = btnCopy.innerHTML;
      btnCopy.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
      btnCopy.classList.add('copied');
      setTimeout(() => {
        btnCopy.innerHTML = originalHTML;
        btnCopy.classList.remove('copied');
      }, 2000);
    } catch (err) {
      obsLog('error', 'Copy to clipboard failed', { error: err.message });
    }
  };

  // Re-Refine: Refine the current text again (tab-aware)
  // This creates a NEW pair in history, preserving navigation
  btnReRefine.onclick = async () => {
    // Dismiss error banner when starting new refinement
    dismissErrorBanner();

    // Get text from current tab: Raw Prompt or Refined Prompt (not Differences)
    let currentContent;
    const wasOnRefinedTab = state.activeTab === 'refined';

    if (state.activeTab === 'original') {
      currentContent = originalTextarea.value;
    } else {
      // Use refined textarea content, but fall back to the original prompt
      // if the refined textarea is empty (e.g., after an error)
      currentContent = refinedTextarea.value.trim()
        ? refinedTextarea.value
        : (state.pairs[state.pairIndex]?.rough || originalTextarea.value);
    }

    if (!currentContent.trim()) return;

    obsLog('info', 'Refine button clicked', { activeTab: state.activeTab, charCount: currentContent.length });

    // Reset abort flag for new refinement
    state.isAborted = false;

    // Create a NEW pair for this refinement (preserves history for navigation)
    const newPair = { rough: currentContent, refined: null };
    state.pairs.push(newPair);
    state.pairIndex = state.pairs.length - 1;
    state.originalIndex = state.pairs.length - 1;

    // When re-refining from Refined Prompt tab, switch to Raw Prompt tab
    // and show the edited text as the new "rough" prompt
    if (wasOnRefinedTab) {
      originalTextarea.value = currentContent;
      refinedTextarea.value = '';
      refinedTextarea.placeholder = 'Refining your prompt...';
      switchTab('original');
    }

    btnSendFinal.disabled = true;
    btnReRefine.disabled = true;

    // Show connection feedback with typing effect (also starts progress bar)
    // Returns false if user is offline - abort refinement
    const canProceed = await showConnectionFeedback();
    if (!canProceed) {
      obsLog('info', 'Refinement aborted - user is offline');
      btnReRefine.disabled = false; // Re-enable button so user can try again
      return; // Don't proceed with refinement
    }

    // Persona is fetched by background.js from memory layer (synthesized persona)
    // Content script doesn't need to fetch it - just pass empty string
    const persona = '';
    const context = typeof getChatHistory === 'function' ? getChatHistory() : [];
    const previousPrompts = typeof getPreviousPromptsWithRatings === 'function'
      ? getPreviousPromptsWithRatings(5)
      : [];

    chrome.runtime.sendMessage(
      { type: 'REFINE_PROMPT', payload: { text: currentContent, persona, context, previousPrompts } },
      (response) => {
        obsLog('info', 'Refinement response received', {
          success: !!response?.refined,
          aborted: !!response?.aborted,
          stopPressed: state.isAborted
        });

        // If Stop was pressed, store response for the 2-second delay check
        if (state.isAborted) {
          obsLog('info', 'Stop was pressed - storing response for delayed check');
          state.lateResponse = response;
          loader.classList.remove('visible');
          // Don't process now - Stop button's setTimeout will handle it
          return;
        }

        // Normal flow (no stop pressed)
        loader.classList.remove('visible');
        stopButtonArea.classList.remove('visible');
        btnSendFinal.disabled = false;
        btnReRefine.disabled = false;

        if (response?.refined) {
          api.addResult(response.refined);
        } else if (response?.error) {
          api.showError(response.error);
        }
      }
    );

  };

  // REMOVED: Click on backdrop no longer closes modal
  // Only close button and keyboard shortcuts can close

  // Keyboard shortcuts for modal toggle: ESC, Ctrl+M, Alt+M
  document.addEventListener('keydown', (e) => {
    const isOpen = overlay.classList.contains('open');

    // ESC key - toggle modal (if modal exists with content)
    if (e.key === 'Escape') {
      // If modal is open and textarea is expanded, collapse it first and switch to its tab
      if (isOpen) {
        const expandedContainer = overlay.querySelector('.gemini-ext-textarea-container.is-fullscreen');
        if (expandedContainer) {
          // Find which panel/tab this container belongs to
          const panel = expandedContainer.closest('.gemini-ext-content-panel');
          const tabName = panel?.dataset?.panel;

          // Switch to that tab for visual feedback
          if (tabName) {
            switchTab(tabName);
          }

          // Collapse the textarea
          expandedContainer.classList.remove('is-fullscreen');
          const expandIcon = expandedContainer.querySelector('.expand-icon');
          const collapseIcon = expandedContainer.querySelector('.collapse-icon');
          if (expandIcon) expandIcon.style.display = 'block';
          if (collapseIcon) collapseIcon.style.display = 'none';
          return; // Don't toggle modal
        }
      }

      // Toggle modal - preserve state (don't reset)
      if (isOpen) {
        api.close();
      } else {
        // Respect the refine toggle state - if toggle is off, ignore keyboard shortcut
        const isRefineEnabled = localStorage.getItem('gemini_refine_active') === 'true';
        if (!isRefineEnabled) {
          obsLog('info', 'Escape ignored for modal open - refine toggle is off');
          return;
        }
        // Open modal (even without content - user can type directly)
        overlay.classList.add('open');
        checkApiKey(); // Check API key and update empty state
        updateEmptyState();
      }
      return;
    }

    // Ctrl+M (Windows/Linux) or Cmd+M (Mac) - toggle modal
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyM') {
      e.preventDefault();
      e.stopPropagation();

      // Respect the refine toggle state - if toggle is off, ignore keyboard shortcut
      const isRefineEnabled = localStorage.getItem('gemini_refine_active') === 'true';
      if (!isRefineEnabled && !isOpen) {
        obsLog('info', 'Ctrl+M ignored - refine toggle is off');
        return;
      }

      if (isOpen) {
        api.close();
      } else {
        // Open modal (even without content - user can type directly)
        overlay.classList.add('open');
        checkApiKey(); // Check API key and update empty state
        updateEmptyState();
      }
    }
  });

  // ========================================================================
  // FOCUS TRAPPING (Blindspot 9 Fix)
  // ========================================================================
  // Trap Tab key focus within the modal when it's open for accessibility
  // This prevents users from accidentally tabbing out of the modal
  // ========================================================================

  overlay.addEventListener('keydown', (e) => {
    // Only trap focus when modal is open
    if (!overlay.classList.contains('open')) return;

    // Only handle Tab key
    if (e.key !== 'Tab') return;

    // Get all focusable elements within the modal
    const focusableSelectors = [
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      'a[href]'
    ].join(',');

    const focusableElements = overlay.querySelectorAll(focusableSelectors);
    if (focusableElements.length === 0) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Shift+Tab: if at first element, go to last
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab: if at last element, go to first
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  });

  // Focus first focusable element when modal opens
  const originalAddOpen = overlay.classList.add.bind(overlay.classList);
  overlay.classList.add = function (...args) {
    const result = originalAddOpen(...args);
    if (args.includes('open')) {
      // Delay to allow DOM to update
      setTimeout(() => {
        const firstFocusable = overlay.querySelector(
          'textarea:not([disabled]), button:not([disabled])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
          obsLog('info', 'Focus trapped in modal');
        }
      }, 50);
    }
    return result;
  };

  // Expand button handlers for textareas
  overlay.querySelectorAll('.gemini-ext-expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const container = btn.closest('.gemini-ext-textarea-container');
      const expandIcon = btn.querySelector('.expand-icon');
      const collapseIcon = btn.querySelector('.collapse-icon');

      if (container) {
        const isExpanding = !container.classList.contains('is-fullscreen');
        container.classList.toggle('is-fullscreen');

        // Toggle SVG icons
        if (expandIcon && collapseIcon) {
          expandIcon.style.display = isExpanding ? 'none' : 'block';
          collapseIcon.style.display = isExpanding ? 'block' : 'none';
        }

        // Focus textarea when expanding
        if (isExpanding) {
          const textarea = container.querySelector('textarea');
          textarea?.focus();
        }
      }
    });
  });

  modalInstance = api;
  return api;
}

function triggerNativeSend(text) {
  const input = findChatInput();
  const sendBtn = findSendButton();
  if (!input || !sendBtn) return;

  input.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);

  input.dispatchEvent(new Event('input', { bubbles: true }));

  setTimeout(() => {
    sendBtn.click();
  }, 100);
}

function pasteToInput(text) {
  const input = findChatInput();
  if (!input) return;
  input.focus();
  document.execCommand('selectAll', false, null);
  document.execCommand('insertText', false, text);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}


// --- Main Injection ---

function injectInterface() {
  const sendBtn = findSendButton();
  const inputEl = findChatInput();

  if (!sendBtn || !inputEl) return;

  // Get the container that holds the send button (and Thinking button)
  const buttonContainer = sendBtn.parentElement;

  // Get the input container (the rounded box containing the input and buttons)
  // Try findInputContainer first, then fall back to the button container's parent
  let inputContainer = findInputContainer();
  if (!inputContainer) {
    inputContainer = buttonContainer?.parentElement;
  }

  // 1. Settings Icon - fixed positioned outside input bar to the right
  let settingsApi = null;
  const existingWrapper = document.querySelector('.gemini-ext-settings-wrapper');
  if (existingWrapper && existingWrapper._geminiApi) {
    settingsApi = existingWrapper._geminiApi;
  } else {
    if (existingWrapper) existingWrapper.remove();
    settingsApi = createSettingsIcon();
    // Append to body for fixed positioning
    document.body.appendChild(settingsApi.element);
  }

  // Update settings icon position based on input container
  // Button is 32px + model dot adds 8px below = 40px total visual height
  // Center the button itself (not the dot) with the input, then nudge up slightly
  const updateSettingsPosition = () => {
    if (!inputContainer || !settingsApi) return;
    const rect = inputContainer.getBoundingClientRect();
    settingsApi.element.style.left = `${rect.right + 12}px`;
    // Center the 32px button in the container, offset by -20 instead of -16 to raise slightly
    settingsApi.element.style.top = `${rect.top + rect.height / 2 - 20}px`;
  };

  // Initial position update
  updateSettingsPosition();

  // Update on scroll/resize
  if (!window._geminiSettingsPositionListener) {
    window.addEventListener('scroll', updateSettingsPosition, { passive: true });
    window.addEventListener('resize', updateSettingsPosition, { passive: true });
    window._geminiSettingsPositionListener = true;
  }

  // 2. Refine Toggle - Insert before the "Thinking" button
  // Based on DOM inspection: Thinking button has class .input-area-switch
  // Send button has class .send-button, both are in same container (buttonContainer)

  // Find the Thinking button using the correct class: input-area-switch
  let thinkingBtn = buttonContainer?.querySelector('button.input-area-switch');

  // Fallback: look for button containing "Thinking" text
  if (!thinkingBtn && buttonContainer) {
    const buttons = buttonContainer.querySelectorAll('button');
    for (const btn of buttons) {
      if (btn.textContent.includes('Thinking')) {
        thinkingBtn = btn;
        break;
      }
    }
  }

  // Find the trailing-actions-wrapper for proper toggle placement
  const trailingActionsWrapper = document.querySelector('.trailing-actions-wrapper');

  let toggleApi = null;
  if (trailingActionsWrapper) {
    const existingToggle = trailingActionsWrapper.querySelector('.gemini-ext-toggle-wrapper');

    if (existingToggle && existingToggle._geminiApi) {
      toggleApi = existingToggle._geminiApi;
      isToggleOn = toggleApi.getState();
      existingToggle.classList.add('visible'); // Ensure visible
    } else {
      if (existingToggle) existingToggle.remove();

      toggleApi = createRefineToggle(
        (isActive) => {
          isToggleOn = isActive;
          updateVisibility();
          // Show/hide settings icon based on toggle state
          const settingsWrapper = document.querySelector('.gemini-ext-settings-wrapper');
          if (settingsWrapper?._geminiApi?.setVisible) {
            settingsWrapper._geminiApi.setVisible(isActive);
          }
        }
      );
      isToggleOn = toggleApi.getState();

      // Sync settings visibility with initial toggle state
      if (settingsApi?.setVisible) {
        settingsApi.setVisible(isToggleOn);
      }

      // Insert toggle into trailing-actions-wrapper, before input-buttons-wrapper-bottom
      const inputButtonsWrapper = trailingActionsWrapper.querySelector('.input-buttons-wrapper-bottom');
      if (inputButtonsWrapper) {
        trailingActionsWrapper.insertBefore(toggleApi.element, inputButtonsWrapper);
      } else {
        // Fallback: append to trailing-actions-wrapper
        trailingActionsWrapper.appendChild(toggleApi.element);
      }
      obsLog('info', 'Toggle inserted into trailing-actions-wrapper', {
        hasVisible: toggleApi.element.classList.contains('visible'),
        beforeElement: inputButtonsWrapper?.className || 'append'
      });
    }
  } // Close if (trailingActionsWrapper)

  // 3. Input Intercept - Catch Enter key and native send button click
  // Remove any existing overlay from previous version
  const existingOverlay = sendBtn.querySelector('.gemini-ext-send-overlay');
  if (existingOverlay) existingOverlay.remove();

  // 3a. Keydown Interceptor - Catch Enter key
  if (!inputEl._geminiKeyInterceptor) {
    inputEl.addEventListener('keydown', async (e) => {
      // Only intercept Enter (not Shift+Enter for newline)
      if (e.key !== 'Enter' || e.shiftKey) return;

      // Only intercept when REFINE toggle is ON
      if (!isToggleOn) return;

      // Only intercept if there's text
      const text = inputEl.innerText.trim();
      if (!text) return;

      // INTERCEPT: Prevent native submission
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      obsLog('info', '[Intercept] Enter key captured, triggering refinement');
      await triggerRefinement(inputEl, null, toggleApi);
    }, { capture: true }); // capture phase to intercept before Gemini's handler

    inputEl._geminiKeyInterceptor = true;
    obsLog('info', '[Intercept] Keydown listener attached to input');
  }

  // 3b. Click Interceptor - Catch native send button click
  if (!sendBtn._geminiClickInterceptor) {
    sendBtn.addEventListener('click', async (e) => {
      // Only intercept when REFINE toggle is ON
      if (!isToggleOn) return;

      // Check if we should skip interception (e.g., when sending refined text)
      if (skipNextRefinement) {
        skipNextRefinement = false;
        console.log('[Intercept] Skipping interception - letting native send through');
        return; // Let native click through
      }

      // Only intercept if there's text
      const text = inputEl.innerText.trim();
      if (!text) return;

      // INTERCEPT: Prevent native submission
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      obsLog('info', '[Intercept] Send button click captured, triggering refinement');
      await triggerRefinement(inputEl, null, toggleApi);
    }, { capture: true }); // capture phase

    sendBtn._geminiClickInterceptor = true;
    obsLog('info', '[Intercept] Click listener attached to send button');
  }

  // Visibility Logic - Toggle always visible, settings based on toggle state
  const updateVisibility = () => {
    if (!toggleApi || !settingsApi) return;

    // Toggle is always visible
    toggleApi.element.classList.add('visible');

    // Settings only visible when toggle is ON
    if (isToggleOn) {
      settingsApi.element.classList.add('visible');
      settingsApi.setEnabled(true);
    } else {
      settingsApi.element.classList.remove('visible');
    }
  };

  // Run visibility update once
  updateVisibility();

}

// Helper to get tab ID
let cachedTabId = null;
async function getTabId() {
  if (cachedTabId) return cachedTabId;

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'GET_TAB_ID' }, (response) => {
        // Check for runtime errors (e.g., extension context invalidated)
        if (chrome.runtime.lastError) {
          console.warn('[Observer] getTabId error:', chrome.runtime.lastError.message);
          resolve(null);
          return;
        }
        cachedTabId = response?.tabId;
        console.log('[Observer] getTabId resolved:', cachedTabId);
        resolve(cachedTabId);
      });
    } catch (err) {
      console.error('[Observer] getTabId exception:', err);
      resolve(null);
    }
  });
}

// Flag to prevent re-triggering refinement when sending refined text
let skipNextRefinement = false;

/**
 * Trigger native send: paste text into Gemini's input and click send button
 * @param {string} text - The refined text to send
 */
function triggerNativeSend(text) {
  // Set flag to skip next refinement (prevents re-refining the pasted text)
  skipNextRefinement = true;
  console.log('[triggerNativeSend] Set skipNextRefinement = true');
  console.log('[triggerNativeSend] Starting with text length:', text.length);
  console.log('[triggerNativeSend] Text preview:', text.substring(0, 50) + '...');

  // Try multiple methods to find Gemini's input element
  let inputEl = findElement('chatInput');

  // Fallback: try direct selectors if findElement fails
  if (!inputEl) {
    console.log('[triggerNativeSend] findElement failed, trying direct selectors...');
    inputEl = document.querySelector('div[aria-label="Enter a prompt here"]') ||
      document.querySelector('.ql-editor.textarea') ||
      document.querySelector('div.ql-editor[role="textbox"]') ||
      document.querySelector('rich-textarea div[contenteditable="true"]');
  }

  if (!inputEl) {
    console.error('[triggerNativeSend] Could not find Gemini input element with any method');
    return;
  }

  console.log('[triggerNativeSend] Found input:', inputEl.tagName, inputEl.className);
  console.log('[triggerNativeSend] Input aria-label:', inputEl.getAttribute('aria-label'));

  // Set the text using innerText (works with Trusted Types)
  inputEl.innerText = text;
  console.log('[triggerNativeSend] Set innerText, new length:', inputEl.innerText.length);

  // Dispatch input event to trigger Gemini's reactivity
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.focus();

  // Find and click the send button after a brief delay
  setTimeout(() => {
    let sendBtn = findElement('sendButton');

    // Fallback for send button
    if (!sendBtn) {
      console.log('[triggerNativeSend] findElement failed for sendButton, trying direct selector...');
      sendBtn = document.querySelector('button.send-button') ||
        document.querySelector('button[aria-label="Send message"]');
    }

    console.log('[triggerNativeSend] Send button:', sendBtn?.tagName, 'disabled:', sendBtn?.disabled, 'class:', sendBtn?.className);

    if (sendBtn && !sendBtn.disabled) {
      console.log('[triggerNativeSend] Clicking send button');
      sendBtn.click();
    } else {
      console.warn('[triggerNativeSend] Send button not found or disabled');
    }
  }, 300);
}

// Shared refinement trigger function
async function triggerRefinement(inputEl, overlayEl, toggleApi) {
  // Check if we should skip this refinement (e.g., after sending refined text)
  if (skipNextRefinement) {
    skipNextRefinement = false;
    console.log('[triggerRefinement] Skipping refinement - skipNextRefinement was set');
    return;
  }

  obsLog('debug', '[triggerRefinement] START');
  console.log('[Observer] triggerRefinement START');

  const text = inputEl.innerText;
  if (!text.trim()) {
    obsLog('debug', '[triggerRefinement] Empty text, skipping');
    console.log('[Observer] triggerRefinement: Empty text, skipping');
    return;
  }
  obsLog('debug', '[triggerRefinement] Text captured', { length: text.length });
  console.log('[Observer] triggerRefinement: Text captured, length:', text.length);

  // Step 1: Show loading state on overlay
  obsLog('debug', '[triggerRefinement] Setting loading state');
  console.log('[Observer] triggerRefinement: Setting loading state...');
  if (overlayEl) overlayEl.classList.add('loading');

  // Step 2: Get or create modal and open it with loading state
  obsLog('debug', '[triggerRefinement] Creating/getting modal');
  console.log('[Observer] triggerRefinement: Creating modal...');
  const modal = createReviewModal();

  // IMPORTANT: Don't reset modal.state here - preserve existing pairs history
  // openWithLoading will add the new pair to state.pairs
  if (modal.state) {
    modal.state.isAborted = false; // Reset abort flag for new refinement
  }

  // Open modal showing "Refining..." state (this adds the new pair to history)
  obsLog('debug', '[triggerRefinement] Opening modal with loading');
  console.log('[Observer] triggerRefinement: Opening modal with loading state...');
  await modal.openWithLoading(text); // Wait for connection check and animation to complete

  // Set up the send callback to paste refined text and trigger native send
  modal.onSend = (finalText) => triggerNativeSend(finalText);

  // Step 3: Persona is fetched by background.js from memory layer (synthesized persona)
  // Content script doesn't need to fetch it - just pass empty string
  // Background will use: memoryData?.components?.persona_synthesizer?.current?.synthesizedPersona
  obsLog('debug', '[triggerRefinement] 👤 Persona will be fetched by background from memory layer');
  console.log('[Observer] triggerRefinement: Persona handled by background script');
  const persona = ''; // Background script handles this from memory

  // Step 4: Get chat context from scraper
  obsLog('debug', '[triggerRefinement] Getting chat context');
  console.log('[Observer] triggerRefinement: Getting chat context...');
  const context = typeof getChatHistory === 'function' ? getChatHistory() : [];
  obsLog('debug', '[triggerRefinement] Context retrieved', { contextLength: context.length });
  console.log('[Observer] triggerRefinement: Context retrieved, items:', context.length);

  // Step 5: Get previous prompts with ratings for enhanced context
  obsLog('debug', '[triggerRefinement] Getting previous prompts with ratings');
  console.log('[Observer] triggerRefinement: Getting previous prompts with ratings...');
  const previousPrompts = typeof getPreviousPromptsWithRatings === 'function'
    ? getPreviousPromptsWithRatings(5)
    : [];
  obsLog('debug', '[triggerRefinement] Previous prompts retrieved', { count: previousPrompts.length });
  console.log('[Observer] triggerRefinement: Previous prompts:', previousPrompts.length);

  // Step 6: Request refinement from background script (AFTER connection check completes)
  obsLog('debug', '[triggerRefinement] Sending REFINE_PROMPT to background');
  console.log('[Observer] triggerRefinement: Sending refinement request to background...');
  chrome.runtime.sendMessage(
    { type: 'REFINE_PROMPT', payload: { text, persona, context, previousPrompts } },
    (response) => {
      obsLog('debug', '[triggerRefinement] Response received', { hasRefined: !!response?.refined, aborted: !!response?.aborted });
      console.log('[Observer] triggerRefinement: Response received:', !!response?.refined, 'aborted:', !!response?.aborted);

      // Remove loading state from overlay
      if (overlayEl) overlayEl.classList.remove('loading');

      // If aborted by user, don't show error - stop button already showed feedback
      if (response?.aborted) {
        obsLog('info', '[triggerRefinement] Request was aborted by user - feedback already shown');
        return;
      }

      if (response?.refined) {
        obsLog('info', '[triggerRefinement] Refinement successful');
        console.log('[Observer] triggerRefinement: Refinement successful');
        // Add refined result to modal
        modal.addResult(response.refined);
      } else if (response?.error) {
        // Show actual API error message
        obsLog('error', '[triggerRefinement] API error', { error: response.error });
        console.error('[Observer] triggerRefinement: API error:', response.error);
        modal.showError(response.error);
      } else {
        obsLog('error', '[triggerRefinement] Refinement failed (unknown)');
        console.error('[Observer] triggerRefinement: Refinement failed');
        modal.showError('Refinement failed. Check your API key in settings.');
      }

      obsLog('info', '[triggerRefinement] COMPLETE');
      console.log('[Observer] triggerRefinement COMPLETE');
    }
  );
}

// Listen for keyboard shortcut from background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRIGGER_REFINE_SHORTCUT') {
    const inputEl = findChatInput();
    const toggleWrapper = document.querySelector('.gemini-ext-toggle-wrapper');
    const toggleApi = toggleWrapper?._geminiApi;

    if (inputEl && inputEl.innerText.trim()) {
      triggerRefinement(inputEl, null, toggleApi);
    }
  }

  // Split View toggle from sidepanel
  if (msg.type === 'TOGGLE_SPLIT_VIEW') {
    toggleSplitView();
  }

  // Note: REBUILD_MEMORY_REQUEST, REFRESH_RECENT_FOCUS, LLM_CONFIG_SAVED
  // are now handled by bridge/extension-bridge.js (runs earlier in ISOLATED world)
});

// ============================================================================
// Split View Mode - 50% Screen Split
// ============================================================================

let splitViewActive = false;

function toggleSplitView() {
  const existingFrame = document.getElementById('gemini-ext-split-view');

  if (existingFrame) {
    // Remove split view
    existingFrame.remove();
    document.body.style.width = '';
    document.body.style.marginRight = '';
    document.body.style.overflow = '';
    splitViewActive = false;
    console.log('[SplitView] Disabled');
  } else {
    // Create split view iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'gemini-ext-split-view';
    iframe.src = chrome.runtime.getURL('sidepanel/index.html');
    iframe.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 50vw;
      height: 100vh;
      border: none;
      border-left: 1px solid rgba(255,255,255,0.1);
      z-index: 2147483647;
      background: #1a1a2e;
    `;

    // Shrink main content to make room
    document.body.style.width = '50vw';
    document.body.style.marginRight = '50vw';
    document.body.style.overflow = 'hidden';

    document.body.appendChild(iframe);
    splitViewActive = true;
    console.log('[SplitView] Enabled');
  }
}

// --- Init ---
// CSS is loaded via manifest.json
const observer = new MutationObserver(() => {
  injectInterface();
});
observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectInterface, 1500);

// Initialize modal early so keyboard shortcuts work immediately
setTimeout(() => {
  if (typeof window.GeminiTemplates !== 'undefined') {
    createReviewModal();
    obsLog('info', 'Modal initialized for keyboard shortcuts');
  }
}, 2000);
