/**
 * Anthropic Claude Design Tokens (Allie Namespace).
 * Follows Claude's Warm Ivory / Terracotta aesthetic, custom typography,
 * and encapsulated '--allie-*' CSS custom properties.
 */
export const CLAUDE_TOKENS = {
  typography: {
    fontFamily: "'Tipperary', 'Tiempos Text', 'Styrene A', 'Styrene B', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSizeSm: '12px',
    fontSizeBase: '14px',
    fontSizeLg: '16px',
    lineHeight: '1.5',
    cssVars: {
      '--allie-font-family': "'Tipperary', 'Tiempos Text', 'Styrene A', 'Styrene B', ui-sans-serif, system-ui, -apple-system, sans-serif",
      '--allie-font-size-sm': '12px',
      '--allie-font-size-base': '14px',
      '--allie-font-size-lg': '16px',
      '--allie-line-height': '1.5'
    }
  },
  radii: {
    pill: '9999px',
    card: '16px',
    input: '16px',
    sm: '8px',
    lg: '24px',
    cssVars: {
      '--allie-radius-pill': '9999px',
      '--allie-radius-card': '16px',
      '--allie-radius-input': '16px',
      '--allie-radius-sm': '8px',
      '--allie-radius-lg': '24px'
    }
  },
  elevation: {
    level1: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.12)',
    level2: '0 4px 8px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    level3: '0 12px 16px -4px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    cssVars: {
      '--allie-elevation-1': '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.12)',
      '--allie-elevation-2': '0 4px 8px -2px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '--allie-elevation-3': '0 12px 16px -4px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }
  },
  status: {
    online: '#cc785c',
    onlineGlow: '0 0 6px rgba(204, 120, 92, 0.8)',
    offline: '#ef4444',
    cssVars: {
      '--allie-status-online': '#cc785c',
      '--allie-status-online-glow': '0 0 6px rgba(204, 120, 92, 0.8)',
      '--allie-status-offline': '#ef4444'
    }
  },
  transitions: {
    standard: '160ms cubic-bezier(0.2, 0, 0, 1)',
    cssVars: {
      '--allie-transition-standard': '160ms cubic-bezier(0.2, 0, 0, 1)'
    }
  },
  tooltip: {
    radius: '8px',
    padding: '4px 10px',
    minHeight: '24px',
    fontSize: '12px',
    fontWeight: '450',
    lineHeight: '16px',
    letterSpacing: '0px',
    cssVars: {
      '--allie-tooltip-radius': '8px',
      '--allie-tooltip-padding': '4px 10px',
      '--allie-tooltip-min-height': '24px',
      '--allie-tooltip-font-size': '12px',
      '--allie-tooltip-font-weight': '450',
      '--allie-tooltip-line-height': '16px',
      '--allie-tooltip-letter-spacing': '0px'
    }
  },
  dark: {
    bgPrimary: '#1f1e1d',
    bgSurface: '#2b2a27',
    bgSurfaceVariant: '#383633',
    bgSurfaceElevated: '#46433e',
    textPrimary: '#fbfaf7',
    textSecondary: '#c2beb6',
    textDisabled: '#797670',
    accent: '#da7756',
    accentHover: '#e08767',
    accentContainer: 'rgba(218, 119, 86, 0.18)',
    accentContrast: '#ffffff',
    hoverState: 'rgba(255, 255, 255, 0.08)',
    activeState: 'rgba(218, 119, 86, 0.25)',
    focusRing: '0 0 0 2px #da7756',
    borderSubtle: 'rgba(255, 255, 255, 0.12)',
    toggleBgOff: '#46433e',
    toggleBgOn: '#da7756',
    toggleKnobOff: '#c2beb6',
    toggleKnobOn: '#ffffff',
    cssVars: {
      '--allie-bg-primary': '#1f1e1d',
      '--allie-bg-surface': '#2b2a27',
      '--allie-bg-surface-variant': '#383633',
      '--allie-bg-surface-elevated': '#46433e',
      '--allie-text-primary': '#fbfaf7',
      '--allie-text-secondary': '#c2beb6',
      '--allie-text-disabled': '#797670',
      '--allie-accent': '#da7756',
      '--allie-accent-hover': '#e08767',
      '--allie-accent-container': 'rgba(218, 119, 86, 0.18)',
      '--allie-accent-contrast': '#ffffff',
      '--allie-hover-state': 'rgba(255, 255, 255, 0.08)',
      '--allie-active-state': 'rgba(218, 119, 86, 0.25)',
      '--allie-focus-ring': '0 0 0 2px #da7756',
      '--allie-border-subtle': 'rgba(255, 255, 255, 0.12)',
      '--allie-toggle-bg-off': '#46433e',
      '--allie-toggle-bg-on': '#da7756',
      '--allie-toggle-knob-off': '#c2beb6',
      '--allie-toggle-knob-on': '#ffffff',
      '--allie-tooltip-bg': '#141312',
      '--allie-tooltip-text': '#fbfaf7',
      '--allie-tooltip-shadow': '0 2px 8px rgba(0, 0, 0, 0.4)'
    }
  },
  light: {
    bgPrimary: '#faf9f5',
    bgSurface: '#f0eee6',
    bgSurfaceVariant: '#e5e3d8',
    bgSurfaceElevated: '#ffffff',
    textPrimary: '#141312',
    textSecondary: '#5d5b56',
    textDisabled: '#9a978f',
    accent: '#cc785c',
    accentHover: '#b96348',
    accentContainer: 'rgba(204, 120, 92, 0.12)',
    accentContrast: '#ffffff',
    hoverState: 'rgba(20, 19, 18, 0.06)',
    activeState: 'rgba(204, 120, 92, 0.18)',
    focusRing: '0 0 0 2px #cc785c',
    borderSubtle: 'rgba(0, 0, 0, 0.10)',
    toggleBgOff: '#c2beb6',
    toggleBgOn: '#cc785c',
    toggleKnobOff: '#ffffff',
    toggleKnobOn: '#ffffff',
    cssVars: {
      '--allie-bg-primary': '#faf9f5',
      '--allie-bg-surface': '#f0eee6',
      '--allie-bg-surface-variant': '#e5e3d8',
      '--allie-bg-surface-elevated': '#ffffff',
      '--allie-text-primary': '#141312',
      '--allie-text-secondary': '#5d5b56',
      '--allie-text-disabled': '#9a978f',
      '--allie-accent': '#cc785c',
      '--allie-accent-hover': '#b96348',
      '--allie-accent-container': 'rgba(204, 120, 92, 0.12)',
      '--allie-accent-contrast': '#ffffff',
      '--allie-hover-state': 'rgba(20, 19, 18, 0.06)',
      '--allie-active-state': 'rgba(204, 120, 92, 0.18)',
      '--allie-focus-ring': '0 0 0 2px #cc785c',
      '--allie-border-subtle': 'rgba(0, 0, 0, 0.10)',
      '--allie-toggle-bg-off': '#c2beb6',
      '--allie-toggle-bg-on': '#cc785c',
      '--allie-toggle-knob-off': '#ffffff',
      '--allie-toggle-knob-on': '#ffffff',
      '--allie-tooltip-bg': '#141312',
      '--allie-tooltip-text': '#ffffff',
      '--allie-tooltip-shadow': '0 2px 8px rgba(0, 0, 0, 0.12)'
    }
  }
} as const;

/**
 * Returns a key-value record of CSS custom properties for the active theme.
 */
export function getAllieCssVariables(theme: 'light' | 'dark' = 'dark'): Record<string, string> {
  const themeVars = theme === 'light' ? CLAUDE_TOKENS.light.cssVars : CLAUDE_TOKENS.dark.cssVars;
  return {
    ...CLAUDE_TOKENS.typography.cssVars,
    ...CLAUDE_TOKENS.radii.cssVars,
    ...CLAUDE_TOKENS.elevation.cssVars,
    ...CLAUDE_TOKENS.status.cssVars,
    ...CLAUDE_TOKENS.transitions.cssVars,
    ...CLAUDE_TOKENS.tooltip.cssVars,
    ...themeVars
  };
}
