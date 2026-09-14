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

## 2. Dimension Breakdown & Specifications

### 2.1 Dimension 1: `persona` (Identity & Role)
- **Definition**: The authoritative identity assumed by the model.
- **Enums**: `domain: ['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other']`.
- **Instruction Example**: *"Senior Distributed Systems Architect with 15+ years building high-throughput event-driven microservices in Go and Rust."*

### 2.2 Dimension 2: `context` (Environment & Assumptions)
- **Definition**: The active situational context, tools, and background assumptions surrounding the user's project.
- **Instruction Example**: *"Building a Chrome Extension under Manifest V3 with WXT v0.21, React 19, and Vite 6. Target browsers: Chrome, Firefox, Safari."*

### 2.3 Dimension 3: `tone` (Personality & Voice)
- **Definition**: The linguistic personality and pacing of the output.
- **Enums**: `style: ['Professional', 'Direct', 'Technical', 'Friendly', 'Empathetic', 'Authoritative', 'Academic', 'Objective']`.
- **Instruction Example**: *"Direct, highly technical, concise. Zero pleasantries or introductory conversational filler."*

### 2.4 Dimension 4: `framework` (Reasoning Methodology)
- **Definition**: The mental model or cognitive structure used to break down and solve problems.
- **Enums**: `reasoning: ['First-Principles', 'Chain-of-Thought', 'Tree-of-Thought', 'Step-by-Step', 'Analytical', 'Socratic', 'Deductive']`.
- **Instruction Example**: *"Deconstruct problems from first principles. State underlying physics and invariants before proposing high-level abstractions."*

### 2.5 Dimension 5: `constraints` (Negative Prompt Rules)
- **Definition**: Non-negotiable boundaries, forbidden patterns, and strict anti-patterns.
- **Instruction Example**: *"Never suggest deprecated Manifest V2 APIs. Never recommend eval() or inline scripts. Always eliminate unnecessary abstractions."*

### 2.6 Dimension 6: `format` (Structural Schema)
- **Definition**: The exact physical syntax and typographical structure required.
- **Enums**: `outputType: ['Markdown', 'Plaintext', 'JSON', 'Code', 'HTML', 'Structured', 'Custom']`.
- **Instruction Example**: *"Output code blocks first with line-by-line comments explaining why, followed by a concise markdown comparison table."*

### 2.7 Dimension 7: `exemplar` (Few-Shot Pattern Anchors)
- **Definition**: High-value input-output demonstration pairs that ground model behavior.
- **Instruction Example**: 
  - *Input*: "How do I save state?"
  - *Output*: "Use `@wxt-dev/storage` with `storage.defineItem('local:key', { defaultValue })` to survive MV3 worker restarts."

---

## 3. Dynamic Pinning & Context Assembly

Dimensions can be selectively activated or pinned on a per-session basis:

```typescript
export interface DimensionContent {
  instruction: string;
  version?: number;
  pinned?: boolean;             // When true, persists across session turns
  pinnedData?: Record<string, any>;
  generation?: number;          // Tracks evolutionary refinement iterations
  confidence?: number;          // 0.0 to 1.0 confidence score
  updatedAt?: number;
}
```

### Context Compilation Priority
When `buildV4RefinementContext()` compiles prompt prefixes:
1. **Pinned Persona Dimensions** override extracted session traits.
2. **Session Extracted Context** fills unpinned dimension gaps.
3. **Global User Settings** supply baseline fallback styling.

---

## 4. Role-Based Access Control (RBAC) Matrix

When users interact with community personas via Supabase, operations are governed by a 4-tier Role-Based Access Control model:

| Role | Auth State | Capabilities & Permissions |
| :--- | :--- | :--- |
| **Guest / Anonymous User** | Unauthenticated | • Create and edit local personas on client device.<br>• Discover and download public community personas.<br>• Refine prompts locally using personal API keys. |
| **Community Member** | Authenticated (JWT) | • All Guest permissions.<br>• Cloud backup of private persona library.<br>• Submit 1-5 star ratings and reviews on public personas.<br>• Publish authored personas to community marketplace. |
| **Persona Author** | Authenticated (Owner) | • All Member permissions.<br>• Modify, update versions, or delete authored community personas.<br>• View download and rating analytics for authored templates. |
| **Platform Moderator** | Authenticated (Admin) | • Hide, edit, or delete any reported or malicious community persona.<br>• Ban abusive accounts and purge spam submissions. |

---

## 5. Supabase Row-Level Security (RLS) Policies

Access control is enforced at the database kernel level in PostgreSQL via RLS:

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

-- Prevent rating tampering (1 rating per user per persona)
CREATE UNIQUE INDEX idx_user_persona_rating ON public.ratings(user_id, persona_id);
```
