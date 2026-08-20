---
name: gortex-3-dirs-appendchild
description: "Work in the . +3 dirs · appendChild area — 45 symbols across 4 files (67% cohesion)"
---

# . +3 dirs · appendChild

45 symbols | 4 files | 67% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `rating\rating-ui.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | toUpperCase, charAt, appendChild, createElement |
| `content\observer.js` | toggleSplitView, createRefineToggle, updateModelIndicator, createSettingsIcon, updateState |
| `rating\rating-ui.js` | createRatingUI |
| `sidepanel\sidepanel.js` | populateEditableTags, renderExtTone, renderContext, createRipple, renderExtFramework, ... |

## Entry Points

- `sidepanel\sidepanel.js::renderExtStyle`
- `sidepanel\sidepanel.js::renderExtFocus`
- `sidepanel\sidepanel.js::renderExtIntent`
- `sidepanel\sidepanel.js::createContextEditableTagList`
- `sidepanel\sidepanel.js::createEditableTagList`

## Connected Communities

- **content +3 dirs** (80 cross-edges)
- **content +5 dirs** (16 cross-edges)
- **. +6 dirs** (5 cross-edges)
- **. +7 dirs** (4 cross-edges)
- **. +2 dirs · bgLog** (4 cross-edges)
- **memory +3 dirs** (3 cross-edges)
- **memory +4 dirs · map** (3 cross-edges)
- **. +5 dirs · replace** (3 cross-edges)
- **. +5 dirs · includes** (3 cross-edges)
- **. +1 dirs · spLog** (1 cross-edges)
- **sidepanel** (1 cross-edges)
- **. +2 dirs · escapeHtml** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-22")
explore(operation:"context", task:"understand . +3 dirs · appendChild", format:"gcx")
relations(operation:"usages", target:{symbol:"sidepanel\sidepanel.js::renderExtStyle"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
