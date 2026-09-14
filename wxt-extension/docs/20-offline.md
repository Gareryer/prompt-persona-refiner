# 20 - Offline-First Architecture & Sync Delta Queue

> **Target Layer**: Offline Resilience & Asynchronous Cloud Synchronization  
> **Storage Primitives**: `chrome.storage.local` (Local SSOT) & `local:sync_queue`  
> **Network Protocol**: `navigator.onLine` + Background Drain Replay Queue  
> **Classification**: Offline Operations & Delta Sync Specification

---

## 1. Offline-First Principles in WebExtensions

Unlike traditional Single Page Applications hosted on remote web servers that fail completely when an internet connection drops, browser extensions are **natively offline-first**. 

All compiled assets (HTML shells, React 19 component trees, Vite bundles, CSS stylesheets, and icon assets) reside permanently on the local client disk within the browser's extension installation folder (`.output/chrome-mv3`).

In **Allie Persona & Prompt Refiner**, the local client database (`chrome.storage.local`) is the Single Source of Truth (SSOT). Network connections to cloud services (Supabase, OpenAI, Gemini) are treated as opportunistic enhancements rather than operational blockers.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Offline-First Synchronization Flow                               │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   User Action in UI (Create Persona / Update Dimension / Submit Rating)                                │
│                                │                                                                       │
│                                ▼                                                                       │
│   Commit Immediately to Local Storage (chrome.storage.local) ──► Instant UI Response (0ms Latency)     │
│                                │                                                                       │
│                                ▼                                                                       │
│   Check Connectivity State (navigator.onLine)                                                          │
│                                │                                                                       │
│                ┌───────────────┴───────────────┐                                                       │
│                ▼ ONLINE                        ▼ OFFLINE                                               │
│       Dispatch Immediately to         Append Mutation to Sync Queue                                    │
│       Supabase REST API Gateway       (local:sync_queue Item)                                          │
│                                                │                                                       │
│                                                ▼                                                       │
│                                       Wait for Network Reconnect                                       │
│                                       window.addEventListener('online', ...)                           │
│                                                │                                                       │
│                                                ▼                                                       │
│                                       Background Worker Drains Queue                                   │
│                                       Replays SyncActions in Chronological Order                       │
│                                       (Last-Write-Wins Conflict Resolution)                            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Feature Availability Matrix (Online vs. Offline)

| Capability / Subsystem | Offline Availability | Behavior when Disconnected |
| :--- | :--- | :--- |
| **Persona Library Management** | 🟢 **100% Functional** | Create, edit, clone, delete, and organize personas in local storage. |
| **7-Dimension Memory Editing** | 🟢 **100% Functional** | Adjust tones, reasoning frameworks, and constraints with immediate persistence. |
| **History & Scraped Turns** | 🟢 **100% Functional** | Browse previous conversation sessions and prompt refinement logs. |
| **Export Persona Data** | 🟢 **100% Functional** | Export persona collections to local JSON / CSV files via client-side download. |
| **Rule-Based Refinement Fallback**| 🟢 **100% Functional** | Deterministically compiles persona prefixes and constraints without an LLM. |
| **AI Model Prompt Refinement** | 🔴 *Requires Internet* | Displays connection error banner; suggests deterministic rule-based assembly. |
| **Community Persona Discovery** | 🔴 *Requires Internet* | Caches previously downloaded community personas; hides marketplace search. |
| **Community Ratings Submission** | 🟡 *Queued Offline* | Saved locally to `sync_queue` and published to Supabase upon reconnection. |

---

## 3. The Offline Delta Queue (`local:sync_queue`)

When the user performs an action that targets cloud synchronization (such as publishing an updated persona or submitting a template rating) while disconnected, the mutation is serialized as a `SyncAction`:

```typescript
// wxt-extension/src/lib/storage/items.ts
export interface SyncAction {
  id: string;               // Unique Action UUID
  action: 'create' | 'update' | 'delete';
  entity: 'persona' | 'rating';
  payload: any;             // Exact data payload to sync
  timestamp: number;        // Epoch millisecond timestamp
}
```

### Queue Management:
- Actions are appended atomically to `storage.defineItem<SyncAction[]>('local:sync_queue')`.
- If an entity is updated multiple times while offline, mutations are squashed: subsequent `update` actions merge into the existing payload, reducing network overhead upon reconnection.

---

## 4. Background Queue Drainer & Conflict Resolution

When the browser detects network restoration (`navigator.onLine === true` or an `online` window event), the Background Service Worker initiates a drain cycle:

```typescript
// wxt-extension/src/core/supabase/sync-service.ts
export async function drainSyncQueue(): Promise<void> {
  if (!navigator.onLine) return;

  const queue = await syncQueueItem.getValue();
  if (!queue || queue.length === 0) return;

  bgLog('info', `Draining sync queue (${queue.length} pending actions)...`);

  const remainingActions: SyncAction[] = [];

  for (const item of queue) {
    try {
      if (item.entity === 'persona') {
        await syncPersonaToCloud(item.action, item.payload);
      } else if (item.entity === 'rating') {
        await syncRatingToCloud(item.payload);
      }
    } catch (err: any) {
      bgLog('warn', 'Failed to sync queue item, preserving for retry', { id: item.id, err: err.message });
      remainingActions.push(item);
    }
  }

  await syncQueueItem.setValue(remainingActions);
  bgLog('info', `Sync queue drain complete. Remaining: ${remainingActions.length}`);
}
```

### Conflict Resolution Strategy: Last-Write-Wins (LWW)
- In the event of conflicting edits between client devices, the mutation with the higher `updated_at` epoch timestamp takes precedence.
- If a cloud record has been modified by another session while the client was offline, the local record is preserved in a backup slot (`local:persona_conflict_backup`) before the cloud update is pulled.

---

## 5. Offline Rule-Based Prompt Refinement Fallback

If a user hits `Ctrl+Shift+R` to refine a prompt while offline or when the external LLM provider returns a network failure (`status: 0`), the extension provides a deterministic prompt compiler:

```
[PERSONA CONTEXT: Senior Systems Architect]
[REASONING FRAMEWORK: First-Principles Analysis]
[TONE: Direct, technical, concise]
[NEGATIVE CONSTRAINTS: No pleasantries, code-first, verify invariants]

USER REQUEST:
{raw_prompt}
```

This ensures that the user's structured persona directives are applied to the prompt even without an active internet connection or available LLM API quota.
