---
name: gortex-rating
description: "Work in the rating area — 17 symbols across 2 files (73% cohesion)"
---

# rating

17 symbols | 2 files | 73% cohesion

## When to Use

Use this skill when working on files in:
- `rating\rating-injector.js`
- `rating\rating-manager.js`

## Key Files

| File | Symbols |
|------|---------|
| `rating\rating-injector.js` | RatingInjector.refreshAll |
| `rating\rating-manager.js` | load, clearAll, ratingLog, getRating, setRating, ... |

## Entry Points

- `rating\rating-manager.js::RatingManager.restoreFromStorage`

## Connected Communities

- **. +7 dirs** (7 cross-edges)
- **memory +7 dirs** (5 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **. +2 dirs · bgLog** (2 cross-edges)
- **. +6 dirs** (2 cross-edges)
- **memory +3 dirs** (1 cross-edges)
- **content +4 dirs** (1 cross-edges)
- **content +5 dirs** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-21")
explore(operation:"context", task:"understand rating", format:"gcx")
relations(operation:"usages", target:{symbol:"rating\rating-manager.js::RatingManager.restoreFromStorage"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
