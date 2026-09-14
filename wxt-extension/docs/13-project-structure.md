# 13 - Project Structure & Build Configuration

> **Target Layer**: Codebase Organization, Layer Boundaries & WXT Build Toolchain  
> **Core Tooling**: [WXT v0.21.4](https://wxt.dev/) · Vite 6.2.0 · TypeScript 5.7+ · Bun Runtime · Vitest  
> **Configuration Files**: `wxt-extension/wxt.config.ts`, `tsconfig.json`  
> **Classification**: Project Layout & Build Architecture Specification

---

## 1. Directory Tree & Structural Conventions

**Allie Persona & Prompt Refiner** is structured following the standard convention-over-configuration architecture defined by WXT:

```
wxt-extension/
├── entrypoints/                       # Automatic WebExtension Entrypoints
│   ├── background.ts                  # Service Worker Daemon (defineBackground)
│   ├── content.ts                     # Universal Host DOM Injected Script
│   ├── chatgpt.content/               # ChatGPT Dedicated Script Entrypoint
│   │   └── index.ts
│   ├── claude.content/                # Claude Dedicated Script Entrypoint
│   │   └── index.ts
│   ├── gemini.content/                # Gemini Dedicated Script Entrypoint
│   │   └── index.ts
│   ├── popup/                         # Action Toolbar Popup
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   ├── sidepanel/                     # Persistent Chrome Side Panel
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── sidepanel.css
│   │   └── components/                # Dimension Editors & History Cards
│   └── options/                       # Global Extension Settings Tab
│       ├── index.html
│       ├── main.tsx
│       └── App.tsx
├── src/                               # Internal Shared Codebase (@/)
│   ├── adapters/                      # Platform DOM & Storage Adapters
│   │   ├── chatbots/                  # IChatbotAdapter implementations
│   │   │   ├── gemini/
│   │   │   ├── chatgpt/
│   │   │   ├── claude/
│   │   │   ├── deepseek.adapter.ts
│   │   │   ├── grok.adapter.ts
│   │   │   ├── meta.adapter.ts
│   │   │   ├── registry.ts            # Dynamic Hostname Matcher
│   │   │   └── types.ts               # IChatbotAdapter & IHarvesterAdapter
│   │   └── storage/                   # Storage Adapters
│   ├── components/                    # UI Components
│   │   ├── injections/                # In-Page Shadow DOM Components
│   │   │   ├── RefinerBadge.tsx       # Floating Trigger Badge
│   │   │   ├── RatingOverlay.tsx      # Satisfaction Scorer
│   │   │   └── injections.css         # Scoped Shadow DOM Styles
│   │   ├── onboarding/                # FTUX Components
│   │   │   ├── WelcomeDialog.tsx
│   │   │   ├── welcome-slides.ts
│   │   │   └── EmptyPersonas.tsx
│   │   └── shared/                    # Reusable React UI Elements
│   ├── content/                       # Content Script Modules
│   │   ├── observer.ts                # MutationObserver & Turn Extractor
│   │   ├── scraper.ts                 # Generic DOM Scraping Utilities
│   │   └── diff.ts                    # Prompt Diff Highlighting & HTML Escaping
│   ├── core/                          # Pure Business Logic (0 DOM Dependencies)
│   │   ├── crypto/                    # Web Crypto PBKDF2 & AES-GCM Vault
│   │   ├── extractor/                 # LLM Turn Memory Extraction
│   │   ├── harvest/                   # Conversation History Archival Engine
│   │   ├── llm/                       # Provider Client Handlers & Validation
│   │   ├── logging/                   # Structured Telemetry & Diagnostics
│   │   ├── memory/                    # Persona V4 Schemas & Context Assembler
│   │   ├── orchestration/             # Background Service Coordinators
│   │   │   ├── api-proxy.ts           # External Model Gateway (Native fetch)
│   │   │   ├── memory-orchestrator.ts # Session Context Manager
│   │   │   ├── session-state.ts       # Atomic Counters & Abort Controllers
│   │   │   ├── sidepanel-manager.ts   # Port Registry & Split-View Router
│   │   │   └── bg-logger.ts           # Service Worker Logger
│   │   ├── rating/                    # Feedback Scoring Engine
│   │   ├── refiner/                   # System Prompt Synthesis Engine
│   │   ├── storage/                   # IStorageBackend & Local Repositories
│   │   ├── supabase/                  # BaaS Sync & Community Sharing
│   │   └── theme/                     # Dynamic Theme Synchronization
│   ├── lib/                           # Utility & Messaging Libraries
│   │   ├── messaging/                 # ProtocolMap & Typed sendMessage
│   │   └── storage/                   # WXT Storage Items Definitions
│   └── services/                      # Higher-Level Service Wrappers
│       ├── message-dispatcher.service.ts
│       ├── network.service.ts
│       └── sync-queue.service.ts
├── public/                            # Static Extension Assets
│   ├── icons/                         # Extension Toolbar & Store Icons (16, 32, 48, 128)
│   ├── _locales/                      # Chrome i18n messages
│   │   ├── en/messages.json
│   │   └── es/messages.json
│   └── assets/                        # Illustrations & Hero SVGs
├── tests/                             # Vitest Test Suites (14 Suites, 96 Tests)
│   ├── unit/                          # Unit test specs
│   └── setup.ts                       # DOM and chrome mocks
├── docs/                              # Architecture Specifications (19 Chapters)
├── package.json                       # Scripts & Dependencies
├── tsconfig.json                      # Strict TypeScript Configuration
├── vitest.config.ts                   # Unit Test Runner Config
└── wxt.config.ts                      # WXT & Vite Build Configuration
```

---

## 2. SOA Layer Mapping & Architectural Boundaries

| Layer | Directory | Description | Boundaries & Rules |
| :--- | :--- | :--- | :--- |
| **Presentation** | `entrypoints/`, `src/components/` | React 19 UI, Shadow DOM views, Sidepanel, Options, and Popup | Uses React Query hooks and messaging; **never** imports internal DB clients directly. |
| **Service & Orchestration** | `src/core/orchestration/`, `src/services/` | Business workflows (`api-proxy.ts`, `memory-orchestrator.ts`, `sync-queue.service.ts`) | Pure business logic, coordination; **never** touches browser DOM. |
| **Adapter Layer** | `src/adapters/` | Chatbot DOM scrapers, input synchronizers, storage backend implementations | Translates external interfaces to internal contracts; isolated per platform. |
| **Core Domain** | `src/core/` (crypto, memory, refiner, llm) | Deterministic algorithms, prompt assemblers, AES-GCM encryption | Zero DOM dependencies; fully mockable and 100% testable in headless node/bun. |
| **Messaging & Storage** | `src/lib/messaging/`, `src/lib/storage/` | Type-safe `ProtocolMap`, WXT storage items, and serialization | Single Source of Truth for cross-context IPC and persisted state. |
| **Shared Types** | `src/types/`, `src/adapters/chatbots/types.ts` | Shared TypeScript interfaces, DTOs, and request/response shapes | Zero runtime dependencies; shared across all layers. |

---

## 3. Import Path Conventions & Boundary Rules

### 3.1. Path Aliases
All source files utilize the `@/` path alias pointing to `wxt-extension/src/`:

```typescript
// ✅ Correct
import { PromptRefiner } from '@/core/refiner/refiner';
import { sendMessage } from '@/lib/messaging/protocol';
import type { IChatbotAdapter } from '@/adapters/chatbots/types';

// ❌ Forbidden (Deep relative imports)
import { PromptRefiner } from '../../../core/refiner/refiner';
```

### 3.2. Strict Dependency Direction Rules

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation                         │
│             (entrypoints/, components/)                 │
└──────────────────────────┬──────────────────────────────┘
                           │ uses hooks & messaging
                           ▼
┌─────────────────────────────────────────────────────────┐
│               Service & Orchestration                   │
│         (src/services/, src/core/orchestration/)        │
└──────────────┬───────────────────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│      Adapters Layer       │ │     Core Domain Logic     │
│ (src/adapters/chatbots/)  │ │ (crypto, memory, refiner) │
└──────────────┬────────────┘ └────────────┬──────────────┘
               │                           │
               ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│              Messaging, Storage & Types                 │
│         (src/lib/messaging/, src/lib/storage/)          │
└─────────────────────────────────────────────────────────┘
```

**Explicit Invariants:**
1. **No UI in Core**: Files inside `src/core/` **must never** import React, JSX, or DOM elements.
2. **No Direct Service Calls from Adapters**: Platform adapters run in content scripts; they communicate with background services exclusively via `sendMessage` (`src/lib/messaging/`).
3. **No Direct Upstream LLM Calls from Content Scripts**: Content scripts **must never** call OpenAI, Anthropic, or Gemini APIs directly. All AI queries route through the background `api-proxy.ts` daemon to protect API keys and prevent CORS violations.

---

## 4. Naming Conventions

### 4.1. File Naming
| Category | Convention | Examples |
| :--- | :--- | :--- |
| React Components | PascalCase (`.tsx`) | `RefinerBadge.tsx`, `WelcomeDialog.tsx`, `RatingOverlay.tsx` |
| Services & Utilities | kebab-case (`.ts`) | `api-proxy.ts`, `network.service.ts`, `sync-queue.service.ts` |
| Adapters | kebab-case with `.adapter.ts` | `gemini.adapter.ts`, `chatgpt.adapter.ts`, `deepseek.adapter.ts` |
| React Hooks | `use-` prefix (`.ts`) | `use-personas.ts`, `use-onboarding.ts`, `use-online.ts` |
| Test Files | Matching name + `.test.ts` | `refiner.test.ts`, `api-proxy.test.ts`, `gemini.test.ts` |

### 4.2. Code Symbol Naming
| Symbol Type | Convention | Example |
| :--- | :--- | :--- |
| Component Functions | PascalCase | `export function WelcomeDialog(...)` |
| Classes / Interfaces | PascalCase / `I` prefix for interfaces | `PromptRefiner`, `IChatbotAdapter` |
| Service Singletons | camelCase | `export const networkService = new NetworkService()` |
| React Hooks | camelCase starting with `use` | `export function useOnboarding()` |
| Configuration Constants | UPPER_SNAKE_CASE | `export const MAX_RETRY_ATTEMPTS = 3` |

---

## 5. Configuration & Build Pipeline (`wxt.config.ts`)

WXT dynamically compiles the extension into valid Manifest V3 packages across multiple browser targets (`chrome`, `firefox`, `safari`, `edge`).

```typescript
// wxt-extension/wxt.config.ts
import { defineConfig } from 'wxt';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  srcDir: '.',
  entrypointsDir: 'entrypoints',
  publicDir: 'public',
  outDir: '.output',
  manifest: {
    name: 'Allie Persona & Prompt Refiner',
    version: '1.0.0',
    description: 'Persist personas and refine prompts across Gemini, ChatGPT, Claude, DeepSeek, Grok, and Meta AI',
    permissions: [
      'storage',
      'unlimitedStorage',
      'tabs',
      'clipboardWrite',
      'sidePanel',
      'downloads',
      'scripting'
    ],
    host_permissions: [
      'https://gemini.google.com/*',
      'https://chatgpt.com/*',
      'https://chat.openai.com/*',
      'https://claude.ai/*',
      'https://chat.deepseek.com/*',
      'https://grok.com/*',
      'https://x.com/i/grok*',
      'https://*.meta.ai/*',
      'https://generativelanguage.googleapis.com/*',
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://openrouter.ai/*'
    ],
    action: {
      default_title: 'Open Allie Persona & Prompt Refiner'
    },
    side_panel: {
      default_path: 'sidepanel/index.html'
    },
    commands: {
      'trigger-refine': {
        suggested_key: { default: 'Ctrl+Shift+R', mac: 'Command+Shift+R' },
        description: 'Refine current prompt'
      },
      'open-sidepanel': {
        suggested_key: { default: 'Alt+M' },
        description: 'Open Allie Persona & Prompt Refiner'
      }
    }
  },
  vite: () => ({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    }
  })
});
```

---

## 6. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "entrypoints/**/*",
    "src/**/*",
    "tests/**/*",
    ".wxt/types/**/*.d.ts"
  ],
  "exclude": [
    "node_modules",
    ".output",
    ".wxt"
  ]
}
```

---

## 7. Package Scripts & Development Toolchain

```bash
# 1. Start live development server with Hot Module Replacement (Chrome)
bun run dev

# 2. Start live development server targeting Firefox
bun run dev:firefox

# 3. Execute TypeScript typecheck (Gate 1 verification)
bun run typecheck

# 4. Run Vitest test suites (Gate 2 verification - 14 suites, 96 tests)
bun run test

# 5. Build optimized production bundle for Chrome (.output/chrome-mv3)
bun run build

# 6. Build optimized production bundle for Firefox (.output/firefox-mv2)
bun run build:firefox

# 7. Package distribution ZIP for Chrome Web Store upload
bun run zip
```
