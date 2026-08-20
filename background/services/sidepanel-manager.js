/**
 * @fileoverview Sidepanel Connection & Lifecycle Manager
 * @module background/services/sidepanel-manager
 */

import { bgLog } from './logger.js';

export const openSidepanelPorts = new Set();
export const sidepanelWindowPorts = new Map();

export function handleSidepanelConnect(port) {
  if (port.name === 'sidepanel') {
    openSidepanelPorts.add(port);
    const windowId = port.sender?.tab?.windowId;
    if (windowId) {
      sidepanelWindowPorts.set(windowId, port);
    }
    bgLog('info', 'Sidepanel port connected', { windowId });

    port.onDisconnect.addListener(() => {
      openSidepanelPorts.delete(port);
      if (windowId && sidepanelWindowPorts.get(windowId) === port) {
        sidepanelWindowPorts.delete(windowId);
      }
      bgLog('info', 'Sidepanel port disconnected', { windowId });
    });
  }
}

export function isSidepanelOpen(windowId) {
  if (windowId && sidepanelWindowPorts.has(windowId)) {
    return true;
  }
  return openSidepanelPorts.size > 0;
}

export async function toggleSidepanel(sender, sendResponse) {
  const tabId = sender.tab?.id;
  const windowId = sender.tab?.windowId;
  if (!tabId) {
    sendResponse({ success: false, error: 'No tab ID' });
    return;
  }

  try {
    const isOpen = isSidepanelOpen(windowId);

    if (isOpen) {
      await chrome.sidePanel.setOptions({ tabId, enabled: false });
      await chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel/index.html',
        enabled: true
      });
      console.log('[Background] Sidepanel closed for tab:', tabId, 'window:', windowId);
      sendResponse({ success: true, isOpen: false });
    } else {
      const openOptions = windowId ? { windowId } : { tabId };
      try {
        await chrome.sidePanel.open(openOptions);
      } catch (err) {
        await chrome.sidePanel.open({ tabId });
      }
      console.log('[Background] Sidepanel opened for tab:', tabId, 'window:', windowId);
      sendResponse({ success: true, isOpen: true });
    }
  } catch (err) {
    console.error('[Background] Toggle error:', err);
    sendResponse({ success: false, error: err.message });
  }
}

export async function toggleSplitView(message, sender, sendResponse) {
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

        await chrome.sidePanel.setOptions({
          tabId,
          path: 'sidepanel/index.html',
          enabled: true
        });

        console.log('[Background] Split view closed. Click settings icon to open sidepanel.');
        sendResponse({ success: true, splitViewActive: false });
      } else {
        console.log('[Background] Opening split view, sidepanel will close itself...');
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_SPLIT_VIEW' }).catch((err) => {
            console.warn('[Background] Failed to notify tab of split view open:', err.message);
          });
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
}
