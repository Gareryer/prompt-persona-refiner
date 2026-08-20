---
name: gortex-1-dirs-splog
description: "Work in the . +1 dirs · spLog area — 40 symbols across 2 files (56% cohesion)"
---

# . +1 dirs · spLog

40 symbols | 2 files | 56% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | some, lastIndexOf, unshift |
| `sidepanel\sidepanel.js` | submitRating, restoreVersion, handleExtractPersona, deleteSavedPrompt, showAlertDialog, ... |

## Entry Points

- `sidepanel\sidepanel.js::handleSaveDraft`
- `sidepanel\sidepanel.js::handleSavePrompt`
- `sidepanel\sidepanel.js::handleExtractPersona`
- `sidepanel\sidepanel.js::handleRebuildFromSource`
- `sidepanel\sidepanel.js::handlePublishPersona`

## Connected Communities

- **content +3 dirs** (75 cross-edges)
- **content +5 dirs** (32 cross-edges)
- **. +2 dirs · bgLog** (13 cross-edges)
- **. +2 dirs · escapeHtml** (11 cross-edges)
- **. +7 dirs** (8 cross-edges)
- **. +3 dirs · appendChild** (7 cross-edges)
- **memory +4 dirs · map** (7 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (6 cross-edges)
- **. +5 dirs · includes** (5 cross-edges)
- **. +5 dirs · replace** (5 cross-edges)
- **. +2 dirs · stringify** (3 cross-edges)
- **memory +3 dirs** (3 cross-edges)
- **. +6 dirs** (2 cross-edges)
- **. +1 dirs · extLog** (1 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-25")
explore(operation:"context", task:"understand . +1 dirs · spLog", format:"gcx")
relations(operation:"usages", target:{symbol:"sidepanel\sidepanel.js::handleSaveDraft"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
