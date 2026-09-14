# 19 - User Onboarding & First-Run Experience (FTUX)

> **Target Layer**: First-Time User Experience (FTUX) & Lifecycle State Machine  
> **Core Entrypoints**: `wxt-extension/entrypoints/background.ts`, `entrypoints/options/`, `entrypoints/sidepanel/`, and Shadow DOM content scripts  
> **Target Onboarding Time**: Under 60 seconds from installation to first refined prompt  
> **Classification**: UX Architecture & Onboarding Specification

---

## 1. Onboarding Philosophy & Design Goals

The primary UX challenge for developer-oriented AI browser extensions is **time-to-value**. Complex permission prompts, mandatory account registration, and confusing configuration screens cause high drop-off rates.

**Allie Persona & Prompt Refiner** enforces four core onboarding principles:
1. **Zero Mandatory Cloud Registration**: The extension functions immediately out of the box with client-side storage; Supabase community account creation is strictly optional.
2. **Progressive Disclosure**: Show features and configuration only when needed. If an API key is missing, prompt inline or via the setup wizard without blocking basic exploration.
3. **Contextual Empty States**: Every view (Personas list, History, Marketplace, Sidepanel) features rich empty states with direct call-to-actions (CTAs) rather than blank screens.
4. **In-Situ Contextual Discovery**: When the user first visits a supported chatbot (such as ChatGPT, Claude, or Gemini), non-intrusive contextual indicators guide them to trigger their first prompt refinement.

---

## 2. Onboarding Lifecycle & State Machine

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       ONBOARDING STATE MACHINE                                         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   INSTALL (chrome.runtime.onInstalled)                                                                 │
│      │                                                                                                 │
│      ▼                                                                                                 │
│   ┌──────────────────────────┐                                                                        │
│   │   WELCOME CAROUSEL       │  "Welcome to Prompt Persona & Refiner"                                  │
│   │   DIALOG                 │  → 3-slide visual carousel (Personas, 6 Chatbots, Privacy-First)        │
│   └────────────┬─────────────┘  → [Get Started] or [Skip Intro]                                        │
│                │                                                                                       │
│                ▼                                                                                       │
│   ┌──────────────────────────┐                                                                        │
│   │   API KEY SETUP          │  "Set up your primary AI provider"                                      │
│   │   (Options Page / Modal) │  → Provider selection (Gemini, OpenAI, Anthropic, OpenRouter, etc.)     │
│   └────────────┬─────────────┘  → AES-GCM encrypted local storage + Live Ping validation               │
│                │                → [Skip for now] supported                                             │
│                ▼                                                                                       │
│   ┌──────────────────────────┐                                                                        │
│   │   FIRST REFINE SANDBOX   │  "Try refining your first prompt"                                       │
│   │   (Interactive Demo)     │  → Pre-filled prompt with starter persona selection                     │
│   └────────────┬─────────────┘  → Live preview of prompt enhancement                                    │
│                │                                                                                       │
│                ▼                                                                                       │
│   ┌──────────────────────────┐                                                                        │
│   │   ONBOARDING COMPLETE    │  "You're all set!"                                                      │
│   │   (Ready for In-Situ)    │  → Displays keyboard shortcut: Ctrl+Shift+R (Mac: Cmd+Shift+R)          │
│   └────────────┬─────────────┘  → Directs user to open ChatGPT, Claude, or Gemini                      │
│                │                                                                                       │
│                ▼                                                                                       │
│   ┌──────────────────────────┐                                                                        │
│   │   IN-PAGE DISCOVERY      │  Injected badge pulses subtly beside chat composer:                     │
│   │   (Shadow DOM Pill)      │  "✨ Allie is active! Press Ctrl+Shift+R to refine"                     │
│   └──────────────────────────┘                                                                        │
│                                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Background Installation Detection (`entrypoints/background.ts`)

```typescript
// wxt-extension/entrypoints/background.ts
import { onboardingState } from '@/services/storage';

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    bgLog('info', 'Extension installed for the first time');
    
    // Initialize onboarding state
    await onboardingState.setValue({
      completed: false,
      skippedWelcome: false,
      skippedApiKey: false,
      skippedTour: false,
      completedAt: null,
      seenFeatures: [],
    });

    // Check if user already has an active API key
    const { geminiApiKey, openaiApiKey, anthropicApiKey, openrouterApiKey } = 
      await chrome.storage.local.get([
        'geminiApiKey',
        'openaiApiKey',
        'anthropicApiKey',
        'openrouterApiKey'
      ]);

    if (!geminiApiKey && !openaiApiKey && !anthropicApiKey && !openrouterApiKey) {
      bgLog('info', 'No API key configured - launching onboarding options tab');
      chrome.runtime.openOptionsPage();
    }
  } else if (details.reason === 'update') {
    bgLog('info', 'Extension updated to version', chrome.runtime.getManifest().version);
  }
});
```

---

## 4. Welcome Screen & Carousel Specification

### 4.1. Carousel Slide Definitions
```typescript
// wxt-extension/src/components/onboarding/welcome-slides.ts

export interface WelcomeSlide {
  id: string;
  title: string;
  description: string;
  illustration: string;
  badge?: string;
}

export const WELCOME_SLIDES: WelcomeSlide[] = [
  {
    id: 'intro',
    title: 'Transform Raw Prompts into Expert Output',
    description: 'Elevate casual prompts into high-density, structured instructions tailored for leading AI models.',
    illustration: '/assets/onboarding/refine-hero.svg',
    badge: 'Instant Refinement'
  },
  {
    id: 'personas',
    title: 'Custom Persona Workflows',
    description: 'Select or craft domain personas—from Senior TypeScript Architect to Executive Copywriter—to steer tone and depth.',
    illustration: '/assets/onboarding/personas-hero.svg',
    badge: 'Tailored Roles'
  },
  {
    id: 'everywhere',
    title: 'Seamless In-Page Chat Integration',
    description: 'Works natively inside ChatGPT, Claude, Gemini, DeepSeek, Grok, and Meta AI with zero copy-pasting required.',
    illustration: '/assets/onboarding/platforms-hero.svg',
    badge: '6 Major Platforms'
  }
];
```

### 4.2. Welcome Dialog Component
```tsx
// wxt-extension/src/components/onboarding/WelcomeDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { WELCOME_SLIDES } from './welcome-slides';
import { cn } from '@/lib/utils';

export function WelcomeDialog({ 
  open, 
  onComplete, 
  onSkip 
}: { 
  open: boolean; 
  onComplete: () => void; 
  onSkip: () => void; 
}) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLastSlide = currentSlide === WELCOME_SLIDES.length - 1;
  const slide = WELCOME_SLIDES[currentSlide];

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
        <div className="text-center py-6">
          {slide.badge && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary mb-4">
              <Sparkles className="w-3 h-3" />
              {slide.badge}
            </span>
          )}
          <div className="w-48 h-40 mx-auto mb-6 flex items-center justify-center bg-muted/40 rounded-xl">
            <img src={slide.illustration} alt="" className="max-h-32 object-contain" />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-2 text-foreground">
            {slide.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">
            {slide.description}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {WELCOME_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all duration-300',
                i === currentSlide ? 'bg-primary w-6' : 'bg-muted-foreground/30'
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentSlide((s) => s - 1)}
            disabled={currentSlide === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {isLastSlide ? (
            <Button size="sm" onClick={onComplete} className="bg-primary text-primary-foreground">
              Get Started
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setCurrentSlide((s) => s + 1)}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>

        <button
          onClick={onSkip}
          className="text-xs text-muted-foreground hover:text-foreground text-center mt-3 transition-colors"
        >
          Skip intro
        </button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 5. First-Run Setup Wizard (Options Page)

The full onboarding wizard is integrated into `entrypoints/options/` to ensure a smooth, distraction-free configuration.

### 5.1. Wizard Steps
1. **Step 1: Provider Selection & Live Key Validation**:
   - Provider grid: Google Gemini, OpenAI, Anthropic, OpenRouter, DeepSeek, Grok.
   - User inputs API key.
   - An active network ping validates the key against the selected provider's models endpoint before storing.
   - Upon success, key is encrypted via AES-GCM 256-bit envelope encryption into `chrome.storage.local`.
2. **Step 2: Starter Persona Selection**:
   - User selects 1 of 4 factory starter personas:
     - **Senior Software Architect**: Clean architecture, strict typing, edge-case coverage.
     - **Technical Writer & Educator**: Clarity, digestible structure, intuitive analogies.
     - **Executive Strategist**: High-density business summaries, decision trees, ROI framing.
     - **General Research Assistant**: Socratic inquiry, deep analytical depth, source citations.
3. **Step 3: Interactive Sandbox Verification**:
   - In-page prompt refiner sandbox with a pre-filled sample prompt:
     > *"Write a function to fetch user data and handle errors"*
   - User clicks **Refine Prompt** to observe live streaming/transformation in real time.

---

## 6. Comprehensive Empty States Specification

Every feature screen must provide actionable, helpful empty states rather than empty blank tables or text.

### 6.1. When No Custom Personas Exist (`EmptyPersonas`)
```tsx
// wxt-extension/src/components/personas/EmptyPersonas.tsx
import React from 'react';
import { UserPlus, Sparkles, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyPersonas({ 
  onCreateNew, 
  onExploreMarketplace 
}: { 
  onCreateNew: () => void; 
  onExploreMarketplace: () => void; 
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-dashed border-border rounded-xl bg-card/50">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
        <UserPlus className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold mb-1 text-foreground">No custom personas yet</h3>
      <p className="text-xs text-muted-foreground mb-6 max-w-sm leading-relaxed">
        Personas steer AI behavior to match your exact tone, role, and formatting requirements.
        Create your own or clone community templates from the marketplace.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="sm" onClick={onCreateNew}>
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          Create Persona
        </Button>
        <Button size="sm" variant="outline" onClick={onExploreMarketplace}>
          <Store className="w-3.5 h-3.5 mr-1.5" />
          Browse Marketplace
        </Button>
      </div>
    </div>
  );
}
```

### 6.2. When No API Key Configured (`NoApiKeyWarning`)
```tsx
// wxt-extension/src/components/refine/NoApiKeyWarning.tsx
import React from 'react';
import { KeyRound, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function NoApiKeyWarning({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-xl text-center">
      <KeyRound className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">API Key Required</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs mx-auto">
        To refine prompts directly in your browser, configure at least one provider API key.
        Keys are encrypted locally and never transmitted to our servers.
      </p>
      <Button size="sm" onClick={onOpenSettings} className="bg-amber-600 hover:bg-amber-700 text-white">
        <Settings className="w-3.5 h-3.5 mr-1.5" />
        Configure API Keys
      </Button>
    </div>
  );
}
```

### 6.3. When History is Empty (`EmptyHistory`)
```tsx
// wxt-extension/src/components/history/EmptyHistory.tsx
import React from 'react';
import { History } from 'lucide-react';

export function EmptyHistory() {
  return (
    <div className="py-12 px-4 text-center border border-dashed border-border rounded-xl">
      <History className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">No refinement history</h3>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Your prompt refinement sessions, diff comparisons, and token metrics will appear here.
      </p>
    </div>
  );
}
```

---

## 7. In-Situ In-Page Discovery & Floating Tour Tooltip

When the user first visits a supported chatbot interface (`gemini.google.com`, `chatgpt.com`, `claude.ai`, etc.):
1. The injected Shadow DOM UI detects that `local:onboarding.skippedTour` is false.
2. A sleek floating onboarding pill attaches to the `RefinerBadge`:
   ```
   ┌────────────────────────────────────────────────────────┐
   │ ✨ Allie is active!                                    │
   │ Click here or press Ctrl+Shift+R to refine your prompt │
   │                                           [Got it]     │
   └────────────────────────────────────────────────────────┘
   ```
3. Clicking **[Got it]** or triggering a refinement marks `onboarding.skippedTour = true` in `@wxt-dev/storage`.

---

## 8. Onboarding State Management Schema

```typescript
// wxt-extension/src/services/storage.ts
import { storage } from 'wxt/storage';

export interface OnboardingState {
  completed: boolean;
  skippedWelcome: boolean;
  skippedApiKey: boolean;
  skippedTour: boolean;
  completedAt: string | null;
  seenFeatures: string[];
}

export const onboardingState = storage.defineItem<OnboardingState>(
  'local:onboarding',
  {
    defaultValue: {
      completed: false,
      skippedWelcome: false,
      skippedApiKey: false,
      skippedTour: false,
      completedAt: null,
      seenFeatures: [],
    }
  }
);
```

### TanStack Query Hook (`useOnboarding`)
```typescript
// wxt-extension/src/hooks/use-onboarding.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingState, OnboardingState } from '@/services/storage';

export function useOnboarding() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: async () => onboardingState.getValue(),
    staleTime: Infinity,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<OnboardingState>) => {
      const current = await onboardingState.getValue();
      await onboardingState.setValue({ ...current, ...updates });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-state'] });
    },
  });

  return {
    state: query.data,
    isLoading: query.isLoading,
    complete: () => updateMutation.mutate({ completed: true, completedAt: new Date().toISOString() }),
    skipWelcome: () => updateMutation.mutate({ skippedWelcome: true }),
    skipApiKey: () => updateMutation.mutate({ skippedApiKey: true }),
    skipTour: () => updateMutation.mutate({ skippedTour: true }),
    markFeatureSeen: (feature: string) => {
      const current = query.data?.seenFeatures ?? [];
      if (!current.includes(feature)) {
        updateMutation.mutate({ seenFeatures: [...current, feature] });
      }
    }
  };
}
```

---

## 9. Cloud Conversion Triggers (Supabase Sync)

When users reach specific engagement thresholds, contextual non-intrusive callouts invite them to sign up for cloud synchronization:

| Trigger Point | Contextual Prompt | Benefit Highlighted |
| :--- | :--- | :--- |
| **Persona Limit (Local > 10)** | *"Sync and manage your persona library across all devices"* | Multi-device cloud sync via Supabase Auth |
| **Marketplace Fork / Publish** | *"Sign up with Google/GitHub to publish or upvote personas"* | Public author profile and community analytics |
| **Cross-Device Backup** | *"Keep your custom templates safe across browser updates"* | Cloud backup and automated conflict resolution |
