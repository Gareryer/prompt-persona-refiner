# 07 - Security Architecture & Cryptographic Vault

> **Target Layer**: Cryptographic Key Storage & Boundary Hardening  
> **Core Implementations**: `wxt-extension/src/core/crypto/crypto-service.ts`  
> **Compliance Target**: Manifest V3 Content Security Policy (CSP) & Web Crypto Standards  
> **Classification**: Security Architecture & Threat Mitigation Specification

---

## 1. Threat Model & Trust Boundaries

Browser extensions operate in a hostile runtime environment: content scripts are injected directly into complex third-party web pages (`chatgpt.com`, `gemini.google.com`, `claude.ai`) containing megabytes of proprietary scripts and continuous DOM mutations.

**Allie Persona & Prompt Refiner** establishes strict security perimeters across three trust domains:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Security Boundary Architecture                                   │
├───────────────────────────────────┬───────────────────────────────────┬────────────────────────────────┤
│ Host DOM World (UNTRUSTED)        │ Isolated Content World (RESTRICTED│ Extension Background (TRUSTED) │
├───────────────────────────────────┼───────────────────────────────────┼────────────────────────────────┤
│ • Host Page Scripts & Trackers    │ • WXT Content Script Runner       │ • Background Service Worker    │
│ • Third-Party CDN Libraries       │ • IChatbotAdapter DOM Scrapers    │ • Full Extension Permissions   │
│ • Aggressive CSS Frameworks       │ • Shadow DOM Mount Point          │ • Zero Host Page Visibility    │
│                                   │                                   │                                │
│ Threats:                          │ Mitigations:                      │ Mitigations:                   │
│ - DOM Scraping & Token Sniffing   │ - Isolated JavaScript World       │ - PBKDF2 Master Key Derivation │
│ - CSS Injection & UI Spoofing     │ - createShadowRootUi Isolation    │ - AES-GCM 256 Key Encryption   │
│ - Prototype Pollution             │ - Zero Plaintext Secrets in DOM   │ - Strict MV3 CSP Enforced      │
└───────────────────────────────────┴───────────────────────────────────┴────────────────────────────────┘
```

---

## 2. Client-Side Web Crypto Vault (`src/core/crypto/crypto-service.ts`)

Sensitive foundation model API keys (Google Gemini, OpenAI, Anthropic, OpenRouter) are **never** stored in plaintext.

```
Plaintext API Key
       │
       ▼
PBKDF2 Key Derivation (100,000 Iterations, SHA-256, Salt) ──► Master CryptoKey (AES-GCM 256)
                                                                       │
12-Byte Cryptographically Secure Random IV (crypto.getRandomValues) ───┤
                                                                       ▼
                                                       AES-GCM Authenticated Encryption
                                                                       │
                                                                       ▼
                                               Combined Buffer: [12-byte IV] + [Ciphertext + Auth Tag]
                                                                       │
                                                                       ▼
                                                         Stored in chrome.storage.local
                                                         Format: "enc:v1:<Base64>"
```

### 2.1 Key Derivation & AES-GCM Implementation

```typescript
// wxt-extension/src/core/crypto/crypto-service.ts
let cachedKey: CryptoKey | null = null;

export async function getEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const extensionId = typeof chrome !== 'undefined' && chrome?.runtime?.id 
    ? chrome.runtime.id 
    : 'prompt-persona-refiner-v4';
  const salt = new TextEncoder().encode('allie-refiner-api-key-salt-v1');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(extensionId),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return cachedKey;
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  if (!plaintext) return '';
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return 'enc:v1:' + btoa(String.fromCharCode(...combined));
}
```

---

## 3. Chrome Web Store Permission Justification Matrix

During Chrome Web Store review, every declared permission must be strictly justified:

| Permission | Technical Requirement in Allie Refiner | Review Justification |
| :--- | :--- | :--- |
| **`storage`** | `@wxt-dev/storage` schemas | Required to store user personas, settings, and encrypted API keys locally. |
| **`unlimitedStorage`** | Archival & conversation history | Allows local conversation turn history and persona libraries to exceed the default 10MB quota. |
| **`sidePanel`** | `entrypoints/sidepanel/` | Required to provide the persistent 3-tab workspace UI in Chrome's native sidepanel. |
| **`tabs`** | URL parsing & session resolution | Inspects active tab URLs to map sessions (e.g. `/app/<id>` on Gemini) and send responses. |
| **`clipboardWrite`** | Copy refined prompt action | Allows the user to click "Copy Refined Prompt" to system clipboard. |
| **`downloads`** | Harvest export engine | Allows users to download compressed `.zip` and `.json` archives of their conversation exports. |
| **`scripting`** | Dynamic content script fallbacks | Used to ensure content script observers recover if tabs were opened prior to installation. |

---

## 4. Manifest V3 Content Security Policy (CSP) Compliance

WXT enforces full compliance with Chrome Web Store MV3 security policies:

1. **No Remote Code Execution**: All application logic (React 19, Zod, JSZip, UI components) is compiled locally into the extension package at build time. No external `<script src="https://...">` tags are permitted.
2. **Disallowance of `eval()`**: The use of `eval()`, `new Function()`, and WebAssembly string compilation is strictly disabled.
3. **Restricted Script Source**: Manifest declares:
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self';"
   }
   ```

---

## 5. Threat Mitigation Matrix

| Threat | Impact | Mitigation Strategy in Allie Refiner |
| :--- | :--- | :--- |
| **API Key Theft from Disk** | High | Keys encrypted via AES-GCM (256-bit) using PBKDF2 with unique installation salt. Plaintext keys never touch disk. |
| **Host DOM Sniffing** | High | Content scripts execute in Chromium Isolated World. Decrypted keys never leave the Background Service Worker. |
| **CSS Injection / Style Bleed** | Medium | Injected UI is encapsulated inside an isolated Shadow Root via `createShadowRootUi`. |
| **Stored XSS via Prompts** | High | All prompt diffs and scraped texts are sanitized via `escapeHtml()` before rendering to DOM. |
| **Tampering with Community Data**| Critical | Supabase PostgreSQL enforces strict Row-Level Security (RLS). Users can only modify owned personas. |
