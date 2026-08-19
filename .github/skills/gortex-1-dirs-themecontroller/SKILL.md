---
name: gortex-1-dirs-themecontroller
description: "Work in the . +1 dirs · ThemeController area — 11 symbols across 2 files (80% cohesion)"
---

# . +1 dirs · ThemeController

11 symbols | 2 files | 80% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `theme\theme-controller.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | indexOf, splice |
| `theme\theme-controller.js` | getMode, ThemeController, init, setMode, getIcon, ... |

## Entry Points

- `theme\theme-controller.js::ThemeController.init`

## Connected Communities

- **. +7 dirs** (2 cross-edges)
- **. +2 dirs · bgLog** (2 cross-edges)
- **content +3 dirs** (1 cross-edges)
- **. +3 dirs · removeEventListener** (1 cross-edges)
- **. +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-33")
explore(operation:"context", task:"understand . +1 dirs · ThemeController", format:"gcx")
relations(operation:"usages", target:{symbol:"theme\theme-controller.js::ThemeController.init"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
