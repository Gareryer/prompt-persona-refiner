# 02 - Backend Architecture & Service Worker Lifecycle

> **Target Environment**: WebExtension Manifest V3 (MV3) Background Service Worker  
> **Core Entrypoint**: `wxt-extension/entrypoints/background.ts`  
> **Service Layer**: `wxt-extension/src/core/orchestration/`  
> **Classification**: Local Daemon & Engine Backend Specification

---

## 1. Overview & Backend Paradigm in MV3

In a Manifest V3 browser extension, the traditional concept of an always-running server backend is replaced by an **event-driven, ephemeral Background Service Worker**. 

For **Allie Persona & Prompt Refiner**, the Background Service Worker acts as the centralized local backend engine. It coordinates:
- Cross-context Remote Procedure Calls (RPC) between Content Scripts, Side Panels, and Popups.
- Cryptographic key management and on-demand AES-GCM token decryption.
- Cross-origin HTTP dispatching to LLM APIs (Gemini, OpenAI, Anthropic, OpenRouter) leveraging privileged extension permissions.
- State orchestration for 7-dimension session memory and automated conversation harvesting.
- Cloud database synchronization with remote Supabase services.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                Background Service Worker Daemon Architecture                           │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                     entrypoints/background.ts                                          │
│                                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Synchronous Event Router Layer                                   │  │
│  │   chrome.runtime.onMessage  │  chrome.runtime.onConnect  │  chrome.action  │  chrome.commands        │  │
│  └───────────────────┬──────────────────────────┬─────────────────────┬──────────────┬──────────────┘  │
│                      │                          │                     │              │                 │
│                      ▼                          ▼                     ▼              ▼                 │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                    Core Orchestration Subsystems                                 │  │
│  │                                                                                                  │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │  │
│  │  │   Memory Orchestrator   │  │   API Proxy & Gateway   │  │        Sidepanel Manager         │  │  │
│  │  │ (memory-orchestrator.ts)│  │      (api-proxy.ts)     │  │      (sidepanel-manager.ts)      │  │  │
│  │  │ - Session ID Resolution │  │ - Multi-Provider Dispatch│  │ - Open Port Management (Set/Map) │  │  │
│  │  │ - 7-Dimension CRUD      │  │ - AbortController Maps  │  │ - Window Association Routing     │  │  │
│  │  │ - V4 Context Assembly   │  │ - Error Categorization  │  │ - Split-View Coordinator         │  │  │
│  │  └────────────┬────────────┘  └────────────┬────────────┘  └────────────────┬─────────────────┘  │  │
│  │               │                            │                                │                    │  │
│  │               ▼                            ▼                                ▼                    │  │
│  │  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │  │
│  │  │   Harvest Orchestrator  │  │   Crypto Security Vault │  │      Session State Manager       │  │  │
│  │  │    (harvest/orchestr.)  │  │  (crypto-service.ts)    │  │       (session-state.ts)         │  │  │
│  │  │ - Batch Turn Extraction │  │ - PBKDF2 Master Keys    │  │ - Atomic Refinement Counter      │  │  │
│  │  │ - ZIP Package Assembly  │  │ - AES-GCM 256 Decryption│  │ - Debounce & Lock Registry       │  │  │
│  │  └─────────────────────────┘  └─────────────────────────┘  └──────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                  │                                                     │
│                                                  ▼                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Persistence & External Boundary                                  │  │
│  │   chrome.storage.session (Trusted Level)  │  chrome.storage.local (Unlimited)  │  Remote Cloud   │  │
│  └──────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Worker Lifecycle & Stateless Resilience

### 2.1 The Ephemeral Lifecycle Invariant
Under Manifest V3, the Chromium runtime automatically terminates the service worker thread when it has been idle for ~30 seconds. It awakens on demand when an external event triggers a registered listener.

**Mandatory Engineering Rules**:
1. **Zero Global Operational State**: Never store state in module-level global variables (`let activeSession = ...`). Global variables are discarded when the worker terminates.
2. **Session Storage Offloading**: Fast, ephemeral state (e.g. `refinementCounter`, active extraction locks) is committed to `chrome.storage.session`.
3. **Persistent Offloading**: Long-term state (personas, API keys, session memory logs) is committed to `chrome.storage.local`.
4. **Synchronous Listener Registration**: Listeners must **never** be registered inside asynchronous callbacks or conditional statements. They must execute immediately in the top-level script scope of `defineBackground()`.

```typescript
// wxt-extension/entrypoints/background.ts
export default defineBackground(() => {
  bgLog('info', 'Background service worker starting (WXT Modular Engine)...');

  // Rule: Synchronous initialization of session storage access level
  if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
    (chrome.storage.session as any).setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }).catch(() => {});
  }

  // Rule: Synchronous listener attachment at root scope
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Route message asynchronously
    handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async response
  });
});
```

---

## 3. Subsystem Specifications

### 3.1 Memory Orchestrator (`src/core/orchestration/memory-orchestrator.ts`)
The Memory Orchestrator is responsible for session resolution and assembling the 7-dimension persona context:

- **Session Resolution (`getCurrentTabSessionId`)**: Dynamically inspects the active tab's URL (e.g., parsing `/app/<session_id>` on `gemini.google.com`) to establish an isolated context bucket.
- **Component CRUD**:
  - `getSessionMemory(sessionId)`: Fetches memory partition `session_${sessionId}`.
  - `updateMemoryComponent(sessionId, componentId, data)`: Atomically updates an individual dimension (e.g., `tone`, `constraints`).
  - `pinPersona(sessionId, persona)` / `unpinPersona(sessionId)`: Controls whether a session is locked to a specific persona template.
- **Context Assembly (`buildV4RefinementContext`)**: Compiles active pinned dimensions, extracted session facts, and style directives into structured prompt prefix strings.

### 3.2 API Proxy & LLM Gateway (`src/core/orchestration/api-proxy.ts`)
Acts as the secure gateway between client surfaces and external AI providers:
- **Provider Resolution**: Dispatches requests to Gemini (`generateContent`), OpenAI (`chat/completions`), Anthropic (`messages`), or OpenRouter.
- **Credential Decryption**: Calls `decryptApiKey()` immediately prior to HTTP dispatch and strips plaintext credentials from memory as soon as the request completes.
- **Cancellation & Concurrency Control**: Tracks in-flight HTTP requests using `Map<number, AbortController>` (`activeRefinements`) and `Map<string, AbortController>` (`activeExtractions`).
- **Error Normalization (`getUserFriendlyError`)**: Standardizes upstream API status codes (401 invalid key, 429 rate limit, 503 capacity overload) into human-readable action instructions.

### 3.3 Sidepanel Connection Manager (`src/core/orchestration/sidepanel-manager.ts`)
Maintains long-lived streaming connections with the React 19 Side Panel UI:
- **Port Registry**: Tracks active connections in `openSidepanelPorts: Set<chrome.runtime.Port>` and maps them by window via `sidepanelWindowPorts: Map<number, chrome.runtime.Port>`.
- **Event Fan-Out**: Broadcasts memory updates (`MEMORY_UPDATED`) and refinement results (`REFINEMENT_COMPLETE`) directly to open sidepanel windows.
- **Split-View Coordination (`toggleSplitView`)**: Toggles between in-page iframe split-view and native Chrome Side Panel depending on browser capabilities and user preference.

### 3.4 Session State Manager (`src/core/orchestration/session-state.ts`)
- Manages transient runtime counters and locks via `chrome.storage.session`.
- Implements atomic increment routines (`incrementRefinementCounter`) to track turn frequency and trigger periodic memory re-extractions (every 5 turns by default).

### 3.5 Harvest Orchestrator (`src/core/harvest/orchestrator.ts`)
- Manages batch conversation extraction jobs across active tabs.
- Coordinates multi-page DOM scrolling, turn extraction, schema validation, and ZIP archive generation using `jszip`.

---

## 4. Message Dispatch Protocol (`chrome.runtime.onMessage`)

All background actions are routed through a typed action dispatcher:

| Action Identifier | Payload Parameters | Returns | Handling Module |
| :--- | :--- | :--- | :--- |
| `GET_SESSION_MEMORY` | `{ sessionId: string }` | `{ success: boolean, memory: object }` | `memory-orchestrator.ts` |
| `UPDATE_MEMORY_COMPONENT` | `{ sessionId, componentId, data }` | `{ success: boolean }` | `memory-orchestrator.ts` |
| `TRIGGER_REFINEMENT` | `{ rawPrompt, sessionId, provider }` | `{ success: boolean, refinedPrompt, diff }`| `api-proxy.ts` |
| `EXTRACT_MEMORY` | `{ turns: ScrapedTurn[], sessionId }` | `{ success: boolean, extractedDimensions }`| `api-proxy.ts` |
| `TOGGLE_SIDEPANEL` | `{}` | `{ success: boolean, isOpen: boolean }` | `sidepanel-manager.ts` |
| `TOGGLE_SPLIT_VIEW` | `{ fromIframe: boolean }` | `{ success: boolean, splitViewActive }` | `sidepanel-manager.ts` |
| `HARVEST_START` | `{ tabId, options }` | `{ success: boolean, jobId: string }` | `harvest/orchestrator.ts` |
| `SUPABASE_SYNC` | `{ action: 'pull' \| 'push' }` | `{ success: boolean, count: number }` | `supabase/sync-service.ts` |

---

## 5. Verification & Reliability Invariants

1. **Async Return Invariant**: When handling asynchronous requests inside `chrome.runtime.onMessage`, the listener handler **must return `true`**. Failing to return `true` prematurely closes the message port and triggers `The message port closed before a response was received`.
2. **Crash Resilience**: Background functions wrap external network calls and storage operations in try-catch boundaries, logging via `bgLog` and returning standardized `{ success: false, error: string }` responses rather than throwing unhandled exceptions.
3. **Unit Test Coverage**: Core background services are verified via Vitest using `fake-indexeddb` and mock Chrome Extension APIs (`tests/background.test.ts`).
