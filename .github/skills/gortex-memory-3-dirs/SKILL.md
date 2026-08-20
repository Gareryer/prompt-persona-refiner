---
name: gortex-memory-3-dirs
description: "Work in the memory +3 dirs area — 48 symbols across 7 files (76% cohesion)"
---

# memory +3 dirs

48 symbols | 7 files | 76% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `logging\logger.js`
- `memory\analyzer-registry.js`
- `memory\analyzers\unified-analyzer.js`
- `memory\context-assembler.js`
- `memory\index.js`
- `memory\memory-controller.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | dispatchEvent, filter |
| `logging\logger.js` | getLogs |
| `memory\analyzer-registry.js` | AnalyzerRegistry.clear |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer.getPrompt |
| `memory\context-assembler.js` | hasContext, assemble, getContextJSON |
| `memory\index.js` | analyzeSession, SmartAutoRun.handleLocationChange, SmartAutoRun.canRun, SmartAutoRun.checkAndRun, SmartAutoRun.runAnalysis, ... |
| `memory\memory-controller.js` | pinPersona, reject, isPersonaPinned, _makeBridgeRequest, getComponent, ... |

## Entry Points

- `memory\index.js::analyzeSession`
- `memory\index.js::SmartAutoRun.canRun@414`
- `memory\index.js::SmartAutoRun.checkAndRun@576`
- `memory\index.js::SmartAutoRun.runAnalysis@535`

## Connected Communities

- **. +7 dirs** (26 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (9 cross-edges)
- **. +5 dirs · includes** (7 cross-edges)
- **. +6 dirs** (4 cross-edges)
- **content +3 dirs** (3 cross-edges)
- **. +2 dirs · bgLog** (2 cross-edges)
- **. +1 dirs · AnalyzerRegistry.register** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)
- **memory** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-12")
explore(operation:"context", task:"understand memory +3 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"memory\index.js::analyzeSession"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
