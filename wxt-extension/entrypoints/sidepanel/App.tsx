import React, { useState, useEffect } from 'react';
import type { PersonaV4, DimensionId } from '../../src/core/memory/schemas';
import { sendRpcMessage } from '../../src/lib/messaging/client';

export const SidepanelApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'personas' | 'dimensions' | 'sandbox'>('personas');
  const [personas, setPersonas] = useState<Record<string, PersonaV4>>({});
  const [activeId, setActiveId] = useState<string>('');
  const [rawPrompt, setRawPrompt] = useState('');
  const [refinedOutput, setRefinedOutput] = useState('');

  useEffect(() => {
    sendRpcMessage('GET_PERSONAS', undefined).then((res: any) => {
      if (res) {
        setPersonas(res);
        const keys = Object.keys(res);
        if (keys.length > 0) setActiveId(keys[0]!);
      }
    });
  }, []);

  const activePersona = personas[activeId];

  const handleRefine = async () => {
    if (!rawPrompt.trim()) return;
    const res = await sendRpcMessage('REFINE_PROMPT', { rawPrompt, personaId: activeId });
    if (res.success && res.refinedPrompt) {
      setRefinedOutput(res.refinedPrompt);
    }
  };

  return (
    <div className="panel-container">
      <header className="panel-header">
        <div className="panel-title">
          <span>🧠</span>
          <span>Persona Architect</span>
        </div>
        <button
          className="tab-btn"
          style={{ width: 'auto', padding: '4px 8px' }}
          onClick={() => sendRpcMessage('OPEN_OPTIONS_PAGE', undefined)}
        >
          ⚙️ Settings
        </button>
      </header>

      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'personas' ? 'active' : ''}`}
          onClick={() => setActiveTab('personas')}
        >
          Personas
        </button>
        <button
          className={`tab-btn ${activeTab === 'dimensions' ? 'active' : ''}`}
          onClick={() => setActiveTab('dimensions')}
        >
          7D Memory
        </button>
        <button
          className={`tab-btn ${activeTab === 'sandbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('sandbox')}
        >
          Sandbox
        </button>
      </nav>

      <main className="panel-content">
        {activeTab === 'personas' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#94a3b8' }}>Active Persona</label>
              <select
                value={activeId}
                onChange={e => setActiveId(e.target.value)}
                style={{ width: '100%', padding: 8, marginTop: 4, background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: 6 }}
              >
                {Object.keys(personas).map(id => (
                  <option key={id} value={id}>
                    {personas[id]?.metadata?.suggested_name || id}
                  </option>
                ))}
              </select>
            </div>
            {activePersona ? (
              <div className="card">
                <h3 style={{ margin: '0 0 8px 0', fontSize: 15, color: '#38bdf8' }}>
                  {activePersona.metadata?.suggested_name || 'Active Persona'}
                </h3>
                <p style={{ margin: '0 0 8px 0', color: '#94a3b8', fontSize: 13 }}>
                  {activePersona.metadata?.suggested_title || 'AI Assistant'}
                </p>
                <div className="dimension-text">
                  {activePersona.persona?.instruction || 'No persona description.'}
                </div>
              </div>
            ) : (
              <div className="card" style={{ textAlign: 'center', color: '#94a3b8' }}>
                No personas saved yet.
              </div>
            )}
          </div>
        )}

        {activeTab === 'dimensions' && activePersona && (
          <div>
            {(['persona', 'context', 'tone', 'framework', 'constraints', 'format', 'exemplar'] as DimensionId[]).map(dim => (
              <div key={dim} className="card">
                <div className="dimension-title">{dim}</div>
                <div className="dimension-text">
                  {activePersona[dim]?.instruction || <span style={{ color: '#64748b' }}>Not specified</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sandbox' && (
          <div>
            <textarea
              placeholder="Enter test prompt here..."
              value={rawPrompt}
              onChange={e => setRawPrompt(e.target.value)}
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', padding: 8, background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: 6, marginBottom: 8 }}
            />
            <button className="btn-primary" onClick={handleRefine}>
              Refine Prompt
            </button>
            {refinedOutput && (
              <div className="card" style={{ marginTop: 12 }}>
                <div className="dimension-title">Refined Output</div>
                <pre style={{ whiteSpace: 'pre-wrap', color: '#a5f3fc', fontSize: 12, margin: 0 }}>
                  {refinedOutput}
                </pre>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
