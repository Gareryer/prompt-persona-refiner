---
name: gortex-2-dirs-stringify
description: "Work in the . +2 dirs · stringify area — 23 symbols across 5 files (61% cohesion)"
---

# . +2 dirs · stringify

23 symbols | 5 files | 61% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `background.js`
- `llm\llm-client.js`
- `memory\component-schemas.js`
- `memory\memory-controller.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | stringify, substr |
| `background.js` | anthropic.buildBody, openrouter.buildBody, gemini.buildBody, openai.buildBody |
| `llm\llm-client.js` | _delay, _callWithRetry, _calculateBackoff, _sanitizeApiKey, isConfigured, ... |
| `memory\component-schemas.js` | ComponentSchemas.buildSchemaHintsPrompt |
| `memory\memory-controller.js` | _estimateSize |

## Connected Communities

- **. +7 dirs** (6 cross-edges)
- **memory +7 dirs** (4 cross-edges)
- **. +5 dirs** (4 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **memory +3 dirs** (2 cross-edges)
- **. +3 dirs · removeEventListener** (2 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **. +6 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-13")
explore(operation:"context", task:"understand . +2 dirs · stringify", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
