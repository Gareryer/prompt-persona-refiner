---
name: gortex-2-dirs-escapehtml
description: "Work in the . +2 dirs · escapeHtml area — 17 symbols across 3 files (44% cohesion)"
---

# . +2 dirs · escapeHtml

17 symbols | 3 files | 44% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | setAttribute, toFixed |
| `content\observer.js` | observeElement, applyThemeToDocument, initThemeObservation, detectPageTheme |
| `sidepanel\sidepanel.js` | showPersonaPopup, handleViewPersona, escapeHtml, createPersonaListItem, loadVersionHistory, ... |

## Connected Communities

- **content +3 dirs** (22 cross-edges)
- **content +5 dirs** (17 cross-edges)
- **. +3 dirs · appendChild** (9 cross-edges)
- **. +1 dirs · spLog** (7 cross-edges)
- **. +6 dirs** (4 cross-edges)
- **. +5 dirs · includes** (3 cross-edges)
- **memory +4 dirs · map** (2 cross-edges)
- **. +5 dirs · replace** (2 cross-edges)
- **. +7 dirs** (2 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-20")
explore(operation:"context", task:"understand . +2 dirs · escapeHtml", format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
