---
name: gortex-content-5-dirs
description: "Work in the content +5 dirs area — 64 symbols across 8 files (66% cohesion)"
---

# content +5 dirs

64 symbols | 8 files | 66% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `content\observer.js`
- `content\templates.js`
- `memory\index.js`
- `options\model-manager-ui.js`
- `rating\rating-injector.js`
- `rating\rating-ui.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | insertBefore, querySelector, trim, contains, focus, ... |
| `content\observer.js` | showConnectionFeedback, navigateNextOriginal, switchTab, updateEmptyState, dismissErrorBanner, ... |
| `content\templates.js` | getReviewModalTemplate |
| `memory\index.js` | SmartAutoRun.setupResponseObserver, SmartAutoRun._checkForCompletedResponse |
| `options\model-manager-ui.js` | showModal, renderParameters, openAddModal, setupModalEvents, onProviderChange, ... |
| `rating\rating-injector.js` | RatingInjector.calculateTurnIndex, RatingInjector.injectIntoResponse, RatingInjector.findResponseActions |
| `rating\rating-ui.js` | updateRatingUI |
| `sidepanel\sidepanel.js` | hasActiveFilters, selectItem, showPromptDialog, handleAddTag, showModerationWarning, ... |

## Entry Points

- `content\observer.js::createReviewModal`
- `sidepanel\sidepanel.js::showReportDialog`
- `content\observer.js::injectInterface`
- `rating\rating-injector.js::RatingInjector.injectIntoResponse@285`
- `sidepanel\sidepanel.js::showModerationWarning`

## Connected Communities

- **content +3 dirs** (87 cross-edges)
- **. +7 dirs** (26 cross-edges)
- **. +3 dirs · appendChild** (12 cross-edges)
- **. +1 dirs · spLog** (7 cross-edges)
- **memory +3 dirs** (6 cross-edges)
- **. +2 dirs · escapeHtml** (4 cross-edges)
- **memory +4 dirs · map** (3 cross-edges)
- **rating** (2 cross-edges)
- **. +5 dirs · includes** (2 cross-edges)
- **. +1 dirs · extLog** (1 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (1 cross-edges)
- **. +1 dirs · ThemeController** (1 cross-edges)
- **. +5 dirs · replace** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +6 dirs** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-3")
explore(operation:"context", task:"understand content +5 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"content\observer.js::createReviewModal"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
