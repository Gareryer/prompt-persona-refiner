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
  getSelectors?(): Record<string, string[] | readonly string[] | string>;
  getStyleTokens?(): Record<string, any>;

  // Refinement Interception
  interceptSubmit?(onRefine: (prompt: string) => Promise<boolean> | boolean): () => void;
}
```

---

## 3. Selector Fallback Strategy & Platform Implementations

To survive unannounced host DOM changes, adapters utilize cascading selector arrays:

```typescript
export const GEMINI_SELECTORS = {
  input: [
    'rich-textarea .ql-editor[contenteditable="true"]',
    'div[contenteditable="true"][role="textbox"]',
    'textarea.textarea'
  ],
  submitButton: [
    'button.send-button',
    'button[aria-label*="Send"]',
    'mat-icon[data-mat-icon-name="send"]'
  ],
  turnContainer: [
    'user-query, model-response',
    '.conversation-container .turn',
    '[data-test-id="turn"]'
  ]
};
```

---

## 4. Rapid 4-Step Onboarding Guide for New Platforms (< 30 Mins)

When a new chatbot emerges (e.g. Perplexity, Mistral Le Chat):

1. **Step 1: Inspect Host DOM & Create Adapter File**:
   - Inspect input element, submit button, and message turn classes.
   - Create `src/adapters/chatbots/<platform>.adapter.ts` implementing `IChatbotAdapter`.
2. **Step 2: Implement Input Setter with Synthetic Events**:
   - Verify whether the composer uses `value`, `innerHTML`, or synthetic `InputEvent('input', { bubbles: true })`.
3. **Step 3: Register in Manifest & Registry**:
   - Add hostname to `manifest.host_permissions` and `matches` in `wxt.config.ts`.
   - Add instance to `registeredAdapters` array in `src/adapters/chatbots/registry.ts`.
4. **Step 4: Add Unit Suite in `tests/adapters/`**:
   - Add DOM fixture test ensuring `getActiveInput()` and `scrapeTurns()` pass cleanly.
