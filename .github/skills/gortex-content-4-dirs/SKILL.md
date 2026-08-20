---
name: gortex-content-4-dirs
description: "Work in the content +4 dirs area — 16 symbols across 6 files (66% cohesion)"
---

# content +4 dirs

16 symbols | 6 files | 66% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\diff.js`
- `content\observer.js`
- `memory\analyzers\unified-analyzer.js`
- `security\runtime-security.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | split, charCodeAt, reduce, fromCharCode |
| `content\diff.js` | renderDiffHtml, diffWords, escapeHtml |
| `content\observer.js` | generateDiffHTML |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer._getRatingContext |
| `security\runtime-security.js` | SecurityManager.decrypt, generateFingerprint, SecurityManager.encrypt, SecurityManager.deriveKey, deriveKey |
| `sidepanel\sidepanel.js` | getNestedValue, formatFieldLabel |

## Connected Communities

- **memory +4 dirs · map** (2 cross-edges)
- **. +3 dirs · appendChild** (2 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +2 dirs · escapeHtml** (1 cross-edges)
- **. +6 dirs** (1 cross-edges)
- **. +5 dirs · replace** (1 cross-edges)
- **content +5 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-17")
explore(operation:"context", task:"understand content +4 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
