---
name: gortex-3-dirs-removeeventlistener
description: "Work in the . +3 dirs · removeEventListener area — 15 symbols across 4 files (78% cohesion)"
---

# . +3 dirs · removeEventListener

15 symbols | 4 files | 78% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `llm\llm-client.js`
- `logging\logger.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | removeEventListener |
| `llm\llm-client.js` | handler |
| `logging\logger.js` | handler |
| `sidepanel\sidepanel.js` | cleanup, handleConfirm, handleCancel, cleanup, handleRetry, ... |

## Connected Communities

- **content +3 dirs** (3 cross-edges)
- **. +1 dirs · spLog** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-24")
explore(operation:"context", task:"understand . +3 dirs · removeEventListener", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
