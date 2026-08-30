# WXT Strangler Fig Migration Ledger

This document is the authoritative Single Source of Truth (SSOT) tracking the progressive migration from the legacy custom esbuild architecture to the modular WXT TypeScript architecture located in `wxt-extension/`.

---

## 📊 Executive Migration Dashboard

- **Total Estimated LOC**: ~20,000 LOC
- **Overall Progress**: 87.5% Complete (Batches 0, 1, 2, 3, 4, 5, 6 Complete)
- **Target Location**: `wxt-extension/`
- **Current Phase**: Batch 7 - UI Applications (React 19 Sidepanel & Options Apps)

---

## 📋 Batch Progression & Verification Ledger

| Batch | Subsystem / Layer | Legacy Source Path | WXT Target Path (`wxt-extension/`) | Scope (LOC) | Gates Passed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | **Tooling & Isolated Setup** | `build.js`, `package.json` | `wxt.config.ts`, `tsconfig.json`, `vitest.config.ts` | ~250 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **1** | **V4 Schemas & Contracts** | `memory/component-schemas.js` | `src/core/memory/schemas.ts`, `src/core/types.ts` | ~450 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **2** | **Pure Domain Logic & LLM** | `extractor/extractor.js`, `content/diff.js` | `src/core/extractor/*`, `src/core/refiner/*`, `src/core/memory/context-assembler.ts` | ~1,400 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **3** | **Storage & Supabase Sync** | `storage/*`, `supabase/*` | `src/core/storage/*`, `src/lib/storage/*`, `src/adapters/storage/*` | ~500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **4** | **Background & Messaging** | `background/*`, `bridge/*` | `entrypoints/background.ts`, `src/lib/messaging/*`, `src/services/*` | ~1,200 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **5** | **Multi-Chatbot Adapters** | `content/scraper.js`, `observer.js` | `src/adapters/chatbots/*`, `entrypoints/content.ts` | ~2,500 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **6** | **Injected UI (Shadow DOM)** | `rating/*`, in-page refiner | `src/components/injections/*`, `entrypoints/content.ts` | ~900 | `[G1, G2, G4, Inv3]` | 🟢 Complete |
| **7** | **UI Apps (Sidepanel & Options)** | `sidepanel/*`, `options/*` | `entrypoints/sidepanel/*`, `entrypoints/options/*` | ~3,500 | `[G1, G4, G5]` | 🟡 Ready / Next |
| **8** | **Decommissioning & Cutover** | Legacy root files | Promotion of `wxt-extension/` to root | - | `[All Gates]` | ⚪ Pending |

---

## 🔒 Verification Gate Definitions

- **Gate 1 (Static Contract)**: `cd wxt-extension && bun run typecheck` passing with 0 errors.
- **Gate 2 (Behavioral Parity)**: Unit tests matching golden master fixtures (`cd wxt-extension && bun run test`).
- **Gate 3 (Runtime Boundary)**: Service worker & storage mocks verify execution.
- **Gate 4 (Build Integrity)**: `cd wxt-extension && bun run build` produces valid bundles and manifest.
- **Gate 5 (Live Smoke Check)**: Live DOM check in browser with 0 errors.
- **Invariant 3 (Legacy Parity)**: `npm run build` in root continuously produces working legacy build.
