# Multi-Chatbot Platform Adapters

## 📌 Architectural Overview
Decouples all platform-specific DOM selectors, input mechanisms, and turn observation into unified `IChatbotAdapter` implementations.

### Supported Platforms:
1. **Gemini** (`gemini.google.com`): Angular Web Components, transient turn re-anchoring.
2. **ChatGPT** (`chatgpt.com`, `chat.openai.com`): React virtualization, UUID node tracking.
3. **Claude** (`claude.ai`): ProseMirror / Tiptap editor, user message widening.
4. **DeepSeek** (`chat.deepseek.com`): Controlled input events.
5. **Grok** (`grok.com`, `x.com/i/grok`): Tweet and Grok composer inputs.
6. **Meta AI** (`meta.ai`): Contenteditable rich composer.
