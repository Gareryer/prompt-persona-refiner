import React, { useState, useEffect } from 'react';
import type { PersonaV4 } from '../../../src/core/memory/schemas';
import { STARTER_PERSONAS } from '../../../src/core/memory/presets';
import {
  loadSavedPrompts,
  savePromptLocal,
  deleteSavedPrompt,
  loadPersonaToEdit,
  markFormDirty,
  resetFormDirty,
  hasUnsavedChanges,
  handlePublishPersona
} from '../../../src/core/sidepanel/persona-lifecycle';
import { readAndSanitizeFile } from '../../../src/core/sidepanel/import-export';
import { handleAddTag, handleRemoveTag } from '../../../src/core/sidepanel/tag-editor';
import { PromptPreviewModal, type PromptTemplate } from './PromptPreviewModal';
import { ReportModal } from './ReportModal';
import { PersonaDetailModal } from './PersonaDetailModal';

export { type PromptTemplate };

export interface PersonaViewProps {
  personas: Record<string, PersonaV4>;
  activeId: string;
  onSelectActive: (id: string) => void;
  onSavePersona: (id: string, persona: PersonaV4) => void;
  onDeletePersona: (id: string) => void;
  onReportPersona?: (personaId: string, reason: string, details: string) => Promise<void>;
}

export const PersonaView: React.FC<PersonaViewProps> = ({
  personas,
  activeId,
  onSelectActive,
  onSavePersona,
  onDeletePersona,
  onReportPersona
}) => {
  const [page, setPage] = useState<'browse' | 'create' | 'prompts' | 'add-prompt' | 'detail'>('browse');
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);

  // Form State for Create / Edit Persona
  const [createdName, setCreatedName] = useState('');
  const [createdRole, setCreatedRole] = useState('');
  const [createdContext, setCreatedContext] = useState('');
  const [editVerbosity, setEditVerbosity] = useState<'concise' | 'moderate' | 'verbose'>('moderate');
  const [editTechLevel, setEditTechLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('advanced');
  const [editDirectness, setEditDirectness] = useState<'direct' | 'indirect' | 'mixed'>('direct');
  const [editTraits, setEditTraits] = useState<string[]>(['Analytical', 'Precise']);
  const [newTraitInput, setNewTraitInput] = useState('');
  const [editPrefStyle, setEditPrefStyle] = useState('');

  // Modals State
  const [previewPrompt, setPreviewPrompt] = useState<PromptTemplate | null>(null);
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);
  const [detailModalPersonaId, setDetailModalPersonaId] = useState<string | null>(null);

  // Prompts Library State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    { id: 'p1', title: 'Refactor for Simplicity', content: 'Refactor this code to follow the boring solution: eliminate speculative machinery and enforce single responsibility.', category: 'Code' },
    { id: 'p2', title: 'Adversarial Security Audit', content: 'Analyze this code like an attacker: identify IDOR, XSS, race conditions, and unhandled failure modes.', category: 'Security' },
    { id: 'p3', title: 'Write Comprehensive Unit Tests', content: 'Generate exhaustive unit tests covering golden paths, edge cases, zero-values, and invalid inputs.', category: 'Testing' }
  ]);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [promptSearch, setPromptSearch] = useState('');

  useEffect(() => {
    loadSavedPrompts().then(saved => {
      if (saved && saved.length > 0) {
        setPrompts(saved.map(s => ({
          id: s.id,
          title: s.title,
          content: s.content,
          category: s.category || 'General'
        })));
      }
    }).catch(() => {});
  }, []);

  const filteredList = Object.entries(personas).filter(([id, p]) => {
    const name = p.metadata?.suggested_name || id;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = !selectedDomain || p.metadata?.domain?.toLowerCase() === selectedDomain.toLowerCase();
    return matchesSearch && matchesDomain;
  });

  const filteredPrompts = prompts.filter(p => {
    const query = promptSearch.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
  });

  const handleStartCreate = () => {
    setCreatedName('');
    setCreatedRole('');
    setCreatedContext('');
    setEditVerbosity('moderate');
    setEditTechLevel('advanced');
    setEditDirectness('direct');
    setEditTraits(['Analytical', 'Precise']);
    setEditPrefStyle('');
    setSelectedDomain('Tech');
    setEditingPersonaId(null);
    resetFormDirty();
    setPage('create');
  };

  const handleStartEdit = (p: PersonaV4, pId: string) => {
    const editData = loadPersonaToEdit(p);
    setCreatedName(editData.name || '');
    setCreatedRole(editData.memory_layer?.persona?.instruction || p.persona?.instruction || '');
    setCreatedContext(editData.memory_layer?.context?.instruction || p.context?.instruction || '');
    const toneMeta = p.tone?.metadata || {};
    setEditVerbosity((toneMeta.verbosity as any) || 'moderate');
    setEditTechLevel((toneMeta.technical_level as any) || 'advanced');
    setEditDirectness((toneMeta.directness as any) || 'direct');
    setEditTraits((toneMeta.traits as string[]) || (toneMeta.style_tags as string[]) || ['Analytical']);
    setEditPrefStyle((toneMeta.preferred_response_style as string) || '');
    setSelectedDomain(p.metadata?.domain || 'Tech');
    setEditingPersonaId(pId);
    setPage('create');
  };

  const handleCreate = () => {
    if (!createdName.trim()) return;
    const targetId = editingPersonaId || `persona_${Date.now()}`;
    const existing = editingPersonaId ? personas[editingPersonaId] : null;
    const newPersona: PersonaV4 = {
      ...existing,
      persona: {
        ...existing?.persona,
        instruction: createdRole || 'Custom AI Persona'
      },
      context: {
        ...existing?.context,
        instruction: createdContext,
        metadata: {
          ...existing?.context?.metadata,
          domain: selectedDomain || 'Tech'
        }
      },
      tone: {
        ...existing?.tone,
        instruction: existing?.tone?.instruction || `Communicate in a ${editVerbosity} manner at a ${editTechLevel} technical level with ${editDirectness} phrasing.`,
        metadata: {
          ...existing?.tone?.metadata,
          verbosity: editVerbosity,
          technical_level: editTechLevel,
          directness: editDirectness,
          traits: editTraits,
          preferred_response_style: editPrefStyle,
          style_tags: editTraits
        }
      },
      metadata: {
        ...existing?.metadata,
        suggested_name: createdName,
        suggested_title: existing?.metadata?.suggested_title || 'AI Specialist',
        domain: selectedDomain || existing?.metadata?.domain || 'Tech'
      }
    };
    onSavePersona(targetId, newPersona);
    setCreatedName('');
    setCreatedRole('');
    setCreatedContext('');
    setEditingPersonaId(null);
    resetFormDirty();
    setPage('browse');
  };

  const handleAddTrait = () => {
    if (!newTraitInput.trim()) return;
    setEditTraits(prev => handleAddTag(newTraitInput, prev));
    setNewTraitInput('');
  };

  const handleRemoveTrait = (trait: string) => {
    setEditTraits(prev => handleRemoveTag(trait, prev));
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { content, error } = await readAndSanitizeFile(file);
    if (error) {
      alert(`Import failed: ${error}`);
      return;
    }
    if (content?.persona || content?.metadata || typeof content === 'object') {
      const id = `imported_${Date.now()}`;
      onSavePersona(id, content);
      setPage('browse');
    } else {
      alert('Invalid persona file format.');
    }
  };

  const handleImportPromptFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { content, error } = await readAndSanitizeFile(file);
    if (error) {
      alert(`Prompt import failed: ${error}`);
      return;
    }
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.title && item.content) {
          const saved = await savePromptLocal({
            title: item.title,
            content: item.content,
            category: item.category || 'Imported'
          });
          setPrompts(prev => [{
            id: saved.id,
            title: saved.title,
            content: saved.content,
            category: saved.category || 'Imported'
          }, ...prev]);
        }
      }
    } else if (typeof content === 'object' && content?.content) {
      const saved = await savePromptLocal({
        title: content.title || file.name.replace(/\.[^/.]+$/, ''),
        content: content.content,
        category: content.category || 'Imported'
      });
      setPrompts(prev => [{
        id: saved.id,
        title: saved.title,
        content: saved.content,
        category: saved.category || 'Imported'
      }, ...prev]);
    } else if (typeof content === 'string' && content.trim()) {
      const saved = await savePromptLocal({
        title: file.name.replace(/\.[^/.]+$/, ''),
        content: content.trim(),
        category: 'Imported'
      });
      setPrompts(prev => [{
        id: saved.id,
        title: saved.title,
        content: saved.content,
        category: saved.category || 'Imported'
      }, ...prev]);
    }
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

  const handleSubmitReport = async (reason: string, details: string) => {
    if (!reportModalData) return;
    if (onReportPersona) {
      await onReportPersona(reportModalData.id, reason, details);
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({
        type: 'REPORT_PERSONA',
        personaId: reportModalData.id,
        reason,
        details
      });
    }
  };

  return (
    <div id="tab-content-persona" className="tab-content active">
      <div className="persona-page-stack">
        {/* Browse Page */}
        {page === 'browse' && (
          <div className="persona-page active">
            <div className="search-container">
              <div className="search-box">
                <span className="search-icon material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Search personas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <button
                className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Filter Domains"
              >
                <span className="material-symbols-outlined">tune</span>
              </button>
            </div>

            {/* Quick Action Navigation Bar */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <button className="btn btn-primary btn-small" onClick={handleStartCreate} style={{ flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                <span>Create</span>
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setPage('prompts')} style={{ flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark</span>
                <span>Prompts ({prompts.length})</span>
              </button>
              <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Domain Filter Bar */}
            {showFilters && (
              <div className="filter-chips-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {['All', 'Tech', 'Creative', 'Business', 'Education'].map(d => {
                  const isAll = d === 'All';
                  const isSelected = isAll ? !selectedDomain : selectedDomain === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      className={`v4-chip preset ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedDomain(isAll ? null : d)}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Persona Cards List */}
            <div className="persona-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredList.length > 0 ? (
                filteredList.map(([id, p]) => (
                  <div
                    key={id}
                    className={`persona-card ${activeId === id ? 'active-persona' : ''}`}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid',
                      borderColor: activeId === id ? 'var(--color-accent)' : 'var(--color-outline)',
                      background: 'var(--color-surface-container)',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedPersonaId(id);
                      setPage('detail');
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {p.metadata?.suggested_name || id}
                      </span>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <button
                          className="btn-icon"
                          title="Quick Inspect"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailModalPersonaId(id);
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </button>
                        <span className="badge" style={{ fontSize: 10 }}>
                          {p.metadata?.domain?.toUpperCase() || 'TECH'}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: '0 0 8px 0', fontSize: 12, opacity: 0.8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.persona?.instruction || 'No description.'}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, opacity: 0.7 }}>
                      <span>Version: {p.metadata?.version || '1.0.0'}</span>
                      <span style={{ color: activeId === id ? 'var(--color-accent)' : 'inherit', fontWeight: activeId === id ? 600 : 400 }}>
                        {activeId === id ? '● Active Persona' : 'Click to inspect'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '32px 0' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.5 }}>search</span>
                  <p>No personas found.</p>
                  <button className="btn btn-secondary btn-small" onClick={handleLoadStarterPresets} style={{ marginTop: 8 }}>
                    Load Starter Presets
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Create / Edit Form Page with Granular Controls */}
        {page === 'create' && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <button className="btn-icon" onClick={() => setPage('browse')}>
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {editingPersonaId ? 'Edit Persona' : 'Create Persona'}
              </h3>
            </div>

            <div className="create-form" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Persona Name & Domain */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Persona Name</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Architect"
                  value={createdName}
                  onChange={e => {
                    setCreatedName(e.target.value);
                    markFormDirty();
                  }}
                  style={{ width: '100%', padding: 8, borderRadius: 6, background: 'var(--color-surface-container)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
                />
              </div>

              {/* Role & Instruction */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Role & Identity</label>
                <textarea
                  className="persona-textarea"
                  placeholder="Describe the persona's role, background, and operational purpose..."
                  rows={3}
                  value={createdRole}
                  onChange={e => {
                    setCreatedRole(e.target.value);
                    markFormDirty();
                  }}
                />
              </div>

              {/* Domain Context */}
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Domain Knowledge & Scope</label>
                <textarea
                  className="persona-textarea"
                  placeholder="Technical background, specialized terminology, libraries..."
                  rows={2}
                  value={createdContext}
                  onChange={e => {
                    setCreatedContext(e.target.value);
                    markFormDirty();
                  }}
                />
              </div>

              {/* Granular Style Controls (renderExtStyle parity) */}
              <div style={{ background: 'var(--color-surface-container-low)', padding: 12, borderRadius: 8, border: '1px solid var(--color-outline)' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--color-accent)', marginBottom: 8 }}>
                  Communication Style & Profiler
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>Verbosity</label>
                    <select
                      value={editVerbosity}
                      onChange={e => {
                        setEditVerbosity(e.target.value as any);
                        markFormDirty();
                      }}
                      style={{ width: '100%', padding: 6, fontSize: 12, borderRadius: 6, background: 'var(--color-surface-container)', color: 'inherit', border: '1px solid var(--color-outline)' }}
                    >
                      <option value="concise">Concise</option>
                      <option value="moderate">Moderate</option>
                      <option value="verbose">Verbose</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>Tech Level</label>
                    <select
                      value={editTechLevel}
                      onChange={e => {
                        setEditTechLevel(e.target.value as any);
                        markFormDirty();
                      }}
                      style={{ width: '100%', padding: 6, fontSize: 12, borderRadius: 6, background: 'var(--color-surface-container)', color: 'inherit', border: '1px solid var(--color-outline)' }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>Directness</label>
                    <select
                      value={editDirectness}
                      onChange={e => {
                        setEditDirectness(e.target.value as any);
                        markFormDirty();
                      }}
                      style={{ width: '100%', padding: 6, fontSize: 12, borderRadius: 6, background: 'var(--color-surface-container)', color: 'inherit', border: '1px solid var(--color-outline)' }}
                    >
                      <option value="direct">Direct</option>
                      <option value="indirect">Indirect</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                {/* Traits Tag Editor */}
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 4 }}>Style Traits</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {editTraits.map(tr => (
                      <span key={tr} className="v4-chip custom selected" style={{ fontSize: 12 }}>
                        {tr}
                        <button type="button" className="chip-remove" onClick={() => handleRemoveTrait(tr)}>×</button>
                      </span>
                    ))}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="text"
                        placeholder="+ Add trait"
                        value={newTraitInput}
                        onChange={e => setNewTraitInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTrait()}
                        style={{ padding: '4px 8px', fontSize: 12, borderRadius: 12, border: '1px solid var(--color-outline)', background: 'transparent', color: 'inherit' }}
                      />
                      <button type="button" className="chip-add-btn" onClick={handleAddTrait}>+</button>
                    </div>
                  </div>
                </div>

                {/* Preferred Response Style */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 2 }}>Preferred Style Statement</label>
                  <input
                    type="text"
                    placeholder="e.g. 'Use bulleted summaries and code diffs first'"
                    value={editPrefStyle}
                    onChange={e => {
                      setEditPrefStyle(e.target.value);
                      markFormDirty();
                    }}
                    style={{ width: '100%', padding: 6, fontSize: 12, borderRadius: 6, background: 'var(--color-surface-container)', color: 'inherit', border: '1px solid var(--color-outline)' }}
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-large btn-full" onClick={handleCreate} style={{ width: '100%', marginTop: 8 }}>
                {editingPersonaId ? 'Update Persona' : 'Save Persona'}
              </button>
            </div>
          </div>
        )}

        {/* Prompts Library Page */}
        {page === 'prompts' && (
          <div className="persona-page active">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn-icon" onClick={() => setPage('browse')}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h3 style={{ margin: 0, fontSize: 16 }}>Prompts Library</h3>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', margin: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                  <span>Import</span>
                  <input type="file" accept=".json,.txt" onChange={handleImportPromptFile} style={{ display: 'none' }} />
                </label>
                <button className="btn btn-primary btn-small" onClick={() => setPage('add-prompt')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  <span>New</span>
                </button>
              </div>
            </div>

            <div className="search-box" style={{ marginBottom: 12 }}>
              <span className="search-icon material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search prompt templates..."
                value={promptSearch}
                onChange={e => setPromptSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredPrompts.map(pr => (
                <div
                  key={pr.id}
                  className="card"
                  style={{ padding: 12, background: 'var(--color-surface-container)', borderRadius: 8, border: '1px solid var(--color-outline)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{pr.title}</span>
                    <span className="badge" style={{ fontSize: 10 }}>{pr.category}</span>
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: 12, opacity: 0.85, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>
                    {pr.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-small"
                      title="Preview template with variable interpolation"
                      onClick={() => setPreviewPrompt(pr)}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>preview</span>
                      <span>Preview</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => navigator.clipboard.writeText(pr.content)}
                    >
                      Copy
                    </button>
                    <button
                      className="btn-icon"
                      title="Delete prompt"
                      onClick={async () => {
                        await deleteSavedPrompt(pr.id);
                        setPrompts(prev => prev.filter(item => item.id !== pr.id));
                      }}
                      style={{ color: 'var(--color-error)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
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
                  placeholder="e.g. Adversarial Code Review"
                  value={newPromptTitle}
                  onChange={e => setNewPromptTitle(e.target.value)}
                  style={{ width: '100%', padding: 8, borderRadius: 6, background: 'var(--color-surface-container)', color: 'var(--color-text-primary)', border: '1px solid var(--color-outline)' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Prompt Content</label>
                <textarea
                  className="persona-textarea"
                  placeholder="Enter prompt instructions with {variables}..."
                  rows={4}
                  value={newPromptContent}
                  onChange={e => setNewPromptContent(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary btn-full"
                onClick={async () => {
                  if (newPromptTitle.trim() && newPromptContent.trim()) {
                    const saved = await savePromptLocal({
                      title: newPromptTitle,
                      content: newPromptContent,
                      category: 'Custom'
                    });
                    setPrompts(prev => [{
                      id: saved.id,
                      title: saved.title,
                      content: saved.content,
                      category: saved.category || 'Custom'
                    }, ...prev]);
                    setNewPromptTitle('');
                    setNewPromptContent('');
                    setPage('prompts');
                  }
                }}
              >
                Save Prompt Template
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

            <div className="card" style={{ padding: 16, marginBottom: 16, background: 'var(--color-surface-container)', borderRadius: 8, border: '1px solid var(--color-outline)' }}>
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
                onClick={() => handleStartEdit(personas[selectedPersonaId]!, selectedPersonaId)}
              >
                Edit Persona & Style Controls
              </button>
              <button
                className="btn btn-secondary"
                onClick={async () => {
                  const p = personas[selectedPersonaId];
                  if (!p) return;
                  setPublishStatus('Publishing...');
                  const res = await handlePublishPersona({
                    name: p.metadata?.suggested_name || selectedPersonaId,
                    extractionData: p,
                    domain: p.metadata?.domain
                  });
                  setPublishStatus(res.mode === 'cloud' ? 'Published to Community!' : 'Saved as Local Draft');
                  setTimeout(() => setPublishStatus(null), 3000);
                }}
              >
                {publishStatus || 'Publish to Community'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExportJson(selectedPersonaId)}
              >
                Export Persona JSON
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setReportModalData({ id: selectedPersonaId, name: personas[selectedPersonaId]?.metadata?.suggested_name || selectedPersonaId })}
                style={{ color: 'var(--color-error)' }}
              >
                Report Persona (Community Moderation)
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

      {/* Render Modals Subsystem */}
      {previewPrompt && (
        <PromptPreviewModal
          isOpen={Boolean(previewPrompt)}
          prompt={previewPrompt}
          onClose={() => setPreviewPrompt(null)}
        />
      )}

      {reportModalData && (
        <ReportModal
          isOpen={Boolean(reportModalData)}
          personaId={reportModalData.id}
          personaName={reportModalData.name}
          onClose={() => setReportModalData(null)}
          onSubmit={handleSubmitReport}
        />
      )}

      {detailModalPersonaId && personas[detailModalPersonaId] && (
        <PersonaDetailModal
          isOpen={Boolean(detailModalPersonaId)}
          persona={personas[detailModalPersonaId]!}
          personaId={detailModalPersonaId}
          onClose={() => setDetailModalPersonaId(null)}
          onImport={(id, p) => onSavePersona(id, p)}
          onReport={(id, name) => setReportModalData({ id, name })}
          onExport={(id) => handleExportJson(id)}
        />
      )}
    </div>
  );
};
