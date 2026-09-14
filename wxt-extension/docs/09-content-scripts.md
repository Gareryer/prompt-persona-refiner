# 09 - Content Script Architecture & Injected Shadow DOM

> **Target Layer**: Host DOM Content Script Injections  
> **Core Entrypoints**: `wxt-extension/entrypoints/content.ts` & `wxt-extension/entrypoints/*.content/`  
> **UI Engine**: WXT `createShadowRootUi` + React 19  
> **Classification**: Injected DOM Lifecycle & Shadow Encapsulation Specification

---

## 1. Overview & The Injection Challenge

Content scripts in modern browser extensions face unique technical hurdles when injecting UI and logic into high-velocity Single Page Applications (SPAs) like ChatGPT, Claude, and Gemini:
1. **Aggressive CSS Resets**: Host platforms apply global rules (e.g. `* { box-sizing: border-box; }`, high-specificity Tailwind classes) that destroy standard injected HTML elements.
2. **Dynamic Client-Side Routing**: SPA frameworks navigate between chats without triggering browser page reloads, detaching un-anchored listeners.
3. **Context Invalidation Crashes**: When an extension auto-reloads during development or updates, existing content scripts are orphaned. Unmanaged event listeners throw fatal `Extension context invalidated` errors.

**Allie Persona & Prompt Refiner** addresses these challenges using **WXT's `defineContentScript`** and **`createShadowRootUi`**.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Injected Content Script Lifecycle                                    │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                     Host Page (document_idle)                                          │
│                                                                                                        │
│  1. Resolution: resolveChatbotAdapter(location.hostname)                                               │
│     ├── Matches: chat.deepseek.com | grok.com | x.com/i/grok | meta.ai                                │
│     └── (Dedicated entrypoints: gemini.content, chatgpt.content, claude.content)                       │
│                                                                                                        │
│  2. DOM Observation: contentObserver.init()                                                           │
│     ├── MutationObserver hooks into chat message container                                             │
│     └── Debounced extraction and turn tracking (250ms debounce)                                        │
│                                                                                                        │
│  3. Submit Interception: adapter.interceptSubmit(async (rawPrompt) => {...})                           │
│     ├── Hooks Enter keydown and Submit button clicks                                                   │
│     └── Triggers refinement pipeline before allowing native send event                                 │
│                                                                                                        │
│  4. Shadow DOM UI Mounting: createShadowRootUi(ctx, { ... })                                           │
│     ┌──────────────────────────────────────────────────────────────────────────────────────────────┐  │
│     │ Host Page DOM: <body>                                                                        │  │
│     │   └── <prompt-refiner-overlay> (Custom Element Anchor)                                       │  │
│     │         └── #shadow-root (open)                                                              │  │
│     │               ├── <style> (injections.css scoped inside shadow boundary)                     │  │
│     │               └── <div class="allie-refiner-container">                                      │  │
│     │                     ├── <RefinerBadge /> (Click-to-refine floating trigger)                   │  │
│     │                     ├── <RatingOverlay /> (Inline satisfaction scores)                       │  │
│     │                     └── <DiffModal /> (Colored prompt diff preview)                          │  │
│     └──────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                                        │
│  5. Graceful Teardown: ctx.onInvalidated(() => { unregisterSubmit(); root.unmount(); })                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Universal Entrypoint Implementation (`entrypoints/content.ts`)

```typescript
// wxt-extension/entrypoints/content.ts
import ReactDOM from 'react-dom/client';
import React from 'react';
import { resolveChatbotAdapter } from '../src/adapters/chatbots/registry';
import { contentObserver } from '../src/content/observer';
import { RefinerBadge } from '../src/components/injections/RefinerBadge';
import './../src/components/injections/injections.css';

export default defineContentScript({
  matches: [
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

    console.log(`[WXT] Active Adapter: ${adapter.platform.toUpperCase()} on ${location.hostname}`);

    // 1. Initialize content observer
    contentObserver.init();

    // 2. Universal Submit Interception
    let unregisterSubmit: (() => void) | null = null;
    if (typeof adapter.interceptSubmit === 'function') {
      unregisterSubmit = adapter.interceptSubmit(async (_rawPrompt: string) => {
        try {
          const res = await contentObserver.executeRefinement();
          if (res.success && res.refinedPrompt) {
            return true;
          }
        } catch (err) {
          console.warn(`[WXT ${adapter.platform}] Refinement error:`, err);
        }
        return true; // Fail-open: allow native send on error
      });

      ctx.onInvalidated(() => {
        unregisterSubmit?.();
      });
    }

    // 3. Mount Shadow DOM Floating Refiner Badge
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
      console.warn('[WXT] Failed to mount Shadow DOM UI:', err);
    }
  }
});
```

---

## 3. Shadow DOM CSS Isolation (`cssInjectionMode: 'ui'`)

WXT's `cssInjectionMode: 'ui'` mode ensures that any CSS imported within the content script bundle is **not** injected into the host page `<head>`. Instead, WXT compiles and scopes the styles directly inside the created Shadow Root.

### Advantages:
1. **0 Host Style Bleed**: The host page's Tailwind or CSS resets cannot alter the extension's badges, modals, or buttons.
2. **0 Extension Style Leaks**: The extension's CSS cannot interfere with the host chat application's layout or font rules.
3. **Dynamic Host Theme Matching**: The injected root listens to background theme changes via `ThemeController` and updates internal CSS custom properties (`--refiner-bg`, `--refiner-text`).

---

## 4. Lifecycle Resilience & Invalidation Safety (`ctx.onInvalidated`)

In standard extensions, reloading an unpacked extension breaks active tabs until refreshed. 

With WXT's `ContentScriptContext` (`ctx`):
- All long-running timers wrap in `ctx.setTimeout()` / `ctx.setInterval()`.
- MutationObservers automatically disconnect on invalidation.
- The `onRemove` callback passed to `createShadowRootUi` invokes `root.unmount()`, stripping injected DOM nodes cleanly without leaving orphaned elements behind.
