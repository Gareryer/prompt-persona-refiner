# Legacy Codebase Symbol Audit Log

This document provides a 100% deterministic, AST-verified inventory of every source file in the legacy codebase, including exact lines of code (LOC) and extracted symbol counts (classes, methods, functions, variables, constants).

---

## 📊 Summary Metrics

- **Total Legacy Files Audited**: 38 files
- **Total Legacy Lines of Code**: 25,591 LOC
- **Total Classes Extracted**: 80
- **Total Class Methods Extracted**: 694
- **Total Standalone Functions Extracted**: 418
- **Total Variables & Constants Extracted**: 2620
- **Total Extracted Symbols**: 3,812

---

## 📁 File-by-File Symbol Inventory

| File Path | LOC | Classes | Methods | Functions | Variables/Consts | Total Symbols |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `supabase/supabase.min.js` | 8 | 65 | 450 | 99 | 751 | **1365** |
| `sidepanel/sidepanel.js` | 8,338 | 0 | 0 | 185 | 757 | **942** |
| `content/observer.js` | 2,206 | 0 | 0 | 44 | 182 | **226** |
| `llm/llm-client.js` | 868 | 1 | 18 | 2 | 70 | **91** |
| `background/services/memory-orchestrator.js` | 573 | 0 | 0 | 14 | 73 | **87** |
| `logging/logger.js` | 715 | 3 | 40 | 1 | 41 | **85** |
| `options/model-manager-ui.js` | 771 | 1 | 22 | 0 | 60 | **83** |
| `memory/memory-controller.js` | 835 | 1 | 32 | 1 | 42 | **76** |
| `content/scraper.js` | 751 | 1 | 12 | 6 | 54 | **73** |
| `memory/context-assembler.js` | 576 | 1 | 12 | 3 | 57 | **73** |
| `model/model-manager.js` | 941 | 1 | 28 | 2 | 40 | **71** |
| `background/services/api-proxy.js` | 615 | 0 | 0 | 5 | 61 | **66** |
| `background/index.js` | 1,025 | 0 | 0 | 1 | 62 | **63** |
| `supabase/supabase-client.js` | 661 | 1 | 22 | 1 | 30 | **54** |
| `memory/index.js` | 673 | 0 | 0 | 5 | 47 | **52** |
| `rating/rating-manager.js` | 664 | 1 | 16 | 2 | 24 | **43** |
| `memory/analyzers/unified-analyzer.js` | 443 | 0 | 0 | 0 | 40 | **40** |
| `model/model-registry.js` | 532 | 0 | 0 | 11 | 24 | **35** |
| `extractor/extractor.js` | 567 | 1 | 16 | 1 | 15 | **33** |
| `theme/theme-controller.js` | 289 | 1 | 12 | 0 | 19 | **32** |
| `build.js` | 214 | 0 | 0 | 6 | 21 | **27** |
| `rating/rating-injector.js` | 594 | 0 | 0 | 0 | 26 | **26** |
| `memory/component-schemas.js` | 641 | 0 | 0 | 0 | 23 | **23** |
| `background/services/crypto.js` | 84 | 0 | 0 | 4 | 16 | **20** |
| `llm/llm-config.js` | 112 | 1 | 7 | 0 | 12 | **20** |
| `background/services/sidepanel-manager.js` | 144 | 0 | 0 | 5 | 11 | **16** |
| `storage/storage-repository.js` | 148 | 1 | 7 | 0 | 8 | **16** |
| `content/diff.js` | 176 | 0 | 0 | 3 | 12 | **15** |
| `rating/rating-ui.js` | 281 | 0 | 0 | 4 | 11 | **15** |
| `background/services/session-state.js` | 33 | 0 | 0 | 3 | 6 | **9** |
| `memory/analyzers/recent-focus.js` | 128 | 0 | 0 | 0 | 8 | **8** |
| `background/services/logger.js` | 46 | 0 | 0 | 2 | 5 | **7** |
| `memory/analyzer-registry.js` | 292 | 0 | 0 | 1 | 5 | **6** |
| `options/index.js` | 131 | 0 | 0 | 1 | 4 | **5** |
| `sidepanel/modules/dimension-view.js` | 63 | 0 | 0 | 1 | 3 | **4** |
| `sidepanel/modules/cloud-sync.js` | 41 | 0 | 0 | 2 | 0 | **2** |
| `sidepanel/modules/persona-view.js` | 37 | 0 | 0 | 2 | 0 | **2** |
| `content/templates.js` | 375 | 0 | 0 | 1 | 0 | **1** |

---

## 🔍 Detailed Symbol Breakdown by File

### `supabase/supabase.min.js` (8 LOC, 1365 symbols)

- **Classes (65)**: `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `e` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `e` (L7), `e` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `e` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7), `e` (L7), `AnonymousClass` (L7), `AnonymousClass` (L7)
- **Methods (450)**: `AnonymousClass.constructor`, `AnonymousClass.constructor`, `AnonymousClass.constructor`, `AnonymousClass.constructor`, `AnonymousClass.constructor`, `AnonymousClass.setAuth`, `AnonymousClass.invoke`, `AnonymousClass.constructor`, `AnonymousClass.constructor`, `AnonymousClass.throwOnError`, `AnonymousClass.setHeader`, `AnonymousClass.then`, `AnonymousClass.returns`, `AnonymousClass.overrideTypes`, `AnonymousClass.select` *(+435 more)*
- **Functions (99)**: `t` (L7), `a` (L7), `n` (L7), `o` (L7), `h` (L7), `R` (L7), `A` (L7), `j` (L7), `$` (L7), `I` (L7), `P` (L7), `C` (L7), `x` (L7), `N` (L7), `U` (L7), `t` (L7), `J` (L7), `i` (L7), `Q` (L7), `Z` (L7), `te` (L7), `ie` (L7), `he` (L7), `le` (L7), `ce` (L7), `ue` (L7), `de` (L7), `pe` (L7), `fe` (L7), `ge` (L7), `we` (L7), `ye` (L7), `me` (L7), `be` (L7), `_e` (L7), `ke` (L7), `ve` (L7), `Ne` (L7), `Le` (L7), `Be` (L7), `qe` (L7), `Ke` (L7), `We` (L7), `tt` (L7), `ct` (L7), `dt` (L7), `wt` (L7), `_t` (L7), `St` (L7), `$t` (L7), `It` (L7), `Pt` (L7), `r` (L7), `i` (L7), `Ct` (L7), `xt` (L7), `s` (L7), `Nt` (L7), `Ut` (L7), `s` (L7), `Dt` (L7), `Bt` (L7), `qt` (L7), `Kt` (L7), `Wt` (L7), `Mt` (L7), `Jt` (L7), `Gt` (L7), `Vt` (L7), `Ht` (L7), `Xt` (L7), `Qt` (L7), `Zt` (L7), `er` (L7), `rr` (L7), `sr` (L7), `ar` (L7), `ir` (L7), `nr` (L7), `or` (L7), `hr` (L7), `lr` (L7), `dr` (L7), `yr` (L7), `br` (L7), `_r` (L7), `Er` (L7), `Sr` (L7), `Or` (L7), `Rr` (L7), `Ar` (L7), `jr` (L7), `$r` (L7), `Ir` (L7), `xr` (L7), `t` (L7), `r` (L7), `Nr` (L7), `Lr` (L7)

### `sidepanel/sidepanel.js` (8338 LOC, 942 symbols)

- **Functions (185)**: `spLog` (L25), `showToast` (L38), `getSupabaseClient` (L68), `getChipGroupValue` (L80), `getTagValues` (L92), `showAlertDialog` (L177), `cleanup` (L214), `handleDismiss` (L222), `handleRetry` (L228), `handleScrimClick` (L235), `handleKeydown` (L243), `showConfirmDialog` (L290), `cleanup` (L316), `handleConfirm` (L324), `handleCancel` (L329), `handleScrimClick` (L335), `handleKeydown` (L343), `showPromptDialog` (L381), `cleanup` (L409), `handleConfirm` (L417), `handleCancel` (L422), `handleScrimClick` (L428), `handleKeydown` (L435), `setupM3Dropdown` (L463), `toggleDropdown` (L481), `selectItem` (L494), `validateExtractionResponse` (L607), `handleCloseSidepanel` (L983), `handleTabActivated` (L1039), `handleTabUpdated` (L1052), `loadSessionFromTab` (L1070), `setupAnalyzerToggles` (L1106), `loadCurrentSession` (L1133), `showNoModelOverlay` (L1184), `hideNoModelOverlay` (L1199), `showNoSession` (L1218), `showSession` (L1230), `extractSessionId` (L1248), `loadMemoryData` (L1266), `checkLLMStatus` (L1308), `restoreFormStateFromSplitView` (L1363), `updateDimensionPinButton` (L1402), `renderAllComponents` (L1438), `getActiveCompData` (L1447), `createEditableTagList` (L1570), `createEditableTag` (L1596), `handleRemoveTag` (L1661), `handleEditTag` (L1676), `handleAddTag` (L1688), `updateTagsInStorage` (L1708), `createContextEditableTagList` (L1729), `createContextEditableTag` (L1755), `handleAddContextTag` (L1819), `handleRemoveContextTag` (L1838), `updateContextTagsInData` (L1847), `setupContextInlineEditing` (L1871), `updateContextFieldInData` (L1905), `renderV4Section` (L1940), `triggerUpdate` (L2049), `createSingleSelectChips` (L2247), `createMultiSelectChips` (L2300), `renderChips` (L2318), `handleAdd` (L2377), `createTextInput` (L2412), `renderSynthesizedPersona` (L2447), `renderContext` (L2566), `renderTone` (L2632), `renderFramework` (L2693), `renderConstraints` (L2749), `renderFormat` (L2805), `renderExemplar` (L2861), `isFactDisabled` (L2923), `handleFactToggle` (L2931), `updateToggleStates` (L2954), `setupAccordions` (L2976), `setupButtonHandlers` (L3034), `saveComponent` (L3204), `rebuildMemory` (L3220), `showNotification` (L3322), `capitalizeFirst` (L3342), `handleStorageChange` (L3346), `setupLogViewer` (L3379), `escapeHtml` (L3388), `setupTabNavigation` (L3402), `navigateToPersonaPage` (L3474), `setupPersonaNavigation` (L3553), `getSelectedChipValue` (L3691), `hasActiveFilters` (L3698), `onFilterChange` (L3705), `setupEditPersonaAccordions` (L3813), `setupTagList` (L3864), `saveTag` (L3908), `setupExtractedPageInteractions` (L3933), `handleExtractPersona` (L3975), `parseExtractionResult` (L4074), `updateSectionBadge` (L4126), `initializeSectionBadges` (L4182), `setupBadgeListeners` (L4238), `populateExtractionResults` (L4269), `setChipSelection` (L4280), `setupFormDirtyTracking` (L4516), `renderExtTopicSummary` (L4550), `renderExtIntent` (L4588), `renderExtEntities` (L4641), `renderExtStyle` (L4667), `renderExtFocus` (L4748), `renderExtContext` (L4811), `renderExtTone` (L4860), `renderExtFramework` (L4909), `renderExtConstraints` (L4958), `renderExtFormat` (L5007), `renderExtExemplar` (L5056), `createExtEditableTagList` (L5105), `createExtEditableTag` (L5131), `handleExtRemoveTag` (L5192), `handleExtAddTag` (L5197), `updateExtTagsInData` (L5216), `setupExtInlineEditing` (L5238), `setupExtSelectChange` (L5264), `updateExtFieldInData` (L5275), `populateEditableTags` (L5291), `handleSaveDraft` (L5341), `handlePublishPersona` (L5412), `handlePersonaSearch` (L5624), `getChipValue` (L5629), `loadPopularPersonas` (L5704), `renderPersonaResults` (L5751), `showPersonaPopup` (L5788), `showPersonaDetailModal` (L5887), `formatMemoryKey` (L5980), `handleImportPersona` (L5989), `loadMyPersonas` (L6051), `loadSavedPrompts` (L6126), `createPromptListItem` (L6193), `handleSavePrompt` (L6244), `savePromptLocal` (L6297), `deleteSavedPrompt` (L6319), `openPromptPreviewDialog` (L6359), `closeDialog` (L6385), `extractFromSavedPrompt` (L6404), `createPersonaListItem` (L6425), `createRipple` (L6491), `handleVisibilityChange` (L6520), `handleEditPersona` (L6559), `handleDeletePersona` (L6598), `loadPersonaToEdit` (L6657), `handleViewPersona` (L6717), `openSourcePromptViewer` (L6741), `closeSourcePromptViewer` (L6777), `handleSourceViewerKeydown` (L6789), `markFormDirty` (L6811), `resetFormDirty` (L6818), `hasUnsavedChanges` (L6825), `handleRebuildFromSource` (L6829), `cancelRebuild` (L6959), `openVersionHistory` (L7004), `loadVersionHistory` (L7032), `createVersionItem` (L7106), `generateDiffView` (L7157), `diffObjects` (L7165), `formatDiffValue` (L7211), `formatFieldLabel` (L7225), `getNestedValue` (L7242), `restoreVersion` (L7250), `exportPersonaJSON` (L7289), `readAndSanitizeFile` (L7401), `sanitizeTextContent` (L7465), `importPersonaFile` (L7485), `processPersonaImport` (L7526), `importPromptFile` (L7573), `importPersonaJSON` (L7629), `sanitizeImportedData` (L7639), `formatDate` (L7672), `setupLogsPageHandlers` (L7687), `renderLogsPage` (L7742), `setupSynthesizedPersonaSave` (L7803), `savePersonaToStorage` (L7881), `setupExpandModal` (L7933), `checkRatingEligibility` (L7984), `showRatingPrompt` (L8002), `submitRating` (L8084), `scanContentForModeration` (L8146), `showModerationWarning` (L8176), `showReportDialog` (L8228), `submitReport` (L8306)
- **Constants (5)**: `EXTRACTION_SCHEMA` (L113), `VALID_ENUMS` (L151), `VALID_DIMENSIONS` (L3235), `ALLOWED_IMPORT_EXTENSIONS` (L7389), `MAX_IMPORT_FILE_SIZE` (L7394)

### `content/observer.js` (2206 LOC, 226 symbols)

- **Functions (44)**: `obsLog` (L36), `detectPageTheme` (L54), `isExtensionContextValid` (L87), `showExtensionReloadNotification` (L102), `safeSendMessage` (L197), `applyThemeToDocument` (L230), `initThemeObservation` (L269), `observeElement` (L270), `findElement` (L356), `findChatInput` (L387), `findSendButton` (L391), `findInputContainer` (L395), `createSettingsIcon` (L419), `updateModelIndicator` (L451), `createRefineToggle` (L507), `updateState` (L527), `createReviewModal` (L558), `detectTheme` (L562), `checkConnection` (L642), `typeText` (L657), `showConnectionFeedback` (L669), `getActiveTextarea` (L720), `switchTab` (L725), `generateDiffHTML` (L748), `escape` (L753), `updateCharCount` (L758), `updateUI` (L775), `updateEmptyState` (L819), `checkApiKey` (L845), `saveCurrentPairEdits` (L899), `navigatePrevOriginal` (L910), `navigateNextOriginal` (L920), `navigatePrevRefined` (L930), `navigateNextRefined` (L944), `dismissErrorBanner` (L1260), `pasteToInput` (L1688), `injectInterface` (L1700), `updateSettingsPosition` (L1731), `updateVisibility` (L1877), `getTabId` (L1899), `triggerNativeSend` (L1929), `triggerRefinement` (L1987), `toggleSplitView` (L2138), `debouncedInject` (L2180)
- **Constants (1)**: `SELECTORS` (L316)

### `llm/llm-client.js` (868 LOC, 91 symbols)

- **Classes (1)**: `LLMClient` (L90)
- **Methods (18)**: `LLMClient.constructor`, `LLMClient.isConfigured`, `LLMClient._sanitizeApiKey`, `LLMClient._proxyFetch`, `LLMClient.configure`, `LLMClient.call`, `LLMClient._callWithRetry`, `LLMClient._executeCall`, `LLMClient._classifyError`, `LLMClient._calculateBackoff`, `LLMClient._delay`, `LLMClient._callGemini`, `LLMClient._callOpenAI`, `LLMClient._callAnthropic`, `LLMClient._callOpenRouter` *(+3 more)*
- **Functions (2)**: `cleanup` (L182), `handler` (L212)
- **Constants (6)**: `LLM_PROVIDERS` (L29), `DEFAULT_MODELS` (L39), `API_ENDPOINTS` (L49), `RETRY_CONFIG` (L59), `LLM_ERROR_TYPES` (L69), `RETRYABLE_ERRORS` (L82)

### `background/services/memory-orchestrator.js` (573 LOC, 87 symbols)

- **Functions (14)**: `getCurrentTabSessionId` (L8), `getSessionMemory` (L42), `updateMemoryComponent` (L53), `pinPersona` (L80), `unpinPersona` (L115), `pinComponent` (L148), `unpinComponent` (L187), `toggleFact` (L209), `buildV4RefinementContext` (L233), `isFactDisabled` (L240), `getActiveData` (L245), `rebuildSessionMemory` (L453), `acquireSessionLock` (L534), `releaseSessionLock` (L556)

### `logging/logger.js` (715 LOC, 85 symbols)

- **Classes (3)**: `RingBuffer` (L79), `LogEntry` (L119), `Logger` (L169)
- **Methods (40)**: `RingBuffer.constructor`, `RingBuffer.push`, `RingBuffer.getAll`, `RingBuffer.clear`, `LogEntry.constructor`, `LogEntry._detectContext`, `LogEntry.toJSON`, `LogEntry.format`, `Logger.getInstance`, `Logger.constructor`, `Logger._hasDirectStorage`, `Logger._makeBridgeRequest`, `Logger._storageGet`, `Logger._storageSet`, `Logger.setLevel` *(+25 more)*
- **Functions (1)**: `handler` (L222)
- **Constants (4)**: `LOG_LEVELS` (L32), `LOG_COLORS` (L43), `LOGGER_CONFIG` (L55), `PII_PATTERNS` (L68)

### `options/model-manager-ui.js` (771 LOC, 83 symbols)

- **Classes (1)**: `ModelManagerUI` (L14)
- **Methods (22)**: `ModelManagerUI.constructor`, `ModelManagerUI.init`, `ModelManagerUI.render`, `ModelManagerUI.escapeHtml`, `ModelManagerUI.renderModelCard`, `ModelManagerUI.renderModal`, `ModelManagerUI.setupEventListeners`, `ModelManagerUI.setupModalEvents`, `ModelManagerUI.onProviderChange`, `ModelManagerUI.renderParameters`, `ModelManagerUI.openAddModal`, `ModelManagerUI.openEditModal`, `ModelManagerUI.showModal`, `ModelManagerUI.closeModal`, `ModelManagerUI.handleTest` *(+7 more)*

### `memory/memory-controller.js` (835 LOC, 76 symbols)

- **Classes (1)**: `MemoryController` (L80)
- **Methods (32)**: `MemoryController.constructor`, `MemoryController.extractSessionId`, `MemoryController.isExtensionContext`, `MemoryController._initBridgeListener`, `MemoryController._makeBridgeRequest`, `MemoryController._ensureCache`, `MemoryController.load`, `MemoryController.save`, `MemoryController.getComponent`, `MemoryController.setComponent`, `MemoryController.incrementGeneration`, `MemoryController.getCurrentGeneration`, `MemoryController.getComponentGeneration`, `MemoryController.isComponentCurrent`, `MemoryController.pinPersona` *(+17 more)*
- **Functions (1)**: `memCtrlLog` (L69)
- **Constants (4)**: `MEMORY_SCHEMA_VERSION` (L43), `DIMENSION_NAMES` (L48), `SESSION_KEY_PREFIX` (L55), `MEMORY_SIZE_LIMITS` (L61)

### `content/scraper.js` (751 LOC, 73 symbols)

- **Classes (1)**: `GeminiConversationScraper` (L178)
- **Methods (12)**: `GeminiConversationScraper.constructor`, `GeminiConversationScraper.hasHistory`, `GeminiConversationScraper._getRating`, `GeminiConversationScraper.loadRatings`, `GeminiConversationScraper.scrape`, `GeminiConversationScraper._findMessageContainers`, `GeminiConversationScraper._extractTurns`, `GeminiConversationScraper._extractContent`, `GeminiConversationScraper._determineRole`, `GeminiConversationScraper._matchesIndicator`, `GeminiConversationScraper._formatOutput`, `GeminiConversationScraper._generateSessionId`
- **Functions (6)**: `scrapeLog` (L71), `formatDate` (L249), `pad` (L251), `customScraperMethod` (L629), `getChatHistory` (L657), `getPreviousPromptsWithRatings` (L682)
- **Constants (2)**: `SCRAPER_CONFIG` (L85), `GEMINI_SELECTORS` (L106)

### `memory/context-assembler.js` (576 LOC, 73 symbols)

- **Classes (1)**: `ContextAssembler` (L26)
- **Methods (12)**: `ContextAssembler.constructor`, `ContextAssembler.assemble`, `ContextAssembler._buildSummary`, `ContextAssembler._isComponentCurrent`, `ContextAssembler._getComponent`, `ContextAssembler._getComponentData`, `ContextAssembler._extractV4Data`, `ContextAssembler._buildRefinementContext`, `ContextAssembler.formatForRefinement`, `ContextAssembler.getContextJSON`, `ContextAssembler.hasContext`, `ContextAssembler.clearCache`
- **Functions (3)**: `ctxLog` (L15), `isFactDisabled` (L178), `trackComponent` (L183)

### `model/model-manager.js` (941 LOC, 71 symbols)

- **Classes (1)**: `ModelManager` (L70)
- **Methods (28)**: `ModelManager.constructor`, `ModelManager.init`, `ModelManager._doInit`, `ModelManager._ensureInitialized`, `ModelManager.getAllModels`, `ModelManager.getModel`, `ModelManager.hasApiKey`, `ModelManager.updateModel`, `ModelManager.addModel`, `ModelManager.deleteModel`, `ModelManager.enableModel`, `ModelManager.disableModel`, `ModelManager.getEnabledModels`, `ModelManager.getActiveModelId`, `ModelManager.getActiveModel` *(+13 more)*
- **Functions (2)**: `modelLog` (L41), `getModelManager` (L917)
- **Constants (2)**: `MODEL_STORAGE_KEYS` (L52), `LEGACY_STORAGE_KEYS` (L60)

### `background/services/api-proxy.js` (615 LOC, 66 symbols)

- **Functions (5)**: `getUserFriendlyError` (L21), `calculateRetryDelay` (L230), `executeLlmRequest` (L241), `callLLMForExtraction` (L374), `handleRefinement` (L390)
- **Constants (4)**: `REFINEMENT_SYSTEM_PROMPT` (L66), `MODEL_CONFIGS` (L116), `LLM_TRANSPORTS` (L147), `RETRY_CONFIG_BG` (L218)

### `background/index.js` (1025 LOC, 63 symbols)

- **Functions (1)**: `filenameListener` (L152)
- **Constants (2)**: `ALLOWED_PROXY_HOSTS` (L349), `MIN_EXCHANGES` (L837)

### `supabase/supabase-client.js` (661 LOC, 54 symbols)

- **Classes (1)**: `SupabaseClient` (L58)
- **Methods (22)**: `SupabaseClient.getInstance`, `SupabaseClient.constructor`, `SupabaseClient.init`, `SupabaseClient.loadSupabaseLib`, `SupabaseClient.signUp`, `SupabaseClient.signIn`, `SupabaseClient.signInAnonymously`, `SupabaseClient.signOut`, `SupabaseClient.getUser`, `SupabaseClient.isAuthenticated`, `SupabaseClient.createPersona`, `SupabaseClient.updatePersona`, `SupabaseClient.deletePersona`, `SupabaseClient.getMyPersonas`, `SupabaseClient.searchPersonas` *(+7 more)*
- **Functions (1)**: `sbLog` (L36)
- **Constants (2)**: `SUPABASE_URL` (L23), `SUPABASE_ANON_KEY` (L24)

### `memory/index.js` (673 LOC, 52 symbols)

- **Functions (5)**: `memLog` (L39), `analyzeSession` (L82), `isLLMConfigured` (L308), `getCurrentSessionId` (L317), `sendBridgeResponse` (L349)

### `rating/rating-manager.js` (664 LOC, 43 symbols)

- **Classes (1)**: `RatingManager` (L103)
- **Methods (16)**: `RatingManager.constructor`, `RatingManager.hasDirectStorageAccess`, `RatingManager.extractSessionId`, `RatingManager.load`, `RatingManager.save`, `RatingManager.backupToStorage`, `RatingManager.restoreFromStorage`, `RatingManager.backupAllRatings`, `RatingManager.getRating`, `RatingManager.setRating`, `RatingManager.removeRating`, `RatingManager.getAllRatings`, `RatingManager.getRatingsArray`, `RatingManager.hasRating`, `RatingManager.getRatedCount` *(+1 more)*
- **Functions (2)**: `ratingLog` (L52), `getCurrentRatingManager` (L625)
- **Constants (1)**: `RATINGS_KEY_PREFIX` (L69)

### `memory/analyzers/unified-analyzer.js` (443 LOC, 40 symbols)


### `model/model-registry.js` (532 LOC, 35 symbols)

- **Functions (11)**: `sanitizeApiKey` (L270), `getProvider` (L286), `getProviderIds` (L294), `getModelsForProvider` (L303), `getDefaultModelForProvider` (L313), `getParametersForProvider` (L324), `getDefaultParameterValues` (L334), `fetchGeminiModels` (L348), `fetchOpenAIModels` (L393), `fetchOpenRouterModels` (L434), `fetchModelsForProvider` (L478)
- **Constants (2)**: `MODEL_PROVIDERS` (L15), `DEFAULT_MODEL_CONFIGS` (L205)

### `extractor/extractor.js` (567 LOC, 33 symbols)

- **Classes (1)**: `PersonaExtractor` (L214)
- **Methods (16)**: `PersonaExtractor.constructor`, `PersonaExtractor.init`, `PersonaExtractor.loadDrafts`, `PersonaExtractor.saveDrafts`, `PersonaExtractor.extractFromPrompt`, `PersonaExtractor.getModelConfig`, `PersonaExtractor.callLLM`, `PersonaExtractor.parseExtractionResponse`, `PersonaExtractor.generateDraftId`, `PersonaExtractor.saveCurrentDraft`, `PersonaExtractor.updateDraft`, `PersonaExtractor.deleteDraft`, `PersonaExtractor.getDrafts`, `PersonaExtractor.getCurrentDraft`, `PersonaExtractor.publishDraft` *(+1 more)*
- **Functions (1)**: `extLog` (L34)
- **Constants (1)**: `EXTRACTION_PROMPT` (L81)

### `theme/theme-controller.js` (289 LOC, 32 symbols)

- **Classes (1)**: `ThemeController` (L34)
- **Methods (12)**: `ThemeController.init`, `ThemeController.getMode`, `ThemeController.setMode`, `ThemeController.toggleTheme`, `ThemeController.cycleMode`, `ThemeController.getResolvedTheme`, `ThemeController.getIcon`, `ThemeController.subscribe`, `ThemeController.#applyMode`, `ThemeController.#getSystemPreference`, `ThemeController.#notifySubscribers`, `ThemeController.#updateToggleIcons`

### `build.js` (214 LOC, 27 symbols)

- **Functions (6)**: `ensureDir` (L64), `cleanOutdir` (L71), `copyStaticFiles` (L90), `buildJS` (L105), `buildCSS` (L141), `build` (L159)

### `rating/rating-injector.js` (594 LOC, 26 symbols)

- **Constants (2)**: `RATING_SELECTORS` (L52), `INIT_DELAY_MS` (L568)

### `memory/component-schemas.js` (641 LOC, 23 symbols)


### `background/services/crypto.js` (84 LOC, 20 symbols)

- **Functions (4)**: `getEncryptionKey` (L3), `encryptApiKey` (L32), `decryptApiKey` (L54), `isEncrypted` (L81)

### `llm/llm-config.js` (112 LOC, 20 symbols)

- **Classes (1)**: `LLMConfigManager` (L6)
- **Methods (7)**: `LLMConfigManager.constructor`, `LLMConfigManager._getModelManager`, `LLMConfigManager.load`, `LLMConfigManager.getApiKey`, `LLMConfigManager.getClient`, `LLMConfigManager.isConfigured`, `LLMConfigManager.getActiveModelConfig`

### `background/services/sidepanel-manager.js` (144 LOC, 16 symbols)

- **Functions (5)**: `handleSidepanelConnect` (L11), `registerWindow` (L16), `isSidepanelOpen` (L46), `toggleSidepanel` (L53), `toggleSplitView` (L95)

### `storage/storage-repository.js` (148 LOC, 16 symbols)

- **Classes (1)**: `StoragePartition` (L11)
- **Methods (7)**: `StoragePartition.constructor`, `StoragePartition.get`, `StoragePartition.getMultiple`, `StoragePartition.set`, `StoragePartition.setMultiple`, `StoragePartition.remove`, `StoragePartition.clear`

### `content/diff.js` (176 LOC, 15 symbols)

- **Functions (3)**: `diffWords` (L41), `renderDiffHtml` (L138), `escapeHtml` (L157)

### `rating/rating-ui.js` (281 LOC, 15 symbols)

- **Functions (4)**: `createRatingUI` (L72), `highlightStars` (L168), `setStarsRating` (L199), `updateRatingUI` (L243)

### `background/services/session-state.js` (33 LOC, 9 symbols)

- **Functions (3)**: `getRefinementCounter` (L10), `incrementRefinementCounter` (L18), `resetRefinementCounter` (L28)
- **Constants (1)**: `RECENT_FOCUS_REFRESH_INTERVAL` (L8)

### `memory/analyzers/recent-focus.js` (128 LOC, 8 symbols)


### `background/services/logger.js` (46 LOC, 7 symbols)

- **Functions (2)**: `sanitizeData` (L6), `bgLog` (L27)

### `memory/analyzer-registry.js` (292 LOC, 6 symbols)

- **Functions (1)**: `arLog` (L57)

### `options/index.js` (131 LOC, 5 symbols)

- **Functions (1)**: `updateThemeIcon` (L57)

### `sidepanel/modules/dimension-view.js` (63 LOC, 4 symbols)

- **Functions (1)**: `formatDimensionText` (L22)
- **Constants (1)**: `V4_DIMENSION_KEYS` (L6)

### `sidepanel/modules/cloud-sync.js` (41 LOC, 2 symbols)

- **Functions (2)**: `isCloudSyncAvailable` (L10), `mapCloudPersonaToLocal` (L21)

### `sidepanel/modules/persona-view.js` (37 LOC, 2 symbols)

- **Functions (2)**: `formatPersonaText` (L11), `isValidPersonaData` (L26)

### `content/templates.js` (375 LOC, 1 symbols)

- **Functions (1)**: `getReviewModalTemplate` (L96)

