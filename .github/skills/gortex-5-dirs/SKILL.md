---
name: gortex-5-dirs
description: "Work in the . +5 dirs area — 57 symbols across 6 files (72% cohesion)"
---

# . +5 dirs

57 symbols | 6 files | 72% cohesion

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
| `` | removeChild, delete, assign, includes |
| `content\observer.js` | isExtensionContextValid, api.state, showExtensionReloadNotification, initThemeObservation, observeElement, ... |
| `llm\llm-client.js` | _classifyError |
| `logging\logger.js` | _makeBridgeRequest, _hasDirectStorage, warn, LogEntry, addListener, ... |
| `memory\component-schemas.js` | ComponentSchemas.buildCombinedSchema |
| `model\model-manager.js` | isMaskedKey |

## Entry Points

- `content\observer.js::safeSendMessage`
- `logging\logger.js::Logger.startOperation`
- `logging\logger.js::Logger.downloadExport`

## Connected Communities

- **memory +7 dirs** (7 cross-edges)
- **. +2 dirs · bgLog** (6 cross-edges)
- **. +7 dirs** (6 cross-edges)
- **. +3 dirs · appendChild** (4 cross-edges)
- **content +3 dirs** (4 cross-edges)
- **content +5 dirs** (4 cross-edges)
- **. +6 dirs** (3 cross-edges)
- **. +2 dirs · stringify** (2 cross-edges)
- **. +3 dirs · removeEventListener** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +1 dirs · handlePersonaSearch** (1 cross-edges)
- **memory +3 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-12")
explore(operation:"context", task:"understand . +5 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"content\observer.js::safeSendMessage"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
