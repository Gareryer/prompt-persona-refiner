/**
 * ============================================================================
 * MODEL MANAGER UI - Options Page Component
 * ============================================================================
 * 
 * Renders and manages the Model Manager section in the options page.
 * 
 * ============================================================================
 */

/**
 * ModelManagerUI - Handles rendering and events for the Model Manager section
 */
class ModelManagerUI {
    constructor() {
        this.manager = null;
        this.container = null;
        this.modal = null;
        this.editingModelId = null;
        this.originalApiKey = null;
        this.apiKeyChanged = false;
        this._containerListenersAttached = false;
    }

    /**
     * Initialize the UI
     * @param {string} containerId - ID of the container element
     */
    async init(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('[ModelManagerUI] Container not found:', containerId);
            return;
        }

        // Initialize ModelManager
        this.manager = getModelManager();
        await this.manager.init();

        // Render the UI
        await this.render();

        // Set up event listeners
        this.setupEventListeners();

        console.log('[ModelManagerUI] Initialized');
    }

    /**
     * Render the complete Model Manager UI
     */
    async render() {
        const models = await this.manager.getAllModels();
        const activeId = await this.manager.getActiveModelId();

        this.container.innerHTML = `
            <div class="model-manager-header">
                <div class="header-title">
                    <span class="header-icon">Settings</span>
                    <span>Model Manager</span>
                </div>
                <button id="add-model-btn" class="secondary-btn small">
                    <span>+</span> Add Custom
                </button>
            </div>
            
            <p class="model-manager-description">
                Configure and manage your AI model connections. Enable at least one model to use the extension.
            </p>
            
            <div id="model-list" class="model-list">
                ${models.map(model => this.renderModelCard(model, model.id === activeId)).join('')}
            </div>

            ${this.renderModal()}
        `;
    }

    /**
     * Standard 5-character HTML escape helper
     * @param {string} str
     * @returns {string}
     */
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Render a single model card
     * @param {Object} model - Model configuration
     * @param {boolean} isActive - Whether this is the active model
     */
    renderModelCard(model, isActive) {
        const provider = ModelRegistry.getProvider(model.provider) || { name: model.provider, icon: '🤖' };
        const hasKey = this.manager.hasApiKey(model.id);
        const statusClass = model.enabled ? 'enabled' : 'disabled';
        const activeClass = isActive ? 'active' : '';
        const statusText = model.enabled ? (isActive ? 'Active' : 'Enabled') : 'Disabled';
        const statusIcon = model.enabled ? (isActive ? '●' : '○') : '○';

        return `
            <div class="model-card ${statusClass} ${activeClass}" data-model-id="${this.escapeHtml(model.id)}">
                <div class="model-card-header">
                    <div class="model-info">
                        <span class="model-name">${this.escapeHtml(model.name)}</span>
                    </div>
                    <div class="model-status ${statusClass}">
                        <span class="status-icon">${statusIcon}</span>
                        <span class="status-text">${statusText}</span>
                    </div>
                </div>
                
                <div class="model-card-body">
                    <div class="model-details">
                        <span class="provider-badge">${this.escapeHtml(provider.name)}</span>
                        <span class="model-badge">${this.escapeHtml(model.model || 'Not configured')}</span>
                        ${hasKey ? '<span class="key-badge">Key set</span>' : '<span class="key-badge missing">No key</span>'}
                    </div>
                </div>
                
                <div class="model-card-actions">
                    <button class="action-btn test-btn" data-action="test" data-model-id="${this.escapeHtml(model.id)}" ${!hasKey ? 'disabled' : ''}>
                        Test
                    </button>
                    <button class="action-btn edit-btn" data-action="edit" data-model-id="${this.escapeHtml(model.id)}">
                        Edit
                    </button>
                    <button class="action-btn toggle-btn" data-action="toggle" data-model-id="${this.escapeHtml(model.id)}">
                        ${model.enabled ? 'Disable' : 'Enable'}
                    </button>
                    ${isActive ? '' : model.enabled ? `
                        <button class="action-btn activate-btn" data-action="activate" data-model-id="${this.escapeHtml(model.id)}">
                            Set Active
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Render the edit modal
     */
    renderModal() {
        return `
            <div id="model-edit-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div class="modal-backdrop" data-action="close-modal"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="modal-title">Edit Model</h3>
                        <button class="modal-close" data-action="close-modal" aria-label="Close dialog">×</button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="modal-name">Display Name</label>
                            <input type="text" id="modal-name" placeholder="My Model">
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-provider">Provider</label>
                            <select id="modal-provider">
                                ${Object.values(MODEL_PROVIDERS).map(p => `
                                    <option value="${p.id}">${p.name}</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-api-key">API Key</label>
                            <div class="api-key-input">
                                <input type="password" id="modal-api-key" placeholder="Enter your API key">
                                <button type="button" id="toggle-modal-key" class="toggle-visibility-btn">Show</button>
                            </div>
                            <span class="hint">Get your key from <a id="api-key-link" href="#" target="_blank"></a></span>
                        </div>
                        
                        <div class="form-group" id="base-url-group" style="display: none;">
                            <label for="modal-base-url">Base URL</label>
                            <input type="text" id="modal-base-url" placeholder="https://your-endpoint.com/v1">
                        </div>
                        
                        <div class="form-group">
                            <label for="modal-model">Model</label>
                            <div class="model-select-row">
                                <select id="modal-model">
                                    <option value="">Select a model...</option>
                                </select>
                                <button type="button" id="fetch-models-btn" class="secondary-btn small" data-action="fetch-models" title="Fetch available models from API">
                                    Fetch
                                </button>
                            </div>
                            <span class="hint" id="model-fetch-hint">Enter API key first, then click Fetch to load available models</span>
                        </div>
                        
                        <div class="form-group" id="custom-model-group" style="display: none;">
                            <label for="modal-custom-model">Custom Model ID</label>
                            <input type="text" id="modal-custom-model" placeholder="custom-model-name">
                        </div>
                        
                        <details class="advanced-params">
                            <summary>Advanced Parameters</summary>
                            <div id="modal-parameters" class="parameters-grid"></div>
                        </details>
                        
                        <div id="connection-status" class="connection-status hidden"></div>
                    </div>
                    
                    <div class="modal-footer">
                        <button id="test-modal-connection" class="secondary-btn" data-action="test-connection">
                            Test Connection
                        </button>
                        <div class="modal-footer-right">
                            <button id="cancel-modal" class="secondary-btn" data-action="close-modal">
                                Cancel
                            </button>
                            <button id="save-modal" class="primary-btn" data-action="save">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Only attach container-level listeners once (they use event delegation)
        if (!this._containerListenersAttached) {
            // Delegate clicks on the container
            this.container.addEventListener('click', async (e) => {
                const action = e.target.closest('[data-action]')?.dataset.action;
                const modelId = e.target.closest('[data-model-id]')?.dataset.modelId;

                switch (action) {
                    case 'test':
                        await this.handleTest(modelId);
                        break;
                    case 'edit':
                        await this.openEditModal(modelId);
                        break;
                    case 'toggle':
                        await this.handleToggle(modelId);
                        break;
                    case 'activate':
                        await this.handleActivate(modelId);
                        break;
                    case 'close-modal':
                        this.closeModal();
                        break;
                    case 'save':
                        await this.handleSave();
                        break;
                    case 'test-connection':
                        await this.handleTestFromModal();
                        break;
                    case 'fetch-models':
                        await this.handleFetchModels();
                        break;
                }
            });
            this._containerListenersAttached = true;
        }

        // Add Model button (re-attach after each render since element is recreated)
        this.container.querySelector('#add-model-btn')?.addEventListener('click', () => {
            this.openAddModal();
        });

        // Modal-specific events (re-attach since modal is recreated on each render)
        this.setupModalEvents();
    }

    /**
     * Set up modal-specific event listeners
     */
    setupModalEvents() {
        // Provider change
        const providerSelect = this.container.querySelector('#modal-provider');
        providerSelect?.addEventListener('change', (e) => {
            this.onProviderChange(e.target.value);
        });

        // API key visibility toggle
        this.container.querySelector('#toggle-modal-key')?.addEventListener('click', () => {
            const input = this.container.querySelector('#modal-api-key');
            input.type = input.type === 'password' ? 'text' : 'password';
        });

        // API key change detection
        this.container.querySelector('#modal-api-key')?.addEventListener('input', () => {
            this.apiKeyChanged = true;
            console.log('[ModelManagerUI] API key changed');
        });

        // Note: Test connection and Save buttons now use data-action and event delegation
    }

    /**
     * Handle provider change in modal
     */
    onProviderChange(providerId) {
        const provider = MODEL_PROVIDERS[providerId];
        if (!provider) return;

        // Update API key link
        const link = this.container.querySelector('#api-key-link');
        if (provider.apiKeyUrl) {
            link.href = provider.apiKeyUrl;
            link.textContent = provider.name;
            link.parentElement.style.display = '';
        } else {
            link.parentElement.style.display = 'none';
        }

        // Update base URL visibility
        const baseUrlGroup = this.container.querySelector('#base-url-group');
        if (provider.supportsCustomURL) {
            baseUrlGroup.style.display = '';
        } else {
            baseUrlGroup.style.display = 'none';
        }

        // Update model dropdown
        const modelSelect = this.container.querySelector('#modal-model');
        modelSelect.innerHTML = provider.models.length > 0
            ? provider.models.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
            : '<option value="">Enter custom model below</option>';

        // Custom model input visibility
        const customModelGroup = this.container.querySelector('#custom-model-group');
        if (provider.supportsCustomModel || provider.models.length === 0) {
            customModelGroup.style.display = '';
        } else {
            customModelGroup.style.display = 'none';
        }

        // Update parameters
        this.renderParameters(providerId);
    }

    /**
     * Render parameter inputs for a provider
     */
    renderParameters(providerId) {
        const container = this.container.querySelector('#modal-parameters');
        const params = MODEL_PROVIDERS[providerId]?.parameters || [];

        container.innerHTML = params.map(param => `
            <div class="param-group">
                <label for="param-${param.name}">${param.label}</label>
                <input 
                    type="${param.type === 'integer' ? 'number' : param.type}"
                    id="param-${param.name}"
                    name="${param.name}"
                    value="${param.default}"
                    min="${param.min ?? ''}"
                    max="${param.max ?? ''}"
                    step="${param.step ?? 1}"
                >
                ${param.description ? `<span class="param-hint">${param.description}</span>` : ''}
            </div>
        `).join('');
    }

    /**
     * Open modal for adding a new model
     */
    openAddModal() {
        this.editingModelId = null;
        this.originalApiKey = null;
        this.apiKeyChanged = false;

        const modal = this.container.querySelector('#model-edit-modal');
        modal.querySelector('#modal-title').textContent = 'Add Custom Model';
        modal.querySelector('#modal-name').value = '';
        modal.querySelector('#modal-api-key').value = '';
        modal.querySelector('#modal-base-url').value = '';
        modal.querySelector('#modal-custom-model').value = '';

        // Default to custom provider
        const providerSelect = modal.querySelector('#modal-provider');
        providerSelect.value = 'custom';
        this.onProviderChange('custom');

        this.showModal();
    }

    /**
     * Open modal for editing an existing model
     */
    async openEditModal(modelId) {
        const model = await this.manager.getModel(modelId);
        if (!model) return;

        this.editingModelId = modelId;
        this.originalApiKey = model.apiKey;
        this.apiKeyChanged = false;

        const modal = this.container.querySelector('#model-edit-modal');
        modal.querySelector('#modal-title').textContent = `Edit: ${model.name}`;
        modal.querySelector('#modal-name').value = model.name;
        modal.querySelector('#modal-api-key').value = model.apiKey ? this.manager.maskApiKey(model.apiKey) : '';
        modal.querySelector('#modal-base-url').value = model.baseURL || '';
        modal.querySelector('#modal-custom-model').value = '';

        // Set provider and trigger update
        const providerSelect = modal.querySelector('#modal-provider');
        providerSelect.value = model.provider;
        this.onProviderChange(model.provider);

        // Set model after provider change populated the dropdown
        const modelSelect = modal.querySelector('#modal-model');
        if (modelSelect.querySelector(`option[value="${model.model}"]`)) {
            modelSelect.value = model.model;
        } else {
            modal.querySelector('#modal-custom-model').value = model.model;
        }

        // Set parameter values
        if (model.parameters) {
            for (const [key, value] of Object.entries(model.parameters)) {
                const input = modal.querySelector(`#param-${key}`);
                if (input) input.value = value;
            }
        }

        this.showModal();
    }

    /**
     * Show the modal
     */
    showModal() {
        const modal = this.container.querySelector('#model-edit-modal');
        modal.classList.remove('hidden');
        this.container.querySelector('#connection-status').classList.add('hidden');
    }

    /**
     * Close the modal
     */
    closeModal() {
        const modal = this.container.querySelector('#model-edit-modal');
        modal.classList.add('hidden');
        this.editingModelId = null;
        this.originalApiKey = null;
        this.apiKeyChanged = false;
    }

    /**
     * Handle test connection from model card
     */
    async handleTest(modelId) {
        const card = this.container.querySelector(`[data-model-id="${modelId}"]`);
        const btn = card?.querySelector('.test-btn');
        if (!btn) return;

        const originalText = btn.textContent;
        btn.textContent = 'Testing...';
        btn.disabled = true;

        try {
            const result = await this.manager.testConnection(modelId);
            if (result.success) {
                this.showToast('Connection successful!', 'success');
            } else {
                this.showToast(`${result.error}`, 'error');
            }
        } catch (error) {
            this.showToast(`${error.message}`, 'error');
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    /**
     * Handle test connection from modal
     */
    async handleTestFromModal() {
        const statusEl = this.container.querySelector('#connection-status');
        statusEl.className = 'connection-status';
        statusEl.textContent = 'Testing connection...';
        statusEl.classList.remove('hidden');

        try {
            const formData = this.getModalFormData();

            // Create temporary config for testing
            const testConfig = {
                provider: formData.provider,
                apiKey: formData.apiKey,
                model: formData.model,
                baseURL: formData.baseURL
            };

            // Use LLMClient directly for testing
            if (typeof LLMClient !== 'undefined') {
                const client = new LLMClient(testConfig);
                await client.call('Say "OK"', { maxTokens: 10 });
                statusEl.className = 'connection-status success';
                statusEl.textContent = 'Connection successful!';
            } else {
                statusEl.className = 'connection-status warning';
                statusEl.textContent = 'Cannot test - LLMClient not available';
            }
        } catch (error) {
            statusEl.className = 'connection-status error';
            statusEl.textContent = `${error.message}`;
        }
    }

    /**
     * Handle fetch models from API
     */
    async handleFetchModels() {
        const modal = this.container.querySelector('#model-edit-modal');
        const provider = modal.querySelector('#modal-provider').value;
        const providerDef = MODEL_PROVIDERS[provider];
        const apiKeyInput = modal.querySelector('#modal-api-key');
        const fetchBtn = modal.querySelector('#fetch-models-btn');
        const modelSelect = modal.querySelector('#modal-model');
        const hintEl = modal.querySelector('#model-fetch-hint');

        // Get the API key (handle masked key scenario)
        let apiKey = apiKeyInput.value;
        if (this.editingModelId && !this.apiKeyChanged && this.manager.isMaskedKey(apiKey)) {
            apiKey = this.originalApiKey;
        }

        if (!apiKey) {
            this.showToast('Please enter an API key first', 'warning');
            apiKeyInput.focus();
            return;
        }

        // Check if provider supports dynamic model fetching
        if (!providerDef?.supportsDynamicModels) {
            this.showToast(`${providerDef?.name || provider} uses a static model list`, 'info');
            return;
        }

        // Show loading state
        const originalText = fetchBtn.textContent;
        fetchBtn.textContent = '...';
        fetchBtn.disabled = true;
        hintEl.textContent = 'Fetching available models...';
        hintEl.style.color = '';

        try {
            const models = await ModelRegistry.fetchModelsForProvider(provider, apiKey);

            if (models.length === 0) {
                this.showToast('No models available for this API key', 'warning');
                hintEl.textContent = 'No models found. Check your API key permissions.';
                return;
            }

            // Update the dropdown with fetched models
            modelSelect.innerHTML = models.map(m =>
                `<option value="${m.id}" title="${m.description || ''}">${m.name}</option>`
            ).join('');

            // Select first model
            modelSelect.selectedIndex = 0;

            this.showToast(`Found ${models.length} available models`, 'success');
            hintEl.textContent = `${models.length} models loaded from ${providerDef.name}`;
            hintEl.style.color = 'var(--success-color)';

        } catch (error) {
            this.showToast(`Failed to fetch models: ${error.message}`, 'error');
            hintEl.textContent = `${error.message}`;
            hintEl.style.color = 'var(--error-color)';
        } finally {
            fetchBtn.textContent = originalText;
            fetchBtn.disabled = false;
        }
    }

    /**
     * Handle toggle enable/disable
     */
    async handleToggle(modelId) {
        const model = await this.manager.getModel(modelId);
        if (!model) return;

        try {
            if (model.enabled) {
                await this.manager.disableModel(modelId);
                this.showToast(`${model.name} disabled`, 'info');
            } else {
                // Ensure API key exists before enabling
                if (!model.apiKey) {
                    this.showToast(`Please configure API key for ${model.name} first`, 'warning');
                    await this.openEditModal(modelId);
                    return;
                }
                await this.manager.enableModel(modelId);
                this.showToast(`${model.name} enabled`, 'success');

                // Auto-set as active if no active model
                try {
                    await this.manager.ensureActiveModel();
                } catch (e) {
                    console.warn('[ModelManagerUI] Failed to auto-set active model:', e);
                }
            }
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        } finally {
            await this.render();
            this.setupEventListeners();
        }
    }

    /**
     * Handle set as active model
     */
    async handleActivate(modelId) {
        try {
            await this.manager.setActiveModel(modelId);
            const model = await this.manager.getModel(modelId);
            this.showToast(`${model.name} set as active`, 'success');
            await this.render();
            this.setupEventListeners();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Handle save from modal
     */
    async handleSave() {
        console.log('[ModelManagerUI] handleSave called');
        try {
            const formData = this.getModalFormData();
            console.log('[ModelManagerUI] Form data:', {
                name: formData.name,
                provider: formData.provider,
                model: formData.model,
                hasApiKey: !!formData.apiKey,
                apiKeyLength: formData.apiKey?.length || 0
            });

            if (this.editingModelId) {
                // Update existing
                await this.manager.updateModel(this.editingModelId, formData);
                this.showToast('Model updated', 'success');
            } else {
                // Add new
                await this.manager.addModel(formData);
                this.showToast('Model added', 'success');
            }

            console.log('[ModelManagerUI] Save successful');
            this.closeModal();
            await this.render();
            this.setupEventListeners();
        } catch (error) {
            this.showToast(`Error: ${error.message}`, 'error');
        }
    }

    /**
     * Get form data from modal
     */
    getModalFormData() {
        const modal = this.container.querySelector('#model-edit-modal');
        const provider = modal.querySelector('#modal-provider').value;
        const providerDef = MODEL_PROVIDERS[provider];

        // Get model ID - prefer dropdown, fall back to custom input
        let modelId = modal.querySelector('#modal-model').value;
        const customModel = modal.querySelector('#modal-custom-model').value;
        if (customModel) {
            modelId = customModel;
        }

        // Get API key - handle masked keys
        let apiKey = modal.querySelector('#modal-api-key').value;
        if (this.editingModelId && !this.apiKeyChanged && this.manager.isMaskedKey(apiKey)) {
            // Use original key if unchanged
            apiKey = this.originalApiKey;
        }

        // Get parameters
        const parameters = {};
        if (providerDef?.parameters) {
            for (const param of providerDef.parameters) {
                const input = modal.querySelector(`#param-${param.name}`);
                if (input) {
                    parameters[param.name] = param.type === 'integer'
                        ? parseInt(input.value, 10)
                        : parseFloat(input.value);
                }
            }
        }

        return {
            name: modal.querySelector('#modal-name').value || providerDef?.name || 'Custom',
            provider,
            model: modelId,
            apiKey,
            baseURL: modal.querySelector('#modal-base-url').value || providerDef?.defaultBaseURL || '',
            parameters
        };
    }

    /**
     * Show a toast notification
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) {
            console.log(`[Toast ${type}] ${message}`);
            return;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Icon based on type
        const icons = {
            success: '',
            error: '',
            warning: '',
            info: ''
        };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || icons.info}</span>
            <span class="toast-message">${this.escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// ============================================================================
// Exports
// ============================================================================

if (typeof window !== 'undefined') {
    window.ModelManagerUI = ModelManagerUI;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ModelManagerUI };
}
