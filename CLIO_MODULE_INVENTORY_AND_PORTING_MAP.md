# Clio Codebase Full Inventory & WXT Modular Porting Blueprint

> **Document Purpose**: Comprehensive technical reference auditing every module, class, function, selector, state machine, and data flow in [Clio](https://github.com/martymcenroe/Clio) (v1.4.1 / v1.6.2), paired with a modular target architecture for clean-room TypeScript porting into the `wxt-extension` framework.
> **Architecture Core Pattern**: **Platform-Specific Adapters** for DOM discovery, scroller quirks, and HTML extraction/sanitization paired with a **Unified Subsystem** for persistence (IndexedDB), media harvesting, packaging (JSZip), and batch queue orchestration.

---

## Table of Contents
1. [Executive Summary & High-Level Topology](#1-executive-summary--high-level-topology)
2. [Macro Architecture: The Dual-Layer Separation](#2-macro-architecture-the-dual-layer-separation)
   - [2.1 Why Clio's Monolith Broke Down](#21-why-clios-monolith-broke-down)
   - [2.2 Unified Subsystem vs. Platform-Specific Adapters](#22-unified-subsystem-vs-platform-specific-adapters)
3. [Micro-Level Module Inventory & Function Catalog](#3-micro-level-module-inventory--function-catalog)
   - [3.1 Content Extraction Engine (`content.js`)](#31-content-extraction-engine-contentjs)
   - [3.2 Selector Dictionaries (`selectors*.js`)](#32-selector-dictionaries-selectorsjs)
   - [3.3 Persistence & Ledger (`storage/db.js`)](#33-persistence--ledger-storagedbjs)
   - [3.4 Batch Archival Worker (`archive.js` & `archive-page.js`)](#34-batch-archival-worker-archivejs--archive-pagejs)
   - [3.5 Conversation Enumeration Engine (`enumerate.js`)](#35-conversation-enumeration-engine-enumeratejs)
   - [3.6 UI & Packaging (`popup.js`, `popup.html`, `viewer/`)](#36-ui--packaging-popupjs-popuphtml-viewer)
   - [3.7 Audio Harvesting (`recorder.js`)](#37-audio-harvesting-recorderjs)
   - [3.8 Test Harness, DOM Discovery & Reconnaissance](#38-test-harness-dom-discovery--reconnaissance)
4. [Target WXT Modular Subsystem Architecture](#4-target-wxt-modular-subsystem-architecture)
   - [4.1 Directory & File Layout](#41-directory--file-layout)
   - [4.2 The Adapter Contract: `IHarvesterAdapter`](#42-the-adapter-contract-iharvesteradapter)
   - [4.3 Platform-Specific Adapter Specifications (Gemini, Claude, ChatGPT)](#43-platform-specific-adapter-specifications)
   - [4.4 Unified Subsystem Specifications (Storage, Media, Zip, Queue)](#44-unified-subsystem-specifications)
   - [4.5 Core Type Definitions & Schemas (`src/core/harvest/types.ts`)](#45-core-type-definitions--schemas-srccoreharvesttypests)
   - [4.6 Data Flow & Message Passing Bridges](#46-data-flow--message-passing-bridges)
5. [Feature Matrix & Gap Analysis](#5-feature-matrix--gap-analysis)
6. [Gemini First-Step Implementation Blueprint](#6-gemini-first-step-implementation-blueprint)
7. [Implementation Phasing & Verification Plan](#7-implementation-phasing--verification-plan)

---

## 1. Executive Summary & High-Level Topology

Clio is an open-source, privacy-first browser extension that extracts complete multi-turn conversations from **Google Gemini**, **Anthropic Claude**, and **OpenAI ChatGPT** into structured JSON archives with local image asset bundles.

### Core Architectural Axioms
1. **Zero-Telemetry, Sovereign Local Storage**: All data stays on the user's machine (`chrome.storage.local`, IndexedDB, direct filesystem ZIP download via `chrome.downloads`).
2. **Fail-Closed for Text, Fail-Open for Images**: If core conversation prose cannot be extracted, the harvest fails loudly to avoid corrupting records; if remote image attachments fail (e.g. 404, CORS, CDN auth expiration), the error is logged as diagnostic metadata and the text extraction completes successfully.
3. **DOM-First Real-World Scraping**: Chatbot web applications employ complex, dynamically shifting layouts (CSS Grid, Shadow DOM, virtualized DOM recycling, custom web components). Extraction relies on verified DOM heuristics rather than fragile single-attribute queries.
4. **Clean Decoupling from Persona Engine**: In our target WXT architecture, the harvest engine will operate as an independent subsystem (`src/core/harvest/`). The daily real-time prompt-refiner and memory agent can trigger or consume harvested archives, but does not execute heavy scrolling or image fetching loops during standard turn monitoring.

---

## 2. Macro Architecture: The Dual-Layer Separation

### 2.1 Why Clio's Monolith Broke Down
In Clio, `content.js` is a single 1,501-line file containing the scrapers for Gemini, Claude, and ChatGPT. Although it looks like a unified script on the surface, its core logic splits into separate platform-specific routines:
- `extractTurnsClaude()` handles Claude's 2-row CSS Grid (`.row-start-1` vs `.row-start-2`) and strips interactive artifact cards (`stripArtifactWidgetChrome()`).
- `extractTurnsChatGPT()` queries `MESSAGE_CACHE` to combat ChatGPT's aggressive DOM unmounting and parses reasoning badges.
- `extractTurnsGemini()` pairs `<user-query>` and `<model-response>` inside `.conversation-container`.
- Scroller resolution requires climbing two levels above `<main>` on ChatGPT to find `div.group/scroll-root`, while Gemini and Claude use normal scroll containers.
- Enumeration hits a private REST API on Claude (`/api/organizations/.../chat_conversations`), but requires DOM scroll loops on Gemini and ChatGPT.

Copying Clio's monolithic structure into WXT would introduce significant technical debt: a massive god-object full of `if (platform === 'claude')` checks.

### 2.2 Unified Subsystem vs. Platform-Specific Adapters
Our target architecture splits the system cleanly into two layers:

```
┌────────────────────────────────────────────────────────────────────────┐
│               LAYER 1: UNIFIED SUBSYSTEM SERVICES                      │
│                  (Platform-Agnostic Engine)                            │
│  src/core/harvest/                                                     │
│   ├── storage/harvest-db.ts      (IndexedDB ledger, 5 stores)          │
│   ├── packaging/zip-builder.ts   (JSZip compressor & download worker)  │
│   ├── batch/queue-manager.ts     (Atomic queue state machine)          │
│   ├── batch/tab-worker.ts        (Tab navigation & re-injection loop)  │
│   ├── extraction/media-extractor (Fail-open data/blob/https fetcher)   │
│   └── scroller/auto-scroller.ts  (Generic MutationObserver runner)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consumes via IHarvesterAdapter
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             LAYER 2: PLATFORM-SPECIFIC MODULAR ADAPTERS                │
│                 (DOM Discovery & Extraction Quirks)                    │
│  src/adapters/chatbots/                                                │
│   ├── gemini/                    ├── claude.adapter.ts                 │
│   │    ├── adapter.ts (Harvester)│    ├── CSS Grid row-1/row-2 parser  │
│   │    ├── container-pairer.ts   │    ├── Artifact widget stripper     │
│   │    └── selectors.ts          │    └── REST API enumerator          │
│   ├── chatgpt.adapter.ts         ├── deepseek / grok / meta (Future)   │
│   │    ├── Ancestor scroll-root  │    └── Implement same contract      │
│   │    ├── Virtualization cache  │                                     │
│   │    └── Reasoning header      │                                     │
└────────────────────────────────────────────────────────────────────────┘
```

1. **The Unified Subsystem (`src/core/harvest/`)** owns everything that is platform-independent: database schemas, transaction locks, batch download pacing, zip packaging, fail-open image retry logic, and UI rendering.
2. **The Platform-Specific Adapters (`src/adapters/chatbots/`)** own all DOM logic: selectors, scroll container resolution, virtualization tracking, platform-specific HTML sanitization, and sidebar discovery.

---

## 3. Micro-Level Module Inventory & Function Catalog

### 3.1 Content Extraction Engine (`content.js`)
*Location: `scratch/Clio/extensions/src/content.js` | 1501 lines | 29 Exported Symbols*

The core content script is organized into 14 functional sections:

#### Section 1: Site Detection
- **`getSite(): 'gemini' | 'claude' | 'chatgpt' | 'unknown'`** (L18-20)
  - Inspects `SELECTORS.site` and returns active provider identifier.

#### Section 2: Utilities
- **`sanitizeFilename(filename: string): string`** (L31-39)
  - Replaces illegal filesystem characters `[/\\:*?"<>|]` and whitespace with `_`. Truncates to 200 characters. Defaults to `'untitled'`.
- **`getTimestamp(): string`** (L45-47)
  - Formats current time to ISO-like filename safe string (`YYYY-MM-DDTHH-mm-ss`).
- **`sleep(ms: number): Promise<void>`** (L54-56)
  - Standard timer wrapped in Promise.

#### Section 3: Progress Indicator
- State: `progressElement: HTMLElement | null` (L62)
- **`showProgress(message: string): void`** (L68-88)
  - Creates or updates fixed `#clio-progress` toast overlay (bottom-right, `z-index: 999999`).
- **`hideProgress(): void`** (L93-98)
  - Removes overlay node and cleans up DOM.

#### Section 4: Selector Validation
- **`validateSelectors(): { valid: boolean, missing: string[] }`** (L108-132)
  - Confirms `conversationContainer` exists and that `allMessages` (or `userMessage`/`assistantMessage`) returns at least 1 element.

#### Section 5: Streaming Detection
- **`isStreaming(): boolean`** (L142-145)
  - Tests for presence of stop buttons or animated generation classes (`SELECTORS.streamingIndicator`).

#### Section 6: Content Expansion
- **`expandAllContent(): Promise<number>`** (L158-204)
  - Finds collapsed buttons (`SELECTORS.expandButton`) and thinking toggles (`SELECTORS.thinkingToggle`).
  - Iterates and executes `.click()` with 300ms delays to allow lazy DOM subtrees to expand. Returns expanded count.

#### Section 7: Scroller Detection & Configuration
- State: `SCROLL_CONFIG` object (L217-226):
  ```js
  {
    scrollStep: 5000,
    scrollDelay: 500,
    maxScrollAttempts: 500,
    mutationTimeout: 2000,
    loadingCheckInterval: 100,
    maxLoadingWait: 15000
  }
  ```
- **`setScrollConfig(overrides: object): void`** (L232-234) & **`resetScrollConfig(): void`** (L239-249)
- **`countMessages(): number`** (L257-276)
  - Provider-specific DOM query counting top-level rendered message turns without double-counting children.
- **`isRealScroller(el: Element): boolean`** (L293-301)
  - *Critical Algorithm*: Verifies `overflowY === 'auto' || overflowY === 'scroll'` AND `scrollHeight > clientHeight`. Prevents selecting tall containers with `overflow: visible` (e.g. ChatGPT `<main>`).
- **`findScrollContainer(): Element | null`** (L307-360)
  - Checks `SELECTORS.scrollContainer` list in priority order. If unresolved, walks up parent chain from `conversationContainer` to locate scrolling ancestor (specifically handles ChatGPT `div.group/scroll-root`).

#### Section 8: Virtualized Message Capture & Auto-Scroll
- State:
  - `MESSAGE_CACHE: Map<string, { el: Element, turn: number, seq: number }>` (L379)
  - `MESSAGE_CACHE_SEQ: number` (L380)
- **`turnIndexOf(el: Element): number`** (L383-388)
  - Resolves conversation turn index from ancestor attributes (e.g. `data-testid="conversation-turn-7"` -> `7`).
- **`captureRenderedMessages(): number`** (L395-408)
  - Queries `SELECTORS.allMessages`, deep-clones nodes (`el.cloneNode(true)`), and caches by unique ID attribute (`data-message-id` or synthetic turn ID).
- **`getCapturedMessageEls(): Element[]`** (L416-423)
  - Returns cached clones sorted chronologically by `(turn, seq)`. Falls back to live DOM if cache is empty.
- **`resetMessageCache(): void`** (L426-429)
- **`waitForLoadingComplete(): Promise<void>`** (L435-447)
  - Polls every 100ms until `SELECTORS.loadingIndicator` disappears or timeout occurs.
- **`scrollToLoadAllMessages(onProgress?: (msg: string) => void): Promise<ScrollResult>`** (L459-633)
  - Attaches `MutationObserver` to scroll container to continuously capture rendered nodes into `MESSAGE_CACHE`.
  - Loops scrolling up by `scrollStep`, dispatches synthetic `new Event('scroll')`, waits for loading spinners, and terminates when scrollTop is 0 and no mutations occur over consecutive intervals.

#### Section 9: Metadata Extraction
- **`extractTitle(): string`** (L643-660)
  - Evaluates `SELECTORS.sessionTitle`, with fallback to `document.title` stripped of provider branding (` - Claude`, ` - Gemini`).
- **`extractConversationId(): string`** (L666-681)
  - Matches regex on `window.location.pathname`:
    - Claude: `/chat/([a-f0-9-]{36})`
    - ChatGPT: `/c/([a-f0-9-]{36})`
    - Gemini: `/app/([a-f0-9]+)`

#### Section 10: Turn Extraction & HTML Sanitization
- **`extractTextContent(element: Element): string`** (L692-720)
  - Clones element.
  - Strips `<style>` and `<script>` nodes (prevents web-search widget animation CSS from bleeding into text).
  - Finds all `pre code` blocks. Replaces code container with markdown code fences:
    ```
    ```[language]
    [codeText]
    ```
    ```
  - Returns clean `textContent.trim()`.
- **`extractThinking(element: Element): string | null`** (L727-733)
  - Pulls reasoning traces from `SELECTORS.thinkingContent`.
- **`findImages(element: Element, turnIndex: number): Array<{ src: string, turnIndex: number }>`** (L741-747)
- **`extractUserTurn(element: Element, index: number): TurnObject`** (L755-769)
- **`extractAssistantTurn(element: Element, index: number): TurnObject`** (L777-799)
- **`stripArtifactWidgetChrome(rootEl: Element): void`** (L828-841)
  - Claude-specific cleaner: Targets interactive artifact widgets, strips internal button nodes ("Send via Gmail", "Draft", tabs), and adds whitespace padding around `<label>` elements to prevent concatenated labels.
- **`extractAssistantTurnClaude(element: Element, index: number): TurnObject`** (L851-918)
  - Isolates reasoning from `.row-start-1` and response body from `.row-start-2`. Strips artifact chrome. Tags empty-body reasoning turns as `type: 'thinking-only'`.
- **`extractAssistantTurnChatGPT(messageEl: Element, index: number): TurnObject`** (L1001-1042)
  - Extracts model slug (`data-message-model-slug`), reasoning header text from `SELECTORS.reasoningLabel`, and markdown text from `SELECTORS.assistantContent`.
- **`extractTurnsClaude()` / `extractTurnsChatGPT()` / `extractTurnsGemini()`** (L957-1145)
  - Platform-specific turn extractors. Claude uses document position sorting (`compareDocumentPosition`), ChatGPT uses `getCapturedMessageEls()`, and Gemini uses structured `.conversation-container` pairing.
- **`extractTurns(): Promise<TurnObject[]>`** (L1152-1161)
  - Platform dispatcher.

#### Section 11: Image Extraction Pipeline
- **`getImageExtension(mimeType: string, url: string): string`** (L1173-1182)
- **`fetchImage(src: string, turnIndex: number, imageIndex: number): Promise<ImageFetchResult>`** (L1191-1261)
  - Converts base64 `data:` URIs directly to Blobs.
  - Fetches `blob:` and `https:` URLs using `fetch(src, { credentials: 'include' })`.
  - Formats output path: `images/${String(imageIndex + 1).padStart(3, '0')}.${ext}`.
  - **Fail-Open**: Traps network or CORS failures and returns `{ error, originalSrc }` without throwing.
- **`extractImages(turns: TurnObject[]): Promise<{ images: ImageFile[], errors: ErrorRecord[] }>`** (L1270-1320)
  - Downloads all images in parallel batches of 10. Links relative image paths back to turn attachment arrays.

#### Section 12: Main Extraction Orchestrator
- **`extractConversation(): Promise<ExtractionResult>`** (L1330-1429)
  - Coordinates 6-phase pipeline:
    1. Pre-flight checks (`isStreaming`, `validateSelectors`).
    2. Auto-scroll history expansion (`scrollToLoadAllMessages`).
    3. Content un-collapsing (`expandAllContent`).
    4. Metadata extraction (`extractConversationId`, `extractTitle`).
    5. Turn extraction (`extractTurns`).
    6. Image download (`extractImages`).
  - Assembles final payload `{ success, data: { metadata, messages }, images, warnings }`.

#### Section 13: Extension Message Listener
- **`chrome.runtime.onMessage.addListener(...)`** (L1436-1463)
  - Listens for `{ action: 'extract' }`. Converts image Blobs to base64 Data URLs via `FileReader` (since raw Blobs cannot cross Chrome extension message ports) and returns result asynchronously.

---

### 3.2 Selector Dictionaries (`selectors*.js`)

| Selector Key | Gemini (`selectors.js`, 85L) | Claude (`selectors-claude.js`, 91L) | ChatGPT (`selectors-chatgpt.js`, 94L) |
| :--- | :--- | :--- | :--- |
| `site` | `'gemini'` | `'claude'` | `'chatgpt'` |
| `conversationContainer` | `'.conversation-container, [data-conversation-id]'` | `'[class*="flex-1"][class*="flex-col"]'` | `'main'` |
| `sessionTitle` | `'.conversation-title, h1[data-conversation-title], h1'` | `null` (uses `document.title`) | `null` (uses `document.title`) |
| `scrollContainer` | `'#chat-history, .chat-history-scroll-container, [data-scroll-container]'` | `'[class*="flex-1"][class*="overflow-y-auto"], [data-scroll-container]'` | `'[class*="scroll-root"], main [class*="overflow-y-auto"], main'` |
| `userMessage` | `'user-query, [data-message-author-role="user"], .user-query-container'` | `'[data-testid="user-message"]'` | `'[data-message-author-role="user"]'` |
| `assistantMessage` | `'model-response, [data-message-author-role="model"], .model-response-container'` | `'.font-claude-response:not(.font-claude-response-body)'` | `'[data-message-author-role="assistant"]'` |
| `allMessages` | `'user-query, model-response, [data-message-author-role], .conversation-turn'` | `'[data-testid="user-message"], .font-claude-response:not(.font-claude-response-body)'` | `'[data-message-author-role="user"], [data-message-author-role="assistant"]'` |
| `thinkingToggle` | `'[data-test-id="model-thoughts"] button, model-thoughts button, button[aria-label*="thinking"]'` | `'.row-start-1 button[aria-expanded="false"]'` | `null` |
| `thinkingContent` | `'model-thoughts .thoughts-body, .thinking-content, .thought-process'` | `'.row-start-1'` | `null` |
| `reasoningLabel` | `null` | `null` | `'.flex.items-start.gap-3.pb-2'` |
| `responseContent` | `null` | `'.row-start-2'` | `'[data-message-author-role="assistant"]'` |
| `codeBlock` | `'pre code, .code-block code, code-block'` | `'pre code, .code-block code'` | `'pre code, pre .cm-content'` |
| `codeLanguage` | `'[data-language], .code-language, .language-label'` | `'[data-language], .language-label'` | `'pre [class*="sticky"]'` |
| `image` | `'img'` | `'img'` | `'img:not([class*="icon"]):not([alt="Profile image"])'` |
| `streamingIndicator` | `'button[aria-label*="Stop"], .streaming-indicator, .generating, [data-streaming="true"]'` | `'button[aria-label*="Stop"], [data-streaming="true"]'` | `'button[aria-label*="Stop"], [data-streaming="true"], [class*="result-streaming"]'` |
| `loadingIndicator` | `'mat-progress-spinner, .mdc-circular-progress, [role="progressbar"], [aria-busy="true"], .loading-spinner'` | `'[role="progressbar"], [aria-busy="true"], .loading-spinner'` | `'[role="progressbar"], [aria-busy="true"]'` |

---

### 3.3 Persistence & Ledger (`storage/db.js`)
*Location: `scratch/Clio/extensions/src/storage/db.js` | 252 lines*

Implements an IndexedDB persistence engine (`clio-archive`, version 1) managing conversation discovery, harvest queues, download states, and run logs.

#### Schema Definitions & Stores
1. **`accounts`**: Stores discovered user profiles. Key: `account_label`.
2. **`conversations`**: Master catalog of all known conversations.
   - Composite Primary Key: `[site, account_label, conversation_id]`.
   - Index: `by_download_status` (`download_status`: `'pending'` | `'in_progress'` | `'done'` | `'error'`).
3. **`extraction_queue`**: Work queue for bulk crawler.
   - Flat Delimited Key: `${site}::${account_label}::${conversation_id}`.
   - Index: `by_status` (`status`: `'pending'` | `'in_progress'` | `'done'`).
4. **`harvest_runs`**: Execution log. Key: `run_id` (auto-incrementing).
5. **`settings`**: Key-value configuration parameters. Key: `key`.

#### Function Catalog
- **`openDb(): Promise<IDBDatabase>`** (L32-53): Opens and upgrades database schema.
- **`convKey({ site, account_label, conversation_id }): [string, string, string]`** (L87): Generates composite key.
- **`flatKey({ site, account_label, conversation_id }): string`** (L88): Generates flat queue key.
- **`upsertAccount({ account_label, site }): Promise<void>`** (L94-95)
- **`listAccounts(): Promise<AccountRecord[]>`** (L96)
- **`upsertConversation(row: ConversationRecord): Promise<ConversationRecord>`** (L103-122):
  - Idempotent upsert: updates title and metadata but preserves `download_status`, `zip_name`, and `downloaded_at`.
- **`getConversation(keyObj): Promise<ConversationRecord | undefined>`** (L124)
- **`listConversations(filter?: { site?, account_label?, download_status? }): Promise<ConversationRecord[]>`** (L127-133)
- **`markDownloaded(keyObj, { zip_name }): Promise<void>`** (L136-146):
  - Sets `download_status: 'done'`, records timestamp, marks queue entry complete.
- **`markDownloadError(keyObj, error: any): Promise<void>`** (L149-165):
  - Sets `download_status: 'error'`, increments `attempts` counter in queue.
- **`statusCounts(filter?): Promise<{ total, pending, done, error }>`** (L168-175):
  - Aggregate status counter.
- **`enqueueExtraction(keyObj): Promise<QueueRecord>`** (L182-198):
  - Enqueues conversation if not already marked done.
- **`dequeueNext(): Promise<QueueRecord | null>`** (L209-216):
  - Atomically claims the next pending queue item and transitions status to `'in_progress'`.
- **`recordRun(runSummary: object): Promise<number>`** (L223-224)
- **`getSetting(key: string): Promise<any>`** & **`setSetting(key: string, value: any): Promise<void>`** (L226-227)
- **`clearAll(): Promise<void>`** (L230-239): Clears all object stores.

---

### 3.4 Batch Archival Worker (`archive.js` & `archive-page.js`)
*Locations: `scratch/Clio/extensions/src/archive.js` (222L), `archive-page.js` (184L)*

Coordinates multi-conversation crawling across background worker tabs.

#### Functions in `archive.js`
- **`zipName(conv: object, data?: object): string`** (L30-34):
  - Builds path: `clio-archive/${RUN_TAG}/${site}-${sanitizedTitle}-${id}.zip`.
- **`waitForTabComplete(tabId: number, timeoutMs = 45000): Promise<void>`** (L53-68):
  - Listens to `chrome.tabs.onUpdated` until status is `'complete'`.
- **`sendExtract(tabId: number): Promise<ExtractionResult>`** (L71-78):
  - Wraps `chrome.tabs.sendMessage(tabId, { action: 'extract' })`.
- **`navigateAndExtract(tabId: number, url: string, site: string): Promise<object>`** (L97-123):
  - Navigates worker tab.
  - Automatically handles dropped content scripts (`"Receiving end does not exist"`) by calling `chrome.scripting.executeScript` to re-inject selectors and `content.js`.
  - Retries with backoff if messages are still rendering.
- **`buildZip(data: object, images: ImageAttachment[]): Promise<Blob>`** (L126-138):
  - Uses `JSZip` to bundle `conversation.json` and all image files into a compressed ZIP blob.
- **`downloadZip(blob: Blob, filename: string): Promise<number>`** (L141-150):
  - Triggers silent file download using `chrome.downloads.download({ saveAs: false })`.
- **`processOne(tabId: number, conv: object, deps = DEFAULT_DEPS): Promise<ProcessResult>`** (L159-176):
  - Single conversation execution unit: navigates, extracts, creates ZIP, downloads, and updates IndexedDB ledger.
- **`runBatch(control: BatchController, deps = DEFAULT_DEPS): Promise<{ done, failed }>`** (L182-202):
  - Master loop: continuously calls `dequeueNext()`, invokes `processOne()`, checks pause/cancel hooks, and tracks pacing delay (`paceMs`).
- **`seedQueue(convs: array, site: string, account_label: string): Promise<{ enumerated, queued }>`** (L205-213):
  - Populates database catalog and extraction queue from enumerated list.

#### Functions in `archive-page.js`
- Drives UI for `archive.html`. Manages worker tab initialization, calls `enumerateInTab(tabId)`, displays progress bars, logs operations, and provides run report downloads.

---

### 3.5 Conversation Enumeration Engine (`enumerate.js`)
*Location: `scratch/Clio/extensions/src/enumerate.js` | 158 lines*

Discovers conversation IDs and titles across provider sidebars.

#### Configuration & Methods
- **`cleanTitle(text: string): string`** (L12-20):
  - Collapses whitespace and de-duplicates double-rendered tooltip text (e.g. `"Chat NameChat Name"` -> `"Chat Name"`).
- **`SITE_LISTS`** (L25-51):
  - Mapping containing item selectors, ID extractors, and URL builders:
    - Claude: `itemSelector: '[data-testid="conversation-list-item"], a[href*="/chat/"]'`, `idFromItem`: regex `/chat/([a-f0-9-]{36})`.
    - Gemini: `itemSelector: 'a[data-conversation-id], a[href*="/app/"]'`, `idFromItem`: regex `/app/([a-f0-9]+)`.
- **`collectConversations(root: Element, site: string): ConversationSummary[]`** (L54-66):
  - Extracts and deduplicates conversation items currently rendered in DOM.
- **`findListScroller(itemSelector: string): Element | null`** (L69-79):
  - Climbs parent hierarchy from list item to locate scrolling sidebar container.
- **`enumerateAll(site: string, opts?): Promise<ConversationSummary[]>`** (L86-108):
  - Incrementally scrolls sidebar downward until element count stabilizes across consecutive checks.
- **`fetchConversationListClaude(): Promise<ConversationSummary[]>`** (L115-139):
  - Fast-path for Claude: directly queries internal REST endpoint `/api/organizations/{org}/chat_conversations` in 100-item chunks.
- **`enumerateFull(site: string): Promise<ConversationSummary[]>`** (L142-150):
  - Uses API for Claude (falls back to DOM scroll), and DOM scroll for Gemini and ChatGPT.

---

### 3.6 UI & Packaging (`popup.js`, `popup.html`, `viewer/`)

#### `popup.js` (526 lines)
- **`createZip(data: object, images: ImageAttachment[]): Promise<Blob>`** (L198-223): Bundles `conversation.json` and images using JSZip.
- **`sendExtractMessage(tab: chrome.tabs.Tab): Promise<any>`** (L320-345): Dispatches extract message; if channel is closed (`"Receiving end does not exist"`), re-injects content scripts via `chrome.scripting.executeScript` and retries.
- **`handleExtract(): Promise<void>`** (L354-445): Main user action pipeline.

#### Standalone Viewer (`viewer/viewer-logic.js` & `viewer.template.html`)
- Completely offline HTML/CSS/JS viewer for loaded `.json` exports.
- Features: schema validation, file size limits (5MB warning, 20MB ceiling), multi-file sidebar navigation, bubble rendering, compact mode truncation, copy-to-clipboard, and collapsible reasoning blocks.
- **`build.js`** compiles `viewer-logic.js` into `viewer.template.html` to generate single-file `viewer.html`.

---

### 3.7 Audio Harvesting (`recorder.js`)
*Location: `scratch/Clio/extensions/src/recorder.js` | 162 lines*
- Specialized content script for `recorder.google.com`. Automatically scrolls recording library, opens recordings, downloads audio recordings from menus, and steps back.

---

### 3.8 Test Harness, DOM Discovery & Reconnaissance
*Location: `scratch/Clio/tests/` | 21 Test Files | 10 Fixtures*

1. **Jest Test Suite**:
   - 80% coverage threshold enforced across statements, branches, and functions.
   - Dual runner environments: `jsdom` for scrapers, pure `node` with `fake-indexeddb` for storage/archive tests.
   - Real captured DOM fixtures (`chatgpt-conversation.html`, `claude-conversation.html`, `gemini-conversation.html`, `sidebar-*.html`).
2. **Playwright DOM Discovery (`tests/e2e/dom-discovery.spec.js`)**:
   - Uses persistent authenticated Chrome profiles (`~/.clio-profiles/{site}/`).
   - Automatically identifies list scroll containers, calculates repetitive class fingerprints, tests lazy loading, and dumps findings to `docs/dom-dumps/`.
3. **Notebook Reconnaissance (`tests/e2e/notebook-recon.spec.js`)**:
   - Multi-stage operator-paced capture harness with network request interceptor.

---

## 4. Target WXT Modular Subsystem Architecture

### 4.1 Directory & File Layout

```
wxt-extension/src/
├── adapters/chatbots/             # LAYER 2: Platform-Specific Adapters
│    ├── types.ts                  # IChatbotAdapter + IHarvesterAdapter
│    ├── base.adapter.ts           # Shared DOM helpers
│    ├── gemini/                   # GEMINI SPECIFIC ADAPTER
│    │    ├── adapter.ts           # Implements IChatbotAdapter & IHarvesterAdapter
│    │    ├── selectors.ts         # Verified Gemini selectors (thinking, spinner, etc.)
│    │    └── container-pairer.ts  # Paired .conversation-container algorithm
│    ├── claude.adapter.ts         # Claude Grid & Artifact stripper
│    └── chatgpt.adapter.ts        # ChatGPT scroll-root & MESSAGE_CACHE
│
└── core/harvest/                  # LAYER 1: Unified Archival Subsystem
     ├── index.ts                  # Public Facade API
     ├── types.ts                  # Schemas (HarvestTurn, LedgerRow, RunRecord)
     ├── storage/
     │    └── harvest-db.ts        # Typed IndexedDB implementation (clio-archive)
     ├── packaging/
     │    └── zip-builder.ts       # JSZip wrapper with chrome.downloads
     ├── extraction/
     │    ├── text-sanitizer.ts    # Code fences & <style> stripper
     │    └── media-extractor.ts   # Fail-open data/blob/https fetcher
     ├── scroller/
     │    ├── scroller-detector.ts # isRealScroller & ancestor finder
     │    ├── virtual-cache.ts     # Map-based node cache for recycled DOMs
     │    └── auto-scroller.ts     # MutationObserver upward runner
     └── batch/
          ├── queue-manager.ts     # Atomic queue states (pending/in_progress/done)
          ├── tab-worker.ts        # Worker tab navigation & script re-injection
          └── sidebar-crawler.ts   # Sidebar scroll & REST enumeration runner
```

---

### 4.2 The Adapter Contract: `IHarvesterAdapter`

Any chatbot adapter that supports deep harvesting implements this contract:

```typescript
import type { HarvestPlatform, HarvestTurn, DiscoveredConversation } from '../core/harvest/types';

export interface IHarvesterAdapter {
  readonly platform: HarvestPlatform;

  // 1. Scroller & Container Quirks
  getScrollContainer(): HTMLElement | null;
  getLoadingIndicatorSelector(): string | null;
  getExpandButtonSelectors?(): string[];

  // 2. DOM Virtualization Handlers (true for ChatGPT, false for Gemini/Claude)
  requiresVirtualizationCache(): boolean;
  getMessageId?(el: HTMLElement): string | null;
  getTurnIndex?(el: HTMLElement): number | null;

  // 3. Platform-Specific Extraction & Sanitization
  scrapeHarvestTurns(): Promise<HarvestTurn[]>;
  sanitizeTurnNode?(clonedNode: HTMLElement): void;

  // 4. History Discovery
  enumerateConversations?(signal?: AbortSignal): Promise<DiscoveredConversation[]>;
}
```

---

### 4.3 Platform-Specific Adapter Specifications

#### Gemini Adapter (`src/adapters/chatbots/gemini/`)
- **Container Structure**: Paired `<user-query>` and `<model-response>` elements enclosed within `.conversation-container`.
- **Scroller**: `#chat-history` (standard vertical scroller).
- **Loading Indicator**: `<mat-progress-spinner>`, `.mdc-circular-progress`.
- **Thinking / CoT**: `<model-thoughts>` with `.thoughts-body`. Needs programmatic click on `[data-test-id="model-thoughts"] button` during expansion.
- **DOM Virtualization**: `requiresVirtualizationCache() === false` (Gemini does not aggressively unmount nodes).
- **Enumeration**: Sidebar scroll loop targeting `a[data-conversation-id], a[href*="/app/"]`.

#### Claude Adapter (`src/adapters/chatbots/claude.adapter.ts`)
- **Container Structure**: Modern 2-row CSS Grid layout. Row 1 (`.row-start-1`) holds thinking traces and tool-use pills (`button.group/row`). Row 2 (`.row-start-2`) holds response markdown.
- **Scroller**: `div[class*="flex-1"][class*="overflow-y-auto"]`.
- **Artifact Stripping**: Targeted cleaner that removes buttons inside `.font-ui.rounded-2xl.rounded-t-3xl...` artifact cards to prevent button text leakage into transcripts.
- **DOM Virtualization**: `requiresVirtualizationCache() === false`.
- **Enumeration Fast-Path**: Directly calls `/api/organizations/{org}/chat_conversations` (falls back to sidebar DOM scroll).

#### ChatGPT Adapter (`src/adapters/chatbots/chatgpt.adapter.ts`)
- **Ancestor Scroller Detection**: `<main>` has `overflow: visible`. Climbs ancestor tree to locate `div[class*="scroll-root"]`.
- **DOM Virtualization**: `requiresVirtualizationCache() === true`. As user scrolls up, earlier message nodes are removed from DOM. Must hook into `VirtualMessageCache`.
- **Reasoning Badges**: Header text extracted from `.flex.items-start.gap-3.pb-2`.
- **Model Slugs**: Extracted from `data-message-model-slug` attribute.

---

### 4.4 Unified Subsystem Specifications

1. **`harvest-db.ts`**: Pure TypeScript wrapper over IndexedDB using standard Web APIs. Maintains `accounts`, `conversations`, `extraction_queue`, `harvest_runs`, and `settings`.
2. **`media-extractor.ts`**: Standalone image downloader. Handles base64 `data:`, blob URLs, and authenticated HTTPS requests with `credentials: 'include'`. Operates fail-open: network drops append structured error logs to `conversation.json` without failing the export.
3. **`zip-builder.ts`**: Integrates `jszip` to format and compress `conversation.json` and `images/` directory. Dispatches silent download via `chrome.downloads.download()`.
4. **`tab-worker.ts`**: Coordinates background tabs for batch crawling. Catches dropped extension ports (`"Receiving end does not exist"`) and re-injects scripts via `chrome.scripting.executeScript`.

---

### 4.5 Core Type Definitions & Schemas (`src/core/harvest/types.ts`)

```typescript
export type HarvestPlatform = 'gemini' | 'claude' | 'chatgpt' | 'deepseek' | 'grok' | 'meta';

export interface HarvestAttachment {
  type: 'image';
  originalSrc: string;
  filename?: string;
  blob?: Blob;
  dataUrl?: string;
  turnIndex: number;
  error?: string;
}

export interface HarvestTurn {
  id: string;
  turnIndex: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  rawText?: string;
  thinking?: string | null;
  modelSlug?: string;
  attachments?: HarvestAttachment[];
  timestamp: number;
}

export interface HarvestConversationMetadata {
  site: HarvestPlatform;
  accountLabel: string;
  conversationId: string;
  title: string;
  url: string;
  extractedAt: string;
  messageCount: number;
  imageCount: number;
  partialSuccess?: boolean;
  warnings?: string[];
  scrollAttempts?: number;
}

export interface HarvestConversationRecord {
  metadata: HarvestConversationMetadata;
  messages: HarvestTurn[];
  images?: HarvestAttachment[];
}

export type DownloadStatus = 'pending' | 'in_progress' | 'done' | 'error';

export interface ConversationLedgerRow {
  site: HarvestPlatform;
  account_label: string;
  conversation_id: string;
  title: string;
  url: string;
  discovered_at: number;
  content_extracted_at?: number;
  download_status: DownloadStatus;
  zip_name?: string;
  last_error?: string;
  attempts?: number;
}

export interface DiscoveredConversation {
  site: HarvestPlatform;
  conversationId: string;
  url: string;
  title: string;
}

export interface HarvestRunRecord {
  run_id?: number;
  started_at: number;
  completed_at?: number;
  total_queued: number;
  done_count: number;
  error_count: number;
  status: 'running' | 'completed' | 'aborted';
}
```

---

### 4.6 Data Flow & Message Passing Bridges

```
┌────────────────────────────────────────────────────────────────┐
│ Sidepanel UI / Background Harvester                            │
│  - HarvestOrchestrator.extractCurrentTab()                     │
└──────────────────────────────┬─────────────────────────────────┘
                               │
            chrome.runtime.sendMessage({ action: 'HARVEST_EXTRACT' })
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│ Content Script Layer                                           │
│  1. Check Streaming status via adapter.isStreaming()           │
│  2. AutoScroller.run(adapter.getScrollContainer())             │
│  3. Expand content toggles (adapter.getExpandButtonSelectors())│
│  4. Adapter.scrapeHarvestTurns() -> HarvestTurn[]              │
│  5. MediaExtractor.downloadImages(turns) [Fail-Open]           │
│  6. Convert image Blobs to DataURLs for port transport         │
└──────────────────────────────┬─────────────────────────────────┘
                               │
            Returns HarvestConversationRecord
                               │
                               ▼
┌────────────────────────────────────────────────────────────────┐
│ Background / Storage Layer                                     │
│  1. HarvestDB.upsertConversation() (status: 'done')            │
│  2. ZipBuilder.createZip() -> Bundles conversation.json & img  │
│  3. chrome.downloads.download() -> Writes ZIP to local disk    │
└────────────────────────────────────────────────────────────────┘
```

---

## 5. Feature Matrix & Gap Analysis

| Capability | Current WXT Extension | Clio Extension | Target WXT Harvester Module |
| :--- | :--- | :--- | :--- |
| **Primary Goal** | Real-time persona analysis & prompt refiner | Multi-provider conversation backup & search | Dual: Persona Engine + Archival Harvester |
| **Supported Sites** | Gemini, Claude, ChatGPT, DeepSeek, Grok, Meta | Gemini, Claude, ChatGPT | All 6 platforms supported |
| **Claude DOM** | Outdated selectors (`[data-cds]`) | Verified Grid Selectors (`.font-claude-response`) | ClaudeAdapter with Clio verified selectors |
| **ChatGPT Scroller** | None (viewport only) | Ancestor `div.group/scroll-root` resolution | ChatGPTAdapter with `findScrollContainer()` |
| **DOM Virtualization** | None (viewport truncated) | `MESSAGE_CACHE` + `MutationObserver` (#256) | ChatGPTAdapter hooked to `VirtualMessageCache` |
| **Code Block Format** | Flattened plain text (`.textContent`) | Markdown fences (`` ```ts ``) with languages | Shared `TextSanitizer` in unified extraction |
| **Thinking / CoT** | Mixed into response text | Separated into `.thinking` or dropped | Captured cleanly into optional `turn.thinking` |
| **Claude Artifacts** | Buttons & labels leak into text | Strips card chrome via targeted selector | ClaudeAdapter with `stripArtifactWidgetChrome()` |
| **Image Extraction** | None | Batched (10), fail-open, data/blob/https | Unified `MediaExtractor` |
| **Local Persistence** | `chrome.storage.local` + Supabase | IndexedDB (`clio-archive`, 5 object stores) | Unified `HarvestDB` |
| **ZIP Export** | None | JSZip + `conversation.json` + `images/` | Unified `ZipBuilder` |
| **Batch Harvester** | None | Worker tab automation + crawl queue | Unified `BatchHarvester` |

---

## 6. Gemini First-Step Implementation Blueprint

To build the Gemini implementation cleanly:

1. **Verify & Update Gemini Selectors (`src/adapters/chatbots/gemini/selectors.ts`)**:
   - Add `thinkingToggle: '[data-test-id="model-thoughts"] button, model-thoughts button'`
   - Add `thinkingContent: 'model-thoughts .thoughts-body, .thinking-content'`
   - Add `loadingIndicator: 'mat-progress-spinner, .mdc-circular-progress'`
   - Add `scrollContainer: '#chat-history, .chat-history-scroll-container'`
2. **Implement `IHarvesterAdapter` in `GeminiAdapter`**:
   - Provide `getScrollContainer()` resolving `#chat-history`.
   - Implement `requiresVirtualizationCache(): false`.
   - Implement structured container pairing in `scrapeHarvestTurns()`:
     - Iterates `.conversation-container` elements.
     - Maps nested `<user-query>` to user turn and `<model-response>` to assistant turn.
     - Extracts thinking traces cleanly using `thinkingContent`.
     - Preserves code blocks with language fences using unified `TextSanitizer`.
     - Collects `<img>` elements within turns for `MediaExtractor`.
3. **Connect to Unified Subsystem**:
   - Verify Gemini output directly fuels `ZipBuilder` and `HarvestDB`.

---

## 7. Implementation Phasing & Verification Plan

### Phase 1: Core Type Foundations & Gemini Harvester Adapter
- Create `src/core/harvest/types.ts`.
- Add `IHarvesterAdapter` to `src/adapters/chatbots/types.ts`.
- Create `src/core/harvest/extraction/text-sanitizer.ts`.
- Implement `IHarvesterAdapter` on `GeminiAdapter`.
- Update `gemini/selectors.ts` with Clio's verified selectors.

### Phase 2: Unified Media Extraction & ZIP Packaging
- Add `jszip` dependency to `wxt-extension/package.json`.
- Implement `src/core/harvest/extraction/media-extractor.ts`.
- Implement `src/core/harvest/packaging/zip-builder.ts`.
- Wire single-conversation extraction end-to-end for Gemini.

### Phase 3: Auto-Scroller & Upward Loading
- Implement `src/core/harvest/scroller/scroller-detector.ts`.
- Implement `src/core/harvest/scroller/auto-scroller.ts`.
- Connect to `GeminiAdapter.getScrollContainer()` and `getLoadingIndicatorSelector()`.

### Phase 4: IndexedDB Persistence & Batch Queue
- Implement `src/core/harvest/storage/harvest-db.ts`.
- Implement `src/core/harvest/batch/queue-manager.ts` and `tab-worker.ts`.
- Build UI controls in WXT Sidepanel.
