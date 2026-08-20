---
name: gortex-1-dirs-extlog
description: "Work in the . +1 dirs · extLog area — 19 symbols across 2 files (74% cohesion)"
---

# . +1 dirs · extLog

19 symbols | 2 files | 74% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `extractor\extractor.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | findIndex |
| `extractor\extractor.js` | init, extractFromPrompt, loadDrafts, saveDrafts, constructor, ... |

## Entry Points

- `extractor\extractor.js::PersonaExtractor.extractFromPrompt`
- `extractor\extractor.js::PersonaExtractor.publishDraft`

## Connected Communities

- **. +6 dirs** (6 cross-edges)
- **. +5 dirs · replace** (5 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (4 cross-edges)
- **content +5 dirs** (3 cross-edges)
- **. +2 dirs · bgLog** (2 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)
- **. +7 dirs** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-5")
explore(operation:"context", task:"understand . +1 dirs · extLog", format:"gcx")
relations(operation:"usages", target:{symbol:"extractor\extractor.js::PersonaExtractor.extractFromPrompt"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
