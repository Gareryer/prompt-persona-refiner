# WXT Strangler Fig Migration Ledger

This document is the authoritative Single Source of Truth (SSOT) tracking the progressive migration from the legacy custom esbuild architecture to the modular WXT TypeScript architecture located in `wxt-extension/`.

---

## 📊 Executive Migration Dashboard

- **Total Legacy Symbols**: 2,509 symbols (excluding external vendor bundles)
- **Ported to WXT**: **1,650 symbols (65.8%)**
- **Intentionally Dropped**: **859 symbols (34.2%)**
  - *782 local intermediate variables inside legacy vanilla JS functions superseded by React 19 state & JSX*
  - *67 imperative DOM renderer functions in `sidepanel.js` superseded by React 19 components*
  - *6 legacy build script routines in `build.js` superseded by WXT / Vite*
  - *1 legacy HTML template string in `content/templates.js` superseded by React 19 JSX*
  - *3 inner event/stream listener closures superseded by async/await pipelines*
- **Unaccounted / Missing**: **0 symbols (0.0%)** — 100% Symbol Traceability & Parity
- **New Additions in WXT**: 636 symbols (TypeScript interfaces, Zod v4 schemas, platform adapters)
- **Unit Test Suites**: **14 passed (96 / 96 tests green, 100% passing)**
- **TypeScript 5.9 Types**: **0 errors (`tsc --noEmit` via `bun run typecheck`)**
- **WXT Production Bundle**: **2.30 MB `chrome-mv3` built cleanly via Vite 6 in 13.4s**
- **Legacy Invariant**: **`npm run build` in root passes in 3.30s with 0 regressions**
- **Target Location**: `wxt-extension/`
- **Output Artifacts**: `wxt-extension/.output/chrome-mv3/` & legacy `dist/`

---

## 📋 Batch Progression & Verification Ledger

| Batch | Subsystem / Layer | Legacy Source Path | WXT Target Path (`wxt-extension/`) | Scope (LOC) | Gates Passed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | **Tooling & Isolated Setup** | `build.js`, `package.json` | `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts` | ~250 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **1** | **V4 Schemas & Contracts** | `memory/component-schemas.js` | `src/core/memory/schemas.ts`, `src/core/types.ts` | ~650 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **2** | **Pure Domain Logic & LLM** | `extractor/extractor.js`, `content/diff.js` | `src/core/extractor/*`, `src/core/refiner/*`, `src/core/memory/context-assembler.ts` | ~1,600 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **3** | **Storage & Supabase Sync** | `storage/*`, `supabase/*` | `src/core/storage/*`, `src/lib/storage/*`, `src/adapters/storage/*` | ~800 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **4** | **Background & Messaging** | `background/*`, `bridge/*` | `entrypoints/background.ts`, `src/core/orchestration/*`, `src/lib/messaging/*` | ~1,400 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **5** | **Multi-Chatbot Adapters** | `content/scraper.js`, `observer.js` | `src/adapters/chatbots/*`, `src/content/scraper.ts`, `src/content/observer.ts`, `entrypoints/content.ts` | ~2,500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **6** | **Injected UI (Shadow DOM)** | `rating/*`, in-page refiner | `src/components/injections/*`, `src/core/rating/*`, `entrypoints/content.ts` | ~1,200 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **7** | **UI Apps (Sidepanel & Options)** | `sidepanel/*`, `options/*` | `entrypoints/sidepanel/*`, `entrypoints/options/*`, `src/core/sidepanel/*`, `src/core/model/*`, `src/core/options/*` | ~6,500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **8** | **Modular Core & Services** | Core engine services | `src/core/crypto/*`, `src/core/model/*`, `src/core/llm/*`, `src/core/theme/*`, `src/core/logging/*`, `src/core/rating/*` | ~2,800 | `[G1, G2, G4, Inv3]` | 🟢 Complete |

---

## 🔒 Verification Gate Definitions & Current Audit Results

- **Gate 1 (Static Contract)**: `cd wxt-extension && bun run typecheck` -> **PASSED** (0 TypeScript errors across the entire codebase).
- **Gate 2 (Behavioral Parity)**: `cd wxt-extension && bun run test` -> **PASSED** (96/96 unit tests passing across 14 suites).
- **Gate 3 (Runtime Boundary)**: Service worker top-level synchronous registration, WXT typed storage (`@wxt-dev/storage`), Shadow DOM UI isolation (`createShadowRootUi`).
- **Gate 4 (Build Integrity)**: `cd wxt-extension && bun run build` -> **PASSED** (WXT produces valid production `chrome-mv3` bundle in 13.4s, 2.30 MB).
- **Gate 5 (Presentation Isolation)**: React 19 Shadow DOM encapsulation via `createShadowRootUi` with zero host CSS bleed.
- **Invariant 3 (Legacy Parity)**: `npm run build` in root -> **PASSED** (Legacy esbuild outputs to `./dist/` in 3.30s with zero regressions).
