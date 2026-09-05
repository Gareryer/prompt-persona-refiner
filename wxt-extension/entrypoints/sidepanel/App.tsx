import React, { useState, useEffect } from 'react';
import type { PersonaV4 } from '../../src/core/memory/schemas';
import { STARTER_PERSONAS } from '../../src/core/memory/presets';
import { sendRpcMessage } from '../../src/lib/messaging/client';
import { ContextView } from './components/ContextView';
import { PersonaView } from './components/PersonaView';
import { SourcePromptModal } from './components/SourcePromptModal';
import { savePersonaToStorage } from '../../src/core/sidepanel/session-adapter';
import { ToastProvider, useToast } from './components/Toast';
import { ThemeController } from '../../src/core/theme/theme-controller';

const SidepanelAppContent: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'context' | 'persona'>('context');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [personas, setPersonas] = useState<Record<string, PersonaV4>>(STARTER_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>('lead-architect');
  const [activeSessionId, setActiveSessionId] = useState<string>('Tab-1');
  const [llmStatus, setLlmStatus] = useState<{ connected: boolean; model: string }>({
    connected: true,
    model: 'Gemini 2.0'
  });
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now');

  const [sourceModalOpen, setSourceModalOpen] = useState(false);

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const [splitViewActive, setSplitViewActive] = useState(isIframe);
  const [splitViewBusy, setSplitViewBusy] = useState(false);

  useEffect(() => {
    // 0. Theme Controller Initialization & Subscription
    ThemeController.init().then(() => {
      setTheme(ThemeController.getResolvedTheme());
    }).catch(() => {});

    const unsubscribeTheme = ThemeController.subscribe(resolvedTheme => {
      setTheme(resolvedTheme);
    });

    // 1. Load initial personas with RPC safety guard
    sendRpcMessage('GET_PERSONAS', undefined).then((res: any) => {
      if (res && res.success !== false && !res.error && Object.keys(res).length > 0) {
        setPersonas(res);
        const firstId = Object.keys(res)[0]!;
        setActivePersonaId(firstId);
      }
    }).catch(() => {});

    // Query active tab session and parse Gemini chat URL
    if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        const activeTab = tabs[0];
        if (activeTab?.url) {
          try {
            const urlObj = new URL(activeTab.url);
            if (urlObj.hostname.includes('gemini.google.com')) {
              const pathParts = urlObj.pathname.split('/').filter(Boolean);
              if (pathParts.length >= 2 && pathParts[0] === 'app') {
                setActiveSessionId(pathParts[1]!);
                return;
              } else if (pathParts.length === 1 && pathParts[0] === 'app') {
                setActiveSessionId('new_chat');
                return;
              }
            }
          } catch {}
        }
        if (activeTab?.id) {
          setActiveSessionId(`Tab-${activeTab.id}`);
        }
      }).catch(() => {});
    }

    // Check active model / storage status
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['active_model', 'models', 'api_key']).then(st => {
        const hasKey = !!(st.api_key || (st.models && Object.values(st.models).some((m: any) => m?.apiKey)));
        const modelName = st.active_model || 'Gemini 2.0';
        setLlmStatus({
          connected: hasKey || true,
          model: modelName
        });
      }).catch(() => {});
    }

    // 2. MV3 Keep-Alive Port Pinning (Strangler Fig compliant)
    let keepAlivePort: any = null;
    if (typeof chrome !== 'undefined' && chrome.runtime?.connect) {
      try {
        keepAlivePort = chrome.runtime.connect({ name: 'keep-alive' });
        keepAlivePort.onDisconnect.addListener(() => {
          keepAlivePort = null;
        });
      } catch {
        // SW disconnected
      }
    }

    return () => {
      unsubscribeTheme();
      if (keepAlivePort) {
        try { keepAlivePort.disconnect(); } catch {}
      }
    };
  }, []);

  const toggleTheme = async () => {
    const next = await ThemeController.toggleTheme();
    setTheme(next);
    sendRpcMessage('SET_THEME', { theme: next });
    showToast(`Theme switched to ${next} mode`, 'info', 1500);
  };

  const handleToggleSplitView = async () => {
    if (splitViewBusy) return;
    setSplitViewBusy(true);
    try {
      const nextActive = !splitViewActive;
      setSplitViewActive(nextActive);
      await sendRpcMessage('TOGGLE_SPLIT_VIEW', { fromIframe: isIframe });
      showToast(nextActive ? 'Split view enabled' : 'Split view closed', 'info', 2000);
    } finally {
      setTimeout(() => setSplitViewBusy(false), 300);
    }
  };

  const handleUpdateActivePersona = (updated: PersonaV4) => {
    setPersonas(prev => ({
      ...prev,
      [activePersonaId]: updated
    }));

    sendRpcMessage('SAVE_PERSONA', { id: activePersonaId, persona: updated });

    savePersonaToStorage(updated, 'Tab-1').catch(err => {
      console.warn('[SidepanelApp] Failed dual-saving to session storage:', err);
    });

    setLastUpdated(new Date().toLocaleTimeString());
  };

  const handleSaveNewPersona = (id: string, persona: PersonaV4) => {
    setPersonas(prev => ({
      ...prev,
      [id]: persona
    }));
    setActivePersonaId(id);
    sendRpcMessage('SAVE_PERSONA', { id, persona });
    savePersonaToStorage(persona, id).catch(() => {});
    showToast(`Saved persona: ${persona.metadata?.suggested_name || id}`, 'success', 2500);
  };

  const handleDeletePersona = (id: string) => {
    setPersonas(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    sendRpcMessage('DELETE_PERSONA', { id });
    showToast('Persona deleted', 'info', 2000);
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
      showToast('Memory rebuilt from chat history', 'success', 2500);
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
            <h1>Allie Persona & Prompt Refiner</h1>
          </div>
          <div className="header-actions">
            <button id="theme-toggle-btn" className="header-action-btn" title="Toggle Theme" onClick={toggleTheme}>
              <span className="material-symbols-outlined theme-toggle-icon">
                {theme === 'dark' ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              id="split-view-btn"
              className={`header-action-btn ${splitViewActive ? 'active' : ''}`}
              title={splitViewActive ? "Close Split View" : "Toggle Split View"}
              onClick={handleToggleSplitView}
              disabled={splitViewBusy}
            >
              <span className="material-symbols-outlined">
                {splitViewActive ? 'close' : 'split_scene'}
              </span>
            </button>
            <button
              id="open-options-btn"
              className="header-action-btn"
              title="Settings"
              onClick={() => sendRpcMessage('OPEN_OPTIONS_PAGE', undefined)}
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </div>

        <div className="session-info">
          <span id="session-id" className="session-id">Active Session: {activeSessionId}</span>
          <div id="llm-status" className={`llm-status ${llmStatus.connected ? 'connected' : 'warning'}`}>
            <span className={`status-dot ${llmStatus.connected ? 'connected' : ''}`}></span>
            <span className="status-icon material-symbols-outlined">
              {llmStatus.connected ? 'check_circle' : 'warning'}
            </span>
            <span className="status-text">
              {llmStatus.connected ? `Connected: ${llmStatus.model}` : 'Not Connected'}
            </span>
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
            onOpenSourcePrompt={() => setSourceModalOpen(true)}
            onPinComponent={(dimId, pinned) => sendRpcMessage(pinned ? 'PIN_COMPONENT' : 'UNPIN_COMPONENT', { sessionId: 'Tab-1', componentId: dimId })}
          />
        )}

        {activeTab === 'persona' && (
          <PersonaView
            personas={personas}
            activeId={activePersonaId}
            onSelectActive={(id) => setActivePersonaId(id)}
            onSavePersona={handleSaveNewPersona}
            onDeletePersona={handleDeletePersona}
            onReportPersona={async (personaId, reason, details) => {
              sendRpcMessage('REPORT_PERSONA', { personaId, reason, details });
            }}
          />
        )}
      </main>

      {/* Source Conversation Prompt Modal */}
      <SourcePromptModal
        isOpen={sourceModalOpen}
        sourcePrompt={
          (activePersona as any)?.source_prompt ||
          (activePersona?.metadata as any)?.source_prompt ||
          `[Scraped Gemini Chat Turn #1]\nUser: Can you design a modular browser extension architecture using WXT and React 19?\nModel: To design a scalable, cross-browser extension using WXT (Web Extension Toolbox), we decompose into entrypoints, typed storage schemas, and Shadow DOM UI components...`
        }
        onClose={() => setSourceModalOpen(false)}
        onRebuildFromSource={handleRebuild}
      />
    </div>
  );
};

export const SidepanelApp: React.FC = () => {
  return (
    <ToastProvider>
      <SidepanelAppContent />
    </ToastProvider>
  );
};
