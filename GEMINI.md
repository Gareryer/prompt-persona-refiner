<!-- graft:start -->
## Graft — repo context graph

This repo is indexed in `graft/`: small linked markdown nodes that explain each
system and carry exact file:line spans, kept in sync with the code through git.

For ANY task here — understanding how something works, finding where code lives,
or scoping a change — get context from the graph before grepping or opening
source files. Re-ask freely (it's cheap) and reuse literal identifiers you
already have (symbol, error string, file name) as the query. New to this repo?
Run `graft map` first — a token-budgeted orientation (dir clusters, hubs,
hotspots), no LLM, no key.

- Run `graft ask "<your question>" --source` → ranked nodes with the relevant
  code spans inlined (each hit's ≤8-line crux by default; `--full` for whole
  definitions when the crux isn't enough). Match the tool to the task shape:
  for understanding or editing, the top node IS the answer — cite its
  `covers:` file:line spans and edit straight from `--source`. For
  exhaustive tasks ("every occurrence / every caller of this pattern"), ranked
  results are top-N, not complete — run `graft grep "<literal>"` instead
  (exhaustive over indexed files, grouped by enclosing symbol), falling back
  to raw `grep -rn` only for unindexed files.
- `graft skeleton <file>` → every definition's signature + span, ~10× cheaper
  than reading the file; use it to skim an API surface.
- `graft callers <symbol>` gives precomputed, exact edges — who calls this.
  Add `--direction out` for what it calls, or `--depth N` to walk
  transitively for the full blast radius. For structural questions, skip
  ranking and use this directly.
- Or browse: `graft/INDEX.md` lists every node; follow the links.
- Monorepos and folders of multiple repos rank fairly across sub-projects —
  hits carry `[scope/]` labels naming which one they're from. Narrow with
  `graft ask "<task>" --in <scope>/` once you know where you're working.

If a returned span is truncated ("+N more lines"), open the file at that exact
range before finalizing. Only open source files when a node genuinely lacks a
needed detail, and then at the exact file:line the node points to — never
re-read whole files.

After big code changes, refresh the graph with `graft build` (deterministic,
no API key, $0).
<!-- graft:end -->

<!-- gortex:communities:start -->
## Community Skills

| Area | Description | Explore |
|------|-------------|---------|
| Content 3 Dirs | 82 symbols | `analyze(operation:"communities", id:"community-28")` |
| 7 Dirs | 73 symbols | `analyze(operation:"communities", id:"community-7")` |
| Content 5 Dirs | 66 symbols | `analyze(operation:"communities", id:"community-9")` |
| 1 Dirs Request | 64 symbols | `analyze(operation:"communities", id:"community-0")` |
| 5 Dirs | 57 symbols | `analyze(operation:"communities", id:"community-12")` |
| 1 Dirs Splog | 52 symbols | `analyze(operation:"communities", id:"community-29")` |
| Memory 3 Dirs | 48 symbols | `analyze(operation:"communities", id:"community-17")` |
| 6 Dirs | 45 symbols | `analyze(operation:"communities", id:"community-36")` |
| 3 Dirs Appendchild | 38 symbols | `analyze(operation:"communities", id:"community-26")` |
| Memory 7 Dirs | 36 symbols | `analyze(operation:"communities", id:"community-30")` |
| 2 Dirs Bglog | 34 symbols | `analyze(operation:"communities", id:"community-6")` |
| 2 Dirs Stringify | 23 symbols | `analyze(operation:"communities", id:"community-13")` |
| 1 Dirs Extlog | 19 symbols | `analyze(operation:"communities", id:"community-11")` |
| Supabase Personas | 18 symbols | `analyze(operation:"communities", id:"community-31")` |
| Rating | 17 symbols | `analyze(operation:"communities", id:"community-21")` |
| Content 4 Dirs | 16 symbols | `analyze(operation:"communities", id:"community-22")` |
| 3 Dirs Removeeventlistener | 15 symbols | `analyze(operation:"communities", id:"community-24")` |
| Options | 15 symbols | `analyze(operation:"communities", id:"community-20")` |
| 1 Dirs Registeronetool | 14 symbols | `analyze(operation:"communities", id:"community-3")` |
| Extensions Gortex Def Execute | 13 symbols | `analyze(operation:"communities", id:"community-4")` |

<!-- gortex:communities:end -->
