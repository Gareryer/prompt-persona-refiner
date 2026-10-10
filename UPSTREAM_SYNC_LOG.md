# Upstream Clio Synchronization & Delta Tracking Ledger

> **Upstream Repository**: [https://github.com/martymcenroe/Clio](https://github.com/martymcenroe/Clio)  
> **Git Remote**: `upstream-clio` (`https://github.com/martymcenroe/Clio.git`)  
> **Target Subsystem**: `wxt-extension/src/core/harvest/` & `wxt-extension/src/adapters/chatbots/`  
> **Current Pinned Upstream HEAD**: `c8efed7` (October 10, 2026)  
> **Previous Baseline**: `cfa862d` (September 18, 2026)

---

## 1. Daily Tracking Commands (Native Git Workflow)

```bash
# 1. Fetch latest commits from upstream
git fetch upstream-clio main

# 2. Inspect new commits touching extension source code
git log upstream-clio/main -n 10 --oneline -- extensions/src/

# 3. View net diff against current pinned baseline
git diff c8efed7..upstream-clio/main -- extensions/src/
```

---

## 2. Upstream Commit Log & Blast-Radius Mapping

### Baseline Sync (through September 8, 2026: `7b55b08` → `bdf321e`)

| Commit | Date | PR / Issues | Summary & Upstream Findings | Blast Radius / WXT Porting Target |
| :--- | :--- | :--- | :--- | :--- |
| `8e0cc7f` | 2026-09-05 | #266 (Closes #262, #263, #264) | **ChatGPT Ordering, Outermost Pre, In-Scroll Files**<br>• Transcripts scrambled because `conversation-turn-N` is relative to rendered window (14 values across 155 turns). Replaced with invariant bottom-distance key (`scroller.scrollHeight - offsetTop`) + settled-DOM re-measurement.<br>• `closest('pre')` stopped at inner CodeMirror `pre.cm-content`, missing header labels in outer `pre.overflow-visible`. Replaced with `outermostPre()`, noise filter, and syntax sniffer.<br>• File cards and download controls evicted by React virtualization; swept in-scroll on every tick. | `src/core/harvest/scroller/virtual-cache.ts`<br>`src/core/harvest/extraction/text-sanitizer.ts`<br>`src/adapters/chatbots/chatgpt/turn-scraper.ts`<br>`src/adapters/chatbots/chatgpt/selectors.ts` |
| `3755779` | 2026-09-06 | #273 (Closes #272) | **Site-Scoped Order Reporting**<br>• Only ChatGPT extracts from capture cache; Gemini and Claude read live DOM. Introducing `ordersFromCapture: boolean` prevents false degraded warnings on Gemini and Claude. | `src/adapters/chatbots/types.ts`<br>`src/adapters/chatbots/chatgpt/adapter.ts`<br>`src/adapters/chatbots/claude/adapter.ts`<br>`src/adapters/chatbots/gemini/adapter.ts` |
| `40b18aa` | 2026-09-06 | #284 (Closes #279) | **Citation Favicon Extraction Filter**<br>• Citations render site favicons via Google favicon service (`s2.googleusercontent.com`, `t1.gstatic.com`). These fail cross-origin fetches and clog extraction errors (152 errors in 233 messages). Filtered by role and host blacklist. | `src/core/harvest/extraction/media-extractor.ts`<br>`src/adapters/chatbots/chatgpt/selectors.ts` |
| `74ac61d` | 2026-09-06 | #285 | **Content vs Media Loss Separation**<br>• Differentiate media download failures from text turn extraction loss so clean text captures report clean. | `src/core/harvest/types.ts`<br>`src/core/harvest/orchestrator.ts` |
| `2ec90a1` | 2026-09-06 | #288 | **Accurate Short Scroll Reporting**<br>• Ensure scroll routines accurately report when prematurely stopped. | `src/core/harvest/scroller/auto-scroller.ts` |
| `5ace887` | 2026-09-06 | #289 | **Ordering Residue Reporting**<br>• Mark and count unmeasured elements in export metadata (`orderInfo`). | `src/core/harvest/scroller/virtual-cache.ts` |
| `5c45837` | 2026-09-07 | #295 | **Message ID Export Fidelity**<br>• Retain native element ID on turns for export diffability. | `src/adapters/chatbots/chatgpt/turn-scraper.ts` |
| `20e882d` | 2026-09-07 | #297 | **Ephemeral MutationObserver Capture**<br>• Harvest messages from `MutationRecord.addedNodes` before fast unmounting. | `src/core/harvest/scroller/auto-scroller.ts` |
| `57c44ef` | 2026-09-07 | #301 | **Adaptive Scroll Patience**<br>• Scale delay with session latency. | `src/core/harvest/scroller/auto-scroller.ts` |
| `bdf321e` | 2026-09-08 | #325 (Closes #323, #318) | **Reasoning Surface Reporting**<br>• Identify offered reasoning traces and track whether they were captured or unexpanded. | `src/core/harvest/types.ts`<br>`src/adapters/chatbots/chatgpt/turn-scraper.ts` |

### Daily Tracking Audit: September 12, 2026 (`bdf321e` → `e1ee105`)

| Commit | Date | PR / Issues | Summary & Upstream Findings | Blast Radius / WXT Porting Target |
| :--- | :--- | :--- | :--- | :--- |
| `03bfb12` | 2026-09-08 | #334 (Closes #333) | **Handoff session artifacts**<br>• Documents 7 lessons learned regarding capture fidelity and testing. | **Zero Blast Radius** (Upstream docs only). |
| `348767f` | 2026-09-08 | #336 (Closes #335) | **Handoff session artifacts**<br>• Onboarding and full-backlog implementation sequencing. | **Zero Blast Radius** (Upstream docs only). |
| `4af34ba` | 2026-09-08 | #338 (Closes #247) | **Shared UNSUPPORTED_SITE_MESSAGE constant in popup.js**<br>• Extracted unsupported-site copy into constant to avoid test drift across 4 sites. | **Zero Blast Radius** (WXT uses M3 Sidepanel & ScraperToolbar UI architecture). |
| `078753a` | 2026-09-08 | #340 (Closes #283, #248) | **Scrubbed sidebar fixtures and fixture scrubber tool**<br>• Committed scrubbed offline DOM fixtures for Claude and Gemini sidebar tests. | **Zero Blast Radius** (Upstream offline test fixtures). |
| `ce56614` | 2026-09-08 | #341 (Closes #337) | **Compare-sweeps binomial tail statistic**<br>• Replaces fixed floor with binomial tail test for distinguishing races from structural loss. | **Zero Blast Radius** (Upstream internal benchmark tooling). |
| `8bf6d3a` | 2026-09-08 | #342 (Closes #332) | **Audit-drops detection tool**<br>• Pinpoints deterministically dropped turns from disk sweeps using role adjacency. | **Zero Blast Radius** (Upstream internal diagnostic tooling). |
| `da54f7f` | 2026-09-08 | #345 (Closes #344) | **Provider data exports runbook & checker**<br>• Adds runbook 30005 for Google Takeout / ChatGPT exports with zip checker. | **Zero Blast Radius** (Upstream runbooks and checker tool). |
| `7595df0` | 2026-09-08 | #349 (Closes #348, #346) | **Retire unreachable bucket in sweep comparison**<br>• Conditioned null distribution on observed union and tests co-occurrence. | **Zero Blast Radius** (Upstream benchmark statistics script). |
| `e1ee105` | 2026-09-08 | #351 | **Re-runnable block-one characterisation analyses**<br>• Batch runner orchestrating sweep characterisation scripts. | **Zero Blast Radius** (Upstream benchmark runner script). |

### Daily Tracking Audit: September 14, 2026 (`e1ee105` → `cfa862d`)

| Commit | Date | PR / Issues | Summary & Upstream Findings | Blast Radius / WXT Porting Target |
| :--- | :--- | :--- | :--- | :--- |
| `cfa862d` | 2026-09-13 | #353 (Closes #352) | **Handoff session artifacts 2026-09-13**<br>• Phase-0 and block-one read-out session. 3 lessons appended to `docs/lessons-learned.md`: tool limitation vs. significance test conflict, `git merge --ff-only \| tail -1` false success, and inter-turn promises to operator. | **Zero Blast Radius** (Upstream docs only — `docs/lessons-learned.md`). |

### Daily Tracking Audit: September 18, 2026 (`cfa862d` → `cfa862d`)

| Commit | Date | PR / Issues | Summary & Upstream Findings | Blast Radius / WXT Porting Target |
| :--- | :--- | :--- | :--- | :--- |
| *(None)* | 2026-09-18 | N/A | **No upstream commits detected**<br>• `upstream-clio/main` remains at `cfa862d`. Upstream has pushed no new commits since the September 14 audit. | **Zero Blast Radius** (0 new commits). Complete parity maintained. |

### Daily Tracking Audit: October 10, 2026 (`cfa862d` → `c8efed7`)

| Commit | Date | PR / Issues | Summary & Upstream Findings | Blast Radius / WXT Porting Target |
| :--- | :--- | :--- | :--- | :--- |
| `8b66278` | 2026-09-21 | #368 (Closes #360, #367) | **Data-dl gitignore retrofit**<br>• Updated `.gitignore` to ignore `data-dl`. | **Zero Blast Radius** (Upstream gitignore only). |
| `3eef08c` | 2026-09-21 | #372 | **Stop writing raw conversation DOM into fixtures**<br>• Fixture cleanup in test suites. | **Zero Blast Radius** (Upstream test fixtures). |
| `e11ff2a` | 2026-09-22 | #374 (Closes #365, #373) | **Add ESLint & code hygiene cleanups**<br>• Added eslint config; cleaned up unused vars in `popup.js` / `content.js`, exported `findClaudeAssistantContainer` & `getTimestamp`, added error causes. Bumped version 1.9.0 -> 1.9.1. | **Zero Blast Radius** (Code hygiene / linter comments. WXT uses TypeScript + React 19 M3 modular architecture; 0 selector/scraper changes). |
| `0f4f41a` | 2026-09-22 | #377 | **ADR-0216 landing script**<br>• Internal script for test workflow. | **Zero Blast Radius** (Upstream internal tooling). |
| `606cc2a` | 2026-09-22 | #380 (Closes #379) | **Take timestamps from date**<br>• Internal script fix for powershell date parsing. | **Zero Blast Radius** (Upstream internal tooling). |
| `49967a7` | 2026-09-22 | #381 (Closes #366) | **CI unit tests & linter action**<br>• GitHub Actions workflow for PR checks. | **Zero Blast Radius** (Upstream CI configuration). |
| `c3ab0e3` | 2026-09-22 | #382 | **Script for main branch checks**<br>• Branch protection configuration script. | **Zero Blast Radius** (Upstream repo admin tooling). |
| `ad41d3b` | 2026-09-22 | #386 (Closes #385) | **Handoff session artifacts 2026-09-22**<br>• Session artifact documentation. | **Zero Blast Radius** (Upstream documentation). |
| `4c0af0b` | 2026-09-23 | #388 (Closes #387) | **Remove GEMINI.md**<br>• AGY reads single global instruction file upstream. | **Zero Blast Radius** (Upstream repo rules). |
| `da29c48` | 2026-09-23 | #390 (Closes #389) | **Carry repo rules from CLAUDE.md**<br>• Agent instruction rule generation. | **Zero Blast Radius** (Upstream repo rules). |
| `73ef0be` | 2026-09-23 | #392 (Closes #391) | **Drop local cleanup fork**<br>• Removed local slash command fork. | **Zero Blast Radius** (Upstream commands). |
| `fce4ed0` | 2026-09-23 | #394 | **Remove repo-local Claude Code hooks**<br>• Hook maintenance. | **Zero Blast Radius** (Upstream agent hooks). |
| `e099974` | 2026-09-23 | #396 (Closes #395) | **Regenerate rules from CLAUDE.md**<br>• Rule generator run. | **Zero Blast Radius** (Upstream repo rules). |
| `c8efed7` | 2026-09-23 | #398 (Closes #397) | **Regenerate rules from CLAUDE.md**<br>• Rule generator run. | **Zero Blast Radius** (Upstream repo rules). |

---

## 3. Sync Status Checklist

- [x] Git remote `upstream-clio` configured and fetched (`c8efed7` verified as latest upstream HEAD).
- [x] Phase 2: Layer 1 Unified Subsystem updates (`VirtualMessageCache`, `TextSanitizer`, `MediaExtractor`, `AutoScroller`).
- [x] Phase 3: Layer 2 Platform Adapter updates (`ChatGPTTurnScraper`, `ordersFromCapture`, selectors).
- [x] Phase 4: Conformance Vitest suites (#262, #263, #264, #272, #279) passing (600 / 600 tests across 33 suites).
- [x] Phase 5: Verification & Sub-agent review complete; 100% upstream parity maintained.



