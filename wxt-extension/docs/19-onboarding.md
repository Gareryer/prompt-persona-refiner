# 19 - User Onboarding & First-Run Experience

> **Target Layer**: First-Time User Experience (FTUX) & Lifecycle Setup  
> **Core Entrypoints**: `wxt-extension/entrypoints/background.ts` & `wxt-extension/entrypoints/options/`  
> **Target Onboarding Time**: Under 60 seconds from installation to first refined prompt  
> **Classification**: UX Architecture & Onboarding Specification

---

## 1. Onboarding Philosophy & Design Goals

The primary UX challenge for developer-oriented AI browser extensions is **time-to-value**. Complex permission prompts, mandatory account registration, and confusing configuration screens cause high drop-off rates.

**Allie Persona & Prompt Refiner** enforces three core onboarding principles:
1. **Zero Mandatory Cloud Registration**: The extension functions immediately out of the box with client-side storage; Supabase community account creation is strictly optional.
2. **Automated First-Run Detection**: Upon installation, the Background Service Worker inspects existing configuration and immediately routes the user to the configuration wizard if no API key is detected.
3. **In-Situ Contextual Discovery**: When the user first visits a supported chatbot (such as ChatGPT or Gemini), non-intrusive contextual indicators guide them to trigger their first prompt refinement.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       First-Run Onboarding Journey                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                        │
│   Extension Installed from Web Store (chrome.runtime.onInstalled)                                      │
│                                │                                                                       │
│                                ▼                                                                       │
│   Background Worker Checks API Key (hasKey = await checkApiKey())                                      │
│                                │                                                                       │
│                ┌───────────────┴───────────────┐                                                       │
│                ▼ Has Key                       ▼ Missing Key                                           │
│       Keep Background Idle          Auto-Open Options Tab (chrome.runtime.openOptionsPage())           │
│                                                │                                                       │
│                                                ▼                                                       │
│                                    3-Step First-Run Wizard                                             │
│                                    1. Enter Provider Key (Gemini, OpenAI, Anthropic, OpenRouter)       │
│                                    2. Pick Default Persona (Tech Specialist, Tutor, Creative)          │
│                                    3. Test Connection in Live Sandbox                                  │
│                                                │                                                       │
│                                                ▼                                                       │
│                                    User Navigates to Supported Chatbot                                 │
│                                    (e.g., gemini.google.com / chatgpt.com)                             │
│                                                │                                                       │
│                                                ▼                                                       │
│                                    In-Page Discovery Indicator                                         │
│                                    RefinerBadge pulses once: "Press Ctrl+Shift+R to refine"            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Background Installation Detection (`entrypoints/background.ts`)

```typescript
// wxt-extension/entrypoints/background.ts
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    bgLog('info', 'Extension installed for the first time');
    
    // Check if user already has an active API key
    const { geminiApiKey, openaiApiKey } = await chrome.storage.local.get([
      'geminiApiKey',
      'openaiApiKey'
    ]);

    if (!geminiApiKey && !openaiApiKey) {
      bgLog('info', 'No API key configured - launching onboarding options tab');
      chrome.runtime.openOptionsPage();
    }
  } else if (details.reason === 'update') {
    bgLog('info', 'Extension updated to version', chrome.runtime.getManifest().version);
  }
});
```

---

## 3. The 3-Step Setup Wizard (`entrypoints/options/App.tsx`)

The Options page features a streamlined onboarding mode:

### Step 1: Provider Selection & API Key Configuration
- Users select their preferred generative AI model provider (Google Gemini, OpenAI, Anthropic, or OpenRouter).
- Input field automatically checks key format and provides a "Validate & Encrypt" action that executes a lightweight test ping to the upstream API.
- Upon successful response, the key is encrypted via AES-GCM and stored in `chrome.storage.local`.

### Step 2: Starter Persona Selection
Users select from 4 pre-configured factory persona templates:
1. **Senior Software Architect**: Focuses on clean code, first-principles reasoning, and strict typing.
2. **Technical Writer & Educator**: Focuses on clarity, structural formatting, and intuitive analogies.
3. **Executive Strategist**: High-density business summaries, decision trees, and ROI framing.
4. **General Research Assistant**: Socratic inquiry, broad analytical depth, and source attribution.

### Step 3: Interactive Sandbox Verification
An embedded prompt box allows the user to test refinement immediately inside the Options tab before switching to an external chatbot.

---

## 4. In-Page Discovery & Floating Tour Tooltip

When a user visits a supported chat interface for the first time after setup:
- The injected `RefinerBadge` inside the Shadow DOM displays a subtle onboarding pill:
  > *"✨ Allie is active! Click to refine or press **Ctrl+Shift+R**"*
- The pill auto-dismisses after 8 seconds or immediately upon the first refinement click.
- A flag `local:onboarding_tour_completed: true` is persisted to ensure the tour never re-appears.

---

## 5. Keyboard Shortcut Discovery

The extension registers standard keyboard shortcuts declared in `wxt.config.ts`:
- **`Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)**: Refines the current prompt in the active composer.
- **`Alt+M`**: Toggles the Chrome Side Panel open/closed.

Shortcuts are displayed prominently in the action popup and side panel footer with a direct link to `chrome://extensions/shortcuts` for custom re-mapping.
