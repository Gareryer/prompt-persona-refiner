---
name: gortex-2-dirs-bglog
description: "Work in the . +2 dirs · bgLog area — 35 symbols across 4 files (65% cohesion)"
---

# . +2 dirs · bgLog

35 symbols | 4 files | 65% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `background.js`
- `memory\analyzer-registry.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | shift, get, catch, set |
| `background.js` | unpinComponent, handleRefinement, getSessionMemory, callLLMForExtraction, buildV4RefinementContext, ... |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAnalyzer |
| `sidepanel\sidepanel.js` | onUpdate, onUpdate, onUpdate, onUpdate, onUpdate, ... |

## Entry Points

- `background.js::handleRefinement`
- `background.js::buildV4RefinementContext`
- `background.js::rebuildSessionMemory`

## Connected Communities

- **. +7 dirs** (20 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (4 cross-edges)
- **. +5 dirs · replace** (4 cross-edges)
- **. +5 dirs · includes** (3 cross-edges)
- **memory +4 dirs · map** (3 cross-edges)
- **. +6 dirs** (2 cross-edges)
- **. +3 dirs · appendChild** (2 cross-edges)
- **content +3 dirs** (1 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +1 dirs · AnalyzerRegistry.register** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-1")
explore(operation:"context", task:"understand . +2 dirs · bgLog", format:"gcx")
relations(operation:"usages", target:{symbol:"background.js::handleRefinement"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
