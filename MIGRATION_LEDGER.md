# WXT Strangler Fig Migration Ledger

This document is the authoritative Single Source of Truth (SSOT) tracking the progressive migration from the legacy custom esbuild architecture to the modular WXT TypeScript architecture.

---

## 📊 Executive Migration Dashboard

- **Total Estimated LOC**: ~20,000 LOC
- **Overall Progress**: 12.5% Complete (Batch 0 Complete, Batch 1 Ready)
- **Current Phase**: Batch 1 - V4 Schemas & Type Contracts

---

## 📋 Batch Progression & Verification Ledger

| Batch | Subsystem / Layer | Legacy Source Path | WXT Target Path | Scope (LOC) | Gates Passed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | **Tooling & Dual Build** | `build.js`, `package.json` | `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts` | ~250 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **1** | **V4 Schemas & Contracts** | `memory/component-schemas.js` | `src/core/memory/schemas.ts`, `src/core/types.ts` | ~450 | `[G1, G2]` | 🟡 Ready / Next |
| **2** | **Pure Domain Logic & LLM** | `extractor/extractor.js`, `memory/analyzers/*` | `src/core/extractor/*`, `src/core/memory/*` | ~1,400 | `[G1, G2]` | ⚪ Pending |
| **3** | **Storage & Supabase Sync** | `storage/*`, `supabase/*` | `src/core/storage/*`, `src/lib/storage.ts` | ~500 | `[G1, G2, G3]` | ⚪ Pending |
| **4** | **Background & Messaging** | `background/*`, `bridge/*` | `entrypoints/background.ts`, `src/lib/messaging/*` | ~1,200 | `[G1, G3, G4]` | ⚪ Pending |
| **5** | **Multi-Chatbot Adapters** | `content/scraper.js`, `observer.js` | `src/adapters/chatbots/*` | ~2,500 | `[G1, G2, G5]` | ⚪ Pending |
| **6** | **Injected UI (Shadow DOM)** | `rating/*`, in-page refiner | `src/components/injections/*` | ~900 | `[G1, G5]` | ⚪ Pending |
| **7** | **UI Apps (Sidepanel & Options)** | `sidepanel/*`, `options/*` | `entrypoints/sidepanel/*`, `entrypoints/options/*` | ~3,500 | `[G1, G4, G5]` | ⚪ Pending |
| **8** | **Decommissioning & Cutover** | Legacy directories | Final cleanup & single build pipeline | - | `[All Gates]` | ⚪ Pending |

---

## 🔒 Verification Gate Definitions

- **Gate 1 (Static Contract)**: `npx tsc --noEmit` passing with 0 errors.
- **Gate 2 (Behavioral Parity)**: Unit tests matching golden master fixtures (`bun run test`).
- **Gate 3 (Runtime Boundary)**: Service worker & storage mocks verify execution.
- **Gate 4 (Build Integrity)**: `npx wxt build` produces valid bundles and manifest.
- **Gate 5 (Live Smoke Check)**: Live DOM check in browser with 0 errors.
- **Invariant 3 (Legacy Parity)**: `npm run build:legacy` continuously produces working legacy build.
