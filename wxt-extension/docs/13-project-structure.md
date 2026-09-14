# 13 - Project Structure & Build Configuration

> **Target Layer**: Codebase Organization & WXT Build Toolchain  
> **Core Tooling**: [WXT v0.21.4](https://wxt.dev/) · Vite 6.2.0 · TypeScript 5.7+ · Rollup  
> **Configuration File**: `wxt-extension/wxt.config.ts`  
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
│   │   └── shared/                    # Reusable React UI Elements
│   ├── content/                       # Content Script Modules
│   │   ├── observer.ts                # MutationObserver & Turn Extractor
│   │   ├── scraper.ts                 # Generic DOM Scraping Utilities
│   │   └── diff.ts                    # Prompt Diff Highlighting & HTML Escaping
│   ├── core/                          # Pure Business Logic (0 DOM Dependencies)
│   │   ├── crypto/                    # Web Crypto PBKDF2 & AES-GCM Vault
│   │   ├── extractor/                 # LLM Turn Memory Extraction
│   │   ├── harvest/                   # Conversation History Archival Engine
│   │   ├── llm/                       # Provider Client Handlers
│   │   ├── logging/                   # Structured Telemetry & Diagnostics
│   │   ├── memory/                    # Persona V4 Schemas & Context Assembler
│   │   ├── orchestration/             # Background Service Coordinators
│   │   │   ├── api-proxy.ts           # External Model Gateway
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
│       └── message-dispatcher.service.ts
├── public/                            # Static Extension Assets
│   └── icons/                         # Extension Toolbar & Store Icons (16, 32, 48, 128)
├── tests/                             # Vitest Test Suites (14 Suites, 96 Tests)
├── docs/                              # Architecture Specifications (19 Chapters)
├── package.json                       # Scripts & Dependencies
├── tsconfig.json                      # Strict TypeScript Configuration
├── vitest.config.ts                   # Unit Test Runner Config
└── wxt.config.ts                      # WXT & Vite Build Configuration
```

---

## 2. Configuration & Build Pipeline (`wxt.config.ts`)

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

## 3. Package Scripts & Development Workflow

```bash
# 1. Start live development server with Hot Module Replacement (Chrome)
bun run dev

# 2. Start live development server targeting Firefox
bun run dev:firefox

# 3. Execute TypeScript typecheck (Gate 1 verification)
bun run typecheck

# 4. Run Vitest test suites (Gate 2 verification)
bun run test

# 5. Build optimized production bundle for Chrome (.output/chrome-mv3)
bun run build

# 6. Build optimized production bundle for Firefox (.output/firefox-mv2)
bun run build:firefox

# 7. Package distribution ZIP for Chrome Web Store upload
bun run zip
```
