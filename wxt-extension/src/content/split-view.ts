/**
 * @fileoverview In-Page 50% Split View Coordinator
 * Ported from content/observer.js (Split View implementation)
 * @module content/split-view
 */

export class SplitViewController {
  private static instance: SplitViewController | null = null;
  private splitViewContainer: HTMLElement | null = null;
  private isActive: boolean = false;

  static getInstance(): SplitViewController {
    if (!SplitViewController.instance) {
      SplitViewController.instance = new SplitViewController();
    }
    return SplitViewController.instance;
  }

  isSplitViewActive(): boolean {
    return this.isActive;
  }

  toggleSplitView(active?: boolean, sidepanelUrl?: string): boolean {
    const shouldBeActive = active !== undefined ? active : !this.isActive;
    if (shouldBeActive) {
      this.openSplitView(sidepanelUrl);
    } else {
      this.closeSplitView();
    }
    return this.isActive;
  }

  openSplitView(sidepanelUrl?: string): void {
    if (typeof document === 'undefined') return;
    this.closeSplitView();

    const url = sidepanelUrl || (typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL('sidepanel.html') : '');
    if (!url) return;

    const container = document.createElement('div');
    container.id = 'gemini-ext-split-view-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      width: 420px;
      height: 100vh;
      z-index: 2147483646;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.25);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      background: #1e1e2e;
    `;

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
    iframe.allow = 'clipboard-read; clipboard-write';

    container.appendChild(iframe);
    document.body.appendChild(container);
    this.splitViewContainer = container;
    this.isActive = true;
  }

  closeSplitView(): void {
    if (this.splitViewContainer) {
      this.splitViewContainer.remove();
      this.splitViewContainer = null;
    }
    this.isActive = false;
  }
}

export const splitViewController = SplitViewController.getInstance();
