---
name: gortex-7-dirs
description: "Work in the . +7 dirs area — 73 symbols across 10 files (71% cohesion)"
---

# . +7 dirs

73 symbols | 10 files | 71% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `build.js`
- `content\observer.js`
- `content\scraper.js`
- `llm\llm-client.js`
- `memory\analyzers\unified-analyzer.js`
- `memory\memory-controller.js`
- `model\model-manager.js`
- `rating\rating-injector.js`
- `sidepanel\sidepanel.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | log, reverse, every, isArray, values |
| `build.js` | buildJS, validateSources, cleanOutdir, copyStaticFiles, build, ... |
| `content\observer.js` | getTabId, triggerNativeSend |
| `content\scraper.js` | scrape, getChatHistory, _getRating, hasHistory, _findMessageContainers, ... |
| `llm\llm-client.js` | _callGemini |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer.analyze |
| `memory\memory-controller.js` | _isCharArray |
| `model\model-manager.js` | resolve, init, testConnection, _makeBridgeRequest, deleteModel, ... |
| `rating\rating-injector.js` | RatingInjector.findModelResponses, RatingInjector.disconnect, RatingInjector.initialize, RatingInjector.findChatContainer, RatingInjector.setupObserver, ... |
| `sidepanel\sidepanel.js` | onUpdate, onUpdate, onUpdate, onUpdate, onUpdate, ... |

## Entry Points

- `memory\analyzers\unified-analyzer.js::UnifiedAnalyzer.analyze@199`
- `content\observer.js::triggerNativeSend_L1887`
- `model\model-manager.js::ModelManager.enableModel`
- `rating\rating-injector.js::RatingInjector.setupObserver@414`

## Connected Communities

- **memory +7 dirs** (17 cross-edges)
- **content +3 dirs** (12 cross-edges)
- **content +5 dirs** (12 cross-edges)
- **. +6 dirs** (6 cross-edges)
- **. +2 dirs · bgLog** (5 cross-edges)
- **. +1 dirs · spLog** (3 cross-edges)
- **memory +3 dirs** (3 cross-edges)
- **. +1 dirs · GeminiConversationScraper** (2 cross-edges)
- **. +5 dirs** (2 cross-edges)
- **rating** (2 cross-edges)
- **. +2 dirs · stringify** (2 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)
- **. +1 dirs · handlePersonaSearch** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-7")
explore(operation:"context", task:"understand . +7 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"memory\analyzers\unified-analyzer.js::UnifiedAnalyzer.analyze@199"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
