import React, { useState, useEffect } from 'react';
import type { PersonaV4 } from '../../src/core/memory/schemas';
import { STARTER_PERSONAS } from '../../src/core/memory/presets';
import { sendRpcMessage } from '../../src/lib/messaging/client';
import { ContextView } from './components/ContextView';
import { PersonaView } from './components/PersonaView';
import { LogsView, type LogItem } from './components/LogsView';
import { ExpandModal } from './components/ExpandModal';

export const SidepanelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'context' | 'persona' | 'logs'>('context');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [personas, setPersonas] = useState<Record<string, PersonaV4>>(STARTER_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>('lead-architect');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [logs, setLogs] = useState<LogItem[]>([
    { level: 'INFO', msg: 'Prompt Assistant initialized successfully (V4 Engine)', time: new Date().toLocaleTimeString() },
    { level: 'DEBUG', msg: 'Multi-chatbot adapter listening on active tab', time: new Date().toLocaleTimeString() }
  ]);

  // Modal State
  const [expandModal, setExpandModal] = useState<{
    isOpen: boolean;
    title: string;
    value: string;
    onSave: (val: string) => void;
  }>({
    isOpen: false,
    title: '',
    value: '',
    onSave: () => {}
  });

  useEffect(() => {
    sendRpcMessage('GET_PERSONAS', undefined).then((res: any) => {
      if (res && Object.keys(res).length > 0) {
        setPersonas(res);
        const firstId = Object.keys(res)[0]!;
        setActivePersonaId(firstId);
      }
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const handleUpdateActivePersona = (persona: PersonaV4) => {
    setPersonas(prev => ({ ...prev, [activePersonaId]: persona }));
    sendRpcMessage('SAVE_PERSONA', { id: activePersonaId, persona });
  };

  const handleSaveNewPersona = (id: string, persona: PersonaV4) => {
    setPersonas(prev => ({ ...prev, [id]: persona }));
    sendRpcMessage('SAVE_PERSONA', { id, persona });
    setLogs(prev => [
      { level: 'INFO', msg: `Saved persona: ${persona.metadata?.suggested_name || id}`, time: new Date().toLocaleTimeString() },
      ...prev
    ]);
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    sendRpcMessage('DELETE_PERSONA', { id });
    if (activePersonaId === id) {
      const remaining = Object.keys(personas).filter(k => k !== id);
      if (remaining.length > 0) setActivePersonaId(remaining[0]!);
    }
  };

  const handleRebuild = async () => {
    setIsRebuilding(true);
    try {
      await new Promise(r => setTimeout(r, 1200));
      setLastUpdated(new Date().toLocaleTimeString());
      setLogs(prev => [
        { level: 'INFO', msg: 'Rebuilt 7D memory layer from active chat turns', time: new Date().toLocaleTimeString() },
        ...prev
      ]);
    } finally {
      setIsRebuilding(false);
    }
  };

  const activePersona = personas[activePersonaId] || personas['lead-architect'] || null;

  return (
    <div className="panel-container">
      {/* Header */}
      <header className="panel-header">
        <div className="header-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: 24 }}>psychology</span>
            <h1>Gemini Context</h1>
          </div>
          <div className="header-actions">
            <button className="header-action-btn" title="Toggle Theme" onClick={toggleTheme}>
              <span className="material-symbols-outlined theme-toggle-icon">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              className="header-action-btn"
              title="Settings"
              onClick={() => sendRpcMessage('OPEN_OPTIONS_PAGE', undefined)}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>

        <div className="session-info">
          <span className="session-id">Active Session: Tab-1</span>
          <div className="llm-status">
            <span className="status-dot connected"></span>
            <span className="status-text">Connected: Gemini 2.0</span>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          <span className="material-symbols-outlined">psychology</span> Context
        </button>
        <button
          className={`tab-btn ${activeTab === 'persona' ? 'active' : ''}`}
          onClick={() => setActiveTab('persona')}
        >
          <span className="material-symbols-outlined">emoji_people</span> Persona
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <span className="material-symbols-outlined">terminal</span> Logs
          <span className="badge badge-count tab-log-count">{logs.length}</span>
        </button>
      </nav>

      {/* Tab Content Views */}
      <main className="panel-content">
        {activeTab === 'context' && (
          <ContextView
            activePersona={activePersona}
            onUpdatePersona={handleUpdateActivePersona}
            onRebuild={handleRebuild}
            isRebuilding={isRebuilding}
            lastUpdated={lastUpdated}
            onOpenExpand={(title, value, onSave) => setExpandModal({ isOpen: true, title, value, onSave })}
          />
        )}

        {activeTab === 'persona' && (
          <PersonaView
            personas={personas}
            activeId={activePersonaId}
            onSelectActive={(id) => setActivePersonaId(id)}
            onSavePersona={handleSaveNewPersona}
            onDeletePersona={handleDeletePersona}
          />
        )}

        {activeTab === 'logs' && (
          <LogsView
            logs={logs}
            onClear={() => setLogs([])}
          />
        )}
      </main>

      {/* Expand Textarea Modal */}
      <ExpandModal
        isOpen={expandModal.isOpen}
        title={expandModal.title}
        value={expandModal.value}
        onChange={(val) => setExpandModal(prev => ({ ...prev, value: val }))}
        onClose={() => {
          expandModal.onSave(expandModal.value);
          setExpandModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
};
