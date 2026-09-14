# 05 - Storage Architecture & WXT Storage Engine

> **Target Layer**: WebExtension Storage Subsystem  
> **Core Module**: `@wxt-dev/storage` (`wxt/storage`) & `wxt-extension/src/lib/storage/`  
> **Storage Areas**: `local`, `session`, `sync`  
> **Classification**: Storage Schema & Reactive Persistence Specification

---

## 1. Overview & WXT Storage Engine

Standard Chrome extension storage (`chrome.storage.local`) suffers from lack of type safety, missing default value guarantees, manual JSON serialization, and callback boilerplate. 

**Allie Persona & Prompt Refiner** utilizes **WXT Storage (`@wxt-dev/storage`)**, which provides:
- **Type-Safe Item Definitions**: Every storage entry is defined with a TypeScript type and fallback default.
- **Unified Namespacing**: Seamless prefixing across `local:`, `session:`, `sync:`, and `managed:`.
- **Reactive Watchers**: Component-level subscriptions that trigger automatic UI updates when storage items mutate.
- **Atomic Migrations**: Declarative migration chains that transform data across schema version bumps.

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
│ - local:active_persona            │ - session:refinementCounter       │ - sync:user_settings           │
│ - local:personas                  │ - session:activeSessionId         │ - sync:theme_preference        │
│ - local:persona_drafts            │ - session:splitViewActive         │                                │
│ - local:api_keys (Encrypted)      │ - session:active_extraction_locks │                                │
│ - session_{sessionId}             │                                   │                                │
└───────────────────────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Defined Storage Items & Schemas (`src/lib/storage/items.ts`)

```typescript
import { storage } from 'wxt/storage';
import type { PersonaV4 } from '@/core/memory/schemas';
import type { UserSettings, PersonaDraft, RatingRecord, SyncAction } from './items';

// 1. Currently Active Persona
export const activePersonaItem = storage.defineItem<PersonaV4 | null>('local:active_persona', {
  defaultValue: null,
  version: 4
});

// 2. User Persona Library Dictionary
export const personasLibraryItem = storage.defineItem<Record<string, PersonaV4>>('local:personas', {
  defaultValue: {},
  version: 4
});

// 3. Global User Settings
export const userSettingsItem = storage.defineItem<UserSettings>('local:user_settings', {
  defaultValue: {
    theme: 'system',
    activeModelProvider: 'gemini',
    activeModelName: 'gemini-2.5-flash',
    autoRefineOnEnter: false,
    cloudSyncEnabled: false
  },
  version: 1
});

// 4. Rating & Feedback History
export const ratingsHistoryItem = storage.defineItem<RatingRecord[]>('local:ratings_history', {
  defaultValue: [],
  version: 1
});

// 5. Offline Sync Delta Queue
export const syncQueueItem = storage.defineItem<SyncAction[]>('local:sync_queue', {
  defaultValue: [],
  version: 1
});
```

---

## 3. Multi-Context Session Storage Access Level

By default in Manifest V3, `chrome.storage.session` is restricted exclusively to the Background Service Worker. Content scripts cannot read session storage.

To allow low-latency context sharing between the service worker and content scripts without message-passing round trips, the background worker invokes `setAccessLevel` synchronously on boot:

```typescript
// wxt-extension/entrypoints/background.ts
if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
  (chrome.storage.session as any).setAccessLevel({
    accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
  }).catch((err: any) => {
    bgLog('warn', 'Failed to set session storage access level', { error: err?.message });
  });
}
```

---

## 4. Reactive Storage Watchers in React 19

WXT storage items provide a native `.watch()` observer. The Side Panel and Popup subscribe to storage mutations, eliminating manual polling or custom event broadcasters:

```tsx
// wxt-extension/entrypoints/sidepanel/App.tsx
import React, { useEffect, useState } from 'react';
import { activePersonaItem } from '@/lib/storage/items';
import type { PersonaV4 } from '@/core/memory/schemas';

export const PersonaHeader: React.FC = () => {
  const [activePersona, setActivePersona] = useState<PersonaV4 | null>(null);

  useEffect(() => {
    // 1. Initial async read
    activePersonaItem.getValue().then(setActivePersona);

    // 2. Subscribe to reactive mutations
    const unwatch = activePersonaItem.watch((newPersona) => {
      setActivePersona(newPersona);
    });

    return () => unwatch();
  }, []);

  return (
    <header className="persona-header">
      <h3>{activePersona?.metadata?.suggested_name || 'Default Persona'}</h3>
    </header>
  );
};
```

---

## 5. Quota Management & `unlimitedStorage`

The standard Chrome storage quota limits extensions to **10 MB** for `chrome.storage.local` and **100 KB** for `chrome.storage.sync`. 

Because users may store extensive prompt turn histories, multiple persona libraries, and cached exemplars, `wxt.config.ts` declares the **`unlimitedStorage`** permission:

```typescript
// wxt-extension/wxt.config.ts
manifest: {
  permissions: [
    'storage',
    'unlimitedStorage',
    'tabs',
    'sidePanel'
  ]
}
```

This bypasses browser disk quotas, allowing the local IndexedDB and `chrome.storage.local` repositories to grow to gigabytes without write failures.

---

## 6. Migration Handling

WXT provides built-in migration hooks to gracefully transform data across schema version bumps:

```typescript
export const legacyMigratedPersonas = storage.defineItem<Record<string, PersonaV4>>('local:personas', {
  defaultValue: {},
  version: 4,
  migrations: {
    2: (oldVal: any) => migrateV1ToV2(oldVal),
    3: (oldVal: any) => migrateV2ToV3(oldVal),
    4: (oldVal: any) => migrateV3ToV4(oldVal) // Converts flat structures to 7 dimensions
  }
});
```
