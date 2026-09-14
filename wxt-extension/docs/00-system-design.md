# 00 - Allie Persona & Prompt Refiner: System Design & Architecture Blueprint

> **System Target**: Web Extension Manifest V3 (MV3) Architecture  
> **Core Architecture**: Service-Oriented Architecture (SOA) with Local-First Storage  
> **Pattern Benchmark**: Derived from Superfill.ai, Text Polish, and Sidepanel Template  
> **Framework Stack**: [WXT v0.21.4](https://wxt.dev/) · React 19 · TypeScript 5.7+ · Vite 6 · Zod v4  
> **Authoritative Root**: `wxt-extension/`  
> **Classification**: Master Technical System Design Specification

---

## 1. Architectural Foundations & Pattern Evaluation

The system design for **Allie Persona & Prompt Refiner** is modeled on an exhaustive architectural evaluation of five production WebExtensions:

### Production Pattern Benchmark

| Feature / Subsystem | Superfill.ai | Text Polish | Sidepanel Template | Prompt Assistant V2 Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **Service Layer** | ✅ `@webext-core/proxy-service` | ❌ Direct messaging | ❌ Direct hooks | **Adopt SOA Service Layer** |
| **Inter-Context IPC** | ✅ `@webext-core/messaging` | ✅ `browser.runtime` | ❌ None | **Adopt Typed ProtocolMap** |
| **Persistence** | ✅ `storage.defineItem` | ✅ `storage.watch` | ✅ `storage.defineItem` | **Adopt WXT Typed Storage** |
| **Reactive State** | ✅ TanStack Query + Hooks | ❌ `useState` only | ❌ `useState` only | **Adopt TanStack Query + Watch** |
| **BYOK Encryption** | ✅ AES-256-GCM (PBKDF2) | ❌ Plaintext storage | ❌ None | **Adopt Web Crypto Vault** |
| **Form Validation** | ✅ Zod + TanStack Form | ✅ React Hook Form + Zod | ❌ None | **Adopt Strict Zod Schemas** |
| **Presentation** | ✅ Shadow DOM Injection | ✅ Custom Overlay | ❌ Inline HTML | **Adopt createShadowRootUi** |

---

## 2. Multi-Context Process Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Multi-Context Process Model                                      │
├───────────────────────────────────┬────────────────────────────────────────────────────────────────────┤
│ Host Page Worlds (Unprivileged)   │ Isolated Extension Worlds (Privileged)                             │
│                                   │                                                                    │
│  ┌─────────────────────────────┐  │  ┌─────────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Host Page DOM & SPA Engine  │  │  │ Content Script World        │  │ Extension Origin Windows    │  │
│  │ (Gemini, ChatGPT, Claude)   │  │  │ (entrypoints/content.ts)    │  │ (Sidepanel, Popup, Options) │  │
│  │                             │  │  │                             │  │                             │  │
│  │  ┌───────────────────────┐  │  │  │  ┌───────────────────────┐  │  │  ┌───────────────────────┐  │  │
│  │  │ Platform DOM Elements │  │  │  │  │ Platform Adapters     │  │  │  │ React 19 UI Engine   │  │  │
│  │  │ (Inputs, Turns, Diff) │◄─┼──┼──┼─►│ (IChatbotAdapter)     │  │  │  │ 3-Tab Side Panel     │  │  │
│  │  └───────────────────────┘  │  │  │  └──────────┬────────────┘  │  │  │ Quick-Toggle Popup    │  │  │
│  │                             │  │  │             │               │  │  │ Options Dashboard     │  │  │
│  │  ┌───────────────────────┐  │  │  │             ▼               │  │  └──────────┬────────────┘  │  │
│  │  │ Injected Shadow DOM   │  │  │  │  ┌───────────────────────┐  │  │             │               │  │
│  │  │ <prompt-refiner-ui>   │◄─┼──┼──┼─►│ createShadowRootUi    │  │  │             │               │  │
│  │  │ Isolated CSS Styles   │  │  │  │  │ (Floating Badge/Diff) │  │  │             │               │  │
│  │  └───────────────────────┘  │  │  │  └───────────────────────┘  │  │             │               │  │
│  └─────────────────────────────┘  │  └─────────────┬───────────────┘  └─────────────┼───────────────┘  │
│                                   │                │                                │                  │
│                                   │                ▼                                ▼                  │
│                                   │  ┌──────────────────────────────────────────────────────────────┐  │
│                                   │  │ Background Service Worker (entrypoints/background.ts)        │  │
│                                   │  │                                                              │  │
│                                   │  │   ┌──────────────────────────────────────────────────────┐   │  │
│                                   │  │   │ SERVICE LAYER (SOA Core)                             │   │  │
│                                   │  │   │  • RefineService: Orchestrates prompt synthesis      │   │  │
│                                   │  │   │  • PersonaService: Manages 7-dimension CRUD & pins   │   │  │
│                                   │  │   │  • KeyVaultService: Handles AES-256-GCM crypto       │   │  │
│                                   │  │   │  • SessionService: Manages tab sessions & turns      │   │  │
│                                   │  │   │  • HarvestService: Manages bulk history archival     │   │  │
│                                   │  │   └──────────────────────────┬───────────────────────────┘   │  │
│                                   │  │                              │                               │  │
│                                   │  │                              ▼                               │  │
│                                   │  │   ┌──────────────────────────────────────────────────────┐   │  │
│                                   │  │   │ INFRASTRUCTURE LAYER                                 │   │  │
│                                   │  │   │  • LLM Provider Gateway (Gemini, OpenAI, Anthropic)  │   │  │
│                                   │  │   │  • Storage Layer (@wxt-dev/storage / IndexedDB)      │   │  │
│                                   │  │   │  • Crypto Layer (Web Crypto Subtle API)              │   │  │
│                                   │  │   └──────────────────────────────────────────────────────┘   │  │
│                                   │  └──────────────────────────────┬───────────────────────────────┘  │
│                                   │                                 │                                  │
│                                   │                                 ▼                                  │
│                                   │       Type-Safe Storage Bus (@wxt-dev/storage / Chrome Storage)    │
└───────────────────────────────────┴─────────────────────────────────┼──────────────────────────────────┘
                                                                      │ HTTPS / WSS
                                                                      ▼
                                    ┌────────────────────────────────────────────────────────────────────┐
                                    │ External Cloud & Model Providers                                   │
                                    │  - Google Gemini API (generativelanguage.googleapis.com)           │
                                    │  - OpenAI API (api.openai.com) / Anthropic API (api.anthropic.com) │
                                    │  - OpenRouter Gateway (openrouter.ai)                              │
                                    │  - Supabase BaaS (Postgres RLS Database & Community Personas)      │
                                    └────────────────────────────────────────────────────────────────────┘
```

---

## 3. Communication Patterns: Proxy-Service (RPC) vs. Messaging (Events)

Following WXT best practices, communication across context boundaries is split into two complementary paradigms:

### 3.1 Proxy-Service Pattern (Synchronous Function Calls)
Used for data queries, CRUD operations, and computational pipelines where the caller awaits a concrete result:

```typescript
// Background Service Registration
export const [registerRefineService, getRefineService] = defineProxyService(
  'RefineService',
  () => new RefineService()
);

// Consumption in Sidepanel / Content Script:
const refineService = getRefineService();
const result = await refineService.refine({ prompt: 'Raw text', personaId: 'p-123' });
```

### 3.2 Extension Messaging Pattern (Events & Notifications)
Used for broadcasts, UI alerts, and one-way commands across tabs:

```typescript
// Dispatched via ProtocolMap
export const messenger = defineExtensionMessaging<ProtocolMap>();
await messenger.sendMessage('showModal', { type: 'review' });
```

---

## 4. End-to-End Prompt Refinement Request Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REFINE PROMPT DATAFLOW                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. USER ACTION                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ [Sidepanel / Injected RefinerBadge]                                   │  │
│  │  ↓                                                                   │  │
│  │  User hits Ctrl+Shift+R or clicks floating badge                     │  │
│  │  ↓                                                                   │  │
│  │  Component calls: const result = await RefineService.refine(data)    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ║                                       │
│                                     ▼                                       │
│  2. SERVICE LAYER (Background Service Worker)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ RefineService.refine(data)                                           │  │
│  │  ↓                                                                   │  │
│  │  ① Get settings: settings = await storage.aiSettings.getValue()      │  │
│  │  ↓                                                                   │  │
│  │  ② Get persona: persona = await storage.personas.getValue()          │  │
│  │  ↓                                                                   │  │
│  │  ③ Get API key: apiKey = await KeyVaultService.getKey(provider)      │  │
│  │  ↓                                                                   │  │
│  │  ④ Build prompt: systemPrompt = buildV4RefinementContext(persona)    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ║                                       │
│                                     ▼                                       │
│  3. LLM PROVIDER LAYER (Gateway)                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ External Fetch Call                                                  │  │
│  │  ↓                                                                   │  │
│  │  POST https://generativelanguage.googleapis.com/...:generateContent  │  │
│  │  (or api.openai.com / api.anthropic.com)                             │  │
│  │  ↓                                                                   │  │
│  │  Response: { refinedPrompt: "...", appliedDimensions: [...] }         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ║                                       │
│                                     ▼                                       │
│  4. RESPONSE & INJECTION FLOW                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ← LLM response received                                             │  │
│  │  ← RefineService calculates HTML word-level diff                     │  │
│  │  ← Injected UI displays diff preview                                 │  │
│  │  ← IChatbotAdapter.setInputText(refinedPrompt) updates host input    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     ║                                       │
│                                     ▼                                       │
│  5. OPTIONAL LOCAL & CLOUD PERSISTENCE                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │ HistoryService.saveRefinement({ original, refined, personaId })      │  │
│  │  ↓                                                                   │  │
│  │ storage.refinementsHistory.setValue([...history, newEntry])          │  │
│  │  ↓                                                                   │  │
│  │ (If Supabase sync enabled) supabase.from("refinements").insert(...)  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Reactive State Architecture: TanStack Query + `storage.watch()`

To ensure the React 19 UI remains synchronized with background mutations without continuous polling:

```typescript
// 1. TanStack Query Hook with Infinite Stale Time
export function usePersonas() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['personas'],
    queryFn: () => personasItem.getValue(),
    staleTime: Infinity // Never auto-refetch over HTTP
  });

  // 2. Storage Watcher Syncs Cache Real-Time
  useEffect(() => {
    const unwatch = personasItem.watch((newPersonas) => {
      queryClient.setQueryData(['personas'], newPersonas);
    });
    return () => unwatch();
  }, [queryClient]);

  return query;
}
```

---

## 6. Comprehensive System Architecture Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Host["Host Chatbot Environment"]
        DOM[Chatbot Input DOM]
        TURNS[Conversation Turns]
    end

    subgraph ContentScript["Content Script (Isolated World)"]
        ADAPTER[IChatbotAdapter]
        OBSERVER[contentObserver]
        SHADOW["Shadow DOM <prompt-refiner-overlay>"]
    end

    subgraph Presentation["Extension Presentation Windows"]
        SP[React 19 Side Panel]
        POP[Action Popup]
        OPT[Options Dashboard]
    end

    subgraph ServiceWorker["Background Service Worker (SOA Engine)"]
        subgraph Services["Service Layer"]
            RS[RefineService]
            PS[PersonaService]
            KS[KeyVaultService]
            SS[SessionService]
            HS[HarvestService]
        end

        subgraph Infra["Infrastructure Layer"]
            LLM_GW[Multi-Provider LLM Gateway]
            CRYPTO[Web Crypto AES-GCM]
            STORAGE_ENGINE[@wxt-dev/storage]
        end
    end

    subgraph External["External Services"]
        GEMINI[Gemini API]
        OAI[OpenAI / Anthropic API]
        SUPABASE[Supabase BaaS]
    end

    DOM <--> ADAPTER
    TURNS --> OBSERVER
    ADAPTER <--> SHADOW

    OBSERVER -->|"ProtocolMap RPC"| RS
    SP & POP & OPT -->|"Proxy Service"| Services

    RS --> LLM_GW
    KS --> CRYPTO
    PS & SS & HS --> STORAGE_ENGINE

    LLM_GW --> GEMINI & OAI
    STORAGE_ENGINE -.->|"Optional Sync"| SUPABASE
```
