---
name: gortex-6-dirs
description: "Work in the . +6 dirs area — 40 symbols across 10 files (74% cohesion)"
---

# . +6 dirs

40 symbols | 10 files | 74% cohesion

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
| `` | from, slice, padStart |
| `background.js` | decryptApiKey, getEncryptionKey |
| `content\scraper.js` | pad |
| `memory\analyzer-registry.js` | AnalyzerRegistry.getAllAnalyzers |
| `memory\analyzers\recent-focus.js` | RecentFocus.analyze |
| `memory\memory-controller.js` | _truncateString, _sanitizeComponentData |
| `security\runtime-security.js` | SecurityManager.getSessionId, getSessionId, generateKey |
| `sidepanel\sidepanel.js` | parseExtractionResult |
| `supabase\schema.sql` | increment_import_count, update_persona_rating |
| `supabase\supabase-client.js` | deletePersona, SupabaseClient, getUser, hasRatedPersona, createSavedPrompt, ... |

## Entry Points

- `supabase\supabase-client.js::SupabaseClient.updatePersona`
- `supabase\supabase-client.js::SupabaseClient.searchPersonas`

## Connected Communities

- **. +7 dirs** (6 cross-edges)
- **memory +4 dirs · validateExtractionResponse** (4 cross-edges)
- **content +5 dirs** (2 cross-edges)
- **. +5 dirs · includes** (2 cross-edges)
- **. +5 dirs · replace** (2 cross-edges)
- **content +4 dirs** (2 cross-edges)
- **. +1 dirs · spLog** (1 cross-edges)
- **. +2 dirs · bgLog** (1 cross-edges)
- **memory +4 dirs · map** (1 cross-edges)
- **. +2 dirs · stringify** (1 cross-edges)

## How to Explore

```
analyze(operation:"communities", id:"community-32")
explore(operation:"context", task:"understand . +6 dirs", format:"gcx")
relations(operation:"usages", target:{symbol:"supabase\supabase-client.js::SupabaseClient.updatePersona"}, format:"gcx")
```

_`format: "gcx"` returns the [GCX1 compact wire format](../../docs/wire-format.md) — round-trippable, ~27% fewer tokens than JSON. Drop it for JSON output; agents using `@gortex/wire` or the Go `github.com/gortexhq/gcx-go` package decode either._
