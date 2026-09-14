# 00 - Allie Persona & Prompt Refiner: System Overview

> **Project Identity**: `allie-persona-prompt-refiner`  
> **Architecture Target**: Web Extension Manifest V3 (MV3) · Service-Oriented Architecture (SOA)  
> **Framework Stack**: [WXT (Web Extension Toolbox) v0.21.4](https://wxt.dev/) · React 19 · TypeScript 5.7+ · Vite 6 · Zod v4  
> **Supported Host Platforms**: Google Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta AI  
> **Authoritative Root**: `wxt-extension/`  
> **Status**: Production Reference Specification

---

## 1. Executive Summary & Design Origins

**Allie Persona & Prompt Refiner** is an enterprise-grade, browser-integrated AI context orchestration platform. Its architectural foundation synthesizes lessons learned from five leading production WebExtension codebases:
1. **Superfill.ai**: Service-Oriented Architecture with RPC proxy services, `@webext-core/messaging`, TanStack Query + `storage.watch()` reactive state sync, and AES-256-GCM encryption.
2. **Text Polish**: Universal content script submit interception and inline diff visualization.
3. **Sidepanel Template**: Clean React 19 sidepanel window routing and split-view management.
4. **BewlyBewly**: Multi-platform CSS isolation and deep Shadow DOM containment.
5. **GPT-Runner**: Cross-provider LLM API gateway and multi-turn conversational harvesting.

**Core Chosen Pattern**: **Service-Oriented Architecture (SOA)** with **Local-First Persistence** and **Clean-Room Shadow DOM UI Injection**.

---

## 2. Key Architectural Principles

1. **Local-First (Zero Cloud Lock-In)**: All primary user data—personas, custom prompt dimensions, scraped turn histories, and encrypted keys—reside permanently on the local machine in `chrome.storage.local` and IndexedDB. Cloud synchronization with Supabase is strictly opt-in.
2. **Platform-Agnostic Core Engine**: Domain logic, prompt refinement synthesis, and 7-dimension persona memory are strictly decoupled from host DOM manipulations. Chatbots (Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta AI) are managed via dedicated `IChatbotAdapter` implementations.
3. **End-to-End Type Safety**: Strict TypeScript 5.7+ compiler settings with `noImplicitAny` and zero `any` casts terminators. Runtime type boundaries are guarded by Zod schemas.
4. **Zero-Trust BYOK Security**: Users bring their own API keys (BYOK). Keys are encrypted locally using Web Crypto AES-GCM (256-bit) with PBKDF2 key derivation. No external server ever inspects or handles plaintext user credentials.
5. **Clean Presentation Isolation**: In-page UI surfaces mount inside an open Shadow Root (`createShadowRootUi`). Host application CSS resets cannot bleed into extension widgets, and extension styles cannot leak into host chat containers.
6. **Progressive Enhancement**: When offline or when LLM API quotas expire, the extension gracefully falls back to deterministic rule-based prompt assembly and local queueing.

---

## 3. High-Level Multi-Context Architecture

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
│   │  - Side Panel (Full Workspace) │◄───┬───►│  - Memory Orchestrator (SOA)         │   │
│   │  - Action Popup (Quick Switch) │    │    │  - API Proxy & LLM Gateway           │   │
│   │  - Options (Keys & Cloud Sync) │    │    │  - Web Crypto Vault (AES-GCM 256)    │   │
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

---

## 4. Technology Stack & Provenance

| Layer | Technology | Version | Architectural Provenance & Rationale |
| :--- | :--- | :--- | :--- |
| **Extension Framework** | WXT | v0.21.4 | Vite-based build toolchain, auto-entrypoints, multi-target MV3 support |
| **UI Framework** | React | v19.0.0 | React 19 Concurrent Root, modern hooks, zero legacy lifecycle methods |
| **Language** | TypeScript | v5.7+ | Strict typing, full IDE inference across IPC protocols |
| **Styling** | Tailwind CSS / Scoped CSS | v4.x | Inline scoped injection (`cssInjectionMode: 'ui'`) inside Shadow Root |
| **Component Primitives** | shadcn/ui & Radix | Latest | Accessible, unstyled primitives customizable via CSS variables |
| **Validation** | Zod | v3.24 / v4 | Runtime boundary verification for 7-dimension Persona schemas |
| **Local Storage** | `@wxt-dev/storage` | Latest | Type-safe `storage.defineItem` with reactive `.watch()` subscriptions |
| **State Management** | TanStack Query + Hooks | v5.x | Asynchronous server/local state caching with zero-refetch stale times |
| **Archival & Export** | JSZip | v3.10.1 | Client-side compression for multi-turn conversational export |
| **Unit Testing** | Vitest + fake-indexeddb | v3.0.0 | High-velocity headless unit testing with mock WebExtension globals |

---

## 5. Specification Document Index (19-Part Suite)

| Index | Document | Scope & System Coverage | Status |
| :--- | :--- | :--- | :--- |
| **00** | [`00-overview.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/00-overview.md) | Executive summary, SOA pattern, design principles, tech stack | 🟢 Complete |
| **00** | [`00-system-design.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/00-system-design.md) | SOA topology, dataflow, request lifecycles, sequence diagrams | 🟢 Complete |
| **01** | [`01-frontend.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/01-frontend.md) | React 19 UI surfaces, Sidepanel, Options, Shadow DOM injection | 🟢 Complete |
| **02** | [`02-backend.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/02-backend.md) | MV3 Background Service Worker daemon, Supabase Auth & Edge Functions | 🟢 Complete |
| **03** | [`03-api.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/03-api.md) | Multi-provider LLM integrations, Vercel AI SDK, streaming, proxying | 🟢 Complete |
| **04** | [`04-database.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/04-database.md) | Local IndexedDB models, Supabase PostgreSQL schema, RLS policies | 🟢 Complete |
| **05** | [`05-storage.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/05-storage.md) | WXT Storage definitions, TanStack Query sync, schema migrations | 🟢 Complete |
| **06** | [`06-messaging.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/06-messaging.md) | `@webext-core/messaging` protocol maps, RPC vs Event patterns | 🟢 Complete |
| **07** | [`07-security.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/07-security.md) | BYOK AES-256-GCM vault, memory wiping, CSP, XSS sanitization | 🟢 Complete |
| **09** | [`09-content-scripts.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/09-content-scripts.md) | Injected Shadow DOM, selectors, submit hooks, `ctx.onInvalidated` | 🟢 Complete |
| **11** | [`11-persona-rbac.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/11-persona-rbac.md) | 7-Dimension Persona V4 engine, extraction pipelines, community RBAC | 🟢 Complete |
| **12** | [`12-platform-adapters.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/12-platform-adapters.md) | `IChatbotAdapter` pattern, onboarding guide, Gemini/ChatGPT/Claude | 🟢 Complete |
| **13** | [`13-project-structure.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/13-project-structure.md) | Directory conventions, path aliases, WXT/Vite compilation | 🟢 Complete |
| **15** | [`15-deployment.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/15-deployment.md) | Store packaging (`wxt zip`), Chrome Web Store API, Firefox AMO CI | 🟢 Complete |
| **16** | [`16-analytics.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/16-analytics.md) | GA4 Measurement Protocol, privacy-preserving zero-PII telemetry | 🟢 Complete |
| **17** | [`17-i18n.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/17-i18n.md) | Type-safe `@wxt-dev/i18n`, `_locales` translation strings, RTL | 🟢 Complete |
| **18** | [`18-testing-strategy.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/18-testing-strategy.md) | 5 Quality Gates, Vitest unit suite (14 suites, 96 tests), Playwright | 🟢 Complete |
| **19** | [`19-onboarding.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/19-onboarding.md) | FTUX lifecycle, 3-step Options wizard, in-situ discovery tooltips | 🟢 Complete |
| **20** | [`20-offline.md`](file:///c:/Users/dartd/Prompt%20Persona%20and%20Refiner/wxt-extension/docs/20-offline.md) | Local-First guarantees, sync delta queue, deterministic fallback | 🟢 Complete |
