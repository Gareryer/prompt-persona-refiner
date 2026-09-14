# 12 - Platform Adapters & Multi-Chatbot Architecture

> **Target Layer**: Multi-Chatbot Host DOM Interoperability  
> **Core Implementations**: `wxt-extension/src/adapters/chatbots/`  
> **Supported Platforms**: Google Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta AI  
> **Classification**: Platform DOM Adapters & Interoperability Specification

---

## 1. Overview & Architectural Rationale

Every major conversational AI platform (ChatGPT, Claude, Gemini, DeepSeek, Grok, Meta AI) employs a fundamentally different frontend architecture:
- **Google Gemini**: Uses custom Angular Web Components (`<rich-textarea>`, `<user-query>`, `<model-response>`).
- **ChatGPT**: Uses a virtualized React list that constantly recycles DOM nodes as the user scrolls.
- **Claude**: Uses a ProseMirror / Tiptap `contenteditable` editor that intercepts `keydown` events before native browser handlers.
- **DeepSeek & Grok**: Require synthetic `InputEvent` dispatches to synchronize Vue/React reactive state trees.

To prevent platform-specific quirks from polluting core business logic, **Allie Persona & Prompt Refiner** decouples all DOM manipulation behind the **`IChatbotAdapter`** abstraction layer.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Chatbot Platform Adapter Topology                                │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                       Active Content Script                                            │
│                                  (wxt-extension/entrypoints/content.ts)                                │
│                                                                                                        │
│                                     resolveChatbotAdapter(hostname)                                    │
│                                                   │                                                    │
│               ┌───────────────────┬───────────────┴───────────────┬───────────────────┐                │
│               ▼                   ▼                               ▼                   ▼                │
│      ┌─────────────────┐ ┌─────────────────┐             ┌─────────────────┐ ┌─────────────────┐       │
│      │  GeminiAdapter  │ │ ChatGPTAdapter  │             │  ClaudeAdapter  │ │ DeepSeekAdapter │  ...  │
│      └────────┬────────┘ └────────┬────────┘             └────────┬────────┘ └────────┬────────┘       │
│               │                   │                               │                   │                │
│               ▼                   ▼                               ▼                   ▼                │
│      ┌─────────────────┐ ┌─────────────────┐             ┌─────────────────┐ ┌─────────────────┐       │
│      │ gemini.google   │ │ chatgpt.com     │             │ claude.ai       │ │ chat.deepseek   │       │
│      │ Angular WebComp │ │ React Virtualize│             │ ProseMirror DOM │ │ Vue Synthetic   │       │
│      └─────────────────┘ └─────────────────┘             └─────────────────┘ └─────────────────┘       │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Universal Adapter Contract (`src/adapters/chatbots/types.ts`)

```typescript
export interface IChatbotAdapter {
  readonly platform: ChatbotPlatform;

  // Verification & Routing
  matches(hostname: string): boolean;

  // History Extraction
  scrapeTurns(): ScrapedTurn[];

  // Input Composer Manipulation
  getActiveInput(): HTMLElement | null;
  getInputText(): string;
  setInputText(text: string): boolean;

  // SPA Lifecycle & Virtualization Hooks
  onReanchor?(element: HTMLElement): void;
  resolveAnchor?(element: HTMLElement): HTMLElement;
  getSubmitButton?(): HTMLElement | null;

  // Refinement Interception
  interceptSubmit?(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void;
}
```

---

## 3. Deep Dive: Platform-Specific Adapter Implementations

### 3.1 Google Gemini Adapter (`src/adapters/chatbots/gemini/`)
- **Host**: `gemini.google.com`
- **Framework**: Angular Custom Elements
- **DOM Peculiarities**:
  - During response streaming, Gemini renders text in a transient `<pending-request>` wrapper. When generation completes, Angular tears down this DOM tree and reconstructs a permanent `<model-response>` element.
  - The adapter implements `onReanchor(element: HTMLElement)` to re-attach injected rating and prompt-diff overlays across the Angular node replacement.
- **Input Composer**: Hooks into `rich-textarea .ql-editor[contenteditable="true"]`.
- **Text Insertion**:
  ```typescript
  setInputText(text: string): boolean {
    const input = this.getActiveInput();
    if (!input) return false;
    input.innerHTML = `<p>${escapeHtml(text)}</p>`;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  ```

### 3.2 ChatGPT Adapter (`src/adapters/chatbots/chatgpt/`)
- **Hosts**: `chatgpt.com`, `chat.openai.com`
- **Framework**: React 18/19 Virtualized DOM
- **DOM Peculiarities**:
  - Turns are recycled as the user scrolls. Direct DOM references (`turnEl === previousTurnEl`) fail across scroll boundaries.
  - The adapter tracks turns using stable unique identifiers: `data-message-id` attributes and `article[data-testid^="conversation-turn-"]`.
- **Input Composer**: Targets `textarea#prompt-textarea`.
- **Submit Hook**: Binds to `button[data-testid="send-button"]` and `keydown` (`Enter` without `Shift`).

### 3.3 Claude Adapter (`src/adapters/chatbots/claude/`)
- **Host**: `claude.ai`
- **Framework**: React + ProseMirror / Tiptap
- **DOM Peculiarities**:
  - ProseMirror consumes `Enter` keystrokes inside internal event maps before global window keydown handlers fire. Submit interception hooks into capture-phase listeners (`addEventListener('keydown', handler, { capture: true })`).
  - Message bubble nodes (`[data-cds="UserMessage"]`) have constrained widths. The adapter implements `resolveAnchor()` to walk up the parent hierarchy (`findByWidening`) to find the full-width row container.

### 3.4 DeepSeek, Grok, & Meta AI Adapters
- **DeepSeek (`chat.deepseek.com`)**: Dispatches synthetic `InputEvent('input', { bubbles: true, inputType: 'insertText' })` to trigger Vue reactive binding updates.
- **Grok (`grok.com`, `x.com/i/grok`)**: Tracks message turns via `[data-testid="grok-message-turn"]`.
- **Meta AI (`meta.ai`)**: Synchronizes with Meta's Lexical editor state tree by simulating character input events.

---

## 4. Adapter Registry & Resolution (`src/adapters/chatbots/registry.ts`)

When a content script boots in any tab, the adapter registry iterates registered adapters and returns the first match based on the active `window.location.hostname`:

```typescript
// wxt-extension/src/adapters/chatbots/registry.ts
import { geminiAdapter } from './gemini.adapter';
import { chatgptAdapter } from './chatgpt.adapter';
import { claudeAdapter } from './claude.adapter';
import { deepseekAdapter } from './deepseek.adapter';
import { grokAdapter } from './grok.adapter';
import { metaAdapter } from './meta.adapter';
import type { IChatbotAdapter } from './types';

const registeredAdapters: IChatbotAdapter[] = [
  geminiAdapter,
  chatgptAdapter,
  claudeAdapter,
  deepseekAdapter,
  grokAdapter,
  metaAdapter
];

export function resolveChatbotAdapter(hostname = location.hostname): IChatbotAdapter | null {
  for (const adapter of registeredAdapters) {
    if (adapter.matches(hostname)) {
      return adapter;
    }
  }
  return null;
}
```

---

## 5. Adding a New Platform Adapter

To extend support to a new chatbot platform (e.g. Perplexity, Mistral Le Chat):
1. Implement the `IChatbotAdapter` contract in `src/adapters/chatbots/<platform>.adapter.ts`.
2. Add the hostname to `wxt.config.ts` under `manifest.host_permissions` and `content_scripts.matches`.
3. Register the instance in `src/adapters/chatbots/registry.ts`.
4. Add unit test suites in `tests/adapters/<platform>.test.ts`.
