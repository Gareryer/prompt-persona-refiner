---
name: gortex-memory-7-dirs
description: "Work in the memory +7 dirs area — 36 symbols across 13 files (52% cohesion)"
---

# memory +7 dirs

36 symbols | 13 files | 52% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `content\scraper.js`
- `llm\llm-client.js`
- `memory\analyzer-registry.js`
- `memory\analyzers\recent-focus.js`
- `memory\analyzers\unified-analyzer.js`
- `memory\component-schemas.js`
- `memory\context-assembler.js`
- `model\model-manager.js`
- `model\model-registry.js`
- `rating\rating-manager.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | startsWith, repeat, keys, replace, endsWith, ... |
| `content\observer.js` | detectTheme |
| `content\scraper.js` | _formatOutput |
| `llm\llm-client.js` | _parseJSON, _fixTruncatedJSON |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAnalyzerIds |
| `memory\analyzers\recent-focus.js` | RecentFocus.getPrompt |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer._formatConversation |
| `memory\component-schemas.js` | ComponentSchemas.migrateFromV3 |
| `memory\context-assembler.js` | formatForRefinement, _buildSummary |
| `model\model-manager.js` | maskApiKey, _validateApiKeyFormat |
| `model\model-registry.js` | fetchOpenAIModels, getProviderIds, fetchModelsForProvider, fetchOpenRouterModels, fetchGeminiModels, ... |
| `rating\rating-manager.js` | getRatedCount, getRatingsArray, backupAllRatings |
| `sidepanel\sidepanel.js` | validateExtractionResponse, sanitizeImportedData |

## Entry Points

- `memory\component-schemas.js::ComponentSchemas.migrateFromV3@450`
- `memory\context-assembler.js::ContextAssembler.formatForRefinement`
- `rating\rating-manager.js::RatingManager.backupAllRatings`

## Connected Communities

- **. +5 dirs** (12 cross-edges)
- **. +6 dirs** (10 cross-edges)
- **content +5 dirs** (8 cross-edges)
- **. +1 dirs · spLog** (5 cross-edges)
- **memory +3 dirs** (5 cross-edges)
- **. +2 dirs · stringify** (3 cross-edges)
- **. +1 dirs · handlePersonaSearch** (3 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **. +7 dirs** (2 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)
- **rating** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-30")
explore(operation:"context", task:"understand memory +7 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"memory\component-schemas.js::ComponentSchemas.migrateFromV3@450"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
