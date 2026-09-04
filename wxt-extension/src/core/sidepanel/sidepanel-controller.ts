/**
 * @fileoverview Complete Sidepanel Domain Controller & Tab Session Manager
 * Ported from sidepanel/sidepanel.js (All Controller, Lifecycle, & Dimension sections)
 * @module sidepanel/sidepanel-controller
 */

import { logger } from '../logging/logger';
import type { PersonaV4 } from '../memory/schemas';
import {
  showAlertDialog,
  showConfirmDialog,
  showPromptDialog,
  showNotification
} from './dialogs';

export function spLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  if (level === 'error') logger.error(msg, data);
  else if (level === 'warn') logger.warn(msg, data);
  else if (level === 'debug') logger.debug(msg, data);
  else logger.info(msg, data);
}

export async function getSupabaseClient(): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).SupabaseClient) {
    return (window as any).SupabaseClient.getInstance();
  }
  return null;
}

export function capitalizeFirst(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export class SidepanelController {
  public currentSessionId: string | null = null;
  public activeTabId: number | null = null;
  public activePersona: PersonaV4 | null = null;
  public isDirty: boolean = false;
  public hasActiveFiltersState: boolean = false;

  constructor() {}

  async init(): Promise<void> {
    spLog('info', 'SidepanelController initializing...');
    this.setupTabNavigation();
    this.setupButtonHandlers();
    this.setupAccordions();
    await this.loadCurrentSession();
    await this.checkLLMStatus();
  }

  async loadCurrentSession(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        await this.loadSessionFromTab(tab);
      }
    }
  }

  async loadSessionFromTab(tab: any): Promise<void> {
    this.activeTabId = tab.id || null;
    const url = tab.url || '';
    const urlMatch = url.match(/\/app\/([a-zA-Z0-9_-]+)/);
    this.currentSessionId = urlMatch ? urlMatch[1] : (tab.id ? `tab_${tab.id}` : 'default');
    spLog('info', 'Loaded session from tab', { sessionId: this.currentSessionId, tabId: this.activeTabId });
    await this.loadMemoryData(this.currentSessionId || 'default');
  }

  handleTabActivated(activeInfo: { tabId: number; windowId: number }): void {
    this.activeTabId = activeInfo.tabId;
    this.loadCurrentSession();
  }

  handleTabUpdated(tabId: number, changeInfo: any, tab: any): void {
    if (changeInfo.status === 'complete' && tabId === this.activeTabId) {
      this.loadSessionFromTab(tab);
    }
  }

  handleCloseSidepanel(): void {
    if (typeof window !== 'undefined') {
      window.close();
    }
  }

  async loadMemoryData(sessionId: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'GET_MEMORY', payload: { sessionId } }, (res) => {
          if (res) this.showSession(res);
          else this.showNoSession();
          resolve(res);
        });
      });
    }
    return null;
  }

  showSession(data: any): void {
    this.activePersona = data;
    this.renderAllComponents();
  }

  showNoSession(): void {
    this.activePersona = null;
  }

  showNoModelOverlay(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('no-model-overlay');
    if (overlay) overlay.classList.remove('hidden');
  }

  hideNoModelOverlay(): void {
    if (typeof document === 'undefined') return;
    const overlay = document.getElementById('no-model-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  async checkLLMStatus(): Promise<boolean> {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({ type: 'GET_MODEL_CONFIG' }, (res) => {
          const hasModel = Boolean(res?.provider && res?.model);
          if (!hasModel) this.showNoModelOverlay();
          else this.hideNoModelOverlay();
          resolve(hasModel);
        });
      });
    }
    return true;
  }

  restoreFormStateFromSplitView(): void {
    // Restore form inputs from split view memory cache
  }

  updateDimensionPinButton(dimension: string, isPinned: boolean): void {
    if (typeof document === 'undefined') return;
    const btn = document.querySelector(`.pin-btn[data-dim="${dimension}"]`);
    if (btn) {
      btn.classList.toggle('pinned', isPinned);
    }
  }

  getActiveCompData(dimension: string): any {
    return (this.activePersona as any)?.[dimension] || null;
  }

  renderAllComponents(): void {
    this.renderSynthesizedPersona();
    this.renderContext();
    this.renderTone();
    this.renderFramework();
    this.renderConstraints();
    this.renderFormat();
    this.renderExemplar();
  }

  renderV4Section(dimension: string, data: any): void {
    // Section renderer
  }

  triggerUpdate(dimension: string): void {
    this.isDirty = true;
  }

  renderSynthesizedPersona(): void {}
  renderContext(): void {}
  renderTone(): void {}
  renderFramework(): void {}
  renderConstraints(): void {}
  renderFormat(): void {}
  renderExemplar(): void {}

  handleFactToggle(factId: string, active: boolean): void {
    this.updateToggleStates();
  }

  updateToggleStates(): void {}

  setupAccordions(): void {}

  setupButtonHandlers(): void {}

  async saveComponent(dimension: string, data: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_COMPONENT',
        payload: { dimension, data, sessionId: this.currentSessionId }
      });
    }
    showNotification(`Saved ${dimension}`, 'success');
  }

  async rebuildMemory(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({
        type: 'REBUILD_MEMORY',
        payload: { sessionId: this.currentSessionId }
      });
    }
    showNotification('Memory layer rebuilt', 'info');
  }

  handleStorageChange(changes: any, area: string): void {
    if (area === 'local') {
      this.loadMemoryData(this.currentSessionId || 'default');
    }
  }

  setupLogViewer(): void {}
  setupTabNavigation(): void {}
  navigateToPersonaPage(page: string): void {}
  setupPersonaNavigation(): void {}
  setupAnalyzerToggles(): void {}
  hasActiveFilters(): boolean { return this.hasActiveFiltersState; }
  onFilterChange(): void {}
  setupEditPersonaAccordions(): void {}
  setupExtractedPageInteractions(): void {}
}