---
name: Allie Persona & Prompt Refiner
description: Gemini-inspired calm, developer-grade design system for browser context orchestration
colors:
  primary: "#a8c7fa"
  primary-container: "rgba(168, 199, 250, 0.15)"
  on-primary: "#041e49"
  bg-dark: "#000000"
  surface-dark: "#1e1f20"
  surface-container-dark: "#0e0e0e"
  surface-container-high-dark: "#2d2e2f"
  text-primary-dark: "#e3e3e3"
  text-secondary-dark: "#c4c7c5"
  text-tertiary-dark: "#8e918f"
  outline-dark: "#444746"
  outline-variant-dark: "#3c4043"
  divider-dark: "#3c4043"
  success-dark: "#81c995"
  error-dark: "#f28b82"
  warning-dark: "#fdd663"
  primary-light: "#0b57d0"
  primary-container-light: "rgba(11, 87, 208, 0.12)"
  on-primary-light: "#ffffff"
  bg-light: "#f0f4f8"
  surface-light: "#ffffff"
  surface-container-light: "#e9eef6"
  surface-container-high-light: "#dde3ea"
  text-primary-light: "#1f1f1f"
  text-secondary-light: "#444746"
  text-tertiary-light: "#747775"
  outline-light: "#747775"
  outline-variant-light: "#c4c7c5"
  divider-light: "#c4c7c5"
  success-light: "#1e8e3e"
  error-light: "#d93025"
  warning-light: "#f9ab00"
  brand-google: "#4285F4"
  brand-openai: "#10A37F"
  brand-anthropic: "#D97706"
  brand-deepseek: "#0EA5E9"
  brand-openrouter: "#6366F1"
  brand-meta: "#6B7280"
typography:
  display:
    fontFamily: "Google Sans Display, Google Sans Flex, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.2
  title:
    fontFamily: "Google Sans, Google Sans Flex, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
  code:
    fontFamily: "'Google Sans Mono', 'Fira Code', 'JetBrains Mono', 'SF Mono', Consolas, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  icons:
    fontFamily: "Material Symbols Outlined"
    fontSize: "18px"
  host-chatgpt:
    fontFamily: "SöHne, -apple-system, BlinkMacSystemFont, sans-serif"
  host-claude:
    fontFamily: "Tipperary, -apple-system, BlinkMacSystemFont, sans-serif"
  host-gemini:
    fontFamily: "Google Sans Flex, -apple-system, BlinkMacSystemFont, sans-serif"
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "28px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface-container-high-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.full}"
    padding: "8px 16px"
  card-container:
    backgroundColor: "{colors.surface-dark}"
    rounded: "{rounded.md}"
    padding: "16px"
---

# Design System: Allie Persona & Prompt Refiner

## Overview

Allie's visual design is derived directly from the **Gemini Design System** (Material You for web AI interfaces). The design emphasizes **Operate** mode: high scanability, high information density without clutter, quiet utility, and seamless coexistence with host chatbot interfaces (Gemini, Claude, ChatGPT, DeepSeek, Grok, Meta AI).

### Core Philosophy
1. **Calm & Focused**: No garish gradients, bouncing modals, or distracting status pulses.
2. **True Tonal Hierarchy**: Surfaces progress naturally from deep background to elevated containers without arbitrary colored borders.
3. **Host-Native Harmony**: When injected via Shadow DOM into host chat views, elements feel like integrated, premium browser utilities rather than foreign overlays.

---

## Colors

The palette supports full dark mode (default) and light mode, switching automatically based on `prefers-color-scheme` or user toggle.

### Dark Mode (Default)
- **Background**: `#000000` (deep canvas)
- **Surfaces**:
  - Base Surface: `#1e1f20`
  - Container (recessed): `#0e0e0e`
  - Container High (elevated): `#2d2e2f`
- **Text & Content**:
  - Primary: `#e3e3e3` (high emphasis)
  - Secondary: `#c4c7c5` (medium emphasis)
  - Tertiary: `#8e918f` (captions, disabled states)
- **Accents**:
  - Primary Accent: `#a8c7fa` (soft periwinkle blue)
  - Accent Container: `rgba(168, 199, 250, 0.15)`
  - On-Accent: `#041e49`
- **Semantic Feedback**:
  - Success: `#81c995` (calm green)
  - Error: `#f28b82` (calm coral red)
  - Warning: `#fdd663` (amber yellow)
- **Borders & Dividers**:
  - Outline: `#444746`
  - Outline Variant / Divider: `#3c4043`

### Light Mode
- **Background**: `#f0f4f8`
- **Surfaces**:
  - Base Surface: `#ffffff`
  - Container: `#e9eef6`
  - Container High: `#dde3ea`
- **Text & Content**:
  - Primary: `#1f1f1f`
  - Secondary: `#444746`
  - Tertiary: `#747775`
- **Accents**:
  - Primary Accent: `#0b57d0`
  - On-Accent: `#ffffff`
- **Semantic Feedback**:
  - Success: `#1e8e3e`
  - Error: `#d93025`
  - Warning: `#f9ab00`

---

## Typography

- **Display & Headings**: `Google Sans Display`, `Google Sans Flex`, `Google Sans`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
  - Weights: 500 (Medium), 600 (Semi-bold)
  - Scale: Display `24px` (line-height 1.2), Headline `18px`, Title `16px`
- **Body & Controls**: `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
  - Weights: 400 (Regular), 500 (Medium)
  - Scale: Body `13px` (line-height 1.5), Dense Body `12px`, Label/Caption `11px` (line-height 1.4)
- **Monospace (Code, Session IDs & Diff Viewer)**: `'Google Sans Mono'`, `'Fira Code'`, `'JetBrains Mono'`, `'SF Mono'`, `Consolas`, `monospace`
  - Font size: `12px` (line-height 1.45), dense tokens `11px`
- **Icons**: `Material Symbols Outlined` (Google Material Symbols, optical size 20-24px)
- **Host Chatbot Adapters**:
  - ChatGPT bridge: `SöHne`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - Claude bridge: `Tipperary`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
  - Gemini bridge: `Google Sans Flex`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`

---

## Layout

- **Side Panel**: Compact fixed-width viewport (typically 380px to 450px).
  - Uses vertical flex layouts with pinned header and sticky footer action bars.
  - Scrollable content zones with styled, unobtrusive scrollbars (`--scrollbar-thumb: #444746`).
- **Options Window**: Centered single-column layout constrained to `max-width: 800px`, padding `40px 20px`.
- **In-Page Injections**:
  - Floating `RefinerBadge` positioned directly adjacent to host submit buttons or input areas.
  - Non-intrusive `RatingOverlay` mounted immediately underneath AI turn responses.

---

## Elevation & Depth

Elevation is conveyed primarily through **tonal surface layering** rather than heavy blurred drop shadows:
- **Low Elevation**: `0 1px 2px rgba(0, 0, 0, 0.3)`
- **Medium Elevation (Flyouts, Menus)**: `0 2px 6px rgba(0, 0, 0, 0.4)`
- **High Elevation (Modals, Dialogs)**: `0 4px 16px rgba(0, 0, 0, 0.5)`
- **Zero Glows**: Never use zero-offset colored glow halos (`box-shadow: 0 0 15px ...`).

---

## Shapes & Radius

- **Small (`4px`)**: Badges, status tags, inline code chips.
- **Medium (`8px`)**: Form inputs, textareas, card containers, dropdown menus.
- **Large (`16px`)**: Floating overlays, dialog containers, modal sheets.
- **Full Pill (`9999px`)**: Action buttons, active filter pills, floating action badges.

---

## Components

### 1. Buttons
- **Primary Action**: Pill radius (`border-radius: 9999px`), background `--color-accent`, text `--color-on-accent`, font-weight 500. Smooth hover tint.
- **Tonal / Secondary Action**: Background `--color-surface-container-high`, text `--color-text-primary`, border `1px solid --color-outline-variant`.
- **Icon Buttons**: Circle radius, transparent background, `--color-hover` on hover.

### 2. Cards & Accordions
- Recessed or tonal background (`--color-surface-container`).
- Balanced 1px perimeter border (`--color-outline-variant`).
- **No thick one-sided border lines (side-tabs)**.

### 3. Modal Dialogs
- Backdrop: `rgba(0, 0, 0, 0.6)` with subtle backdrop blur (`3px`).
- Modal Card: `--color-surface`, subtle 1px border `--color-outline`, smooth cubic-bezier exit/entrance.
- Motion: Smooth exponential deceleration (`ease-out-quint` or `cubic-bezier(0.16, 1, 0.3, 1)`), strictly avoiding bounce or overshoot.

### 4. Status & Diff Indicators
- Status dots: Calm, solid 6px or 8px indicators. No infinite pulsing animations unless actively transmitting live streaming data.
- Diff Viewer: Subtle line additions (`rgba(129, 201, 149, 0.15)`) and deletions (`rgba(242, 139, 130, 0.15)`), preserving monospaced alignment.

---

## Do's and Don'ts

### Do:
- **Do** use tonal surface levels (`--color-surface-container`, `--color-surface-container-high`) for hierarchy.
- **Do** provide clear focus indicators (`--color-focus`) for all interactive elements.
- **Do** ensure all text maintains WCAG AA contrast (minimum 4.5:1 for body, 3:1 for large text).
- **Do** animate height using CSS Grid (`grid-template-rows: 0fr` -> `1fr`) or opacity/transform to prevent layout thrashing.
- **Do** honor `prefers-reduced-motion` across all transitions.

### Don't:
- **Don't** use colored glow halos around cards, inputs, or status badges (`box-shadow: 0 0 10px #22c55e`).
- **Don't** add thick 3px-4px colored left-borders on cards to denote status (AI side-tab anti-pattern).
- **Don't** use bouncy, elastic, or overshoot easing curves (`dialogBounce`); deceleration should feel natural and physical.
- **Don't** animate `max-height` with arbitrary pixel estimates; it produces sluggish, jerky animation curves.
- **Don't** use generic default font fallbacks without system-native font stacks.
