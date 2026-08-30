# Injected UI Components (Shadow DOM)

## 📌 Architectural Overview
Components injected directly into host chatbot SPAs (Gemini, ChatGPT, Claude, DeepSeek, Grok, Meta AI) are rendered inside an isolated **Shadow Root** using WXT's `createShadowRootUi`.

### Invariants:
1. **Zero CSS Bleed**: Styles in `injections.css` are scoped entirely inside the Shadow Root.
2. **Framework Resilience**: Component lifecycle is bound to the WXT `ContentScriptContext` (`ctx`).
3. **Pluggable Mounts**: `RefinerBadge` mounts beside the active composer, while `RatingOverlay` mounts below model turns.
