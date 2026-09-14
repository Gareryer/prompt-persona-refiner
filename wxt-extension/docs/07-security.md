# 07 - Security Architecture & Cryptographic Vault

> **Target Layer**: Cryptographic Key Storage & Boundary Hardening  
> **Core Implementations**: `wxt-extension/src/core/crypto/crypto-service.ts`  
> **Compliance Target**: Manifest V3 Content Security Policy (CSP) & Web Crypto Standards  
> **Classification**: Security Architecture & Threat Mitigation Specification

---

## 1. Threat Model & Trust Boundaries

Browser extensions operate in one of the most hostile runtime environments in software engineering: content scripts are injected directly into complex third-party web pages (`chatgpt.com`, `gemini.google.com`, `claude.ai`) containing megabytes of proprietary scripts, web workers, and continuous DOM mutations.

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

### 2.2 Volatile Ephemeral Lifetime Guarantee
- Plaintext API keys are **never** returned to the content script or injected DOM.
- When an API request is initiated, the Background Service Worker decrypts the key in volatile heap memory, includes it in the HTTPS request header, and allows garbage collection immediately following request dispatch.

---

## 3. Manifest V3 Content Security Policy (CSP) Compliance

WXT enforces full compliance with Chrome Web Store MV3 security policies:

1. **No Remote Code Execution**: All application logic (React 19, Zod, JSZip, UI components) is compiled locally into the extension package at build time. No external `<script src="https://...">` tags are permitted.
2. **Disallowance of `eval()`**: The use of `eval()`, `new Function()`, and WebAssembly string compilation is strictly disabled. All template interpolation uses typed string builders rather than runtime eval routines.
3. **Restricted Script Source**: Manifest declares:
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; object-src 'self';"
   }
   ```

---

## 4. DOM Isolation & Injection Defense

### 4.1 Isolated World Execution
Content scripts execute inside the Chromium **Isolated World**. While the script shares DOM tree access with the host page, JavaScript variables, prototypes, and execution contexts are completely segregated. 
- Host page scripts cannot inspect extension variables.
- Malicious host scripts cannot tamper with `Array.prototype` or `Object.prototype` within the content script context.

### 4.2 Shadow DOM Encapsulation
Injected overlays are mounted inside an open Shadow Root using `createShadowRootUi`. This provides:
- **CSS Style Confinement**: Host styles cannot alter extension buttons or prompt diff overlays.
- **Event Scoping**: Internal extension clicks and interactions remain scoped to the Shadow Root unless explicitly forwarded.

### 4.3 HTML Sanitization & Diff Escaping
Prompt comparison diffs render HTML highlights representing additions and deletions. To eliminate stored XSS risks, all user prompt content is sanitized via strict character entity replacement before injection:

```typescript
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```

---

## 5. Permission Minimization & Network Bounds

In accordance with the Principle of Least Privilege:
- **No `<all_urls>` Wildcards**: The extension restricts `matches` and `host_permissions` strictly to supported AI chatbot domains (`gemini.google.com`, `chatgpt.com`, `claude.ai`, `chat.deepseek.com`, `grok.com`, `meta.ai`) and authorized model APIs.
- **Sensitive Web APIs Excluded**: No access requested for `webRequestBlocking`, `cookies`, or arbitrary tab management.
