# 02 - Backend Architecture & Service Worker Lifecycle

> **Target Environment**: WebExtension MV3 Background Service Worker & Cloud Supabase BaaS  
> **Service Worker Entrypoint**: `wxt-extension/entrypoints/background.ts`  
> **Cloud Backend**: Supabase PostgreSQL 15 · Edge Functions (Deno) · Supabase Auth  
> **Classification**: Dual-Tier Backend Specification (Local Daemon & Cloud Infrastructure)

---

## 1. Dual-Tier Backend Architecture Overview

The backend architecture of **Allie Persona & Prompt Refiner** operates across two distinct tiers:
1. **Local Daemon (Background Service Worker)**: The headless, event-driven extension service worker responsible for cross-context RPC routing, local memory orchestration, cryptographic key decryption, and content script communication.
2. **Cloud Backend (Supabase BaaS)**: The remote infrastructure responsible for OAuth session identity, centralized PostgreSQL relational persistence, Edge Functions for rate limiting, and community persona sharing.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Dual-Tier Backend Topology                                       │
├───────────────────────────────────────────────────────────────────┬────────────────────────────────────┤
│ Tier 1: Local Daemon (Background Service Worker)                  │ Tier 2: Cloud Infrastructure       │
│                                                                   │ (Supabase BaaS & Edge Functions)   │
│   ┌────────────────────────────────────────────────────────────┐  │                                    │
│   │ entrypoints/background.ts (MV3 Service Worker)             │  │  ┌──────────────────────────────┐  │
│   │                                                            │  │  │ Supabase Auth (OAuth)        │  │
│   │  • Synchronous Listeners (onMessage, onConnect, onCommand) │  │  │  - chrome.identity.getAuth() │  │
│   │  • Memory Orchestrator (7-Dimension Context Assembly)      │  │  │  - signInWithIdToken()       │  │
│   │  • API Proxy & Model Gateway (Gemini, OpenAI, Anthropic)   │  │  └──────────────┬───────────────┘  │
│   │  • Web Crypto AES-GCM Vault (Local BYOK)                   │  │                 │                  │
│   │  • Sidepanel Window Port Manager                           │  │                 ▼                  │
│   │  • Harvest Archival Engine                                 │  │  ┌──────────────────────────────┐  │
│   └─────────────────────────────┬──────────────────────────────┘  │  │ PostgreSQL 15 Relational DB  │  │
│                                 │                                 │  │  - profiles, personas, usage │  │
│                                 │ wxtStorageAdapter               │  │  - Row-Level Security (RLS)  │  │
│                                 ▼                                 │  └──────────────┬───────────────┘  │
│   ┌────────────────────────────────────────────────────────────┐  │                 │                  │
│   │ Persistence Layer                                          │  │                 ▼                  │
│   │  • chrome.storage.session (Ephemeral Runtime State)        │  │  ┌──────────────────────────────┐  │
│   │  • chrome.storage.local (Unlimited Local SSOT)             │◄─┼──┼─► Supabase Edge Functions    │  │
│   └────────────────────────────────────────────────────────────┘  │  │  - Rate Limiting & Quotas    │  │
│                                                                   │  │  - Analytics Ingestion       │  │
│                                                                   │  └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Tier 1: Local Service Worker Daemon Lifecycle

### 2.1 Ephemeral Lifecycle Invariant & Statelessness
Chromium terminates idle service workers after ~30 seconds of inactivity.
- **Rule 1**: Never rely on module-scoped global variables for state.
- **Rule 2**: Offload active session counters and extraction locks to `chrome.storage.session`.
- **Rule 3**: Offload long-term personas, histories, and encrypted keys to `chrome.storage.local`.

### 2.2 Synchronous Listener Registration Invariant
All listeners must be declared synchronously within `defineBackground()`:

```typescript
// wxt-extension/entrypoints/background.ts
export default defineBackground(() => {
  bgLog('info', 'Background service worker starting (WXT Modular Engine)...');

  // Synchronous session storage access level setup
  if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
    (chrome.storage.session as any).setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }).catch(() => {});
  }

  // Synchronous message routing
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender, sendResponse);
    return true; // Keep message channel open for async execution
  });

  // Synchronous port connection handling
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') handleSidepanelConnect(port);
  });
});
```

---

## 3. Tier 2: Cloud Infrastructure & Supabase Integration

### 3.1 OAuth Authentication via `chrome.identity`
Authentication in WebExtensions avoids complex popup redirect loops by leveraging Chrome's native identity API:

```typescript
// wxt-extension/src/core/supabase/auth.ts
import { supabase } from './client';

export async function signInWithGoogle(): Promise<any> {
  // 1. Fetch OAuth token directly from Chrome Identity subsystem
  const token = await chrome.identity.getAuthToken({ interactive: true });
  if (!token?.token) throw new Error('Failed to acquire Chrome identity token');

  // 2. Exchange with Supabase Auth
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: token.token
  });

  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await chrome.identity.clearAllCachedAuthTokens();
}
```

### 3.2 WXT Storage Adapter for Supabase Session Persistence
To persist Supabase authentication sessions across service worker restarts without relying on browser `localStorage` (which is unavailable in MV3 service workers):

```typescript
// wxt-extension/src/core/supabase/storage-adapter.ts
import { storage } from 'wxt/storage';

const authSessionStorage = storage.defineItem<any>('local:supabase_session', {
  defaultValue: null
});

export const wxtStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const val = await authSessionStorage.getValue();
    return val ? JSON.stringify(val) : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await authSessionStorage.setValue(JSON.parse(value));
  },
  removeItem: async (key: string): Promise<void> => {
    await authSessionStorage.setValue(null);
  }
};
```

---

## 4. Supabase Edge Functions Architecture

Edge Functions execute on Deno close to the database:
1. **Rate Limiting (`/functions/v1/check-rate-limit`)**: Evaluates user tier (`free`, `pro`) and daily token usage against the `usage` table before allowing expensive multi-turn harvest jobs.
2. **Community Marketplace Sync (`/functions/v1/community-sync`)**: Validates submitted persona schemas against the Zod V4 schema before publishing to the public community index.

---

## 5. Background Subsystems Reference

| Subsystem | File Path | Scope & Responsibility |
| :--- | :--- | :--- |
| **Memory Orchestrator** | `src/core/orchestration/memory-orchestrator.ts` | Session resolution (`/app/<id>`), 7-dimension CRUD, dynamic context assembler |
| **API Proxy** | `src/core/orchestration/api-proxy.ts` | Cross-provider dispatch, error normalization, AbortController tracking |
| **Sidepanel Manager** | `src/core/orchestration/sidepanel-manager.ts` | Port registry (`openSidepanelPorts`), window mapping, split-view coordination |
| **Session State** | `src/core/orchestration/session-state.ts` | Atomic counter increments, extraction locks in `chrome.storage.session` |
| **Harvest Engine** | `src/core/harvest/orchestrator.ts` | Conversation turn batching and ZIP packaging with `jszip` |
