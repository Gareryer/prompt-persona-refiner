import React, { useState } from 'react';
import type { PersonaV4 } from '../../../src/core/memory/schemas';

export interface PersonaViewProps {
  personas: Record<string, PersonaV4>;
  activeId: string;
  onSelectActive: (id: string) => void;
  onSavePersona: (id: string, persona: PersonaV4) => void;
  onDeletePersona: (id: string) => void;
}

export const PersonaView: React.FC<PersonaViewProps> = ({
  personas,
  activeId,
  onSelectActive,
  onSavePersona,
  onDeletePersona
}) => {
  const [page, setPage] = useState<'browse' | 'create' | 'my-personas' | 'detail'>('browse');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [rawPromptInput, setRawPromptInput] = useState('');
  const [createdName, setCreatedName] = useState('');
  const [createdRole, setCreatedRole] = useState('');

  const filteredList = Object.entries(personas).filter(([id, p]) => {
    const name = p.metadata?.suggested_name || id;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = !selectedDomain || p.metadata?.domain === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const handleCreate = () => {
    if (!createdName.trim()) return;
    const newId = `persona_${Date.now()}`;
    const newPersona: PersonaV4 = {
      persona: { instruction: createdRole || 'Custom AI Persona' },
      metadata: {
        suggested_name: createdName,
        suggested_title: 'AI Specialist',
        domain: selectedDomain || 'tech'
      }
    };
    onSavePersona(newId, newPersona);
    setCreatedName('');
    setCreatedRole('');
    setPage('browse');
  };

  return (
    <div id="tab-content-persona" className="tab-content active">
      <div className="persona-page-stack">
        {/* Browse Page */}
        {page === 'browse' && (
          <div className="persona-page active">
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

            {/* Filter Drawer */}
            {showFilters && (
              <div className="filter-panel" style={{ display: 'block', marginBottom: 12 }}>
                <div className="filter-chip-group">
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">category</span> Domain
                  </span>
                  <div className="chip-row">
                    {['tech', 'creative', 'business', 'education', 'health', 'lifestyle'].map(dom => (
                      <button
                        key={dom}
                        className={`filter-chip ${selectedDomain === dom ? 'selected' : ''}`}
                        onClick={() => setSelectedDomain(selectedDomain === dom ? null : dom)}
                      >
                        {dom.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setPage('create')}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> + Create Persona
              </button>
            </div>

            {/* Persona Results List */}
            <div className="persona-list">
              {filteredList.length > 0 ? (
                filteredList.map(([id, p]) => (
                  <div
                    key={id}
                    className="card persona-card"
                    style={{
                      borderLeft: activeId === id ? '4px solid var(--color-accent)' : '1px solid var(--color-outline-variant)',
                      padding: 12,
                      cursor: 'pointer',
                      marginBottom: 8
                    }}
                    onClick={() => {
                      setSelectedPersonaId(id);
                      setPage('detail');
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {p.metadata?.suggested_name || id}
                      </span>
                      <span className="badge" style={{ fontSize: 10 }}>{p.metadata?.domain || 'GENERAL'}</span>
                    </div>
                    <p style={{ margin: '4px 0 8px 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {p.persona?.instruction || 'AI Specialist'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>
                        {activeId === id ? '● Active Persona' : 'Click to view details'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '32px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.5 }}>search</span>
                  <p>No personas found.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create Page */}
        {page === 'create' && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => setPage('browse')}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 style={{ margin: 0, fontSize: 16 }}>Create / Extract Persona</h3>
            </div>

            <div className="create-form">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Persona Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Senior Frontend Architect"
                  value={createdName}
                  onChange={e => setCreatedName(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, background: 'var(--color-surface-container)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Role & Instructions</label>
                <textarea
                  className="persona-textarea"
                  placeholder="Describe the persona's role, instructions, and specialties..."
                  rows={5}
                  value={createdRole}
                  onChange={e => setCreatedRole(e.target.value)}
                />
              </div>

              <button className="btn btn-primary btn-large btn-full" onClick={handleCreate} style={{ width: '100%' }}>
                Save Persona
              </button>
            </div>
          </div>
        )}

        {/* Detail Page */}
        {page === 'detail' && selectedPersonaId && personas[selectedPersonaId] && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => setPage('browse')}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {personas[selectedPersonaId]?.metadata?.suggested_name || selectedPersonaId}
              </h3>
            </div>

            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <span className="badge">{personas[selectedPersonaId]?.metadata?.domain || 'TECH'}</span>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>ID: {selectedPersonaId}</span>
              </div>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--color-accent)' }}>Role Definition</h4>
              <p style={{ color: 'var(--color-text-primary)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                {personas[selectedPersonaId]?.persona?.instruction || 'No persona description.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSelectActive(selectedPersonaId);
                  setPage('browse');
                }}
              >
                Set as Active Persona
              </button>
              <button
                className="btn btn-secondary"
                style={{ color: 'var(--color-error)' }}
                onClick={() => {
                  onDeletePersona(selectedPersonaId);
                  setPage('browse');
                }}
              >
                Delete Persona
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
