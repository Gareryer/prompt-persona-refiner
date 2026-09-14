# 06 - Messaging Architecture & Cross-Context IPC

> **Target Layer**: Inter-Process Communication (IPC) & Message Dispatcher  
> **Core Implementations**: `wxt-extension/src/lib/messaging/` & `wxt-extension/src/services/message-dispatcher.service.ts`  
> **Protocol Schema**: `wxt-extension/src/lib/messaging/protocol.ts`  
> **Classification**: IPC Bus & Protocol Specification

---

## 1. Overview & Communication Matrix

Because browser extensions under Manifest V3 partition code across strictly isolated execution worlds (Host DOM, Content Script Isolated World, Background Service Worker, and Extension Windows), code in one context cannot directly invoke functions or access memory in another.

All cross-context operations in **Allie Persona & Prompt Refiner** route through an end-to-end type-safe Remote Procedure Call (RPC) messaging bus.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Cross-Context Messaging Bus                                      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   ┌───────────────────────────┐         ┌───────────────────────────┐         ┌─────────────────────┐  │
│   │ Content Script (Injected) │         │ Chrome Side Panel (React) │         │ Action Popup (Menu) │  │
│   └─────────────┬─────────────┘         └─────────────┬─────────────┘         └──────────┬──────────┘  │
│                 │                                     │                                  │             │
│                 │ sendMessage<K>()                    │ sendMessage<K>()                 │             │
│                 │                                     │ or port.postMessage()            │             │
│                 ▼                                     ▼                                  ▼             │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                  Background Service Worker IPC Router                            │  │
│  │                              (src/services/message-dispatcher.service.ts)                        │  │
│  │                                                                                                  │  │
│  │   • Synchronous Listener: chrome.runtime.onMessage.addListener((msg, sender, sendResponse))     │  │
│  │   • Port Connection: chrome.runtime.onConnect.addListener((port) => handleSidepanelConnect)      │  │
│  │   • ProtocolMap Action Matcher (Type-Safe Exhaustive Switch)                                     │  │
│  └──────────────────┬─────────────────────────────────┬──────────────────────────────────┬──────────┘  │
│                     │                                 │                                  │             │
│                     ▼                                 ▼                                  ▼             │
│   ┌───────────────────────────┐         ┌───────────────────────────┐         ┌─────────────────────┐  │
│   │    Memory Orchestrator    │         │    API Proxy / Gateway    │         │  Sidepanel Manager  │  │
│   └───────────────────────────┘         └───────────────────────────┘         └─────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Strong Type Contracts (`ProtocolMap`)

Every message request and response pair is codified in `ProtocolMap`:

```typescript
// wxt-extension/src/lib/messaging/protocol.ts
import type { PersonaV4 } from '@/core/memory/schemas';
import type { UserSettings } from '@/lib/storage/items';

export interface ProtocolMap {
  // 1. Key & Configuration Checks
  CHECK_API_KEY: {
    request: void;
    response: { hasKey: boolean; canOpenOptions?: boolean; error?: string };
  };
  OPEN_OPTIONS_PAGE: {
    request: void;
    response: { success: boolean };
  };

  // 2. Core Prompt Refinement & Persona Extraction
  EXTRACT_PERSONA: {
    request: { prompt: string; provider?: string; model?: string };
    response: { success: boolean; data?: PersonaV4; error?: string };
  };
  REFINE_PROMPT: {
    request: { rawPrompt: string; personaId?: string; activeDimensions?: string[] };
    response: { success: boolean; refinedPrompt?: string; diffHtml?: string; error?: string };
  };
  INJECT_PROMPT_TO_ACTIVE_TAB: {
    request: { text: string };
    response: { success: boolean; error?: string };
  };

  // 3. Persona CRUD
  GET_PERSONAS: {
    request: void;
    response: Record<string, PersonaV4>;
  };
  SAVE_PERSONA: {
    request: { id: string; persona: PersonaV4 };
    response: { success: boolean };
  };
  DELETE_PERSONA: {
    request: { id: string };
    response: { success: boolean };
  };
  PUBLISH_PERSONA: {
    request: { id: string };
    response: { success: boolean; publicId?: string; error?: string };
  };

  // 4. Settings & Preferences
  GET_SETTINGS: {
    request: void;
    response: UserSettings;
  };
  UPDATE_SETTINGS: {
    request: Partial<UserSettings>;
    response: UserSettings;
  };
  SET_THEME: {
    request: { theme: 'dark' | 'light' };
    response: { success: boolean };
  };

  // 5. Memory Dimension Pinning
  PIN_COMPONENT: {
    request: { sessionId: string; componentId: string };
    response: { success: boolean };
  };
  UNPIN_COMPONENT: {
    request: { sessionId: string; componentId: string };
    response: { success: boolean };
  };

  // 6. UI & View Toggles
  TOGGLE_SPLIT_VIEW: {
    request: { fromIframe?: boolean };
    response: { success: boolean; isOpen?: boolean };
  };
}

export type MessageType = keyof ProtocolMap;
```

---

## 3. Client Messaging Wrapper with Timeout Guards (`src/lib/messaging/client.ts`)

```typescript
// wxt-extension/src/lib/messaging/client.ts
import type { ProtocolMap } from './protocol';

export async function sendMessage<K extends keyof ProtocolMap>(
  type: K,
  payload?: ProtocolMap[K]['request'],
  timeoutMs = 15000
): Promise<ProtocolMap[K]['response']> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return reject(new Error('Extension runtime not available'));
    }

    const timer = setTimeout(() => {
      reject(new Error(`Message timeout after ${timeoutMs}ms: ${String(type)}`));
    }, timeoutMs);

    chrome.runtime.sendMessage({ type, payload }, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(response);
    });
  });
}
```

---

## 4. Tab Targeting & Broadcasts (`chrome.tabs.sendMessage`)

To send events from the background daemon directly to a specific active tab (e.g. triggering prompt insertion or toggling split-view):

```typescript
export async function sendTabMessage(tabId: number, type: string, payload: any = {}): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type, payload });
  } catch (err: any) {
    if (err.message.includes('Receiving end does not exist')) {
      // Content script has not loaded yet on this tab, safe to ignore
      return;
    }
    throw err;
  }
}
```

---

## 5. Long-Lived Streaming Ports (`chrome.runtime.Port`)

For continuous events (streaming tokens during refinement or pushing real-time memory updates):
- **`sidepanel` Port**: Bound on mount in `entrypoints/sidepanel/App.tsx`.
- **`MEMORY_UPDATED`**: Dispatched to active sidepanels when session memory mutations occur.
- **`REFINEMENT_COMPLETE`**: Dispatched with full prompt diff when generation completes.
