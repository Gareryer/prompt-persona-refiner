# 18 - Testing Strategy & Quality Verification Gates

> **Target Layer**: Quality Assurance, Verification Gates, & Automated Testing  
> **Testing Framework**: Vitest v3.0.0 · `fake-indexeddb` v6.2.5 · Playwright E2E  
> **Quality Standard**: 100% Passing Tests (96/96 Units Green, 0 TypeScript Errors)  
> **Classification**: QA & Testing Architecture Specification

---

## 1. Overview & Testing Philosophy

Developing a browser extension that interacts with third-party web applications requires rigorous multi-layer testing:
1. **Unit Testing**: Testing pure domain logic (Zod schema validation, AES-GCM crypto, prompt refinement context compilation) in a zero-DOM headless environment.
2. **Mock Runtime Testing**: Emulating WebExtension APIs (`chrome.runtime`, `chrome.storage.local`, `chrome.storage.session`) to verify service worker routing and IPC buses.
3. **End-to-End (E2E) Browser Testing**: Launching real Chromium/Firefox instances with the compiled extension loaded to verify Shadow DOM rendering and host page DOM interactions.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       5-Tier Quality Verification Gates                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   ┌────────────────────────────────────────────────────────────┐                                       │
│   │ Gate 1: Static Type Safety (tsc --noEmit / bun run typecheck)│                                     │
│   │ Strict TypeScript 5.7+ compiler check -> ZERO errors       │                                       │
│   └─────────────────────────────┬──────────────────────────────┘                                       │
│                                 │ PASSED                                                               │
│                                 ▼                                                                      │
│   ┌────────────────────────────────────────────────────────────┐                                       │
│   │ Gate 2: Behavioral Unit Suites (bun run test / Vitest)     │                                       │
│   │ 14 Test Suites · 96/96 Unit Tests Green (100% passing)     │                                       │
│   └─────────────────────────────┬──────────────────────────────┘                                       │
│                                 │ PASSED                                                               │
│                                 ▼                                                                      │
│   ┌────────────────────────────────────────────────────────────┐                                       │
│   │ Gate 3: Runtime Boundary Audit                             │                                       │
│   │ Synchronous listeners, @wxt-dev/storage, ctx.onInvalidated │                                       │
│   └─────────────────────────────┬──────────────────────────────┘                                       │
│                                 │ PASSED                                                               │
│                                 ▼                                                                      │
│   ┌────────────────────────────────────────────────────────────┐                                       │
│   │ Gate 4: Production Build Integrity (bun run build)         │                                       │
│   │ Clean 2.30 MB chrome-mv3 bundle compiled in under 14s      │                                       │
│   └─────────────────────────────┬──────────────────────────────┘                                       │
│                                 │ PASSED                                                               │
│                                 ▼                                                                      │
│   ┌────────────────────────────────────────────────────────────┐                                       │
│   │ Gate 5: Presentation Isolation Verification                │                                       │
│   │ React 19 Shadow DOM encapsulation via createShadowRootUi   │                                       │
│   └────────────────────────────────────────────────────────────┘                                       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Unit Testing Architecture (`vitest.config.ts`)

Vitest provides sub-second test execution using Vite's native module resolution and aliases:

```typescript
// wxt-extension/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

### Mock Setup Environment (`tests/setup.ts`)
Before tests execute, a mock environment provides emulated WebExtension globals:
- **`fake-indexeddb`**: Replaces the native browser IndexedDB with an in-memory database instance.
- **`chrome.storage` Mocks**: In-memory maps simulating `storage.local` and `storage.session` with asynchronous callbacks and promises.
- **`crypto.subtle`**: Standard Node.js / Happy-DOM Web Crypto implementation executing real PBKDF2 key derivation and AES-GCM operations.

---

## 3. Test Suite Matrix (14 Active Suites)

| Suite File | Scope & Tested Components | Tests | Status |
| :--- | :--- | :--- | :--- |
| `tests/schemas.test.ts` | Zod validation for Persona V4, 7 dimensions, invalid inputs | 12 | 🟢 Pass |
| `tests/crypto.test.ts` | PBKDF2 salt derivation, AES-GCM 256 encryption/decryption roundtrips | 8 | 🟢 Pass |
| `tests/memory-orchestrator.test.ts` | Session resolution, dimension pinning, context assembly | 10 | 🟢 Pass |
| `tests/api-proxy.test.ts` | Multi-provider request building, error code normalization | 9 | 🟢 Pass |
| `tests/storage-repository.test.ts` | `IStorageBackend`, in-memory backend, extension backend fallbacks | 8 | 🟢 Pass |
| `tests/adapters/gemini.test.ts` | Angular DOM scraping, `<pending-request>` re-anchoring | 6 | 🟢 Pass |
| `tests/adapters/chatgpt.test.ts`| Virtualized turn tracking, `data-message-id` extraction | 6 | 🟢 Pass |
| `tests/adapters/claude.test.ts` | ProseMirror submit interception, parent widening | 6 | 🟢 Pass |
| `tests/adapters/deepseek.test.ts`| Synthetic `InputEvent` dispatch and bubble scraping | 5 | 🟢 Pass |
| `tests/diff.test.ts` | HTML character escaping, word-level prompt diff generation | 7 | 🟢 Pass |
| `tests/messaging.test.ts` | Type-safe `sendMessage`, `ProtocolMap` request validation | 5 | 🟢 Pass |
| `tests/theme.test.ts` | `ThemeController` light/dark/system mode propagation | 4 | 🟢 Pass |
| `tests/harvest.test.ts` | Conversation batch extraction, JSZip archive packaging | 5 | 🟢 Pass |
| `tests/sidepanel.test.ts` | Port connection lifecycles, active window port mapping | 5 | 🟢 Pass |

---

## 4. End-to-End (E2E) Browser Testing with Playwright

To verify real-world extension mounting without regressions:

```typescript
// tests/e2e/extension.spec.ts
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';

test('Extension loads unpacked and injects floating refiner badge', async () => {
  const extensionPath = path.resolve(__dirname, '../../.output/chrome-mv3');
  
  const browserContext = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const page = await browserContext.newPage();
  await page.goto('https://gemini.google.com');

  // Verify Shadow DOM mount point exists
  const shadowHost = page.locator('prompt-refiner-overlay');
  await expect(shadowHost).toBeAttached();

  await browserContext.close();
});
```

---

## 5. Verification Commands

```bash
# Verify Gate 1 (Static Contract)
bun run typecheck

# Verify Gate 2 (Unit Suites)
bun run test

# Verify Gate 4 (Build Packaging)
bun run build
```
