/**
 * @fileoverview HTML and CSS Template Generators for Content Injections
 * Ported from content/templates.js (340 lines)
 * @module content/templates
 */

export const ContentTemplates = {
  getSplitViewFrame(url: string): string {
    return `<iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>`;
  },

  getReviewModal(originalPrompt: string, refinedPrompt: string): string {
    return `
      <div class="gemini-review-modal" style="
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
      ">
        <div style="
          background: #1e1e2e;
          color: #cdd6f4;
          width: 90%;
          max-width: 640px;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #313244;
          box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        ">
          <h3 style="margin-top: 0; font-size: 18px; color: #89b4fa;">Review Refined Prompt</h3>
          <div style="margin-bottom: 16px;">
            <label style="font-size: 12px; color: #a6adc8; font-weight: 600;">ORIGINAL</label>
            <div style="background: #181825; padding: 10px; border-radius: 6px; margin-top: 4px; font-size: 13px;">${originalPrompt}</div>
          </div>
          <div style="margin-bottom: 20px;">
            <label style="font-size: 12px; color: #a6adc8; font-weight: 600;">REFINED</label>
            <textarea id="gemini-refined-edit" style="
              width: 100%;
              min-height: 120px;
              background: #181825;
              color: #cdd6f4;
              border: 1px solid #45475a;
              border-radius: 6px;
              padding: 10px;
              font-family: inherit;
              font-size: 13px;
              margin-top: 4px;
              resize: vertical;
            ">${refinedPrompt}</textarea>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="gemini-modal-cancel" style="background: #313244; color: #cdd6f4; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancel</button>
            <button id="gemini-modal-apply" style="background: #89b4fa; color: #11111b; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Apply & Send</button>
          </div>
        </div>
      </div>
    `;
  },

  getReviewModalTemplate(): string {
    return `
      <div class="gemini-ext-modal">
        <div class="gemini-ext-modal-header">
          <div class="gemini-ext-modal-title-group">
            <span class="gemini-ext-modal-icon">*</span>
            <span class="gemini-ext-modal-title">Prompt Refinement</span>
          </div>
          <button class="gemini-ext-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="gemini-ext-modal-tabs">
          <button class="gemini-ext-tab" data-tab="original">Raw Prompt</button>
          <button class="gemini-ext-tab" data-tab="refined">Refined Prompt</button>
          <button class="gemini-ext-tab" data-tab="diff">Differences</button>
        </div>
        <div class="gemini-ext-modal-body">
          <textarea class="gemini-ext-input-area" id="original-textarea" placeholder="Enter prompt..."></textarea>
        </div>
      </div>
    `;
  }
};

export const getReviewModalTemplate = ContentTemplates.getReviewModalTemplate;
