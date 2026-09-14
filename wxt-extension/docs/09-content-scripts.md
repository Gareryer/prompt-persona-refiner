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
4. **Keystroke & Input Hijacking**: Chatbot composers (ProseMirror, Lexical, Angular Quill) intercept keyboard events before native browser handlers fire.

**Allie Persona & Prompt Refiner** addresses these challenges using **WXT's `defineContentScript`**, **`createShadowRootUi`**, and modular **`IChatbotAdapter`** implementations.

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
│  3. Keystroke & Submit Interception:                                                                   │
│     ├── Capture-phase keydown listener for Ctrl+Shift+R and Enter                                      │
│     └── Triggers refinement pipeline before allowing native submit event                               │
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

    // 2. Keyboard Shortcut Listeners (Capture Phase)
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+Shift+R or Cmd+Shift+R to trigger refinement
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        e.stopPropagation();
        await contentObserver.executeRefinement();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    ctx.onInvalidated(() => window.removeEventListener('keydown', handleKeyDown, { capture: true }));

    // 3. Universal Submit Interception
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

    // 4. Mount Shadow DOM Floating Refiner Badge
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

## 3. Keyboard Shortcut & Keystroke Protocols

| Keystroke Trigger | Context | Action Handled |
| :--- | :--- | :--- |
| **`Ctrl+Shift+R` / `Cmd+Shift+R`** | Host Page Composer | Intercepts active input, compiles 7-dimension persona context, and injects refined prompt. |
| **`Enter` (without Shift)** | Submit Interception | If `autoRefineOnEnter: true`, intercepts form submission to refine before sending. |
| **`Alt+M`** | Global Extension | Invokes `chrome.commands` to toggle the native Chrome Side Panel open/closed. |

---

## 4. Input Synchronization Across Web Frameworks

Because different chatbots bind input differently, updating values requires triggering internal framework watchers:

```typescript
export function syncInputText(element: HTMLElement, text: string): void {
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  } else if (element.isContentEditable) {
    // Angular Quill, ProseMirror, Lexical
    element.innerHTML = `<p>${escapeHtml(text)}</p>`;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  }
}
```

---

## 5. Lifecycle Resilience & Invalidation Safety (`ctx.onInvalidated`)

WXT's `ContentScriptContext` (`ctx`) guarantees that when the extension updates or reloads:
- DOM observers automatically disconnect.
- Keyboard capture handlers unbind cleanly.
- `ui.mount()` unmounts React roots cleanly, preventing detached DOM node leaks.
