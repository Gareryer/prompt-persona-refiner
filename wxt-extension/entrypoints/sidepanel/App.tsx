import React, { useState, useEffect } from 'react';
import type { PersonaV4, DimensionId } from '../../src/core/memory/schemas';
import { sendRpcMessage } from '../../src/lib/messaging/client';

interface DimensionCardState {
  expanded: boolean;
  enabled: boolean;
  pinned: boolean;
  verbatim: boolean;
  value: string;
}

const DIMENSION_CONFIG: Record<DimensionId, { title: string; placeholder: string; emptyText: string }> = {
  persona: {
    title: 'Persona',
    placeholder: 'Synthesizing persona from conversation...',
    emptyText: 'No persona synthesized yet.'
  },
  context: {
    title: 'Domain Context',
    placeholder: 'Extracting technical and domain context...',
    emptyText: 'No domain context yet.'
  },
  tone: {
    title: 'Tone & Style',
    placeholder: 'Detecting tone preferences...',
    emptyText: 'No tone profile yet.'
  },
  framework: {
    title: 'Framework & Methods',
    placeholder: 'Extracting frameworks...',
    emptyText: 'No methodology defined.'
  },
  constraints: {
    title: 'Constraints & Rules',
    placeholder: 'Extracting constraints...',
    emptyText: 'No constraints defined.'
  },
  format: {
    title: 'Output Format',
    placeholder: 'Detecting format instructions...',
    emptyText: 'No format preferences.'
  },
  exemplar: {
    title: 'Examples & Patterns',
    placeholder: 'Extracting examples...',
    emptyText: 'No examples captured.'
  }
};

export const SidepanelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'context' | 'persona' | 'logs'>('context');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Just now');
  const [personas, setPersonas] = useState<Record<string, PersonaV4>>({});
  const [activePersonaId, setActivePersonaId] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // 7-Dimension State
  const [dimensions, setDimensions] = useState<Record<DimensionId, DimensionCardState>>({
    persona: { expanded: true, enabled: true, pinned: false, verbatim: false, value: 'Senior Full-Stack Architect & AI Pair Programmer' },
    context: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Chrome Extension V3, React 19, TypeScript 5.9, WXT Framework, Tailwind / Material 3' },
    tone: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Technical, concise, structured, direct.' },
    framework: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Strangler Fig Pattern, Bottom-Up Verification, TDD, Clean Architecture.' },
    constraints: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Never use any types. Always run 5-gate verification. Keep legacy build intact.' },
    format: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Markdown format with clickable file links and concise bullet points.' },
    exemplar: { expanded: false, enabled: true, pinned: false, verbatim: false, value: 'Given a component bug: identify root cause, provide surgical fix, verify build.' }
  });

  const [injectedContext, setInjectedContext] = useState('');
  const [logs, setLogs] = useState<Array<{ level: string; msg: string; time: string }>>([
    { level: 'INFO', msg: 'Prompt Assistant initialized successfully', time: new Date().toLocaleTimeString() },
    { level: 'DEBUG', msg: 'Multi-chatbot adapter listening on active tab', time: new Date().toLocaleTimeString() }
  ]);

  useEffect(() => {
    sendRpcMessage('GET_PERSONAS', undefined).then((res: any) => {
      if (res && Object.keys(res).length > 0) {
        setPersonas(res);
        const firstId = Object.keys(res)[0]!;
        setActivePersonaId(firstId);
        loadPersonaIntoDimensions(res[firstId]);
      }
    });
  }, []);

  const loadPersonaIntoDimensions = (p: PersonaV4) => {
    if (!p) return;
    setDimensions(prev => {
      const next = { ...prev };
      (Object.keys(DIMENSION_CONFIG) as DimensionId[]).forEach(dim => {
        if (p[dim]?.instruction) {
          next[dim] = { ...next[dim]!, value: p[dim]!.instruction };
        }
      });
      return next;
    });
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  const toggleAccordion = (dim: DimensionId) => {
    setDimensions(prev => ({
      ...prev,
      [dim]: { ...prev[dim]!, expanded: !prev[dim]!.expanded }
    }));
  };

  const toggleDimensionEnabled = (dim: DimensionId, e: React.MouseEvent) => {
    e.stopPropagation();
    setDimensions(prev => ({
      ...prev,
      [dim]: { ...prev[dim]!, enabled: !prev[dim]!.enabled }
    }));
  };

  const toggleDimensionPinned = (dim: DimensionId, e: React.MouseEvent) => {
    e.stopPropagation();
    setDimensions(prev => ({
      ...prev,
      [dim]: { ...prev[dim]!, pinned: !prev[dim]!.pinned }
    }));
  };

  const handleRebuildMemory = async () => {
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

  const filteredPersonas = Object.entries(personas).filter(([id, p]) => {
    const name = p.metadata?.suggested_name || id;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = !selectedDomain || p.metadata?.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

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

      {/* Main Content */}
      <main className="panel-content">
        {/* Context Tab */}
        {activeTab === 'context' && (
          <div className="tab-content active">
            <div className="memory-sections">
              {/* Active Persona Name Static Header */}
              <section className="accordion accordion-static" data-section="active_persona_name">
                <div className="accordion-header-wrapper">
                  <div className="accordion-header static">
                    <span className="accordion-icon material-symbols-outlined">person</span>
                    <span className="persona-name-text">
                      {personas[activePersonaId]?.metadata?.suggested_name || 'Architect Persona (Active)'}
                    </span>
                  </div>
                </div>
              </section>

              {/* 7-Dimension Accordions */}
              {(Object.keys(DIMENSION_CONFIG) as DimensionId[]).map(dim => {
                const conf = DIMENSION_CONFIG[dim];
                const state = dimensions[dim];
                return (
                  <section key={dim} className="accordion" data-section={dim}>
                    <div
                      className="accordion-header"
                      onClick={() => toggleAccordion(dim)}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                    >
                      <span
                        className="accordion-icon material-symbols-outlined"
                        style={{ transform: state.expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                      >
                        chevron_right
                      </span>
                      <span className="accordion-title">{conf.title}</span>
                      <div className="header-controls">
                        <span
                          className={`pin-toggle ${state.pinned ? 'active' : ''}`}
                          title="Pin Component"
                          onClick={(e) => toggleDimensionPinned(dim, e)}
                        >
                          <span className="material-symbols-outlined">push_pin</span>
                        </span>
                      </div>
                      <label className="toggle-switch" onClick={(e) => toggleDimensionEnabled(dim, e)}>
                        <input type="checkbox" checked={state.enabled} readOnly />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    {state.expanded && (
                      <div className="accordion-content">
                        <div className="textarea-container">
                          <textarea
                            className="persona-textarea"
                            rows={3}
                            placeholder={conf.placeholder}
                            value={state.value}
                            onChange={e => {
                              const val = e.target.value;
                              setDimensions(prev => ({ ...prev, [dim]: { ...prev[dim]!, value: val } }));
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}

              {/* Injected Custom Context */}
              <section className="accordion" data-section="injected_context">
                <div
                  className="accordion-header"
                  onClick={() => toggleAccordion('context')}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="accordion-icon material-symbols-outlined">tune</span>
                  <span className="accordion-title">Custom Context</span>
                </div>
                <div className="accordion-content">
                  <div className="textarea-container">
                    <textarea
                      className="context-textarea"
                      placeholder="e.g. 'Always use Bun, never install global npm packages'"
                      rows={2}
                      value={injectedContext}
                      onChange={e => setInjectedContext(e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Context Footer with Rebuild Button */}
            <footer className="panel-footer">
              <button
                className={`btn btn-primary btn-large btn-with-spinner ${isRebuilding ? 'loading' : ''}`}
                onClick={handleRebuildMemory}
                disabled={isRebuilding}
              >
                <span className="btn-content" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined">auto_awesome</span>
                  <span>{isRebuilding ? 'Rebuilding...' : 'Rebuild Memory'}</span>
                </span>
              </button>
              <div className="footer-info">
                <span>Updated: {lastUpdated}</span>
                <span>v2.0.0</span>
              </div>
            </footer>
          </div>
        )}

        {/* Persona Browse Tab */}
        {activeTab === 'persona' && (
          <div className="tab-content active">
            <div className="search-container">
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search personas by keyword, intent..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>
              <button
                className={`btn btn-icon ${showFilters ? 'active' : ''}`}
                title="Filters"
                onClick={() => setShowFilters(!showFilters)}
              >
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>

            {/* Filter Chips Drawer */}
            {showFilters && (
              <div className="filter-panel" style={{ display: 'block', marginBottom: 12 }}>
                <div className="filter-chip-group">
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">category</span> Domain
                  </span>
                  <div className="chip-row">
                    {['tech', 'creative', 'business', 'education', 'health'].map(dom => (
                      <button
                        key={dom}
                        className={`filter-chip ${selectedDomain === dom ? 'active' : ''}`}
                        onClick={() => setSelectedDomain(selectedDomain === dom ? null : dom)}
                      >
                        {dom.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Persona List */}
            <div className="persona-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredPersonas.length > 0 ? (
                filteredPersonas.map(([id, p]) => (
                  <div
                    key={id}
                    className="card"
                    style={{
                      borderLeft: activePersonaId === id ? '4px solid var(--color-accent)' : undefined,
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setActivePersonaId(id);
                      loadPersonaIntoDimensions(p);
                      sendRpcMessage('SAVE_PERSONA', { id, persona: p });
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: 'var(--color-text-primary)', fontSize: 14 }}>
                        {p.metadata?.suggested_name || id}
                      </strong>
                      <span className="badge" style={{ fontSize: 10 }}>{p.metadata?.domain || 'GENERAL'}</span>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 12, margin: '4px 0 0 0' }}>
                      {p.persona?.instruction || 'Custom AI Persona'}
                    </p>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-text-tertiary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 36, opacity: 0.5 }}>sentiment_dissatisfied</span>
                  <p style={{ marginTop: 8 }}>No matching personas found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="tab-content active">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, margin: 0 }}>System Logs</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-small" onClick={() => setLogs([])}>Clear</button>
              </div>
            </div>
            <div className="log-viewer" style={{ minHeight: 300, maxHeight: 450, overflowY: 'auto' }}>
              {logs.map((log, i) => (
                <div key={i} className="log-entry" style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-divider)' }}>
                  <span className="log-time" style={{ color: 'var(--color-text-tertiary)', marginRight: 6 }}>[{log.time}]</span>
                  <span className={`badge badge-${log.level.toLowerCase()}`} style={{ marginRight: 6 }}>{log.level}</span>
                  <span className="log-msg" style={{ color: 'var(--color-text-primary)' }}>{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
