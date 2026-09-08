/**
 * OpenAI ChatGPT Design Tokens (Allie Namespace).
 * Follows OpenAI's Söhne typography, dark/light surfaces, emerald accent (#10a37f),
 * and encapsulated '--allie-*' CSS custom properties.
 */
export const CHATGPT_TOKENS = {
  typography: {
    fontFamily: "'Söhne', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif",
    fontSizeSm: '12px',
    fontSizeBase: '14px',
    fontSizeLg: '16px',
    lineHeight: '1.5',
    cssVars: {
      '--allie-font-family': "'Söhne', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif",
      '--allie-font-size-sm': '12px',
      '--allie-font-size-base': '14px',
      '--allie-font-size-lg': '16px',
      '--allie-line-height': '1.5'
    }
  },
  radii: {
    pill: '9999px',
    card: '16px',
    input: '24px',
    sm: '8px',
    lg: '24px',
    cssVars: {
      '--allie-radius-pill': '9999px',
      '--allie-radius-card': '16px',
      '--allie-radius-input': '24px',
      '--allie-radius-sm': '8px',
      '--allie-radius-lg': '24px'
    }
  },
  elevation: {
    level1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    level2: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    level3: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    cssVars: {
      '--allie-elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      '--allie-elevation-2': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '--allie-elevation-3': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }
  },
  status: {
    online: '#10a37f',
    onlineGlow: '0 0 6px rgba(16, 163, 127, 0.8)',
    offline: '#ef4444',
    cssVars: {
      '--allie-status-online': '#10a37f',
      '--allie-status-online-glow': '0 0 6px rgba(16, 163, 127, 0.8)',
      '--allie-status-offline': '#ef4444'
    }
  },
  transitions: {
    standard: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    cssVars: {
      '--allie-transition-standard': '150ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },
  tooltip: {
    radius: '6px',
    padding: '4px 8px',
    minHeight: '24px',
    fontSize: '12px',
    fontWeight: '500',
    lineHeight: '16px',
    letterSpacing: '0px',
    cssVars: {
      '--allie-tooltip-radius': '6px',
      '--allie-tooltip-padding': '4px 8px',
      '--allie-tooltip-min-height': '24px',
      '--allie-tooltip-font-size': '12px',
      '--allie-tooltip-font-weight': '500',
      '--allie-tooltip-line-height': '16px',
      '--allie-tooltip-letter-spacing': '0px'
    }
  },
  dark: {
    bgPrimary: '#212121',
    bgSurface: '#2f2f2f',
    bgSurfaceVariant: '#383838',
    bgSurfaceElevated: '#424242',
    textPrimary: '#ececec',
    textSecondary: '#b4b4b4',
    textDisabled: '#676767',
    accent: '#10a37f',
    accentHover: '#1a7f64',
    accentContainer: 'rgba(16, 163, 127, 0.18)',
    accentContrast: '#ffffff',
    hoverState: 'rgba(255, 255, 255, 0.08)',
    activeState: 'rgba(16, 163, 127, 0.25)',
    focusRing: '0 0 0 2px #10a37f',
    borderSubtle: 'rgba(255, 255, 255, 0.15)',
    toggleBgOff: '#424242',
    toggleBgOn: '#10a37f',
    toggleKnobOff: '#b4b4b4',
    toggleKnobOn: '#ffffff',
    cssVars: {
      '--allie-bg-primary': '#212121',
      '--allie-bg-surface': '#2f2f2f',
      '--allie-bg-surface-variant': '#383838',
      '--allie-bg-surface-elevated': '#424242',
      '--allie-text-primary': '#ececec',
      '--allie-text-secondary': '#b4b4b4',
      '--allie-text-disabled': '#676767',
      '--allie-accent': '#10a37f',
      '--allie-accent-hover': '#1a7f64',
      '--allie-accent-container': 'rgba(16, 163, 127, 0.18)',
      '--allie-accent-contrast': '#ffffff',
      '--allie-hover-state': 'rgba(255, 255, 255, 0.08)',
      '--allie-active-state': 'rgba(16, 163, 127, 0.25)',
      '--allie-focus-ring': '0 0 0 2px #10a37f',
      '--allie-border-subtle': 'rgba(255, 255, 255, 0.15)',
      '--allie-toggle-bg-off': '#424242',
      '--allie-toggle-bg-on': '#10a37f',
      '--allie-toggle-knob-off': '#b4b4b4',
      '--allie-toggle-knob-on': '#ffffff',
      '--allie-tooltip-bg': '#0d0d0d',
      '--allie-tooltip-text': '#ffffff',
      '--allie-tooltip-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)'
    }
  },
  light: {
    bgPrimary: '#ffffff',
    bgSurface: '#f9f9f9',
    bgSurfaceVariant: '#ececec',
    bgSurfaceElevated: '#ffffff',
    textPrimary: '#0d0d0d',
    textSecondary: '#5d5d5d',
    textDisabled: '#9e9e9e',
    accent: '#10a37f',
    accentHover: '#1a7f64',
    accentContainer: 'rgba(16, 163, 127, 0.12)',
    accentContrast: '#ffffff',
    hoverState: 'rgba(0, 0, 0, 0.05)',
    activeState: 'rgba(16, 163, 127, 0.18)',
    focusRing: '0 0 0 2px #10a37f',
    borderSubtle: 'rgba(0, 0, 0, 0.12)',
    toggleBgOff: '#d1d5db',
    toggleBgOn: '#10a37f',
    toggleKnobOff: '#ffffff',
    toggleKnobOn: '#ffffff',
    cssVars: {
      '--allie-bg-primary': '#ffffff',
      '--allie-bg-surface': '#f9f9f9',
      '--allie-bg-surface-variant': '#ececec',
      '--allie-bg-surface-elevated': '#ffffff',
      '--allie-text-primary': '#0d0d0d',
      '--allie-text-secondary': '#5d5d5d',
      '--allie-text-disabled': '#9e9e9e',
      '--allie-accent': '#10a37f',
      '--allie-accent-hover': '#1a7f64',
      '--allie-accent-container': 'rgba(16, 163, 127, 0.12)',
      '--allie-accent-contrast': '#ffffff',
      '--allie-hover-state': 'rgba(0, 0, 0, 0.05)',
      '--allie-active-state': 'rgba(16, 163, 127, 0.18)',
      '--allie-focus-ring': '0 0 0 2px #10a37f',
      '--allie-border-subtle': 'rgba(0, 0, 0, 0.12)',
      '--allie-toggle-bg-off': '#d1d5db',
      '--allie-toggle-bg-on': '#10a37f',
      '--allie-toggle-knob-off': '#ffffff',
      '--allie-toggle-knob-on': '#ffffff',
      '--allie-tooltip-bg': '#0d0d0d',
      '--allie-tooltip-text': '#ffffff',
      '--allie-tooltip-shadow': '0 2px 8px rgba(0, 0, 0, 0.15)'
    }
  }
} as const;

/**
 * Returns a key-value record of CSS custom properties for the active theme.
 */
export function getAllieCssVariables(theme: 'light' | 'dark' = 'dark'): Record<string, string> {
  const themeVars = theme === 'light' ? CHATGPT_TOKENS.light.cssVars : CHATGPT_TOKENS.dark.cssVars;
  return {
    ...CHATGPT_TOKENS.typography.cssVars,
    ...CHATGPT_TOKENS.radii.cssVars,
    ...CHATGPT_TOKENS.elevation.cssVars,
    ...CHATGPT_TOKENS.status.cssVars,
    ...CHATGPT_TOKENS.transitions.cssVars,
    ...CHATGPT_TOKENS.tooltip.cssVars,
    ...themeVars
  };
}
