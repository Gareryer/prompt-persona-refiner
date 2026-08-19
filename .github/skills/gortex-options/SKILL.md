---
name: gortex-options
description: "Work in the options area — 15 symbols across 1 files (70% cohesion)"
---

# options

15 symbols | 1 files | 70% cohesion

## When to Use

Use this skill when working on files in:
- `options\model-manager-ui.js`

## Key Files

| File | Symbols |
|------|---------|
| `options\model-manager-ui.js` | renderModal, handleActivate, render, showToast, handleTestFromModal, ... |

## Connected Communities

- **content +5 dirs** (18 cross-edges)
- **content +3 dirs** (6 cross-edges)
- **. +7 dirs** (6 cross-edges)
- **memory +7 dirs** (3 cross-edges)
- **. +3 dirs · appendChild** (2 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-20")
explore(operation:"context", task:"understand options", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
