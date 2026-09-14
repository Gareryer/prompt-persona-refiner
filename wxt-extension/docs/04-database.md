# 04 - Database Architecture & Data Schemas

> **Target Layer**: Local Embedded Storage & Remote Supabase PostgreSQL  
> **Core Implementations**: `wxt-extension/src/core/storage/repository.ts` & `wxt-extension/src/core/memory/schemas.ts`  
> **Remote Engine**: Supabase Cloud PostgreSQL 15 with Row-Level Security (RLS)  
> **Classification**: Data Models & Persistence Architecture Specification

---

## 1. Overview & Dual-Tier Data Topology

**Allie Persona & Prompt Refiner** is built on a **Local-First, Cloud-Optional** persistence philosophy:
- **Local Client Tier (SSOT)**: Primary data—created personas, customized 7-dimension models, interaction logs, and local configuration—resides in `chrome.storage.local` and IndexedDB.
- **Cloud Tier (Supabase BaaS)**: An opt-in relational database providing cloud backup, public community persona sharing, cross-device sync, and usage metering.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Dual-Tier Database Topology                                      │
├───────────────────────────────────────────────────────────────────┬────────────────────────────────────┤
│ Tier 1: Local Embedded Client Storage                             │ Tier 2: Remote Cloud Database      │
│ (Persistent, Offline-First, Zero Latency)                         │ (Opt-In Supabase PostgreSQL 15)    │
│                                                                   │                                    │
│   ┌────────────────────────────────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│   │ Repository Abstraction (IStorageBackend)                   │  │  │ profiles                     │  │
│   │  - ExtensionStorageBackend (chrome.storage.local)          │  │  │  - id, email, tier, settings │  │
│   │  - InMemoryStorageBackend (Unit Testing / Mocks)           │  │  └──────────────┬───────────────┘  │
│   └───────────────┬────────────────────────────────────────────┘  │                 │                  │
│                   │                                               │                 │ FK               │
│                   ▼                                               │                 ▼                  │
│   ┌────────────────────────────────────────────────────────────┐  │  ┌──────────────────────────────┐  │
│   │ Local Entity Partitions                                    │  │  │ personas                     │  │
│   │  • local:personas (Record<string, PersonaV4>)              │  │  │  - id, user_id, dimensions   │  │
│   │  • local:active_persona (Active Reference)                 │  │  │  - is_published, usage_count │  │
│   │  • local:persona_drafts (Uncommitted Creations)            │  │  └──────────────┬───────────────┘  │
│   │  • session_{sessionId} (Per-Chat Turn Memory Cache)        │  │                 │                  │
│   │  • local:ratings (Local Feedback & Scoring Logs)           │  │                 ├──────────────────┤
│   │  • local:sync_queue (Array<SyncAction> Offline Deltas)     │◄─┼──┼─►            │                  │
│   └────────────────────────────────────────────────────────────┘  │                 ▼                  ▼
│                                                                   │  ┌────────────────┐ ┌──────────────┐
│                                                                   │  │ refinements    │ │ usage (Quota)│
│                                                                   │  │ - prompt diffs │ │ - daily caps │
│                                                                   │  └────────────────┘ └──────────────┘
└───────────────────────────────────────────────────────────────────┴────────────────────────────────────┘
```

---

## 2. Local Entity Schemas & Zod Contracts

### 2.1 Persona V4 Schema (`src/core/memory/schemas.ts`)

```typescript
export const SCHEMA_VERSION = 4;

export const DimensionContentSchema = z.object({
  instruction: z.string().min(1, 'Instruction required'),
  version: z.number().optional().default(4),
  pinned: z.boolean().optional(),
  pinnedData: z.record(z.any()).optional(),
  generation: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  updatedAt: z.number().optional()
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

---

## 3. Remote Relational Schema (Supabase PostgreSQL DDL)

```sql
-- 1. Profiles Table (Synced from auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'admin')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Personas Master Table
CREATE TABLE public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  title VARCHAR(120) DEFAULT 'Specialist',
  domain TEXT NOT NULL DEFAULT 'Tech',
  description TEXT,
  dimensions JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  version VARCHAR(20) DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_personas_user_id ON public.personas(user_id);
CREATE INDEX idx_personas_published ON public.personas(is_published) WHERE is_published = TRUE;

-- 3. Refinements Audit History
CREATE TABLE public.refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  persona_id UUID REFERENCES public.personas(id) ON DELETE SET NULL,
  original TEXT NOT NULL,
  refined TEXT NOT NULL,
  platform TEXT NOT NULL,
  tokens JSONB DEFAULT '{}',
  rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Daily Usage & Quotas
CREATE TABLE public.usage (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,
  tokens INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- 5. Row-Level Security (RLS) Enforcement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refinements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Read published or owned personas" ON public.personas
  FOR SELECT USING (is_published = TRUE OR auth.uid() = user_id);

CREATE POLICY "Users modify own personas" ON public.personas
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users read own refinements" ON public.refinements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own refinements" ON public.refinements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 4. Local Storage Repository Layer (`src/core/storage/repository.ts`)

```typescript
export interface IStorageBackend {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}
```
All operations on personas, settings, and ratings route through `IStorageBackend`, enabling complete unit testing under Vitest via `InMemoryStorageBackend` without needing live browser APIs.
