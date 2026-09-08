# Upstream Clio Synchronization & Delta Tracking Ledger

> **Upstream Repository**: [https://github.com/martymcenroe/Clio](https://github.com/martymcenroe/Clio)  
> **Git Remote**: `upstream-clio` (`https://github.com/martymcenroe/Clio.git`)  
> **Target Subsystem**: `wxt-extension/src/core/harvest/` & `wxt-extension/src/adapters/chatbots/`  
> **Current Pinned Upstream HEAD**: `bdf321e` (September 8, 2026)  
> **Previous Baseline**: `7b55b08` (v1.6.2)

---

## 1. Daily Tracking Commands (Native Git Workflow)

```bash
# 1. Fetch latest commits from upstream
git fetch upstream-clio main

# 2. Inspect new commits touching extension source code
git log upstream-clio/main -n 10 --oneline -- extensions/src/

# 3. View net diff against current pinned baseline
git diff bdf321e..upstream-clio/main -- extensions/src/
```

---

## 2. Upstream Commit Log & Blast-Radius Mapping

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

---

## 3. Sync Status Checklist

- [x] Git remote `upstream-clio` configured and fetched.
- [ ] Phase 2: Layer 1 Unified Subsystem updates (`VirtualMessageCache`, `TextSanitizer`, `MediaExtractor`, `AutoScroller`).
- [ ] Phase 3: Layer 2 Platform Adapter updates (`ChatGPTTurnScraper`, `ordersFromCapture`, selectors).
- [ ] Phase 4: Conformance Vitest suites (#262, #263, #264, #272, #279).
- [ ] Phase 5: Verification & Sub-agent review.
