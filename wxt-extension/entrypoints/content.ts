import ReactDOM from 'react-dom/client';
import React from 'react';
import { resolveChatbotAdapter } from '../src/adapters/chatbots/registry';
import { sendRpcMessage } from '../src/lib/messaging/client';
import { RefinerBadge } from '../src/components/injections/RefinerBadge';
import './../src/components/injections/injections.css';

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
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    const adapter = resolveChatbotAdapter();
    if (!adapter) {
      console.log('[WXT] No chatbot adapter matched for:', location.hostname);
      return;
    }

    console.log(`[WXT] Active Chatbot Adapter: ${adapter.platform.toUpperCase()} on ${location.hostname}`);

    // Refinement executor function
    const executeRefinement = async () => {
      const rawPrompt = adapter.getInputText();
      if (!rawPrompt || rawPrompt.trim().length === 0) return;

      const result = await sendRpcMessage('REFINE_PROMPT', { rawPrompt });
      if (result.success && result.refinedPrompt) {
        adapter.setInputText(result.refinedPrompt);
      }
    };

    // 1. Listen for background keyboard shortcut
    browser.runtime.onMessage.addListener(async (message) => {
      if (message.type === 'TRIGGER_REFINE_SHORTCUT') {
        await executeRefinement();
      }
    });

    // 2. Mount Shadow DOM Floating Refiner Badge
    try {
      const ui = await createShadowRootUi(ctx, {
        name: 'prompt-refiner-overlay',
        position: 'inline',
        anchor: 'body',
        append: 'last',
        onMount(container) {
          const root = ReactDOM.createRoot(container);
          root.render(
            React.createElement(
              'div',
              { style: { position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999 } },
              React.createElement(RefinerBadge, { onRefine: executeRefinement })
            )
          );
          return root;
        },
        onRemove(root) {
          root?.unmount();
        }
      });

      ui.mount();
    } catch (err) {
      console.warn('[WXT] Failed to mount Shadow DOM Refiner UI:', err);
    }
  }
});
