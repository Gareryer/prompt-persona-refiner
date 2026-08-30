import { MessageDispatcherService } from '../src/services/message-dispatcher.service';

export default defineBackground(() => {
  console.log('[WXT] Background Service Worker initialized.');

  const dispatcher = new MessageDispatcherService();

  // 1. Top-Level Synchronous Message Listener (MV3 Invariant)
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type) {
      dispatcher
        .dispatch(message.type, message.payload)
        .then(response => {
          sendResponse(response);
        })
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true; // Keep channel open for async response
    }
    return false;
  });

  // 2. Action Click Listener (Universal Sidepanel / Options Router)
  browser.action.onClicked.addListener(async (tab) => {
    const isSupportedChatbot = Boolean(
      tab.id &&
      tab.url &&
      (tab.url.includes('gemini.google.com') ||
       tab.url.includes('chatgpt.com') ||
       tab.url.includes('chat.openai.com') ||
       tab.url.includes('claude.ai') ||
       tab.url.includes('chat.deepseek.com') ||
       tab.url.includes('grok.com') ||
       tab.url.includes('x.com/i/grok') ||
       tab.url.includes('meta.ai'))
    );

    if (isSupportedChatbot && tab.id) {
      try {
        await (chrome as any).sidePanel?.open({ tabId: tab.id });
      } catch (err) {
        console.warn('[WXT] Failed to open sidepanel:', err);
      }
    } else {
      browser.runtime.openOptionsPage();
    }
  });

  // 3. Command Listeners (Keyboard Shortcuts)
  browser.commands.onCommand.addListener(async (command) => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      if (command === 'trigger-refine') {
        browser.tabs.sendMessage(tab.id, { type: 'TRIGGER_REFINE_SHORTCUT' }).catch(() => {});
      } else if (command === 'open-sidepanel') {
        try {
          await (chrome as any).sidePanel?.open({ tabId: tab.id });
        } catch {}
      }
    }
  });

  // 4. Install / Update Lifecycle
  browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
      console.log('[WXT] Extension installed successfully.');
    }
  });
});
