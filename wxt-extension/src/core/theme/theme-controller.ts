export type ThemeMode = 'dark' | 'light' | 'system';

export class ThemeController {
  private currentMode: ThemeMode = 'dark';

  init(initialMode: ThemeMode = 'system'): void {
    this.currentMode = initialMode;
    this.applyTheme();
  }

  setMode(mode: ThemeMode): void {
    this.currentMode = mode;
    this.applyTheme();
  }

  getMode(): ThemeMode {
    return this.currentMode;
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;
    const isDark =
      this.currentMode === 'dark' ||
      (this.currentMode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches);

    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }
}
