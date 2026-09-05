# Clio Codebase Full Inventory & WXT Modular Porting Blueprint

> **Document Purpose**: Comprehensive technical reference auditing every module, class, function, selector, state machine, and data flow in [Clio](https://github.com/martymcenroe/Clio) (v1.4.1 / v1.6.2), paired with a modular target architecture for clean-room TypeScript porting into the `wxt-extension` framework.
> **Architecture Goal**: Port Clio's deep extraction, auto-scroll, virtualized DOM cache, image harvesting, IndexedDB ledger, ZIP export, and batch download capabilities as a **standalone, self-contained subsystem** (`src/core/harvest/`) without bloating or destabilizing existing persona and prompt refinement pipelines.

---

## Table of Contents
1. [Executive Summary & High-Level Topology](#1-executive-summary--high-level-topology)
2. [Macro Architecture: Clio vs. WXT Target](#2-macro-architecture-clio-vs-wxt-target)
3. [Micro-Level Module Inventory & Function Catalog](#3-micro-level-module-inventory--function-catalog)
   - [3.1 Content Extraction Engine (`content.js`)](#31-content-extraction-engine-contentjs)
   - [3.2 Selector Dictionaries (`selectors*.js`)](#32-selector-dictionaries-selectorsjs)
   - [3.3 Persistence & Ledger (`storage/db.js`)](#33-persistence--ledger-storagedbjs)
   - [3.4 Batch Archival Worker (`archive.js` & `archive-page.js`)](#34-batch-archival-worker-archivejs--archive-pagejs)
   - [3.5 Conversation Enumeration Engine (`enumerate.js`)](#35-conversation-enumeration-engine-enumeratejs)
   - [3.6 UI & Packaging (`popup.js`, `popup.html`, `viewer/`)](#36-ui--packaging-popupjs-popuphtml-viewer)
   - [3.7 Audio Harvesting (`recorder.js`)](#37-audio-harvesting-recorderjs)
   - [3.8 Test Harness, DOM Discovery & Reconnaissance](#38-test-harness-dom-discovery--reconnaissance)
4. [Target WXT Modular Subsystem Architecture (`src/core/harvest/`)](#4-target-wxt-modular-subsystem-architecture-srccoreharvest)
   - [4.1 Directory & File Layout](#41-directory--file-layout)
   - [4.2 Core Type Definitions & Schemas](#42-core-type-definitions--schemas)
   - [4.3 Adapter Extension Pattern (`IHarvesterAdapter`)](#43-adapter-extension-pattern-iharvesteradapter)
   - [4.4 Data Flow & Message Passing Bridges](#44-data-flow--message-passing-bridges)
5. [Feature Matrix & Gap Analysis](#5-feature-matrix--gap-analysis)
6. [Implementation Phasing & Verification Plan](#6-implementation-phasing--verification-plan)

---

## 1. Executive Summary & High-Level Topology

Clio is an open-source, privacy-first browser extension that extracts complete multi-turn conversations from **Google Gemini**, **Anthropic Claude**, and **OpenAI ChatGPT** into structured JSON archives with local image asset bundles.

### Core Architectural Axioms
1. **Zero-Telemetry, Sovereign Local Storage**: All data stays on the user's machine (`chrome.storage.local`, IndexedDB, direct filesystem ZIP download via `chrome.downloads`).
2. **Fail-Closed for Text, Fail-Open for Images**: If core conversation prose cannot be extracted, the harvest fails loudly to avoid corrupting records; if remote image attachments fail (e.g. 404, CORS, CDN auth expiration), the error is logged as diagnostic metadata and the text extraction completes successfully.
3. **DOM-First Real-World Scraping**: Chatbot web applications employ complex, dynamically shifting layouts (CSS Grid, Shadow DOM, virtualized DOM recycling, custom web components). Extraction relies on verified DOM heuristics rather than fragile single-attribute queries.
4. **Clean Decoupling from Persona Engine**: In our target WXT architecture, the harvest engine will operate as an independent subsystem (`src/core/harvest/`). The daily real-time prompt-refiner and memory agent can trigger or consume harvested archives, but does not execute heavy scrolling or image fetching loops during standard turn monitoring.

---

## 2. Macro Architecture: Clio vs. WXT Target

```
CLIO MONOLITHIC RUNTIME (Vanilla JS + Globals)
┌────────────────────────────────────────────────────────────────────────┐
│ Global Scope: window.SELECTORS (Injected per-site before content.js)   │
├────────────────────────────────────────────────────────────────────────┤
│ content.js (1501 lines):                                               │
│  ├── Virtualized DOM Cache (MESSAGE_CACHE)                             │
│  ├── Upward Auto-Scroll & MutationObserver Loop                        │
│  ├── Markdown Code Block Synthesizer                                   │
│  ├── Claude Grid & Artifact Widget Sanitizer                           │
│  └── Binary Image Fetcher (data:, blob:, https: w/ credentials)        │
├────────────────────────────────────────────────────────────────────────┤
│ popup.js (526 lines) & archive.js (222 lines):                         │
│  ├── JSZip Archive Construction                                        │
│  ├── chrome.downloads File Dispatcher                                  │
│  ├── Tab Re-injection & Connection Recovery                            │
│  └── IndexedDB Ledger (clio-archive database)                          │
└────────────────────────────────────────────────────────────────────────┘

                                    ▼ PORTED & MODULARIZED TO

WXT EXTENSION TARGET ARCHITECTURE (TypeScript + Reactive Services)
┌────────────────────────────────────────────────────────────────────────┐
│ src/adapters/chatbots/ (Existing Adapters Extended with IHarvester)    │
│  ├── GeminiAdapter      ├── ClaudeAdapter     ├── ChatGPTAdapter       │
│  └── DeepSeekAdapter    └── GrokAdapter       └── MetaAdapter          │
├────────────────────────────────────────────────────────────────────────┤
│ src/core/harvest/ (NEW Isolated Archival & Extraction Subsystem)       │
│  ├── types.ts                   (Zod/TS Schemas for Conversations/Ledger)│
│  ├── scroller/                                                         │
│  │    ├── scroller-detector.ts  (isRealScroller, ancestor walker)      │
│  │    ├── virtual-cache.ts      (MessageCache Map, eviction protection)│
│  │    └── auto-scroller.ts      (MutationObserver, event pump)         │
│  ├── extraction/                                                       │
│  │    ├── text-sanitizer.ts     (Code-fence synthesizer, style strip)  │
│  │    ├── artifact-cleaner.ts   (Claude card chrome & button stripping)  │
│  │    └── media-extractor.ts    (Batched image fetcher, fail-open)     │
│  ├── storage/                                                          │
│  │    └── harvest-db.ts         (Typed IndexedDB: conversations, runs) │
│  ├── packaging/                                                        │
│  │    └── zip-service.ts        (JSZip packager, JSON schema validator)│
│  ├── batch/                                                            │
│  │    ├── queue-manager.ts      (Enqueue/dequeue state transitions)    │
│  │    ├── tab-worker.ts         (Tab navigation, re-injection recovery)│
│  │    └── sidebar-crawler.ts    (Claude API + DOM scroll enumeration)  │
│  └── services/                                                         │
│       └── harvest-orchestrator.ts (Facade API for Sidepanel / UI)      │
└────────────────────────────────────────────────────────────────────────┘
```

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

## 4. Target WXT Modular Subsystem Architecture (`src/core/harvest/`)

To preserve the clean separation of concerns in our WXT extension, we port Clio as a **dedicated, self-contained module** under `wxt-extension/src/core/harvest/`.

```
wxt-extension/src/
├── adapters/chatbots/             # Existing chatbot adapters
│    ├── base.adapter.ts           # Base adapter
│    ├── gemini/adapter.ts         # Implements IChatbotAdapter & IHarvesterAdapter
│    ├── claude.adapter.ts         # Implements IChatbotAdapter & IHarvesterAdapter
│    └── chatgpt.adapter.ts        # Implements IChatbotAdapter & IHarvesterAdapter
└── core/
     ├── memory/                   # Existing: Real-time working memory & analyzers
     ├── extractor/                # Existing: Persona extraction logic
     └── harvest/                  # NEW: Clio-derived Archival Subsystem
          ├── index.ts             # Public API entry point
          ├── types.ts             # Schemas for Conversations, Turns, Archive, Ledger
          ├── scroller/
          │    ├── scroller-detector.ts  # isRealScroller & ancestor container resolver
          │    ├── virtual-cache.ts      # MessageCache Map & MutationObserver buffer
          │    └── auto-scroller.ts      # Upward scroll runner & loading indicator waiter
          ├── extraction/
          │    ├── text-sanitizer.ts     # Markdown code block builder & CSS/style stripper
          │    ├── artifact-cleaner.ts   # Claude card chrome & button stripper
          │    └── media-extractor.ts    # Fail-open binary/base64 image downloader
          ├── storage/
          │    └── harvest-db.ts         # Typed IndexedDB ledger (conversations, queue, runs)
          ├── packaging/
          │    └── zip-builder.ts        # JSZip packaging & disk download dispatcher
          ├── batch/
          │    ├── queue-manager.ts      # Enqueue/dequeue state machine
          │    ├── tab-worker.ts         # Headless worker tab navigator & re-injector
          │    └── sidebar-crawler.ts    # Sidebar lazy-scroll & REST enumerator
          └── orchestrator.ts            # High-level facade for UI and background jobs
```

---

### 4.1 Core Type Definitions & Schemas (`src/core/harvest/types.ts`)

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

### 4.2 Adapter Extension Pattern (`IHarvesterAdapter`)

Rather than rewriting existing adapters, we define an optional companion interface `IHarvesterAdapter`. Adapters implementing this interface provide the harvest engine with verified selectors and specialized DOM cleaning routines:

```typescript
export interface IHarvesterAdapter {
  readonly platform: HarvestPlatform;

  // Scroller & Container Selectors
  getScrollContainer(): HTMLElement | null;
  getLoadingIndicatorSelector?(): string;
  getExpandButtonSelectors?(): string[];

  // Virtualization Identifiers
  getMessageId(el: HTMLElement): string | null;
  getTurnIndex(el: HTMLElement): number | null;

  // Platform Sanitizers
  sanitizeNode?(clonedNode: HTMLElement): void;
  extractReasoning?(el: HTMLElement): string | null;
  extractModelSlug?(el: HTMLElement): string | null;
}
```

---

### 4.3 Data Flow & Message Passing Bridges

```
┌─────────────────────────────────────────────────────────────┐
│ Sidepanel UI / Background Harvester                         │
│  - Calls HarvestOrchestrator.extractCurrentTab()            │
│  - Calls HarvestOrchestrator.startBatchHarvest(site, label) │
└──────────────────────────────┬──────────────────────────────┘
                               │
            chrome.runtime.sendMessage({ action: 'HARVEST_EXTRACT' })
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Content Script (content/harvest-content.ts)                 │
│  1. Check Streaming Indicator via active adapter            │
│  2. AutoScroller.run() -> Upward scroll + DOM un-virtualize │
│  3. Expand collapsed content toggles                        │
│  4. Extract metadata & conversation ID                      │
│  5. TextSanitizer.extractMarkdown() on cached turns         │
│  6. MediaExtractor.downloadImages() (Fail-Open)             │
│  7. Convert image Blobs to DataURLs for port transport      │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Returns payload { metadata, messages, images }
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Harvest Storage & Packaging (background / sidepanel)        │
│  1. Upsert conversation in HarvestDB (IndexedDB)            │
│  2. ZipBuilder.createZip() -> Bundles JSON + images/        │
│  3. chrome.downloads.download() -> Saves local ZIP          │
│  4. Mark status: 'done' in HarvestDB ledger                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Feature Matrix & Gap Analysis

| Capability | Current WXT Extension | Clio Extension | Target WXT Harvester Module |
| :--- | :--- | :--- | :--- |
| **Primary Goal** | Real-time persona analysis & prompt refiner | Multi-provider conversation backup & search | Dual: Persona Engine + Archival Harvester |
| **Supported Sites** | Gemini, Claude, ChatGPT, DeepSeek, Grok, Meta | Gemini, Claude, ChatGPT | All 6 platforms supported |
| **Claude DOM** | Outdated selectors (`[data-cds]`) | Verified Grid Selectors (`.font-claude-response`) | Adopt Clio verified grid selectors |
| **ChatGPT Scroller** | None (viewport only) | Ancestor `div.group/scroll-root` resolution | Port `findScrollContainer()` & `isRealScroller()` |
| **DOM Virtualization** | None (viewport truncated) | `MESSAGE_CACHE` + `MutationObserver` (#256) | Port `VirtualMessageCache` |
| **Code Block Format** | Flattened plain text (`.textContent`) | Markdown fences (`` ```ts ``) with languages | Port markdown-preserving `TextSanitizer` |
| **Thinking / CoT** | Mixed into response text | Separated into `.thinking` or dropped | Capture cleanly into optional `turn.thinking` |
| **Claude Artifacts** | Buttons & labels leak into text | Strips card chrome via targeted selector | Port `stripArtifactWidgetChrome()` |
| **Image Extraction** | None | Batched (10), fail-open, data/blob/https | Port `MediaExtractor` |
| **Local Persistence** | `chrome.storage.local` + Supabase | IndexedDB (`clio-archive`, 5 object stores) | Port `HarvestDB` (IndexedDB) |
| **ZIP Export** | None | JSZip + `conversation.json` + `images/` | Port `ZipBuilder` |
| **Batch Harvester** | None | Worker tab automation + crawl queue | Port `BatchHarvester` |
| **Offline Viewer** | None | Standalone single-file HTML viewer | Port Viewer UI into Sidepanel tab |

---

## 6. Implementation Phasing & Verification Plan

### Phase 1: Selector Stabilization & Text Quality (Immediate ROI)
- Update `claude.adapter.ts` to modern CSS grid selectors (`[data-testid="user-message"]`, `.font-claude-response:not(...)`).
- Integrate `stripArtifactWidgetChrome()` into Claude turn scraping.
- Add markdown code block synthesizer (`extractTextContent`) across Gemini, Claude, and ChatGPT adapters.
- Update `ScrapedTurn` in `core/types.ts` with optional `thinking?: string | null`.

### Phase 2: Virtualization & Auto-Scroll Engine
- Implement `src/core/harvest/scroller/scroller-detector.ts` (`isRealScroller`, ancestor walker).
- Implement `src/core/harvest/scroller/virtual-cache.ts` (`MessageCache` Map).
- Implement `src/core/harvest/scroller/auto-scroller.ts` with `MutationObserver` event loop yielding.

### Phase 3: Media Extraction & Export Packaging
- Add `jszip` to `wxt-extension/package.json`.
- Implement `src/core/harvest/extraction/media-extractor.ts` (data/blob/https fetcher).
- Implement `src/core/harvest/packaging/zip-builder.ts` with `chrome.downloads` integration.

### Phase 4: IndexedDB Ledger & Multi-Chat Batch Harvester
- Implement `src/core/harvest/storage/harvest-db.ts` with `accounts`, `conversations`, `extraction_queue`, and `harvest_runs`.
- Implement `src/core/harvest/batch/sidebar-crawler.ts` and `tab-worker.ts` for automated queue crawling.
- Expose harvest controls in WXT Sidepanel UI.
