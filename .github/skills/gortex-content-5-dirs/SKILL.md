---
name: gortex-content-5-dirs
description: "Work in the content +5 dirs area — 66 symbols across 8 files (66% cohesion)"
---

# content +5 dirs

66 symbols | 8 files | 66% cohesion

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
| `` | focus, contains, querySelector, insertBefore, trim, ... |
| `content\observer.js` | updateEmptyState, navigatePrevOriginal, dismissErrorBanner, navigateNextRefined, typeText, ... |
| `content\templates.js` | getReviewModalTemplate |
| `memory\index.js` | SmartAutoRun.setupResponseObserver, SmartAutoRun._checkForCompletedResponse |
| `options\model-manager-ui.js` | showModal, setupModalEvents, getModalFormData, openEditModal, renderParameters, ... |
| `rating\rating-injector.js` | RatingInjector.findResponseActions, RatingInjector.injectIntoResponse, RatingInjector.calculateTurnIndex |
| `rating\rating-ui.js` | updateRatingUI |
| `sidepanel\sidepanel.js` | setupM3Dropdown, setupAccordions, handleAddContextTag, handleExtAddTag, setupExpandModal, ... |

## Entry Points

- `content\observer.js::createReviewModal`
- `sidepanel\sidepanel.js::showReportDialog`
- `content\observer.js::injectInterface`
- `rating\rating-injector.js::RatingInjector.injectIntoResponse@285`
- `sidepanel\sidepanel.js::showModerationWarning`

## Connected Communities

- **content +3 dirs** (99 cross-edges)
- **. +7 dirs** (26 cross-edges)
- **. +3 dirs · appendChild** (12 cross-edges)
- **. +1 dirs · spLog** (7 cross-edges)
- **memory +3 dirs** (6 cross-edges)
- **memory +7 dirs** (5 cross-edges)
- **. +5 dirs** (2 cross-edges)
- **rating** (2 cross-edges)
- **. +1 dirs · ThemeController** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **. +6 dirs** (1 cross-edges)
- **. +1 dirs · extLog** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-9")
explore(operation:"context", task:"understand content +5 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"content\observer.js::createReviewModal"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
