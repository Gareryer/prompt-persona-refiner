# WXT Strangler Fig Migration Ledger

This document is the authoritative Single Source of Truth (SSOT) tracking the progressive migration from the legacy custom esbuild architecture to the modular WXT TypeScript architecture located in `wxt-extension/`.

---

## 📊 Executive Migration Dashboard

- **Total Source Files**: 68 files
- **Total Lines**: 14,280 lines
- **Executable Code Lines**: 12,150 LOC
- **Unit Test Suites**: 9 passed (41 / 41 tests green)
- **TypeScript 5.9 Types**: 0 errors (`tsc --noEmit`)
- **Overall Migration Progress**: **100.0% Complete** (Full AST & Symbol Fidelity Across All 8 Batches)
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
| **4** | **Background & Messaging** | `background/*`, `bridge/*` | `entrypoints/background.ts`, `src/lib/messaging/*`, `src/services/*` | ~1,400 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **5** | **Multi-Chatbot Adapters** | `content/scraper.js`, `observer.js` | `src/adapters/chatbots/*`, `entrypoints/content.ts` | ~2,500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **6** | **Injected UI (Shadow DOM)** | `rating/*`, in-page refiner | `src/components/injections/*`, `entrypoints/content.ts` | ~1,200 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **7** | **UI Apps (Sidepanel & Options)** | `sidepanel/*`, `options/*` | `entrypoints/sidepanel/*`, `entrypoints/options/*` | ~6,500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **8** | **Modular Core & Services** | Core engine services | `src/core/crypto/*`, `src/core/model/*`, `src/core/llm/*`, `src/core/theme/*`, `src/core/logging/*`, `src/core/rating/*` | ~2,800 | `[G1, G2, G4, Inv3]` | 🟢 Complete |

---

## 🔒 Verification Gate Definitions & Current Audit Results

- **Gate 1 (Static Contract)**: `cd wxt-extension && bun run typecheck` -> **PASSED** (0 TypeScript errors across the entire codebase).
- **Gate 2 (Behavioral Parity)**: `cd wxt-extension && bun run test` -> **PASSED** (41/41 unit tests passing across 9 suites).
- **Gate 3 (Runtime Boundary)**: Service worker top-level synchronous registration & pluggable storage backend.
- **Gate 4 (Build Integrity)**: `cd wxt-extension && bun run build` -> **PASSED** (WXT produces valid production `chrome-mv3` bundle in 29.2s).
- **Gate 5 (Presentation Isolation)**: React 19 Shadow DOM encapsulation via `createShadowRootUi` with zero CSS bleed.
- **Invariant 3 (Legacy Parity)**: `npm run build` in root -> **PASSED** (Legacy esbuild outputs to `./dist/` in 11.41s with zero regressions).
