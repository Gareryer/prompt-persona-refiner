/**
 * @fileoverview Extension Context Invalidation Detector & Cleanup
 * Ported from content/observer.js (lines 84-150)
 * @module content/context-invalidator
 */

let reloadNotificationShown = false;

export function isExtensionContextValid(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

export function showExtensionReloadNotification(): void {
  if (reloadNotificationShown || typeof document === 'undefined') return;
  reloadNotificationShown = true;

  // Cleanup injected UI
  document.querySelectorAll('#gemini-ext-split-view-container, .gemini-ext-overlay').forEach(el => el.remove());

  const toast = document.createElement('div');
  toast.id = 'gemini-ext-reload-toast';
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #181825;
    color: #cdd6f4;
    padding: 14px 20px;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    z-index: 2147483647;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #313244;
  `;

  toast.innerHTML = `
    <span>Extension was updated. Please refresh the page.</span>
    <button id="gemini-ext-refresh-btn" style="
      background: #89b4fa;
      color: #11111b;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    ">Refresh</button>
  `;

  document.body.appendChild(toast);
  toast.querySelector('#gemini-ext-refresh-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
}
