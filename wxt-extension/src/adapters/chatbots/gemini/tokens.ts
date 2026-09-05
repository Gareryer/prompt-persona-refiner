/**
 * Google Gemini Material 3 Design Tokens (Allie Namespace).
 * Rebrand mandate: All CSS custom properties and classes use '--allie-*' and '.allie-*'.
 */
export const GEMINI_TOKENS = {
  typography: {
    fontFamily: "'Google Sans Flex', 'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSizeSm: '12px',
    fontSizeBase: '14px',
    fontSizeLg: '16px',
    lineHeight: '1.5',
    cssVars: {
      '--allie-font-family': "'Google Sans Flex', 'Google Sans', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      '--allie-font-size-sm': '12px',
      '--allie-font-size-base': '14px',
      '--allie-font-size-lg': '16px',
      '--allie-line-height': '1.5'
    }
  },
  radii: {
    pill: '9999px',
    card: '24px',
    input: '28px',
    lg: '32px',
    cssVars: {
      '--allie-radius-pill': '9999px',
      '--allie-radius-card': '24px',
      '--allie-radius-input': '28px',
      '--allie-radius-lg': '32px'
    }
  },
  elevation: {
    level1: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    level2: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    level3: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    cssVars: {
      '--allie-elevation-1': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      '--allie-elevation-2': '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
      '--allie-elevation-3': '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)'
    }
  },
  status: {
    online: '#34a853',
    onlineGlow: '0 0 6px rgba(52, 168, 83, 0.8)',
    offline: '#80868b',
    cssVars: {
      '--allie-status-online': '#34a853',
      '--allie-status-online-glow': '0 0 6px rgba(52, 168, 83, 0.8)',
      '--allie-status-offline': '#80868b'
    }
  },
  transitions: {
    standard: '200ms cubic-bezier(0.2, 0, 0, 1)',
    cssVars: {
      '--allie-transition-standard': '200ms cubic-bezier(0.2, 0, 0, 1)'
    }
  },
  dark: {
    bgPrimary: '#131314',
    bgSurface: '#1e1f20',
    bgSurfaceVariant: '#282a2c',
    bgSurfaceElevated: '#303134',
    textPrimary: '#e3e3e3',
    textSecondary: '#c4c7c5',
    textDisabled: '#80868b',
    accent: '#8ab4f8',
    accentHover: '#aecbfa',
    accentContainer: 'rgba(138, 180, 248, 0.15)',
    accentContrast: '#041e49',
    hoverState: 'rgba(255, 255, 255, 0.08)',
    activeState: 'rgba(138, 180, 248, 0.20)',
    focusRing: '0 0 0 2px #8ab4f8',
    borderSubtle: 'rgba(255, 255, 255, 0.12)',
    toggleBgOff: '#444746',
    toggleBgOn: '#8ab4f8',
    toggleKnobOff: '#c4c7c5',
    toggleKnobOn: '#041e49',
    cssVars: {
      '--allie-bg-primary': '#131314',
      '--allie-bg-surface': '#1e1f20',
      '--allie-bg-surface-variant': '#282a2c',
      '--allie-bg-surface-elevated': '#303134',
      '--allie-text-primary': '#e3e3e3',
      '--allie-text-secondary': '#c4c7c5',
      '--allie-text-disabled': '#80868b',
      '--allie-accent': '#8ab4f8',
      '--allie-accent-hover': '#aecbfa',
      '--allie-accent-container': 'rgba(138, 180, 248, 0.15)',
      '--allie-accent-contrast': '#041e49',
      '--allie-hover-state': 'rgba(255, 255, 255, 0.08)',
      '--allie-active-state': 'rgba(138, 180, 248, 0.20)',
      '--allie-focus-ring': '0 0 0 2px #8ab4f8',
      '--allie-border-subtle': 'rgba(255, 255, 255, 0.12)',
      '--allie-toggle-bg-off': '#444746',
      '--allie-toggle-bg-on': '#8ab4f8',
      '--allie-toggle-knob-off': '#c4c7c5',
      '--allie-toggle-knob-on': '#041e49'
    }
  },
  light: {
    bgPrimary: '#f0f4f9',
    bgSurface: '#ffffff',
    bgSurfaceVariant: '#e1e3e1',
    bgSurfaceElevated: '#f8fafd',
    textPrimary: '#1f1f1f',
    textSecondary: '#444746',
    textDisabled: '#9aa0a6',
    accent: '#0b57d0',
    accentHover: '#1b6ef3',
    accentContainer: 'rgba(11, 87, 208, 0.12)',
    accentContrast: '#ffffff',
    hoverState: 'rgba(31, 31, 31, 0.08)',
    activeState: 'rgba(11, 87, 208, 0.15)',
    focusRing: '0 0 0 2px #0b57d0',
    borderSubtle: 'rgba(0, 0, 0, 0.10)',
    toggleBgOff: '#c4c7c5',
    toggleBgOn: '#0b57d0',
    toggleKnobOff: '#ffffff',
    toggleKnobOn: '#ffffff',
    cssVars: {
      '--allie-bg-primary': '#f0f4f9',
      '--allie-bg-surface': '#ffffff',
      '--allie-bg-surface-variant': '#e1e3e1',
      '--allie-bg-surface-elevated': '#f8fafd',
      '--allie-text-primary': '#1f1f1f',
      '--allie-text-secondary': '#444746',
      '--allie-text-disabled': '#9aa0a6',
      '--allie-accent': '#0b57d0',
      '--allie-accent-hover': '#1b6ef3',
      '--allie-accent-container': 'rgba(11, 87, 208, 0.12)',
      '--allie-accent-contrast': '#ffffff',
      '--allie-hover-state': 'rgba(31, 31, 31, 0.08)',
      '--allie-active-state': 'rgba(11, 87, 208, 0.15)',
      '--allie-focus-ring': '0 0 0 2px #0b57d0',
      '--allie-border-subtle': 'rgba(0, 0, 0, 0.10)',
      '--allie-toggle-bg-off': '#c4c7c5',
      '--allie-toggle-bg-on': '#0b57d0',
      '--allie-toggle-knob-off': '#ffffff',
      '--allie-toggle-knob-on': '#ffffff'
    }
  }
} as const;

/**
 * Returns a key-value record of CSS custom properties for the active theme.
 */
export function getAllieCssVariables(theme: 'light' | 'dark' = 'dark'): Record<string, string> {
  const themeVars = theme === 'light' ? GEMINI_TOKENS.light.cssVars : GEMINI_TOKENS.dark.cssVars;
  return {
    ...GEMINI_TOKENS.typography.cssVars,
    ...GEMINI_TOKENS.radii.cssVars,
    ...GEMINI_TOKENS.elevation.cssVars,
    ...GEMINI_TOKENS.status.cssVars,
    ...GEMINI_TOKENS.transitions.cssVars,
    ...themeVars
  };
}
