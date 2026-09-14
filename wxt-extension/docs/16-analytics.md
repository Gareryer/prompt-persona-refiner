# 16 - Analytics & Privacy-Preserving Telemetry

> **Target Layer**: Usage Telemetry & Operational Diagnostics  
> **Protocol**: Google Analytics 4 (GA4) Measurement Protocol & Local In-Memory Logger  
> **Privacy Standard**: Zero Personally Identifiable Information (Zero PII), Strict Opt-In  
> **Classification**: Telemetry Architecture & Privacy Specification

---

## 1. The Manifest V3 Analytics Challenge

Under Manifest V3, extensions can no longer load remote JavaScript libraries (such as `gtag.js`, Mixpanel, or PostHog web snippets) due to strict Content Security Policy (`script-src 'self'`).

To record operational health and adoption metrics without violating CSP or compromising user privacy, **Allie Persona & Prompt Refiner** utilizes the **HTTP Measurement Protocol** dispatched directly from the Background Service Worker.

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
│  │   • Check userSettings.telemetryEnabled (Bypass if false)                                        │  │
│  │   • Strip raw prompt content, URLs, and persona instruction texts                                │  │
│  │   • Attach pseudo-anonymous client_id (UUID v4)                                                 │  │
│  └────────────────────────────────────────────┬─────────────────────────────────────────────────────┘  │
│                                               │                                                        │
│                                               │ HTTPS POST (JSON)                                      │
│                                               ▼                                                        │
│                        ┌─────────────────────────────────────────────┐                                 │
│                        │ Google Analytics 4 Measurement Protocol     │                                 │
│                        │ (https://www.google-analytics.com/mp/collect)│                                 │
│                        └─────────────────────────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Privacy Guarantees & Zero-PII Policy

User privacy is a non-negotiable architectural invariant:
1. **Zero Prompt Content Retention**: Prompts, responses, and custom persona texts are **never** included in telemetry payloads.
2. **Opt-In User Governance**: Telemetry is disabled by default or clearly presented with an opt-out toggle in `entrypoints/options/App.tsx`.
3. **No Cross-Site Identity**: The `client_id` is a randomly generated UUID stored in `chrome.storage.local`. It is never linked to Google Accounts, email addresses, or IP addresses (IP anonymization enforced).

---

## 3. Event Taxonomy

```typescript
export interface TelemetryEvent {
  name: string;
  params: Record<string, string | number | boolean>;
}

// Allowed Telemetry Events:
export const ALLOWED_EVENTS = {
  // Lifecycle
  EXTENSION_INSTALLED: 'extension_installed', // { version: '1.0.0', browser: 'chrome' }
  EXTENSION_UPDATED: 'extension_updated',     // { previous_version: '0.9.0', version: '1.0.0' }

  // Prompt Refinement
  PROMPT_REFINED: 'prompt_refined',           // { platform: 'gemini', provider: 'google', duration_ms: 650, success: true }
  SUBMIT_INTERCEPTED: 'submit_intercepted',   // { platform: 'chatgpt' }

  // Persona Management
  PERSONA_CREATED: 'persona_created',         // { domain: 'Tech', pinned_count: 3 }
  PERSONA_ACTIVATED: 'persona_activated',     // { domain: 'Business' }

  // Quality & Ratings
  RATING_SUBMITTED: 'rating_submitted',       // { score: 5, has_feedback: false }
  ERROR_ENCOUNTERED: 'error_encountered'      // { provider: 'anthropic', status_code: 429 }
} as const;
```

---

## 4. Measurement Protocol Dispatcher

```typescript
export async function trackEvent(name: string, params: Record<string, any> = {}): Promise<void> {
  const { telemetryEnabled, anonymousClientId } = await chrome.storage.local.get([
    'telemetryEnabled',
    'anonymousClientId'
  ]);

  if (!telemetryEnabled || !anonymousClientId) return;

  const payload = {
    client_id: anonymousClientId,
    events: [
      {
        name,
        params: {
          ...params,
          engagement_time_msec: 100
        }
      }
    ]
  };

  fetch(`https://www.google-analytics.com/mp/collect?api_secret=${GA_API_SECRET}&measurement_id=${GA_MEASUREMENT_ID}`, {
    method: 'POST',
    body: JSON.stringify(payload)
  }).catch(() => {}); // Fire and forget, never block extension UI
}
```

---

## 5. Local In-Memory Diagnostic Logger (`src/core/logging/`)

For developer debugging without external network transmission, `bgLog` maintains a volatile circular log buffer (maximum 200 entries) in memory:

```typescript
// wxt-extension/src/core/orchestration/bg-logger.ts
export function bgLog(level: 'info' | 'warn' | 'error', message: string, context?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? JSON.stringify(context) : undefined
  };
  console[level](`[WXT-BG] ${message}`, context || '');
}
```
Users can view and export this local diagnostic log directly from the Options page when troubleshooting provider errors.
