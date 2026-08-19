---
name: gortex-6-dirs
description: "Work in the . +6 dirs area — 45 symbols across 10 files (73% cohesion)"
---

# . +6 dirs

45 symbols | 10 files | 73% cohesion

## When to Use

Use this skill when working on files in:
- ``
- `background.js`
- `content\scraper.js`
- `memory\analyzer-registry.js`
- `memory\analyzers\recent-focus.js`
- `memory\memory-controller.js`
- `security\runtime-security.js`
- `sidepanel\sidepanel.js`
- `supabase\schema.sql`
- `supabase\supabase-client.js`

## Key Files

| File | Symbols |
|------|---------|
| `` | padStart, slice, toUpperCase, from, charAt |
| `background.js` | getEncryptionKey, decryptApiKey |
| `content\scraper.js` | pad |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAllAnalyzers |
| `memory\analyzers\recent-focus.js` | RecentFocus.analyze |
| `memory\memory-controller.js` | _sanitizeComponentData, _truncateString |
| `security\runtime-security.js` | getSessionId, SecurityManager.getSessionId, generateKey |
| `sidepanel\sidepanel.js` | capitalizeFirst, parseExtractionResult, updateDimensionPinButton, formatMemoryKey |
| `supabase\schema.sql` | update_persona_rating, increment_import_count |
| `supabase\supabase-client.js` | searchPersonas, init, createPersona, loadSupabaseLib, getPersona, ... |

## Entry Points

- `supabase\supabase-client.js::SupabaseClient.updatePersona`
- `supabase\supabase-client.js::SupabaseClient.searchPersonas`

## Connected Communities

- **memory +7 dirs** (8 cross-edges)
- **. +7 dirs** (6 cross-edges)
- **content +4 dirs** (3 cross-edges)
- **content +5 dirs** (3 cross-edges)
- **content +3 dirs** (2 cross-edges)
- **. +5 dirs** (2 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)
- **. +1 dirs · spLog** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-36")
explore(operation:"context", task:"understand . +6 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"supabase\supabase-client.js::SupabaseClient.updatePersona"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
