---
name: gortex-memory-4-dirs-validateextractionresponse
description: "Work in the memory +4 dirs · validateExtractionResponse area — 13 symbols across 7 files (38% cohesion)"
---

# memory +4 dirs · validateExtractionResponse

13 symbols | 7 files | 38% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `memory\analyzer-registry.js`
- `memory\context-assembler.js`
- `model\model-manager.js`
- `model\model-registry.js`
- `rating\rating-manager.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | keys, substring, entries, repeat, startsWith |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAnalyzerIds |
| `memory\context-assembler.js` | _buildSummary |
| `model\model-manager.js` | _validateApiKeyFormat, maskApiKey |
| `model\model-registry.js` | getProviderIds |
| `rating\rating-manager.js` | getRatedCount, backupAllRatings |
| `sidepanel\sidepanel.js` | validateExtractionResponse |

## Entry Points

- `rating\rating-manager.js::RatingManager.backupAllRatings`

## Connected Communities

- **. +5 dirs** (9 cross-edges)
- **. +1 dirs · spLog** (5 cross-edges)
- **. +6 dirs** (4 cross-edges)
- **. +4 dirs** (4 cross-edges)
- **content +5 dirs** (3 cross-edges)
- **. +1 dirs · handlePersonaSearch** (2 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)
- **. +7 dirs** (1 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)
- **rating** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-26")
explore(operation:"context", task:"understand memory +4 dirs · validateExtractionResponse", format:"gcx")
relations(operation:"usages", target:{symbol:"rating\rating-manager.js::RatingManager.backupAllRatings"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
