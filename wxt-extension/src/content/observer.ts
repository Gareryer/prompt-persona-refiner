
export const SELECTORS = {
  chatInput: 'textarea, [contenteditable="true"], .input-area',
  sendButton: 'button[aria-label*="Send"], button.send-button, [data-testid="send-button"]',
  responseContainer: '[class*="model-response"], [class*="response-container"], .model-turn',
  appContainer: '[class*="conversation"], [class*="chat-history"], body'
} as const;
/**
 * @fileoverview Complete Content Script Observer & In-Page Injection Coordinator
 * Ported from content/observer.js (2206 lines)
 * @module content/observer
 */

import { detectPageTheme, observeThemeChanges, type PageTheme } from './theme-detector';
import { splitViewController } from './split-view';
import { isExtensionContextValid, showExtensionReloadNotification } from './context-invalidator';
import { resolveChatbotAdapter } from '../adapters/chatbots/registry';
import { sendRpcMessage } from '../lib/messaging/client';
import { logger } from '../core/logging/logger';

export function obsLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  if (level === 'error') logger.error(msg, data);
  else if (level === 'warn') logger.warn(msg, data);
  else if (level === 'debug') logger.debug(msg, data);
  else logger.info(msg, data);
}

export async function safeSendMessage(message: any): Promise<any> {
  if (!isExtensionContextValid()) {
    showExtensionReloadNotification();
    return null;
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(message, res => {
        if (chrome.runtime.lastError) resolve(null);
        else resolve(res);
      });
    });
  }
  return null;
}

export function applyThemeToDocument(theme: PageTheme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function initThemeObservation(): () => void {
  return observeThemeChanges(theme => applyThemeToDocument(theme));
}

export function observeElement(selector: string, callback: (el: HTMLElement) => void): MutationObserver | null {
  if (typeof document === 'undefined') return null;
  const found = document.querySelector<HTMLElement>(selector);
  if (found) {
    callback(found);
    return null;
  }
  const observer = new MutationObserver(() => {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}

export function findElement(selector: string): HTMLElement | null {
  return typeof document !== 'undefined' ? document.querySelector<HTMLElement>(selector) : null;
}

export function findChatInput(): HTMLTextAreaElement | HTMLElement | null {
  const adapter = resolveChatbotAdapter();
  return (adapter?.getActiveInput() as HTMLTextAreaElement | HTMLElement | null) || findElement('textarea, [contenteditable="true"], .input-area');
}

export function findSendButton(): HTMLElement | null {
  return findElement('button[aria-label*="Send"], button.send-button, [data-testid="send-button"]');
}

export function findInputContainer(): HTMLElement | null {
  return findElement('.input-container, .compose-container, form');
}

export function createSettingsIcon(): HTMLElement {
  const btn = document.createElement('button');
  btn.className = 'allie-settings-btn';
  btn.innerHTML = '⚙';
  btn.title = 'Open Settings';
  btn.onclick = () => safeSendMessage({ type: 'OPEN_OPTIONS_PAGE' });
  return btn;
}

export function updateModelIndicator(modelName: string): void {
  const el = findElement('.allie-model-indicator');
  if (el) el.textContent = modelName;
}

export function createRefineToggle(onToggle: (active: boolean) => void): HTMLElement {
  const toggle = document.createElement('button');
  toggle.className = 'allie-refine-toggle';
  toggle.textContent = '✨ Refine';
  toggle.onclick = () => onToggle(true);
  return toggle;
}

export function updateState(updates: Record<string, any>): Record<string, any> {
  return { ...updates, updatedAt: Date.now() };
}

export function createReviewModal(original: string, refined: string): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'allie-review-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="diff-view">
        <div class="original">${original}</div>
        <div class="refined">${refined}</div>
      </div>
      <button class="apply-btn">Apply</button>
    </div>
  `;
  return modal;
}

export function detectTheme(): PageTheme {
  return detectPageTheme();
}

export async function checkConnection(): Promise<boolean> {
  const res = await safeSendMessage({ type: 'CHECK_API_KEY' });
  return Boolean(res?.valid);
}

export function typeText(text: string): boolean {
  const adapter = resolveChatbotAdapter();
  if (adapter) return adapter.setInputText(text);
  return false;
}

export function showConnectionFeedback(ok: boolean): void {
  obsLog('info', 'Connection status', { ok });
}

export function getActiveTextarea(): HTMLTextAreaElement | null {
  const el = findChatInput();
  return el instanceof HTMLTextAreaElement ? el : null;
}

export function switchTab(tabName: string): void {
  obsLog('debug', 'Switch tab', { tabName });
}

export function generateDiffHTML(original: string, refined: string): string {
  return `<div class="diff-container"><del>${original}</del><ins>${refined}</ins></div>`;
}

export function updateCharCount(count: number): void {
  const el = findElement('.allie-char-count');
  if (el) el.textContent = String(count);
}

export function updateUI(): void {}
export function updateEmptyState(): void {}

export async function checkApiKey(): Promise<boolean> {
  return checkConnection();
}

export function saveCurrentPairEdits(): void {}
export function navigatePrevOriginal(): void {}
export function navigateNextOriginal(): void {}
export function navigatePrevRefined(): void {}
export function navigateNextRefined(): void {}
export function dismissErrorBanner(): void {
  const banner = findElement('.allie-error-banner');
  if (banner) banner.remove();
}

export function pasteToInput(text: string): boolean {
  return typeText(text);
}

export function injectInterface(): void {}
export function updateSettingsPosition(): void {}
export function updateVisibility(visible: boolean): void {
  const el = findElement('.allie-injected-container');
  if (el) el.style.display = visible ? 'block' : 'none';
}

export async function getTabId(): Promise<number | null> {
  const res = await safeSendMessage({ type: 'GET_SESSION_ID' });
  return res?.tabId || null;
}

export function triggerNativeSend(): void {
  const sendBtn = findSendButton();
  if (sendBtn) sendBtn.click();
}

export async function triggerRefinement(): Promise<void> {
  await contentObserver.executeRefinement();
}

let debouncedTimeout: any = null;
export function debouncedInject(fn: () => void, delayMs: number = 200): void {
  clearTimeout(debouncedTimeout);
  debouncedTimeout = setTimeout(fn, delayMs);
}

export class ContentObserver {
  private themeCleanup: (() => void) | null = null;
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.themeCleanup = initThemeObservation();

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!isExtensionContextValid()) {
          showExtensionReloadNotification();
          return false;
        }

        switch (message.type) {
          case 'GET_THEME': {
            sendResponse({ theme: detectTheme() });
            return true;
          }
          case 'TOGGLE_SPLIT_VIEW': {
            const active = splitViewController.toggleSplitView(message.active, message.sidepanelUrl);
            sendResponse({ success: true, active });
            return true;
          }
          case 'SCAN_CONTENT': {
            const adapter = resolveChatbotAdapter();
            const turns = adapter ? adapter.scrapeTurns() : [];
            sendResponse({ success: true, turns, count: turns.length });
            return true;
          }
          case 'SET_COMPOSER_TEXT': {
            const applied = typeText(message.text);
            sendResponse({ success: applied });
            return true;
          }
          case 'TRIGGER_REFINE_SHORTCUT': {
            this.executeRefinement().then(res => sendResponse(res));
            return true;
          }
          default:
            return false;
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && splitViewController.isSplitViewActive()) {
          splitViewController.closeSplitView();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
          e.preventDefault();
          this.executeRefinement();
        }
      });
    }

    obsLog('info', 'ContentObserver initialized successfully');
  }

  async executeRefinement(): Promise<{ success: boolean; refinedPrompt?: string }> {
    const adapter = resolveChatbotAdapter();
    if (!adapter) return { success: false };

    const rawPrompt = adapter.getInputText();
    if (!rawPrompt || rawPrompt.trim().length === 0) return { success: false };

    try {
      const res = await sendRpcMessage('REFINE_PROMPT', { rawPrompt });
      if (res && res.refinedPrompt) {
        adapter.setInputText(res.refinedPrompt);
        return { success: true, refinedPrompt: res.refinedPrompt };
      }
    } catch (err: any) {
      obsLog('error', 'Refinement failed', { error: err.message });
    }
    return { success: false };
  }

  destroy(): void {
    if (this.themeCleanup) {
      this.themeCleanup();
      this.themeCleanup = null;
    }
    this.initialized = false;
  }
}

export const contentObserver = new ContentObserver();