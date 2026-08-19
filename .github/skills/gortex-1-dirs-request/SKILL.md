---
name: gortex-1-dirs-request
description: "Work in the . +1 dirs · request area — 64 symbols across 2 files (92% cohesion)"
---

# . +1 dirs · request

64 symbols | 2 files | 92% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `.pi\extensions\gortex\index.ts`

## Key Files

| File | Symbols |
|------|---------|
| `` | delete, slice, indexOf, stringify, toLowerCase, ... |
| `.pi\extensions\gortex\index.ts` | childEnv, timeoutMs, listTools, env, searchStart, ... |

## Connected Communities

- **. +1 dirs · registerOneTool** (3 cross-edges)
- **. +1 dirs · piAliasNote** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-0")
explore(operation:"context", task:"understand . +1 dirs · request", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
