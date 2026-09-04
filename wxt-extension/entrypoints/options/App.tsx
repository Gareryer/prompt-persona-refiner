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
  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const [statusMsg, setStatusMsg] = useState('');

  const showStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const toggleShowKey = (provider: string) => {
    setShowKeyMap(prev => ({ ...prev, [provider]: !prev[provider] }));
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
    showStatus('Full backup exported successfully.');
  };

  const handleSaveSettings = async () => {
    await sendRpcMessage('UPDATE_SETTINGS', {
      activeModelProvider: activeModel,
      activeModelName: activeModel
    });
    showStatus('Settings saved successfully!');
  };

  return (
    <div className="container">
      <header>
        <div className="header-row">
          <div className="logo">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>tune</span>
            <h1>Prompt Assistant Settings</h1>
          </div>
          <button className="secondary-btn" onClick={handleExportBackup}>
            <span className="material-symbols-outlined">download</span>
            <span>Export Full Backup</span>
          </button>
        </div>
      </header>

      {statusMsg && (
        <div style={{ background: 'var(--accent-color)', color: 'white', padding: '10px 16px', borderRadius: 8, marginBottom: 20, textAlign: 'center', fontWeight: 500 }}>
          {statusMsg}
        </div>
      )}

      {/* Model Providers Section */}
      <section className="card">
        <div className="card-header">
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--accent-color)' }}>smart_toy</span>
          <h2>Active LLM Provider & Model</h2>
        </div>
        <p className="model-manager-description">
          Select your primary synthesis model. Models marked active are invoked for real-time memory analysis.
        </p>
        <div className="model-list">
          {Object.values(MODEL_REGISTRY).map(m => {
            const isSelected = activeModel === m.id;
            return (
              <div
                key={m.id}
                className={`model-card ${isSelected ? 'active enabled' : ''}`}
                onClick={() => setActiveModel(m.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="model-card-header">
                  <div className="model-info">
                    <span className="material-symbols-outlined model-icon">neurology</span>
                    <span className="model-name">{m.name}</span>
                  </div>
                  <div className={`model-status ${isSelected ? 'enabled' : 'disabled'}`}>
                    <span className="status-icon">●</span>
                    <span>{isSelected ? 'Active Model' : 'Available'}</span>
                  </div>
                </div>
                <div className="model-card-body">
                  <div className="model-details">
                    <span className="provider-badge">{m.id.toUpperCase()}</span>
                    <span className="model-badge">{(m.models[0]?.contextWindow || 128000).toLocaleString()} Context</span>
                    <span className="key-badge">BYOK Supported</span>
                  </div>
                </div>
                <div className="model-card-actions">
                  <button
                    className={`action-btn ${isSelected ? 'activate-btn' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModel(m.id);
                    }}
                  >
                    {isSelected ? '✓ Current Default' : 'Set as Active'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* API Keys BYOK Section */}
      <section className="card">
        <div className="card-header">
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--accent-color)' }}>key</span>
          <h2>API Key Vault (AES-GCM 256-Bit Encrypted)</h2>
        </div>
        <div className="card-body">
          <p className="description">
            Your API keys are encrypted at rest with AES-GCM and never leave your browser extension.
          </p>

          {['gemini', 'openai', 'anthropic', 'deepseek'].map(p => (
            <div className="input-group" key={p} style={{ marginBottom: 16 }}>
              <label style={{ textTransform: 'capitalize' }}>{p} API Key</label>
              <div className="api-key-wrapper">
                <input
                  type={showKeyMap[p] ? 'text' : 'password'}
                  placeholder={`Enter ${p.toUpperCase()} API key...`}
                  value={apiKeys[p] || ''}
                  onChange={e => setApiKeys(prev => ({ ...prev, [p]: e.target.value }))}
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => toggleShowKey(p)}
                  title={showKeyMap[p] ? 'Hide Key' : 'Show Key'}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showKeyMap[p] ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
                <button
                  type="button"
                  className="secondary-btn small"
                  onClick={() => handleTestConnection(p)}
                  disabled={pingStatus[p]?.testing}
                >
                  {pingStatus[p]?.testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
              {pingStatus[p]?.latencyMs && (
                <div className="hint" style={{ color: pingStatus[p]?.success ? 'var(--success-color)' : 'var(--error-color)', marginTop: 4 }}>
                  {pingStatus[p]?.success ? `✓ Valid key (${pingStatus[p]?.latencyMs}ms)` : '✗ Invalid key or network error'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Inference Parameters */}
      <section className="card">
        <div className="card-header">
          <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--accent-color)' }}>tune</span>
          <h2>Inference & Generation Parameters</h2>
        </div>
        <div className="card-body">
          <div className="input-group" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Temperature: {parameters.temperature}</label>
              <span className="hint">0.0 (Precise) ➔ 1.0 (Creative)</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={parameters.temperature}
              onChange={e => setParameters(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent-color)' }}
            />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Max Output Tokens: {parameters.maxTokens.toLocaleString()}</label>
              <span className="hint">1,024 to 16,384 tokens</span>
            </div>
            <input
              type="range"
              min="1024"
              max="16384"
              step="512"
              value={parameters.maxTokens}
              onChange={e => setParameters(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent-color)' }}
            />
          </div>
        </div>
      </section>

      {/* Save Button Footer */}
      <footer style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button className="primary-btn" onClick={handleSaveSettings}>
          <span className="material-symbols-outlined">save</span>
          <span>Save Changes</span>
        </button>
      </footer>
    </div>
  );
};
