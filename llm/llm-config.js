/**
 * @fileoverview LLM Config Manager - Model Manager Integration Layer
 * Serves as a clean delegate to ModelManager for creating configured LLMClient instances.
 */

class LLMConfigManager {
    constructor() {
        this._modelManager = null;
    }

    _getModelManager() {
        if (!this._modelManager) {
            if (typeof getModelManager === 'function') {
                this._modelManager = getModelManager();
            } else if (typeof window !== 'undefined' && window.ModelManager) {
                this._modelManager = window.ModelManager.getInstance ? window.ModelManager.getInstance() : new window.ModelManager();
            }
        }
        return this._modelManager;
    }

    async load() {
        const manager = this._getModelManager();
        if (!manager) {
            return { provider: 'gemini', model: 'gemini-2.0-flash-exp', apiKeys: {} };
        }

        await manager.init();
        const activeModel = await manager.getActiveModel();

        if (!activeModel) {
            return { provider: 'gemini', model: 'gemini-2.0-flash-exp', apiKeys: {} };
        }

        return {
            provider: activeModel.provider,
            model: activeModel.model,
            apiKeys: { [activeModel.provider]: activeModel.apiKey },
            activeModelConfig: activeModel
        };
    }

    async getApiKey(provider) {
        const manager = this._getModelManager();
        if (!manager) return '';

        await manager.init();
        const models = await manager.getAllModels();
        const model = models.find(m => m.provider === provider && m.enabled);
        return model ? model.apiKey : '';
    }

    async getClient() {
        const manager = this._getModelManager();
        if (!manager) {
            return new LLMClient({
                provider: 'gemini',
                apiKey: '',
                model: 'gemini-2.0-flash-exp'
            });
        }

        await manager.init();
        const activeModel = await manager.getActiveModel();

        if (!activeModel) {
            return new LLMClient({
                provider: 'gemini',
                apiKey: '',
                model: 'gemini-2.0-flash-exp'
            });
        }

        return new LLMClient({
            provider: activeModel.provider,
            apiKey: activeModel.apiKey,
            model: activeModel.model,
            temperature: activeModel.parameters?.temperature,
            maxTokens: activeModel.parameters?.maxOutputTokens || activeModel.parameters?.max_tokens
        });
    }

    async isConfigured() {
        const manager = this._getModelManager();
        if (!manager) return false;

        await manager.init();
        const activeModel = await manager.getActiveModel();
        return !!(activeModel?.apiKey);
    }

    async getActiveModelConfig() {
        const manager = this._getModelManager();
        if (!manager) return null;

        await manager.init();
        const model = await manager.getActiveModel();
        return model ? { ...model, parameters: { ...(model.parameters || {}) } } : null;
    }
}

const llmConfigManager = new LLMConfigManager();

if (typeof window !== 'undefined') {
    window.LLMConfigManager = LLMConfigManager;
    window.llmConfigManager = llmConfigManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LLMConfigManager, llmConfigManager };
}
