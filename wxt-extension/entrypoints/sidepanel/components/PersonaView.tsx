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
import { ExpandableTextarea } from './ExpandableTextarea';

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

  const handleCardClick = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const circle = document.createElement('span');
    circle.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    circle.style.width = `${size}px`;
    circle.style.height = `${size}px`;
    circle.style.left = `${e.clientX - rect.left - size / 2}px`;
    circle.style.top = `${e.clientY - rect.top - size / 2}px`;
    card.appendChild(circle);
    setTimeout(() => circle.remove(), 600);

    setSelectedPersonaId(id);
    setPage('detail');
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
                  <button className="search-clear" onClick={() => setSearchQuery('')} title="Clear">✕</button>
                )}
              </div>
              <button
                id="search-filters-btn"
                className={`btn btn-icon ${selectedDomain ? 'has-filters' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Filter Domains"
              >
                <span className="material-symbols-outlined">tune</span>
              </button>

              {/* Filter Panel (M3 Floating Dropdown) */}
              <div className={`filter-panel ${showFilters ? '' : 'hidden'}`}>
                <div className="filter-chip-group" data-filter="domain">
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">category</span> Domain
                  </span>
                  <div className="chip-row">
                    {['All', 'Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle'].map(d => {
                      const isAll = d === 'All';
                      const isSelected = isAll ? !selectedDomain : selectedDomain?.toLowerCase() === d.toLowerCase();
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`filter-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedDomain(isAll ? null : d);
                            setShowFilters(false);
                          }}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedDomain && (
                  <div className="filter-reset-row">
                    <button
                      className="filter-reset"
                      title="Reset Filters"
                      onClick={() => {
                        setSelectedDomain(null);
                        setShowFilters(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Navigation Bar */}
            <div style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
              <button className="btn btn-primary btn-small" onClick={handleStartCreate} style={{ flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                <span>Create</span>
              </button>
              <button className="btn btn-secondary btn-small" onClick={() => setPage('prompts')} style={{ flex: 1 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark</span>
                <span>Prompts ({prompts.length})</span>
              </button>
              <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload_file</span>
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
              </label>
            </div>

            {/* Persona Cards List */}
            <div id="persona-results" className="persona-list">
              {filteredList.length > 0 ? (
                filteredList.map(([id, p]) => (
                  <div
                    key={id}
                    className={`persona-item browse-item ${activeId === id ? 'active-persona' : ''}`}
                    onClick={(e) => handleCardClick(id, e)}
                  >
                    <div className="persona-item-info">
                      <div className="persona-item-name">{p.metadata?.suggested_name || id}</div>
                      <div className="persona-item-meta">
                        <span className="status-chip private">{p.metadata?.domain?.toUpperCase() || 'TECH'}</span>
                        <span className="version-badge">v{p.metadata?.version || '1.0.0'}</span>
                        <span className="keywords-text">{p.persona?.instruction || ''}</span>
                      </div>
                    </div>
                    <div className="persona-item-actions">
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
                      {activeId === id && (
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: 20 }}>
                          check_circle
                        </span>
                      )}
                    </div>
                    <span className="material-symbols-outlined chevron">chevron_right</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="material-symbols-outlined">search</span>
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
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => setPage('browse')} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>{editingPersonaId ? 'Edit Persona' : 'Create Persona'}</h3>
            </div>

            <div className="create-page-content" style={{ padding: '16px 0' }}>
              <div className="create-form">
                {/* Persona Name */}
                <div className="form-group">
                  <label className="form-label">Persona Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Senior Frontend Architect"
                    value={createdName}
                    onChange={e => {
                      setCreatedName(e.target.value);
                      markFormDirty();
                    }}
                  />
                </div>

                {/* Role & Instruction */}
                <div className="form-group">
                  <label className="form-label">Role & Identity <span className="required">*</span></label>
                  <ExpandableTextarea
                    className="persona-textarea"
                    placeholder="Describe the persona's role, background, and operational purpose..."
                    rows={3}
                    value={createdRole}
                    onChange={e => {
                      setCreatedRole(e.target.value);
                      markFormDirty();
                    }}
                    title="Expand Role & Identity"
                  />
                </div>

                {/* Domain Context */}
                <div className="form-group">
                  <label className="form-label">Domain Knowledge & Scope</label>
                  <ExpandableTextarea
                    className="persona-textarea"
                    placeholder="Technical background, specialized terminology, libraries..."
                    rows={2}
                    value={createdContext}
                    onChange={e => {
                      setCreatedContext(e.target.value);
                      markFormDirty();
                    }}
                    title="Expand Domain Knowledge"
                  />
                </div>

                {/* Granular Style Controls */}
                <div className="section-header">Communication Style & Profiler</div>

                <div className="metadata-row">
                  <div className="form-group compact">
                    <label className="form-label">Verbosity</label>
                    <select
                      className="form-select"
                      value={editVerbosity}
                      onChange={e => {
                        setEditVerbosity(e.target.value as any);
                        markFormDirty();
                      }}
                    >
                      <option value="concise">Concise</option>
                      <option value="moderate">Moderate</option>
                      <option value="verbose">Verbose</option>
                    </select>
                  </div>

                  <div className="form-group compact">
                    <label className="form-label">Tech Level</label>
                    <select
                      className="form-select"
                      value={editTechLevel}
                      onChange={e => {
                        setEditTechLevel(e.target.value as any);
                        markFormDirty();
                      }}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div className="form-group compact">
                    <label className="form-label">Directness</label>
                    <select
                      className="form-select"
                      value={editDirectness}
                      onChange={e => {
                        setEditDirectness(e.target.value as any);
                        markFormDirty();
                      }}
                    >
                      <option value="direct">Direct</option>
                      <option value="indirect">Indirect</option>
                      <option value="mixed">Mixed</option>
                    </select>
                  </div>
                </div>

                {/* Traits Tag Editor */}
                <div className="form-group">
                  <label className="form-label">Style Traits</label>
                  <div className="chips-container">
                    {editTraits.map(tr => (
                      <span key={tr} className="v4-chip custom selected">
                        {tr}
                        <button type="button" className="chip-remove" onClick={() => handleRemoveTrait(tr)}>×</button>
                      </span>
                    ))}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="text"
                        className="chip-input"
                        placeholder="+ Add trait"
                        value={newTraitInput}
                        onChange={e => setNewTraitInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTrait()}
                      />
                      <button type="button" className="chip-add-btn" onClick={handleAddTrait}>+</button>
                    </div>
                  </div>
                </div>

                {/* Preferred Response Style */}
                <div className="form-group">
                  <label className="form-label">Preferred Style Statement</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 'Use bulleted summaries and code diffs first'"
                    value={editPrefStyle}
                    onChange={e => {
                      setEditPrefStyle(e.target.value);
                      markFormDirty();
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button className="btn btn-primary btn-large" onClick={handleCreate} style={{ flex: 1 }}>
                    {editingPersonaId ? 'Update Persona' : 'Save Persona'}
                  </button>
                  <button className="btn btn-secondary btn-large" onClick={() => setPage('browse')} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prompts Library Page */}
        {page === 'prompts' && (
          <div className="persona-page active">
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => setPage('browse')} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Prompts Library</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <label className="btn btn-secondary btn-small" style={{ cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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

            <div className="search-container" style={{ margin: '12px 0' }}>
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search prompt templates..."
                  value={promptSearch}
                  onChange={e => setPromptSearch(e.target.value)}
                />
                {promptSearch && (
                  <button className="search-clear" onClick={() => setPromptSearch('')} title="Clear">✕</button>
                )}
              </div>
            </div>

            <div className="persona-list">
              {filteredPrompts.map(pr => (
                <div key={pr.id} className="persona-item browse-item" style={{ minHeight: 'auto', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
                    <span className="persona-item-name">{pr.title}</span>
                    <span className="version-badge">{pr.category}</span>
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: 12, opacity: 0.85, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden', width: '100%' }}>
                    {pr.content}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, width: '100%' }}>
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
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => setPage('prompts')} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Add Prompt Template</h3>
            </div>

            <div className="create-page-content" style={{ padding: '16px 0' }}>
              <div className="create-form">
                <div className="form-group">
                  <label className="form-label">Title <span className="required">*</span></label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Adversarial Code Review"
                    value={newPromptTitle}
                    onChange={e => setNewPromptTitle(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Prompt Content <span className="required">*</span></label>
                  <ExpandableTextarea
                    className="persona-textarea"
                    placeholder="Enter prompt instructions with {variables}..."
                    rows={6}
                    value={newPromptContent}
                    onChange={e => setNewPromptContent(e.target.value)}
                    title="Expand Prompt Content"
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                  <button
                    className="btn btn-primary btn-large"
                    style={{ flex: 1 }}
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
                  <button className="btn btn-secondary btn-large" onClick={() => setPage('prompts')} style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Page */}
        {page === 'detail' && selectedPersonaId && personas[selectedPersonaId] && (
          <div className="persona-page active">
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => setPage('browse')} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Persona Details</h3>
            </div>

            <div className="persona-detail-content" style={{ padding: '16px 0' }}>
              <div className="modal-stats" style={{ marginBottom: 16 }}>
                <div className="stat">
                  <div className="stat-value">
                    <span className="material-symbols-outlined">star</span>
                    <span>{personas[selectedPersonaId]?.metadata?.rating ?? 4.8}</span>
                  </div>
                  <div className="stat-label">Rating</div>
                </div>
                <div className="stat">
                  <div className="stat-value">
                    <span className="material-symbols-outlined">download</span>
                    <span>{personas[selectedPersonaId]?.metadata?.downloads ?? 45}</span>
                  </div>
                  <div className="stat-label">Imports</div>
                </div>
                <div className="stat">
                  <div className="stat-value">
                    <span>v{personas[selectedPersonaId]?.metadata?.version || '1.0.0'}</span>
                  </div>
                  <div className="stat-label">Version</div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 16, fontWeight: 600 }}>
                  {personas[selectedPersonaId]?.metadata?.suggested_name || selectedPersonaId}
                </label>
                <div className="persona-item-meta" style={{ marginTop: 4 }}>
                  <span className="status-chip private">{personas[selectedPersonaId]?.metadata?.domain?.toUpperCase() || 'TECH'}</span>
                  <span className="version-badge">ID: {selectedPersonaId}</span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Role Definition & System Prompt</label>
                <div className="persona-textarea" style={{ minHeight: 80, overflowY: 'auto' }}>
                  {personas[selectedPersonaId]?.persona?.instruction || 'No persona description.'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-primary btn-large"
                  onClick={() => {
                    onSelectActive(selectedPersonaId);
                    setPage('browse');
                  }}
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  <span>Set as Active Persona</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleStartEdit(personas[selectedPersonaId]!, selectedPersonaId)}
                >
                  <span className="material-symbols-outlined">edit</span>
                  <span>Edit Persona & Style Controls</span>
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
                  <span className="material-symbols-outlined">cloud_upload</span>
                  <span>{publishStatus || 'Publish to Community'}</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleExportJson(selectedPersonaId)}
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Export Persona JSON</span>
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setReportModalData({ id: selectedPersonaId, name: personas[selectedPersonaId]?.metadata?.suggested_name || selectedPersonaId })}
                  style={{ color: 'var(--color-error)' }}
                >
                  <span className="material-symbols-outlined">flag</span>
                  <span>Report Persona (Community Moderation)</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ color: 'var(--color-error)' }}
                  onClick={() => {
                    onDeletePersona(selectedPersonaId);
                    setPage('browse');
                  }}
                >
                  <span className="material-symbols-outlined">delete</span>
                  <span>Delete Persona</span>
                </button>
              </div>
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
