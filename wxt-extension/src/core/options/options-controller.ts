/**
 * @fileoverview Complete Options Page Controller and Theme Management
 * Ported from options/index.js (162 lines)
 * @module options/options-controller
 */

import { ModelManagerUI } from '../model/model-manager-ui';
import { logger } from '../logging/logger';

export let themeToggleBtn: HTMLElement | null = null;
export let themeToggleIcon: HTMLElement | null = null;
export let modelManagerUI: ModelManagerUI | null = null;

export function updateThemeIcon(theme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return;
  const icon = document.querySelector<HTMLElement>('#theme-toggle-btn .theme-toggle-icon, .theme-toggle-icon');
  if (icon) {
    icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }
}

export class OptionsController {
  public currentTheme: 'dark' | 'light' = 'dark';
  public modelManagerUI: ModelManagerUI;

  constructor() {
    this.modelManagerUI = new ModelManagerUI();
    modelManagerUI = this.modelManagerUI;
  }

  async init(): Promise<void> {
    if (typeof document === 'undefined') return;
    themeToggleBtn = document.getElementById('theme-toggle-btn');
    themeToggleIcon = document.querySelector('.theme-toggle-icon');

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    await this.modelManagerUI.init('model-manager-container');
    logger.info('OptionsController initialized');
  }

  toggleTheme(): 'dark' | 'light' {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', this.currentTheme);
      updateThemeIcon(this.currentTheme);
    }
    return this.currentTheme;
  }
}