# 03 - API Architecture & External Provider Integration

> **Target Layer**: Multi-Provider LLM Gateway & Cloud Services  
> **Core Implementation**: `wxt-extension/src/core/orchestration/api-proxy.ts` & `wxt-extension/src/core/supabase/`  
> **Host Permissions**: Declared in `wxt-extension/wxt.config.ts`  
> **Classification**: API Protocols & Model Gateway Specification

---

## 1. Overview & Multi-Provider Architecture

**Allie Persona & Prompt Refiner** features a vendor-neutral AI communication gateway designed to interact directly with leading generative AI foundation model providers.

Because the extension runs with privileged Manifest V3 `host_permissions`, external API requests bypass browser Cross-Origin Resource Sharing (CORS) constraints when executed from within the **Background Service Worker**.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     Multi-Provider API Gateway Topology                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                     Background Service Worker Runtime                                  │
│                                                                                                        │
│   ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                       API Proxy Dispatcher                                      │  │
│   │                                  (src/core/orchestration/api-proxy.ts)                          │  │
│   └───────────────┬─────────────────────────────────┬────────────────────────────────┬──────────────┘  │
│                   │                                 │                                │                 │
│                   ▼                                 ▼                                ▼                 │
│   ┌───────────────────────────────┐ ┌───────────────────────────────┐ ┌──────────────────────────────┐ │
│   │    Google Generative AI       │ │       OpenAI / OpenRouter     │ │        Anthropic Claude      │ │
│   │  - gemini-2.5-flash           │ │  - gpt-4o / gpt-4o-mini       │ │  - claude-3-7-sonnet         │ │
│   │  - gemini-2.5-pro             │ │  - deepseek-r1 / llama-3.3    │ │  - claude-3-5-haiku          │ │
│   └───────────────┬───────────────┘ └───────────────┬───────────────┘ └──────────────┬───────────────┘ │
└───────────────────┼─────────────────────────────────┼────────────────────────────────┼─────────────────┘
                    │ HTTPS                           │ HTTPS                          │ HTTPS
                    ▼                                 ▼                                ▼
┌───────────────────────────────────┐ ┌───────────────────────────────┐ ┌────────────────────────────────┐
│ generativelanguage.googleapis.com │ │ api.openai.com / openrouter.ai│ │ api.anthropic.com              │
└───────────────────────────────────┘ └───────────────────────────────┘ └────────────────────────────────┘
                    │                                                                  │
                    │ Cloud BaaS Storage (REST / WebSockets)                           │
                    ▼                                                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Supabase Backend as a Service (BaaS)                                   │
│  - REST API (PostgREST): /rest/v1/personas, /rest/v1/ratings                                           │
│  - Community Persona Sync, Version Tracking, and Public Rating Aggregation                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Declared Network Permissions (`wxt.config.ts`)

To ensure unblocked network dispatch without intermediary proxy servers, `wxt.config.ts` declares specific host permissions:

```typescript
// wxt-extension/wxt.config.ts
host_permissions: [
  'https://generativelanguage.googleapis.com/*',
  'https://api.openai.com/*',
  'https://api.anthropic.com/*',
  'https://openrouter.ai/*',
  'https://*.supabase.co/*'
]
```

---

## 3. Provider Integration Specifications

### 3.1 Google Gemini API
- **Base URL**: `https://generativelanguage.googleapis.com/v1beta/models`
- **Default Models**: `gemini-2.5-flash` (Refinement latency $\le 800\text{ms}$), `gemini-2.5-pro` (Complex persona synthesis).
- **Authentication**: API Key passed via `x-goog-api-key` header or `?key=` query parameter.
- **Request Envelope**:
  ```json
  {
    "contents": [
      {
        "role": "user",
        "parts": [{ "text": "Raw user prompt to refine..." }]
      }
    ],
    "systemInstruction": {
      "parts": [{ "text": "REFINEMENT_SYSTEM_PROMPT + 7-Dimension Persona Context" }]
    },
    "generationConfig": {
      "temperature": 0.3,
      "topP": 0.95,
      "maxOutputTokens": 2048,
      "responseMimeType": "text/plain"
    }
  }
  ```

### 3.2 OpenAI API
- **Base URL**: `https://api.openai.com/v1/chat/completions`
- **Default Models**: `gpt-4o-mini`, `gpt-4o`.
- **Authentication**: Bearer token via `Authorization: Bearer <OPENAI_API_KEY>`.
- **Structured Output Protocol**: Utilizes `response_format: { type: "json_object" }` during conversation turn memory extraction to guarantee strict adherence to the Persona V4 schema.

### 3.3 Anthropic Claude API
- **Base URL**: `https://api.anthropic.com/v1/messages`
- **Default Models**: `claude-3-7-sonnet-20250219`, `claude-3-5-haiku-20241022`.
- **Authentication**: `x-api-key: <ANTHROPIC_API_KEY>`, `anthropic-version: 2023-06-01`.
- **Message Protocol**: System prompt separated into top-level `system` property, with turns mapped to `{ role: 'user' | 'assistant', content: string }`.

### 3.4 OpenRouter Universal Gateway
- **Base URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Purpose**: Fallback gateway allowing users to tap open-weights and alternative frontier models (DeepSeek R1/V3, Meta Llama 3.3 70B, Mistral Large).
- **Headers**: Includes `HTTP-Referer: https://github.com/allie-persona-prompt-refiner` and `X-Title: Allie Refiner`.

---

## 4. Supabase Cloud BaaS Integration

Supabase provides optional cloud synchronization for users wishing to back up personas or publish templates to the public community directory:

### 4.1 Endpoints & Table Contracts

| Table | Endpoint | RLS Policy | Purpose |
| :--- | :--- | :--- | :--- |
| `public.personas` | `/rest/v1/personas` | `select: true`, `insert/update: auth.uid() == user_id` | Persona template storage and community discovery |
| `public.ratings` | `/rest/v1/ratings` | `insert: true`, `select: true` | Aggregated prompt satisfaction scores |
| `public.persona_tags` | `/rest/v1/persona_tags` | `select: true` | Taxonomy categorization (Tech, Creative, Business) |

### 4.2 Auth Flow
Authentication utilizes OAuth 2.0 PKCE via `chrome.identity.launchWebAuthFlow`, storing the returned JWT session securely in `chrome.storage.local`.

---

## 5. Error Classification & Normalization (`getUserFriendlyError`)

Upstream error responses are intercepted and mapped into actionable user instructions:

```typescript
// wxt-extension/src/core/orchestration/api-proxy.ts
export function getUserFriendlyError(status: number, rawError: any, provider: string): string {
  switch (status) {
    case 429:
      return `Rate limit exceeded. ${provider} API is temporarily overloaded. Please wait a moment.`;
    case 401:
      return `Invalid API key. Please check your ${provider} key in Extension Options.`;
    case 403:
      return `Access denied. Your ${provider} key lacks permissions for the selected model.`;
    case 404:
      return `Model not found. Please re-verify the model name in Extension Options.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${provider} server error (${status}). Service is temporarily down.`;
    case 0:
      return `Network error. Please check your internet connection.`;
    default:
      return `${provider} error (${status}): ${rawError?.message || 'Unknown error'}`;
  }
}
```

---

## 6. Streaming & Concurrency Protocol

1. **Streaming Support**: Streaming LLM responses are processed via `fetch` with `ReadableStreamDefaultReader` on `response.body`. Text chunks are pushed through active `chrome.runtime.Port` connections directly to the sidepanel and injected diff views.
2. **Abort & Cancellation**: Each request generates an `AbortController`. If a user re-submits or navigates away, `abortController.abort()` cancels the outbound fetch connection immediately, preventing wasteful token burn and duplicate state commits.
