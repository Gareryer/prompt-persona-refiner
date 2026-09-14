# 15 - Deployment & Automated Store Publishing

> **Target Layer**: Production Build Packaging & Multi-Store Release Pipelines  
> **Tooling**: `wxt zip`, `wxt submit`, `@wxt-dev/auto-publish`, GitHub Actions  
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

## 2. Store Asset Packaging (`wxt zip`)

The production packaging step strips developer source maps, compresses bundle assets, and verifies manifest integrity:

```bash
# Compile and create .output/allie-persona-prompt-refiner-1.0.0-chrome.zip
bun run zip

# Compile and create .output/allie-persona-prompt-refiner-1.0.0-firefox.zip
bun run zip -b firefox
```

---

## 3. Automated Publishing (`wxt submit`)

WXT includes first-class support for programmatic store publishing, eliminating manual ZIP uploads to store consoles:

### 3.1 Chrome Web Store Automation
Requires Google Cloud Service Account OAuth credentials:
- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`

```bash
wxt submit --chrome-zip .output/*-chrome.zip
```

### 3.2 Mozilla Firefox Add-ons (AMO) Automation
Requires Mozilla JWT credentials:
- `FIREFOX_EXTENSION_ID`
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

```bash
wxt submit --firefox-zip .output/*-firefox.zip --firefox-sources-zip .output/*-sources.zip
```

---

## 4. GitHub Actions CI/CD Pipeline

Continuous Integration automatically tests, builds, and publishes tagged releases to production:

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

      - name: Run Quality Gate 1 (Typecheck)
        run: cd wxt-extension && bun run typecheck

      - name: Run Quality Gate 2 (Unit Tests)
        run: cd wxt-extension && bun run test

      - name: Build and Package ZIPs
        run: |
          cd wxt-extension
          bun run zip
          bun run zip -b firefox

      - name: Publish to Web Stores
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

## 5. Branching Model & Release Gates

All releases adhere to the `parallel-cycle-release` contract:
1. Feature work targets active cycle branch (`release/v1.0.0`).
2. Release cycle is frozen and squash-merged to `main`.
3. Immutable git tag `v1.0.0` cut on `main` triggers store submission.
