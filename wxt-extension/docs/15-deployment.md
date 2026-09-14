# 15 - Deployment, Release Engineering & Store Publishing

> **Target Layer**: Production Build Packaging, Release Channels, Store Review Compliance & Rollback Protocols  
> **Tooling**: `wxt zip`, `wxt submit`, `@wxt-dev/auto-publish`, GitHub Actions, Bun Runtime  
> **Supported Marketplaces**: Chrome Web Store, Firefox Add-ons (AMO), Microsoft Edge Add-ons  
> **Classification**: Release Engineering & Store Delivery Specification

---

## 1. Overview & Multi-Store Packaging Strategy

Browser extensions must be distributed through distinct vendor stores, each requiring different manifest formats, asset packages, and verification standards:
- **Google Chrome Web Store**: Requires Manifest V3 (`.output/chrome-mv3.zip`).
- **Mozilla Firefox (AMO)**: Supports MV2 or MV3 with Firefox-specific ID declarations (`.output/firefox-mv2.zip`).
- **Microsoft Edge Add-ons**: Ingests standard Chromium MV3 packages with Edge-specific developer credentials.

WXT automates compilation and store packaging via native commands (`wxt build`, `wxt zip`, `wxt submit`).

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Multi-Store Release Pipeline                                     │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                      Git Release Tag (v1.0.0)                                          │
│                                                   │                                                    │
│                                     GitHub Actions Runner                                              │
│                                     bun run test && bun run typecheck                                  │
│                                                   │                                                    │
│                        ┌──────────────────────────┴──────────────────────────┐                         │
│                        ▼                                                     ▼                         │
│             wxt build --browser chrome                            wxt build --browser firefox          │
│             wxt zip --browser chrome                              wxt zip --browser firefox            │
│             (.output/chrome-mv3.zip)                              (.output/firefox-mv2.zip)            │
│                        │                                                     │                         │
│         ┌──────────────┴──────────────┐                                      │                         │
│         ▼                             ▼                                      ▼                         │
│ ┌───────────────┐             ┌───────────────┐                      ┌───────────────┐                 │
│ │ Chrome Store  │             │ Edge Store    │                      │ Mozilla AMO   │                 │
│ │ API Upload    │             │ API Upload    │                      │ Web-Ext Sign  │                 │
│ └───────────────┘             └───────────────┘                      └───────────────┘                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Versioning Strategy & Changelog Standards

### 2.1. Semantic Versioning (SemVer)
The project adheres to Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Breaking changes to storage schemas requiring manual data migration, breaking protocol messages, or removed permissions.
- **MINOR**: New platform adapters (e.g., adding Claude or Grok), new UI features, or non-breaking API integrations.
- **PATCH**: Bug fixes, updated host DOM selectors, security patches, or documentation improvements.

### 2.2. Changelog Format
All releases are tracked in `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) standard:

```markdown
# Changelog

## [1.0.0] - 2026-09-14
### Added
- Multi-chatbot prompt refiner supporting Gemini, ChatGPT, Claude, DeepSeek, Grok, and Meta AI.
- Local AES-GCM 256-bit envelope encryption for BYOK API keys.
- Chrome Side Panel split-view and responsive action popup.
- Shadow DOM injected refiner pill with real-time prompt streaming.
- Community Persona marketplace sync powered by Supabase.

### Security
- Zero remote code injection (strict MV3 CSP).
- Ephemeral background worker with zero in-memory credential storage.
```

---

## 3. Release Channels & Rollout Strategy

| Channel | Purpose | Version Pattern | Deployment Target |
| :--- | :--- | :--- | :--- |
| **Stable** | Production users | `v1.0.0` | 100% public roll-out on Chrome, Firefox, Edge |
| **Beta / Staged** | Canary & early adopters | `v1.1.0-beta.1` | 10% staged rollout or Chrome Web Store trusted tester group |
| **Dev / PR** | CI branch testing | `v1.1.0-dev.{sha}` | Ephemeral CI test artifacts attached to GitHub Actions runs |

---

## 4. Chrome Web Store Review Compliance & Permissions Justification

Extensions frequently face review rejections if permissions are not strictly justified in store listings. Allie Persona & Prompt Refiner provides exact, narrow justifications:

| Permission | Technical Reason | User-Facing Justification |
| :--- | :--- | :--- |
| `storage` | Persists user settings, personas, and encrypted keys | Saves your custom personas and preferences locally on your machine. |
| `unlimitedStorage` | Prevents quota errors with large persona libraries & history | Ensures extensive conversation refinement logs do not exhaust local quota. |
| `sidePanel` | Displays the full persona editor alongside web pages | Enables side-by-side prompt tuning while interacting with AI chats. |
| `tabs` | Identifies URL changes to mount platform adapters | Detects when you open supported AI platforms to mount the refiner badge. |
| `clipboardWrite` | Enables 1-click copy of refined prompts to clipboard | Allows one-click copying of optimized prompts directly into your clipboard. |
| `scripting` | Programmatic fallback injection if declarative scripts delay | Injects the refiner pill dynamically on single-page-app navigation hops. |
| `host_permissions` | Direct communication with AI chat hosts & LLM APIs | Connects to chat frontends and calls your chosen AI provider APIs (Gemini, OpenAI, Anthropic). |

### Store Asset Dimensions
- **Icons**: `16x16`, `32x32`, `48x48`, `128x128` (PNG format, transparent background).
- **Store Screenshots**: Minimum 1, maximum 5; exactly `1280x800` or `640x400` pixels.
- **Small Promo Tile**: `440x280` pixels.
- **Marquee Tile**: `1400x560` pixels.

---

## 5. Automated Multi-Store Publishing (`wxt submit`)

WXT includes first-class support for programmatic store publishing, eliminating manual ZIP uploads to developer dashboards:

```bash
# Package Chrome MV3 and Firefox MV2 ZIP archives
bun run zip
bun run zip -b firefox

# Submit Chrome package programmatically
npx wxt submit --chrome-zip .output/*-chrome.zip

# Submit Firefox AMO package programmatically
npx wxt submit --firefox-zip .output/*-firefox.zip --firefox-sources-zip .output/*-sources.zip
```

---

## 6. GitHub Actions CI/CD Pipeline

```yaml
# .github/workflows/release.yml
name: Release Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Install Bun
        uses: oven-sh/setup-bun@v1

      - name: Install Dependencies
        run: cd wxt-extension && bun install --frozen-lockfile

      - name: Quality Gate 1: Typecheck
        run: cd wxt-extension && bun run typecheck

      - name: Quality Gate 2: Unit Tests
        run: cd wxt-extension && bun run test

      - name: Package ZIP Archives
        run: |
          cd wxt-extension
          bun run zip
          bun run zip -b firefox

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            wxt-extension/.output/*.zip
          generate_release_notes: true

      - name: Programmatic Store Submission
        run: cd wxt-extension && npx wxt submit
        env:
          CHROME_EXTENSION_ID: ${{ secrets.CHROME_EXTENSION_ID }}
          CHROME_CLIENT_ID: ${{ secrets.CHROME_CLIENT_ID }}
          CHROME_CLIENT_SECRET: ${{ secrets.CHROME_CLIENT_SECRET }}
          CHROME_REFRESH_TOKEN: ${{ secrets.CHROME_REFRESH_TOKEN }}
          FIREFOX_EXTENSION_ID: ${{ secrets.FIREFOX_EXTENSION_ID }}
          FIREFOX_JWT_ISSUER: ${{ secrets.FIREFOX_JWT_ISSUER }}
          FIREFOX_JWT_SECRET: ${{ secrets.FIREFOX_JWT_SECRET }}
```

---

## 7. Emergency Rollback Protocols & Runbook

In the event of a critical regression in production:

### 7.1. Incident Severity Matrix
| Severity | Definition | Target Resolution | Action |
| :--- | :--- | :--- | :--- |
| **P0 - Critical** | Host page crash, security vulnerability, key leak | < 2 hours | Immediate patch bump + expedited rollback submission. |
| **P1 - Major** | Platform adapter broken after chatbot DOM change | < 12 hours | Fast-lane hotfix branch + store review push. |
| **P2 - Minor** | Formatting cosmetic error, non-blocking UI bug | Next cycle | Regular PR targeting `release/v*`. |

### 7.2. Rollback Execution Checklist
1. **Identify Last Known Good Commit**:
   ```bash
   git log --oneline -n 5
   # Identify tag: e.g. v1.0.4
   ```
2. **Cut Hotfix Branch**:
   ```bash
   git checkout -b hotfix/v1.0.6 tags/v1.0.4
   ```
3. **Bump Patch Version in `package.json`**:
   Set `"version": "1.0.6"` (Store dashboards reject lower or identical version numbers).
4. **Run Verification Gates**:
   ```bash
   bun run typecheck && bun run test && bun run build
   ```
5. **Tag and Push**:
   ```bash
   git commit -am "hotfix: rollback critical regression to v1.0.4 codebase"
   git tag v1.0.6
   git push origin v1.0.6
   ```
6. **Submit to Web Store with Expedited Review Flag**:
   In the Chrome Developer Dashboard, mark submission as an emergency regression rollback to trigger accelerated manual triage.
