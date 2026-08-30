import React, { useState } from 'react';
import type { PersonaV4 } from '../../../src/core/memory/schemas';
import { STARTER_PERSONAS } from '../../../src/core/memory/presets';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

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
  const [page, setPage] = useState<'browse' | 'create' | 'prompts' | 'add-prompt' | 'detail'>('browse');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState('');
  const [createdRole, setCreatedRole] = useState('');

  // Prompts Library State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    { id: 'p1', title: 'Refactor for Simplicity', content: 'Refactor this code to follow the boring solution: eliminate speculative machinery and enforce single responsibility.', category: 'Code' },
    { id: 'p2', title: 'Adversarial Security Audit', content: 'Analyze this code like an attacker: identify IDOR, XSS, race conditions, and unhandled failure modes.', category: 'Security' },
    { id: 'p3', title: 'Write Comprehensive Unit Tests', content: 'Generate exhaustive unit tests covering golden paths, edge cases, zero-values, and invalid inputs.', category: 'Testing' }
  ]);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

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

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.persona || parsed.metadata) {
          const id = `imported_${Date.now()}`;
          onSavePersona(id, parsed);
          setPage('browse');
        }
      } catch (err) {
        alert('Invalid Persona JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportJson = (id: string) => {
    const p = personas[id];
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `persona-${p.metadata?.suggested_name || id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadStarterPresets = () => {
    Object.entries(STARTER_PERSONAS).forEach(([id, p]) => {
      onSavePersona(id, p);
    });
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

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className="btn btn-primary btn-small" style={{ flex: 1 }} onClick={() => setPage('create')}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span> + Create
              </button>
              <button className="btn btn-secondary btn-small" style={{ flex: 1 }} onClick={() => setPage('prompts')}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>library_books</span> Prompts
              </button>
              <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload_file</span> Import
                <input type="file" accept=".json,.txt,.md" style={{ display: 'none' }} onChange={handleImportJson} />
              </label>
            </div>

            {/* Starter Presets Banner */}
            {Object.keys(personas).length <= 1 && (
              <div className="card" style={{ padding: 10, marginBottom: 12, border: '1px dashed var(--color-accent)' }}>
                <p style={{ margin: '0 0 6px 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Get started with 5 battle-tested starter personas (Architect, Writer, Data Scientist, UX, Security):
                </p>
                <button className="btn btn-secondary btn-small btn-full" onClick={handleLoadStarterPresets}>
                  ⚡ Load 5 Starter Presets
                </button>
              </div>
            )}

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
                      <span className="badge" style={{ fontSize: 10 }}>{p.metadata?.domain?.toUpperCase() || 'GENERAL'}</span>
                    </div>
                    <p style={{ margin: '4px 0 8px 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                      {p.persona?.instruction || 'AI Specialist'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-accent)' }}>
                        {activeId === id ? '● Active Persona' : 'Click to inspect'}
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

        {/* Prompts Library Page */}
        {page === 'prompts' && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-icon" onClick={() => setPage('browse')}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 style={{ margin: 0, fontSize: 16 }}>Saved Prompts ({prompts.length})</h3>
              </div>
              <button className="btn btn-primary btn-small" onClick={() => setPage('add-prompt')}>
                + New Prompt
              </button>
            </div>

            <div className="prompts-list">
              {prompts.map(pr => (
                <div key={pr.id} className="card" style={{ padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <strong style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{pr.title}</strong>
                    <span className="badge" style={{ fontSize: 10 }}>{pr.category}</span>
                  </div>
                  <p style={{ margin: '4px 0 8px 0', fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    {pr.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigator.clipboard.writeText(pr.content)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Prompt Page */}
        {page === 'add-prompt' && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => setPage('prompts')}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 style={{ margin: 0, fontSize: 16 }}>Add Prompt Template</h3>
            </div>

            <div className="create-form">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Title</label>
                <input
                  type="text"
                  placeholder="e.g. Adversarial Review"
                  value={newPromptTitle}
                  onChange={e => setNewPromptTitle(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, background: 'var(--color-surface-container)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Prompt Content</label>
                <textarea
                  className="persona-textarea"
                  placeholder="Enter prompt instructions..."
                  rows={4}
                  value={newPromptContent}
                  onChange={e => setNewPromptContent(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={() => {
                  if (newPromptTitle && newPromptContent) {
                    setPrompts(prev => [...prev, { id: `p_${Date.now()}`, title: newPromptTitle, content: newPromptContent, category: 'Custom' }]);
                    setNewPromptTitle('');
                    setNewPromptContent('');
                    setPage('prompts');
                  }
                }}
              >
                Save Prompt
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
                <span className="badge">{personas[selectedPersonaId]?.metadata?.domain?.toUpperCase() || 'TECH'}</span>
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
                onClick={() => handleExportJson(selectedPersonaId)}
              >
                Export Persona JSON
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
