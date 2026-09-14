# 05 - Storage Architecture & WXT Storage Engine

> **Target Layer**: WebExtension Storage Subsystem  
> **Core Module**: `@wxt-dev/storage` (`wxt/storage`) & `wxt-extension/src/lib/storage/`  
> **Storage Areas**: `local`, `session`, `sync`  
> **Classification**: Storage Schema & Reactive Persistence Specification

---

## 1. Overview & WXT Storage Engine

Standard Chrome extension storage (`chrome.storage.local`) lacks runtime type validation, default fallback guarantees, and reactive event hooks. 

**Allie Persona & Prompt Refiner** relies on **WXT Storage (`@wxt-dev/storage`)**, which delivers:
- **Type-Safe Item Definitions**: Every key is defined with an immutable TypeScript contract and fallback default.
- **Unified Namespacing**: Seamless prefixing across `local:`, `session:`, `sync:`, and `managed:`.
- **Reactive Watchers**: Component-level subscriptions (`item.watch()`) driving real-time React 19 UI updates.
- **TanStack Query Cache Sync**: Keeps async client state synchronized across background and frontend windows without HTTP refetches.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       WXT Storage Architecture                                         │
├───────────────────────────────────┬───────────────────────────────────┬────────────────────────────────┤
│ Area: local:                      │ Area: session:                    │ Area: sync:                    │
│ (chrome.storage.local)            │ (chrome.storage.session)          │ (chrome.storage.sync)          │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────┤
│ • Long-term disk persistence      │ • In-memory fast volatile storage │ • Cross-device browser sync    │
│ • Quota: unlimitedStorage         │ • Cleared on browser shutdown     │ • Quota: ~100 KB total         │
│ • Survives browser restarts       │ • Multi-context access enabled    │ • Profile-bound                │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────┤
│ Items:                            │ Items:                            │ Items:                         │
│ - local:settings:ai               │ - session:refinementCounter       │ - sync:user_settings           │
│ - local:settings:ui               │ - session:activeSessionId         │ - sync:theme_preference        │
│ - local:personas                  │ - session:splitViewActive         │                                │
│ - local:security:keys             │ - session:active_extraction_locks │                                │
│ - session_{sessionId}             │                                   │                                │
└───────────────────────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Defined Storage Items & Schema Contracts (`src/lib/storage/items.ts`)

### 2.1 AI Settings Schema
```typescript
export interface AISettings {
  provider: 'gemini' | 'openai' | 'anthropic' | 'openrouter';
  model: string;
  selectedModels: Record<string, string>;
  autoRefine: boolean;
  confidenceThreshold: number;
  contextMenuEnabled: boolean;
}

export const aiSettingsItem = storage.defineItem<AISettings>('local:settings:ai', {
  defaultValue: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    selectedModels: {},
    autoRefine: false,
    confidenceThreshold: 0.6,
    contextMenuEnabled: true
  },
  version: 2
});
```

### 2.2 UI Settings Schema
```typescript
export interface UISettings {
  theme: 'system' | 'light' | 'dark';
  sidebarCollapsed: boolean;
  onboardingCompleted: boolean;
  extensionVersion: string;
  activeTab: string;
}

export const uiSettingsItem = storage.defineItem<UISettings>('local:settings:ui', {
  defaultValue: {
    theme: 'system',
    sidebarCollapsed: false,
    onboardingCompleted: false,
    extensionVersion: '1.0.0',
    activeTab: 'personas'
  },
  version: 1
});
```

### 2.3 Personas & History
```typescript
export const personasLibraryItem = storage.defineItem<Record<string, PersonaV4>>('local:personas', {
  defaultValue: {},
  version: 4
});

export const activePersonaItem = storage.defineItem<PersonaV4 | null>('local:active_persona', {
  defaultValue: null,
  version: 4
});

export const syncQueueItem = storage.defineItem<SyncAction[]>('local:sync_queue', {
  defaultValue: [],
  version: 1
});
```

---

## 3. Storage + TanStack Query Synchronization Pattern

To achieve instant UI reactivity across multiple open tabs and sidepanels without stale state:

```typescript
// wxt-extension/src/hooks/usePersonasQuery.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { personasLibraryItem } from '@/lib/storage/items';

export function usePersonasQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['personas'],
    queryFn: () => personasLibraryItem.getValue(),
    staleTime: Infinity // Keep cached indefinitely
  });

  // Watch for background storage updates
  useEffect(() => {
    const unwatch = personasLibraryItem.watch((newPersonas) => {
      queryClient.setQueryData(['personas'], newPersonas);
    });
    return () => unwatch();
  }, [queryClient]);

  return query;
}
```

---

## 4. Multi-Context Session Storage Access Level

In Manifest V3, `chrome.storage.session` is inaccessible to content scripts by default. On boot, the background worker elevates access:

```typescript
// wxt-extension/entrypoints/background.ts
if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
  (chrome.storage.session as any).setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
  }).catch((err: any) => {
    bgLog('warn', 'Failed to set session access level', { error: err?.message });
  });
}
```

---

## 5. Quota Management & `unlimitedStorage`

Standard quota limits extensions to **10 MB** of local storage. `wxt.config.ts` declares **`unlimitedStorage`** to ensure rich multi-turn conversation logs and persona libraries never exceed browser limits.
