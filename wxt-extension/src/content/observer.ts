/**
 * @fileoverview Content Script Observer & Lifecycle Coordinator
 * Ported from content/observer.js (2206 lines)
 * @module content/observer
 */

import { detectPageTheme, observeThemeChanges, type PageTheme } from './theme-detector';
import { splitViewController } from './split-view';
import { isExtensionContextValid, showExtensionReloadNotification } from './context-invalidator';
import { resolveChatbotAdapter } from '../adapters/chatbots/registry';
import { sendRpcMessage } from '../lib/messaging/client';
import { logger } from '../core/logging/logger';

export class ContentObserver {
  private themeCleanup: (() => void) | null = null;
  private initialized: boolean = false;

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Initial theme setup and listener
    this.themeCleanup = observeThemeChanges((theme) => {
      logger.info('Page theme changed', { theme });
    });

    // 2. Top-level message listener for content script actions
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (!isExtensionContextValid()) {
          showExtensionReloadNotification();
          return false;
        }

        switch (message.type) {
          case 'GET_THEME': {
            const theme = detectPageTheme();
            sendResponse({ theme });
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
            const adapter = resolveChatbotAdapter();
            if (adapter && message.text) {
              const applied = adapter.setInputText(message.text);
              sendResponse({ success: applied });
            } else {
              sendResponse({ success: false });
            }
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

    // 3. Keyboard shortcut listener (Escape to close split view / modal, Ctrl+M for shortcut)
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

    logger.info('ContentObserver initialized successfully');
  }

  async executeRefinement(): Promise<{ success: boolean; refinedPrompt?: string }> {
    const adapter = resolveChatbotAdapter();
    if (!adapter) return { success: false };

    const rawPrompt = adapter.getInputText();
    if (!rawPrompt || rawPrompt.trim().length === 0) return { success: false };

    try {
      const result = await sendRpcMessage('REFINE_PROMPT', { rawPrompt });
      if (result.success && result.refinedPrompt) {
        adapter.setInputText(result.refinedPrompt);
        return { success: true, refinedPrompt: result.refinedPrompt };
      }
    } catch (err) {
      logger.error('Prompt refinement failed in content script', { error: err });
    }

    return { success: false };
  }

  destroy(): void {
    if (this.themeCleanup) {
      this.themeCleanup();
      this.themeCleanup = null;
    }
    splitViewController.closeSplitView();
    this.initialized = false;
  }
}

export const contentObserver = new ContentObserver();
