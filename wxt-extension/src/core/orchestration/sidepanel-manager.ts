/**
 * @fileoverview Sidepanel Connection & Lifecycle Manager
 * Ported from background/services/sidepanel-manager.js
 * @module orchestration/sidepanel-manager
 */

import { bgLog } from './bg-logger';

export const openSidepanelPorts = new Set<chrome.runtime.Port>();
export const sidepanelWindowPorts = new Map<number, chrome.runtime.Port>();

export function handleSidepanelConnect(port: chrome.runtime.Port): void {
  if (port.name === 'sidepanel') {
    openSidepanelPorts.add(port);
    let resolvedWindowId = port.sender?.tab?.windowId;

    const registerWindow = (winId: number) => {
      if (winId) {
        sidepanelWindowPorts.set(winId, port);
        bgLog('info', 'Sidepanel port associated with window', { windowId: winId });
      }
    };

    if (resolvedWindowId) {
      registerWindow(resolvedWindowId);
    } else if (typeof chrome !== 'undefined' && chrome.windows?.getLastFocused) {
      chrome.windows.getLastFocused({ populate: false }).then(win => {
        if (win?.id) {
          resolvedWindowId = win.id;
          registerWindow(resolvedWindowId);
        }
      }).catch(() => {});
    }

    bgLog('info', 'Sidepanel port connected');

    port.onDisconnect.addListener(() => {
      openSidepanelPorts.delete(port);
      if (resolvedWindowId && sidepanelWindowPorts.get(resolvedWindowId) === port) {
        sidepanelWindowPorts.delete(resolvedWindowId);
      }
      bgLog('info', 'Sidepanel port disconnected', { windowId: resolvedWindowId });
    });
  }
}

export function isSidepanelOpen(windowId?: number | null): boolean {
  if (windowId && sidepanelWindowPorts.has(windowId)) {
    return true;
  }
  return openSidepanelPorts.size > 0;
}

export async function toggleSidepanel(
  sender: chrome.runtime.MessageSender,
  sendResponse: (res: any) => void
): Promise<void> {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID' });
    return;
  }

  try {
    const isOpen = isSidepanelOpen(windowId);

    if (isOpen) {
      const port = (windowId && sidepanelWindowPorts.get(windowId)) || Array.from(openSidepanelPorts)[0];
      if (port) {
        try {
          port.postMessage({ type: 'CLOSE_SIDEPANEL' });
        } catch (e: any) {
          console.warn('[Background] Failed to send CLOSE_SIDEPANEL to port:', e);
        }
      }
      chrome.runtime.sendMessage({ type: 'CLOSE_SIDEPANEL' }).catch(() => {});

      console.log('[Background] Sidepanel closed for tab:', tabId, 'window:', windowId);
      sendResponse({ success: true, isOpen: false });
    } else {
      const openOptions = windowId ? { windowId } : { tabId };
      try {
        await (chrome.sidePanel as any).open(openOptions);
      } catch {
        await (chrome.sidePanel as any).open({ tabId });
      }
      console.log('[Background] Sidepanel opened for tab:', tabId, 'window:', windowId);
      sendResponse({ success: true, isOpen: true });
    }
  } catch (err: any) {
    console.error('[Background] Toggle error:', err);
    sendResponse({ success: false, error: err.message });
  }
}

export async function toggleSplitView(
  message: { fromIframe?: boolean },
  sender: chrome.runtime.MessageSender,
  sendResponse: (res: any) => void
): Promise<void> {
  try {
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
        console.log('[Background] Closing split view...');
        chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SPLIT_VIEW' }).catch((err) => {
          console.warn('[Background] Failed to notify tab of split view close:', err.message);
        });

        await (chrome.sidePanel as any).setOptions({
          tabId,
          path: 'entrypoints/sidepanel/index.html',
          enabled: true
        });

        console.log('[Background] Split view closed. Click settings icon to open sidepanel.');
        sendResponse({ success: true, splitViewActive: false });
      } else {
        console.log('[Background] Opening split view, sidepanel will close itself...');
        setTimeout(() => {
          if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SPLIT_VIEW' }).catch((err) => {
              console.warn('[Background] Failed to notify tab of split view open:', err.message);
            });
          }
        }, 300);
        sendResponse({ success: true, splitViewActive: true });
      }
    } else {
      console.error('[Background] No tabId found for TOGGLE_SPLIT_VIEW');
      sendResponse({ success: false, error: 'No tab ID found' });
    }
  } catch (error: any) {
    console.error('[Background] TOGGLE_SPLIT_VIEW error:', error);
    sendResponse({ success: false, error: error.message });
  }
}
