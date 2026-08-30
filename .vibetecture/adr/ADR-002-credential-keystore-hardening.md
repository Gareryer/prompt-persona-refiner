# ADR-002: Web Crypto AES-GCM Credential Keystore & Perimeter Hardening

- **Status:** Accepted
- **Date:** 2026-08-24
- **Author:** Vibetecture Lead Architect
- **Tags:** security, webcrypto, aes-gcm, keystore, mv3

---

## Context & Problem Statement
The brownfield audit revealed that security/runtime-security.js previously used an ephemeral XOR-based obfuscation scheme, while model/model-registry.js passed API keys as URL query parameters in dynamic model discovery queries. In a Manifest V3 browser extension environment, sensitive credentials (Gemini, OpenAI, Anthropic API keys and Supabase tokens) must be strongly protected against local exfiltration, memory dump leaks, and URL query logging.

---

## Decision Outcome
**Chosen Option:** Standardize all persistent key storage on Web Crypto API AES-GCM 256-bit encryption with PBKDF2 key derivation (background/services/crypto.js).

1. **Header-Only Authentication:** All outbound LLM API requests must provide keys via Authorization: Bearer <key> or x-goog-api-key: <key> request headers; URL query parameters are strictly forbidden.
2. **Context Isolation:** Content scripts in content/** and page scripts across bridge/** are disallowed from accessing raw cryptographic keys.
3. **Decryption at Point of Use:** API keys are decrypted only in the background service worker immediately prior to outbound network dispatch.

### Consequences
- **Positive:** Eliminates URL key exposure in browser network inspection and proxy logs; protects stored keys in chrome.storage.local with standard AES-GCM authenticated cipher.
- **Trade-offs:** Outbound requests require an asynchronous decryption hop in the background service worker before dispatch.
