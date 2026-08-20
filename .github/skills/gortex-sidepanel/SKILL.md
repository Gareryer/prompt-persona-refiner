---
name: gortex-sidepanel
description: "Work in the sidepanel area — 11 symbols across 1 files (86% cohesion)"
---

# sidepanel

11 symbols | 1 files | 86% cohesion

## When to Use

Use this skill when working on files in:
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `sidepanel\sidepanel.js` | styleChips.onChange, reqChips.onChange, onUpdate, domainChips.onChange, lengthInput.onChange, ... |

## Connected Communities

- **. +7 dirs** (2 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-22")
explore(operation:"context", task:"understand sidepanel", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
