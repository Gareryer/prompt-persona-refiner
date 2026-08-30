import React, { useState, useEffect } from 'react';
import type { UserSettings } from '../../src/lib/storage/items';
import { sendRpcMessage } from '../../src/lib/messaging/client';

export const OptionsApp: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    activeModelProvider: 'gemini',
    activeModelName: 'gemini-2.0-flash',
    autoRefineOnEnter: false,
    cloudSyncEnabled: false
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sendRpcMessage('GET_SETTINGS', undefined).then((res: any) => {
      if (res) setSettings(res);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendRpcMessage('UPDATE_SETTINGS', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="options-container">
      <div className="header-title">
        <span>⚡</span>
        <span>Prompt Assistant Configuration</span>
      </div>

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">LLM Provider</label>
          <select
            className="form-control"
            value={settings.activeModelProvider}
            onChange={e => setSettings({ ...settings, activeModelProvider: e.target.value })}
          >
            <option value="gemini">Google Gemini</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="deepseek">DeepSeek</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Model Name</label>
          <input
            className="form-control"
            type="text"
            value={settings.activeModelName}
            onChange={e => setSettings({ ...settings, activeModelName: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Theme</label>
          <select
            className="form-control"
            value={settings.theme}
            onChange={e => setSettings({ ...settings, theme: e.target.value as any })}
          >
            <option value="system">System Default</option>
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.cloudSyncEnabled}
              onChange={e => setSettings({ ...settings, cloudSyncEnabled: e.target.checked })}
            />
            <span>Enable Community Cloud Sync (Supabase)</span>
          </label>
        </div>

        <button type="submit" className="btn-save">
          {saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};
