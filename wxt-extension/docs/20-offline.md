# 20 - Offline-First Architecture & Sync Delta Queue

> **Target Layer**: Offline Resilience & Asynchronous Cloud Synchronization  
> **Storage Primitives**: `chrome.storage.local` (Local SSOT) & `local:sync_queue`  
> **Network Protocol**: `navigator.onLine` + Active Health Ping (`NetworkService`)  
> **Classification**: Offline Operations & Delta Sync Specification

---

## 1. Offline-First Principles in WebExtensions

Unlike traditional web applications, browser extensions are **natively offline-first**. 

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
│   Check Connectivity State (NetworkService.isOnline())                                                 │
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

## 2. Active Network Detection Engine (`NetworkService`)

`navigator.onLine` can return false positives (e.g. connected to a Wi-Fi router without WAN internet access). The `NetworkService` verifies true internet reachability via lightweight periodic ping checks:

```typescript
// wxt-extension/src/core/orchestration/network-service.ts
type NetworkStatus = 'online' | 'offline' | 'unknown';

export class NetworkService {
  private status: NetworkStatus = 'unknown';
  private listeners: Set<(online: boolean) => void> = new Set();
  private checkInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.status = navigator.onLine ? 'online' : 'offline';

    window.addEventListener('online', () => this.setStatus('online'));
    window.addEventListener('offline', () => this.setStatus('offline'));

    // Active health ping every 30 seconds to catch captive portals
    this.checkInterval = window.setInterval(() => {
      this.performActiveCheck();
    }, 30000);
  }

  private async performActiveCheck(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://www.gstatic.com/generate_204', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeout);
      this.setStatus('online');
    } catch {
      this.setStatus('offline');
    }
  }

  private setStatus(newStatus: NetworkStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      const isOnline = newStatus === 'online';
      this.listeners.forEach((cb) => cb(isOnline));
    }
  }

  public isOnline(): boolean {
    return this.status === 'online';
  }
}
```

---

## 3. The Offline Delta Queue (`local:sync_queue`)

```typescript
export interface SyncAction {
  id: string;               // Unique Action UUID
  action: 'create' | 'update' | 'delete';
  entity: 'persona' | 'rating';
  payload: any;             // Exact data payload to sync
  timestamp: number;        // Epoch millisecond timestamp
}
```

### Queue Drainer Logic:
When connectivity is restored, the Background Service Worker drains `local:sync_queue` in chronological sequence, pushing queued actions to Supabase with Last-Write-Wins (LWW) conflict resolution.

---

## 4. Offline Fallback Prompt Refinement Compiler

If an LLM API request fails due to network outage, the extension compiles the active persona's dimensions into a deterministic instruction prefix locally:

```
[PERSONA CONTEXT: Senior Systems Architect]
[REASONING FRAMEWORK: First-Principles Analysis]
[TONE: Direct, technical, concise]
[NEGATIVE CONSTRAINTS: No pleasantries, code-first, verify invariants]

USER REQUEST:
{raw_prompt}
```
