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

Every inter-context message request and response pair is codified in `ProtocolMap`:

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

## 3. Client Messaging Wrapper (`src/lib/messaging/client.ts`)

Components and content scripts invoke the background worker through a typed helper:

```typescript
// wxt-extension/src/lib/messaging/client.ts
import type { ProtocolMap } from './protocol';

export async function sendMessage<K extends keyof ProtocolMap>(
  type: K,
  payload?: ProtocolMap[K]['request']
): Promise<ProtocolMap[K]['response']> {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return reject(new Error('Extension runtime not available'));
    }

    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      resolve(response);
    });
  });
}
```

---

## 4. Background Message Dispatcher (`src/services/message-dispatcher.service.ts`)

In `background.ts`, requests are processed through `handleMessage`:

```typescript
// wxt-extension/src/services/message-dispatcher.service.ts
export async function dispatchMessage(
  message: { type: string; payload?: any },
  sender: chrome.runtime.MessageSender
): Promise<any> {
  switch (message.type) {
    case 'CHECK_API_KEY':
      return await checkApiKeyStatus();
    case 'REFINE_PROMPT':
      return await handleRefinement(message.payload);
    case 'EXTRACT_PERSONA':
      return await handleExtraction(message.payload);
    case 'GET_PERSONAS':
      return await personasRepository.getAll();
    case 'SAVE_PERSONA':
      return await personasRepository.save(message.payload.id, message.payload.persona);
    default:
      throw new Error(`Unhandled message type: ${message.type}`);
  }
}
```

---

## 5. Long-Lived Streaming Ports (`chrome.runtime.Port`)

For continuous events (such as streaming tokens during prompt refinement or pushing turn updates to the sidepanel), one-shot `sendMessage` is replaced by dedicated bidirectional ports:

```typescript
// Background Connection Listener
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    handleSidepanelConnect(port);
  }
});
```

### Event Streaming Protocols:
- **`MEMORY_UPDATED`**: Emitted to all open sidepanels when session turns are scraped and 7-dimension memory updates.
- **`REFINEMENT_COMPLETE`**: Emitted when external LLM finishes generating a refined prompt, triggering live diff view updates.
- **`CLOSE_SIDEPANEL`**: Dispatched to gracefully tear down open split views.

---

## 6. Failure Modes & Resilience Patterns

1. **"Receiving end does not exist"**: Handled via try-catch guards. Occurs when messaging a tab whose content script has not yet initialized.
2. **"Extension context invalidated"**: Silenced gracefully when extension reloads via `ctx.onInvalidated()`.
3. **Async Return Safety**: All handlers explicitly return `true` inside `chrome.runtime.onMessage` to prevent premature port closure.
