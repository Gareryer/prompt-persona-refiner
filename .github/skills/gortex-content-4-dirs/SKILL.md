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
| `` | reduce, charCodeAt, split, fromCharCode |
| `content\diff.js` | diffWords, renderDiffHtml, escapeHtml |
| `content\observer.js` | generateDiffHTML |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer._getRatingContext |
| `security\runtime-security.js` | SecurityManager.deriveKey, generateFingerprint, SecurityManager.decrypt, SecurityManager.encrypt, deriveKey |
| `sidepanel\sidepanel.js` | formatFieldLabel, getNestedValue |

## Connected Communities

- **memory +7 dirs** (3 cross-edges)
- **. +6 dirs** (2 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **. +3 dirs · appendChild** (1 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **. +1 dirs · spLog** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-22")
explore(operation:"context", task:"understand content +4 dirs", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
