---
name: gortex-architecture-out
description: "Work in the architecture-out area — 12 symbols across 1 files (100% cohesion)"
---

# architecture-out

12 symbols | 1 files | 100% cohesion

## When to Use

Use this skill when working on files in:
- `architecture-out\architecture.html`

## Key Files

| File | Symbols |
|------|---------|
| `architecture-out\architecture.html` | selectFlow, paint, drawEdges, renderSteps, esc, ... |

## How to Explore

```
analyze(operation:"communities", id:"community-0")
explore(operation:"context", task:"understand architecture-out", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
