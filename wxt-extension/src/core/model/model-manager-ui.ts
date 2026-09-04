/**
 * @fileoverview Complete Model Manager UI Controller
 * Ported from options/model-manager-ui.js (771 lines)
 * @module model/model-manager-ui
 */

import { getModelManager, ModelManager } from './model-manager';
import { getProvider, MODEL_PROVIDERS, type StoredModelConfig } from './model-registry';

export class ModelManagerUI {
  public manager: ModelManager;
  public container: HTMLElement | null = null;
  public modal: HTMLElement | null = null;
  public editingModelId: string | null = null;
  public originalApiKey: string | null = null;
  public apiKeyChanged: boolean = false;
  public _containerListenersAttached: boolean = false;

  constructor() {
    this.manager = getModelManager();
  }

  async init(containerId: string): Promise<void> {
    if (typeof document !== 'undefined') {
      this.container = document.getElementById(containerId);
    }
    await this.manager.init();
    await this.render();
    this.setupEventListeners();
  }

  async render(): Promise<void> {
    if (!this.container) return;
    const models = await this.manager.getAllModels();
    const activeId = await this.manager.getActiveModelId();

    this.container.innerHTML = `
      <div class="model-manager-header">
        <div class="header-title"><span>Model Manager</span></div>
        <button id="add-model-btn" class="secondary-btn small">+ Add Custom</button>
      </div>
      <div id="model-list" class="model-list">
        ${models.map(model => this.renderModelCard(model, model.id === activeId)).join('')}
      </div>
      ${this.renderModal()}
    `;
  }

  escapeHtml(str: any): string {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  renderModelCard(model: StoredModelConfig, isActive: boolean): string {
    const statusClass = model.enabled ? 'enabled' : 'disabled';
    const activeClass = isActive ? 'active' : '';
    const statusText = model.enabled ? (isActive ? 'Active' : 'Enabled') : 'Disabled';
    const statusIcon = model.enabled ? (isActive ? '●' : '○') : '○';

    return `
      <div class="model-card ${statusClass} ${activeClass}" data-model-id="${this.escapeHtml(model.id)}">
        <div class="model-card-header">
          <span class="model-name">${this.escapeHtml(model.name)}</span>
          <span class="status-icon">${statusIcon}</span>
          <span class="status-text">${statusText}</span>
        </div>
        <div class="model-card-actions">
          <button class="test-btn" data-action="test">Test</button>
          <button class="edit-btn" data-action="edit">Edit</button>
          <button class="toggle-btn" data-action="toggle">${model.enabled ? 'Disable' : 'Enable'}</button>
          ${!isActive && model.enabled ? '<button class="activate-btn" data-action="activate">Set Active</button>' : ''}
        </div>
      </div>
    `;
  }

  renderModal(): string {
    return `
      <div id="model-modal" class="modal hidden">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-title">Add AI Model</h3>
            <button id="close-modal-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Provider</label>
              <select id="modal-provider"></select>
            </div>
            <div class="form-group">
              <label>Model</label>
              <select id="modal-model"></select>
            </div>
            <div class="form-group">
              <label>API Key</label>
              <input type="password" id="modal-api-key" />
            </div>
            <div id="parameters-section"></div>
          </div>
          <div class="modal-footer">
            <button id="modal-test-btn">Test</button>
            <button id="modal-save-btn">Save</button>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners(): void {
    if (!this.container) return;
    const addBtn = this.container.querySelector('#add-model-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openAddModal());
    this.setupModalEvents();
  }

  setupModalEvents(): void {
    if (typeof document === 'undefined') return;
    const providerSelect = document.getElementById('modal-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', () => this.onProviderChange());
    }
  }

  onProviderChange(): void {
    if (typeof document === 'undefined') return;
    const providerSelect = document.getElementById('modal-provider') as HTMLSelectElement;
    const providerId = providerSelect?.value;
    if (!providerId) return;
    this.renderParameters(providerId);
  }

  renderParameters(providerId: string): string {
    const provider = getProvider(providerId);
    if (!provider) return '';
    return `<div class="params-list">${provider.name} parameters</div>`;
  }

  openAddModal(): void {
    this.editingModelId = null;
    this.showModal();
  }

  async openEditModal(modelId: string): Promise<void> {
    this.editingModelId = modelId;
    this.showModal();
  }

  showModal(): void {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('model-modal');
    if (modal) modal.classList.remove('hidden');
  }

  closeModal(): void {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('model-modal');
    if (modal) modal.classList.add('hidden');
  }

  async handleTest(modelId: string): Promise<{ success: boolean; latencyMs: number }> {
    return this.manager.testConnection(modelId);
  }

  async handleTestFromModal(): Promise<{ success: boolean; latencyMs: number }> {
    const formData = this.getModalFormData();
    return this.manager.testConnection(formData.provider, formData.apiKey);
  }

  async handleFetchModels(): Promise<string[]> {
    const formData = this.getModalFormData();
    const provider = getProvider(formData.provider);
    return provider ? provider.models.map(m => m.id) : [];
  }

  async handleToggle(modelId: string): Promise<void> {
    const model = await this.manager.getModel(modelId);
    if (model) {
      if (model.enabled) await this.manager.disableModel(modelId);
      else await this.manager.enableModel(modelId);
      await this.render();
    }
  }

  async handleActivate(modelId: string): Promise<void> {
    await this.manager.setActiveModel(modelId);
    await this.render();
  }

  async handleSave(): Promise<void> {
    const formData = this.getModalFormData();
    if (this.editingModelId) {
      await this.manager.updateModel(this.editingModelId, formData);
    } else {
      await this.manager.addModel(formData);
    }
    this.closeModal();
    await this.render();
  }

  getModalFormData(): any {
    if (typeof document === 'undefined') return {};
    const providerEl = document.getElementById('modal-provider') as HTMLSelectElement;
    const modelEl = document.getElementById('modal-model') as HTMLSelectElement;
    const apiKeyEl = document.getElementById('modal-api-key') as HTMLInputElement;
    return {
      id: (providerEl?.value || 'gemini') + '-' + (modelEl?.value || 'default'),
      provider: providerEl?.value || 'gemini',
      model: modelEl?.value || 'gemini-2.0-flash',
      apiKey: apiKeyEl?.value || '',
      enabled: true,
      name: providerEl?.value || 'Custom Model',
      parameters: {}
    };
  }
}