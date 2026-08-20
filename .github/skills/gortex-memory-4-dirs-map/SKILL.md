---
name: gortex-memory-4-dirs-map
description: "Work in the memory +4 dirs · map area — 12 symbols across 7 files (47% cohesion)"
---

# memory +4 dirs · map

12 symbols | 7 files | 47% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\scraper.js`
- `memory\analyzers\recent-focus.js`
- `memory\analyzers\unified-analyzer.js`
- `memory\component-schemas.js`
- `memory\context-assembler.js`
- `model\model-registry.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | localeCompare, map |
| `content\scraper.js` | _formatOutput |
| `memory\analyzers\recent-focus.js` | RecentFocus.getPrompt |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer._formatConversation |
| `memory\component-schemas.js` | ComponentSchemas.migrateFromV3 |
| `memory\context-assembler.js` | formatForRefinement |
| `model\model-registry.js` | fetchModelsForProvider, fetchOpenRouterModels, fetchOpenAIModels, sanitizeApiKey, fetchGeminiModels |

## Entry Points

- `memory\component-schemas.js::ComponentSchemas.migrateFromV3@450`
- `memory\context-assembler.js::ContextAssembler.formatForRefinement`

## Connected Communities

- **memory +3 dirs** (4 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (3 cross-edges)
- **. +4 dirs** (3 cross-edges)
- **. +5 dirs** (3 cross-edges)
- **. +7 dirs** (3 cross-edges)
- **. +2 dirs · stringify** (2 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **. +6 dirs** (2 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)
- **. +1 dirs · handlePersonaSearch** (1 cross-edges)
- **content +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-8")
explore(operation:"context", task:"understand memory +4 dirs · map", format:"gcx")
relations(operation:"usages", target:{symbol:"memory\component-schemas.js::ComponentSchemas.migrateFromV3@450"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
