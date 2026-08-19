/**
 * @fileoverview HTML Templates for Extension UI Components
 * 
 * Centralized template definitions for the Gemini extension's UI components.
 * Extracted into a separate module for better maintainability, testability,
 * and separation of concerns.
 * 
 * @description
 * This module provides HTML template functions that return complete UI
 * component markup as strings. Using template functions rather than inline
 * HTML provides several benefits:
 * - Type checking on function calls
 * - Easier testing of template output
 * - Single source of truth for UI structure
 * - Easier theme/style modifications
 * 
 * Template Components:
 * - Review Modal: The main prompt refinement interface
 * 
 * @module content/templates
 * 
 * @example
 * // Get the modal template
 * const modalHtml = GeminiTemplates.getReviewModalTemplate();
 * document.body.insertAdjacentHTML('beforeend', modalHtml);
 */

// ============================================================================
// SECTION 1: Review Modal Template
// ============================================================================

/**
 * Generate the HTML for the Prompt Refinement Review Modal
 * 
 * @function getReviewModalTemplate
 * @returns {string} Complete HTML string for the modal component
 * 
 * @description
 * Creates the main refinement modal with:
 * 
 * **Header Section:**
 * - Title with sparkle icon
 * - Close button (X)
 * 
 * **Tab Navigation:**
 * - Raw Prompt tab: View/edit original prompt
 * - Refined Prompt tab: View/edit AI-refined version  
 * - Differences tab: Side-by-side diff view
 * 
 * **Content Panels (one per tab):**
 * - Textarea for prompt editing
 * - Navigation controls (prev/next version)
 * - Expand/collapse buttons
 * 
 * **Status Bar:**
 * - Refinement feedback messages
 * - Stop button for canceling refinement
 * - Character count display
 * 
 * **Loading Indicator:**
 * - Animated progress bar during LLM calls
 * 
 * **Footer Actions:**
 * - Revert: Undo to previous version
 * - Refine: Request AI refinement
 * - Copy: Copy current text to clipboard
 * - Send: Send refined prompt to Gemini
 * 
 * **Element IDs for JavaScript hooks:**
 * - #original-textarea: Raw prompt editor
 * - #refined-textarea: Refined prompt editor
 * - #diff-view: Diff display container
 * - #btn-re-refine: Refine button
 * - #btn-copy: Copy button
 * - #btn-send-final: Send button
 * - #btn-rollback: Revert button
 * - #btn-stop-refine: Stop button
 * - #loading-indicator: Progress container
 * - #refinement-feedback: Status message area
 * - #char-count: Character count display
 * - #empty-state-guidance: Empty state container
 * - #btn-configure-api: API key configuration button
 * 
 * **Navigation Elements:**
 * - #nav-to-refined: Jump to refined tab
 * - #nav-to-original: Jump to original tab
 * - #nav-prev-original: Previous original version
 * - #nav-next-original: Next original version
 * - #nav-prev-refined: Previous refined version
 * - #nav-next-refined: Next refined version
 * 
 * @example
 * const modal = getReviewModalTemplate();
 * document.getElementById('modal-container').innerHTML = modal;
 */
const getReviewModalTemplate = () => `
  <!-- ====================================================================== -->
  <!-- REVIEW MODAL - Main Prompt Refinement Interface                        -->
  <!-- ====================================================================== -->
  <div class="gemini-ext-modal">
    
    <!-- ================================================================== -->
    <!-- HEADER: Title and close button                                      -->
    <!-- ================================================================== -->
    <div class="gemini-ext-modal-header">
      <div class="gemini-ext-modal-title-group">
        <span class="gemini-ext-modal-icon">*</span>
        <span class="gemini-ext-modal-title">Prompt Refinement</span>
      </div>
      <button class="gemini-ext-modal-close" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>
    
    <!-- ================================================================== -->
    <!-- TABS: Navigation between Original, Refined, and Diff views         -->
    <!-- ================================================================== -->
    <div class="gemini-ext-modal-tabs">
      <button class="gemini-ext-tab" data-tab="original" aria-selected="true">Raw Prompt</button>
      <button class="gemini-ext-tab" data-tab="refined">Refined Prompt</button>
      <button class="gemini-ext-tab" data-tab="diff">Differences</button>
    </div>
    
    <!-- ================================================================== -->
    <!-- BODY: Tab content panels                                            -->
    <!-- ================================================================== -->
    <div class="gemini-ext-modal-body">
      
      <!-- Empty state guidance - shown when no API key configured -->
      <div id="empty-state-guidance" class="gemini-ext-empty-state">
        <button id="btn-configure-api" class="gemini-ext-btn gemini-ext-btn-ghost" style="display: none;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Configure API Key
        </button>
      </div>
      
      <!-- Error banner - shown on API errors instead of corrupting textarea -->
      <div id="refinement-error-banner" class="gemini-ext-error-banner" style="display: none;">
        <div class="gemini-ext-error-banner-content">
          <svg class="gemini-ext-error-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div class="gemini-ext-error-text">
            <span class="gemini-ext-error-title">Refinement failed</span>
            <span class="gemini-ext-error-message" id="error-banner-message"></span>
          </div>
        </div>
        <button class="gemini-ext-btn gemini-ext-btn-ghost gemini-ext-error-retry" id="btn-error-retry">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
          </svg>
          Retry
        </button>
      </div>
      
      <!-- ============================================================== -->
      <!-- ORIGINAL TAB: Raw prompt editing                                -->
      <!-- ============================================================== -->
      <div class="gemini-ext-content-panel" data-panel="original">
        <div class="gemini-ext-textarea-container">
          <!-- Editable textarea for original/raw prompt -->
          <textarea class="gemini-ext-input-area" id="original-textarea" spellcheck="false" placeholder="Enter your prompt here..."></textarea>
          
          <!-- Control buttons positioned at textarea corner -->
          <div class="gemini-ext-textarea-controls">
            <!-- Jump to refined version button -->
            <button class="gemini-ext-nav-btn gemini-ext-pair-btn" id="nav-to-refined" title="Go to refined version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 12h16M14 6l6 6-6 6"/>
              </svg>
            </button>
            <!-- Previous version in history -->
            <button class="gemini-ext-nav-btn" id="nav-prev-original" title="Previous version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <!-- Next version in history -->
            <button class="gemini-ext-nav-btn" id="nav-next-original" title="Next version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </button>
            <!-- Expand/collapse textarea -->
            <button class="gemini-ext-expand-btn" data-target="original-textarea" title="Expand">
              <svg class="expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              <svg class="collapse-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <polyline points="4 14 10 14 10 20"/>
                <polyline points="20 10 14 10 14 4"/>
                <line x1="14" y1="10" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- ============================================================== -->
      <!-- REFINED TAB: AI-refined prompt viewing/editing                  -->
      <!-- ============================================================== -->
      <div class="gemini-ext-content-panel hidden" data-panel="refined">
        <div class="gemini-ext-textarea-container">
          <!-- Editable textarea for refined prompt -->
          <textarea class="gemini-ext-input-area" id="refined-textarea" spellcheck="false" placeholder="Refined prompt will appear here..."></textarea>
          
          <div class="gemini-ext-textarea-controls">
            <!-- Jump to original version button -->
            <button class="gemini-ext-nav-btn gemini-ext-pair-btn" id="nav-to-original" title="Go to original version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 12H4M10 18l-6-6 6-6"/>
              </svg>
            </button>
            <!-- Previous refined version -->
            <button class="gemini-ext-nav-btn" id="nav-prev-refined" title="Previous version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <!-- Next refined version -->
            <button class="gemini-ext-nav-btn" id="nav-next-refined" title="Next version" disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 6l6 6-6 6"/>
              </svg>
            </button>
            <!-- Expand/collapse textarea -->
            <button class="gemini-ext-expand-btn" data-target="refined-textarea" title="Expand">
              <svg class="expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              <svg class="collapse-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <polyline points="4 14 10 14 10 20"/>
                <polyline points="20 10 14 10 14 4"/>
                <line x1="14" y1="10" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- ============================================================== -->
      <!-- DIFF TAB: Visual difference comparison                          -->
      <!-- ============================================================== -->
      <div class="gemini-ext-content-panel hidden" data-panel="diff">
        <div class="gemini-ext-textarea-container">
          <!-- Read-only diff view with HTML highlighting -->
          <div class="gemini-ext-input-area" id="diff-view" style="overflow-y: auto; white-space: pre-wrap;"><em>No changes to display</em></div>
          
          <div class="gemini-ext-textarea-controls">
            <!-- Expand/collapse diff view -->
            <button class="gemini-ext-expand-btn" data-target="diff-view" title="Expand">
              <svg class="expand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
              <svg class="collapse-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none">
                <polyline points="4 14 10 14 10 20"/>
                <polyline points="20 10 14 10 14 4"/>
                <line x1="14" y1="10" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- ================================================================== -->
    <!-- STATUS BAR: Feedback messages, stop button, and character count    -->
    <!-- ================================================================== -->
    <div class="gemini-ext-status-bar">
      <div id="stop-button-area" class="gemini-ext-stop-area">
        <!-- Feedback message display (e.g., "Refining...", "Done!") -->
        <span id="refinement-feedback" class="gemini-ext-feedback"></span>
        <!-- Stop button - shown during active refinement -->
        <button class="gemini-ext-btn gemini-ext-btn-stop" id="btn-stop-refine" style="display: none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="0" y="8" width="15" height="15" rx="15"/>
          </svg>
          Stop
        </button>
      </div>
      <!-- Character count for current textarea -->
      <div class="gemini-ext-char-count">
        <span id="char-count">0</span> characters
      </div>
    </div>
    
    <!-- ================================================================== -->
    <!-- LOADING INDICATOR: Animated progress bar during LLM calls          -->
    <!-- ================================================================== -->
    <div id="loading-indicator" class="gemini-ext-progress-container">
      <div class="gemini-ext-progress-bar">
        <div class="gemini-ext-progress-track"></div>
      </div>
    </div>
    
    <!-- ================================================================== -->
    <!-- FOOTER: Action buttons                                              -->
    <!-- ================================================================== -->
    <div class="gemini-ext-modal-footer">
      <!-- Revert to previous version -->
      <button class="gemini-ext-btn gemini-ext-btn-ghost" id="btn-rollback" disabled title="Revert to previous version">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        Revert
      </button>
      <!-- Request AI refinement -->
      <button class="gemini-ext-btn gemini-ext-btn-ghost" id="btn-re-refine" title="Refine the current text">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        Refine
      </button>
      <!-- Copy current text to clipboard -->
      <button class="gemini-ext-btn gemini-ext-btn-secondary" id="btn-copy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy
      </button>
      <!-- Send refined prompt to Gemini -->
      <button class="gemini-ext-btn gemini-ext-btn-primary" id="btn-send-final">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
        Send
      </button>
    </div>
  </div>
`;

// ============================================================================
// SECTION 2: Module Exports
// ============================================================================
// Export templates for use in other modules. In content script context,
// templates are attached to window.GeminiTemplates for global access.
// ============================================================================

// Browser environment - attach to window for global access
if (typeof window !== 'undefined') {
  /**
   * @namespace GeminiTemplates
   * @description Global namespace for template functions
   */
  window.GeminiTemplates = {
    getReviewModalTemplate
  };
}

// Log ready state
console.log('[Templates] UI templates loaded');
