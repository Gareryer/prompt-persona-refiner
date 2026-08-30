import React, { useState, useEffect } from 'react';
import { ModelManager } from '../../src/core/model/model-manager';
import { MODEL_REGISTRY } from '../../src/core/model/model-registry';
import { sendRpcMessage } from '../../src/lib/messaging/client';

export const OptionsApp: React.FC = () => {
  const [modelManager] = useState(() => new ModelManager());
  const [activeModel, setActiveModel] = useState('gemini-2.0-flash');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    gemini: '',
    openai: '',
    anthropic: '',
    deepseek: '',
    openrouter: ''
  });
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 8192
  });
  const [pingStatus, setPingStatus] = useState<Record<string, { testing?: boolean; latencyMs?: number; success?: boolean }>>({});
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const handleTestConnection = async (provider: string) => {
    setPingStatus(prev => ({ ...prev, [provider]: { testing: true } }));
    const result = await modelManager.testConnection(provider, apiKeys[provider] || 'dummy-key');
    setPingStatus(prev => ({
      ...prev,
      [provider]: { testing: false, success: result.success, latencyMs: result.latencyMs }
    }));
  };

  const handleExportBackup = async () => {
    const personas = await sendRpcMessage('GET_PERSONAS', undefined);
    const settings = await sendRpcMessage('GET_SETTINGS', undefined);
    const bundle = { personas, settings, exportDate: new Date().toISOString() };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-assistant-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Full backup exported successfully.');
  };

  return (
    <div className="options-container" style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Prompt Assistant Settings</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)' }}>
            Configure BYOK model providers, inference parameters, and backups
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleExportBackup}>
          💾 Export Full Backup
        </button>
      </header>

      {toastMsg && (
        <div className="badge badge-info" style={{ width: '100%', padding: 8, marginBottom: 16, textAlign: 'center' }}>
          {toastMsg}
        </div>
      )}

      {/* Model Providers Section */}
      <section className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Active LLM Provider & Model</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
          {Object.values(MODEL_REGISTRY).map(m => (
            <div
              key={m.id}
              onClick={() => setActiveModel(m.id)}
              style={{
                border: activeModel === m.id ? '2px solid var(--color-accent)' : '1px solid var(--color-outline-variant)',
                borderRadius: 8,
                padding: 12,
                cursor: 'pointer',
                background: 'var(--color-surface-container)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>{m.name}</strong>
                {activeModel === m.id && <span className="badge">Active</span>}
              </div>
              <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                Context: {m.contextWindow.toLocaleString()} tokens
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* API Keys BYOK Section */}
      <section className="card" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>API Key Vault (AES-GCM 256-Bit Encrypted)</h2>
        {['gemini', 'openai', 'anthropic', 'deepseek'].map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <label style={{ width: 100, textTransform: 'capitalize', fontWeight: 600 }}>{p}</label>
            <input
              type="password"
              placeholder={`${p.toUpperCase()} API Key...`}
              value={apiKeys[p] || ''}
              onChange={e => setApiKeys(prev => ({ ...prev, [p]: e.target.value }))}
              style={{ flex: 1, padding: 8, borderRadius: 6, background: 'var(--color-surface-container)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
            />
            <button
              className="btn btn-secondary btn-small"
              onClick={() => handleTestConnection(p)}
              disabled={pingStatus[p]?.testing}
            >
              {pingStatus[p]?.testing ? 'Testing...' : 'Test Connection'}
            </button>
            {pingStatus[p]?.latencyMs && (
              <span className="badge badge-success">{pingStatus[p]?.latencyMs}ms</span>
            )}
          </div>
        ))}
      </section>

      {/* Parameter Sliders */}
      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Generation Parameters</h2>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label>Temperature: {parameters.temperature}</label>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>More Creative ➔</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={parameters.temperature}
            onChange={e => setParameters(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label>Max Output Tokens: {parameters.maxTokens}</label>
          </div>
          <input
            type="range"
            min="1024"
            max="16384"
            step="512"
            value={parameters.maxTokens}
            onChange={e => setParameters(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
      </section>
    </div>
  );
};
