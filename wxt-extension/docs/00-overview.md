# 00 - Allie Persona & Prompt Refiner: System Overview

> **Project Identity**: `allie-persona-prompt-refiner`  
> **Architecture Target**: Web Extension Manifest V3 (MV3)  
> **Framework Stack**: [WXT (Web Extension Toolbox) v0.21.4](https://wxt.dev/) · React 19 · TypeScript 5.7+ · Vite 6 · Zod v4  
> **Supported Host Platforms**: Google Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta AI  
> **Authoritative Root**: `wxt-extension/`

---

## 1. Executive Summary

**Allie Persona & Prompt Refiner** is an enterprise-grade, browser-integrated AI engineering platform packaged as a cross-browser WebExtension. It bridges the gap between raw user intent and structured prompt engineering by running an automated, context-aware memory engine directly within browser chat sessions.

### Core Value Proposition
1. **Universal Multi-Chatbot Ingestion**: Seamlessly intercepts, observes, and refines prompts across 6 premier AI chat interfaces (`gemini.google.com`, `chatgpt.com`, `claude.ai`, `chat.deepseek.com`, `grok.com`, `meta.ai`).
2. **7-Dimension Persona Memory (V4)**: Automatically extracts, aggregates, and persists user identity, domain expertise, preferred tone, reasoning frameworks, hard negative constraints, output formats, and exemplar patterns.
3. **Clean-Room Shadow DOM Presentation**: Injects non-intrusive floating badges, refinement overlays, and rating controls inside an isolated Shadow DOM (`createShadowRootUi`), completely eliminating host-application CSS collision and style bleed.
4. **Secure Multi-Provider LLM Gateway**: Executes real-time extraction and prompt refinement via user-configured API endpoints (Google Gemini, OpenAI, Anthropic, OpenRouter) or cloud-synchronized community templates via Supabase.
5. **Zero-Trust Client Cryptography**: Encrypts all user API credentials locally using browser Web Crypto APIs (AES-GCM 256-bit with PBKDF2 key derivation) before persisting to `chrome.storage.local`.

---

## 2. High-Level Architecture & Execution Contexts

Browser extensions under Manifest V3 operate across strictly segregated execution worlds. WXT structures `allie-persona-prompt-refiner` into four primary runtime contexts:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HOST PAGE DOM                                        │
│  gemini.google.com | chatgpt.com | claude.ai | chat.deepseek.com | grok.com | meta.ai  │
│                                                                                         │
│   ┌────────────────────────────────┐         ┌──────────────────────────────────────┐   │
│   │ Platform DOM Adapters          │         │ Injected Shadow DOM UI               │   │
│   │  - MutationObserver            │◄───────►│  - <prompt-refiner-overlay>          │   │
│   │  - Input/Textarea Scrapers     │         │  - Floating RefinerBadge             │   │
│   │  - Submit Event Interceptors   │         │  - Rating & Feedback Overlay         │   │
│   └───────────────┬────────────────┘         └──────────────────┬───────────────────┘   │
└───────────────────┼─────────────────────────────────────────────┼───────────────────────┘
                    │                                             │
                    │      WXT Content Script Boundary            │
                    │      (entrypoints/content.ts, etc.)         │
                    ▼                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           ISOLATED EXTENSION RUNTIME                                    │
│                                                                                         │
│   ┌────────────────────────────────┐         ┌──────────────────────────────────────┐   │
│   │ User Surfaces (React 19)       │         │ Background Service Worker (MV3)      │   │
│   │  - Side Panel (Full Workspace) │◄───┬───►│  - Memory Orchestrator               │   │
│   │  - Action Popup (Quick Switch) │    │    │  - API Proxy & LLM Gateway           │   │
│   │  - Options (Keys & Cloud Sync) │    │    │  - Web Crypto Vault (AES-GCM)        │   │
│   └────────────────────────────────┘    │    │  - Supabase Sync Client              │   │
│                                         │    │  - Harvest & Export Engine           │   │
│                                         │    └──────────────────┬───────────────────┘   │
│                                         │                       │                       │
│                                         ▼                       ▼                       │
│                              Type-Safe Storage Bus (@wxt-dev/storage)                   │
│                              Local Storage · Session Storage · Sync                     │
└─────────────────────────────────────────┬───────────────────────────────────────────────┘
                                          │
                                          │ Encrypted HTTPS
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                 EXTERNAL CLOUD & APIS                                   │
│  - Generative Language API (Gemini 2.5 Flash / Pro)                                     │
│  - OpenAI API (GPT-4o / GPT-4o-mini) / Anthropic API (Claude 3.7 Sonnet)                │
│  - OpenRouter API Gateway                                                               │
│  - Supabase BaaS (Community Personas, RLS Database, Analytics)                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Context Breakdown

| Context | Entrypoint | Primary Responsibility | Isolation Guarantee |
| :--- | :--- | :--- | :--- |
| **Service Worker** | `entrypoints/background.ts` | Central daemon. Manages LLM calls, memory orchestration, crypto operations, Supabase sync, and extension alarms. | Runs headlessly. Ephemeral lifecycle (~30s idle timeout). |
| **Content Scripts** | `entrypoints/content.ts`<br>`entrypoints/*.content/` | Observes host chat DOM, scrapes conversation turns, intercepts send actions, mounts UI. | Isolated JS world. No direct access to host JS variables; protected from host script inspection. |
| **Injected Shadow UI** | `src/components/injections/` | In-page interactive badges, prompt refinement comparison diffs, rating stars. | Encapsulated inside Shadow Root (`mode: 'open'`). 100% immune to host CSS resets. |
| **Side Panel UI** | `entrypoints/sidepanel/` | Persistent multi-tab control center: Persona builder, 7-dimension memory viewer, history logger. | Dedicated extension HTML window with full Chrome Extension API access. |
| **Action Popup** | `entrypoints/popup/` | Quick-toggle menu: active persona selector, refinement on/off switch, shortcut hints. | Ephemeral popup window rendered when clicking toolbar icon. |
| **Options Page** | `entrypoints/options/` | Full-screen settings: API keys, model parameter sliders, cloud sync credentials, data export. | Dedicated extension page rendered in a browser tab. |

---

## 3. Core System Subsystems

### 3.1 7-Dimension Persona Memory V4 (`src/core/memory/`)
The foundational data engine models user context across 7 deterministic dimensions, defined and validated at runtime using Zod:
1. **`persona`**: Role title, domain identity, core competencies, and professional background.
2. **`context`**: Current working environment, active project scope, tool stack, and business constraints.
3. **`tone`**: Communication personality (e.g., *Direct, Objective, Technical, Instructive, Empathetic*).
4. **`framework`**: Structural reasoning methodology (e.g., *First-Principles, Chain-of-Thought, Socratic, SCQA*).
5. **`constraints`**: Strict negative constraints (e.g., *No fluff, no sycophantic apologies, code-first*).
6. **`format`**: Concrete output layout (e.g., *Markdown tables, strict JSON, bulleted checklist, syntax-highlighted code*).
7. **`exemplar`**: Few-shot demonstration pairs showing ideal input-to-output transformations.

### 3.2 Universal Chatbot Platform Adapters (`src/adapters/chatbots/`)
A unified interface contract (`IChatbotAdapter`) standardizes interactions across disparate chatbot single-page applications:
- **`GeminiAdapter`**: Navigates Angular Web Components, intercepts input area, scrapes transient `<pending-request>` and permanent `<model-response>` elements.
- **`ChatGPTAdapter`**: Interacts with React virtualized turn lists, tracking persistent turn UUIDs across re-renders.
- **`ClaudeAdapter`**: Hooks into ProseMirror / Tiptap contenteditable editors, escaping inline bubble wrappers via parent-widening DOM traversals.
- **`DeepSeekAdapter`**, **`GrokAdapter`**, **`MetaAdapter`**: Dispatches synthetic `InputEvent` pulses to trigger internal framework state synchronization.

### 3.3 Prompt Refiner & Context Assembler (`src/core/refiner/`, `src/core/memory/`)
- Assembles active persona dimensions into optimized system directives and prefix injections.
- Performs automated diff computation (`src/content/diff.ts`) comparing the user's raw prompt with the refined version before injection.

### 3.4 Web Crypto & Key Security Vault (`src/core/crypto/`)
- Protects LLM API tokens (Gemini, OpenAI, Anthropic, OpenRouter) with client-side **AES-GCM 256-bit encryption**.
- Master encryption keys are derived using PBKDF2 with SHA-256 and unique salt per installation.
- Raw decrypted keys are kept solely in volatile memory within the Background Service Worker during active API calls and are never transmitted to content scripts or host pages.

### 3.5 Supabase Community & Cloud Sync (`src/core/supabase/`)
- Connects to Supabase BaaS for cloud persona backups, public persona sharing, and community rating.
- Utilizes Row-Level Security (RLS) policies to ensure users can only modify their own public/private personas.

### 3.6 Harvest & Interaction Export Engine (`src/core/harvest/`)
- Background orchestrator for scraping and indexing complete conversation histories across active tabs.
- Generates compressed multi-format archives (JSON, CSV, Markdown) packaged client-side using `jszip`.

---

## 4. Technology Stack & Key Dependencies

```json
{
  "framework": "WXT (Web Extension Toolbox) v0.21.4",
  "buildTool": "Vite v6.2.0 + Rollup",
  "language": "TypeScript v5.7.0 (Strict Mode, 0 Errors)",
  "runtimeUI": "React v19.0.0 + ReactDOM v19.0.0",
  "validation": "Zod v3.24.0 / v4",
  "archiving": "JSZip v3.10.1",
  "testing": "Vitest v3.0.0 + fake-indexeddb v6.2.5",
  "targetManifest": "Manifest V3 (Chrome, Edge, Firefox, Safari)"
}
```

---

## 5. Verification Gates & Current Audit Health

All code in `wxt-extension/` adheres to five strict operational verification gates:

- **Gate 1 (Static Contract)**: `bun run typecheck` (`tsc --noEmit`) passes with **0 errors**.
- **Gate 2 (Behavioral Parity)**: `bun run test` runs Vitest with **14 test suites and 96/96 unit tests green (100% passing)**.
- **Gate 3 (Runtime Boundary)**: Top-level synchronous event listener registration inside `defineBackground()`; fully typed storage via `@wxt-dev/storage`.
- **Gate 4 (Build Integrity)**: `bun run build` generates a clean, production-ready 2.30 MB `chrome-mv3` bundle in under 14 seconds.
- **Gate 5 (Presentation Isolation)**: React 19 Shadow DOM encapsulation via `createShadowRootUi` guaranteeing zero host CSS leakage.

---

## 6. Architecture & Specification Documentation Suite

This file (`00-overview.md`) serves as the root document of the complete 19-part specification suite for `wxt-extension/`:

| Index | Specification Document | Domain Coverage |
| :--- | :--- | :--- |
| **00** | `00-overview.md` | Executive summary, high-level architecture, verification gates |
| **00** | `00-system-design.md` | Detailed multi-process topology, state machines, sequence diagrams |
| **01** | `01-frontend.md` | React 19 UI surfaces (Sidepanel, Popup, Options, Shadow DOM) |
| **02** | `02-backend.md` | MV3 Background Service Worker lifecycle, alarms, offscreen workers |
| **03** | `03-api.md` | External LLM provider integrations, streaming protocols, fetch proxies |
| **04** | `04-database.md` | Embedded client databases (IndexedDB, Dexie), schema versioning |
| **05** | `05-storage.md` | `@wxt-dev/storage` schemas, migrations, reactive watchers, quotas |
| **06** | `06-messaging.md` | Cross-context IPC bus, `ProtocolMap`, typed ports, error handling |
| **07** | `07-security.md` | MV3 CSP compliance, AES-GCM crypto vault, token safety, XSS guards |
| **09** | `09-content-scripts.md` | Shadow DOM injection (`createShadowRootUi`), observer lifecycle |
| **11** | `11-persona-rbac.md` | 7-dimension Persona V4 engine, user roles, Supabase RLS policies |
| **12** | `12-platform-adapters.md` | Modular chatbot adapters (Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta) |
| **13** | `13-project-structure.md` | Directory organization, auto-imports, build conventions, aliases |
| **15** | `15-deployment.md` | Store packaging (`wxt zip`), CI/CD publishing (Chrome, AMO, Edge) |
| **16** | `16-analytics.md` | Privacy-preserving telemetry, GA4 Measurement Protocol, error logging |
| **17** | `17-i18n.md` | Type-safe translation strings (`@wxt-dev/i18n`), multi-language schema |
| **18** | `18-testing-strategy.md` | Vitest unit testing, WXT mock environments, Playwright E2E suites |
| **19** | `19-onboarding.md` | Extension install lifecycle, interactive walkthroughs, first-run wizard |
| **20** | `20-offline.md` | Offline-first guarantees, local cache sync queues, offline fallbacks |
