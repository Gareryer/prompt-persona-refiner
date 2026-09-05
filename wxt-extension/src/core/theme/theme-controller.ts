/**
 * @fileoverview Complete Standalone Theme Controller for Allie Persona & Prompt Refiner Extension
 * Ported from theme/theme-controller.js (289 lines)
 * @module theme/theme-controller
 */

import { logger } from '../logging/logger';

export type ThemeMode = 'system' | 'light' | 'dark';

export class ThemeController {
  static STORAGE_KEY = 'themeMode';
  static DEFAULT_MODE: ThemeMode = 'system';

  static #subscribers: Array<(theme: 'light' | 'dark') => void> = [];
  static #resolvedTheme: 'light' | 'dark' | null = null;
  static #systemMediaQuery: MediaQueryList | null = null;
  static #mediaQueryListener: (() => void) | null = null;

  static async init(): Promise<void> {
    const mode = await this.getMode();
    this.#applyMode(mode);

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes && changes[this.STORAGE_KEY]) {
          const change = changes[this.STORAGE_KEY];
          if (change && change.newValue) {
            const newMode = (change.newValue as ThemeMode) || this.DEFAULT_MODE;
            this.#applyMode(newMode);
            this.#notifySubscribers();
          }
        }
      });
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
      if (this.#systemMediaQuery && this.#mediaQueryListener) {
        this.#systemMediaQuery.removeEventListener('change', this.#mediaQueryListener);
      }
      this.#systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.#mediaQueryListener = async () => {
        const currentMode = await this.getMode();
        if (currentMode === 'system') {
          this.#applyMode('system');
          this.#notifySubscribers();
        }
      };
      this.#systemMediaQuery.addEventListener('change', this.#mediaQueryListener);
    }

    logger.debug('ThemeController initialized with mode', { mode });
  }

  static async getMode(): Promise<ThemeMode> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise(resolve => {
        chrome.storage.local.get([this.STORAGE_KEY], res => {
          resolve((res[this.STORAGE_KEY] as ThemeMode) || this.DEFAULT_MODE);
        });
      });
    }
    return this.DEFAULT_MODE;
  }

  static async setMode(mode: ThemeMode): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await new Promise<void>(resolve => {
        chrome.storage.local.set({ [this.STORAGE_KEY]: mode }, () => resolve());
      });
    }
    this.#applyMode(mode);
    this.#notifySubscribers();
  }

  static async toggleTheme(): Promise<'light' | 'dark'> {
    const current = this.getResolvedTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    await this.setMode(next);
    return next;
  }

  static async cycleMode(): Promise<ThemeMode> {
    const modes: ThemeMode[] = ['system', 'light', 'dark'];
    const current = await this.getMode();
    const currentIndex = modes.indexOf(current);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex] || 'system';
    await this.setMode(nextMode);
    this.#updateToggleIcons(nextMode);
    return nextMode;
  }

  static getIcon(mode: ThemeMode): string {
    switch (mode) {
      case 'light': return 'light_mode';
      case 'dark': return 'dark_mode';
      default: return 'brightness_auto';
    }
  }

  static getResolvedTheme(): 'light' | 'dark' {
    if (this.#resolvedTheme) return this.#resolvedTheme;
    return this.#getSystemPreference();
  }

  static subscribe(callback: (theme: 'light' | 'dark') => void): () => void {
    this.#subscribers.push(callback);
    return () => {
      this.#subscribers = this.#subscribers.filter(s => s !== callback);
    };
  }

  static #getSystemPreference(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  static #applyMode(mode: ThemeMode): void {
    const target: 'light' | 'dark' = mode === 'system' ? this.#getSystemPreference() : mode;
    this.#resolvedTheme = target;
    if (typeof document !== 'undefined' && typeof document.documentElement?.setAttribute === 'function') {
      document.documentElement.setAttribute('data-theme', target);
    }
    this.#updateToggleIcons(mode);
  }

  static #updateToggleIcons(mode: ThemeMode): void {
    if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return;
    const iconName = this.getIcon(mode);
    document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
      icon.textContent = iconName;
    });
  }

  static #notifySubscribers(): void {
    const current = this.getResolvedTheme();
    for (const sub of this.#subscribers) {
      try {
        sub(current);
      } catch (err) {
        logger.error('Theme subscriber error', { error: err });
      }
    }
  }
}