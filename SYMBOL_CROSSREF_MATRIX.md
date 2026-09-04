# Symbol-Level Cross-Reference Matrix

**Generated**: 2026-09-04T17:15:34.127Z
**Method**: TypeScript Compiler API AST extraction with deterministic name-matching cross-reference. Zero guesswork.

---

## Executive Summary

| Metric | Count | Percentage |
|:---|:---|:---|
| **Total Legacy Symbols** (excl. vendor `supabase.min.js`) | **2,509** | 100% |
| **PORTED** (matched in WXT by name + type) | **1,650** | **65.8%** |
| **MISSING** (no WXT counterpart found) | **859** | **34.2%** |
| **NEW_IN_WXT** (WXT-only, no legacy origin) | **636** | — |

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
| ❌ `build.js` | 27 | 1 | 26 | 4% |
| ✅ `content/diff.js` | 15 | 15 | 0 | 100% |
| ❌ `content/observer.js` | 226 | 95 | 131 | 42% |
| ❌ `content/scraper.js` | 77 | 52 | 25 | 68% |
| ⚠️ `content/templates.js` | 1 | 0 | 1 | 0% |
| ⚠️ `extractor/extractor.js` | 34 | 33 | 1 | 97% |
| ❌ `llm/llm-client.js` | 91 | 70 | 21 | 77% |
| ✅ `llm/llm-config.js` | 20 | 20 | 0 | 100% |
| ❌ `logging/logger.js` | 92 | 79 | 13 | 86% |
| ⚠️ `memory/analyzer-registry.js` | 6 | 4 | 2 | 67% |
| ✅ `memory/analyzers/recent-focus.js` | 8 | 8 | 0 | 100% |
| ❌ `memory/analyzers/unified-analyzer.js` | 40 | 19 | 21 | 48% |
| ❌ `memory/component-schemas.js` | 23 | 7 | 16 | 30% |
| ❌ `memory/context-assembler.js` | 73 | 66 | 7 | 90% |
| ❌ `memory/index.js` | 59 | 31 | 28 | 53% |
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
| ❌ `sidepanel/sidepanel.js` | 965 | 461 | 504 | 48% |
| ✅ `storage/storage-repository.js` | 17 | 17 | 0 | 100% |
| ❌ `supabase/supabase-client.js` | 64 | 58 | 6 | 91% |
| ⚠️ `theme/theme-controller.js` | 32 | 31 | 1 | 97% |

---

## Detailed MISSING Symbols

These legacy symbols have **no name-matched counterpart** in the WXT codebase.

### `sidepanel/sidepanel.js` (504 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `_currentExtraction` | variable | L53 |
| `chipGroup` | variable | L81 |
| `selectedChip` | variable | L83 |
| `detailsSection` | variable | L192 |
| `detailsContent` | variable | L193 |
| `retryBtn` | variable | L202 |
| `dismissBtn` | variable | L210 |
| `scrim` | variable | L211 |
| `confirmBtn` | variable | L307 |
| `cancelBtn` | variable | L308 |
| `scrim` | variable | L313 |
| `confirmBtn` | variable | L401 |
| `cancelBtn` | variable | L402 |
| `scrim` | variable | L406 |
| `dropdown` | variable | L464 |
| `trigger` | variable | L470 |
| `menu` | variable | L471 |
| `valueSpan` | variable | L472 |
| `itemsArray` | variable | L546 |
| `prevIndex` | variable | L562 |
| `errorMsg` | variable | L610 |
| `missingMemoryFields` | variable | L818 |
| `metadataDefaults` | variable | L836 |
| `personaDim` | variable | L860 |
| `legacyPersona` | variable | L861 |
| `hasV4Instruction` | variable | L871 |
| `personaAsString` | variable | L874 |
| `hasAnyPersonaContent` | variable | L875 |
| `legacySynthesized` | variable | L878 |
| `hasLegacyPersona` | variable | L879 |
| `suggestedName` | variable | L896 |
| `sidepanelPort` | variable | L982 |
| `previousSessionId` | variable | L1040 |
| `currentTab` | variable | L1055 |
| `toggles` | variable | L1107 |
| `componentId` | variable | L1111 |
| `logsTabActive` | variable | L1208 |
| `footer` | variable | L1209 |
| `logsTabActive` | variable | L1237 |
| `lastUpdatedEl` | variable | L1284 |
| `date` | variable | L1287 |
| `statusEl` | variable | L1309 |
| `dotEl` | variable | L1310 |
| `iconEl` | variable | L1311 |
| `textEl` | variable | L1312 |
| `activeModelData` | variable | L1318 |
| `modelName` | variable | L1327 |
| `isIframe` | variable | L1364 |
| `formState` | variable | L1369 |
| `personaInput` | variable | L1373 |
| `contextInput` | variable | L1374 |
| `pinBtn` | variable | L1403 |
| `iconEl` | variable | L1405 |
| `verbatimToggle` | variable | L1419 |
| `verbatimBadge` | variable | L1420 |
| `comp` | variable | L1461 |
| `injectedContextInput` | variable | L1484 |
| `lines` | variable | L1489 |
| `textSpan` | variable | L1613 |
| `range` | variable | L1623 |
| `sel` | variable | L1625 |
| `newValue` | variable | L1634 |
| `existingTags` | variable | L1690 |
| `newIndex` | variable | L1691 |
| `textSpan` | variable | L1698 |
| `textSpan` | variable | L1772 |
| `range` | variable | L1781 |
| `sel` | variable | L1783 |
| `newValue` | variable | L1792 |
| `existingTags` | variable | L1821 |
| `newIndex` | variable | L1822 |
| `textSpan` | variable | L1828 |
| `fieldParts` | variable | L1854 |
| `isEditable` | variable | L1941 |
| `onUpdate` | variable | L1941 |
| `textareaWrapper` | variable | L1948 |
| `textarea` | variable | L1951 |
| `expandBtn` | variable | L1961 |
| `compState` | variable | L1968 |
| `verbatimWrapper` | variable | L1971 |
| `verbatimBadge` | variable | L1974 |
| `toggleLabel` | variable | L1980 |
| `toggleInput` | variable | L1983 |
| `toggleSlider` | variable | L1989 |
| `shouldPin` | variable | L2000 |
| `autoSaveTimeout` | variable | L2048 |
| `newData` | variable | L2051 |
| `comp` | variable | L2073 |
| `domainChips` | variable | L2107 |
| `scopeChips` | variable | L2120 |
| `styleChips` | variable | L2135 |
| `bannedChips` | variable | L2149 |
| `reasoningChips` | variable | L2164 |
| `prohibChips` | variable | L2179 |
| `reqChips` | variable | L2191 |
| `lengthInput` | variable | L2203 |
| `typeChips` | variable | L2218 |
| `options` | variable | L2248 |
| `wrapper` | variable | L2250 |
| `labelEl` | variable | L2253 |
| `chipsContainer` | variable | L2258 |
| `isCurrentlySelected` | variable | L2271 |
| `presetOptions` | variable | L2301 |
| `allowCustom` | variable | L2301 |
| `wrapper` | variable | L2303 |
| `labelEl` | variable | L2306 |
| `chipsContainer` | variable | L2311 |
| `currentSelected` | variable | L2315 |
| `wrapper` | variable | L2415 |
| `labelEl` | variable | L2418 |
| `textarea` | variable | L2448 |
| `insightsContainer` | variable | L2449 |
| `pinBtn` | variable | L2450 |
| `personaNameEl` | variable | L2451 |
| `personaType` | variable | L2460 |
| `topPersonaNameEl` | variable | L2465 |
| `hasPersonaData` | variable | L2469 |
| `displayText` | variable | L2476 |
| `iconEl` | variable | L2502 |
| `parts` | variable | L2531 |
| `v4Data` | variable | L2594 |
| `domainDiv` | variable | L2618 |
| `v4Data` | variable | L2660 |
| `voiceDiv` | variable | L2683 |
| `v4Data` | variable | L2721 |
| `v4Data` | variable | L2777 |
| `v4Data` | variable | L2833 |
| `v4Data` | variable | L2889 |
| `toggleable` | variable | L2933 |
| `path` | variable | L2934 |
| `path` | variable | L2956 |
| `header` | variable | L2981 |
| `accordion` | variable | L3003 |
| `splitBtn` | variable | L3041 |
| `splitIcon` | variable | L3042 |
| `isIframe` | variable | L3043 |
| `splitViewToggleInProgress` | variable | L3044 |
| `formState` | variable | L3073 |
| `confirmed` | variable | L3140 |
| `componentId` | variable | L3162 |
| `msgType` | variable | L3171 |
| `msgType` | variable | L3180 |
| `contextTab` | variable | L3230 |
| `toggles` | variable | L3231 |
| `enabledAnalyzers` | variable | L3232 |
| `componentId` | variable | L3239 |
| `successCount` | variable | L3276 |
| `failedCount` | variable | L3277 |
| `filteredCount` | variable | L3278 |
| `failedNames` | variable | L3286 |
| `colors` | variable | L3324 |
| `activeEl` | variable | L3355 |
| `isUserEditing` | variable | L3356 |
| `logRefreshInterval` | variable | L3373 |
| `tabBtns` | variable | L3403 |
| `contextTab` | variable | L3404 |
| `logsTab` | variable | L3405 |
| `personaTab` | variable | L3406 |
| `pages` | variable | L3475 |
| `targetPage` | variable | L3476 |
| `backBtn` | variable | L3494 |
| `personaFooter` | variable | L3500 |
| `fab` | variable | L3501 |
| `showFabPages` | variable | L3504 |
| `hideFooterPages` | variable | L3513 |
| `browseBtn` | variable | L3521 |
| `createBtn` | variable | L3522 |
| `publishBtn` | variable | L3523 |
| `promptsBtn` | variable | L3524 |
| `savePromptBtn` | variable | L3525 |
| `fab` | variable | L3555 |
| `myPersonasBtn` | variable | L3561 |
| `targetPage` | variable | L3570 |
| `currentPageEl` | variable | L3571 |
| `currentPage` | variable | L3572 |
| `isNewExtraction` | variable | L3575 |
| `hasChanges` | variable | L3576 |
| `finishEdit` | variable | L3583 |
| `extractBtn` | variable | L3606 |
| `versionHistoryBtn` | variable | L3610 |
| `exportBtn` | variable | L3614 |
| `promptsBtn` | variable | L3619 |
| `addPromptFab` | variable | L3626 |
| `savePromptBtn` | variable | L3632 |
| `importBtn` | variable | L3636 |
| `importFile` | variable | L3637 |
| `importPromptBtn` | variable | L3647 |
| `importPromptFileInput` | variable | L3648 |
| `sourcePromptFab` | variable | L3658 |
| `closeViewerBtn` | variable | L3662 |
| `rebuildBtn` | variable | L3666 |
| `sourceViewer` | variable | L3670 |
| `filtersBtn` | variable | L3676 |
| `filtersPanel` | variable | L3677 |
| `emptyState` | variable | L3681 |
| `filterPanel` | variable | L3688 |
| `group` | variable | L3692 |
| `searchInput` | variable | L3706 |
| `query` | variable | L3707 |
| `group` | variable | L3723 |
| `isSingleSelect` | variable | L3724 |
| `filterResetBtn` | variable | L3740 |
| `group` | variable | L3744 |
| `searchInput` | variable | L3762 |
| `searchClearBtn` | variable | L3763 |
| `searchTimeout` | variable | L3764 |
| `publishBtn` | variable | L3793 |
| `accordion` | variable | L3822 |
| `targetId` | variable | L3842 |
| `maxTags` | variable | L3870 |
| `existingTags` | variable | L3871 |
| `textSpan` | variable | L3897 |
| `metadataSection` | variable | L3965 |
| `promptInput` | variable | L3976 |
| `extractBtn` | variable | L3977 |
| `finishEdit` | variable | L3982 |
| `_sectionBadgeState` | variable | L4103 |
| `shouldShowStale` | variable | L4153 |
| `componentData` | variable | L4189 |
| `componentGeneration` | variable | L4191 |
| `isStale` | variable | L4200 |
| `textarea` | variable | L4242 |
| `toggles` | variable | L4251 |
| `group` | variable | L4282 |
| `personaTextarea` | variable | L4295 |
| `parts` | variable | L4301 |
| `roleEl` | variable | L4313 |
| `purposeEl` | variable | L4314 |
| `credentialsEl` | variable | L4315 |
| `contextContent` | variable | L4321 |
| `toneContent` | variable | L4330 |
| `tone` | variable | L4331 |
| `frameworkContent` | variable | L4339 |
| `framework` | variable | L4340 |
| `constraintsContent` | variable | L4348 |
| `constraints` | variable | L4349 |
| `formatContent` | variable | L4357 |
| `exemplarContent` | variable | L4366 |
| `exemplar` | variable | L4367 |
| `injectedContextEl` | variable | L4375 |
| `lines` | variable | L4380 |
| `audienceEl` | variable | L4476 |
| `existingSourcePrompt` | variable | L4484 |
| `textareaSourcePrompt` | variable | L4485 |
| `extractedPage` | variable | L4517 |
| `inputs` | variable | L4521 |
| `chips` | variable | L4528 |
| `editables` | variable | L4535 |
| `topicDiv` | variable | L4554 |
| `summaryDiv` | variable | L4563 |
| `keywordsDiv` | variable | L4573 |
| `tagList` | variable | L4576 |
| `goalDiv` | variable | L4592 |
| `typeDiv` | variable | L4601 |
| `confDiv` | variable | L4619 |
| `subDiv` | variable | L4626 |
| `tagList` | variable | L4629 |
| `categories` | variable | L4643 |
| `hasEntities` | variable | L4645 |
| `categoryDiv` | variable | L4650 |
| `tagList` | variable | L4653 |
| `renderExtStyle` | function | L4667 |
| `toneDiv` | variable | L4671 |
| `verbDiv` | variable | L4680 |
| `techDiv` | variable | L4693 |
| `dirDiv` | variable | L4707 |
| `traits` | variable | L4720 |
| `traitsDiv` | variable | L4722 |
| `tagList` | variable | L4725 |
| `prefDiv` | variable | L4732 |
| `renderExtFocus` | function | L4748 |
| `topicDiv` | variable | L4752 |
| `taskDiv` | variable | L4761 |
| `reqDiv` | variable | L4771 |
| `momDiv` | variable | L4782 |
| `itemsDiv` | variable | L4793 |
| `tagList` | variable | L4796 |
| `renderExtContext` | function | L4811 |
| `v4Data` | variable | L4831 |
| `renderExtTone` | function | L4860 |
| `v4Data` | variable | L4880 |
| `renderExtFramework` | function | L4909 |
| `v4Data` | variable | L4929 |
| `renderExtConstraints` | function | L4958 |
| `v4Data` | variable | L4978 |
| `renderExtFormat` | function | L5007 |
| `v4Data` | variable | L5027 |
| `renderExtExemplar` | function | L5056 |
| `v4Data` | variable | L5076 |
| `createExtEditableTagList` | function | L5105 |
| `createExtEditableTag` | function | L5131 |
| `textSpan` | variable | L5148 |
| `range` | variable | L5157 |
| `sel` | variable | L5159 |
| `newValue` | variable | L5168 |
| `handleExtRemoveTag` | function | L5192 |
| `handleExtAddTag` | function | L5197 |
| `existingTags` | variable | L5199 |
| `newIndex` | variable | L5200 |
| `textSpan` | variable | L5206 |
| `updateExtTagsInData` | function | L5216 |
| `parts` | variable | L5225 |
| `obj` | variable | L5226 |
| `setupExtInlineEditing` | function | L5238 |
| `setupExtSelectChange` | function | L5264 |
| `updateExtFieldInData` | function | L5275 |
| `populateEditableTags` | function | L5291 |
| `textSpan` | variable | L5320 |
| `handleSaveDraft` | function | L5341 |
| `tone` | variable | L5363 |
| `complexity` | variable | L5364 |
| `keywords` | variable | L5367 |
| `subdomains` | variable | L5368 |
| `audienceEl` | variable | L5370 |
| `audience` | variable | L5371 |
| `handlePublishPersona` | function | L5412 |
| `nameInput` | variable | L5422 |
| `tone` | variable | L5436 |
| `complexity` | variable | L5437 |
| `missing` | variable | L5440 |
| `publishBtn` | variable | L5453 |
| `authError` | variable | L5464 |
| `publicBtn` | variable | L5471 |
| `isPublic` | variable | L5472 |
| `injectedContext` | variable | L5479 |
| `keywords` | variable | L5481 |
| `subdomains` | variable | L5482 |
| `audienceEl` | variable | L5484 |
| `audience` | variable | L5485 |
| `existingId` | variable | L5524 |
| `isUpdate` | variable | L5525 |
| `changeNotes` | variable | L5544 |
| `promptInput` | variable | L5581 |
| `errorTitle` | variable | L5592 |
| `errorDetails` | variable | L5593 |
| `handlePersonaSearch` | function | L5624 |
| `resultsContainer` | variable | L5625 |
| `filterPanel` | variable | L5626 |
| `getChipValue` | function | L5629 |
| `group` | variable | L5630 |
| `filters` | variable | L5636 |
| `keywords` | variable | L5672 |
| `searchStr` | variable | L5673 |
| `loadPopularPersonas` | function | L5704 |
| `resultsContainer` | variable | L5705 |
| `renderPersonaResults` | function | L5751 |
| `importCount` | variable | L5761 |
| `isLocal` | variable | L5762 |
| `showPersonaPopup` | function | L5788 |
| `existingPopup` | variable | L5790 |
| `keywords` | variable | L5794 |
| `preview` | variable | L5795 |
| `importCount` | variable | L5796 |
| `isLocal` | variable | L5799 |
| `actionButton` | variable | L5802 |
| `exportButton` | variable | L5811 |
| `popup` | variable | L5815 |
| `prevExtraction` | variable | L5873 |
| `showPersonaDetailModal` | function | L5887 |
| `existingModal` | variable | L5888 |
| `keywords` | variable | L5892 |
| `importCount` | variable | L5894 |
| `raterCount` | variable | L5896 |
| `llmModel` | variable | L5898 |
| `formatMemoryKey` | function | L5980 |
| `handleImportPersona` | function | L5989 |
| `loadMyPersonas` | function | L6051 |
| `published` | variable | L6082 |
| `allPersonas` | variable | L6096 |
| `loadSavedPrompts` | function | L6126 |
| `localPrompts` | variable | L6142 |
| `cloudPrompts` | variable | L6145 |
| `allPrompts` | variable | L6165 |
| `createPromptListItem` | function | L6193 |
| `preview` | variable | L6201 |
| `date` | variable | L6202 |
| `handleSavePrompt` | function | L6244 |
| `titleInput` | variable | L6245 |
| `contentInput` | variable | L6246 |
| `saveBtn` | variable | L6247 |
| `savePromptLocal` | function | L6297 |
| `newPrompt` | variable | L6301 |
| `confirmed` | variable | L6320 |
| `openPromptPreviewDialog` | function | L6359 |
| `closeDialog` | function | L6385 |
| `extractFromSavedPrompt` | function | L6404 |
| `textarea` | variable | L6408 |
| `createPersonaListItem` | function | L6425 |
| `keywords` | variable | L6434 |
| `isPublic` | variable | L6436 |
| `createRipple` | function | L6491 |
| `existingRipple` | variable | L6492 |
| `ripple` | variable | L6495 |
| `rect` | variable | L6498 |
| `x` | variable | L6500 |
| `y` | variable | L6501 |
| `handleVisibilityChange` | function | L6520 |
| `draftIndex` | variable | L6525 |
| `handleEditPersona` | function | L6559 |
| `confirmed` | variable | L6599 |
| `isDraft` | variable | L6614 |
| `loadPersonaToEdit` | function | L6657 |
| `nameInput` | variable | L6691 |
| `privateBtn` | variable | L6700 |
| `publicBtn` | variable | L6701 |
| `handleViewPersona` | function | L6717 |
| `openSourcePromptViewer` | function | L6741 |
| `viewer` | variable | L6742 |
| `textarea` | variable | L6743 |
| `sourcePrompt` | variable | L6747 |
| `closeSourcePromptViewer` | function | L6777 |
| `viewer` | variable | L6778 |
| `handleSourceViewerKeydown` | function | L6789 |
| `viewer` | variable | L6791 |
| `_rebuildInProgress` | variable | L6804 |
| `_rebuildCancelled` | variable | L6805 |
| `_hasUnsavedChanges` | variable | L6806 |
| `markFormDirty` | function | L6811 |
| `resetFormDirty` | function | L6818 |
| `hasUnsavedChanges` | function | L6825 |
| `handleRebuildFromSource` | function | L6829 |
| `sourcePrompt` | variable | L6830 |
| `rebuildBtn` | variable | L6842 |
| `confirmed` | variable | L6896 |
| `preserved` | variable | L6909 |
| `cancelRebuild` | function | L6959 |
| `rebuildBtn` | variable | L6971 |
| `openVersionHistory` | function | L7004 |
| `loadVersionHistory` | function | L7032 |
| `nameEl` | variable | L7034 |
| `versions` | variable | L7056 |
| `currentVersion` | variable | L7057 |
| `currentItem` | variable | L7082 |
| `prevSnapshot` | variable | L7091 |
| `createVersionItem` | function | L7106 |
| `date` | variable | L7112 |
| `notes` | variable | L7113 |
| `diffEl` | variable | L7133 |
| `generateDiffView` | function | L7157 |
| `currVal` | variable | L7172 |
| `prevVal` | variable | L7173 |
| `fullKey` | variable | L7174 |
| `currStr` | variable | L7183 |
| `prevStr` | variable | L7184 |
| `parts` | variable | L7227 |
| `last` | variable | L7228 |
| `restoreVersion` | function | L7250 |
| `confirmed` | variable | L7251 |
| `restoredData` | variable | L7261 |
| `exportData` | variable | L7300 |
| `safeName` | variable | L7319 |
| `handle` | variable | L7330 |
| `writable` | variable | L7338 |
| `allowedMimes` | variable | L7424 |
| `sanitizedContent` | variable | L7438 |
| `importPersonaFile` | function | L7485 |
| `textarea` | variable | L7504 |
| `processPersonaImport` | function | L7526 |
| `sanitizedPersona` | variable | L7533 |
| `nameInput` | variable | L7556 |
| `safeName` | variable | L7559 |
| `importPromptFile` | function | L7573 |
| `titleInput` | variable | L7587 |
| `contentInput` | variable | L7588 |
| `textContent` | variable | L7592 |
| `baseName` | variable | L7611 |
| `setupLogsPageHandlers` | function | L7687 |
| `levelFilter` | variable | L7688 |
| `exportBtn` | variable | L7689 |
| `clearBtn` | variable | L7690 |
| `contentLogs` | variable | L7705 |
| `bgLogs` | variable | L7706 |
| `exportData` | variable | L7708 |
| `renderLogsPage` | function | L7742 |
| `logViewer` | variable | L7743 |
| `logStats` | variable | L7744 |
| `logStatsText` | variable | L7745 |
| `levelFilter` | variable | L7746 |
| `tabLogCount` | variable | L7747 |
| `selectedLevel` | variable | L7758 |
| `displayLogs` | variable | L7771 |
| `byLevel` | variable | L7788 |
| `statsStr` | variable | L7792 |
| `setupSynthesizedPersonaSave` | function | L7803 |
| `textarea` | variable | L7804 |
| `verbatimToggle` | variable | L7805 |
| `verbatimBadge` | variable | L7806 |
| `shouldPin` | variable | L7813 |
| `autoSaveTimeout` | variable | L7847 |
| `savePersonaToStorage` | function | L7881 |
| `sessionData` | variable | L7888 |
| `setupExpandModal` | function | L7933 |
| `isExpanding` | variable | L7945 |
| `textarea` | variable | L7955 |
| `expanded` | variable | L7964 |
| `checkRatingEligibility` | function | L7984 |
| `showRatingPrompt` | function | L8002 |
| `selectedRating` | variable | L8034 |
| `ratingEligibilityInterval` | variable | L8118 |
| `contextTab` | variable | L8119 |
| `showModerationWarning` | function | L8176 |
| `showReportDialog` | function | L8228 |
| `existingDialog` | variable | L8229 |
| `submitReport` | function | L8306 |

### `content/observer.js` (131 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `extensionReloadNotificationShown` | variable | L96 |
| `refreshBtn` | variable | L184 |
| `closeBtn` | variable | L186 |
| `lastDetectedTheme` | variable | L243 |
| `themeObserver` | variable | L244 |
| `fromConfig` | variable | L397 |
| `style` | variable | L407 |
| `wrapper` | variable | L420 |
| `modelDot` | variable | L444 |
| `activeModelData` | variable | L456 |
| `api` | variable | L487 |
| `wrapper` | variable | L508 |
| `isOn` | variable | L518 |
| `api` | variable | L544 |
| `modalInstance` | variable | L556 |
| `refinedTextarea` | variable | L587 |
| `originalTextarea` | variable | L588 |
| `loader` | variable | L589 |
| `stopButtonArea` | variable | L590 |
| `btnClose` | variable | L591 |
| `btnRollback` | variable | L592 |
| `btnReRefine` | variable | L593 |
| `btnCopy` | variable | L594 |
| `btnSendFinal` | variable | L595 |
| `btnStop` | variable | L596 |
| `charCount` | variable | L597 |
| `diffViewEl` | variable | L598 |
| `panels` | variable | L600 |
| `navPrevOriginal` | variable | L603 |
| `navNextOriginal` | variable | L604 |
| `navPrevRefined` | variable | L605 |
| `navNextRefined` | variable | L606 |
| `navToRefined` | variable | L609 |
| `navToOriginal` | variable | L610 |
| `emptyStateEl` | variable | L630 |
| `btnConfigureApi` | variable | L631 |
| `errorBanner` | variable | L634 |
| `errorBannerMessage` | variable | L635 |
| `btnErrorRetry` | variable | L636 |
| `feedbackEl` | variable | L639 |
| `latency` | variable | L647 |
| `quality` | variable | L679 |
| `labels` | variable | L680 |
| `activeTextarea` | variable | L759 |
| `canOriginalPrev` | variable | L777 |
| `canOriginalNext` | variable | L778 |
| `refinedIndices` | variable | L781 |
| `currentRefinedPos` | variable | L786 |
| `canRefinedPrev` | variable | L790 |
| `canRefinedNext` | variable | L791 |
| `canRollback` | variable | L794 |
| `currentOriginalPair` | variable | L805 |
| `canGoToRefined` | variable | L806 |
| `currentRefinedPair` | variable | L809 |
| `canGoToOriginal` | variable | L810 |
| `hasContent` | variable | L822 |
| `footerButtonsDisabled` | variable | L827 |
| `pair` | variable | L913 |
| `pair` | variable | L923 |
| `targetIndex` | variable | L932 |
| `targetIndex` | variable | L946 |
| `currentPair` | variable | L968 |
| `indexChanged` | variable | L980 |
| `originalContainer` | variable | L987 |
| `refinedContainer` | variable | L988 |
| `refinedExpandBtn` | variable | L998 |
| `expandIcon` | variable | L1000 |
| `collapseIcon` | variable | L1001 |
| `currentPair` | variable | L1015 |
| `indexChanged` | variable | L1027 |
| `originalContainer` | variable | L1034 |
| `refinedContainer` | variable | L1035 |
| `originalExpandBtn` | variable | L1045 |
| `expandIcon` | variable | L1047 |
| `collapseIcon` | variable | L1048 |
| `api` | variable | L1065 |
| `pair` | variable | L1074 |
| `roughText` | variable | L1092 |
| `wasStopPressed` | variable | L1096 |
| `newPair` | variable | L1177 |
| `canProceed` | variable | L1198 |
| `roughText` | variable | L1228 |
| `hadResponseAtStop` | variable | L1289 |
| `hasLateResponse` | variable | L1325 |
| `hasResponseNow` | variable | L1326 |
| `pair` | variable | L1377 |
| `originalHTML` | variable | L1394 |
| `currentContent` | variable | L1413 |
| `wasOnRefinedTab` | variable | L1414 |
| `newPair` | variable | L1434 |
| `canProceed` | variable | L1453 |
| `expandedContainer` | variable | L1531 |
| `panel` | variable | L1534 |
| `tabName` | variable | L1535 |
| `expandIcon` | variable | L1544 |
| `collapseIcon` | variable | L1545 |
| `isRefineEnabled` | variable | L1557 |
| `isRefineEnabled` | variable | L1576 |
| `focusableSelectors` | variable | L1608 |
| `focusableElements` | variable | L1616 |
| `firstFocusable` | variable | L1619 |
| `lastFocusable` | variable | L1620 |
| `originalAddOpen` | variable | L1638 |
| `firstFocusable` | variable | L1644 |
| `expandIcon` | variable | L1661 |
| `collapseIcon` | variable | L1662 |
| `isExpanding` | variable | L1665 |
| `textarea` | variable | L1676 |
| `inputEl` | variable | L1702 |
| `buttonContainer` | variable | L1707 |
| `inputContainer` | variable | L1711 |
| `settingsApi` | variable | L1717 |
| `existingWrapper` | variable | L1718 |
| `rect` | variable | L1733 |
| `thinkingBtn` | variable | L1755 |
| `buttons` | variable | L1759 |
| `trailingActionsWrapper` | variable | L1769 |
| `toggleApi` | variable | L1771 |
| `existingToggle` | variable | L1773 |
| `settingsWrapper` | variable | L1787 |
| `inputButtonsWrapper` | variable | L1801 |
| `existingOverlay` | variable | L1817 |
| `cachedTabId` | variable | L1898 |
| `skipNextRefinement` | variable | L1923 |
| `inputEl` | variable | L1937 |
| `inputEl` | variable | L2114 |
| `toggleWrapper` | variable | L2115 |
| `toggleApi` | variable | L2116 |
| `splitViewActive` | variable | L2136 |
| `existingFrame` | variable | L2139 |
| `injectDebounceTimer` | variable | L2179 |

### `memory/index.js` (28 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `sessionMutexes` | variable | L72 |
| `runPromise` | variable | L96 |
| `scrapedData` | variable | L143 |
| `isSelectiveRebuild` | variable | L148 |
| `shouldIncrementGen` | variable | L149 |
| `newGen` | variable | L152 |
| `results` | variable | L164 |
| `enabledComponents` | variable | L177 |
| `pinnedComponents` | variable | L181 |
| `startTime` | variable | L214 |
| `unifiedResults` | variable | L215 |
| `duration` | variable | L218 |
| `dimensionIds` | variable | L226 |
| `sendBridgeResponse` | function | L349 |
| `SmartAutoRun` | variable | L398 |
| `completeTurns` | variable | L434 |
| `hasExistingMemory` | variable | L451 |
| `chatContainer` | variable | L467 |
| `isModelResponse` | variable | L495 |
| `canRun` | variable | L514 |
| `completeTurns` | variable | L514 |
| `enabledAnalyzers` | variable | L536 |
| `canRun` | variable | L574 |
| `hasMemory` | variable | L574 |
| `completeTurns` | variable | L574 |
| `newSessionId` | variable | L593 |
| `originalPushState` | variable | L630 |
| `originalReplaceState` | variable | L637 |

### `build.js` (26 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `esbuild` | variable | L1 |
| `fs` | variable | L2 |
| `path` | variable | L3 |
| `isWatch` | variable | L5 |
| `isDev` | variable | L6 |
| `outdir` | variable | L7 |
| `staticFiles` | variable | L10 |
| `cssFiles` | variable | L22 |
| `unbundledJsFiles` | variable | L30 |
| `ensureDir` | function | L64 |
| `dir` | variable | L65 |
| `cleanOutdir` | function | L71 |
| `entries` | variable | L78 |
| `copyStaticFiles` | function | L90 |
| `src` | variable | L93 |
| `dest` | variable | L94 |
| `buildJS` | function | L105 |
| `standaloneEntries` | variable | L122 |
| `buildCSS` | function | L141 |
| `src` | variable | L144 |
| `dest` | variable | L145 |
| `build` | function | L159 |
| `startTime` | variable | L162 |
| `bgCtx` | variable | L171 |
| `standaloneCtx` | variable | L183 |
| `elapsed` | variable | L203 |

### `content/scraper.js` (25 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `config` | variable | L240 |
| `totalBytes` | variable | L283 |
| `sliceOffset` | variable | L283 |
| `messages` | variable | L306 |
| `pairId` | variable | L307 |
| `skippedPairCount` | variable | L310 |
| `turn` | variable | L313 |
| `pair` | variable | L317 |
| `lastPair` | variable | L351 |
| `allMessages` | variable | L383 |
| `userSelectors` | variable | L386 |
| `userElements` | variable | L387 |
| `modelSelectors` | variable | L402 |
| `modelElements` | variable | L403 |
| `position` | variable | L426 |
| `totalBytes` | variable | L447 |
| `maxContainers` | variable | L451 |
| `sliceOffset` | variable | L453 |
| `turn` | variable | L476 |
| `clone` | variable | L502 |
| `hidden` | variable | L505 |
| `preBlocks` | variable | L509 |
| `inlineCode` | variable | L515 |
| `roleHeader` | variable | L590 |
| `rolePrefix` | variable | L597 |

### `llm/llm-client.js` (21 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `onGeminiPage` | variable | L166 |
| `isMainWorld` | variable | L170 |
| `timeoutId` | variable | L179 |
| `onAbort` | variable | L180 |
| `handler` | function | L212 |
| `fetchOptions` | variable | L241 |
| `mergedOptions` | variable | L302 |
| `errorType` | variable | L339 |
| `status` | variable | L386 |
| `startTime` | variable | L492 |
| `proxyResponse` | variable | L494 |
| `fetchDuration` | variable | L503 |
| `errorData` | variable | L510 |
| `messages` | variable | L535 |
| `proxyResponse` | variable | L567 |
| `enhancedPrompt` | variable | L598 |
| `proxyResponse` | variable | L618 |
| `enhancedPrompt` | variable | L650 |
| `messages` | variable | L656 |
| `proxyResponse` | variable | L669 |
| `jsonMatch` | variable | L787 |

### `memory/analyzers/unified-analyzer.js` (21 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `enabledComponents` | variable | L211 |
| `dimensionCount` | variable | L212 |
| `startTime` | variable | L215 |
| `schema` | variable | L224 |
| `rawResult` | variable | L227 |
| `duration` | variable | L233 |
| `obj` | variable | L255 |
| `unwrappers` | variable | L270 |
| `normalizedResult` | variable | L279 |
| `keyAliases` | variable | L288 |
| `lowerAlias` | variable | L301 |
| `primaryText` | variable | L314 |
| `sectionRegex` | variable | L320 |
| `rawHeading` | variable | L323 |
| `sectionContent` | variable | L324 |
| `expectedKeys` | variable | L340 |
| `hasAnyValidDimension` | variable | L351 |
| `textLines` | variable | L365 |
| `migrated` | variable | L381 |
| `defaultEmpty` | variable | L389 |
| `empty` | variable | L410 |

### `options/model-manager-ui.js` (18 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `link` | variable | L316 |
| `baseUrlGroup` | variable | L326 |
| `modelSelect` | variable | L334 |
| `customModelGroup` | variable | L340 |
| `modelSelect` | variable | L422 |
| `card` | variable | L464 |
| `originalText` | variable | L468 |
| `statusEl` | variable | L491 |
| `testConfig` | variable | L500 |
| `providerDef` | variable | L529 |
| `apiKeyInput` | variable | L530 |
| `fetchBtn` | variable | L531 |
| `modelSelect` | variable | L532 |
| `hintEl` | variable | L533 |
| `originalText` | variable | L554 |
| `providerDef` | variable | L682 |
| `customModel` | variable | L686 |
| `icons` | variable | L736 |

### `memory/component-schemas.js` (16 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `schema` | variable | L371 |
| `base` | variable | L403 |
| `personaParts` | variable | L457 |
| `contextParts` | variable | L468 |
| `terms` | variable | L474 |
| `toneParts` | variable | L485 |
| `fwParts` | variable | L500 |
| `steps` | variable | L503 |
| `cParts` | variable | L516 |
| `rules` | variable | L518 |
| `reqs` | variable | L524 |
| `limits` | variable | L530 |
| `fmtParts` | variable | L544 |
| `prefs` | variable | L547 |
| `exParts` | variable | L564 |
| `hints` | variable | L617 |

### `rating/rating-injector.js` (14 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `responses` | variable | L202 |
| `actions` | variable | L223 |
| `responses` | variable | L271 |
| `inserted` | variable | L312 |
| `actionsDiv` | variable | L316 |
| `textSelectors` | variable | L330 |
| `textEl` | variable | L341 |
| `turn` | variable | L388 |
| `allResponses` | variable | L392 |
| `allTurns` | variable | L403 |
| `chatHistory` | variable | L426 |
| `isModelResponse` | variable | L475 |
| `childResponses` | variable | L496 |
| `ratingContainers` | variable | L530 |

### `logging/logger.js` (13 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `timerId` | variable | L220 |
| `handler` | function | L222 |
| `resId` | variable | L223 |
| `storageArea` | variable | L256 |
| `storageArea` | variable | L265 |
| `savedLevel` | variable | L297 |
| `restData` | variable | L322 |
| `sanitizedMessage` | variable | L325 |
| `duration` | variable | L399 |
| `duration` | variable | L449 |
| `styles` | variable | L512 |
| `byLevel` | variable | L614 |
| `byComponent` | variable | L615 |

### `model/model-manager.js` (8 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `cached` | variable | L185 |
| `freshData` | variable | L192 |
| `masked` | variable | L604 |
| `migrated` | variable | L637 |
| `llmConfig` | variable | L658 |
| `firstEnabled` | variable | L678 |
| `changes` | variable | L743 |
| `keyArray` | variable | L879 |

### `memory/context-assembler.js` (7 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `domainSection` | variable | L435 |
| `terms` | variable | L439 |
| `frameworkSection` | variable | L468 |
| `steps` | variable | L473 |
| `reqs` | variable | L486 |
| `rules` | variable | L490 |
| `formatSection` | variable | L507 |

### `rating/rating-manager.js` (7 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `logFn` | variable | L56 |
| `ratingCount` | variable | L215 |
| `ratingCount` | variable | L320 |
| `backupAge` | variable | L321 |
| `ageMinutes` | variable | L322 |
| `ratings` | variable | L521 |
| `_currentRatingManager` | variable | L606 |

### `supabase/supabase-client.js` (6 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `hasData` | variable | L39 |
| `fetchError` | variable | L309 |
| `newVersion` | variable | L321 |
| `snapshot` | variable | L324 |
| `existingHistory` | variable | L338 |
| `versionHistory` | variable | L339 |

### `memory/memory-controller.js` (4 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `historyLength` | variable | L339 |
| `low` | variable | L715 |
| `high` | variable | L715 |
| `mid` | variable | L717 |

### `background/index.js` (3 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `sentCount` | variable | L300 |
| `skippedCount` | variable | L301 |
| `keepAliveInterval` | variable | L347 |

### `memory/analyzer-registry.js` (2 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `logFn` | variable | L61 |
| `existed` | variable | L170 |

### `content/templates.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `getReviewModalTemplate` | function | L96 |

### `extractor/extractor.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `hasData` | variable | L37 |

### `model/model-registry.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `chatModels` | variable | L414 |

### `rating/rating-ui.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `parent` | variable | L219 |

### `theme/theme-controller.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `resolvedTheme` | variable | L216 |

---

## Detailed PORTED Symbols (Sample)

Showing cross-reference for files with ported symbols.

### `sidepanel/sidepanel.js` (461 ported)

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
| *(+ 441 more)* | | | | |

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

### `llm/llm-client.js` (70 ported)

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
| *(+ 50 more)* | | | | |

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
| `sessionKey` | variable | L316 | `entrypoints/background.ts` | `sessionKey` |
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
| `src/core/llm/llm-client.ts` | `LLMErrorType` | enum | L60 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.RATE_LIMIT` | enum_member | L61 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.QUOTA_EXCEEDED` | enum_member | L62 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.NETWORK` | enum_member | L63 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.TOKEN_LIMIT` | enum_member | L64 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.AUTH` | enum_member | L65 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.MALFORMED_RESPONSE` | enum_member | L66 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.UNKNOWN` | enum_member | L67 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig` | interface | L70 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.provider` | interface_prop | L71 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.apiKey` | interface_prop | L72 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.model` | interface_prop | L73 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.temperature` | interface_prop | L74 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.maxTokens` | interface_prop | L75 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.json` | interface_prop | L76 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.systemPrompt` | interface_prop | L77 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.baseURL` | interface_prop | L78 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.timeoutMs` | interface_prop | L79 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload` | interface | L82 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.text` | interface_prop | L83 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.json` | interface_prop | L84 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.usage` | interface_prop | L85 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.durationMs` | interface_prop | L90 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.model` | interface_prop | L91 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.provider` | interface_prop | L92 |
| `src/core/llm/llm-client.ts` | `LLMClient.temperature` | property | L99 |
| `src/core/llm/llm-client.ts` | `LLMClient.maxTokens` | property | L100 |
| `src/core/llm/llm-client.ts` | `LLMClient.baseURL` | property | L101 |
| `src/core/llm/llm-client.ts` | `msg` | variable | L144 |
| `src/core/llm/llm-client.ts` | `errType` | variable | L158 |
| `src/core/llm/llm-client.ts` | `resultText` | variable | L304 |
| `src/core/llm/llm-client.ts` | `durationMs` | variable | L305 |
| `src/core/llm/llm-client.ts` | `parsedJson` | variable | L307 |
| `src/core/llm/llm-client.ts` | `LLMConfigManager._modelManager` | property | L330 |
| `src/core/rating/rating-manager.ts` | `RatingData.rating` | interface_prop | L14 |
| `src/core/rating/rating-manager.ts` | `RatingData.ratedAt` | interface_prop | L15 |
| `src/core/rating/rating-manager.ts` | `RatingData.feedback` | interface_prop | L16 |
| `src/core/rating/rating-manager.ts` | `RatingStats` | interface | L19 |
| `src/core/rating/rating-manager.ts` | `RatingStats.averageRating` | interface_prop | L20 |
| `src/core/rating/rating-manager.ts` | `RatingStats.totalRated` | interface_prop | L21 |
| `src/core/rating/rating-manager.ts` | `RatingStats.distribution` | interface_prop | L22 |
| `src/core/rating/rating-manager.ts` | `RatingManager._cache` | property | L36 |
| `src/core/rating/rating-manager.ts` | `RatingManager.getSessionId` | method | L63 |
| `src/core/rating/rating-manager.ts` | `RatingManager.getAverageRating` | method | L118 |
| `src/core/rating/rating-manager.ts` | `sum` | variable | L121 |
| `src/core/rating/rating-manager.ts` | `RatingManager.deleteRating` | method | L140 |
| `src/core/rating/rating-manager.ts` | `distribution` | variable | L157 |
| `src/core/rating/rating-manager.ts` | `sum` | variable | L163 |
| `src/core/rating/rating-manager.ts` | `score` | variable | L165 |
| `src/core/rating/rating-manager.ts` | `RatingManager.clear` | method | L177 |
| `src/core/rating/rating-manager.ts` | `RatingManager.getAllSessionIds` | method | L185 |
| `src/core/rating/rating-manager.ts` | `sessionIds` | variable | L186 |
| `src/core/rating/rating-manager.ts` | `sid` | variable | L229 |
| `src/core/rating/rating-manager.ts` | `idx` | variable | L257 |
| `src/core/rating/rating-manager.ts` | `toDelete` | variable | L275 |
| `src/core/rating/rating-manager.ts` | `k` | variable | L277 |
| `src/core/rating/rating-manager.ts` | `sid` | variable | L293 |
| `src/lib/storage/items.ts` | `PersonaDraft` | interface | L3 |
| `src/lib/storage/items.ts` | `PersonaDraft.id` | interface_prop | L4 |
| `src/lib/storage/items.ts` | `PersonaDraft.source_prompt` | interface_prop | L5 |
| `src/lib/storage/items.ts` | `PersonaDraft.persona` | interface_prop | L6 |
| `src/lib/storage/items.ts` | `PersonaDraft.provider` | interface_prop | L7 |
| `src/lib/storage/items.ts` | `PersonaDraft.llm_model` | interface_prop | L8 |
| `src/lib/storage/items.ts` | `PersonaDraft.created_at` | interface_prop | L9 |
| `src/lib/storage/items.ts` | `PersonaDraft.is_public` | interface_prop | L10 |
| `src/lib/storage/items.ts` | `UserSettings` | interface | L13 |
| `src/lib/storage/items.ts` | `UserSettings.activeModelProvider` | interface_prop | L15 |
| `src/lib/storage/items.ts` | `UserSettings.activeModelName` | interface_prop | L16 |
| `src/lib/storage/items.ts` | `UserSettings.autoRefineOnEnter` | interface_prop | L17 |
| `src/lib/storage/items.ts` | `UserSettings.cloudSyncEnabled` | interface_prop | L18 |
| `src/lib/storage/items.ts` | `RatingRecord` | interface | L21 |
| `src/lib/storage/items.ts` | `RatingRecord.id` | interface_prop | L22 |
| *(truncated — 436 more NEW_IN_WXT symbols)* | | | |

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
