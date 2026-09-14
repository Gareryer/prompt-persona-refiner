# 03 - API Architecture & External Provider Integration

> **Target Layer**: Multi-Provider LLM Gateway & Cloud Services  
> **Core Implementation**: `wxt-extension/src/core/orchestration/api-proxy.ts` & `wxt-extension/src/core/supabase/`  
> **Host Permissions**: Declared in `wxt-extension/wxt.config.ts`  
> **Classification**: API Protocols & Model Gateway Specification

---

## 1. Overview & Multi-Provider Architecture

**Allie Persona & Prompt Refiner** features a vendor-neutral AI communication gateway designed to interact directly with leading generative AI foundation model providers without mandatory intermediary cloud servers.

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
- **Default Models**: `gemini-2.5-flash`, `gemini-2.5-pro`.
- **Authentication**: `x-goog-api-key: <KEY>` or `?key=<KEY>`.
- **Envelope**:
  ```json
  {
    "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
    "systemInstruction": { "parts": [{ "text": "REFINEMENT_SYSTEM_PROMPT" }] },
    "generationConfig": {
      "temperature": 0.3,
      "topP": 0.95,
      "maxOutputTokens": 2048
    }
  }
  ```

### 3.2 OpenAI API
- **Base URL**: `https://api.openai.com/v1/chat/completions`
- **Default Models**: `gpt-4o`, `gpt-4o-mini`.
- **Authentication**: `Authorization: Bearer <KEY>`.
- **Structured Outputs**: `response_format: { type: "json_object" }` for memory extraction.

### 3.3 Anthropic Claude API
- **Base URL**: `https://api.anthropic.com/v1/messages`
- **Default Models**: `claude-3-7-sonnet-20250219`, `claude-3-5-haiku-20241022`.
- **Headers**: `x-api-key: <KEY>`, `anthropic-version: 2023-06-01`.

### 3.4 OpenRouter Universal Gateway
- **Base URL**: `https://openrouter.ai/api/v1/chat/completions`
- **Purpose**: Universal router for DeepSeek R1/V3, Llama 3.3, Mistral Large.
- **Headers**: `HTTP-Referer: https://github.com/allie-persona-prompt-refiner`, `X-Title: Allie Refiner`.

---

## 4. Error Classification & Structured Normalization

```typescript
export class LLMError extends Error {
  constructor(
    message: string,
    public code: LLMErrorCode,
    public provider: string,
    public status?: number,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export type LLMErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'MODEL_NOT_FOUND'
  | 'CONTEXT_TOO_LONG'
  | 'CONTENT_FILTERED'
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export function parseProviderError(status: number, rawError: any, provider: string): LLMError {
  if (status === 401) {
    return new LLMError('Invalid API key', 'INVALID_API_KEY', provider, status);
  }
  if (status === 429) {
    return new LLMError('Rate limit exceeded', 'RATE_LIMIT', provider, status);
  }
  if (status === 404) {
    return new LLMError('Model not found', 'MODEL_NOT_FOUND', provider, status);
  }
  if (status >= 500) {
    return new LLMError('Provider server error', 'SERVER_ERROR', provider, status);
  }
  return new LLMError('Unknown provider error', 'UNKNOWN', provider, status, rawError);
}
```

---

## 5. API Key Validation Sandbox (`validateApiKey`)

Before persisting a new API key, the Options page executes a lightweight verification ping:

```typescript
export async function validateApiKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === 'gemini') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      return { valid: res.ok };
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return { valid: res.ok };
    }
    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message };
  }
}
```

---

## 6. Streaming & Token Consumption Metrics

Refinement responses capture latency and token consumption metrics:

```typescript
export interface RefinementMetrics {
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  model: string;
  provider: string;
}
```
Tokens are streamed via `ReadableStream` chunks through active `chrome.runtime.Port` connections, providing real-time progressive typing in the injected preview and sidepanel.
