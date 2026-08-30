# Symbol-Level Cross-Reference Matrix

**Generated**: 2026-08-30T18:36:22.636Z
**Method**: TypeScript Compiler API AST extraction with deterministic name-matching cross-reference. Zero guesswork.

---

## Executive Summary

| Metric | Count | Percentage |
|:---|:---|:---|
| **Total Legacy Symbols** (excl. vendor `supabase.min.js`) | **2,509** | 100% |
| **PORTED** (matched in WXT by name + type) | **1,132** | **45.1%** |
| **MISSING** (no WXT counterpart found) | **1,377** | **54.9%** |
| **NEW_IN_WXT** (WXT-only, no legacy origin) | **529** | — |

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
| ❌ `content/observer.js` | 226 | 47 | 179 | 21% |
| ❌ `content/scraper.js` | 77 | 17 | 60 | 22% |
| ⚠️ `content/templates.js` | 1 | 0 | 1 | 0% |
| ❌ `extractor/extractor.js` | 34 | 17 | 17 | 50% |
| ❌ `llm/llm-client.js` | 91 | 46 | 45 | 51% |
| ❌ `llm/llm-config.js` | 20 | 8 | 12 | 40% |
| ❌ `logging/logger.js` | 92 | 48 | 44 | 52% |
| ⚠️ `memory/analyzer-registry.js` | 6 | 3 | 3 | 50% |
| ✅ `memory/analyzers/recent-focus.js` | 8 | 8 | 0 | 100% |
| ❌ `memory/analyzers/unified-analyzer.js` | 40 | 19 | 21 | 48% |
| ❌ `memory/component-schemas.js` | 23 | 7 | 16 | 30% |
| ❌ `memory/context-assembler.js` | 73 | 65 | 8 | 89% |
| ❌ `memory/index.js` | 59 | 24 | 35 | 41% |
| ⚠️ `memory/memory-controller.js` | 79 | 74 | 5 | 94% |
| ❌ `model/model-manager.js` | 74 | 41 | 33 | 55% |
| ⚠️ `model/model-registry.js` | 35 | 32 | 3 | 91% |
| ⚠️ `options/index.js` | 5 | 1 | 4 | 20% |
| ❌ `options/model-manager-ui.js` | 83 | 29 | 54 | 35% |
| ❌ `rating/rating-injector.js` | 26 | 4 | 22 | 15% |
| ❌ `rating/rating-manager.js` | 43 | 20 | 23 | 47% |
| ❌ `rating/rating-ui.js` | 15 | 4 | 11 | 27% |
| ⚠️ `sidepanel/modules/cloud-sync.js` | 2 | 0 | 2 | 0% |
| ⚠️ `sidepanel/modules/dimension-view.js` | 4 | 0 | 4 | 0% |
| ⚠️ `sidepanel/modules/persona-view.js` | 2 | 0 | 2 | 0% |
| ❌ `sidepanel/sidepanel.js` | 965 | 268 | 697 | 28% |
| ⚠️ `storage/storage-repository.js` | 17 | 13 | 4 | 76% |
| ❌ `supabase/supabase-client.js` | 64 | 35 | 29 | 55% |
| ❌ `theme/theme-controller.js` | 32 | 17 | 15 | 53% |

---

## Detailed MISSING Symbols

These legacy symbols have **no name-matched counterpart** in the WXT codebase.

### `sidepanel/sidepanel.js` (697 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `spLog` | function | L25 |
| `_currentExtraction` | variable | L53 |
| `getSupabaseClient` | function | L68 |
| `getChipGroupValue` | function | L80 |
| `chipGroup` | variable | L81 |
| `selectedChip` | variable | L83 |
| `getTagValues` | function | L92 |
| `EXTRACTION_SCHEMA` | constant | L113 |
| `VALID_ENUMS` | constant | L151 |
| `showAlertDialog` | function | L177 |
| `dialog` | variable | L179 |
| `detailsSection` | variable | L192 |
| `detailsContent` | variable | L193 |
| `retryBtn` | variable | L202 |
| `dismissBtn` | variable | L210 |
| `scrim` | variable | L211 |
| `cleanup` | function | L214 |
| `handleDismiss` | function | L222 |
| `handleRetry` | function | L228 |
| `handleScrimClick` | function | L235 |
| `handleKeydown` | function | L243 |
| `showConfirmDialog` | function | L290 |
| `dialog` | variable | L292 |
| `confirmBtn` | variable | L307 |
| `cancelBtn` | variable | L308 |
| `scrim` | variable | L313 |
| `cleanup` | function | L316 |
| `handleConfirm` | function | L324 |
| `handleCancel` | function | L329 |
| `handleScrimClick` | function | L335 |
| `handleKeydown` | function | L343 |
| `showPromptDialog` | function | L381 |
| `dialog` | variable | L383 |
| `confirmBtn` | variable | L401 |
| `cancelBtn` | variable | L402 |
| `scrim` | variable | L406 |
| `cleanup` | function | L409 |
| `handleConfirm` | function | L417 |
| `handleCancel` | function | L422 |
| `handleScrimClick` | function | L428 |
| `handleKeydown` | function | L435 |
| `setupM3Dropdown` | function | L463 |
| `dropdown` | variable | L464 |
| `trigger` | variable | L470 |
| `menu` | variable | L471 |
| `valueSpan` | variable | L472 |
| `toggleDropdown` | function | L481 |
| `selected` | variable | L488 |
| `selectItem` | function | L494 |
| `itemsArray` | variable | L546 |
| `currentIndex` | variable | L547 |
| `nextIndex` | variable | L557 |
| `prevIndex` | variable | L562 |
| `validateExtractionResponse` | function | L607 |
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
| `currentSessionId` | variable | L933 |
| `themeToggleBtn` | variable | L949 |
| `sidepanelPort` | variable | L982 |
| `handleCloseSidepanel` | function | L983 |
| `handleTabActivated` | function | L1039 |
| `previousSessionId` | variable | L1040 |
| `handleTabUpdated` | function | L1052 |
| `currentTab` | variable | L1055 |
| `loadSessionFromTab` | function | L1070 |
| `hasModel` | variable | L1072 |
| `setupAnalyzerToggles` | function | L1106 |
| `toggles` | variable | L1107 |
| `componentId` | variable | L1111 |
| `loadCurrentSession` | function | L1133 |
| `hasModel` | variable | L1136 |
| `showNoModelOverlay` | function | L1184 |
| `hideNoModelOverlay` | function | L1199 |
| `logsTabActive` | variable | L1208 |
| `footer` | variable | L1209 |
| `showNoSession` | function | L1218 |
| `showSession` | function | L1230 |
| `logsTabActive` | variable | L1237 |
| `loadMemoryData` | function | L1266 |
| `lastUpdatedEl` | variable | L1284 |
| `date` | variable | L1287 |
| `checkLLMStatus` | function | L1308 |
| `statusEl` | variable | L1309 |
| `dotEl` | variable | L1310 |
| `iconEl` | variable | L1311 |
| `textEl` | variable | L1312 |
| `activeModelData` | variable | L1318 |
| `modelName` | variable | L1327 |
| `restoreFormStateFromSplitView` | function | L1363 |
| `isIframe` | variable | L1364 |
| `formState` | variable | L1369 |
| `personaInput` | variable | L1373 |
| `contextInput` | variable | L1374 |
| `updateDimensionPinButton` | function | L1402 |
| `pinBtn` | variable | L1403 |
| `iconEl` | variable | L1405 |
| `verbatimToggle` | variable | L1419 |
| `verbatimBadge` | variable | L1420 |
| `renderAllComponents` | function | L1438 |
| `getActiveCompData` | function | L1447 |
| `comp` | variable | L1461 |
| `injectedContextInput` | variable | L1484 |
| `lines` | variable | L1489 |
| `createEditableTagList` | function | L1570 |
| `tag` | variable | L1578 |
| `addBtn` | variable | L1583 |
| `createEditableTag` | function | L1596 |
| `tag` | variable | L1597 |
| `removeBtn` | variable | L1603 |
| `textSpan` | variable | L1613 |
| `range` | variable | L1623 |
| `sel` | variable | L1625 |
| `newValue` | variable | L1634 |
| `handleRemoveTag` | function | L1661 |
| `handleEditTag` | function | L1676 |
| `handleAddTag` | function | L1688 |
| `addBtn` | variable | L1689 |
| `existingTags` | variable | L1690 |
| `newIndex` | variable | L1691 |
| `tag` | variable | L1694 |
| `textSpan` | variable | L1698 |
| `updateTagsInStorage` | function | L1708 |
| `tags` | variable | L1712 |
| `createContextEditableTagList` | function | L1729 |
| `tag` | variable | L1737 |
| `addBtn` | variable | L1742 |
| `createContextEditableTag` | function | L1755 |
| `tag` | variable | L1756 |
| `removeBtn` | variable | L1762 |
| `textSpan` | variable | L1772 |
| `range` | variable | L1781 |
| `sel` | variable | L1783 |
| `newValue` | variable | L1792 |
| `handleAddContextTag` | function | L1819 |
| `addBtn` | variable | L1820 |
| `existingTags` | variable | L1821 |
| `newIndex` | variable | L1822 |
| `tag` | variable | L1824 |
| `textSpan` | variable | L1828 |
| `handleRemoveContextTag` | function | L1838 |
| `updateContextTagsInData` | function | L1847 |
| `tags` | variable | L1851 |
| `fieldParts` | variable | L1854 |
| `setupContextInlineEditing` | function | L1871 |
| `updateContextFieldInData` | function | L1905 |
| `renderV4Section` | function | L1940 |
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
| `triggerUpdate` | function | L2049 |
| `newData` | variable | L2051 |
| `comp` | variable | L2073 |
| `metadata` | variable | L2101 |
| `domainChips` | variable | L2107 |
| `scopeChips` | variable | L2120 |
| `styleChips` | variable | L2135 |
| `bannedChips` | variable | L2149 |
| `reasoningChips` | variable | L2164 |
| `prohibChips` | variable | L2179 |
| `reqChips` | variable | L2191 |
| `lengthInput` | variable | L2203 |
| `typeChips` | variable | L2218 |
| `createSingleSelectChips` | function | L2247 |
| `options` | variable | L2248 |
| `selected` | variable | L2248 |
| `wrapper` | variable | L2250 |
| `labelEl` | variable | L2253 |
| `chipsContainer` | variable | L2258 |
| `chip` | variable | L2262 |
| `isCurrentlySelected` | variable | L2271 |
| `createMultiSelectChips` | function | L2300 |
| `presetOptions` | variable | L2301 |
| `selected` | variable | L2301 |
| `allowCustom` | variable | L2301 |
| `wrapper` | variable | L2303 |
| `labelEl` | variable | L2306 |
| `chipsContainer` | variable | L2311 |
| `currentSelected` | variable | L2315 |
| `renderChips` | function | L2318 |
| `chip` | variable | L2323 |
| `chip` | variable | L2346 |
| `addBtn` | variable | L2362 |
| `handleAdd` | function | L2377 |
| `createTextInput` | function | L2412 |
| `placeholder` | variable | L2413 |
| `wrapper` | variable | L2415 |
| `labelEl` | variable | L2418 |
| `renderSynthesizedPersona` | function | L2447 |
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
| `renderContext` | function | L2566 |
| `v4Data` | variable | L2594 |
| `domainDiv` | variable | L2618 |
| `renderTone` | function | L2632 |
| `v4Data` | variable | L2660 |
| `voiceDiv` | variable | L2683 |
| `renderFramework` | function | L2693 |
| `v4Data` | variable | L2721 |
| `renderConstraints` | function | L2749 |
| `v4Data` | variable | L2777 |
| `renderFormat` | function | L2805 |
| `v4Data` | variable | L2833 |
| `renderExemplar` | function | L2861 |
| `v4Data` | variable | L2889 |
| `handleFactToggle` | function | L2931 |
| `toggleable` | variable | L2933 |
| `path` | variable | L2934 |
| `updateToggleStates` | function | L2954 |
| `path` | variable | L2956 |
| `setupAccordions` | function | L2976 |
| `icon` | variable | L2980 |
| `accordion` | variable | L3003 |
| `icon` | variable | L3005 |
| `setupButtonHandlers` | function | L3034 |
| `splitBtn` | variable | L3041 |
| `splitIcon` | variable | L3042 |
| `isIframe` | variable | L3043 |
| `splitViewToggleInProgress` | variable | L3044 |
| `formState` | variable | L3073 |
| `confirmed` | variable | L3140 |
| `componentId` | variable | L3162 |
| `msgType` | variable | L3171 |
| `msgType` | variable | L3180 |
| `saveComponent` | function | L3204 |
| `rebuildMemory` | function | L3220 |
| `btn` | variable | L3221 |
| `contextTab` | variable | L3230 |
| `toggles` | variable | L3231 |
| `enabledAnalyzers` | variable | L3232 |
| `VALID_DIMENSIONS` | constant | L3235 |
| `componentId` | variable | L3239 |
| `successCount` | variable | L3276 |
| `failedCount` | variable | L3277 |
| `filteredCount` | variable | L3278 |
| `failedNames` | variable | L3286 |
| `showNotification` | function | L3322 |
| `colors` | variable | L3324 |
| `capitalizeFirst` | function | L3342 |
| `handleStorageChange` | function | L3346 |
| `activeEl` | variable | L3355 |
| `isUserEditing` | variable | L3356 |
| `logRefreshInterval` | variable | L3373 |
| `setupLogViewer` | function | L3379 |
| `setupTabNavigation` | function | L3402 |
| `tabBtns` | variable | L3403 |
| `contextTab` | variable | L3404 |
| `logsTab` | variable | L3405 |
| `personaTab` | variable | L3406 |
| `navigateToPersonaPage` | function | L3474 |
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
| `setupPersonaNavigation` | function | L3553 |
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
| `getSelectedChipValue` | function | L3691 |
| `group` | variable | L3692 |
| `selected` | variable | L3693 |
| `hasActiveFilters` | function | L3698 |
| `onFilterChange` | function | L3705 |
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
| `setupEditPersonaAccordions` | function | L3813 |
| `accordion` | variable | L3822 |
| `icon` | variable | L3824 |
| `targetId` | variable | L3842 |
| `icon` | variable | L3844 |
| `setupTagList` | function | L3864 |
| `addBtn` | variable | L3865 |
| `maxTags` | variable | L3870 |
| `existingTags` | variable | L3871 |
| `tag` | variable | L3882 |
| `removeBtn` | variable | L3887 |
| `textSpan` | variable | L3897 |
| `saveTag` | function | L3908 |
| `setupExtractedPageInteractions` | function | L3933 |
| `chip` | variable | L3937 |
| `metadataSection` | variable | L3965 |
| `handleExtractPersona` | function | L3975 |
| `promptInput` | variable | L3976 |
| `extractBtn` | variable | L3977 |
| `finishEdit` | variable | L3982 |
| `parseExtractionResult` | function | L4074 |
| `_sectionBadgeState` | variable | L4103 |
| `updateSectionBadge` | function | L4126 |
| `badge` | variable | L4127 |
| `shouldShowStale` | variable | L4153 |
| `initializeSectionBadges` | function | L4182 |
| `componentData` | variable | L4189 |
| `componentGeneration` | variable | L4191 |
| `toggle` | variable | L4195 |
| `isStale` | variable | L4200 |
| `setupBadgeListeners` | function | L4238 |
| `textarea` | variable | L4242 |
| `toggles` | variable | L4251 |
| `populateExtractionResults` | function | L4269 |
| `providerEl` | variable | L4274 |
| `modelEl` | variable | L4275 |
| `setChipSelection` | function | L4280 |
| `group` | variable | L4282 |
| `chip` | variable | L4285 |
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
| `format` | variable | L4358 |
| `exemplarContent` | variable | L4366 |
| `exemplar` | variable | L4367 |
| `injectedContextEl` | variable | L4375 |
| `lines` | variable | L4380 |
| `audienceEl` | variable | L4476 |
| `existingSourcePrompt` | variable | L4484 |
| `textareaSourcePrompt` | variable | L4485 |
| `setupFormDirtyTracking` | function | L4516 |
| `extractedPage` | variable | L4517 |
| `inputs` | variable | L4521 |
| `chips` | variable | L4528 |
| `editables` | variable | L4535 |
| `renderExtTopicSummary` | function | L4550 |
| `topicDiv` | variable | L4554 |
| `summaryDiv` | variable | L4563 |
| `keywordsDiv` | variable | L4573 |
| `tagList` | variable | L4576 |
| `renderExtIntent` | function | L4588 |
| `goalDiv` | variable | L4592 |
| `typeDiv` | variable | L4601 |
| `confDiv` | variable | L4619 |
| `subDiv` | variable | L4626 |
| `tagList` | variable | L4629 |
| `renderExtEntities` | function | L4641 |
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
| `tag` | variable | L5113 |
| `addBtn` | variable | L5118 |
| `createExtEditableTag` | function | L5131 |
| `tag` | variable | L5132 |
| `removeBtn` | variable | L5138 |
| `textSpan` | variable | L5148 |
| `range` | variable | L5157 |
| `sel` | variable | L5159 |
| `newValue` | variable | L5168 |
| `handleExtRemoveTag` | function | L5192 |
| `handleExtAddTag` | function | L5197 |
| `addBtn` | variable | L5198 |
| `existingTags` | variable | L5199 |
| `newIndex` | variable | L5200 |
| `tag` | variable | L5202 |
| `textSpan` | variable | L5206 |
| `updateExtTagsInData` | function | L5216 |
| `tags` | variable | L5222 |
| `parts` | variable | L5225 |
| `obj` | variable | L5226 |
| `setupExtInlineEditing` | function | L5238 |
| `setupExtSelectChange` | function | L5264 |
| `updateExtFieldInData` | function | L5275 |
| `populateEditableTags` | function | L5291 |
| `addBtn` | variable | L5298 |
| `tag` | variable | L5304 |
| `removeBtn` | variable | L5310 |
| `textSpan` | variable | L5320 |
| `handleSaveDraft` | function | L5341 |
| `tone` | variable | L5363 |
| `complexity` | variable | L5364 |
| `keywords` | variable | L5367 |
| `subdomains` | variable | L5368 |
| `audienceEl` | variable | L5370 |
| `audience` | variable | L5371 |
| `draft` | variable | L5378 |
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
| `selected` | variable | L5631 |
| `filters` | variable | L5636 |
| `supabase` | variable | L5656 |
| `keywords` | variable | L5672 |
| `searchStr` | variable | L5673 |
| `loadPopularPersonas` | function | L5704 |
| `resultsContainer` | variable | L5705 |
| `supabase` | variable | L5711 |
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
| `modal` | variable | L5902 |
| `btn` | variable | L5967 |
| `formatMemoryKey` | function | L5980 |
| `handleImportPersona` | function | L5989 |
| `supabase` | variable | L6013 |
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
| `prompts` | variable | L6299 |
| `newPrompt` | variable | L6301 |
| `deleteSavedPrompt` | function | L6319 |
| `confirmed` | variable | L6320 |
| `prompts` | variable | L6343 |
| `openPromptPreviewDialog` | function | L6359 |
| `dialog` | variable | L6360 |
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
| `diffObjects` | function | L7165 |
| `allKeys` | variable | L7166 |
| `currVal` | variable | L7172 |
| `prevVal` | variable | L7173 |
| `fullKey` | variable | L7174 |
| `currStr` | variable | L7183 |
| `prevStr` | variable | L7184 |
| `formatDiffValue` | function | L7211 |
| `str` | variable | L7216 |
| `formatFieldLabel` | function | L7225 |
| `parts` | variable | L7227 |
| `last` | variable | L7228 |
| `getNestedValue` | function | L7242 |
| `restoreVersion` | function | L7250 |
| `confirmed` | variable | L7251 |
| `restoredData` | variable | L7261 |
| `exportPersonaJSON` | function | L7289 |
| `exportData` | variable | L7300 |
| `safeName` | variable | L7319 |
| `handle` | variable | L7330 |
| `writable` | variable | L7338 |
| `ALLOWED_IMPORT_EXTENSIONS` | constant | L7389 |
| `MAX_IMPORT_FILE_SIZE` | constant | L7394 |
| `readAndSanitizeFile` | function | L7401 |
| `extension` | variable | L7404 |
| `allowedMimes` | variable | L7424 |
| `rawText` | variable | L7435 |
| `sanitizedContent` | variable | L7438 |
| `sanitizeTextContent` | function | L7465 |
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
| `importPersonaJSON` | function | L7629 |
| `sanitizeImportedData` | function | L7639 |
| `formatDate` | function | L7672 |
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
| `btn` | variable | L7937 |
| `icon` | variable | L7942 |
| `isExpanding` | variable | L7945 |
| `textarea` | variable | L7955 |
| `expanded` | variable | L7964 |
| `icon` | variable | L7968 |
| `checkRatingEligibility` | function | L7984 |
| `showRatingPrompt` | function | L8002 |
| `selectedRating` | variable | L8034 |
| `ratingEligibilityInterval` | variable | L8118 |
| `contextTab` | variable | L8119 |
| `scanContentForModeration` | function | L8146 |
| `showModerationWarning` | function | L8176 |
| `dialog` | variable | L8178 |
| `showReportDialog` | function | L8228 |
| `existingDialog` | variable | L8229 |
| `dialog` | variable | L8232 |
| `submitReport` | function | L8306 |

### `content/observer.js` (179 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `obsLog` | function | L36 |
| `extensionReloadNotificationShown` | variable | L96 |
| `refreshBtn` | variable | L184 |
| `closeBtn` | variable | L186 |
| `safeSendMessage` | function | L197 |
| `applyThemeToDocument` | function | L230 |
| `lastDetectedTheme` | variable | L243 |
| `themeObserver` | variable | L244 |
| `initThemeObservation` | function | L269 |
| `observeElement` | function | L270 |
| `SELECTORS` | constant | L316 |
| `findElement` | function | L356 |
| `selectors` | variable | L357 |
| `findChatInput` | function | L387 |
| `findSendButton` | function | L391 |
| `findInputContainer` | function | L395 |
| `fromConfig` | variable | L397 |
| `style` | variable | L407 |
| `createSettingsIcon` | function | L419 |
| `wrapper` | variable | L420 |
| `btn` | variable | L423 |
| `modelDot` | variable | L444 |
| `updateModelIndicator` | function | L451 |
| `activeModelData` | variable | L456 |
| `api` | variable | L487 |
| `createRefineToggle` | function | L507 |
| `wrapper` | variable | L508 |
| `toggle` | variable | L515 |
| `isOn` | variable | L518 |
| `updateState` | function | L527 |
| `api` | variable | L544 |
| `modalInstance` | variable | L556 |
| `createReviewModal` | function | L558 |
| `detectTheme` | function | L562 |
| `overlay` | variable | L574 |
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
| `checkConnection` | function | L642 |
| `latency` | variable | L647 |
| `typeText` | function | L657 |
| `showConnectionFeedback` | function | L669 |
| `quality` | variable | L679 |
| `labels` | variable | L680 |
| `getActiveTextarea` | function | L720 |
| `switchTab` | function | L725 |
| `generateDiffHTML` | function | L748 |
| `escape` | function | L753 |
| `updateCharCount` | function | L758 |
| `activeTextarea` | variable | L759 |
| `updateUI` | function | L775 |
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
| `updateEmptyState` | function | L819 |
| `hasContent` | variable | L822 |
| `footerButtonsDisabled` | variable | L827 |
| `checkApiKey` | function | L845 |
| `saveCurrentPairEdits` | function | L899 |
| `navigatePrevOriginal` | function | L910 |
| `pair` | variable | L913 |
| `navigateNextOriginal` | function | L920 |
| `pair` | variable | L923 |
| `navigatePrevRefined` | function | L930 |
| `targetIndex` | variable | L932 |
| `navigateNextRefined` | function | L944 |
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
| `dismissErrorBanner` | function | L1260 |
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
| `pasteToInput` | function | L1688 |
| `injectInterface` | function | L1700 |
| `sendBtn` | variable | L1701 |
| `inputEl` | variable | L1702 |
| `buttonContainer` | variable | L1707 |
| `inputContainer` | variable | L1711 |
| `settingsApi` | variable | L1717 |
| `existingWrapper` | variable | L1718 |
| `updateSettingsPosition` | function | L1731 |
| `rect` | variable | L1733 |
| `thinkingBtn` | variable | L1755 |
| `buttons` | variable | L1759 |
| `trailingActionsWrapper` | variable | L1769 |
| `toggleApi` | variable | L1771 |
| `existingToggle` | variable | L1773 |
| `settingsWrapper` | variable | L1787 |
| `inputButtonsWrapper` | variable | L1801 |
| `existingOverlay` | variable | L1817 |
| `updateVisibility` | function | L1877 |
| `cachedTabId` | variable | L1898 |
| `getTabId` | function | L1899 |
| `skipNextRefinement` | variable | L1923 |
| `triggerNativeSend` | function | L1929 |
| `inputEl` | variable | L1937 |
| `sendBtn` | variable | L1966 |
| `triggerRefinement` | function | L1987 |
| `modal` | variable | L2015 |
| `inputEl` | variable | L2114 |
| `toggleWrapper` | variable | L2115 |
| `toggleApi` | variable | L2116 |
| `splitViewActive` | variable | L2136 |
| `existingFrame` | variable | L2139 |
| `injectDebounceTimer` | variable | L2179 |
| `debouncedInject` | function | L2180 |

### `content/scraper.js` (60 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `scrapeLog` | function | L71 |
| `SCRAPER_CONFIG` | constant | L85 |
| `GEMINI_SELECTORS` | constant | L106 |
| `GeminiConversationScraper` | class | L178 |
| `GeminiConversationScraper.hasHistory` | method | L190 |
| `containers` | variable | L191 |
| `GeminiConversationScraper._getRating` | method | L200 |
| `GeminiConversationScraper.loadRatings` | method | L217 |
| `GeminiConversationScraper.scrape` | method | L235 |
| `config` | variable | L240 |
| `formatDate` | function | L249 |
| `d` | variable | L250 |
| `pad` | function | L251 |
| `containers` | variable | L258 |
| `totalBytes` | variable | L283 |
| `wasTruncated` | variable | L283 |
| `sliceOffset` | variable | L283 |
| `targetContainers` | variable | L283 |
| `titleEl` | variable | L298 |
| `pairId` | variable | L307 |
| `skippedPairCount` | variable | L310 |
| `turn` | variable | L313 |
| `pair` | variable | L317 |
| `turnIndex` | variable | L331 |
| `lastPair` | variable | L351 |
| `GeminiConversationScraper._findMessageContainers` | method | L382 |
| `allMessages` | variable | L383 |
| `userSelectors` | variable | L386 |
| `userElements` | variable | L387 |
| `found` | variable | L390 |
| `modelSelectors` | variable | L402 |
| `modelElements` | variable | L403 |
| `found` | variable | L406 |
| `position` | variable | L426 |
| `GeminiConversationScraper._extractTurns` | method | L445 |
| `totalBytes` | variable | L447 |
| `wasTruncated` | variable | L448 |
| `maxContainers` | variable | L451 |
| `targetContainers` | variable | L452 |
| `sliceOffset` | variable | L453 |
| `turn` | variable | L476 |
| `GeminiConversationScraper._extractContent` | method | L500 |
| `clone` | variable | L502 |
| `hidden` | variable | L505 |
| `preBlocks` | variable | L509 |
| `inlineCode` | variable | L515 |
| `GeminiConversationScraper._determineRole` | method | L538 |
| `GeminiConversationScraper._matchesIndicator` | method | L568 |
| `GeminiConversationScraper._formatOutput` | method | L587 |
| `roleHeader` | variable | L590 |
| `rolePrefix` | variable | L597 |
| `GeminiConversationScraper._generateSessionId` | method | L609 |
| `customScraperMethod` | function | L629 |
| `scraper` | variable | L630 |
| `getChatHistory` | function | L657 |
| `scraper` | variable | L658 |
| `getPreviousPromptsWithRatings` | function | L682 |
| `scraper` | variable | L683 |
| `prompts` | variable | L700 |
| `turnIndex` | variable | L705 |

### `options/model-manager-ui.js` (54 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `ModelManagerUI` | class | L14 |
| `ModelManagerUI.render` | method | L52 |
| `ModelManagerUI.renderModelCard` | method | L99 |
| `statusClass` | variable | L102 |
| `activeClass` | variable | L103 |
| `statusText` | variable | L104 |
| `statusIcon` | variable | L105 |
| `ModelManagerUI.renderModal` | method | L150 |
| `ModelManagerUI.setupEventListeners` | method | L236 |
| `ModelManagerUI.setupModalEvents` | method | L286 |
| `providerSelect` | variable | L288 |
| `ModelManagerUI.onProviderChange` | method | L311 |
| `link` | variable | L316 |
| `baseUrlGroup` | variable | L326 |
| `modelSelect` | variable | L334 |
| `customModelGroup` | variable | L340 |
| `ModelManagerUI.renderParameters` | method | L354 |
| `ModelManagerUI.openAddModal` | method | L378 |
| `modal` | variable | L383 |
| `providerSelect` | variable | L391 |
| `ModelManagerUI.openEditModal` | method | L401 |
| `modal` | variable | L409 |
| `providerSelect` | variable | L417 |
| `modelSelect` | variable | L422 |
| `ModelManagerUI.showModal` | method | L443 |
| `modal` | variable | L444 |
| `ModelManagerUI.closeModal` | method | L452 |
| `modal` | variable | L453 |
| `ModelManagerUI.handleTest` | method | L463 |
| `card` | variable | L464 |
| `btn` | variable | L465 |
| `originalText` | variable | L468 |
| `ModelManagerUI.handleTestFromModal` | method | L490 |
| `statusEl` | variable | L491 |
| `formData` | variable | L497 |
| `testConfig` | variable | L500 |
| `client` | variable | L509 |
| `ModelManagerUI.handleFetchModels` | method | L526 |
| `modal` | variable | L527 |
| `providerDef` | variable | L529 |
| `apiKeyInput` | variable | L530 |
| `fetchBtn` | variable | L531 |
| `modelSelect` | variable | L532 |
| `hintEl` | variable | L533 |
| `originalText` | variable | L554 |
| `ModelManagerUI.handleToggle` | method | L594 |
| `ModelManagerUI.handleActivate` | method | L630 |
| `ModelManagerUI.handleSave` | method | L645 |
| `formData` | variable | L648 |
| `ModelManagerUI.getModalFormData` | method | L679 |
| `modal` | variable | L680 |
| `providerDef` | variable | L682 |
| `customModel` | variable | L686 |
| `icons` | variable | L736 |

### `llm/llm-client.js` (45 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `DEFAULT_MODELS` | constant | L39 |
| `API_ENDPOINTS` | constant | L49 |
| `LLM_ERROR_TYPES` | constant | L69 |
| `RETRYABLE_ERRORS` | constant | L82 |
| `LLMClient.isConfigured` | method | L135 |
| `LLMClient._sanitizeApiKey` | method | L145 |
| `LLMClient._proxyFetch` | method | L163 |
| `onGeminiPage` | variable | L166 |
| `isMainWorld` | variable | L170 |
| `timeoutId` | variable | L179 |
| `onAbort` | variable | L180 |
| `cleanup` | function | L182 |
| `handler` | function | L212 |
| `fetchOptions` | variable | L241 |
| `LLMClient.configure` | method | L271 |
| `mergedOptions` | variable | L302 |
| `LLMClient._callWithRetry` | method | L319 |
| `errorType` | variable | L339 |
| `LLMClient._executeCall` | method | L364 |
| `LLMClient._classifyError` | method | L384 |
| `status` | variable | L386 |
| `LLMClient._calculateBackoff` | method | L433 |
| `LLMClient._delay` | method | L446 |
| `LLMClient._callGemini` | method | L456 |
| `startTime` | variable | L492 |
| `proxyResponse` | variable | L494 |
| `fetchDuration` | variable | L503 |
| `errorData` | variable | L510 |
| `LLMClient._callOpenAI` | method | L532 |
| `proxyResponse` | variable | L567 |
| `LLMClient._callAnthropic` | method | L594 |
| `enhancedPrompt` | variable | L598 |
| `proxyResponse` | variable | L618 |
| `LLMClient._callOpenRouter` | method | L646 |
| `enhancedPrompt` | variable | L650 |
| `proxyResponse` | variable | L669 |
| `LLMClient._fixTruncatedJSON` | method | L698 |
| `inString` | variable | L699 |
| `escape` | variable | L700 |
| `stack` | variable | L701 |
| `char` | variable | L704 |
| `open` | variable | L750 |
| `LLMClient._parseJSON` | method | L762 |
| `jsonMatch` | variable | L787 |
| `LLMClient.getAvailableModels` | method | L820 |

### `logging/logger.js` (44 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `LOG_LEVELS` | constant | L32 |
| `LOG_COLORS` | constant | L43 |
| `LOGGER_CONFIG` | constant | L55 |
| `PII_PATTERNS` | constant | L68 |
| `RingBuffer.getAll` | method | L95 |
| `RingBuffer.get_length` | accessor | L111 |
| `LogEntry._detectContext` | method | L132 |
| `LogEntry.toJSON` | method | L146 |
| `LogEntry.format` | method | L160 |
| `Logger._instance` | property | L170 |
| `Logger._hasDirectStorage` | method | L210 |
| `timerId` | variable | L220 |
| `handler` | function | L222 |
| `resId` | variable | L223 |
| `Logger._storageGet` | method | L254 |
| `storageArea` | variable | L256 |
| `Logger._storageSet` | method | L263 |
| `storageArea` | variable | L265 |
| `Logger.setLevel` | method | L277 |
| `Logger._restoreLevel` | method | L295 |
| `savedLevel` | variable | L297 |
| `Logger._log` | method | L318 |
| `tags` | variable | L322 |
| `correlationId` | variable | L322 |
| `restData` | variable | L322 |
| `sanitizedMessage` | variable | L325 |
| `Logger.timeEnd` | method | L392 |
| `Logger.startOperation` | method | L420 |
| `correlationId` | variable | L421 |
| `Logger.endOperation` | method | L442 |
| `op` | variable | L443 |
| `Logger._sanitize` | method | L467 |
| `Logger._sanitizeObject` | method | L480 |
| `Logger._consoleOutput` | method | L508 |
| `styles` | variable | L512 |
| `Logger._notifyListeners` | method | L526 |
| `Logger.getLogs` | method | L539 |
| `Logger.export` | method | L579 |
| `Logger.downloadExport` | method | L592 |
| `byLevel` | variable | L614 |
| `byComponent` | variable | L615 |
| `Logger._persist` | method | L642 |
| `Logger._restore` | method | L661 |
| `Logger._startAutoPersist` | method | L684 |

### `memory/index.js` (35 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `memLog` | function | L39 |
| `sessionMutexes` | variable | L72 |
| `analyzeSession` | function | L82 |
| `runPromise` | variable | L96 |
| `scraper` | variable | L131 |
| `scrapedData` | variable | L143 |
| `isSelectiveRebuild` | variable | L148 |
| `shouldIncrementGen` | variable | L149 |
| `newGen` | variable | L152 |
| `results` | variable | L164 |
| `enabledComponents` | variable | L177 |
| `pinnedComponents` | variable | L181 |
| `startTime` | variable | L214 |
| `unifiedResults` | variable | L215 |
| `dimensionIds` | variable | L226 |
| `isLLMConfigured` | function | L308 |
| `getCurrentSessionId` | function | L317 |
| `sendBridgeResponse` | function | L349 |
| `SmartAutoRun` | variable | L398 |
| `isConfigured` | variable | L417 |
| `scraper` | variable | L427 |
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
| `currentUrl` | variable | L592 |
| `newSessionId` | variable | L593 |
| `originalPushState` | variable | L630 |
| `originalReplaceState` | variable | L637 |

### `model/model-manager.js` (33 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `modelLog` | function | L41 |
| `LEGACY_STORAGE_KEYS` | constant | L60 |
| `ModelManager._doInit` | method | L106 |
| `ModelManager._ensureInitialized` | method | L154 |
| `cached` | variable | L185 |
| `freshData` | variable | L192 |
| `ModelManager.hasApiKey` | method | L212 |
| `ModelManager.addModel` | method | L274 |
| `ModelManager.deleteModel` | method | L310 |
| `ModelManager.enableModel` | method | L343 |
| `ModelManager.disableModel` | method | L384 |
| `ModelManager.getEnabledModels` | method | L403 |
| `ModelManager.getActiveModelId` | method | L416 |
| `ModelManager.ensureActiveModel` | method | L488 |
| `client` | variable | L530 |
| `ModelManager._validateApiKeyFormat` | method | L560 |
| `ModelManager.maskApiKey` | method | L598 |
| `suffix` | variable | L603 |
| `masked` | variable | L604 |
| `ModelManager.isMaskedKey` | method | L614 |
| `ModelManager._migrateFromLegacy` | method | L626 |
| `legacy` | variable | L628 |
| `migrated` | variable | L637 |
| `llmConfig` | variable | L658 |
| `firstEnabled` | variable | L678 |
| `ModelManager._isMainWorld` | method | L708 |
| `changes` | variable | L743 |
| `ModelManager._getFromStorage` | method | L798 |
| `ModelManager._saveToStorage` | method | L839 |
| `ModelManager._removeFromStorage` | method | L875 |
| `keyArray` | variable | L879 |
| `_modelManagerInstance` | variable | L911 |
| `getModelManager` | function | L917 |

### `supabase/supabase-client.js` (29 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `SUPABASE_URL` | constant | L23 |
| `SUPABASE_ANON_KEY` | constant | L24 |
| `sbLog` | function | L36 |
| `hasData` | variable | L39 |
| `SupabaseClient.#initPromise` | property | L60 |
| `SupabaseClient.loadSupabaseLib` | method | L127 |
| `SupabaseClient.signUp` | method | L156 |
| `SupabaseClient.signIn` | method | L179 |
| `SupabaseClient.signInAnonymously` | method | L200 |
| `SupabaseClient.signOut` | method | L218 |
| `SupabaseClient.getUser` | method | L228 |
| `SupabaseClient.isAuthenticated` | method | L236 |
| `SupabaseClient.createPersona` | method | L261 |
| `SupabaseClient.updatePersona` | method | L301 |
| `fetchError` | variable | L309 |
| `newVersion` | variable | L321 |
| `snapshot` | variable | L324 |
| `existingHistory` | variable | L338 |
| `versionHistory` | variable | L339 |
| `SupabaseClient.getMyPersonas` | method | L395 |
| `SupabaseClient.searchPersonas` | method | L427 |
| `queryBuilder` | variable | L430 |
| `limit` | variable | L452 |
| `offset` | variable | L453 |
| `SupabaseClient.incrementImportCount` | method | L496 |
| `SupabaseClient.hasRatedPersona` | method | L550 |
| `SupabaseClient.createSavedPrompt` | method | L577 |
| `SupabaseClient.getMySavedPrompts` | method | L607 |
| `SupabaseClient.deleteSavedPrompt` | method | L634 |

### `build.js` (25 missing)

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

### `rating/rating-manager.js` (23 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `ratingLog` | function | L52 |
| `logFn` | variable | L56 |
| `RatingManager.hasDirectStorageAccess` | method | L148 |
| `ratingCount` | variable | L215 |
| `RatingManager.backupToStorage` | method | L266 |
| `backupKey` | variable | L273 |
| `RatingManager.restoreFromStorage` | method | L305 |
| `backupKey` | variable | L312 |
| `backup` | variable | L314 |
| `ratingCount` | variable | L320 |
| `backupAge` | variable | L321 |
| `ageMinutes` | variable | L322 |
| `RatingManager.backupAllRatings` | method | L348 |
| `allBackups` | variable | L355 |
| `RatingManager.removeRating` | method | L464 |
| `RatingManager.getRatingsArray` | method | L517 |
| `ratings` | variable | L521 |
| `match` | variable | L526 |
| `RatingManager.hasRating` | method | L555 |
| `RatingManager.getRatedCount` | method | L567 |
| `RatingManager.clearAll` | method | L584 |
| `_currentRatingManager` | variable | L606 |
| `getCurrentRatingManager` | function | L625 |

### `rating/rating-injector.js` (22 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `RATING_SELECTORS` | constant | L52 |
| `RatingInjector` | variable | L118 |
| `responses` | variable | L202 |
| `actions` | variable | L223 |
| `responses` | variable | L271 |
| `currentRating` | variable | L304 |
| `ratingUI` | variable | L307 |
| `inserted` | variable | L312 |
| `actionsDiv` | variable | L316 |
| `textSelectors` | variable | L330 |
| `textEl` | variable | L341 |
| `turn` | variable | L388 |
| `allResponses` | variable | L392 |
| `allTurns` | variable | L403 |
| `chatHistory` | variable | L426 |
| `isModelResponse` | variable | L475 |
| `turnIndex` | variable | L484 |
| `childResponses` | variable | L496 |
| `turnIndex` | variable | L499 |
| `ratingContainers` | variable | L530 |
| `turnIndex` | variable | L533 |
| `INIT_DELAY_MS` | constant | L568 |

### `memory/analyzers/unified-analyzer.js` (21 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `enabledComponents` | variable | L211 |
| `dimensionCount` | variable | L212 |
| `startTime` | variable | L215 |
| `schema` | variable | L224 |
| `rawResult` | variable | L227 |
| `obj` | variable | L255 |
| `unwrappers` | variable | L270 |
| `normalizedResult` | variable | L279 |
| `keyAliases` | variable | L288 |
| `lowerAlias` | variable | L301 |
| `primaryText` | variable | L314 |
| `sectionRegex` | variable | L320 |
| `match` | variable | L321 |
| `rawHeading` | variable | L323 |
| `sectionContent` | variable | L324 |
| `expectedKeys` | variable | L340 |
| `hasAnyValidDimension` | variable | L351 |
| `textLines` | variable | L365 |
| `migrated` | variable | L381 |
| `defaultEmpty` | variable | L389 |
| `empty` | variable | L410 |

### `extractor/extractor.js` (17 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `extLog` | function | L34 |
| `hasData` | variable | L37 |
| `EXTRACTION_PROMPT` | constant | L81 |
| `PersonaExtractor.loadDrafts` | method | L234 |
| `PersonaExtractor.saveDrafts` | method | L247 |
| `PersonaExtractor.getModelConfig` | method | L313 |
| `PersonaExtractor.callLLM` | method | L331 |
| `match` | variable | L371 |
| `PersonaExtractor.generateDraftId` | method | L397 |
| `PersonaExtractor.saveCurrentDraft` | method | L410 |
| `PersonaExtractor.updateDraft` | method | L433 |
| `index` | variable | L434 |
| `PersonaExtractor.getCurrentDraft` | method | L471 |
| `PersonaExtractor.publishDraft` | method | L485 |
| `draft` | variable | L486 |
| `supabase` | variable | L494 |
| `PersonaExtractor.importToMemoryLayer` | method | L543 |

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

### `theme/theme-controller.js` (15 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `ThemeController.#subscribers` | property | L42 |
| `ThemeController.#resolvedTheme` | property | L45 |
| `ThemeController.#systemMediaQuery` | property | L48 |
| `ThemeController.#mediaQueryListener` | property | L95 |
| `ThemeController.cycleMode` | method | L166 |
| `modes` | variable | L168 |
| `currentIndex` | variable | L169 |
| `nextIndex` | variable | L170 |
| `ThemeController.getIcon` | method | L188 |
| `index` | variable | L201 |
| `ThemeController.#applyMode` | method | L215 |
| `ThemeController.#getSystemPreference` | method | L240 |
| `ThemeController.#notifySubscribers` | method | L251 |
| `ThemeController.#updateToggleIcons` | method | L266 |
| `icon` | variable | L267 |

### `llm/llm-config.js` (12 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `LLMConfigManager` | class | L6 |
| `LLMConfigManager._getModelManager` | method | L11 |
| `manager` | variable | L23 |
| `LLMConfigManager.getApiKey` | method | L43 |
| `manager` | variable | L44 |
| `LLMConfigManager.getClient` | method | L53 |
| `manager` | variable | L54 |
| `LLMConfigManager.isConfigured` | method | L83 |
| `manager` | variable | L84 |
| `LLMConfigManager.getActiveModelConfig` | method | L92 |
| `manager` | variable | L93 |
| `llmConfigManager` | variable | L102 |

### `rating/rating-ui.js` (11 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `createRatingUI` | function | L72 |
| `starsContainer` | variable | L87 |
| `star` | variable | L92 |
| `currentVal` | variable | L142 |
| `highlightStars` | function | L168 |
| `stars` | variable | L169 |
| `setStarsRating` | function | L199 |
| `stars` | variable | L200 |
| `parent` | variable | L219 |
| `updateRatingUI` | function | L243 |
| `starsContainer` | variable | L244 |

### `memory/context-assembler.js` (8 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `ctxLog` | function | L15 |
| `domainSection` | variable | L435 |
| `terms` | variable | L439 |
| `frameworkSection` | variable | L468 |
| `steps` | variable | L473 |
| `reqs` | variable | L486 |
| `rules` | variable | L490 |
| `formatSection` | variable | L507 |

### `memory/memory-controller.js` (5 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `memCtrlLog` | function | L69 |
| `historyLength` | variable | L339 |
| `low` | variable | L715 |
| `high` | variable | L715 |
| `mid` | variable | L717 |

### `options/index.js` (4 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `themeToggleBtn` | variable | L53 |
| `themeToggleIcon` | variable | L54 |
| `updateThemeIcon` | function | L57 |
| `modelManagerUI` | variable | L83 |

### `sidepanel/modules/dimension-view.js` (4 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `V4_DIMENSION_KEYS` | constant | L6 |
| `formatDimensionText` | function | L22 |
| `hard` | variable | L34 |
| `soft` | variable | L35 |

### `storage/storage-repository.js` (4 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `StoragePartition` | class | L11 |
| `StoragePartition.get__area` | accessor | L19 |
| `StoragePartition.getMultiple` | method | L51 |
| `StoragePartition.setMultiple` | method | L89 |

### `background/index.js` (3 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `sentCount` | variable | L300 |
| `skippedCount` | variable | L301 |
| `keepAliveInterval` | variable | L347 |

### `memory/analyzer-registry.js` (3 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `arLog` | function | L57 |
| `logFn` | variable | L61 |
| `existed` | variable | L170 |

### `model/model-registry.js` (3 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `chatModels` | variable | L414 |
| `fetchOpenRouterModels` | function | L434 |
| `fetchModelsForProvider` | function | L478 |

### `sidepanel/modules/cloud-sync.js` (2 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `isCloudSyncAvailable` | function | L10 |
| `mapCloudPersonaToLocal` | function | L21 |

### `sidepanel/modules/persona-view.js` (2 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `formatPersonaText` | function | L11 |
| `isValidPersonaData` | function | L26 |

### `content/templates.js` (1 missing)

| Symbol Name | Type | Line |
|:---|:---|:---|
| `getReviewModalTemplate` | function | L96 |

---

## Detailed PORTED Symbols (Sample)

Showing cross-reference for files with ported symbols.

### `sidepanel/sidepanel.js` (268 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `entry` | variable | L26 | `src/core/logging/logger.ts` | `entry` |
| `showToast` | function | L38 | `entrypoints/options/App.tsx` | `showToast` |
| `container` | variable | L93 | `src/content/split-view.ts` | `container` |
| `container` | variable | L212 | `src/content/split-view.ts` | `container` |
| `container` | variable | L314 | `src/content/split-view.ts` | `container` |
| `input` | variable | L394 | `src/adapters/chatbots/chatgpt.adapter.ts` | `input` |
| `container` | variable | L407 | `src/content/split-view.ts` | `container` |
| `items` | variable | L473 | `src/core/memory/component-schemas.ts` | `SchemaProperty.items` |
| `isOpen` | variable | L482 | `src/core/orchestration/sidepanel-manager.ts` | `isOpen` |
| `value` | variable | L495 | `entrypoints/sidepanel/components/ExpandModal.tsx` | `ExpandModalProps.value` |
| `parsed` | variable | L736 | `src/core/extractor/extractor.ts` | `parsed` |
| `cleaned` | variable | L738 | `src/core/extractor/resilient-parser.ts` | `cleaned` |
| `text` | variable | L762 | `src/core/memory/analyzers/recent-focus.ts` | `text` |
| `value` | variable | L911 | `entrypoints/sidepanel/components/ExpandModal.tsx` | `ExpandModalProps.value` |
| `memoryData` | variable | L934 | `src/core/orchestration/api-proxy.ts` | `memoryData` |
| `disabledFacts` | variable | L935 | `src/core/orchestration/api-proxy.ts` | `disabledFacts` |
| `tab` | variable | L1043 | `src/core/orchestration/memory-orchestrator.ts` | `tab` |
| `enabled` | variable | L1115 | `src/core/model/model-manager.ts` | `enabled` |
| `extractSessionId` | function | L1248 | `src/core/memory/memory-controller.ts` | `MemoryController.extractSessionId` |
| `urlObj` | variable | L1250 | `src/core/memory/memory-controller.ts` | `urlObj` |
| *(+ 248 more)* | | | | |

### `background/services/memory-orchestrator.js` (85 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `getCurrentTabSessionId` | function | L8 | `src/core/orchestration/memory-orchestrator.ts` | `getCurrentTabSessionId` |
| `tab` | variable | L9 | `src/core/orchestration/memory-orchestrator.ts` | `tab` |
| `url` | variable | L26 | `src/content/split-view.ts` | `url` |
| `pathParts` | variable | L27 | `src/core/memory/memory-controller.ts` | `pathParts` |
| `getSessionMemory` | function | L42 | `src/core/orchestration/memory-orchestrator.ts` | `getSessionMemory` |
| `storageKey` | variable | L45 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L46 | `src/content/observer.ts` | `result` |
| `updateMemoryComponent` | function | L53 | `src/core/orchestration/memory-orchestrator.ts` | `updateMemoryComponent` |
| `storageKey` | variable | L56 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L57 | `src/content/observer.ts` | `result` |
| `memory` | variable | L58 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| `pinPersona` | function | L80 | `src/core/memory/memory-controller.ts` | `MemoryController.pinPersona` |
| `storageKey` | variable | L83 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L84 | `src/content/observer.ts` | `result` |
| `memory` | variable | L85 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| `personaComponent` | variable | L98 | `src/core/memory/memory-controller.ts` | `personaComponent` |
| `unpinPersona` | function | L115 | `src/core/memory/memory-controller.ts` | `MemoryController.unpinPersona` |
| `storageKey` | variable | L118 | `src/core/memory/memory-controller.ts` | `MemoryController.storageKey` |
| `result` | variable | L119 | `src/content/observer.ts` | `result` |
| `memory` | variable | L120 | `src/core/memory/context-assembler.ts` | `ContextAssembler.memory` |
| *(+ 65 more)* | | | | |

### `memory/memory-controller.js` (74 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `MEMORY_SCHEMA_VERSION` | constant | L43 | `src/core/memory/memory-controller.ts` | `MEMORY_SCHEMA_VERSION` |
| `DIMENSION_NAMES` | constant | L48 | `src/core/memory/memory-controller.ts` | `DIMENSION_NAMES` |
| `SESSION_KEY_PREFIX` | constant | L55 | `src/core/memory/memory-controller.ts` | `SESSION_KEY_PREFIX` |
| `MEMORY_SIZE_LIMITS` | constant | L61 | `src/core/memory/memory-controller.ts` | `MEMORY_SIZE_LIMITS` |
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
| `MemoryController.getCurrentGeneration` | method | L398 | `src/core/memory/memory-controller.ts` | `MemoryController.getCurrentGeneration` |
| *(+ 54 more)* | | | | |

### `background/index.js` (67 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `geminiApiKey` | variable | L53 | `entrypoints/background.ts` | `geminiApiKey` |
| `openOptions` | variable | L64 | `src/core/orchestration/sidepanel-manager.ts` | `openOptions` |
| `key` | variable | L80 | `src/core/crypto/crypto-service.ts` | `key` |
| `openOptions` | variable | L100 | `src/core/orchestration/sidepanel-manager.ts` | `openOptions` |
| `result` | variable | L116 | `src/content/observer.ts` | `result` |
| `hasEnabledModelWithKey` | variable | L122 | `entrypoints/background.ts` | `hasEnabledModelWithKey` |
| `jsonData` | variable | L147 | `entrypoints/background.ts` | `jsonData` |
| `filename` | variable | L147 | `entrypoints/background.ts` | `filename` |
| `filenameListener` | function | L152 | `entrypoints/background.ts` | `filenameListener` |
| `base64Data` | variable | L158 | `entrypoints/background.ts` | `base64Data` |
| `dataUrl` | variable | L159 | `entrypoints/background.ts` | `dataUrl` |
| `tabId` | variable | L204 | `src/core/orchestration/sidepanel-manager.ts` | `tabId` |
| `disabledKey` | variable | L280 | `src/core/orchestration/api-proxy.ts` | `disabledKey` |
| `tabs` | variable | L298 | `entrypoints/background.ts` | `tabs` |
| `urlMatch` | variable | L307 | `entrypoints/background.ts` | `urlMatch` |
| `sessionId` | variable | L308 | `src/core/logging/logger.ts` | `Logger.sessionId` |
| `sessionKey` | variable | L316 | `entrypoints/background.ts` | `sessionKey` |
| `stored` | variable | L317 | `src/core/model/model-manager.ts` | `stored` |
| `ALLOWED_PROXY_HOSTS` | constant | L349 | `entrypoints/background.ts` | `ALLOWED_PROXY_HOSTS` |
| `targetUrl` | variable | L356 | `entrypoints/background.ts` | `targetUrl` |
| *(+ 47 more)* | | | | |

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
| `delay` | variable | L274 | `src/core/llm/llm-client.ts` | `delay` |
| `timer` | variable | L280 | `src/core/orchestration/api-proxy.ts` | `timer` |
| *(+ 45 more)* | | | | |

### `memory/context-assembler.js` (65 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
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
| `staleComponents` | variable | L175 | `src/core/memory/context-assembler.ts` | `staleComponents` |
| *(+ 45 more)* | | | | |

### `logging/logger.js` (48 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `RingBuffer` | class | L79 | `src/core/logging/logger.ts` | `RingBuffer` |
| `RingBuffer.constructor` | method | L80 | `src/core/logging/logger.ts` | `RingBuffer.constructor` |
| `RingBuffer.push` | method | L86 | `src/core/logging/logger.ts` | `RingBuffer.push` |
| `RingBuffer.clear` | method | L106 | `src/core/logging/logger.ts` | `RingBuffer.clear` |
| `LogEntry` | class | L119 | `src/core/logging/logger.ts` | `LogEntry` |
| `LogEntry.constructor` | method | L120 | `src/adapters/storage/supabase-client.ts` | `SupabaseClientAdapter.constructor` |
| `time` | variable | L161 | `src/core/logging/logger.ts` | `Logger.time` |
| `Logger` | class | L169 | `src/core/logging/logger.ts` | `Logger` |
| `Logger.getInstance` | method | L172 | `src/core/logging/logger.ts` | `Logger.getInstance` |
| `Logger.constructor` | method | L179 | `src/core/logging/logger.ts` | `Logger.constructor` |
| `Logger._makeBridgeRequest` | method | L217 | `src/core/memory/memory-controller.ts` | `MemoryController._makeBridgeRequest` |
| `Logger.addListener` | method | L310 | `src/core/logging/logger.ts` | `Logger.addListener` |
| `Logger.trace` | method | L346 | `src/core/logging/logger.ts` | `Logger.trace` |
| `Logger.debug` | method | L350 | `src/core/logging/logger.ts` | `Logger.debug` |
| `Logger.info` | method | L354 | `src/core/logging/logger.ts` | `Logger.info` |
| `Logger.warn` | method | L358 | `src/core/logging/logger.ts` | `Logger.warn` |
| `Logger.error` | method | L362 | `src/core/logging/logger.ts` | `Logger.error` |
| `Logger.time` | method | L382 | `src/core/logging/logger.ts` | `Logger.time` |
| `Logger.getStats` | method | L612 | `src/core/rating/rating-manager.ts` | `RatingManager.getStats` |
| `Logger.clear` | method | L634 | `src/core/logging/logger.ts` | `Logger.clear` |
| *(+ 28 more)* | | | | |

### `content/observer.js` (47 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `detectPageTheme` | function | L54 | `src/content/theme-detector.ts` | `detectPageTheme` |
| `body` | variable | L55 | `src/content/theme-detector.ts` | `body` |
| `bodyClasses` | variable | L59 | `src/content/theme-detector.ts` | `bodyClasses` |
| `bgColor` | variable | L64 | `src/content/theme-detector.ts` | `bgColor` |
| `rgb` | variable | L65 | `src/content/theme-detector.ts` | `rgb` |
| `brightness` | variable | L67 | `src/content/theme-detector.ts` | `brightness` |
| `theme` | variable | L76 | `src/content/observer.ts` | `theme` |
| `isExtensionContextValid` | function | L87 | `src/content/context-invalidator.ts` | `isExtensionContextValid` |
| `showExtensionReloadNotification` | function | L102 | `src/content/context-invalidator.ts` | `showExtensionReloadNotification` |
| `toast` | variable | L130 | `src/content/context-invalidator.ts` | `toast` |
| `currentTheme` | variable | L251 | `src/content/theme-detector.ts` | `currentTheme` |
| `pageTheme` | variable | L292 | `src/content/theme-detector.ts` | `PageTheme` |
| `el` | variable | L365 | `src/adapters/chatbots/deepseek.adapter.ts` | `el` |
| `input` | variable | L401 | `src/adapters/chatbots/chatgpt.adapter.ts` | `input` |
| `current` | variable | L404 | `src/adapters/chatbots/claude.adapter.ts` | `current` |
| `result` | variable | L455 | `src/content/observer.ts` | `result` |
| `activeModelId` | variable | L457 | `src/core/orchestration/api-proxy.ts` | `activeModelId` |
| `models` | variable | L458 | `src/core/model/model-registry.ts` | `models` |
| `activeModel` | variable | L461 | `entrypoints/background.ts` | `activeModel` |
| `label` | variable | L511 | `src/core/model/model-registry.ts` | `ModelParameterDef.label` |
| *(+ 27 more)* | | | | |

### `llm/llm-client.js` (46 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `LLM_PROVIDERS` | constant | L29 | `src/core/llm/llm-client.ts` | `LLM_PROVIDERS` |
| `RETRY_CONFIG` | constant | L59 | `src/core/llm/llm-client.ts` | `RETRY_CONFIG` |
| `LLMClient` | class | L90 | `src/core/llm/llm-client.ts` | `LLMClient` |
| `LLMClient.constructor` | method | L99 | `src/core/llm/llm-client.ts` | `LLMClient.constructor` |
| `LLMClient.call` | method | L289 | `src/core/llm/llm-client.ts` | `LLMClient.call` |
| `sanitized` | variable | L148 | `src/core/memory/memory-controller.ts` | `sanitized` |
| `requestId` | variable | L178 | `src/core/memory/memory-controller.ts` | `requestId` |
| `response` | variable | L246 | `src/core/extractor/extractor.ts` | `response` |
| `contentType` | variable | L247 | `entrypoints/background.ts` | `contentType` |
| `data` | variable | L248 | `src/core/llm/llm-client.ts` | `data` |
| `error` | variable | L291 | `src/core/memory/memory-controller.ts` | `error` |
| `lastError` | variable | L320 | `src/core/llm/llm-client.ts` | `lastError` |
| `delay` | variable | L326 | `src/core/llm/llm-client.ts` | `delay` |
| `result` | variable | L331 | `src/content/observer.ts` | `result` |
| `provider` | variable | L365 | `src/core/llm/llm-client.ts` | `LLMClient.provider` |
| `message` | variable | L385 | `src/core/logging/logger.ts` | `LogEntry.message` |
| `delay` | variable | L434 | `src/core/llm/llm-client.ts` | `delay` |
| `jitter` | variable | L439 | `src/core/orchestration/api-proxy.ts` | `jitter` |
| `url` | variable | L461 | `src/content/split-view.ts` | `url` |
| `body` | variable | L466 | `src/content/theme-detector.ts` | `body` |
| *(+ 26 more)* | | | | |

### `model/model-manager.js` (41 ported)

| Legacy Symbol | Type | L# | WXT Target File | WXT Symbol |
|:---|:---|:---|:---|:---|
| `MODEL_STORAGE_KEYS` | constant | L52 | `src/core/model/model-manager.ts` | `MODEL_STORAGE_KEYS` |
| `ModelManager` | class | L70 | `src/core/model/model-manager.ts` | `ModelManager` |
| `ModelManager.constructor` | method | L71 | `src/adapters/storage/supabase-client.ts` | `SupabaseClientAdapter.constructor` |
| `ModelManager.init` | method | L86 | `src/core/model/model-manager.ts` | `ModelManager.init` |
| `ModelManager.getAllModels` | method | L168 | `src/core/model/model-manager.ts` | `ModelManager.getAllModels` |
| `ModelManager.getModel` | method | L182 | `src/core/model/model-manager.ts` | `ModelManager.getModel` |
| `ModelManager.updateModel` | method | L224 | `src/core/model/model-manager.ts` | `ModelManager.updateModel` |
| `ModelManager.getActiveModel` | method | L425 | `src/core/model/model-manager.ts` | `ModelManager.getActiveModel` |
| `ModelManager.setActiveModel` | method | L455 | `src/core/model/model-manager.ts` | `ModelManager.setActiveModel` |
| `ModelManager.testConnection` | method | L517 | `src/core/model/model-manager.ts` | `ModelManager.testConnection` |
| `ModelManager._bridgeRequestId` | property | L717 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeRequestId` |
| `ModelManager._bridgeRequests` | property | L718 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeRequests` |
| `ModelManager._bridgeInitialized` | property | L719 | `src/core/memory/memory-controller.ts` | `MemoryController._bridgeInitialized` |
| `ModelManager._initBridgeListener` | method | L724 | `src/core/memory/memory-controller.ts` | `MemoryController._initBridgeListener` |
| `ModelManager._makeBridgeRequest` | method | L766 | `src/core/memory/memory-controller.ts` | `MemoryController._makeBridgeRequest` |
| `stored` | variable | L114 | `src/core/model/model-manager.ts` | `stored` |
| `merged` | variable | L132 | `src/core/model/model-manager.ts` | `merged` |
| `model` | variable | L214 | `src/core/llm/llm-client.ts` | `LLMClient.model` |
| `id` | variable | L278 | `src/adapters/storage/supabase-client.ts` | `id` |
| `activeId` | variable | L325 | `src/core/model/model-manager.ts` | `activeId` |
| *(+ 21 more)* | | | | |

---

## NEW_IN_WXT Symbols (TypeScript-Only, No Legacy Origin)

These symbols exist only in the WXT codebase — they are new TypeScript types, interfaces, enums, or components with no legacy JS counterpart.

| WXT File | Symbol | Type | Line |
|:---|:---|:---|:---|
| `src/core/logging/logger.ts` | `LogLevel` | enum | L8 |
| `src/core/logging/logger.ts` | `LogLevel.TRACE` | enum_member | L9 |
| `src/core/logging/logger.ts` | `LogLevel.DEBUG` | enum_member | L10 |
| `src/core/logging/logger.ts` | `LogLevel.INFO` | enum_member | L11 |
| `src/core/logging/logger.ts` | `LogLevel.WARN` | enum_member | L12 |
| `src/core/logging/logger.ts` | `LogLevel.ERROR` | enum_member | L13 |
| `src/core/logging/logger.ts` | `LogLevel.NONE` | enum_member | L14 |
| `src/core/logging/logger.ts` | `LogEntry.id` | interface_prop | L18 |
| `src/core/logging/logger.ts` | `LogEntry.isoTime` | interface_prop | L20 |
| `src/core/logging/logger.ts` | `LogEntry.levelValue` | interface_prop | L22 |
| `src/core/logging/logger.ts` | `LogEntry.component` | interface_prop | L23 |
| `src/core/logging/logger.ts` | `LogEntry.data` | interface_prop | L25 |
| `src/core/logging/logger.ts` | `LogEntry.error` | interface_prop | L26 |
| `src/core/logging/logger.ts` | `LogEntry.sessionId` | interface_prop | L27 |
| `src/core/logging/logger.ts` | `LogEntry.durationMs` | interface_prop | L28 |
| `src/core/logging/logger.ts` | `LoggerOptions` | interface | L31 |
| `src/core/logging/logger.ts` | `LoggerOptions.minLevel` | interface_prop | L32 |
| `src/core/logging/logger.ts` | `LoggerOptions.maxEntries` | interface_prop | L33 |
| `src/core/logging/logger.ts` | `LoggerOptions.enableConsole` | interface_prop | L34 |
| `src/core/logging/logger.ts` | `LoggerOptions.component` | interface_prop | L35 |
| `src/core/logging/logger.ts` | `RingBuffer.buffer` | property | L39 |
| `src/core/logging/logger.ts` | `RingBuffer.head` | property | L40 |
| `src/core/logging/logger.ts` | `RingBuffer.tail` | property | L41 |
| `src/core/logging/logger.ts` | `RingBuffer.capacity` | property | L43 |
| `src/core/logging/logger.ts` | `RingBuffer.toArray` | method | L60 |
| `src/core/logging/logger.ts` | `idx` | variable | L63 |
| `src/core/logging/logger.ts` | `RingBuffer.size` | method | L77 |
| `src/core/logging/logger.ts` | `Logger.ringBuffer` | property | L84 |
| `src/core/logging/logger.ts` | `Logger.enableConsole` | property | L86 |
| `src/core/logging/logger.ts` | `Logger.defaultComponent` | property | L87 |
| `src/core/logging/logger.ts` | `Logger.listeners` | property | L89 |
| `src/core/logging/logger.ts` | `Logger.setSessionId` | method | L105 |
| `src/core/logging/logger.ts` | `Logger.getSessionId` | method | L109 |
| `src/core/logging/logger.ts` | `Logger.setMinLevel` | method | L113 |
| `src/core/logging/logger.ts` | `Logger.getMinLevel` | method | L117 |
| `src/core/logging/logger.ts` | `Logger.log` | method | L128 |
| `src/core/logging/logger.ts` | `levelKey` | variable | L137 |
| `src/core/logging/logger.ts` | `errObj` | variable | L186 |
| `src/core/logging/logger.ts` | `Logger.getEntries` | method | L199 |
| `src/core/logging/logger.ts` | `q` | variable | L210 |
| `src/core/logging/logger.ts` | `Logger.exportJson` | method | L220 |
| `src/core/logging/logger.ts` | `Logger.exportCsv` | method | L224 |
| `src/core/logging/logger.ts` | `rows` | variable | L229 |
| `src/core/logging/logger.ts` | `msg` | variable | L230 |
| `src/core/logging/logger.ts` | `Logger.notifyListeners` | method | L236 |
| `src/core/logging/logger.ts` | `Logger.writeToConsole` | method | L246 |
| `src/core/logging/logger.ts` | `args` | variable | L248 |
| `src/core/logging/logger.ts` | `logger` | variable | L270 |
| `src/core/llm/llm-client.ts` | `LLMErrorType` | enum | L24 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.RATE_LIMIT` | enum_member | L25 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.QUOTA_EXCEEDED` | enum_member | L26 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.NETWORK` | enum_member | L27 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.TOKEN_LIMIT` | enum_member | L28 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.AUTH` | enum_member | L29 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.MALFORMED_RESPONSE` | enum_member | L30 |
| `src/core/llm/llm-client.ts` | `LLMErrorType.UNKNOWN` | enum_member | L31 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig` | interface | L34 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.provider` | interface_prop | L35 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.apiKey` | interface_prop | L36 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.model` | interface_prop | L37 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.temperature` | interface_prop | L38 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.maxTokens` | interface_prop | L39 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.json` | interface_prop | L40 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.systemPrompt` | interface_prop | L41 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.baseURL` | interface_prop | L42 |
| `src/core/llm/llm-client.ts` | `LLMCallConfig.timeoutMs` | interface_prop | L43 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload` | interface | L46 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.text` | interface_prop | L47 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.json` | interface_prop | L48 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.usage` | interface_prop | L49 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.durationMs` | interface_prop | L54 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.model` | interface_prop | L55 |
| `src/core/llm/llm-client.ts` | `LLMResponsePayload.provider` | interface_prop | L56 |
| `src/core/llm/llm-client.ts` | `LLMClient.temperature` | property | L63 |
| `src/core/llm/llm-client.ts` | `LLMClient.maxTokens` | property | L64 |
| `src/core/llm/llm-client.ts` | `LLMClient.baseURL` | property | L65 |
| `src/core/llm/llm-client.ts` | `resultText` | variable | L86 |
| `src/core/llm/llm-client.ts` | `durationMs` | variable | L95 |
| `src/core/llm/llm-client.ts` | `parsedJson` | variable | L96 |
| `src/core/llm/llm-client.ts` | `errType` | variable | L114 |
| `src/core/llm/llm-client.ts` | `LLMClient.callGemini` | method | L129 |
| `src/core/llm/llm-client.ts` | `LLMClient.callAnthropic` | method | L164 |
| `src/core/llm/llm-client.ts` | `LLMClient.callOpenAICompatible` | method | L197 |
| `src/core/llm/llm-client.ts` | `baseURL` | variable | L203 |
| `src/core/llm/llm-client.ts` | `LLMClient.classifyError` | method | L244 |
| `src/core/llm/llm-client.ts` | `msg` | variable | L245 |
| `src/core/model/model-registry.ts` | `ModelParameterDef` | interface | L6 |
| `src/core/model/model-registry.ts` | `ModelParameterDef.name` | interface_prop | L7 |
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
| `src/core/storage/repository.ts` | `IStorageBackend` | interface | L10 |
| `src/core/storage/repository.ts` | `IStorageBackend.get` | interface_method | L11 |
| `src/core/storage/repository.ts` | `IStorageBackend.set` | interface_method | L12 |
| `src/core/storage/repository.ts` | `IStorageBackend.remove` | interface_method | L13 |
| `src/core/storage/repository.ts` | `IStorageBackend.clear` | interface_method | L14 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend` | class | L20 |
| `src/core/storage/repository.ts` | `InMemoryStorageBackend.store` | property | L21 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend` | class | L48 |
| `src/core/storage/repository.ts` | `ExtensionStorageBackend.get_area` | accessor | L49 |
| `src/core/storage/repository.ts` | `StorageRepository.getPersonas` | method | L108 |
| `src/core/storage/repository.ts` | `personas` | variable | L113 |
| `src/core/storage/repository.ts` | `StorageRepository.savePersona` | method | L117 |
| `src/core/storage/repository.ts` | `personas` | variable | L118 |
| `src/core/storage/repository.ts` | `personas` | variable | L124 |
| `src/core/storage/repository.ts` | `StorageRepository.getActivePersonaId` | method | L130 |
| `src/core/storage/repository.ts` | `StorageRepository.setActivePersonaId` | method | L134 |
| `src/core/storage/repository.ts` | `StorageRepository.saveDraft` | method | L143 |
| `src/core/storage/repository.ts` | `existingIndex` | variable | L145 |
| `src/core/storage/repository.ts` | `StorageRepository.getSettings` | method | L161 |
| `src/core/storage/repository.ts` | `StorageRepository.updateSettings` | method | L165 |
| `src/core/storage/repository.ts` | `updated` | variable | L167 |
| `src/core/storage/repository.ts` | `StorageRepository.getSyncQueue` | method | L173 |
| `src/core/storage/repository.ts` | `StorageRepository.enqueueSyncAction` | method | L177 |
| `src/core/storage/repository.ts` | `queue` | variable | L178 |
| `src/core/storage/repository.ts` | `StorageRepository.clearSyncQueue` | method | L183 |
| `src/lib/storage/items.ts` | `PersonaDraft` | interface | L3 |
| `src/lib/storage/items.ts` | `PersonaDraft.id` | interface_prop | L4 |
| `src/lib/storage/items.ts` | `PersonaDraft.source_prompt` | interface_prop | L5 |
| `src/lib/storage/items.ts` | `PersonaDraft.persona` | interface_prop | L6 |
| `src/lib/storage/items.ts` | `PersonaDraft.provider` | interface_prop | L7 |
| `src/lib/storage/items.ts` | `PersonaDraft.llm_model` | interface_prop | L8 |
| `src/lib/storage/items.ts` | `PersonaDraft.created_at` | interface_prop | L9 |
| `src/lib/storage/items.ts` | `PersonaDraft.is_public` | interface_prop | L10 |
| `src/lib/storage/items.ts` | `UserSettings` | interface | L13 |
| `src/lib/storage/items.ts` | `UserSettings.theme` | interface_prop | L14 |
| `src/lib/storage/items.ts` | `UserSettings.activeModelProvider` | interface_prop | L15 |
| `src/lib/storage/items.ts` | `UserSettings.activeModelName` | interface_prop | L16 |
| `src/lib/storage/items.ts` | `UserSettings.autoRefineOnEnter` | interface_prop | L17 |
| `src/lib/storage/items.ts` | `UserSettings.cloudSyncEnabled` | interface_prop | L18 |
| `src/lib/storage/items.ts` | `RatingRecord` | interface | L21 |
| `src/lib/storage/items.ts` | `RatingRecord.id` | interface_prop | L22 |
| `src/lib/storage/items.ts` | `RatingRecord.rating` | interface_prop | L23 |
| `src/lib/storage/items.ts` | `RatingRecord.feedback` | interface_prop | L24 |
| `src/lib/storage/items.ts` | `RatingRecord.personaId` | interface_prop | L25 |
| `src/lib/storage/items.ts` | `SyncAction` | interface | L29 |
| `src/lib/storage/items.ts` | `SyncAction.id` | interface_prop | L30 |
| `src/lib/storage/items.ts` | `SyncAction.entity` | interface_prop | L32 |
| `src/lib/storage/items.ts` | `DEFAULT_USER_SETTINGS` | constant | L37 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PromptTemplate` | interface | L5 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PromptTemplate.id` | interface_prop | L6 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PromptTemplate.content` | interface_prop | L8 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PromptTemplate.category` | interface_prop | L9 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps` | interface | L12 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.personas` | interface_prop | L13 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.activeId` | interface_prop | L14 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onSelectActive` | interface_prop | L15 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onSavePersona` | interface_prop | L16 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaViewProps.onDeletePersona` | interface_prop | L17 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `PersonaView` | function | L20 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `filteredList` | variable | L44 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `matchesSearch` | variable | L46 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `matchesDomain` | variable | L47 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleCreate` | function | L51 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `newId` | variable | L53 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `newPersona` | variable | L54 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleImportJson` | function | L68 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `file` | variable | L69 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `reader` | variable | L71 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleExportJson` | function | L87 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `p` | variable | L88 |
| `entrypoints/sidepanel/components/PersonaView.tsx` | `handleLoadStarterPresets` | function | L99 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement` | interface | L10 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement.systemPrompt` | interface_prop | L11 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement.userPrompt` | interface_prop | L12 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement.assembledAt` | interface_prop | L13 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement.activeDimensions` | interface_prop | L14 |
| `src/core/memory/context-assembler.ts` | `AssembledRefinement.tokenEstimate` | interface_prop | L15 |
| `src/core/memory/context-assembler.ts` | `UnifiedContext` | interface | L18 |
| `src/core/memory/context-assembler.ts` | `UnifiedContext.sessionId` | interface_prop | L19 |
| `src/core/memory/context-assembler.ts` | `UnifiedContext.assembledAt` | interface_prop | L20 |
| *(truncated — 329 more NEW_IN_WXT symbols)* | | | |

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
