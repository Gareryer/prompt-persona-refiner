import { resolveChatbotAdapter } from '../src/adapters/chatbots/registry';
import { sendRpcMessage } from '../src/lib/messaging/client';

export default defineContentScript({
  matches: [
    'https://gemini.google.com/*',
    'https://chatgpt.com/*',
    'https://chat.openai.com/*',
    'https://claude.ai/*',
    'https://chat.deepseek.com/*',
    'https://grok.com/*',
    'https://x.com/i/grok*',
    'https://*.meta.ai/*'
  ],
  runAt: 'document_idle',
  main(ctx) {
    const adapter = resolveChatbotAdapter();
    if (!adapter) {
      console.log('[WXT] No chatbot adapter matched for:', location.hostname);
      return;
    }

    console.log(`[WXT] Active Chatbot Adapter: ${adapter.platform.toUpperCase()} on ${location.hostname}`);

    // Listen for keyboard trigger shortcut from background
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'TRIGGER_REFINE_SHORTCUT') {
        const rawPrompt = adapter.getInputText();
        if (!rawPrompt || rawPrompt.trim().length === 0) return;

        const result = await sendRpcMessage('REFINE_PROMPT', { rawPrompt });
        if (result.success && result.refinedPrompt) {
          adapter.setInputText(result.refinedPrompt);
        }
      }
    });
  }
});
