# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **AI Prompt Engineers & Power Users**: Professionals who operate across multiple frontier chatbot interfaces (Gemini, Claude, ChatGPT, DeepSeek, Grok, Meta AI) and need reproducible, structured outputs without repeatedly copy-pasting persona and system instructions.
- **Developers & Content Creators**: Users seeking high-craft prompt refinement with real-time diff previews, tone controls, 7-dimension persona tuning, and conversational harvest exports.
- **Enterprise & Privacy-Conscious Individuals**: Users who mandate Bring-Your-Own-Key (BYOK) local-first execution, where API credentials and personal prompt turn data never touch unvetted intermediary cloud servers.

## Product Purpose

Allie Persona & Prompt Refiner bridges the gap between fragmented browser chatbot interfaces and durable, structured prompting. It enables users to compose, manage, and persist 7-dimension AI personas, refine raw prompts in-place with instant before/after diffs, and harvest multi-turn conversation transcripts into structured archives.

## Positioning

Unlike centralized web dashboards or brittle copy-paste prompt libraries, Allie is an integrated WebExtension Manifest V3 platform providing:
1. **Universal Host Chatbot Support**: Seamless in-situ operation across Google Gemini, ChatGPT, Claude, DeepSeek, Grok, and Meta AI.
2. **Clean-Room Shadow DOM UI Injection**: Floating refiner badges and rating overlays isolated via Shadow DOM (`createShadowRootUi`) ensuring 0 CSS bleed to/from host chat containers.
3. **Zero-Trust BYOK Privacy**: Client-side AES-256-GCM encryption vault for provider keys, keeping execution local-first with optional Supabase community synchronization.

## Operating Context

- **Host Chat Environments**: Resides directly on host chatbot DOMs (`gemini.google.com`, `chatgpt.com`, `claude.ai`, `chat.deepseek.com`, `grok.com`, `meta.ai`).
- **Extension Windows**: Side Panel workspace (`entrypoints/sidepanel`) for split-view persona crafting, prompt history inspection, and diff analysis; Options page (`entrypoints/options`) for credential vault and sync configuration.
- **Local Persistence Layer**: Local browser storage (`chrome.storage.local` via `@wxt-dev/storage`) and local IndexedDB for turn history and harvested exports.

## Capabilities and Constraints

- **7-Dimension Persona Engine**: Rigorous schema validation for `persona`, `context`, `tone`, `framework`, `constraints`, `format`, and `exemplar`.
- **In-Situ Prompt Refinement**: Interception of input submissions, one-click badge activation, and side-by-side visual diff comparison before sending to the model.
- **Provider Gateway**: Pluggable support for Gemini 2.5 Flash/Pro, OpenAI GPT-4o, Anthropic Claude 3.7 Sonnet, DeepSeek, and OpenRouter.
- **Technical Constraints**: Strict adherence to MV3 background service worker lifecycle rules (ephemeral state, synchronous listener registrations), zero CSS bleed, and strict TypeScript/Zod runtime verification.

## Brand Commitments

- **Tone & Identity**: Focused, developer-grade, calm, and trustworthy. Avoid flashy or distracting decorative animations that disrupt thoughtful prompt engineering.
- **Visual Harmony**: Side Panel and injected controls reflect the understated elegance of the host surfaces (Gemini Design System, subtle tonal surfaces, clean elevation).

## Evidence on Hand

- Complete 19-part specification suite in `docs/` detailing SOA architecture, IPC messaging protocol maps, cryptographic vault specs, and test strategies.
- Production WXT extension implementation with verified chatbot adapters and React 19 UI components.

## Product Principles

1. **Local-First & Sovereign**: User data and credentials belong to the user; cloud synchronization is strictly opt-in.
2. **Zero In-Page Interference**: Injected widgets must never disrupt the host chatbot's keyboard shortcuts, submit behaviors, or visual styling.
3. **Refinement Preserves Intent**: Prompt refinement improves structure, specificity, and constraints without distorting the core prompt goal.
4. **Deterministic Resilience**: When offline or when provider API limits are exhausted, fall back to deterministic local prompt synthesis.

## Accessibility & Inclusion

- Keyboard navigation across all modal and sidepanel controls (Esc to dismiss, Tab/Shift-Tab focus traps).
- High-contrast compliance across both dark and light modes with WCAG AAA / AA contrast ratios.
- Full respect for `prefers-reduced-motion` and system color schemes.
