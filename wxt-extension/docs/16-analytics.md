# 16 - Analytics, Privacy-Preserving Telemetry & Feature Flags

> **Target Layer**: Usage Telemetry, Feature Flags & Operational Diagnostics  
> **Protocol**: HTTPS Measurement Protocol / Supabase Edge Endpoint & Local Circular Logger  
> **Privacy Standard**: Zero Personally Identifiable Information (Zero PII), Strict Opt-In, Monthly ID Rotation  
> **Classification**: Telemetry Architecture, Privacy & Feature Flag Specification

---

## 1. The Manifest V3 Analytics Challenge

Under Manifest V3, browser extensions can no longer inject remote third-party scripts (such as `gtag.js`, Mixpanel, or PostHog CDN snippets) due to strict Content Security Policy (`script-src 'self'`).

To record operational health and adoption metrics without violating CSP or compromising user privacy, **Allie Persona & Prompt Refiner** utilizes a **batched HTTP ingestion protocol** dispatched directly from the Background Service Worker.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Privacy-Preserving Telemetry Engine                                  │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   ┌───────────────────────────┐         ┌───────────────────────────┐                                  │
│   │ Refinement Flow Executed  │         │ Rating Submitted in UI    │                                  │
│   └─────────────┬─────────────┘         └─────────────┬─────────────┘                                  │
│                 │                                     │                                                │
│                 ▼                                     ▼                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                                 Background Telemetry Sanitizer                                   │  │
│  │                              (wxt-extension/src/core/logging/)                                   │  │
│  │                                                                                                  │  │
│  │   • Check userSettings.telemetryOptIn (Bypass immediately if false)                              │  │
│  │   • Strip raw prompt text, persona instructions, and host chat URLs                              │  │
│  │   • Attach pseudo-anonymous client_id (UUID v4 rotated every 30 days)                            │  │
│  │   • Batch events into memory queue (flushed every 30s or upon 10 items)                          │  │
│  └────────────────────────────────────────────┬─────────────────────────────────────────────────────┘  │
│                                               │                                                        │
│                                               │ HTTPS POST (JSON)                                      │
│                                               ▼                                                        │
│                        ┌─────────────────────────────────────────────┐                                 │
│                        │ HTTP Telemetry Endpoint / GA4 Measurement   │                                 │
│                        │ (https://www.google-analytics.com/mp/collect)│                                 │
│                        └─────────────────────────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Privacy Guarantees & Data Classification

Privacy is a non-negotiable architectural invariant:

| Privacy Rule | Implementation Contract |
| :--- | :--- |
| **Strict Opt-In** | Telemetry is disabled by default. The user must explicitly toggle analytics in Settings. |
| **Zero PII** | Never collect email, IP address, user accounts, prompts, or persona instructions. |
| **Rotated Client ID** | Random UUID v4 generated locally in storage and automatically rotated every 30 days. |
| **Silent Fail-Safe** | Any network or API failure during telemetry logging is completely silent and non-blocking. |
| **Transparent UI** | Settings page provides an explicit bulleted list of collected vs protected items. |

### Data Classification Matrix
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA CLASSIFICATION                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   🟢 SAFE TO COLLECT (Strictly Opt-In)                                      │
│   ────────────────────────────────────                                      │
│   • Feature invocation counts (refine triggered, persona created)           │
│   • Platform distribution (Gemini 55%, ChatGPT 30%, Claude 15%)             │
│   • Extension version, browser target (chrome/firefox), OS platform         │
│   • Categorical error codes (e.g., 'RATE_LIMIT_EXCEEDED', no stack traces)  │
│   • Feature flag assignments                                                 │
│   • Model provider distribution (Gemini vs OpenAI vs Anthropic)             │
│                                                                              │
│   🔴 NEVER COLLECTED (Architectural Invariant)                              │
│   ────────────────────────────────────────────                              │
│   • Raw prompt text (original, draft, or refined)                           │
│   • Persona content, system prompts, or persona names                       │
│   • Provider API keys or encrypted key blobs                                │
│   • Google / GitHub user email addresses                                    │
│   • User IP addresses (disabled via backend ingestion proxy)                │
│   • Host chat conversation URLs or thread titles                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Event Taxonomy

```typescript
// wxt-extension/src/core/logging/telemetry-types.ts

export type EventName =
  // Lifecycle
  | 'extension_installed'
  | 'extension_updated'
  // Refinement
  | 'refine_started'
  | 'refine_completed'
  | 'refine_failed'
  // Personas
  | 'persona_created'
  | 'persona_deleted'
  | 'persona_marketplace_forked'
  // Feedback
  | 'rating_submitted'
  // Feature Flags
  | 'feature_flag_evaluated';

export interface TelemetryEvent {
  name: EventName;
  properties?: Record<string, string | number | boolean>;
}
```

---

## 4. Telemetry Service Implementation

```typescript
// wxt-extension/src/core/logging/telemetry-service.ts
import { storage } from 'wxt/storage';
import { bgLog } from '@/core/orchestration/bg-logger';

interface TelemetryConfig {
  optIn: boolean;
  clientId: string;
  clientIdRotatedAt: number;
}

class TelemetryService {
  private queue: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly ROTATION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

  async initialize(): Promise<void> {
    const config = await this.getConfig();
    if (!config.optIn) return;

    // Check if client ID needs rotation
    if (!config.clientId || Date.now() - config.clientIdRotatedAt > this.ROTATION_PERIOD_MS) {
      await this.rotateClientId();
    }

    // Flush batch every 30 seconds
    this.flushTimer = setInterval(() => this.flush(), 30000);
  }

  async track(event: TelemetryEvent): Promise<void> {
    const config = await this.getConfig();
    if (!config.optIn) return;

    // Sanitize properties to eliminate accidental text leaks
    const sanitizedProps = this.sanitizeProps(event.properties);
    this.queue.push({ name: event.name, properties: sanitizedProps });

    if (this.queue.length >= 10) {
      await this.flush();
    }
  }

  private sanitizeProps(props?: Record<string, any>): Record<string, string | number | boolean> | undefined {
    if (!props) return undefined;
    const clean: Record<string, string | number | boolean> = {};

    for (const [key, val] of Object.entries(props)) {
      if (typeof val === 'string') {
        // Drop any value containing email or suspicious length
        if (!val.includes('@') && val.length <= 64) {
          clean[key] = val;
        }
      } else if (typeof val === 'number' || typeof val === 'boolean') {
        clean[key] = val;
      }
    }
    return clean;
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    const config = await this.getConfig();
    if (!config.optIn) return;

    try {
      await fetch('https://www.google-analytics.com/mp/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: config.clientId,
          events: batch.map(e => ({ name: e.name, params: e.properties }))
        })
      });
    } catch {
      // Fire-and-forget: re-queue up to 50 items
      this.queue = [...batch, ...this.queue].slice(0, 50);
    }
  }

  private async getConfig(): Promise<TelemetryConfig> {
    const res = await chrome.storage.local.get(['telemetryOptIn', 'telemetryClientId', 'telemetryRotatedAt']);
    return {
      optIn: Boolean(res.telemetryOptIn),
      clientId: res.telemetryClientId || '',
      clientIdRotatedAt: res.telemetryRotatedAt || 0,
    };
  }

  private async rotateClientId(): Promise<void> {
    const newId = crypto.randomUUID();
    await chrome.storage.local.set({
      telemetryClientId: newId,
      telemetryRotatedAt: Date.now(),
    });
  }
}

export const telemetry = new TelemetryService();
```

---

## 5. Deterministic Feature Flag System

Feature flags enable controlled canary rollouts and gradual feature deployment across the user base without requiring synchronous remote server requests on extension boot.

### 5.1. Flag Definitions
```typescript
// wxt-extension/src/core/feature-flags/types.ts

export interface FeatureFlag {
  name: string;
  description: string;
  defaultValue: boolean;
  rolloutPercentage: number; // 0 to 100
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  deepseekAdapter: {
    name: 'deepseek_adapter',
    description: 'Enable DeepSeek Chat in-situ injection',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  grokAdapter: {
    name: 'grok_adapter',
    description: 'Enable Grok on x.com and grok.com',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  metaAiAdapter: {
    name: 'meta_ai_adapter',
    description: 'Enable Meta AI chat injection',
    defaultValue: true,
    rolloutPercentage: 100,
  },
  streamingRefinement: {
    name: 'streaming_refinement',
    description: 'Stream prompt tokens directly into input box',
    defaultValue: false,
    rolloutPercentage: 25, // 25% Canary rollout
  }
};
```

### 5.2. Deterministic Hash Evaluation
To ensure a user has a consistent experience across sessions without tracking them, the flag is evaluated using a deterministic hash of `clientId + flagName`:

```typescript
// wxt-extension/src/core/feature-flags/evaluator.ts
import { FEATURE_FLAGS, FeatureFlag } from './types';

export function isFeatureEnabled(flagKey: keyof typeof FEATURE_FLAGS, clientId: string): boolean {
  const flag = FEATURE_FLAGS[flagKey];
  if (!flag) return false;

  if (flag.rolloutPercentage >= 100) return true;
  if (flag.rolloutPercentage <= 0) return false;

  // Consistent 32-bit hash calculation
  const hash = hashString(`${clientId}:${flag.name}`);
  const bucket = hash % 100;
  return bucket < flag.rolloutPercentage;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### 5.3. React Hook (`useFeatureFlag`)
```typescript
// wxt-extension/src/hooks/use-feature-flag.ts
import { useState, useEffect } from 'react';
import { isFeatureEnabled } from '@/core/feature-flags/evaluator';
import { FEATURE_FLAGS } from '@/core/feature-flags/types';

export function useFeatureFlag(flagKey: keyof typeof FEATURE_FLAGS): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    return FEATURE_FLAGS[flagKey]?.defaultValue ?? false;
  });

  useEffect(() => {
    chrome.storage.local.get(['telemetryClientId']).then(({ telemetryClientId }) => {
      if (telemetryClientId) {
        setEnabled(isFeatureEnabled(flagKey, telemetryClientId));
      }
    });
  }, [flagKey]);

  return enabled;
}
```

---

## 6. In-Memory Local Circular Diagnostics (`bgLog`)

For zero-network developer diagnostics:
- A circular in-memory buffer stores the most recent 200 operational log lines.
- No network requests are generated.
- Logs can be viewed or exported as JSON directly from the **Options > Troubleshooting** tab.
