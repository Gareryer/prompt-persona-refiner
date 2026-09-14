# 01 - Frontend Architecture & UI Surfaces

> **Target Environment**: WebExtension MV3 Multi-Surface UI  
> **Framework Stack**: React 19 (`@vitejs/plugin-react`) · Tailwind CSS v4 · shadcn/ui · TypeScript 5.7+  
> **Form & State Tooling**: React Hook Form · TanStack Query v5 · Zod v4  
> **Isolation Pattern**: WXT `createShadowRootUi` Shadow DOM Boundary  
> **Authoritative Root**: `wxt-extension/entrypoints/` & `wxt-extension/src/components/`

---

## 1. Overview & Frontend Philosophy

The frontend architecture of **Allie Persona & Prompt Refiner** is partitioned across two distinct execution environments:
1. **Privileged Extension Windows**: Dedicated extension contexts with native access to WebExtension APIs (`chrome.*` / `browser.*`), including the persistent **Chrome Side Panel**, the **Action Popup**, and the **Options & Settings Tab**.
2. **In-Page Injected Surfaces (Shadow DOM)**: UI components dynamically mounted into host chat interfaces (`gemini.google.com`, `chatgpt.com`, `claude.ai`, etc.). These surfaces must be 100% immune to external CSS contamination, resistant to host DOM mutation wipes, and cleanly unmountable on extension invalidation.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                WXT Frontend Architecture                │
                                  └───────────────────────────┬─────────────────────────────┘
                                                              │
                                ┌─────────────────────────────┴─────────────────────────────┐
                                │                                                           │
                                ▼                                                           ▼
    ┌───────────────────────────────────────┐                   ┌───────────────────────────────────────┐
    │     Privileged Extension Surfaces     │                   │       In-Page Injected Surfaces       │
    │     (React 19 in Extension Origin)    │                   │     (React 19 in Shadow DOM Root)     │
    ├───────────────────────────────────────┤                   ├───────────────────────────────────────┤
    │ 1. Side Panel (entrypoints/sidepanel) │                   │ 1. Floating Refiner Badge             │
    │    - 3-Tab Controller (Personas/Hist) │                   │    (src/components/injections/)       │
    │    - 7-Dimension Memory Editor        │                   │ 2. Rating & Feedback Bar              │
    │    - Live Chat History Inspector      │                   │ 3. Diff Comparison Modal              │
    │ 2. Action Popup (entrypoints/popup)   │                   │                                       │
    │    - Fast Persona Quick-Switcher      │                   │ Invariant: createShadowRootUi         │
    │ 3. Options (entrypoints/options)      │                   │ Isolation: 0 Host CSS Bleed           │
    │    - Model & Provider Configurations  │                   │ Cleanup: ctx.onInvalidated()          │
    │    - Supabase & Local Crypto Controls │                   └───────────────────────────────────────┘
    └───────────────────────────────────────┘
```

---

## 2. Directory Layout & Routing Conventions

```
wxt-extension/
├── entrypoints/
│   ├── sidepanel/                     # Primary Workspace Window
│   │   ├── index.html                 # HTML Mount Target
│   │   ├── main.tsx                   # React 19 Bootstrapper (createRoot)
│   │   ├── App.tsx                    # Sidepanel Master Controller
│   │   ├── routes/                    # Tab & Sub-View Routes
│   │   │   ├── HomeRoute.tsx          # Quick Status & Active Persona Card
│   │   │   ├── PersonasRoute.tsx      # 7-Dimension Editor & Library
│   │   │   ├── HistoryRoute.tsx       # Scraped Turns & Refinement Diffs
│   │   │   └── SettingsRoute.tsx      # Models, Temperatures, Cloud Sync
│   │   ├── sidepanel.css              # Design Tokens & Theming CSS Variables
│   │   └── components/                # Dimension Accordions & Card Grids
│   ├── popup/                         # Action Toolbar Popup (Max 400px x 500px)
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                    # Quick-Toggle & Status Indicator
│   ├── options/                       # Global Extension Settings
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── sections/                  # Settings Navigation Sections
│   │       ├── ApiKeysSection.tsx     # Web Crypto Vault Key Inputs
│   │       ├── ModelConfigSection.tsx # Sliders (Temperature, Top-P)
│   │       └── CloudSyncSection.tsx   # Supabase Credentials & Account
│   └── content.ts                     # Universal Injected Script Entrypoint
└── src/
    ├── components/
    │   ├── ui/                        # shadcn/ui Primitives (Radix Core)
    │   │   ├── button.tsx
    │   │   ├── dialog.tsx
    │   │   ├── dropdown-menu.tsx
    │   │   ├── tabs.tsx
    │   │   └── tooltip.tsx
    │   └── injections/                # Host Page Overlay Components
    │       ├── RefinerBadge.tsx       # Floating Action Badge
    │       ├── RatingOverlay.tsx      # Inline Rating Bar
    │       ├── DiffModal.tsx          # Prompt Comparison Dialog
    │       └── injections.css         # Scoped Styles for Shadow DOM
    └── core/theme/                    # Dynamic Theme Controller
        └── theme-controller.ts
```

---

## 3. Design System & CSS Variables (shadcn/ui New-York Style)

The design system standardizes on HSL color tokens aligned with shadcn/ui:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}
```

---

## 4. Form Validation with React Hook Form & Zod

Persona editing forms leverage `react-hook-form` paired with `@hookform/resolvers/zod`:

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PersonaV4Schema, type PersonaV4 } from '@/core/memory/schemas';

export const PersonaEditForm: React.FC<{ initial?: PersonaV4; onSave: (data: PersonaV4) => void }> = ({
  initial,
  onSave
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<PersonaV4>({
    resolver: zodResolver(PersonaV4Schema),
    defaultValues: initial
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Persona Name</label>
        <input {...register('metadata.suggested_name')} className="w-full rounded border p-2 text-sm" />
        {errors.metadata?.suggested_name && (
          <p className="text-xs text-destructive">{errors.metadata.suggested_name.message}</p>
        )}
      </div>
      {/* 7 Dimensions Inputs */}
      <button type="submit" disabled={isSubmitting} className="btn-primary">
        Save Persona
      </button>
    </form>
  );
};
```

---

## 5. Shadow DOM Isolation Invariant (`createShadowRootUi`)

Host chat platforms enforce aggressive resets. To guarantee presentation isolation:
- Styles are injected exclusively into the Shadow Root via `cssInjectionMode: 'ui'` using `injections.css?inline`.
- React Portals (e.g. modals, tooltips) are constrained to render inside the Shadow Root container rather than `document.body` to avoid style de-scoping.
