import ReactDOM from 'react-dom/client';
import React from 'react';
import { resolveChatbotAdapter } from '../src/adapters/chatbots/registry';
import { contentObserver } from '../src/content/observer';
import { RefinerBadge } from '../src/components/injections/RefinerBadge';
import './../src/components/injections/injections.css';

export default defineContentScript({
  matches: [
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

    // Initialize content script observer (theme, shortcuts, message dispatch)
    contentObserver.init();

    // Mount Shadow DOM Floating Refiner Badge
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
              React.createElement(RefinerBadge, {
                onRefine: async () => {
                  await contentObserver.executeRefinement();
                }
              })
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