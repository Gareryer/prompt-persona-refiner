---
name: gortex-5-dirs-includes
description: "Work in the . +5 dirs · includes area — 54 symbols across 6 files (72% cohesion)"
---

# . +5 dirs · includes

54 symbols | 6 files | 72% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `llm\llm-client.js`
- `logging\logger.js`
- `memory\component-schemas.js`
- `model\model-manager.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | delete, includes, assign, removeChild |
| `content\observer.js` | showExtensionReloadNotification, api.state, isExtensionContextValid, safeSendMessage |
| `llm\llm-client.js` | _classifyError |
| `logging\logger.js` | clear, _storageSet, constructor, endOperation, time, ... |
| `memory\component-schemas.js` | ComponentSchemas.buildCombinedSchema |
| `model\model-manager.js` | isMaskedKey |

## Entry Points

- `content\observer.js::safeSendMessage`
- `logging\logger.js::Logger.startOperation`
- `logging\logger.js::Logger.downloadExport`

## Connected Communities

- **. +2 dirs · bgLog** (6 cross-edges)
- **. +7 dirs** (6 cross-edges)
- **memory +4 dirs · map** (4 cross-edges)
- **. +3 dirs · appendChild** (4 cross-edges)
- **. +6 dirs** (3 cross-edges)
- **content +3 dirs** (3 cross-edges)
- **. +2 dirs · stringify** (2 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (2 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +5 dirs · replace** (1 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +3 dirs · removeEventListener** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-6")
explore(operation:"context", task:"understand . +5 dirs · includes", format:"gcx")
relations(operation:"usages", target:{symbol:"content\observer.js::safeSendMessage"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
