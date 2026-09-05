# Allie Persona & Prompt Refiner (WXT + React 19 + TypeScript)

This directory contains the modernized, fully modular implementation of Prompt Persona & Refiner built on top of [WXT (Web Extension Toolbox)](https://wxt.dev/), React 19, TypeScript, and Vite.

---

## 🚀 Key Architectural Improvements

1. **Multi-Chatbot Platform Support**:
   - **Google Gemini** (`gemini.google.com`)
   - **ChatGPT** (`chatgpt.com`, `chat.openai.com`)
   - **Claude** (`claude.ai`)
   - **DeepSeek** (`chat.deepseek.com`)
   - **Grok** (`grok.com`, `x.com/i/grok`)
   - **Meta AI** (`meta.ai`)
2. **Clean-Room Shadow DOM Injection**:
   - In-page UI components (`RefinerBadge`, `RatingOverlay`) are isolated inside a dedicated Shadow Root via `createShadowRootUi`, guaranteeing 0 CSS bleed from host chat themes.
3. **Core Persona V4 7-Dimension Memory Engine**:
   - Strict Zod runtime validators and immutable types for `persona`, `context`, `tone`, `framework`, `constraints`, `format`, and `exemplar`.
4. **Strongly-Typed Cross-Context RPC**:
   - Type-safe `ProtocolMap` and synchronous background message router.
5. **Multi-Provider LLM & Cloud Synchronization**:
   - Pluggable support for Gemini, OpenAI, Anthropic, DeepSeek, and OpenRouter with Supabase community sharing.

---

## 🛠️ Development & Build Commands

```bash
# Run TypeScript Typecheck (Gate 1)
bun run typecheck

# Run Unit Test Suite with Vitest (Gate 2)
bun run test

# Build Production WebExtension Package (Gate 4)
bun run build

# Start Live Dev Server with Hot Module Reloading
bun run dev
```

---

## 📦 Loading into Chrome / Edge / Brave

1. Navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the directory: `wxt-extension/.output/chrome-mv3`.
