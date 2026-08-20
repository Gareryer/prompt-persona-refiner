---
name: gortex-7-dirs
description: "Work in the . +7 dirs area — 72 symbols across 10 files (71% cohesion)"
---

# . +7 dirs

72 symbols | 10 files | 71% cohesion

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
| `` | log, isArray, every, reverse, values |
| `build.js` | validateSources, copyStaticFiles, build, buildCSS, buildJS, ... |
| `content\observer.js` | triggerNativeSend, getTabId |
| `content\scraper.js` | getPreviousPromptsWithRatings, getChatHistory, customScraperMethod, scrape, _findMessageContainers, ... |
| `llm\llm-client.js` | _callGemini |
| `memory\analyzers\unified-analyzer.js` | UnifiedAnalyzer.analyze |
| `memory\memory-controller.js` | _isCharArray |
| `model\model-manager.js` | deleteModel, testConnection, reject, getActiveModelId, enableModel, ... |
| `rating\rating-injector.js` | RatingInjector.findChatContainer, RatingInjector.disconnect, RatingInjector.initialize, RatingInjector.setupObserver, RatingInjector.injectAll, ... |
| `sidepanel\sidepanel.js` | loadMemoryData, onUpdate, onUpdate, onUpdate, onUpdate, ... |

## Entry Points

- `memory\analyzers\unified-analyzer.js::UnifiedAnalyzer.analyze@199`
- `content\observer.js::triggerNativeSend_L1887`
- `model\model-manager.js::ModelManager.enableModel`
- `rating\rating-injector.js::RatingInjector.setupObserver@414`

## Connected Communities

- **memory +4 dirs · validateExtractionResponse** (13 cross-edges)
- **content +5 dirs** (12 cross-edges)
- **content +3 dirs** (12 cross-edges)
- **. +6 dirs** (6 cross-edges)
- **. +2 dirs · bgLog** (5 cross-edges)
- **. +5 dirs · replace** (4 cross-edges)
- **memory +3 dirs** (3 cross-edges)
- **rating** (2 cross-edges)
- **. +5 dirs · includes** (2 cross-edges)
- **. +1 dirs · GeminiConversationScraper** (2 cross-edges)
- **memory +4 dirs · map** (2 cross-edges)
- **. +2 dirs · stringify** (2 cross-edges)
- **. +1 dirs · spLog** (2 cross-edges)
- **. +2 dirs · _getModelManager** (1 cross-edges)
- **. +2 dirs · escapeHtml** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-2")
explore(operation:"context", task:"understand . +7 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"memory\analyzers\unified-analyzer.js::UnifiedAnalyzer.analyze@199"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
