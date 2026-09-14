# 18 - Testing Strategy & Quality Verification Gates

> **Target Layer**: Quality Assurance, Verification Gates, & Automated Testing  
> **Testing Framework**: Vitest v3.0.0 · `fake-indexeddb` v6.2.5 · Playwright E2E  
> **Quality Standard**: 100% Passing Tests (14 Suites Green, 96/96 Units, 0 TypeScript Errors)  
> **Classification**: QA & Testing Architecture Specification

---

## 1. Overview & The Testing Pyramid

Testing a multi-chatbot WebExtension requires balancing fast local feedback with real browser guarantees. The test suite adheres to a standard 3-tier testing pyramid:

```
                      ┌────────────────────────┐
                      │    E2E Tests (10%)     │
                      │  Playwright + Unpacked │
                      │  Loaded Extension      │
                      ├────────────────────────┤
                      │ Integration Tests(20%) │
                      │ Multi-Context RPC &    │
                      │ Storage Sync Watchers  │
                      ├────────────────────────┤
                      │   Unit Tests (70%)     │
                      │ 14 Vitest Suites, Zod  │
                      │ Schemas, Crypto Vault  │
                      └────────────────────────┘
```

---

## 2. The 5 Quality Verification Gates

Every pull request and release build must satisfy five immutable operational gates:

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

## 3. Test Coverage Targets & Active Suite Matrix

- **`src/core/memory/`**: 95%+ line coverage (Zod schemas, dimension parsing).
- **`src/core/crypto/`**: 100% line coverage (PBKDF2 derivation, AES-GCM encryption/decryption).
- **`src/core/orchestration/`**: 85%+ line coverage (session resolution, state counters, port routing).
- **`src/adapters/chatbots/`**: 80%+ line coverage (DOM selectors, synthetic events).

### Active Vitest Suite Summary: 14 Suites · 96 Tests · 100% Green
- `tests/schemas.test.ts` (12 tests)
- `tests/crypto.test.ts` (8 tests)
- `tests/memory-orchestrator.test.ts` (10 tests)
- `tests/api-proxy.test.ts` (9 tests)
- `tests/storage-repository.test.ts` (8 tests)
- `tests/adapters/gemini.test.ts` (6 tests)
- `tests/adapters/chatgpt.test.ts` (6 tests)
- `tests/adapters/claude.test.ts` (6 tests)
- `tests/adapters/deepseek.test.ts` (5 tests)
- `tests/diff.test.ts` (7 tests)
- `tests/messaging.test.ts` (5 tests)
- `tests/theme.test.ts` (4 tests)
- `tests/harvest.test.ts` (5 tests)
- `tests/sidepanel.test.ts` (5 tests)

---

## 4. End-to-End Testing with Playwright

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

  const shadowHost = page.locator('prompt-refiner-overlay');
  await expect(shadowHost).toBeAttached();

  await browserContext.close();
});
```
