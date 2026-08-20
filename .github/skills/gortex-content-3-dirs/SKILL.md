---
name: gortex-content-3-dirs
description: "Work in the content +3 dirs area — 82 symbols across 6 files (66% cohesion)"
---

# content +3 dirs

82 symbols | 6 files | 66% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `content\scraper.js`
- `rating\rating-injector.js`
- `rating\rating-ui.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | then, forEach, cloneNode, blur, getElementById, ... |
| `content\observer.js` | api.setEnabled |
| `content\scraper.js` | _extractContent |
| `rating\rating-injector.js` | RatingInjector.handleNewNode |
| `rating\rating-ui.js` | highlightStars, setStarsRating |
| `sidepanel\sidepanel.js` | navigateToPersonaPage, savePersonaToStorage, openPromptPreviewDialog, isFactDisabled, closeSourcePromptViewer, ... |

## Entry Points

- `sidepanel\sidepanel.js::setupPersonaNavigation`
- `sidepanel\sidepanel.js::renderAllComponents`
- `sidepanel\sidepanel.js::setupButtonHandlers`
- `sidepanel\sidepanel.js::showRatingPrompt`
- `rating\rating-injector.js::RatingInjector.handleNewNode@462`

## Connected Communities

- **content +5 dirs** (62 cross-edges)
- **. +3 dirs · appendChild** (43 cross-edges)
- **. +1 dirs · spLog** (31 cross-edges)
- **. +7 dirs** (17 cross-edges)
- **. +2 dirs · bgLog** (15 cross-edges)
- **memory +4 dirs · map** (13 cross-edges)
- **. +2 dirs · escapeHtml** (8 cross-edges)
- **. +6 dirs** (7 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (6 cross-edges)
- **. +5 dirs · includes** (5 cross-edges)
- **content +4 dirs** (4 cross-edges)
- **. +3 dirs · removeEventListener** (4 cross-edges)
- **. +5 dirs · replace** (3 cross-edges)
- **memory +3 dirs** (3 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-24")
explore(operation:"context", task:"understand content +3 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"sidepanel\sidepanel.js::setupPersonaNavigation"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
