# 11 - Persona Memory Model & Role-Based Access Control (RBAC)

> **Target Layer**: Core 7-Dimension Memory Engine & Identity Governance  
> **Core Implementations**: `wxt-extension/src/core/memory/schemas.ts` & `wxt-extension/src/core/supabase/`  
> **Security Model**: Client Persona Pinning & Remote PostgreSQL Row-Level Security (RLS)  
> **Classification**: Persona Memory Specification & RBAC Matrix

---

## 1. The 7-Dimension Persona Memory V4 Framework

At the core of **Allie Persona & Prompt Refiner** is the **Persona V4 Memory Engine**. Unlike simplistic system prompt prependers that treat persona as a single unstructured block of text, Persona V4 deconstructs user identity and prompt context into seven deterministic, orthogonal dimensions:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       The 7-Dimension Persona V4 Model                                 │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   ┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌───────────────────────────┐  │
│   │ 1. PERSONA                     │ │ 2. CONTEXT                     │ │ 3. TONE                   │  │
│   │ Who the AI embodies            │ │ Working environment & scope    │ │ Communication style       │  │
│   │ • Identity & Credentials       │ │ • Active Tech Stack            │ │ • Formality & Warmth      │  │
│   │ • Domain Authority (Tech, Fin) │ │ • Architecture Constraints     │ │ • Technical Density       │  │
│   └────────────────────────────────┘ └────────────────────────────────┘ └───────────────────────────┘  │
│                   │                                  │                                  │              │
│                   ▼                                  ▼                                  ▼              │
│   ┌────────────────────────────────┐ ┌────────────────────────────────┐ ┌───────────────────────────┐  │
│   │ 4. FRAMEWORK                   │ │ 5. CONSTRAINTS                 │ │ 6. FORMAT                 │  │
│   │ Reasoning & Cognitive Model    │ │ Hard Negative Boundaries       │ │ Structural Output Layout  │  │
│   │ • First-Principles / CoT       │ │ • "No fluff / no apologies"    │ │ • Strict Markdown Tables  │  │
│   │ • Socratic / SCQA / ReAct      │ │ • Forbidden idioms & tools     │ │ • JSON / Code-First       │  │
│   └────────────────────────────────┘ └────────────────────────────────┘ └───────────────────────────┘  │
│                                                      │                                                 │
│                                                      ▼                                                 │
│                                      ┌────────────────────────────────┐                                │
│                                      │ 7. EXEMPLAR                    │                                │
│                                      │ Few-shot demonstration pairs   │                                │
│                                      │ • Ideal Input -> Output Pairs  │                                │
│                                      └────────────────────────────────┘                                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The 3 Persona Creation Sources

Personas can be populated into the engine through three distinct ingestion pipelines:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Persona Creation Lifecycles                                      │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│  ① Manual Creation                                                                                     │
│     User fills the 7-dimension form in the Chrome Side Panel (direct editing).                         │
│                                                                                                        │
│  ② Extraction from Existing System Prompt                                                              │
│     User pastes a raw multi-paragraph system prompt; LLM decomposes text into the 7 dimensions.       │
│                                                                                                        │
│  ③ Automatic Synthesis from Conversation Turns                                                         │
│     Content script scrapes user prompts + model responses; LLM infers implicit constraints & domain.   │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Dimension Specifications & Zod Contracts

```typescript
// wxt-extension/src/core/memory/schemas.ts
export const DimensionContentSchema = z.object({
  instruction: z.string().min(1, 'Persona instruction is required'),
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
    rating_count: z.number().optional(),
    forked_from: z.string().uuid().optional() // Provenance tracking on community import
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

## 4. Fork-on-Import Community Marketplace Model

When a user browses the Supabase community directory and imports a public persona:
1. **Immutable Upstream Template**: The author's original public persona remains untouched.
2. **Local Deep Clone**: The extension generates a new local UUID and stamps `metadata.forked_from = originalId`.
3. **Independent Evolution**: The user can modify all 7 dimensions locally without affecting other community members.

---

## 5. Role-Based Access Control (RBAC) Matrix

| Capability | Guest / Anonymous | Free User | Pro User | Template Author | Admin / Moderator |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Local Persona CRUD** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Local 7-Dimension Refinement** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Search Public Marketplace** | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Cloud Persona Backup** | ❌ None | ✅ Up to 10 | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Publish to Community** | ❌ None | ✅ Max 3 | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| **Edit/Delete Owned Template**| ❌ None | ✅ Owned Only| ✅ Owned Only| ✅ Owned Only| ✅ Any Template |
| **Submit 1-5 Star Ratings** | ❌ None | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Purge Abusive Content** | ❌ None | ❌ None | ❌ None | ❌ None | ✅ Full Admin |

---

## 6. Supabase Row-Level Security (RLS) Policies

```sql
-- Enforce author-only modification of community personas
CREATE POLICY "Authors can update own personas"
  ON public.personas
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enforce author-only deletion
CREATE POLICY "Authors can delete own personas"
  ON public.personas
  FOR DELETE
  USING (auth.uid() = user_id);

-- Rating uniqueness: 1 rating per user per persona
CREATE UNIQUE INDEX idx_user_persona_rating ON public.ratings(user_id, persona_id);
```
