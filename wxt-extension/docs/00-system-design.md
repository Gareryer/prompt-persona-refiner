# 00 - Allie Persona & Prompt Refiner: System Design & Architecture Blueprint

> **System Target**: Web Extension Manifest V3 (MV3) Architecture  
> **Core Framework**: [WXT (Web Extension Toolbox) v0.21.4](https://wxt.dev/) · Vite 6 · React 19 · TypeScript 5.7+  
> **Authoritative Root**: `wxt-extension/`  
> **Classification**: Master Technical System Design Specification

---

## 1. System Overview & Architectural Invariants

**Allie Persona & Prompt Refiner** is an enterprise-grade, browser-integrated AI context orchestration platform. It operates across multiple isolated browser security boundaries to observe, harvest, extract, and refine AI interaction contexts across major conversational AI platforms.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Multi-Context Process Model                                      │
├───────────────────────────────────┬────────────────────────────────────────────────────────────────────┤
│ Host Page Worlds (Unprivileged)   │ Isolated Extension Worlds (Privileged)                             │
│                                   │                                                                    │
│  ┌─────────────────────────────┐  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Host Page DOM & SPA Engine  │  │  │ Content Script World        │  │ Extension Origin Windows    │  │
│  │ (Gemini, ChatGPT, Claude)   │  │  │ (entrypoints/content.ts)    │  │ (Sidepanel, Popup, Options) │  │
│  │                             │  │  │                             │  │                             │  │
│  │  ┌───────────────────────┐  │  │  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │  │
│  │  │ Platform DOM Elements │  │  │  │  │ Platform Adapters     │  │  │  │ React 19 UI Engine   │  │  │
│  │  │ (Inputs, Turns, Diff) │◄─┼──┼──┼─►│ (IChatbotAdapter)     │  │  │  │ 3-Tab Side Panel     │  │  │
│  │  └───────────────────────┘  │  │  │  └──────────┬────────────┘  │  │  │ Quick-Toggle Popup    │  │  │
│  │                             │  │  │             │               │  │  │ Options Dashboard     │  │  │
│  │  ┌───────────────────────┐  │  │  │             ▼               │  │  └──────────┬────────────┘  │  │
│  │  │ Injected Shadow DOM   │  │  │  │  ┌───────────────────────┐  │  │             │               │  │
│  │  │ <prompt-refiner-ui>   │◄─┼──┼──┼─►│ createShadowRootUi    │  │  │             │               │  │
│  │  │ Isolated CSS Styles   │  │  │  │  │ (Floating Badge/Diff) │  │  │             │               │  │
│  │  └───────────────────────┘  │  │  │  └───────────────────────┘  │  │             │               │  │
│  └─────────────────────────────┘  │  └─────────────┬───────────────┘  └─────────────┼───────────────┘  │
│                                   │                │                                │                  │
│                                   │                ▼                                ▼                  │
│                                   │  ┌──────────────────────────────────────────────────────────────┐  │
│                                   │  │ Background Service Worker (entrypoints/background.ts)        │  │
│                                   │  │  - Memory Orchestrator      - API Proxy & LLM Gateway        │  │
│                                   │  │  - Web Crypto AES-GCM Vault - Session State Manager          │  │
│                                   │  │  - Sidepanel Port Router    - Harvest Extraction Engine      │  │
│                                   │  └──────────────────────────────┬───────────────────────────────┘  │
│                                   │                                 │                                  │
│                                   │                                 ▼                                  │
│                                   │       Type-Safe Storage (@wxt-dev/storage / Chrome Storage)        │
└───────────────────────────────────┴─────────────────────────────────┼──────────────────────────────────┘
                                                                      │ HTTPS / WSS
                                                                      ▼
                                    ┌────────────────────────────────────────────────────────────────────┐
                                    │ External Cloud & Model Providers                                   │
                                    │  - Google Gemini API (generativelanguage.googleapis.com)           │
                                    │  - OpenAI API (api.openai.com) / Anthropic API (api.anthropic.com) │
                                    │  - OpenRouter Gateway (openrouter.ai)                              │
                                    │  - Supabase BaaS (Postgres RLS Database & Community Personas)      │
                                    └────────────────────────────────────────────────────────────────────┘
```

### Core Architectural Invariants

1. **Manifest V3 Ephemeral Lifecycle Invariant**: The Background Service Worker (`entrypoints/background.ts`) is stateless and may be terminated by Chromium after ~30 seconds of inactivity. Operational state must never rely on in-memory global variables. All session data is persisted in `chrome.storage.session` and `chrome.storage.local`.
2. **Synchronous Registration Invariant**: All event listeners (`browser.runtime.onMessage`, `browser.runtime.onConnect`, `browser.action.onClicked`, `browser.commands.onCommand`) **must** be registered synchronously at the root execution scope of `defineBackground()`.
3. **Shadow DOM Presentation Boundary**: In-page injected components (`RefinerBadge`, `RatingOverlay`) **must** mount inside a clean-room Shadow Root created via `createShadowRootUi(ctx, ...)`. Host application CSS rules and CSS resets must never contaminate extension UI, and extension styles must never leak into host DOM.
4. **Context Invalidation Cleanup**: All Content Script observers, event handlers, and port connections must be bound to `ctx.onInvalidated()` to prevent memory leaks and `Extension context invalidated` runtime errors.
5. **Zero-Trust Client Cryptography**: API keys must be encrypted locally via Web Crypto AES-GCM (256-bit) before storage, decrypted only in volatile memory inside the Service Worker during active HTTP dispatches, and never exposed to host DOM or content scripts.

---

## 2. Process Boundaries & Context Topologies

### 2.1 Context Segregation Matrix

| Execution Context | Thread / Process | Script Entrypoint | Permissions & Capabilities |
| :--- | :--- | :--- | :--- |
| **Background Service Worker** | Dedicated Extension Service Worker Thread | `entrypoints/background.ts` | Full WebExtension APIs (`storage`, `tabs`, `sidePanel`, `scripting`, `crypto`). Cross-origin networking without CORS restrictions. |
| **Content Script** | Tab Renderer Thread (Isolated World) | `entrypoints/content.ts`<br>`entrypoints/*.content/` | Direct access to host DOM. Isolated JS scope (cannot inspect or alter host JS variables directly). Proxies WebExtension calls via `chrome.runtime`. |
| **Injected UI (Shadow DOM)** | Tab Renderer Thread (Shadow Root) | `src/components/injections/` | Rendered within host page tree inside open Shadow Root. Encapsulated CSS. Access to content script scope. |
| **Side Panel Window** | Extension Tab Renderer Thread | `entrypoints/sidepanel/` | Full Chrome APIs (`chrome.sidePanel`, `chrome.tabs`, `chrome.storage`). Persistent across tab navigation within the active window. |
| **Action Popup Window** | Ephemeral Browser Toolstrip Window | `entrypoints/popup/` | Full Chrome APIs. Auto-closes on click outside window. |
| **Options Page** | Dedicated Tab / Options Dialog | `entrypoints/options/` | Full Chrome APIs. Renders full-screen credential, model, and persona manager. |

---

## 3. End-to-End Sequence Workflows

### 3.1 Prompt Refinement Flow (Submit Interception & In-Page Refinement)

The primary interaction cycle begins when a user enters a raw prompt into any supported chatbot input (Gemini, ChatGPT, Claude, etc.) and triggers refinement (via shortcut `Ctrl+Shift+R`, clicking the floating badge, or intercepting native submit).

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant HostDOM as Chatbot Input (Host DOM)
    participant Content as Content Script (contentObserver)
    participant Adapter as IChatbotAdapter
    participant InjectedUI as RefinerBadge (Shadow DOM)
    participant Worker as Service Worker (Background)
    participant LLM as External LLM Gateway
    participant Storage as @wxt-dev/storage

    User->>HostDOM: Types raw prompt ("Explain quantum computing")
    User->>InjectedUI: Clicks RefinerBadge (or hits Ctrl+Shift+R)
    InjectedUI->>Content: executeRefinement()
    Content->>Adapter: getPrompt()
    Adapter->>HostDOM: Reads input textarea/contenteditable
    HostDOM-->>Adapter: Raw prompt text
    Adapter-->>Content: "Explain quantum computing"
    
    Content->>Worker: chrome.runtime.sendMessage({ action: 'TRIGGER_REFINEMENT', rawPrompt, sessionId })
    
    activate Worker
    Worker->>Storage: Retrieve Active Persona & Session Memory
    Storage-->>Worker: Persona V4 (7 dimensions) + Session history
    Worker->>Worker: buildV4RefinementContext(persona, memory)
    Worker->>Worker: Decrypt Provider API Key (AES-GCM)
    Worker->>LLM: POST /v1beta/models/...:generateContent (Refinement System Prompt + Context)
    activate LLM
    LLM-->>Worker: Refined Prompt ("Act as a Senior Quantum Physicist...")
    deactivate LLM
    
    Worker->>Storage: Record refinement audit log & update counter
    Worker-->>Content: Response { success: true, refinedPrompt, appliedDimensions }
    deactivate Worker
    
    Content->>Adapter: setPrompt(refinedPrompt)
    Adapter->>HostDOM: Updates textarea & dispatches synthetic InputEvent
    Content->>InjectedUI: Renders Refinement Diff / Success Notification
    InjectedUI-->>User: Displays green confirmation glow & refined diff
```

---

### 3.2 Automated Conversation Harvesting & Persona Memory Extraction

As conversation turns progress, the extension automatically observes new messages, extracts implicit user constraints and background knowledge, and updates the active session memory.

```mermaid
sequenceDiagram
    autonumber
    participant HostDOM as Host Chat DOM
    participant Adapter as IChatbotAdapter
    participant Observer as Content Observer (MutationObserver)
    participant Worker as Background Service Worker
    participant Extractor as Extraction Engine
    participant LLM as Model Gateway
    participant Storage as chrome.storage.local

    HostDOM->>Observer: DOM Mutation (Model finished streaming response)
    Observer->>Adapter: scrapeHistory()
    Adapter->>HostDOM: Queries turn elements (.turn-container, etc.)
    HostDOM-->>Adapter: Turn list [{ role: 'user', content: '...' }, { role: 'assistant', ... }]
    Adapter-->>Observer: ScrapedTurn[]
    
    Observer->>Worker: chrome.runtime.sendMessage({ action: 'EXTRACT_MEMORY', turns, sessionId })
    activate Worker
    Worker->>Worker: Check session debounce & active extraction locks
    Worker->>Extractor: evaluateTurnsForExtraction(turns)
    Extractor->>Worker: Build extraction prompt (7 dimensions analysis)
    Worker->>LLM: Call Extraction Model (Low-temperature structured output)
    activate LLM
    LLM-->>Worker: JSON { persona: {...}, context: {...}, constraints: [...] }
    deactivate LLM
    
    Worker->>Storage: Update session_{sessionId} memory components
    Worker->>Worker: Broadcast MEMORY_UPDATED over open sidepanel ports
    Worker-->>Observer: { success: true, updatedDimensions: [...] }
    deactivate Worker
```

---

### 3.3 Persistent Side Panel Live Synchronization

The Side Panel maintains a stateful real-time connection to the Background Service Worker via Chrome Extension Ports (`chrome.runtime.Port`), ensuring instant UI updates when turns are scraped or refined.

```mermaid
sequenceDiagram
    autonumber
    participant Sidepanel as Side Panel (React 19 App)
    participant Worker as Background (sidepanel-manager.ts)
    participant Storage as Storage Watcher
    participant Tab as Content Script (Active Tab)

    Sidepanel->>Worker: chrome.runtime.connect({ name: 'sidepanel' })
    activate Worker
    Worker->>Worker: openSidepanelPorts.add(port)
    Worker->>Worker: Map port to current windowId
    Worker-->>Sidepanel: Handshake ACK { connected: true, windowId }
    deactivate Worker

    Note over Sidepanel,Worker: Bidirectional Port Active

    Tab->>Worker: Refinement completed on active tab
    Worker->>Sidepanel: port.postMessage({ type: 'REFINEMENT_COMPLETE', payload: {...} })
    Sidepanel->>Sidepanel: Update React state (History Tab & Active Diff)

    Sidepanel->>Worker: User updates Tone dimension in UI
    Worker->>Storage: Persist updated dimension to storage
    Storage-->>Worker: Storage Change Event
    Worker->>Sidepanel: port.postMessage({ type: 'MEMORY_UPDATED', payload: {...} })

    Sidepanel->>Worker: User closes Side Panel
    Worker->>Worker: port.onDisconnect fires -> Clean up port from openSidepanelPorts
```

---

## 4. State Machines & Lifecycle Models

### 4.1 Background Service Worker MV3 State Machine

```mermaid
stateDiagram-v2
    [*] --> Unloaded: Browser Idle / Cold Start

    Unloaded --> Booting: Incoming Event (onMessage / onConnect / onAlarm)
    state Booting {
        [*] --> RegisterListeners: Synchronous root defineBackground()
        RegisterListeners --> InitStorageAccess: Set session storage access level
        InitStorageAccess --> VerifyCryptoKeys: Check PBKDF2 Master Key Salt
    }

    Booting --> Active: Event Handlers Attached
    state Active {
        [*] --> Processing
        Processing --> ServicingRPC: onMessage dispatch
        Processing --> StreamingPort: onConnect sidepanel pipe
        Processing --> ExecutingAlarm: onAlarm scheduled jobs
        ServicingRPC --> Processing
        StreamingPort --> Processing
        ExecutingAlarm --> Processing
    }

    Active --> Teardown: Idle Timer Expires (~30s without incoming event)
    Teardown --> Unloaded: Worker Thread Terminated by Chromium
```

### 4.2 Injected Shadow DOM UI Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: Chatbot Page Navigates (document_idle)
    Idle --> ResolvingAdapter: resolveChatbotAdapter(location.hostname)
    
    ResolvingAdapter --> Unsupported: No Adapter Matched
    Unsupported --> [*]

    ResolvingAdapter --> MountingUI: Adapter Matched (Gemini, ChatGPT, Claude, etc.)
    state MountingUI {
        [*] --> CreateShadowRoot: createShadowRootUi(ctx, ...)
        CreateShadowRoot --> MountReact: ReactDOM.createRoot(container)
        MountReact --> BindObserver: contentObserver.init()
        BindObserver --> HookSubmit: adapter.interceptSubmit()
    }

    MountingUI --> Ready: Floating Badge Displayed

    state Ready {
        [*] --> Listening
        Listening --> Refining: User triggers Ctrl+Shift+R / clicks badge
        Refining --> ShowingDiff: LLM returns refined text
        ShowingDiff --> Listening: User accepts / auto-injects
        Listening --> Submitting: User presses Enter / sends prompt
        Submitting --> Listening: Turn scraped
    }

    Ready --> Invalidated: Extension Updated / Reloaded
    Invalidated --> [*]: ctx.onInvalidated() calls unregisterSubmit() & root.unmount()
```

---

## 5. Storage Topology & Data Synchronization Architecture

The storage subsystem coordinates three distinct storage tiers with varying durability and visibility scopes:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Storage Architecture                                             │
├───────────────────────────────┬───────────────────────────────┬────────────────────────────────────────┤
│ chrome.storage.session        │ chrome.storage.local          │ Remote Supabase (BaaS)                 │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ - Ephemeral In-Memory Storage │ - Persistent Disk Storage     │ - Cloud PostgreSQL Database            │
│ - Cleared on browser restart  │ - Survives browser restarts   │ - Synchronized via JWT & RLS           │
│ - Shared across contexts via  │ - Quota: unlimitedStorage     │ - Community persona marketplace        │
│   TRUSTED_AND_UNTRUSTED_LEVEL │ - Scoped keys per namespace   │ - Aggregated rating ledgers            │
├───────────────────────────────┼───────────────────────────────┼────────────────────────────────────────┤
│ Keys:                         │ Keys:                         │ Tables:                                │
│ • refinementCounter           │ • local:active_persona        │ • public.personas (Community Hub)      │
│ • activeSessionId             │ • local:personas              │ • public.ratings (Feedback Ledger)     │
│ • activeTabWindowMap          │ • session_{sessionId}         │ • auth.users (PKCE Auth Sessions)      │
│ • splitViewActive             │ • enc:v1:geminiApiKey         │                                        │
│                               │ • user_settings               │                                        │
└───────────────────────────────┴───────────────────────────────┴────────────────────────────────────────┘
```

---

## 6. Security Architecture & Threat Mitigations

| Threat Vector | Severity | Architectural Mitigation in Allie Refiner |
| :--- | :--- | :--- |
| **Host Page Script Tampering (XSS)** | High | Content scripts run in **Isolated World**. Host JavaScript execution scopes cannot read, prototype-pollute, or intercept variables in the extension content script. |
| **CSS Collision & Style Bleed** | High | All in-page UI is mounted in an isolated **Shadow Root** (`createShadowRootUi`). Host Tailwind/reset styles cannot pierce the shadow boundary. |
| **API Key Theft from Extension Storage** | Critical | Keys are encrypted via **AES-GCM (256-bit)** using PBKDF2 derived keys (`crypto.subtle`). Never stored in plaintext. |
| **Extension Context Invalidation Crashing** | Medium | All listeners, DOM observers, and submit hooks are registered through WXT's `ContentScriptContext` (`ctx.onInvalidated()`) for graceful unmounting. |
| **CORS Policy Restrictions on LLM Calls** | Medium | All model API requests (`generativelanguage.googleapis.com`, `api.openai.com`, etc.) are routed through the **Background Service Worker**, utilizing declared `host_permissions`. |

---

## 7. Performance & Resource Budgets

1. **Cold-Start Service Worker Latency**: $\le 45\text{ms}$ from event trigger to listener execution.
2. **Refinement Pipeline Overhead**: $\le 120\text{ms}$ internal processing overhead (excluding external LLM network latency).
3. **DOM Mutation Observer Throttling**: Mutation events debounced to a minimum window of $250\text{ms}$ to prevent CPU saturation on high-frequency streaming turns.
4. **Shadow DOM Memory Footprint**: Injected React root consumes $\le 3.5\text{MB}$ heap memory per tab.
5. **Production Bundle Size**: Total compiled bundle (all entrypoints, React 19, icons, and vendor runtime) strictly bounded to $\le 2.50\text{MB}$ (currently **2.30 MB**).
