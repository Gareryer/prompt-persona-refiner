---
name: gortex-5-dirs-replace
description: "Work in the . +5 dirs · replace area — 17 symbols across 6 files (56% cohesion)"
---

# . +5 dirs · replace

17 symbols | 6 files | 56% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `llm\llm-client.js`
- `model\model-registry.js`
- `rating\rating-manager.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | replace, match, localeCompare, sort, endsWith, ... |
| `content\observer.js` | detectTheme |
| `llm\llm-client.js` | _parseJSON, _fixTruncatedJSON |
| `model\model-registry.js` | sanitizeApiKey, fetchOpenRouterModels, fetchOpenAIModels, fetchGeminiModels, fetchModelsForProvider |
| `rating\rating-manager.js` | getRatingsArray |
| `sidepanel\sidepanel.js` | sanitizeImportedData |

## Connected Communities

- **content +5 dirs** (5 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (5 cross-edges)
- **memory +4 dirs · map** (4 cross-edges)
- **. +6 dirs** (4 cross-edges)
- **. +5 dirs · includes** (2 cross-edges)
- **memory +3 dirs** (2 cross-edges)
- **. +7 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-8")
explore(operation:"context", task:"understand . +5 dirs · replace", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
