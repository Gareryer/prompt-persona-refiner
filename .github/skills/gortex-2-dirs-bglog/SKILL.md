---
name: gortex-2-dirs-bglog
description: "Work in the . +2 dirs · bgLog area — 34 symbols across 4 files (63% cohesion)"
---

# . +2 dirs · bgLog

34 symbols | 4 files | 63% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `background.js`
- `memory\analyzer-registry.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | set, shift, get, catch |
| `background.js` | isEncrypted, calculateRetryDelay, pinComponent, updateMemoryComponent, getActiveData, ... |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAnalyzer |
| `sidepanel\sidepanel.js` | handleTabUpdated, onUpdate, onUpdate, onUpdate, onUpdate, ... |

## Entry Points

- `background.js::handleRefinement`
- `background.js::buildV4RefinementContext`
- `background.js::rebuildSessionMemory`

## Connected Communities

- **. +7 dirs** (20 cross-edges)
- **memory +7 dirs** (10 cross-edges)
- **. +6 dirs** (4 cross-edges)
- **. +5 dirs** (3 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +1 dirs · handlePersonaSearch** (1 cross-edges)
- **. +1 dirs · AnalyzerRegistry.register** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-6")
explore(operation:"context", task:"understand . +2 dirs · bgLog", format:"gcx")
relations(operation:"usages", target:{symbol:"background.js::handleRefinement"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
