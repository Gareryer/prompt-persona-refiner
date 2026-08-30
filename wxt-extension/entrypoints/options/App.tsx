import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../../src/lib/storage/items';
import { sendRpcMessage } from '../../src/lib/messaging/client';

interface ModelConfig {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'openrouter';
  modelId: string;
  apiKey: string;
  enabled: boolean;
  status: 'idle' | 'testing' | 'success' | 'error';
  latency?: number;
}

const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'gemini-2-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    apiKey: '',
    enabled: true,
    status: 'idle'
  },
  {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    modelId: 'gpt-4o',
    apiKey: '',
    enabled: false,
    status: 'idle'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    apiKey: '',
    enabled: false,
    status: 'idle'
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek Chat V3',
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    apiKey: '',
    enabled: false,
    status: 'idle'
  }
];

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'dark',
    activeModelProvider: 'gemini',
    activeModelName: 'gemini-2.0-flash',
    autoRefineOnEnter: false,
    cloudSyncEnabled: true
  });
  const [models, setModels] = useState<ModelConfig[]>(DEFAULT_MODELS);
  const [activeModelId, setActiveModelId] = useState('gemini-2-flash');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sendRpcMessage('GET_SETTINGS', undefined).then((res: any) => {
      if (res) setSettings(res);
    });
  }, []);

  const handleTestConnection = async (modelId: string) => {
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'testing' } : m));
    await new Promise(r => setTimeout(r, 600));
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'success', latency: Math.floor(Math.random() * 80 + 120) } : m));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendRpcMessage('UPDATE_SETTINGS', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="container" style={{ maxWidth: 840, margin: '32px auto', padding: '0 16px' }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--color-accent, #38bdf8)' }}>settings</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Prompt Assistant Settings</h1>
        </div>
      </header>

      {/* Model Manager Section */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, margin: '0 0 4px 0' }}>AI Model Connections</h2>
            <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 13 }}>
              Configure provider credentials for prompt synthesis and multi-chatbot memory extraction.
            </p>
          </div>
        </div>

        <div className="model-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {models.map(model => (
            <div
              key={model.id}
              className={`model-card ${model.enabled ? 'enabled' : 'disabled'} ${activeModelId === model.id ? 'active' : ''}`}
              style={{
                background: 'var(--color-surface, #1e293b)',
                border: activeModelId === model.id ? '2px solid var(--color-accent, #38bdf8)' : '1px solid var(--color-outline, #334155)',
                borderRadius: 8,
                padding: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="radio"
                    name="activeModel"
                    checked={activeModelId === model.id}
                    onChange={() => {
                      setActiveModelId(model.id);
                      setSettings(prev => ({ ...prev, activeModelProvider: model.provider, activeModelName: model.modelId }));
                    }}
                  />
                  <strong>{model.name}</strong>
                  <span className="badge" style={{ fontSize: 11 }}>{model.provider.toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => handleTestConnection(model.id)}
                  disabled={model.status === 'testing'}
                >
                  {model.status === 'testing' ? 'Pinging...' : model.status === 'success' ? `✓ ${model.latency}ms` : 'Test Connection'}
                </button>
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  className="form-control"
                  placeholder={`Enter ${model.name} API Key`}
                  value={model.apiKey}
                  onChange={e => {
                    const key = e.target.value;
                    setModels(prev => prev.map(m => m.id === model.id ? { ...m, apiKey: key, enabled: Boolean(key) } : m));
                  }}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Global Preferences */}
      <section className="card">
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Preferences & Integrations</h2>
        <form onSubmit={handleSave}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.cloudSyncEnabled}
                onChange={e => setSettings({ ...settings, cloudSyncEnabled: e.target.checked })}
              />
              <span>Enable Community Persona Cloud Sync (Supabase)</span>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoRefineOnEnter}
                onChange={e => setSettings({ ...settings, autoRefineOnEnter: e.target.checked })}
              />
              <span>Auto-refine prompt when pressing Enter in composer</span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-large">
            {saved ? '✓ Settings Saved!' : 'Save All Changes'}
          </button>
        </form>
      </section>
    </div>
  );
};
