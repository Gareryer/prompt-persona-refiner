---
name: gortex-1-dirs-registeronetool
description: "Work in the . +1 dirs · registerOneTool area — 14 symbols across 2 files (80% cohesion)"
---

# . +1 dirs · registerOneTool

14 symbols | 2 files | 80% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `.pi\extensions\gortex\index.ts`

## Key Files

| File | Symbols |
|------|---------|
| `` | add, has |
| `.pi\extensions\gortex\index.ts` | safeRegister, def, registerOneTool, desc, name, ... |

## Connected Communities

- **. +1 dirs · request** (2 cross-edges)
- **. +1 dirs · piAliasNote** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-3")
explore(operation:"context", task:"understand . +1 dirs · registerOneTool", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
