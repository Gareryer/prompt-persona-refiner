# 04 - Database Architecture & Data Schemas

> **Target Layer**: Local Embedded Storage & Remote Supabase PostgreSQL  
> **Core Implementations**: `wxt-extension/src/core/storage/repository.ts` & `wxt-extension/src/core/memory/schemas.ts`  
> **Remote Engine**: Supabase Cloud PostgreSQL with Row-Level Security (RLS)  
> **Classification**: Data Models & Persistence Architecture Specification

---

## 1. Overview & Local-First Philosophy

**Allie Persona & Prompt Refiner** is built on a **Local-First, Cloud-Optional** persistence philosophy. 

All primary user assets—including created personas, customized 7-dimension models, interaction logs, and local configuration—are stored directly on the client machine using native browser persistence (`chrome.storage.local` and `IndexedDB`). 

Cloud database synchronization with Supabase is strictly opt-in, functioning as a decentralized backup, community discovery mechanism, and public rating ledger.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Dual-Tier Database Topology                                      │
├───────────────────────────────────────────────────────────────────┬────────────────────────────────────┤
│ Tier 1: Local Embedded Client Storage                             │ Tier 2: Remote Cloud Database      │
│ (Persistent, Offline-First, Zero Latency)                         │ (Opt-In Supabase PostgreSQL)       │
│                                                                   │                                    │
│   ┌────────────────────────────────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│   │ Repository Abstraction (IStorageBackend)                   │  │  │ Supabase Cloud PostgreSQL    │  │
│   │  - ExtensionStorageBackend (chrome.storage.local)          │  │  │ (Hosted Relational Engine)   │  │
│   │  - InMemoryStorageBackend (Unit Testing / Mocks)           │  │  └──────────────┬───────────────┘  │
│   └───────────────┬────────────────────────────────────────────┘  │                 │                  │
│                   │                                               │                 │                  │
│                   ▼                                               │                 │                  │
│   ┌────────────────────────────────────────────────────────────┐  │                 │                  │
│   │ Local Entity Partitions                                    │  │                 │                  │
│   │  • local:personas (Record<string, PersonaV4>)              │  │                 │                  │
│   │  • local:active_persona (Active Persona Reference)         │  │                 ▼                  │
│   │  • local:persona_drafts (Uncommitted Persona Creations)    │  │  ┌──────────────────────────────┐  │
│   │  • session_{sessionId} (Per-Chat Turn Memory Cache)        │  │  │ Cloud Relations & Tables     │  │
│   │  • local:ratings (Local Feedback & Scoring Logs)           │  │  │  • public.personas           │  │
│   │  • local:sync_queue (Array<SyncAction> Offline Deltas)     │◄─┼──┼─►• public.ratings            │  │
│   └────────────────────────────────────────────────────────────┘  │  │  • public.persona_tags       │  │
│                                                                   │  │  • auth.users (Supabase Auth)│  │
│                                                                   │  └──────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Local Entity Schemas & Zod Contracts

### 2.1 Persona V4 Schema (`src/core/memory/schemas.ts`)
The foundational data model enforces strict runtime type safety via Zod (`z.object`):

```typescript
// wxt-extension/src/core/memory/schemas.ts
export const SCHEMA_VERSION = 4;

export const DimensionContentSchema = z.object({
  instruction: z.string().min(1, 'Persona instruction is required'),
  version: z.number().optional().default(4),
  pinned: z.boolean().optional(),
  pinnedData: z.record(z.any()).optional(),
  generation: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  updatedAt: z.number().optional(),
  metadata: z.record(z.any()).optional()
});

export const PersonaV4Schema = z.object({
  id: z.string().uuid(),
  metadata: z.object({
    suggested_name: z.string().default('AI Persona'),
    suggested_title: z.string().optional().default('Specialist'),
    domain: z.enum(['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other']),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
    version: z.string().default('1.0.0'),
    is_public: z.boolean().default(false),
    rating: z.number().optional(),
    rating_count: z.number().optional()
  }),
  dimensions: z.object({
    persona: DimensionContentSchema,
    context: DimensionContentSchema,
    tone: DimensionContentSchema,
    framework: DimensionContentSchema,
    constraints: DimensionContentSchema,
    format: DimensionContentSchema,
    exemplar: DimensionContentSchema
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});
```

### 2.2 Persona Drafts & Sync Queue (`src/lib/storage/items.ts`)

```typescript
export interface PersonaDraft {
  id: string;
  source_prompt: string;
  persona: PersonaV4;
  provider: string;
  llm_model: string;
  created_at: string;
  is_public: boolean;
}

export interface SyncAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'persona' | 'rating';
  payload: any;
  timestamp: number;
}
```

---

## 3. Remote Relational Schema (Supabase PostgreSQL DDL)

When cloud synchronization is enabled, personas and community ratings synchronize to an external PostgreSQL database governed by Row-Level Security:

```sql
-- 1. Create Enums
CREATE TYPE persona_domain AS ENUM (
  'Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'
);

-- 2. Personas Master Table
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  title VARCHAR(120) DEFAULT 'Specialist',
  domain persona_domain NOT NULL DEFAULT 'Tech',
  description TEXT,
  dimensions JSONB NOT NULL,
  tags TEXT[] DEFAULT '{}',
  version VARCHAR(20) DEFAULT '1.0.0',
  is_public BOOLEAN DEFAULT false,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Persona Ratings Table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  score SMALLINT CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row-Level Security (RLS)
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
-- Public personas are readable by all authenticated and anonymous clients
CREATE POLICY "Public personas are readable" ON public.personas
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

-- Users can only insert or update their own personas
CREATE POLICY "Users manage own personas" ON public.personas
  FOR ALL USING (auth.uid() = user_id);

-- Ratings are viewable by all, insertable by authenticated users
CREATE POLICY "Anyone can view ratings" ON public.ratings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users submit ratings" ON public.ratings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 4. Local Storage Repository Layer (`src/core/storage/repository.ts`)

To prevent tight coupling to Chrome Extension storage APIs and ensure complete testability under Vitest, all data interactions route through the `IStorageBackend` interface:

```typescript
export interface IStorageBackend {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}
```

### Supported Backends:
1. **`ExtensionStorageBackend`**: Uses `chrome.storage.local` with `unlimitedStorage` quota.
2. **`InMemoryStorageBackend`**: Fast, zero-dependency in-memory Map implementation utilized during automated CI and unit testing.

---

## 5. Migration Strategy & Schema Upgrades

When loading legacy extensions (versions 1.0 to 3.0), the repository runs automated data migration:
1. **Legacy Flat Prompt Formats**: Converted into structured 7-dimension `PersonaV4` objects.
2. **Version Bump**: Schema version stamped to `SCHEMA_VERSION = 4`.
3. **Safety Fallback**: Raw legacy data is backed up to `local:legacy_migration_backup` before schema transformations execute.
