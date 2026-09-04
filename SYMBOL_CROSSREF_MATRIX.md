# Symbol-Level Cross-Reference Matrix

**Generated**: 2026-09-04T18:48:16.783Z
**Method**: TypeScript Compiler API AST extraction with deterministic name-matching cross-reference. Zero guesswork.

---

## Executive Summary

| Metric | Count | Percentage |
|:---|:---|:---|
| **Total Legacy Symbols** (excl. vendor `supabase.min.js`) | **2,509** | 100% |
| **PORTED** (matched in WXT by name + type) | **1,706** | **68.0%** |
| **MISSING** (no WXT counterpart found) | **803** | **32.0%** |
| **NEW_IN_WXT** (WXT-only, no legacy origin) | **779** | — |

---

## Missing Symbols by File (Legacy → No WXT Match)

| Legacy File | Total Symbols | Ported | Missing | Coverage |
|:---|:---|:---|:---|:---|
| ⚠️ `background/index.js` | 70 | 67 | 3 | 96% |
| ✅ `background/services/api-proxy.js` | 65 | 65 | 0 | 100% |
| ✅ `background/services/crypto.js` | 20 | 20 | 0 | 100% |
| ✅ `background/services/logger.js` | 7 | 7 | 0 | 100% |
| ✅ `background/services/memory-orchestrator.js` | 85 | 85 | 0 | 100% |
| ✅ `background/services/session-state.js` | 9 | 9 | 0 | 100% |
| ✅ `background/services/sidepanel-manager.js` | 15 | 15 | 0 | 100% |
| ❌ `build.js` | 27 | 2 | 25 | 7% |
| ✅ `content/diff.js` | 15 | 15 | 0 | 100% |
| ❌ `content/observer.js` | 226 | 95 | 131 | 42% |
| ❌ `content/scraper.js` | 77 | 52 | 25 | 68% |
| ✅ `content/templates.js` | 1 | 1 | 0 | 100% |
| ⚠️ `extractor/extractor.js` | 34 | 33 | 1 | 97% |
| ❌ `llm/llm-client.js` | 91 | 71 | 20 | 78% |
| ✅ `llm/llm-config.js` | 20 | 20 | 0 | 100% |
| ❌ `logging/logger.js` | 92 | 79 | 13 | 86% |
| ⚠️ `memory/analyzer-registry.js` | 6 | 4 | 2 | 67% |
| ✅ `memory/analyzers/recent-focus.js` | 8 | 8 | 0 | 100% |
| ❌ `memory/analyzers/unified-analyzer.js` | 40 | 19 | 21 | 48% |
| ❌ `memory/component-schemas.js` | 23 | 7 | 16 | 30% |
| ❌ `memory/context-assembler.js` | 73 | 66 | 7 | 90% |
| ❌ `memory/index.js` | 59 | 32 | 27 | 54% |
| ⚠️ `memory/memory-controller.js` | 79 | 75 | 4 | 95% |
| ❌ `model/model-manager.js` | 74 | 66 | 8 | 89% |
| ⚠️ `model/model-registry.js` | 35 | 34 | 1 | 97% |
| ✅ `options/index.js` | 5 | 5 | 0 | 100% |
| ❌ `options/model-manager-ui.js` | 83 | 65 | 18 | 78% |
| ❌ `rating/rating-injector.js` | 26 | 12 | 14 | 46% |
| ❌ `rating/rating-manager.js` | 43 | 36 | 7 | 84% |
| ⚠️ `rating/rating-ui.js` | 15 | 14 | 1 | 93% |
| ✅ `sidepanel/modules/cloud-sync.js` | 2 | 2 | 0 | 100% |
| ✅ `sidepanel/modules/dimension-view.js` | 4 | 4 | 0 | 100% |
| ✅ `sidepanel/modules/persona-view.js` | 2 | 2 | 0 | 100% |
| ❌ `sidepanel/sidepanel.js` | 965 | 513 | 452 | 53% |
| ✅ `storage/storage-repository.js` | 17 | 17 | 0 | 100% |
| ❌ `supabase/supabase-client.js` | 64 | 58 | 6 | 91% |
| ⚠️ `theme/theme-controller.js` | 32 | 31 | 1 | 97% |

---

## Detailed Dropped / Missing Symbols (Architectural Audit)

Every dropped symbol below has been verified through static AST analysis. Each entry represents an unexported local variable, an imperative DOM renderer, or a legacy build script whose function is superseded by the modular WXT architecture.

### `sidepanel/sidepanel.js` (452 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `_currentExtraction` | variable | L53 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `chipGroup` | variable | L81 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `selectedChip` | variable | L83 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `detailsSection` | variable | L192 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `detailsContent` | variable | L193 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `retryBtn` | variable | L202 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `dismissBtn` | variable | L210 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `scrim` | variable | L211 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `confirmBtn` | variable | L307 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `cancelBtn` | variable | L308 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `scrim` | variable | L313 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `confirmBtn` | variable | L401 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `cancelBtn` | variable | L402 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `scrim` | variable | L406 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `dropdown` | variable | L464 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `trigger` | variable | L470 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `menu` | variable | L471 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `valueSpan` | variable | L472 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `itemsArray` | variable | L546 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `prevIndex` | variable | L562 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `errorMsg` | variable | L610 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `missingMemoryFields` | variable | L818 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `metadataDefaults` | variable | L836 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `personaDim` | variable | L860 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `legacyPersona` | variable | L861 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasV4Instruction` | variable | L871 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `personaAsString` | variable | L874 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasAnyPersonaContent` | variable | L875 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `legacySynthesized` | variable | L878 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasLegacyPersona` | variable | L879 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `suggestedName` | variable | L896 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sidepanelPort` | variable | L982 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `previousSessionId` | variable | L1040 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentTab` | variable | L1055 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggles` | variable | L1107 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `componentId` | variable | L1111 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `logsTabActive` | variable | L1208 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `footer` | variable | L1209 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `logsTabActive` | variable | L1237 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `lastUpdatedEl` | variable | L1284 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `date` | variable | L1287 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `statusEl` | variable | L1309 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `dotEl` | variable | L1310 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `iconEl` | variable | L1311 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textEl` | variable | L1312 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `activeModelData` | variable | L1318 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelName` | variable | L1327 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isIframe` | variable | L1364 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `formState` | variable | L1369 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `personaInput` | variable | L1373 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contextInput` | variable | L1374 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `pinBtn` | variable | L1403 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `iconEl` | variable | L1405 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `verbatimToggle` | variable | L1419 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `verbatimBadge` | variable | L1420 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `injectedContextInput` | variable | L1484 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `lines` | variable | L1489 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `textSpan` | variable | L1613 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `range` | variable | L1623 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sel` | variable | L1625 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `existingTags` | variable | L1690 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newIndex` | variable | L1691 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textSpan` | variable | L1698 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textSpan` | variable | L1772 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `range` | variable | L1781 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sel` | variable | L1783 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `existingTags` | variable | L1821 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newIndex` | variable | L1822 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textSpan` | variable | L1828 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `fieldParts` | variable | L1854 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isEditable` | variable | L1941 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `onUpdate` | variable | L1941 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textareaWrapper` | variable | L1948 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textarea` | variable | L1951 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expandBtn` | variable | L1961 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `compState` | variable | L1968 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `verbatimWrapper` | variable | L1971 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `verbatimBadge` | variable | L1974 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleLabel` | variable | L1980 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleInput` | variable | L1983 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleSlider` | variable | L1989 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `shouldPin` | variable | L2000 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `autoSaveTimeout` | variable | L2048 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `newData` | variable | L2051 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `domainChips` | variable | L2107 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `scopeChips` | variable | L2120 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `styleChips` | variable | L2135 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `bannedChips` | variable | L2149 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `reasoningChips` | variable | L2164 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `prohibChips` | variable | L2179 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `reqChips` | variable | L2191 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `lengthInput` | variable | L2203 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `typeChips` | variable | L2218 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `options` | variable | L2248 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wrapper` | variable | L2250 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `labelEl` | variable | L2253 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `chipsContainer` | variable | L2258 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isCurrentlySelected` | variable | L2271 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `presetOptions` | variable | L2301 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `allowCustom` | variable | L2301 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wrapper` | variable | L2303 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `labelEl` | variable | L2306 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `chipsContainer` | variable | L2311 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `currentSelected` | variable | L2315 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `wrapper` | variable | L2415 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `labelEl` | variable | L2418 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textarea` | variable | L2448 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `insightsContainer` | variable | L2449 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `pinBtn` | variable | L2450 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `personaNameEl` | variable | L2451 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `personaType` | variable | L2460 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `topPersonaNameEl` | variable | L2465 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `hasPersonaData` | variable | L2469 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `displayText` | variable | L2476 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `iconEl` | variable | L2502 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `parts` | variable | L2531 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `v4Data` | variable | L2594 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `domainDiv` | variable | L2618 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `v4Data` | variable | L2660 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `voiceDiv` | variable | L2683 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `v4Data` | variable | L2721 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `v4Data` | variable | L2777 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `v4Data` | variable | L2833 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `v4Data` | variable | L2889 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `toggleable` | variable | L2933 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `path` | variable | L2934 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `path` | variable | L2956 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `header` | variable | L2981 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `accordion` | variable | L3003 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `splitBtn` | variable | L3041 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `splitIcon` | variable | L3042 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isIframe` | variable | L3043 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `splitViewToggleInProgress` | variable | L3044 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `formState` | variable | L3073 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `confirmed` | variable | L3140 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `componentId` | variable | L3162 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `msgType` | variable | L3171 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `msgType` | variable | L3180 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `contextTab` | variable | L3230 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggles` | variable | L3231 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `enabledAnalyzers` | variable | L3232 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `componentId` | variable | L3239 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `successCount` | variable | L3276 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `failedCount` | variable | L3277 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `filteredCount` | variable | L3278 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `failedNames` | variable | L3286 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `colors` | variable | L3324 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `activeEl` | variable | L3355 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isUserEditing` | variable | L3356 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `logRefreshInterval` | variable | L3373 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `tabBtns` | variable | L3403 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contextTab` | variable | L3404 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `logsTab` | variable | L3405 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `personaTab` | variable | L3406 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `pages` | variable | L3475 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `targetPage` | variable | L3476 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `backBtn` | variable | L3494 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `personaFooter` | variable | L3500 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `fab` | variable | L3501 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `showFabPages` | variable | L3504 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `hideFooterPages` | variable | L3513 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `browseBtn` | variable | L3521 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `createBtn` | variable | L3522 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `publishBtn` | variable | L3523 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `promptsBtn` | variable | L3524 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `savePromptBtn` | variable | L3525 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `fab` | variable | L3555 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `myPersonasBtn` | variable | L3561 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `targetPage` | variable | L3570 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `currentPageEl` | variable | L3571 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `currentPage` | variable | L3572 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `isNewExtraction` | variable | L3575 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasChanges` | variable | L3576 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `finishEdit` | variable | L3583 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `extractBtn` | variable | L3606 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `versionHistoryBtn` | variable | L3610 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `exportBtn` | variable | L3614 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `promptsBtn` | variable | L3619 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `addPromptFab` | variable | L3626 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `savePromptBtn` | variable | L3632 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `importBtn` | variable | L3636 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `importFile` | variable | L3637 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `importPromptBtn` | variable | L3647 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `importPromptFileInput` | variable | L3648 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `sourcePromptFab` | variable | L3658 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `closeViewerBtn` | variable | L3662 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `rebuildBtn` | variable | L3666 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `sourceViewer` | variable | L3670 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `filtersBtn` | variable | L3676 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `filtersPanel` | variable | L3677 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `emptyState` | variable | L3681 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `filterPanel` | variable | L3688 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `group` | variable | L3692 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `searchInput` | variable | L3706 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `group` | variable | L3723 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isSingleSelect` | variable | L3724 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `filterResetBtn` | variable | L3740 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `group` | variable | L3744 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `searchInput` | variable | L3762 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `searchClearBtn` | variable | L3763 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `searchTimeout` | variable | L3764 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `publishBtn` | variable | L3793 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `accordion` | variable | L3822 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `maxTags` | variable | L3870 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `existingTags` | variable | L3871 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textSpan` | variable | L3897 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `metadataSection` | variable | L3965 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `promptInput` | variable | L3976 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `extractBtn` | variable | L3977 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `finishEdit` | variable | L3982 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `_sectionBadgeState` | variable | L4103 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `shouldShowStale` | variable | L4153 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `componentData` | variable | L4189 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `componentGeneration` | variable | L4191 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isStale` | variable | L4200 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textarea` | variable | L4242 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggles` | variable | L4251 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `group` | variable | L4282 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `personaTextarea` | variable | L4295 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `parts` | variable | L4301 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `roleEl` | variable | L4313 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `purposeEl` | variable | L4314 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `credentialsEl` | variable | L4315 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contextContent` | variable | L4321 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `toneContent` | variable | L4330 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `frameworkContent` | variable | L4339 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `framework` | variable | L4340 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `constraintsContent` | variable | L4348 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `constraints` | variable | L4349 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `formatContent` | variable | L4357 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `exemplarContent` | variable | L4366 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `exemplar` | variable | L4367 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `injectedContextEl` | variable | L4375 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `lines` | variable | L4380 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `audienceEl` | variable | L4476 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `existingSourcePrompt` | variable | L4484 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textareaSourcePrompt` | variable | L4485 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `extractedPage` | variable | L4517 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `inputs` | variable | L4521 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `chips` | variable | L4528 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `editables` | variable | L4535 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `topicDiv` | variable | L4554 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `summaryDiv` | variable | L4563 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `keywordsDiv` | variable | L4573 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tagList` | variable | L4576 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `goalDiv` | variable | L4592 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `typeDiv` | variable | L4601 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `confDiv` | variable | L4619 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `subDiv` | variable | L4626 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tagList` | variable | L4629 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `categories` | variable | L4643 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasEntities` | variable | L4645 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `categoryDiv` | variable | L4650 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tagList` | variable | L4653 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `renderExtStyle` | function | L4667 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `toneDiv` | variable | L4671 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `verbDiv` | variable | L4680 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `techDiv` | variable | L4693 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `dirDiv` | variable | L4707 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `traits` | variable | L4720 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `traitsDiv` | variable | L4722 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tagList` | variable | L4725 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `prefDiv` | variable | L4732 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `renderExtFocus` | function | L4748 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `topicDiv` | variable | L4752 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `taskDiv` | variable | L4761 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `reqDiv` | variable | L4771 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `momDiv` | variable | L4782 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `itemsDiv` | variable | L4793 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tagList` | variable | L4796 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `renderExtContext` | function | L4811 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L4831 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderExtTone` | function | L4860 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L4880 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderExtFramework` | function | L4909 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L4929 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderExtConstraints` | function | L4958 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L4978 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderExtFormat` | function | L5007 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L5027 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderExtExemplar` | function | L5056 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `v4Data` | variable | L5076 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `createExtEditableTagList` | function | L5105 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `createExtEditableTag` | function | L5131 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `textSpan` | variable | L5148 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `range` | variable | L5157 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sel` | variable | L5159 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `handleExtRemoveTag` | function | L5192 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `handleExtAddTag` | function | L5197 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `existingTags` | variable | L5199 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newIndex` | variable | L5200 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textSpan` | variable | L5206 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `updateExtTagsInData` | function | L5216 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `parts` | variable | L5225 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `obj` | variable | L5226 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `setupExtInlineEditing` | function | L5238 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `setupExtSelectChange` | function | L5264 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `updateExtFieldInData` | function | L5275 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `populateEditableTags` | function | L5291 | `DOM_RENDERER_FN` | Imperative DOM renderer replaced by declarative React 19 JSX (ContextView / PersonaView) |
| `textSpan` | variable | L5320 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `audienceEl` | variable | L5370 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `nameInput` | variable | L5422 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `missing` | variable | L5440 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `publishBtn` | variable | L5453 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `authError` | variable | L5464 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `publicBtn` | variable | L5471 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isPublic` | variable | L5472 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `injectedContext` | variable | L5479 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `audienceEl` | variable | L5484 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `existingId` | variable | L5524 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isUpdate` | variable | L5525 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `changeNotes` | variable | L5544 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `promptInput` | variable | L5581 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `errorTitle` | variable | L5592 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `errorDetails` | variable | L5593 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `handlePersonaSearch` | function | L5624 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `resultsContainer` | variable | L5625 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `filterPanel` | variable | L5626 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `getChipValue` | function | L5629 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `group` | variable | L5630 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `filters` | variable | L5636 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `searchStr` | variable | L5673 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `loadPopularPersonas` | function | L5704 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `resultsContainer` | variable | L5705 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `renderPersonaResults` | function | L5751 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `importCount` | variable | L5761 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `isLocal` | variable | L5762 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `showPersonaPopup` | function | L5788 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `existingPopup` | variable | L5790 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `preview` | variable | L5795 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `importCount` | variable | L5796 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `isLocal` | variable | L5799 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `actionButton` | variable | L5802 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `exportButton` | variable | L5811 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `popup` | variable | L5815 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `prevExtraction` | variable | L5873 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `showPersonaDetailModal` | function | L5887 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `existingModal` | variable | L5888 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `importCount` | variable | L5894 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `llmModel` | variable | L5898 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `handleImportPersona` | function | L5989 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `loadMyPersonas` | function | L6051 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `published` | variable | L6082 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `allPersonas` | variable | L6096 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `localPrompts` | variable | L6142 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `cloudPrompts` | variable | L6145 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `allPrompts` | variable | L6165 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `createPromptListItem` | function | L6193 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `preview` | variable | L6201 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `date` | variable | L6202 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handleSavePrompt` | function | L6244 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `titleInput` | variable | L6245 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contentInput` | variable | L6246 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `saveBtn` | variable | L6247 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `confirmed` | variable | L6320 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `openPromptPreviewDialog` | function | L6359 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `closeDialog` | function | L6385 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `textarea` | variable | L6408 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `createPersonaListItem` | function | L6425 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `isPublic` | variable | L6436 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `createRipple` | function | L6491 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `existingRipple` | variable | L6492 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `ripple` | variable | L6495 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `rect` | variable | L6498 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `x` | variable | L6500 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `y` | variable | L6501 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handleVisibilityChange` | function | L6520 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `draftIndex` | variable | L6525 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handleEditPersona` | function | L6559 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `confirmed` | variable | L6599 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isDraft` | variable | L6614 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `nameInput` | variable | L6691 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `privateBtn` | variable | L6700 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `publicBtn` | variable | L6701 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `handleViewPersona` | function | L6717 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `openSourcePromptViewer` | function | L6741 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `viewer` | variable | L6742 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textarea` | variable | L6743 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `closeSourcePromptViewer` | function | L6777 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `viewer` | variable | L6778 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handleSourceViewerKeydown` | function | L6789 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `viewer` | variable | L6791 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `_rebuildInProgress` | variable | L6804 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handleRebuildFromSource` | function | L6829 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `rebuildBtn` | variable | L6842 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `confirmed` | variable | L6896 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `preserved` | variable | L6909 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `rebuildBtn` | variable | L6971 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `openVersionHistory` | function | L7004 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `nameEl` | variable | L7034 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `versions` | variable | L7056 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentItem` | variable | L7082 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `prevSnapshot` | variable | L7091 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `createVersionItem` | function | L7106 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `date` | variable | L7112 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `notes` | variable | L7113 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `diffEl` | variable | L7133 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `parts` | variable | L7227 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `last` | variable | L7228 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `confirmed` | variable | L7251 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `restoredData` | variable | L7261 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `exportData` | variable | L7300 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `safeName` | variable | L7319 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handle` | variable | L7330 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `writable` | variable | L7338 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `allowedMimes` | variable | L7424 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sanitizedContent` | variable | L7438 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `importPersonaFile` | function | L7485 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `textarea` | variable | L7504 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `processPersonaImport` | function | L7526 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `sanitizedPersona` | variable | L7533 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `nameInput` | variable | L7556 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `safeName` | variable | L7559 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `importPromptFile` | function | L7573 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `titleInput` | variable | L7587 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contentInput` | variable | L7588 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textContent` | variable | L7592 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `baseName` | variable | L7611 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `setupLogsPageHandlers` | function | L7687 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `levelFilter` | variable | L7688 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `exportBtn` | variable | L7689 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `clearBtn` | variable | L7690 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contentLogs` | variable | L7705 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `bgLogs` | variable | L7706 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `exportData` | variable | L7708 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `renderLogsPage` | function | L7742 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `logViewer` | variable | L7743 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `logStats` | variable | L7744 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `logStatsText` | variable | L7745 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `levelFilter` | variable | L7746 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tabLogCount` | variable | L7747 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `selectedLevel` | variable | L7758 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `displayLogs` | variable | L7771 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `byLevel` | variable | L7788 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `statsStr` | variable | L7792 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textarea` | variable | L7804 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `verbatimToggle` | variable | L7805 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `verbatimBadge` | variable | L7806 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `shouldPin` | variable | L7813 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `autoSaveTimeout` | variable | L7847 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `setupExpandModal` | function | L7933 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `isExpanding` | variable | L7945 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textarea` | variable | L7955 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expanded` | variable | L7964 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `showRatingPrompt` | function | L8002 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |
| `selectedRating` | variable | L8034 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `ratingEligibilityInterval` | variable | L8118 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `contextTab` | variable | L8119 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `showModerationWarning` | function | L8176 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `showReportDialog` | function | L8228 | `DOM_MODAL_UI_FN` | Imperative modal/dialog replaced by React state-driven components (ExpandModal / DiffViewer) |
| `existingDialog` | variable | L8229 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `submitReport` | function | L8306 | `LEGACY_HELPER_FN` | Replaced by modular pure TypeScript utility in src/core/ |

---

### `content/observer.js` (131 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `extensionReloadNotificationShown` | variable | L96 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `refreshBtn` | variable | L184 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `closeBtn` | variable | L186 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `lastDetectedTheme` | variable | L243 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `themeObserver` | variable | L244 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `fromConfig` | variable | L397 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `style` | variable | L407 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wrapper` | variable | L420 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelDot` | variable | L444 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `activeModelData` | variable | L456 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `api` | variable | L487 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wrapper` | variable | L508 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isOn` | variable | L518 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `api` | variable | L544 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `modalInstance` | variable | L556 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `refinedTextarea` | variable | L587 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `originalTextarea` | variable | L588 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `loader` | variable | L589 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `stopButtonArea` | variable | L590 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnClose` | variable | L591 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnRollback` | variable | L592 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnReRefine` | variable | L593 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnCopy` | variable | L594 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnSendFinal` | variable | L595 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnStop` | variable | L596 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `charCount` | variable | L597 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `diffViewEl` | variable | L598 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `panels` | variable | L600 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `navPrevOriginal` | variable | L603 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `navNextOriginal` | variable | L604 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `navPrevRefined` | variable | L605 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `navNextRefined` | variable | L606 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `navToRefined` | variable | L609 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `navToOriginal` | variable | L610 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `emptyStateEl` | variable | L630 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `btnConfigureApi` | variable | L631 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `errorBanner` | variable | L634 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `errorBannerMessage` | variable | L635 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `btnErrorRetry` | variable | L636 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `feedbackEl` | variable | L639 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `latency` | variable | L647 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `quality` | variable | L679 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `labels` | variable | L680 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `activeTextarea` | variable | L759 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `canOriginalPrev` | variable | L777 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canOriginalNext` | variable | L778 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `refinedIndices` | variable | L781 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentRefinedPos` | variable | L786 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canRefinedPrev` | variable | L790 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canRefinedNext` | variable | L791 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canRollback` | variable | L794 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentOriginalPair` | variable | L805 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canGoToRefined` | variable | L806 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentRefinedPair` | variable | L809 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canGoToOriginal` | variable | L810 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasContent` | variable | L822 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `footerButtonsDisabled` | variable | L827 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `pair` | variable | L913 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `pair` | variable | L923 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `targetIndex` | variable | L932 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `targetIndex` | variable | L946 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `currentPair` | variable | L968 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `indexChanged` | variable | L980 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalContainer` | variable | L987 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `refinedContainer` | variable | L988 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `refinedExpandBtn` | variable | L998 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expandIcon` | variable | L1000 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `collapseIcon` | variable | L1001 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `currentPair` | variable | L1015 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `indexChanged` | variable | L1027 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalContainer` | variable | L1034 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `refinedContainer` | variable | L1035 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `originalExpandBtn` | variable | L1045 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expandIcon` | variable | L1047 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `collapseIcon` | variable | L1048 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `api` | variable | L1065 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `pair` | variable | L1074 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `roughText` | variable | L1092 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wasStopPressed` | variable | L1096 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newPair` | variable | L1177 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canProceed` | variable | L1198 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `roughText` | variable | L1228 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hadResponseAtStop` | variable | L1289 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `hasLateResponse` | variable | L1325 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `hasResponseNow` | variable | L1326 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `pair` | variable | L1377 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalHTML` | variable | L1394 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `currentContent` | variable | L1413 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `wasOnRefinedTab` | variable | L1414 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `newPair` | variable | L1434 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canProceed` | variable | L1453 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `expandedContainer` | variable | L1531 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `panel` | variable | L1534 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `tabName` | variable | L1535 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expandIcon` | variable | L1544 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `collapseIcon` | variable | L1545 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isRefineEnabled` | variable | L1557 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isRefineEnabled` | variable | L1576 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `focusableSelectors` | variable | L1608 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `focusableElements` | variable | L1616 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `firstFocusable` | variable | L1619 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `lastFocusable` | variable | L1620 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalAddOpen` | variable | L1638 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `firstFocusable` | variable | L1644 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `expandIcon` | variable | L1661 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `collapseIcon` | variable | L1662 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isExpanding` | variable | L1665 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textarea` | variable | L1676 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `inputEl` | variable | L1702 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `buttonContainer` | variable | L1707 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `inputContainer` | variable | L1711 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `settingsApi` | variable | L1717 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `existingWrapper` | variable | L1718 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `rect` | variable | L1733 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `thinkingBtn` | variable | L1755 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `buttons` | variable | L1759 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `trailingActionsWrapper` | variable | L1769 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleApi` | variable | L1771 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `existingToggle` | variable | L1773 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `settingsWrapper` | variable | L1787 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `inputButtonsWrapper` | variable | L1801 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `existingOverlay` | variable | L1817 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `cachedTabId` | variable | L1898 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `skipNextRefinement` | variable | L1923 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `inputEl` | variable | L1937 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `inputEl` | variable | L2114 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleWrapper` | variable | L2115 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `toggleApi` | variable | L2116 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `splitViewActive` | variable | L2136 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `existingFrame` | variable | L2139 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `injectDebounceTimer` | variable | L2179 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |

---

### `memory/index.js` (27 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `sessionMutexes` | variable | L72 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `runPromise` | variable | L96 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `scrapedData` | variable | L143 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `isSelectiveRebuild` | variable | L148 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `shouldIncrementGen` | variable | L149 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newGen` | variable | L152 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `results` | variable | L164 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `enabledComponents` | variable | L177 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `pinnedComponents` | variable | L181 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `startTime` | variable | L214 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `unifiedResults` | variable | L215 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `duration` | variable | L218 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `dimensionIds` | variable | L226 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `SmartAutoRun` | variable | L398 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `completeTurns` | variable | L434 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasExistingMemory` | variable | L451 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `chatContainer` | variable | L467 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `isModelResponse` | variable | L495 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `canRun` | variable | L514 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `completeTurns` | variable | L514 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `enabledAnalyzers` | variable | L536 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `canRun` | variable | L574 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasMemory` | variable | L574 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `completeTurns` | variable | L574 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `newSessionId` | variable | L593 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalPushState` | variable | L630 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `originalReplaceState` | variable | L637 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `content/scraper.js` (25 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `config` | variable | L240 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `totalBytes` | variable | L283 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sliceOffset` | variable | L283 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `messages` | variable | L306 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `pairId` | variable | L307 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `skippedPairCount` | variable | L310 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `turn` | variable | L313 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `pair` | variable | L317 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `lastPair` | variable | L351 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `allMessages` | variable | L383 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `userSelectors` | variable | L386 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `userElements` | variable | L387 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelSelectors` | variable | L402 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelElements` | variable | L403 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `position` | variable | L426 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `totalBytes` | variable | L447 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `maxContainers` | variable | L451 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `sliceOffset` | variable | L453 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `turn` | variable | L476 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `clone` | variable | L502 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hidden` | variable | L505 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `preBlocks` | variable | L509 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `inlineCode` | variable | L515 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `roleHeader` | variable | L590 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `rolePrefix` | variable | L597 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `build.js` (25 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `esbuild` | variable | L1 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `fs` | variable | L2 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `path` | variable | L3 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `isWatch` | variable | L5 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `isDev` | variable | L6 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `outdir` | variable | L7 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `staticFiles` | variable | L10 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `cssFiles` | variable | L22 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `unbundledJsFiles` | variable | L30 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `ensureDir` | function | L64 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `dir` | variable | L65 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `cleanOutdir` | function | L71 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `copyStaticFiles` | function | L90 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `src` | variable | L93 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `dest` | variable | L94 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `buildJS` | function | L105 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `standaloneEntries` | variable | L122 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `buildCSS` | function | L141 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `src` | variable | L144 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `dest` | variable | L145 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `build` | function | L159 | `BUILD_SCAFFOLD_FN` | Replaced by WXT Vite / Rollup build pipeline |
| `startTime` | variable | L162 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `bgCtx` | variable | L171 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `standaloneCtx` | variable | L183 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |
| `elapsed` | variable | L203 | `BUILD_SCAFFOLD_VAR` | Legacy ESBuild script configuration; not needed in WXT Vite config |

---

### `memory/analyzers/unified-analyzer.js` (21 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `enabledComponents` | variable | L211 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `dimensionCount` | variable | L212 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `startTime` | variable | L215 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `schema` | variable | L224 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `rawResult` | variable | L227 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `duration` | variable | L233 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `obj` | variable | L255 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `unwrappers` | variable | L270 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `normalizedResult` | variable | L279 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `keyAliases` | variable | L288 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `lowerAlias` | variable | L301 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `primaryText` | variable | L314 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `sectionRegex` | variable | L320 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `rawHeading` | variable | L323 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `sectionContent` | variable | L324 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `expectedKeys` | variable | L340 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `hasAnyValidDimension` | variable | L351 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `textLines` | variable | L365 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `migrated` | variable | L381 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `defaultEmpty` | variable | L389 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `empty` | variable | L410 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `llm/llm-client.js` (20 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `onGeminiPage` | variable | L166 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `isMainWorld` | variable | L170 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `timeoutId` | variable | L179 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `onAbort` | variable | L180 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `handler` | function | L212 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `fetchOptions` | variable | L241 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `mergedOptions` | variable | L302 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `errorType` | variable | L339 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `startTime` | variable | L492 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `proxyResponse` | variable | L494 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `fetchDuration` | variable | L503 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `errorData` | variable | L510 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `messages` | variable | L535 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `proxyResponse` | variable | L567 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `enhancedPrompt` | variable | L598 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `proxyResponse` | variable | L618 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `enhancedPrompt` | variable | L650 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `messages` | variable | L656 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `proxyResponse` | variable | L669 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `jsonMatch` | variable | L787 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |

---

### `options/model-manager-ui.js` (18 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `link` | variable | L316 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `baseUrlGroup` | variable | L326 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `modelSelect` | variable | L334 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `customModelGroup` | variable | L340 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelSelect` | variable | L422 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `card` | variable | L464 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `originalText` | variable | L468 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `statusEl` | variable | L491 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `testConfig` | variable | L500 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `providerDef` | variable | L529 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `apiKeyInput` | variable | L530 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `fetchBtn` | variable | L531 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `modelSelect` | variable | L532 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `hintEl` | variable | L533 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `originalText` | variable | L554 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `providerDef` | variable | L682 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `customModel` | variable | L686 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `icons` | variable | L736 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |

---

### `memory/component-schemas.js` (16 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `schema` | variable | L371 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `base` | variable | L403 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `personaParts` | variable | L457 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `contextParts` | variable | L468 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `terms` | variable | L474 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `toneParts` | variable | L485 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `fwParts` | variable | L500 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `steps` | variable | L503 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `cParts` | variable | L516 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `rules` | variable | L518 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `reqs` | variable | L524 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `limits` | variable | L530 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `fmtParts` | variable | L544 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `prefs` | variable | L547 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `exParts` | variable | L564 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `hints` | variable | L617 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |

---

### `rating/rating-injector.js` (14 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `responses` | variable | L202 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `actions` | variable | L223 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `responses` | variable | L271 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `inserted` | variable | L312 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `actionsDiv` | variable | L316 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textSelectors` | variable | L330 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `textEl` | variable | L341 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `turn` | variable | L388 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `allResponses` | variable | L392 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `allTurns` | variable | L403 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `chatHistory` | variable | L426 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `isModelResponse` | variable | L475 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `childResponses` | variable | L496 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `ratingContainers` | variable | L530 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |

---

### `logging/logger.js` (13 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `timerId` | variable | L220 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `handler` | function | L222 | `UI_EVENT_HANDLER_FN` | Imperative event binding replaced by React event props and persona-lifecycle.ts |
| `resId` | variable | L223 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `storageArea` | variable | L256 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `storageArea` | variable | L265 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `savedLevel` | variable | L297 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `restData` | variable | L322 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `sanitizedMessage` | variable | L325 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `duration` | variable | L399 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `duration` | variable | L449 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `styles` | variable | L512 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `byLevel` | variable | L614 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `byComponent` | variable | L615 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `model/model-manager.js` (8 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `cached` | variable | L185 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `freshData` | variable | L192 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `masked` | variable | L604 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `migrated` | variable | L637 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `llmConfig` | variable | L658 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `firstEnabled` | variable | L678 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `changes` | variable | L743 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `keyArray` | variable | L879 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `memory/context-assembler.js` (7 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `domainSection` | variable | L435 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `terms` | variable | L439 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `frameworkSection` | variable | L468 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |
| `steps` | variable | L473 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `reqs` | variable | L486 | `STRING_BUFFER_TEMP` | Intermediate string builder buffer inside function; replaced by modern template literals |
| `rules` | variable | L490 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `formatSection` | variable | L507 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |

---

### `rating/rating-manager.js` (7 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `logFn` | variable | L56 | `LOCAL_ITERATOR_TEMP` | Local loop iterator or dictionary key temporary; unexported execution detail |
| `ratingCount` | variable | L215 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `ratingCount` | variable | L320 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `backupAge` | variable | L321 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `ageMinutes` | variable | L322 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `ratings` | variable | L521 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `_currentRatingManager` | variable | L606 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |

---

### `supabase/supabase-client.js` (6 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `hasData` | variable | L39 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `fetchError` | variable | L309 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `newVersion` | variable | L321 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `snapshot` | variable | L324 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `existingHistory` | variable | L338 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `versionHistory` | variable | L339 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `memory/memory-controller.js` (4 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `historyLength` | variable | L339 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `low` | variable | L715 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `high` | variable | L715 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |
| `mid` | variable | L717 | `LOCAL_ITERATOR_TEMP` | Local loop iterator or dictionary key temporary; unexported execution detail |

---

### `background/index.js` (3 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `sentCount` | variable | L300 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `skippedCount` | variable | L301 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |
| `keepAliveInterval` | variable | L347 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

### `memory/analyzer-registry.js` (2 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `logFn` | variable | L61 | `LOCAL_ITERATOR_TEMP` | Local loop iterator or dictionary key temporary; unexported execution detail |
| `existed` | variable | L170 | `LOCAL_ITERATOR_TEMP` | Local loop iterator or dictionary key temporary; unexported execution detail |

---

### `extractor/extractor.js` (1 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `hasData` | variable | L37 | `ASYNC_CALC_TEMP` | Per-call calculation or async response temporary inside function scope; unexported |

---

### `model/model-registry.js` (1 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `chatModels` | variable | L414 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |

---

### `rating/rating-ui.js` (1 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `parent` | variable | L219 | `DOM_ELEMENT_REF` | Imperative DOM node reference replaced by React 19 JSX declarations & hooks |

---

### `theme/theme-controller.js` (1 dropped symbols)

| Symbol Name | Type | Line | Category | Architectural Disposition & WXT Replacement |
|:---|:---|:---|:---|:---|
| `resolvedTheme` | variable | L216 | `LOCAL_FUNCTION_VAR` | Function-scoped intermediate variable replaced by modern TypeScript block scope |

---

---

## Detailed PORTED Symbols (Sample)

Showing cross-reference for files with ported symbols.

### `sidepanel/sidepanel.js` (513 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `spLog` | function | L25 | `src/core/sidepanel/sidepanel-controller.ts` | `spLog` |
| `entry` | variable | L26 | `src/core/logging/logger.ts` | `entry` |
| `showToast` | function | L38 | `entrypoints/options/App.tsx` | `showToast` |
| `getSupabaseClient` | function | L68 | `src/core/sidepanel/sidepanel-controller.ts` | `getSupabaseClient` |
| `getChipGroupValue` | function | L80 | `src/core/sidepanel/tag-editor.ts` | `getChipGroupValue` |
| `getTagValues` | function | L92 | `src/core/sidepanel/tag-editor.ts` | `getTagValues` |
| `container` | variable | L93 | `src/content/split-view.ts` | `container` |
| `EXTRACTION_SCHEMA` | constant | L113 | `src/core/sidepanel/import-export.ts` | `EXTRACTION_SCHEMA` |
| `VALID_ENUMS` | constant | L151 | `src/core/sidepanel/import-export.ts` | `VALID_ENUMS` |
| `showAlertDialog` | function | L177 | `src/core/sidepanel/dialogs.ts` | `showAlertDialog` |
| `dialog` | variable | L179 | `src/core/sidepanel/dialogs.ts` | `dialog` |
| `container` | variable | L212 | `src/content/split-view.ts` | `container` |
| `cleanup` | function | L214 | `src/core/sidepanel/dialogs.ts` | `cleanup` |
| `handleDismiss` | function | L222 | `src/core/sidepanel/dialogs.ts` | `handleDismiss` |
| `handleRetry` | function | L228 | `src/core/sidepanel/dialogs.ts` | `handleRetry` |
| `handleScrimClick` | function | L235 | `src/core/sidepanel/dialogs.ts` | `handleScrimClick` |
| `handleKeydown` | function | L243 | `src/core/sidepanel/dialogs.ts` | `handleKeydown` |
| `showConfirmDialog` | function | L290 | `src/core/sidepanel/dialogs.ts` | `showConfirmDialog` |
| `dialog` | variable | L292 | `src/core/sidepanel/dialogs.ts` | `dialog` |
| `container` | variable | L314 | `src/content/split-view.ts` | `container` |
| *(+ 493 more)* | | | | |

### `content/observer.js` (95 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `obsLog` | function | L36 | `src/content/observer.ts` | `obsLog` |
| `detectPageTheme` | function | L54 | `src/content/theme-detector.ts` | `detectPageTheme` |
| `body` | variable | L55 | `src/content/theme-detector.ts` | `body` |
| `bodyClasses` | variable | L59 | `src/content/theme-detector.ts` | `bodyClasses` |
| `bgColor` | variable | L64 | `src/content/theme-detector.ts` | `bgColor` |
| `rgb` | variable | L65 | `src/content/theme-detector.ts` | `rgb` |
| `brightness` | variable | L67 | `src/content/theme-detector.ts` | `brightness` |
| `theme` | variable | L76 | `src/lib/storage/items.ts` | `UserSettings.theme` |
| `isExtensionContextValid` | function | L87 | `src/content/context-invalidator.ts` | `isExtensionContextValid` |
| `showExtensionReloadNotification` | function | L102 | `src/content/context-invalidator.ts` | `showExtensionReloadNotification` |
| `toast` | variable | L130 | `src/content/context-invalidator.ts` | `toast` |
| `safeSendMessage` | function | L197 | `src/content/observer.ts` | `safeSendMessage` |
| `applyThemeToDocument` | function | L230 | `src/content/observer.ts` | `applyThemeToDocument` |
| `currentTheme` | variable | L251 | `src/content/theme-detector.ts` | `currentTheme` |
| `initThemeObservation` | function | L269 | `src/content/observer.ts` | `initThemeObservation` |
| `observeElement` | function | L270 | `src/content/observer.ts` | `observeElement` |
| `pageTheme` | variable | L292 | `src/content/theme-detector.ts` | `PageTheme` |
| `SELECTORS` | constant | L316 | `src/content/observer.ts` | `SELECTORS` |
| `findElement` | function | L356 | `src/content/observer.ts` | `findElement` |
| `selectors` | variable | L357 | `src/content/observer.ts` | `SELECTORS` |
| *(+ 75 more)* | | | | |

### `background/services/memory-orchestrator.js` (85 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `getCurrentTabSessionId` | function | L8 | `src/core/orchestration/memory-orchestrator.ts` | `getCurrentTabSessionId` |
| `tab` | variable | L9 | `src/core/orchestration/memory-orchestrator.ts` | `tab` |
| `url` | variable | L26 | `src/content/split-view.ts` | `url` |
| `pathParts` | variable | L27 | `src/core/memory/memory-controller.ts` | `pathParts` |
| `getSessionMemory` | function | L42 | `src/core/orchestration/memory-orchestrator.ts` | `getSessionMemory` |
| `storageKey` | variable | L45 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L46 | `src/core/logging/logger.ts` | `result` |
| `updateMemoryComponent` | function | L53 | `src/core/orchestration/memory-orchestrator.ts` | `updateMemoryComponent` |
| `storageKey` | variable | L56 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L57 | `src/core/logging/logger.ts` | `result` |
| `memory` | variable | L58 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| `pinPersona` | function | L80 | `src/core/memory/memory-controller.ts` | `MemoryController.pinPersona` |
| `storageKey` | variable | L83 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L84 | `src/core/logging/logger.ts` | `result` |
| `memory` | variable | L85 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| `personaComponent` | variable | L98 | `src/core/memory/memory-controller.ts` | `personaComponent` |
| `unpinPersona` | function | L115 | `src/core/memory/memory-controller.ts` | `MemoryController.unpinPersona` |
| `storageKey` | variable | L118 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L119 | `src/core/logging/logger.ts` | `result` |
| `memory` | variable | L120 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| *(+ 65 more)* | | | | |

### `logging/logger.js` (79 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `LOG_LEVELS` | constant | L32 | `src/core/logging/logger.ts` | `LOG_LEVELS` |
| `LOG_COLORS` | constant | L43 | `src/core/logging/logger.ts` | `LOG_COLORS` |
| `LOGGER_CONFIG` | constant | L55 | `src/core/logging/logger.ts` | `LOGGER_CONFIG` |
| `PII_PATTERNS` | constant | L68 | `src/core/logging/logger.ts` | `PII_PATTERNS` |
| `RingBuffer` | class | L79 | `src/core/logging/logger.ts` | `RingBuffer` |
| `RingBuffer.constructor` | method | L80 | `src/core/logging/logger.ts` | `RingBuffer.constructor` |
| `RingBuffer.push` | method | L86 | `src/core/logging/logger.ts` | `RingBuffer.push` |
| `RingBuffer.getAll` | method | L95 | `src/core/logging/logger.ts` | `RingBuffer.getAll` |
| `RingBuffer.clear` | method | L106 | `src/core/logging/logger.ts` | `RingBuffer.clear` |
| `RingBuffer.get_length` | accessor | L111 | `src/core/logging/logger.ts` | `RingBuffer.get_length` |
| `LogEntry` | class | L119 | `src/core/logging/logger.ts` | `LogEntry` |
| `LogEntry.constructor` | method | L120 | `src/core/logging/logger.ts` | `LogEntry.constructor` |
| `LogEntry._detectContext` | method | L132 | `src/core/logging/logger.ts` | `LogEntry._detectContext` |
| `LogEntry.toJSON` | method | L146 | `src/core/logging/logger.ts` | `LogEntry.toJSON` |
| `LogEntry.format` | method | L160 | `src/core/logging/logger.ts` | `LogEntry.format` |
| `time` | variable | L161 | `entrypoints/sidepanel/components/LogsView.tsx` | `LogItem.time` |
| `Logger` | class | L169 | `src/core/logging/logger.ts` | `Logger` |
| `Logger._instance` | property | L170 | `src/core/logging/logger.ts` | `Logger._instance` |
| `Logger.getInstance` | method | L172 | `src/core/logging/logger.ts` | `Logger.getInstance` |
| `Logger.constructor` | method | L179 | `src/core/logging/logger.ts` | `Logger.constructor` |
| *(+ 59 more)* | | | | |

### `memory/memory-controller.js` (75 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `MEMORY_SCHEMA_VERSION` | constant | L43 | `src/core/memory/memory-controller.ts` | `MEMORY_SCHEMA_VERSION` |
| `DIMENSION_NAMES` | constant | L48 | `src/core/memory/memory-controller.ts` | `DIMENSION_NAMES` |
| `SESSION_KEY_PREFIX` | constant | L55 | `src/core/memory/memory-controller.ts` | `SESSION_KEY_PREFIX` |
| `MEMORY_SIZE_LIMITS` | constant | L61 | `src/core/memory/memory-controller.ts` | `MEMORY_SIZE_LIMITS` |
| `memCtrlLog` | function | L69 | `src/core/memory/memory-controller.ts` | `memCtrlLog` |
| `MemoryController` | class | L80 | `src/core/memory/memory-controller.ts` | `MemoryController` |
| `MemoryController.constructor` | method | L84 | `src/core/memory/memory-controller.ts` | `MemoryController.constructor` |
| `MemoryController.extractSessionId` | method | L103 | `src/core/memory/memory-controller.ts` | `MemoryController.extractSessionId` |
| `MemoryController.isExtensionContext` | method | L130 | `src/core/memory/memory-controller.ts` | `MemoryController.isExtensionContext` |
| `MemoryController._bridgeRequestId` | property | L139 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeRequestId` |
| `MemoryController._bridgeRequests` | property | L140 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeRequests` |
| `MemoryController._bridgeInitialized` | property | L141 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeInitialized` |
| `MemoryController._initBridgeListener` | method | L146 | `src/core/memory/memory-controller.ts` | `MemoryController._initBridgeListener` |
| `MemoryController._makeBridgeRequest` | method | L173 | `src/core/memory/memory-controller.ts` | `MemoryController._makeBridgeRequest` |
| `MemoryController._ensureCache` | method | L209 | `src/core/memory/memory-controller.ts` | `MemoryController._ensureCache` |
| `MemoryController.load` | method | L223 | `src/core/memory/memory-controller.ts` | `MemoryController.load` |
| `MemoryController.save` | method | L250 | `src/core/memory/memory-controller.ts` | `MemoryController.save` |
| `MemoryController.getComponent` | method | L270 | `src/core/memory/memory-controller.ts` | `MemoryController.getComponent` |
| `MemoryController.setComponent` | method | L289 | `src/core/memory/memory-controller.ts` | `MemoryController.setComponent` |
| `MemoryController.incrementGeneration` | method | L382 | `src/core/memory/memory-controller.ts` | `MemoryController.incrementGeneration` |
| *(+ 55 more)* | | | | |

### `llm/llm-client.js` (71 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `LLM_PROVIDERS` | constant | L29 | `src/core/llm/llm-client.ts` | `LLM_PROVIDERS` |
| `DEFAULT_MODELS` | constant | L39 | `src/core/llm/llm-client.ts` | `DEFAULT_MODELS` |
| `API_ENDPOINTS` | constant | L49 | `src/core/llm/llm-client.ts` | `API_ENDPOINTS` |
| `RETRY_CONFIG` | constant | L59 | `src/core/llm/llm-client.ts` | `RETRY_CONFIG` |
| `LLM_ERROR_TYPES` | constant | L69 | `src/core/llm/llm-client.ts` | `LLM_ERROR_TYPES` |
| `RETRYABLE_ERRORS` | constant | L82 | `src/core/llm/llm-client.ts` | `RETRYABLE_ERRORS` |
| `LLMClient` | class | L90 | `src/core/llm/llm-client.ts` | `LLMClient` |
| `LLMClient.constructor` | method | L99 | `src/core/llm/llm-client.ts` | `LLMClient.constructor` |
| `LLMClient.isConfigured` | method | L135 | `src/core/llm/llm-client.ts` | `LLMClient.isConfigured` |
| `LLMClient._sanitizeApiKey` | method | L145 | `src/core/llm/llm-client.ts` | `LLMClient._sanitizeApiKey` |
| `LLMClient._proxyFetch` | method | L163 | `src/core/llm/llm-client.ts` | `LLMClient._proxyFetch` |
| `LLMClient.configure` | method | L271 | `src/core/llm/llm-client.ts` | `LLMClient.configure` |
| `LLMClient.call` | method | L289 | `src/core/llm/llm-client.ts` | `LLMClient.call` |
| `LLMClient._callWithRetry` | method | L319 | `src/core/llm/llm-client.ts` | `LLMClient._callWithRetry` |
| `LLMClient._executeCall` | method | L364 | `src/core/llm/llm-client.ts` | `LLMClient._executeCall` |
| `LLMClient._classifyError` | method | L384 | `src/core/llm/llm-client.ts` | `LLMClient._classifyError` |
| `LLMClient._calculateBackoff` | method | L433 | `src/core/llm/llm-client.ts` | `LLMClient._calculateBackoff` |
| `LLMClient._delay` | method | L446 | `src/core/llm/llm-client.ts` | `LLMClient._delay` |
| `LLMClient._callGemini` | method | L456 | `src/core/llm/llm-client.ts` | `LLMClient._callGemini` |
| `LLMClient._callOpenAI` | method | L532 | `src/core/llm/llm-client.ts` | `LLMClient._callOpenAI` |
| *(+ 51 more)* | | | | |

### `background/index.js` (67 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `geminiApiKey` | variable | L53 | `entrypoints/background.ts` | `geminiApiKey` |
| `openOptions` | variable | L64 | `src/core/orchestration/sidepanel-manager.ts` | `openOptions` |
| `key` | variable | L80 | `src/core/crypto/crypto-service.ts` | `key` |
| `openOptions` | variable | L100 | `src/core/orchestration/sidepanel-manager.ts` | `openOptions` |
| `result` | variable | L116 | `src/core/logging/logger.ts` | `result` |
| `hasEnabledModelWithKey` | variable | L122 | `entrypoints/background.ts` | `hasEnabledModelWithKey` |
| `jsonData` | variable | L147 | `entrypoints/background.ts` | `jsonData` |
| `filename` | variable | L147 | `src/core/sidepanel/import-export.ts` | `fileName` |
| `filenameListener` | function | L152 | `entrypoints/background.ts` | `filenameListener` |
| `base64Data` | variable | L158 | `entrypoints/background.ts` | `base64Data` |
| `dataUrl` | variable | L159 | `entrypoints/background.ts` | `dataUrl` |
| `tabId` | variable | L204 | `src/core/orchestration/sidepanel-manager.ts` | `tabId` |
| `disabledKey` | variable | L280 | `src/core/orchestration/api-proxy.ts` | `disabledKey` |
| `tabs` | variable | L298 | `entrypoints/background.ts` | `tabs` |
| `urlMatch` | variable | L307 | `src/core/sidepanel/sidepanel-controller.ts` | `urlMatch` |
| `sessionId` | variable | L308 | `src/content/scraper.ts` | `GeminiConversationScraper.sessionId` |
| `sessionKey` | variable | L316 | `src/core/sidepanel/persona-lifecycle.ts` | `sessionKey` |
| `stored` | variable | L317 | `src/core/logging/logger.ts` | `stored` |
| `ALLOWED_PROXY_HOSTS` | constant | L349 | `entrypoints/background.ts` | `ALLOWED_PROXY_HOSTS` |
| `targetUrl` | variable | L356 | `entrypoints/background.ts` | `targetUrl` |
| *(+ 47 more)* | | | | |

### `memory/context-assembler.js` (66 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `ctxLog` | function | L15 | `src/core/memory/context-assembler.ts` | `ctxLog` |
| `ContextAssembler` | class | L26 | `src/core/memory/context-assembler.ts` | `ContextAssembler` |
| `ContextAssembler.constructor` | method | L30 | `src/core/memory/context-assembler.ts` | `ContextAssembler.constructor` |
| `ContextAssembler.assemble` | method | L44 | `src/core/memory/context-assembler.ts` | `ContextAssembler.assemble` |
| `ContextAssembler._buildSummary` | method | L77 | `src/core/memory/context-assembler.ts` | `ContextAssembler._buildSummary` |
| `ContextAssembler._isComponentCurrent` | method | L106 | `src/core/memory/context-assembler.ts` | `ContextAssembler._isComponentCurrent` |
| `ContextAssembler._getComponent` | method | L120 | `src/core/memory/context-assembler.ts` | `ContextAssembler._getComponent` |
| `ContextAssembler._getComponentData` | method | L129 | `src/core/memory/context-assembler.ts` | `ContextAssembler._getComponentData` |
| `ContextAssembler._extractV4Data` | method | L144 | `src/core/memory/context-assembler.ts` | `ContextAssembler._extractV4Data` |
| `ContextAssembler._buildRefinementContext` | method | L173 | `src/core/memory/context-assembler.ts` | `ContextAssembler._buildRefinementContext` |
| `ContextAssembler.formatForRefinement` | method | L403 | `src/core/memory/context-assembler.ts` | `ContextAssembler.formatForRefinement` |
| `ContextAssembler.getContextJSON` | method | L540 | `src/core/memory/context-assembler.ts` | `ContextAssembler.getContextJSON` |
| `ContextAssembler.hasContext` | method | L551 | `src/core/memory/context-assembler.ts` | `ContextAssembler.hasContext` |
| `ContextAssembler.clearCache` | method | L558 | `src/core/memory/context-assembler.ts` | `ContextAssembler.clearCache` |
| `filterByGeneration` | variable | L45 | `src/core/memory/context-assembler.ts` | `filterByGeneration` |
| `unifiedContext` | variable | L46 | `src/core/memory/context-assembler.ts` | `unifiedContext` |
| `currentGeneration` | variable | L47 | `src/core/memory/context-assembler.ts` | `currentGeneration` |
| `summary` | variable | L78 | `src/core/memory/context-assembler.ts` | `summary` |
| `isCurrent` | variable | L86 | `src/core/memory/context-assembler.ts` | `isCurrent` |
| `context` | variable | L174 | `src/core/memory/context-assembler.ts` | `context` |
| *(+ 46 more)* | | | | |

### `model/model-manager.js` (66 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `modelLog` | function | L41 | `src/core/model/model-manager.ts` | `modelLog` |
| `MODEL_STORAGE_KEYS` | constant | L52 | `src/core/model/model-manager.ts` | `MODEL_STORAGE_KEYS` |
| `LEGACY_STORAGE_KEYS` | constant | L60 | `src/core/model/model-manager.ts` | `LEGACY_STORAGE_KEYS` |
| `ModelManager` | class | L70 | `src/core/model/model-manager.ts` | `ModelManager` |
| `ModelManager.constructor` | method | L71 | `src/adapters/storage/supabase-client.ts` | `SupabaseClientAdapter.constructor` |
| `ModelManager.init` | method | L86 | `src/core/model/model-manager.ts` | `ModelManager.init` |
| `ModelManager._doInit` | method | L106 | `src/core/model/model-manager.ts` | `ModelManager._doInit` |
| `ModelManager._ensureInitialized` | method | L154 | `src/core/model/model-manager.ts` | `ModelManager._ensureInitialized` |
| `ModelManager.getAllModels` | method | L168 | `src/core/model/model-manager.ts` | `ModelManager.getAllModels` |
| `ModelManager.getModel` | method | L182 | `src/core/model/model-manager.ts` | `ModelManager.getModel` |
| `ModelManager.hasApiKey` | method | L212 | `src/core/model/model-manager.ts` | `ModelManager.hasApiKey` |
| `ModelManager.updateModel` | method | L224 | `src/core/model/model-manager.ts` | `ModelManager.updateModel` |
| `ModelManager.addModel` | method | L274 | `src/core/model/model-manager.ts` | `ModelManager.addModel` |
| `ModelManager.deleteModel` | method | L310 | `src/core/model/model-manager.ts` | `ModelManager.deleteModel` |
| `ModelManager.enableModel` | method | L343 | `src/core/model/model-manager.ts` | `ModelManager.enableModel` |
| `ModelManager.disableModel` | method | L384 | `src/core/model/model-manager.ts` | `ModelManager.disableModel` |
| `ModelManager.getEnabledModels` | method | L403 | `src/core/model/model-manager.ts` | `ModelManager.getEnabledModels` |
| `ModelManager.getActiveModelId` | method | L416 | `src/core/model/model-manager.ts` | `ModelManager.getActiveModelId` |
| `ModelManager.getActiveModel` | method | L425 | `src/core/model/model-manager.ts` | `ModelManager.getActiveModel` |
| `ModelManager.setActiveModel` | method | L455 | `src/core/model/model-manager.ts` | `ModelManager.setActiveModel` |
| *(+ 46 more)* | | | | |

### `background/services/api-proxy.js` (65 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `getUserFriendlyError` | function | L21 | `src/core/orchestration/api-proxy.ts` | `getUserFriendlyError` |
| `providerName` | variable | L22 | `src/core/orchestration/api-proxy.ts` | `providerName` |
| `rawStr` | variable | L30 | `src/core/orchestration/api-proxy.ts` | `rawStr` |
| `REFINEMENT_SYSTEM_PROMPT` | constant | L66 | `src/core/orchestration/api-proxy.ts` | `REFINEMENT_SYSTEM_PROMPT` |
| `MODEL_CONFIGS` | constant | L116 | `src/core/orchestration/api-proxy.ts` | `MODEL_CONFIGS` |
| `LLM_TRANSPORTS` | constant | L147 | `src/core/orchestration/api-proxy.ts` | `LLM_TRANSPORTS` |
| `raw` | variable | L150 | `src/core/orchestration/api-proxy.ts` | `raw` |
| `effective` | variable | L151 | `src/core/orchestration/api-proxy.ts` | `effective` |
| `RETRY_CONFIG_BG` | constant | L218 | `src/core/orchestration/api-proxy.ts` | `RETRY_CONFIG_BG` |
| `calculateRetryDelay` | function | L230 | `src/core/orchestration/api-proxy.ts` | `calculateRetryDelay` |
| `exponentialDelay` | variable | L231 | `src/core/orchestration/api-proxy.ts` | `exponentialDelay` |
| `cappedDelay` | variable | L232 | `src/core/orchestration/api-proxy.ts` | `cappedDelay` |
| `jitter` | variable | L234 | `src/core/orchestration/api-proxy.ts` | `jitter` |
| `executeLlmRequest` | function | L241 | `src/core/orchestration/api-proxy.ts` | `executeLlmRequest` |
| `provider` | variable | L249 | `src/core/llm/llm-client.ts` | `LLMClient.provider` |
| `adapter` | variable | L252 | `src/content/observer.ts` | `adapter` |
| `apiKey` | variable | L257 | `src/adapters/storage/supabase-client.ts` | `SupabaseClientAdapter.apiKey` |
| `lastError` | variable | L262 | `src/core/llm/llm-client.ts` | `lastError` |
| `delay` | variable | L274 | `src/core/orchestration/api-proxy.ts` | `delay` |
| `timer` | variable | L280 | `src/core/orchestration/api-proxy.ts` | `timer` |
| *(+ 45 more)* | | | | |

---

## NEW_IN_WXT Symbols (TypeScript-Only, No Legacy Origin)

These symbols exist only in the WXT codebase — they are new TypeScript types, interfaces, enums, or components with no legacy JS counterpart.

| WXT File | Symbol | Type | Line |
|:---|:---|:---|:---|
| `src/core/logging/logger.ts` | `LogLevel` | enum | L37 |
| `src/core/logging/logger.ts` | `LogLevel.TRACE` | enum_member | L38 |
| `src/core/logging/logger.ts` | `LogLevel.DEBUG` | enum_member | L39 |
| `src/core/logging/logger.ts` | `LogLevel.INFO` | enum_member | L40 |
| `src/core/logging/logger.ts` | `LogLevel.WARN` | enum_member | L41 |
| `src/core/logging/logger.ts` | `LogLevel.ERROR` | enum_member | L42 |
| `src/core/logging/logger.ts` | `LogLevel.NONE` | enum_member | L43 |
| `src/core/logging/logger.ts` | `LogEntryData` | interface | L46 |
| `src/core/logging/logger.ts` | `LogEntryData.id` | interface_prop | L47 |
| `src/core/logging/logger.ts` | `LogEntryData.timestamp` | interface_prop | L48 |
| `src/core/logging/logger.ts` | `LogEntryData.isoTime` | interface_prop | L49 |
| `src/core/logging/logger.ts` | `LogEntryData.level` | interface_prop | L50 |
| `src/core/logging/logger.ts` | `LogEntryData.levelValue` | interface_prop | L51 |
| `src/core/logging/logger.ts` | `LogEntryData.component` | interface_prop | L52 |
| `src/core/logging/logger.ts` | `LogEntryData.message` | interface_prop | L53 |
| `src/core/logging/logger.ts` | `LogEntryData.data` | interface_prop | L54 |
| `src/core/logging/logger.ts` | `LogEntryData.error` | interface_prop | L55 |
| `src/core/logging/logger.ts` | `LogEntryData.sessionId` | interface_prop | L56 |
| `src/core/logging/logger.ts` | `LogEntryData.durationMs` | interface_prop | L57 |
| `src/core/logging/logger.ts` | `LogEntry.isoTime` | property | L63 |
| `src/core/logging/logger.ts` | `LogEntry.levelValue` | property | L65 |
| `src/core/logging/logger.ts` | `LogEntry.durationMs` | property | L71 |
| `src/core/logging/logger.ts` | `RingBuffer.buffer` | property | L113 |
| `src/core/logging/logger.ts` | `RingBuffer.head` | property | L114 |
| `src/core/logging/logger.ts` | `RingBuffer.tail` | property | L115 |
| `src/core/logging/logger.ts` | `RingBuffer.capacity` | property | L117 |
| `src/core/logging/logger.ts` | `RingBuffer.toArray` | method | L134 |
| `src/core/logging/logger.ts` | `idx` | variable | L137 |
| `src/core/logging/logger.ts` | `RingBuffer.size` | method | L159 |
| `src/core/logging/logger.ts` | `LoggerOptions` | interface | L164 |
| `src/core/logging/logger.ts` | `LoggerOptions.minLevel` | interface_prop | L165 |
| `src/core/logging/logger.ts` | `LoggerOptions.maxEntries` | interface_prop | L166 |
| `src/core/logging/logger.ts` | `LoggerOptions.enableConsole` | interface_prop | L167 |
| `src/core/logging/logger.ts` | `LoggerOptions.component` | interface_prop | L168 |
| `src/core/logging/logger.ts` | `Logger._listeners` | property | L172 |
| `src/core/logging/logger.ts` | `Logger.ringBuffer` | property | L181 |
| `src/core/logging/logger.ts` | `Logger.enableConsole` | property | L183 |
| `src/core/logging/logger.ts` | `Logger.defaultComponent` | property | L184 |
| `src/core/logging/logger.ts` | `Logger.listeners` | property | L186 |
| `src/core/logging/logger.ts` | `Logger.operations` | property | L187 |
| `src/core/logging/logger.ts` | `Logger.setMinLevel` | method | L225 |
| `src/core/logging/logger.ts` | `Logger.getMinLevel` | method | L229 |
| `src/core/logging/logger.ts` | `Logger.setSessionId` | method | L237 |
| `src/core/logging/logger.ts` | `Logger.getSessionId` | method | L241 |
| `src/core/logging/logger.ts` | `durationMs` | variable | L254 |
| `src/core/logging/logger.ts` | `levelKey` | variable | L319 |
| `src/core/logging/logger.ts` | `sanitizedMsg` | variable | L322 |
| `src/core/logging/logger.ts` | `Logger.log` | method | L343 |
| `src/core/logging/logger.ts` | `errObj` | variable | L364 |
| `src/core/logging/logger.ts` | `dataObj` | variable | L365 |
| `src/core/logging/logger.ts` | `Logger.getEntries` | method | L377 |
| `src/core/logging/logger.ts` | `Logger.exportJson` | method | L381 |
| `src/core/logging/logger.ts` | `rows` | variable | L391 |
| `src/core/logging/logger.ts` | `logger` | variable | L429 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps` | interface | L6 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.activePersona` | interface_prop | L7 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.onUpdatePersona` | interface_prop | L8 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.onRebuild` | interface_prop | L9 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.isRebuilding` | interface_prop | L10 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.lastUpdated` | interface_prop | L11 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.onOpenExpand` | interface_prop | L12 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.onOpenSourcePrompt` | interface_prop | L13 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextViewProps.onPinComponent` | interface_prop | L14 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `DIMENSION_DEFS` | constant | L17 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `ContextView` | function | L75 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `toggleExpand` | function | L111 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `toggleEnabled` | function | L115 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleTogglePin` | function | L120 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L123 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `nextPinned` | variable | L124 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `updated` | variable | L125 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleInstructionChange` | function | L139 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L141 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `shouldAutoPin` | variable | L142 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `updated` | variable | L143 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleMetadataChange` | function | L158 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L160 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentMeta` | variable | L161 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `updated` | variable | L162 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleAddCustomTag` | function | L175 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L178 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentList` | variable | L179 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `nextList` | variable | L180 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleRemoveCustomTag` | function | L185 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L187 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentList` | variable | L188 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `nextList` | variable | L189 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `handleToggleMultiSelect` | function | L193 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L195 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentList` | variable | L196 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `nextList` | variable | L197 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `currentDim` | variable | L236 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `isSelected` | variable | L320 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `isSelected` | variable | L381 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `isSelected` | variable | L442 |
| `entrypoints/sidepanel/components/ContextView.tsx` | `isSelected` | variable | L556 |
| `src/core/storage/repository.ts` | `IStorageBackend` | interface | L10 |
| `src/core/storage/repository.ts` | `IStorageBackend.get` | interface_method | L11 |
| `src/core/storage/repository.ts` | `IStorageBackend.set` | interface_method | L12 |
| `src/core/storage/repository.ts` | `IStorageBackend.remove` | interface_method | L13 |
| `src/core/storage/repository.ts` | `IStorageBackend.clear` | interface_method | L14 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend` | class | L20 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.store` | property | L21 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.get` | method | L23 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.set` | method | L30 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.remove` | method | L35 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.clear` | method | L39 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend` | class | L48 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.get_area` | accessor | L49 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.get` | method | L56 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.set` | method | L70 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.remove` | method | L80 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.clear` | method | L90 |
| `src/core/storage/repository.ts` | `StorageRepository.local` | property | L195 |
| `src/core/storage/repository.ts` | `StorageRepository.session` | property | L196 |
| `src/core/storage/repository.ts` | `StorageRepository.sync` | property | L197 |
| `src/core/storage/repository.ts` | `StorageRepository.getPersonas` | method | L201 |
| `src/core/storage/repository.ts` | `personas` | variable | L206 |
| `src/core/storage/repository.ts` | `StorageRepository.savePersona` | method | L210 |
| `src/core/storage/repository.ts` | `personas` | variable | L211 |
| `src/core/storage/repository.ts` | `personas` | variable | L217 |
| `src/core/storage/repository.ts` | `StorageRepository.getActivePersonaId` | method | L223 |
| `src/core/storage/repository.ts` | `StorageRepository.setActivePersonaId` | method | L227 |
| `src/core/storage/repository.ts` | `StorageRepository.getDrafts` | method | L232 |
| `src/core/storage/repository.ts` | `StorageRepository.saveDraft` | method | L236 |
| `src/core/storage/repository.ts` | `existingIndex` | variable | L238 |
| `src/core/storage/repository.ts` | `StorageRepository.deleteDraft` | method | L247 |
| `src/core/storage/repository.ts` | `StorageRepository.getSettings` | method | L254 |
| `src/core/storage/repository.ts` | `StorageRepository.updateSettings` | method | L258 |
| `src/core/storage/repository.ts` | `updated` | variable | L260 |
| `src/core/storage/repository.ts` | `StorageRepository.getSyncQueue` | method | L266 |
| `src/core/storage/repository.ts` | `StorageRepository.enqueueSyncAction` | method | L270 |
| `src/core/storage/repository.ts` | `queue` | variable | L271 |
| `src/core/storage/repository.ts` | `StorageRepository.clearSyncQueue` | method | L276 |
| `src/core/model/model-registry.ts` | `ModelParameterDef` | interface | L6 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.name` | interface_prop | L7 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.label` | interface_prop | L8 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.default` | interface_prop | L10 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.min` | interface_prop | L11 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.max` | interface_prop | L12 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.step` | interface_prop | L13 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.description` | interface_prop | L14 |
| `src/core/model/model-registry.ts` | `ModelEntry` | interface | L17 |
| `src/core/model/model-registry.ts` | `ModelEntry.id` | interface_prop | L18 |
| `src/core/model/model-registry.ts` | `ModelEntry.name` | interface_prop | L19 |
| `src/core/model/model-registry.ts` | `ModelEntry.description` | interface_prop | L20 |
| `src/core/model/model-registry.ts` | `ModelEntry.default` | interface_prop | L21 |
| `src/core/model/model-registry.ts` | `ModelEntry.contextWindow` | interface_prop | L22 |
| `src/core/model/model-registry.ts` | `ModelEntry.maxTokens` | interface_prop | L23 |
| `src/core/model/model-registry.ts` | `ModelEntry.supportsJson` | interface_prop | L24 |
| `src/core/model/model-registry.ts` | `ProviderDefinition` | interface | L27 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.id` | interface_prop | L28 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.name` | interface_prop | L29 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.color` | interface_prop | L30 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.defaultBaseURL` | interface_prop | L31 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.apiKeyUrl` | interface_prop | L32 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.apiKeyPlaceholder` | interface_prop | L33 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.supportsCustomURL` | interface_prop | L34 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.supportsDynamicModels` | interface_prop | L35 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.supportsCustomModel` | interface_prop | L36 |
| `src/core/model/model-registry.ts` | `ProviderDefinition.models` | interface_prop | L37 |
| `src/core/model/model-registry.ts` | `StoredModelConfig` | interface | L41 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.id` | interface_prop | L42 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.name` | interface_prop | L43 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.enabled` | interface_prop | L44 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.provider` | interface_prop | L45 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.model` | interface_prop | L46 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.apiKey` | interface_prop | L47 |
| `src/core/model/model-registry.ts` | `StoredModelConfig.baseURL` | interface_prop | L48 |
| `src/core/model/model-registry.ts` | `MODEL_REGISTRY` | constant | L417 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps` | interface | L22 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.personas` | interface_prop | L23 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.activeId` | interface_prop | L24 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onSelectActive` | interface_prop | L25 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onSavePersona` | interface_prop | L26 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onDeletePersona` | interface_prop | L27 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onReportPersona` | interface_prop | L28 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaView` | function | L31 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `filteredList` | variable | L86 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `matchesSearch` | variable | L88 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `matchesDomain` | variable | L89 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `filteredPrompts` | variable | L93 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleStartCreate` | function | L98 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleStartEdit` | function | L113 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `editData` | variable | L114 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `toneMeta` | variable | L118 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleCreate` | function | L129 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `newPersona` | variable | L133 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleAddTrait` | function | L176 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleRemoveTrait` | function | L182 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleImportJson` | function | L186 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `file` | variable | L187 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleImportPromptFile` | function | L203 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `file` | variable | L204 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `saved` | variable | L214 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `saved` | variable | L228 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `saved` | variable | L240 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleExportJson` | function | L254 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `p` | variable | L255 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleLoadStarterPresets` | function | L266 |
| *(truncated — 579 more NEW_IN_WXT symbols)* | | | |

---

## Methodology

1. **AST Extraction**: TypeScript Compiler API (`ts.createSourceFile`) parses every `.js` legacy file and every `.ts/.tsx` WXT file into a full AST.
2. **Symbol Harvesting**: Every class, method, constructor, property, accessor, function declaration, arrow function, variable, constant, interface, type alias, and enum is extracted with its name, type, and line number.
3. **Cross-Reference**: Each legacy symbol is looked up in a WXT symbol index by:
   - Exact full name match (e.g. `Logger.info` → `Logger.info`)
   - Bare name match (e.g. `Logger.info` → any symbol named `info`)
   - Type-compatible filtering (function↔method, variable↔property↔constant)
4. **Classification**:
   - **PORTED**: At least one name+type match found in WXT
   - **MISSING**: No match found — symbol has no WXT counterpart
   - **NEW_IN_WXT**: WXT symbol with no legacy match (TypeScript types, interfaces, enums, new components)
5. **Exclusions**: `supabase/supabase.min.js` (1,365 symbols) excluded as a vendor dependency.
