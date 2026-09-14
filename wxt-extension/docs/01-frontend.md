# 01 - Frontend Architecture & UI Surfaces

> **Target Environment**: WebExtension MV3 Multi-Surface UI  
> **Framework Stack**: React 19 (`@wxt-dev/module-react` / `@vitejs/plugin-react`), TypeScript 5.7+, Tailwind & Scoped CSS  
> **Isolation Pattern**: WXT `createShadowRootUi` Shadow DOM Boundary  
> **Authoritative Root**: `wxt-extension/entrypoints/` & `wxt-extension/src/components/`

---

## 1. Overview & Frontend Philosophy

The frontend architecture of **Allie Persona & Prompt Refiner** is split across two fundamentally different runtime environments:
1. **Isolated Extension Windows**: Privileged extension contexts with native access to WebExtension APIs (`chrome.*` / `browser.*`). These include the persistent **Chrome Side Panel**, the ephemeral **Action Popup**, and the full-page **Options & Settings Tab**.
2. **In-Page Injected Surfaces (Shadow DOM)**: UI components dynamically injected into hostile host chat environments (`gemini.google.com`, `chatgpt.com`, `claude.ai`, etc.). These surfaces must be 100% immune to external CSS contamination, resistant to host DOM mutation wipes, and cleanly unmountable when extension contexts invalidate.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                WXT Frontend Architecture                │
                                  └───────────────────────────┬─────────────────────────────┘
                                                              │
                                ┌─────────────────────────────┴─────────────────────────────┐
                                │                                                           │
                                ▼                                                           ▼
    ┌───────────────────────────────────────┐                   ┌───────────────────────────────────────┐
    │     Privileged Extension Surfaces     │                   │       In-Page Injected Surfaces       │
    │     (React 19 in Extension Origin)    │                   │     (React 19 in Shadow DOM Root)     │
    ├───────────────────────────────────────┤                   ├───────────────────────────────────────┤
    │ 1. Side Panel (entrypoints/sidepanel) │                   │ 1. Floating Refiner Badge             │
    │    - 3-Tab Controller (Personas/Hist) │                   │    (src/components/injections/)       │
    │    - 7-Dimension Memory Editor        │                   │ 2. Rating & Feedback Bar              │
    │    - Live Chat History Inspector      │                   │ 3. Diff Comparison Modal              │
    │ 2. Action Popup (entrypoints/popup)   │                   │                                       │
    │    - Fast Persona Quick-Switcher      │                   │ Invariant: createShadowRootUi         │
    │ 3. Options (entrypoints/options)      │                   │ Isolation: 0 Host CSS Bleed           │
    │    - Model & Provider Configurations  │                   │ Cleanup: ctx.onInvalidated()          │
    │    - Supabase & Local Crypto Controls │                   └───────────────────────────────────────┘
    └───────────────────────────────────────┘
```

---

## 2. Directory Layout & Component Hierarchy

```
wxt-extension/
├── entrypoints/
│   ├── sidepanel/                     # Primary Workspace Window
│   │   ├── index.html                 # HTML Mount Target
│   │   ├── main.tsx                   # React 19 Bootstrapper (createRoot)
│   │   ├── App.tsx                    # Sidepanel Master Controller (3 Tabs)
│   │   ├── sidepanel.css              # Custom Variables & Dark/Light Themes
│   │   └── components/                # Dimension Editors & History Cards
│   ├── popup/                         # Action Toolbar Popup
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                    # Quick-Toggle & Status Indicator
│   ├── options/                       # Global Extension Settings
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                    # API Keys, Storage Limits & Sync
│   └── content.ts                     # Universal Injected Script Entrypoint
└── src/
    ├── components/
    │   └── injections/                # Host Page Overlay Components
    │       ├── RefinerBadge.tsx       # Floating Trigger Badge
    │       ├── RatingOverlay.tsx      # Inline Rating Widget
    │       ├── injections.css         # Scoped Styles for Shadow DOM
    │       └── types.ts
    └── core/theme/                    # Shared Dynamic Theme Controller
        └── theme-controller.ts        # Syncs Theme Across Extension & Injections
```

---

## 3. Surface 1: Chrome Side Panel (`entrypoints/sidepanel/`)

The Side Panel is the core operational workspace for the user. Mounted via Chrome's native Side Panel API (`chrome.sidePanel`), it remains persistent while the user navigates between chats, prompts, and platforms.

### 3.1 Tab Structure (`App.tsx`)
1. **Personas Tab (`activeTab === 'personas'`)**:
   - **Active Persona Card**: Visualizes currently active persona, domain tags, author, and version.
   - **7-Dimension Memory Inspector**: Interactive accordion / card views for all 7 dimensions:
     - `Persona`: Role, title, domain, background instruction.
     - `Context`: Working domain, active tech stack, environment assumptions.
     - `Tone`: Slider / dropdown for styles (*Direct, Formal, Technical, Casual*).
     - `Framework`: Reasoning structure (*First-Principles, Chain-of-Thought*).
     - `Constraints`: Negative prompt rules and forbidden idioms.
     - `Format`: Output formatting directives (*Markdown Tables, Code First*).
     - `Exemplar`: Input-to-output few-shot pattern pairs.
   - **Persona Manager**: Create, clone, export, and delete personas.
2. **History Tab (`activeTab === 'history'`)**:
   - Scraped turn inspection with platform badge (Gemini, ChatGPT, Claude, etc.).
   - Refinement comparison: raw prompt vs refined prompt with colored diff highlights.
   - User satisfaction ratings and timestamped turn IDs.
3. **Settings Tab (`activeTab === 'settings'`)**:
   - Provider selector (Gemini API, OpenAI, Anthropic, OpenRouter).
   - Real-time model parameter sliders (Temperature, Top-P, Max Output Tokens).
   - Supabase community sync status and sync button.

### 3.2 Live Port Synchronization
The sidepanel maintains a persistent bi-directional communication port with the Background Service Worker:

```typescript
// entrypoints/sidepanel/App.tsx
useEffect(() => {
  const port = chrome.runtime.connect({ name: 'sidepanel' });
  
  port.onMessage.addListener((msg) => {
    if (msg.type === 'MEMORY_UPDATED') {
      setActiveMemory(msg.payload);
    } else if (msg.type === 'REFINEMENT_COMPLETE') {
      setLatestRefinement(msg.payload);
    }
  });

  return () => port.disconnect();
}, []);
```

---

## 4. Surface 2: In-Page Injected UI (`src/components/injections/`)

Injected UI elements render on top of the host chatbot interface.

### 4.1 Shadow DOM Isolation via `createShadowRootUi`
Host applications (such as ChatGPT or Gemini) apply aggressive CSS resets (e.g. `* { box-sizing: border-box; margin: 0; }` or custom CSS custom property overrides). Injected components **must** be rendered inside a Shadow Root:

```typescript
// entrypoints/content.ts
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import { RefinerBadge } from '@/components/injections/RefinerBadge';

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
    const ui = await createShadowRootUi(ctx, {
      name: 'prompt-refiner-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount(container) {
        const root = ReactDOM.createRoot(container);
        root.render(
          React.createElement('div', { className: 'allie-refiner-container' },
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
  }
});
```

### 4.2 Lifecycle & Memory Leak Elimination (`ctx.onInvalidated`)
When an extension updates or reloads, existing content scripts enter an "invalidated" state. Any active intervals, DOM observers, or event listeners will throw `Error: Extension context invalidated`. 
WXT's `ContentScriptContext` (`ctx`) guarantees clean teardown:
- `ctx.onInvalidated(() => { ... })` unregisters submit interceptors.
- `ui.mount()` registers automatic cleanup on extension reload.

---

## 5. Surface 3: Action Toolbar Popup (`entrypoints/popup/`)

- **Size Constraints**: Constrained to a standard extension popup dimensions (max 400px width, 600px height).
- **Core Function**:
  - Quick toggle to enable/disable automated prompt refinement on the active tab.
  - Active persona dropdown selector with one-click persona switching.
  - Keyboard shortcut cheat sheet (`Ctrl+Shift+R` / `Alt+M`).
  - Shortcut button to open the full Chrome Side Panel.

---

## 6. Surface 4: Options & Settings Dashboard (`entrypoints/options/`)

- **Rendering Mode**: Full-page tab (`chrome.runtime.openOptionsPage()`).
- **Core Sections**:
  1. **LLM Provider API Vault**:
     - Masked password fields for Gemini, OpenAI, Anthropic, and OpenRouter API keys.
     - "Test Connection" button validating credentials against live endpoints.
     - Client-side AES-GCM encryption status badge.
  2. **Persona Management & Backup**:
     - Full JSON / CSV import and export of user persona libraries.
     - "Restore Factory Personas" safety action.
  3. **Cloud Synchronization (Supabase)**:
     - Supabase Project URL and Anon Key configuration.
     - Account login / session indicator with community persona synchronization toggle.

---

## 7. State Management & Reactivity Matrix

| State Scope | Storage Mechanism | Reactivity Pattern | Consumers |
| :--- | :--- | :--- | :--- |
| **Active Persona** | `@wxt-dev/storage` (`local:active_persona`) | `storage.watch()` hook | Sidepanel, Popup, Content Script |
| **Persona Library** | `@wxt-dev/storage` (`local:personas`) | `storage.watch()` hook | Sidepanel, Options |
| **Session Memory** | `chrome.storage.session` | Chrome Storage Change Event | Background Service Worker, Sidepanel |
| **Theme (Light/Dark)** | `chrome.storage.local` (`theme`) | `ThemeController` subscriber | All surfaces (Sidepanel, Popup, Injected UI) |
| **API Keys** | Encrypted `chrome.storage.local` | On-demand decryption | Background Service Worker only |

---

## 8. Verification & Quality Gates

- **Static Type Safety**: React 19 JSX components and hooks pass `bun run typecheck` (`tsc --noEmit`) with **zero errors**.
- **Component Tests**: Tested via Vitest using `@testing-library/react` and JSDOM / FakeIndexedDB.
- **CSS Encapsulation Test**: Shadow DOM boundary verified against aggressive external host CSS selectors.
