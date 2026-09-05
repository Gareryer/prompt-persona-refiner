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

export type PersonaPageId =
  | 'browse'
  | 'my-personas'
  | 'create'
  | 'extracted'
  | 'prompts'
  | 'add-prompt'
  | 'detail'
  | 'version-history';

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
  const [pageStack, setPageStack] = useState<PersonaPageId[]>(['browse']);
  const page = pageStack[pageStack.length - 1] || 'browse';
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form State for Extracted / Edit Persona
  const [createdName, setCreatedName] = useState('');
  const [createdRole, setCreatedRole] = useState('');
  const [createdContext, setCreatedContext] = useState('');
  const [createdTone, setCreatedTone] = useState('');
  const [createdFramework, setCreatedFramework] = useState('');
  const [createdConstraints, setCreatedConstraints] = useState('');
  const [createdFormat, setCreatedFormat] = useState('');
  const [createdExemplar, setCreatedExemplar] = useState('');
  const [createdInjectedContext, setCreatedInjectedContext] = useState('');

  // Style Profiler State
  const [editVerbosity, setEditVerbosity] = useState<'concise' | 'moderate' | 'verbose'>('moderate');
  const [editTechLevel, setEditTechLevel] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert'>('advanced');
  const [editDirectness, setEditDirectness] = useState<'direct' | 'indirect' | 'mixed'>('direct');
  const [editTraits, setEditTraits] = useState<string[]>(['Analytical', 'Precise']);
  const [newTraitInput, setNewTraitInput] = useState('');
  const [editPrefStyle, setEditPrefStyle] = useState('');
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'private'>('public');

  // Create Page Input (Paste Prompt)
  const [extractPromptInput, setExtractPromptInput] = useState('');

  // Modals State
  const [previewPrompt, setPreviewPrompt] = useState<PromptTemplate | null>(null);
  const [reportModalData, setReportModalData] = useState<{ id: string; name: string } | null>(null);
  const [detailModalPersonaId, setDetailModalPersonaId] = useState<string | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);

  // Prompts Library State
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    { id: 'p1', title: 'Refactor for Simplicity', content: 'Refactor this code to follow the boring solution: eliminate speculative machinery and enforce single responsibility.', category: 'Code' },
    { id: 'p2', title: 'Adversarial Security Audit', content: 'Analyze this code like an attacker: identify IDOR, XSS, race conditions, and unhandled failure modes.', category: 'Security' },
    { id: 'p3', title: 'Write Comprehensive Unit Tests', content: 'Generate exhaustive unit tests covering golden paths, edge cases, zero-values, and invalid inputs.', category: 'Testing' }
  ]);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [promptSearch, setPromptSearch] = useState('');

  // Version History State
  const [versions, setVersions] = useState<Array<{ version: string; date: string; author: string; changes: string }>>([
    { version: 'v1.0.0', date: 'Initial Synthesis', author: 'Local User', changes: 'Synthesized core role and instructions' }
  ]);

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

  const navigateTo = (target: PersonaPageId, _parent?: PersonaPageId) => {
    setPageStack(prev => {
      if (target === 'browse') return ['browse'];
      if (target === 'my-personas') return ['browse', 'my-personas'];
      if (prev[prev.length - 1] === target) return prev;
      return [...prev, target];
    });
  };

  const handlePopPage = () => {
    setPageStack(prev => {
      if (prev.length <= 1) return ['browse'];
      return prev.slice(0, prev.length - 1);
    });
  };

  const handleBackFromCreate = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedModal(true);
    } else {
      handlePopPage();
    }
  };

  const handleDuplicatePersona = (id: string) => {
    const source = personas[id];
    if (!source) return;
    const newId = `${id}-copy-${Date.now().toString(36).slice(-4)}`;
    const copyName = `${source.metadata?.suggested_name || id} (Copy)`;
    const duplicated: PersonaV4 = {
      ...JSON.parse(JSON.stringify(source)),
      metadata: {
        ...source.metadata,
        suggested_name: copyName,
        created_at: new Date().toISOString()
      }
    };
    onSavePersona(newId, duplicated);
  };

  const filteredList = Object.entries(personas).filter(([id, p]) => {
    const name = p.metadata?.suggested_name || id;
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = !selectedDomain || p.metadata?.domain?.toLowerCase() === selectedDomain.toLowerCase();
    const toneMeta = p.tone?.metadata || {};
    const traits = ((toneMeta.traits as string[]) || (toneMeta.style_tags as string[]) || []).map(t => t.toLowerCase());
    const matchesTone = !selectedTone || traits.includes(selectedTone.toLowerCase());

    const isDraft = (p.metadata as any)?.status === 'draft' || (p.metadata as any)?.visibility === 'private';
    const matchesStatus =
      !selectedStatus ||
      selectedStatus === 'All' ||
      (selectedStatus === 'Active' && id === activeId) ||
      (selectedStatus === 'Draft' && isDraft) ||
      (selectedStatus === 'Public' && !isDraft);

    return matchesSearch && matchesDomain && matchesTone && matchesStatus;
  });

  const filteredPrompts = prompts.filter(p => {
    const query = promptSearch.toLowerCase();
    return p.title.toLowerCase().includes(query) || p.content.toLowerCase().includes(query) || p.category.toLowerCase().includes(query);
  });

  const handleStartCreate = () => {
    setExtractPromptInput('');
    setCreatedName('');
    setCreatedRole('');
    setCreatedContext('');
    setCreatedTone('');
    setCreatedFramework('');
    setCreatedConstraints('');
    setCreatedFormat('');
    setCreatedExemplar('');
    setCreatedInjectedContext('');
    setEditVerbosity('moderate');
    setEditTechLevel('advanced');
    setEditDirectness('direct');
    setEditTraits(['Analytical', 'Precise']);
    setEditPrefStyle('');
    setSelectedDomain('Tech');
    setEditingPersonaId(null);
    resetFormDirty();
    navigateTo('create', page === 'my-personas' ? 'my-personas' : 'browse');
  };

  const handleStartEdit = (p: PersonaV4, pId: string) => {
    const editData = loadPersonaToEdit(p);
    setCreatedName(editData.name || p.metadata?.suggested_name || pId);
    setCreatedRole(editData.memory_layer?.persona?.instruction || p.persona?.instruction || '');
    setCreatedContext(editData.memory_layer?.context?.instruction || p.context?.instruction || '');
    setCreatedTone(p.tone?.instruction || '');
    setCreatedFramework(p.framework?.instruction || '');
    setCreatedConstraints(p.constraints?.instruction || '');
    setCreatedFormat(p.format?.instruction || '');
    setCreatedExemplar(p.exemplar?.instruction || '');
    setCreatedInjectedContext('');
    const toneMeta = p.tone?.metadata || {};
    setEditVerbosity((toneMeta.verbosity as any) || 'moderate');
    setEditTechLevel((toneMeta.technical_level as any) || 'advanced');
    setEditDirectness((toneMeta.directness as any) || 'direct');
    setEditTraits((toneMeta.traits as string[]) || (toneMeta.style_tags as string[]) || ['Analytical']);
    setEditPrefStyle((toneMeta.preferred_response_style as string) || '');
    setSelectedDomain(p.metadata?.domain || 'Tech');
    setEditingPersonaId(pId);
    resetFormDirty();
    setVersions([
      { version: `v${p.metadata?.version || '1.0.0'}`, date: 'Current Version', author: 'Local User', changes: 'Active parameters' },
      { version: 'v1.0.0', date: 'Initial Creation', author: 'System', changes: 'Base setup' }
    ]);
    navigateTo('extracted', page === 'my-personas' ? 'my-personas' : 'browse');
  };

  const handleExtractFromPrompt = () => {
    const promptText = extractPromptInput.trim();
    if (promptText) {
      const words = promptText.split(/\s+/).slice(0, 4).join(' ');
      setCreatedName(words ? `${words.charAt(0).toUpperCase() + words.slice(1)} Specialist` : 'Extracted Specialist');
      setCreatedRole(promptText);
      setCreatedContext(`Extracted from source prompt:\n"${promptText.slice(0, 140)}..."`);
    } else {
      setCreatedName('Custom Specialist');
      setCreatedRole('Specialist configured from scratch.');
      setCreatedContext('General contextual knowledge.');
    }
    markFormDirty();
    navigateTo('extracted', 'create');
  };

  const handleCreate = async () => {
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
        instruction: createdTone || existing?.tone?.instruction || `Communicate in a ${editVerbosity} manner at a ${editTechLevel} technical level with ${editDirectness} phrasing.`,
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
      framework: {
        ...existing?.framework,
        instruction: createdFramework || existing?.framework?.instruction || ''
      },
      constraints: {
        ...existing?.constraints,
        instruction: createdConstraints || existing?.constraints?.instruction || ''
      },
      format: {
        ...existing?.format,
        instruction: createdFormat || existing?.format?.instruction || ''
      },
      exemplar: {
        ...existing?.exemplar,
        instruction: createdExemplar || existing?.exemplar?.instruction || ''
      },
      metadata: {
        ...existing?.metadata,
        suggested_name: createdName,
        suggested_title: existing?.metadata?.suggested_title || 'AI Specialist',
        domain: selectedDomain || existing?.metadata?.domain || 'Tech',
        version: editingPersonaId ? '1.0.1' : '1.0.0'
      }
    };
    onSavePersona(targetId, newPersona);
    resetFormDirty();

    if (visibilityMode === 'public') {
      setPublishStatus('Publishing to community...');
      const res = await handlePublishPersona({
        name: createdName,
        extractionData: newPersona,
        domain: selectedDomain || 'Tech'
      });
      setPublishStatus(res.mode === 'cloud' ? '✓ Published to Community!' : '✓ Saved as Local Draft');
      setTimeout(() => setPublishStatus(null), 2500);
    } else {
      setSaveStatus('✓ Saved as Draft');
      setTimeout(() => setSaveStatus(null), 2500);
    }

    navigateTo('my-personas', 'browse');
  };

  const handleSaveNewPrompt = async () => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;
    const saved = await savePromptLocal({
      title: newPromptTitle.trim(),
      content: newPromptContent.trim(),
      category: 'Saved'
    });
    setPrompts(prev => [{
      id: saved.id,
      title: saved.title,
      content: saved.content,
      category: saved.category || 'Saved'
    }, ...prev]);
    setNewPromptTitle('');
    setNewPromptContent('');
    navigateTo('prompts', 'my-personas');
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
      navigateTo('my-personas', 'browse');
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
    } else if (typeof content === 'object' && (content as any)?.content) {
      const saved = await savePromptLocal({
        title: (content as any).title || file.name.replace(/\.[^/.]+$/, ''),
        content: (content as any).content,
        category: (content as any).category || 'Imported'
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
    navigateTo('detail', page === 'my-personas' ? 'my-personas' : 'browse');
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

  const showFooter = !['detail', 'version-history', 'prompts'].includes(page);
  const showFab = ['browse', 'my-personas'].includes(page);

  return (
    <div id="tab-content-persona" className="tab-content active">
      <div className="persona-page-stack">

        {/* 1. Browse Page (Default) */}
        {page === 'browse' && (
          <div id="persona-page-browse" className="persona-page active" data-page="browse">
            <div className="search-container">
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  id="persona-search"
                  className="search-input"
                  placeholder="Search personas by keyword, intent..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button id="search-clear-btn" className="search-clear" onClick={() => setSearchQuery('')} title="Clear">✕</button>
                )}
              </div>
              <button
                id="search-filters-btn"
                className={`btn btn-icon ${selectedDomain || selectedTone ? 'has-filters' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Filter Personas"
              >
                <span className="material-symbols-outlined">tune</span>
              </button>

              {/* Filter Panel (M3 Floating Dropdown) */}
              <div id="search-filters" className={`filter-panel ${showFilters ? '' : 'hidden'}`}>
                {/* Domain Chips */}
                <div className="filter-chip-group" data-filter="domain">
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">category</span> Domain
                  </span>
                  <div className="chip-row">
                    {['All', 'Tech', 'Creative', 'Business', 'Education', 'Academic', 'Health', 'Lifestyle'].map(d => {
                      const isAll = d === 'All';
                      const isSelected = isAll ? !selectedDomain : selectedDomain?.toLowerCase() === d.toLowerCase();
                      return (
                        <button
                          key={d}
                          type="button"
                          className={`filter-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedDomain(isAll ? null : d)}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tone Chips */}
                <div className="filter-chip-group" data-filter="tone" style={{ marginTop: 8 }}>
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">record_voice_over</span> Tone
                  </span>
                  <div className="chip-row">
                    {['All', 'Analytical', 'Technical', 'Precise', 'Casual'].map(t => {
                      const isAll = t === 'All';
                      const isSelected = isAll ? !selectedTone : selectedTone?.toLowerCase() === t.toLowerCase();
                      return (
                        <button
                          key={t}
                          type="button"
                          className={`filter-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedTone(isAll ? null : t)}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Chips */}
                <div className="filter-chip-group" data-filter="status" style={{ marginTop: 8 }}>
                  <span className="chip-group-label">
                    <span className="material-symbols-outlined">verified</span> Status
                  </span>
                  <div className="chip-row">
                    {['All', 'Active', 'Draft', 'Public'].map(s => {
                      const isAll = s === 'All';
                      const isSelected = isAll ? !selectedStatus : selectedStatus?.toLowerCase() === s.toLowerCase();
                      return (
                        <button
                          key={s}
                          type="button"
                          className={`filter-chip ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedStatus(isAll ? null : s)}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="filter-reset-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  {(selectedDomain || selectedTone || selectedStatus) ? (
                    <button
                      id="filter-reset-btn"
                      className="filter-reset"
                      title="Reset Filters"
                      onClick={() => {
                        setSelectedDomain(null);
                        setSelectedTone(null);
                        setSelectedStatus(null);
                      }}
                    >
                      Reset All Filters ✕
                    </button>
                  ) : <div />}
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => setShowFilters(false)}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>

            {/* Persona Cards List */}
            <div id="persona-results" className="persona-list">
              {filteredList.length > 0 ? (
                filteredList.map(([id, p]) => {
                  const isDraft = (p.metadata as any)?.status === 'draft' || (p.metadata as any)?.visibility === 'private';
                  const isActive = activeId === id;
                  return (
                    <div
                      key={id}
                      className={`persona-item browse-item ${isActive ? 'active-persona' : ''}`}
                      onClick={(e) => handleCardClick(id, e)}
                    >
                      <div className="persona-item-info">
                        <div className="persona-item-name">{p.metadata?.suggested_name || id}</div>
                        <div className="persona-item-meta">
                          <span className={`status-chip ${isActive ? 'active' : (isDraft ? 'draft' : 'public')}`}>
                            {isActive ? 'ACTIVE' : (isDraft ? 'DRAFT' : (p.metadata?.domain?.toUpperCase() || 'TECH'))}
                          </span>
                          <span className="version-badge">v{p.metadata?.version || '1.0.0'}</span>
                          <span className="keywords-text">{p.persona?.instruction || ''}</span>
                        </div>
                      </div>
                      <div className="persona-item-actions">
                        <button
                          className="btn-icon"
                          title="Duplicate Persona"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicatePersona(id);
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                        </button>
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
                        {isActive && (
                          <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: 20 }}>
                            check_circle
                          </span>
                        )}
                      </div>
                      <span className="material-symbols-outlined chevron">chevron_right</span>
                    </div>
                  );
                })
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

        {/* 2. My Personas Page (Child) */}
        {page === 'my-personas' && (
          <div id="persona-page-my-personas" className="persona-page active" data-page="my-personas">
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => navigateTo('browse')} title="Back to Browse">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>My Personas</h3>
            </div>

            <div id="my-personas-list" className="persona-list">
              {Object.entries(personas).length > 0 ? (
                Object.entries(personas).map(([id, p]) => (
                  <div
                    key={id}
                    className={`persona-item ${activeId === id ? 'active-persona' : ''}`}
                    onClick={(e) => handleCardClick(id, e)}
                  >
                    <div className="persona-item-info">
                      <div className="persona-item-name">{p.metadata?.suggested_name || id}</div>
                      <div className="persona-item-meta">
                        <span className={`status-chip ${activeId === id ? 'active' : (((p.metadata as any)?.status === 'draft' || (p.metadata as any)?.visibility === 'private') ? 'draft' : 'public')}`}>
                          {activeId === id ? 'ACTIVE' : (((p.metadata as any)?.status === 'draft' || (p.metadata as any)?.visibility === 'private') ? 'DRAFT' : (p.metadata?.domain?.toUpperCase() || 'TECH'))}
                        </span>
                        <span className="version-badge">v{p.metadata?.version || '1.0.0'}</span>
                        <span className="keywords-text">{p.persona?.instruction || ''}</span>
                      </div>
                    </div>
                    <div className="persona-item-actions">
                      <button
                        className="btn-icon"
                        title="Duplicate Persona"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicatePersona(id);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Edit Persona"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(p, id);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Export JSON"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportJson(id);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Delete Persona"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(id);
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-error)' }}>delete</span>
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
                  <span className="material-symbols-outlined">folder_open</span>
                  <p>No custom personas yet. Tap + to create one!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Create Page (Paste Prompt / Import File) */}
        {page === 'create' && (
          <div id="persona-page-create" className="persona-page active" data-page="create">
            <div className="page-header">
              <button className="back-nav-btn" onClick={handlePopPage} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Create Persona</h3>
            </div>

            <div className="create-page-content">
              <div className="create-form">
                <label className="form-label">Paste External Prompt</label>
                <p className="help-text">Paste a user or system prompt to extract a persona from it.</p>
                <div className="textarea-container">
                  <textarea
                    id="extract-prompt-input"
                    className="persona-textarea"
                    placeholder="Paste your user or system prompt here..."
                    rows={6}
                    value={extractPromptInput}
                    onChange={e => setExtractPromptInput(e.target.value)}
                  />
                  <button className="expand-btn" title="Expand">
                    <span className="material-symbols-outlined">expand_content</span>
                  </button>
                </div>

                <div className="divider-or">
                  <span>or</span>
                </div>

                <label
                  id="btn-import-persona"
                  className="btn btn-secondary btn-full"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <span className="material-symbols-outlined">upload</span>
                  <span>Import from File</span>
                  <input
                    type="file"
                    id="import-persona-file"
                    accept=".json,.txt,.xml,.md"
                    onChange={handleImportJson}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 4. Extracted Persona Page (7 Memory Dimensions & Style Profiler) */}
        {page === 'extracted' && (
          <div id="persona-page-extracted" className="persona-page active" data-page="extracted">
            <div className="page-header">
              <button className="back-nav-btn" onClick={handleBackFromCreate} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'space-between' }}>
                <h3>{editingPersonaId ? 'Edit Persona' : 'Extracted Persona'}</h3>
                <button
                  id="btn-version-history"
                  className="btn-icon"
                  title="Version History"
                  aria-label="View version history"
                  onClick={() => navigateTo('version-history', 'extracted')}
                >
                  <span className="material-symbols-outlined">history</span>
                </button>
              </div>
            </div>

            {/* Source Prompt FAB */}
            {extractPromptInput && (
              <button
                id="source-prompt-fab"
                className="fab fab-source-prompt"
                title="View Source Prompt"
                onClick={() => setShowSourceModal(true)}
              >
                <span className="material-symbols-outlined">person</span>
              </button>
            )}

            <div className="extracted-page-content" style={{ paddingBottom: 16 }}>
              {/* Persona Name */}
              <div className="form-group persona-name-group">
                <label className="form-label">Persona Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="ext-name"
                  className="form-input"
                  placeholder="Enter persona name..."
                  value={createdName}
                  onChange={e => {
                    setCreatedName(e.target.value);
                    markFormDirty();
                  }}
                />
              </div>

              {/* Memory Layer Header */}
              <div className="section-header">
                <span className="material-symbols-outlined section-type-icon">psychology</span>
                <span>Memory Layer</span>
              </div>

              <div id="ext-memory-sections" className="memory-sections">
                {/* Persona Dimension */}
                <section className="accordion expanded" data-section="persona">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">person</span>
                        <span className="accordion-title">Persona</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      id="ext-synthesized-persona"
                      className="persona-textarea"
                      placeholder="Role and purpose description..."
                      rows={3}
                      value={createdRole}
                      onChange={e => {
                        setCreatedRole(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Persona"
                    />
                  </div>
                </section>

                {/* Context Dimension */}
                <section className="accordion expanded" data-section="context">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">menu_book</span>
                        <span className="accordion-title">Domain Context</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Domain background, scope, and libraries..."
                      rows={3}
                      value={createdContext}
                      onChange={e => {
                        setCreatedContext(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Context"
                    />
                  </div>
                </section>

                {/* Tone Dimension */}
                <section className="accordion expanded" data-section="tone">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">record_voice_over</span>
                        <span className="accordion-title">Tone & Style</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Stylistic voice, directness, and prohibited phrases..."
                      rows={2}
                      value={createdTone}
                      onChange={e => {
                        setCreatedTone(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Tone"
                    />
                  </div>
                </section>

                {/* Framework Dimension */}
                <section className="accordion expanded" data-section="framework">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">account_tree</span>
                        <span className="accordion-title">Framework & Methods</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Engineering paradigms, methodologies..."
                      rows={2}
                      value={createdFramework}
                      onChange={e => {
                        setCreatedFramework(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Framework"
                    />
                  </div>
                </section>

                {/* Constraints Dimension */}
                <section className="accordion expanded" data-section="constraints">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">gavel</span>
                        <span className="accordion-title">Constraints & Invariants</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Non-negotiable architectural invariants and safety rules..."
                      rows={2}
                      value={createdConstraints}
                      onChange={e => {
                        setCreatedConstraints(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Constraints"
                    />
                  </div>
                </section>

                {/* Output Format Dimension */}
                <section className="accordion expanded" data-section="format">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">code_blocks</span>
                        <span className="accordion-title">Output Format</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Output structure, diff formats, markdown preferences..."
                      rows={2}
                      value={createdFormat}
                      onChange={e => {
                        setCreatedFormat(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Output Format"
                    />
                  </div>
                </section>

                {/* Exemplar Dimension */}
                <section className="accordion expanded" data-section="exemplar">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="accordion-icon material-symbols-outlined">lightbulb</span>
                        <span className="accordion-title">Examples</span>
                      </div>
                      <span className="badge badge-auto">EXTRACTED</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Few-shot reference examples and golden snippets..."
                      rows={2}
                      value={createdExemplar}
                      onChange={e => {
                        setCreatedExemplar(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Examples"
                    />
                  </div>
                </section>

                {/* Extensions Dimension */}
                <section className="accordion expanded" data-section="injected_context">
                  <div className="accordion-header-wrapper">
                    <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="accordion-icon material-symbols-outlined">extension</span>
                      <span className="accordion-title">Extensions</span>
                    </div>
                  </div>
                  <div className="accordion-content">
                    <ExpandableTextarea
                      className="persona-textarea"
                      placeholder="Add custom injected context or session parameters..."
                      rows={2}
                      value={createdInjectedContext}
                      onChange={e => {
                        setCreatedInjectedContext(e.target.value);
                        markFormDirty();
                      }}
                      title="Expand Extensions"
                    />
                  </div>
                </section>
              </div>

              {/* Metadata Details Section */}
              <div className="section-header" style={{ marginTop: 16 }}>
                <span className="material-symbols-outlined section-type-icon">info</span>
                <span>Metadata Details</span>
              </div>

              <div id="ext-metadata-details" className="metadata-details-section">
                {/* Domain Chips */}
                <div className="field-group">
                  <span className="field-label">Domain <span className="required">*</span></span>
                  <div className="filter-chip-group ext-chip-group" data-field="domain">
                    {['Tech', 'Creative', 'Business', 'Education', 'Health', 'Lifestyle', 'Other'].map(dom => (
                      <button
                        key={dom}
                        type="button"
                        className={`filter-chip ${selectedDomain === dom ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedDomain(dom);
                          markFormDirty();
                        }}
                      >
                        {dom}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Granular Style Profiler */}
                <div className="metadata-row" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <div className="form-group compact" style={{ flex: 1 }}>
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

                  <div className="form-group compact" style={{ flex: 1 }}>
                    <label className="form-label">Technical Level</label>
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

                  <div className="form-group compact" style={{ flex: 1 }}>
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

                {/* Style Traits Manager */}
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">Style Traits</label>
                  <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {editTraits.map(trait => (
                      <span key={trait} className="tag">
                        <span>{trait}</span>
                        <button type="button" className="tag-remove" onClick={() => handleRemoveTrait(trait)}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Add custom trait..."
                      value={newTraitInput}
                      onChange={e => setNewTraitInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTrait();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-secondary btn-small" onClick={handleAddTrait}>
                      Add
                    </button>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="field-group visibility-section" style={{ marginTop: 16 }}>
                  <span className="field-label">Visibility</span>
                  <div className="filter-chip-group ext-chip-group compact visibility-chips">
                    <button
                      id="ext-visibility-private"
                      className={`filter-chip visibility-chip ${visibilityMode === 'private' ? 'selected' : ''}`}
                      onClick={() => setVisibilityMode('private')}
                    >
                      <span className="material-symbols-outlined">lock</span>
                      <span>Private</span>
                    </button>
                    <button
                      id="ext-visibility-public"
                      className={`filter-chip visibility-chip ${visibilityMode === 'public' ? 'selected' : ''}`}
                      onClick={() => setVisibilityMode('public')}
                    >
                      <span className="material-symbols-outlined">public</span>
                      <span>Public</span>
                    </button>
                  </div>
                  <p className="help-text">Private personas are saved locally as drafts. Public personas are published to the community.</p>
                </div>

                {/* Status Messages */}
                {publishStatus && (
                  <div className="badge badge-auto" style={{ marginTop: 12, padding: '6px 12px', background: 'var(--color-accent-container)', color: 'var(--color-accent)', width: '100%', textAlign: 'center' }}>
                    {publishStatus}
                  </div>
                )}
                {saveStatus && (
                  <div className="badge badge-auto" style={{ marginTop: 12, padding: '6px 12px', background: 'var(--color-success)', color: '#041e49', width: '100%', textAlign: 'center' }}>
                    {saveStatus}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. Saved Prompts Page (Child of My Personas) */}
        {page === 'prompts' && (
          <div id="persona-page-prompts" className="persona-page active" data-page="prompts">
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => navigateTo('my-personas', 'browse')} title="Back to My Personas">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Saved Prompts</h3>
            </div>

            <div className="search-container" style={{ margin: '8px 0' }}>
              <div className="search-input-wrapper">
                <span className="material-symbols-outlined search-icon">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Filter prompt templates..."
                  value={promptSearch}
                  onChange={e => setPromptSearch(e.target.value)}
                />
              </div>
            </div>

            <div id="saved-prompts-list" className="persona-list">
              {filteredPrompts.length > 0 ? (
                filteredPrompts.map(p => (
                  <div key={p.id} className="persona-item">
                    <div className="persona-item-info">
                      <div className="persona-item-name">{p.title}</div>
                      <div className="persona-item-meta">
                        <span className="status-chip private">{p.category || 'General'}</span>
                        <span className="keywords-text">{p.content.slice(0, 100)}...</span>
                      </div>
                    </div>
                    <div className="persona-item-actions">
                      <button className="btn-icon" title="Preview & Interpolate" onClick={() => setPreviewPrompt(p)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Copy Prompt"
                        onClick={() => {
                          navigator.clipboard.writeText(p.content);
                          alert('Prompt copied to clipboard!');
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Delete Prompt"
                        onClick={async () => {
                          await deleteSavedPrompt(p.id);
                          setPrompts(prev => prev.filter(item => item.id !== p.id));
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-error)' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <span className="material-symbols-outlined">description</span>
                  <p>No saved prompts found.</p>
                </div>
              )}
            </div>

            {/* FAB: Add Prompt */}
            <button
              id="add-prompt-fab"
              className="fab fab-bottom-right"
              title="Save Prompt"
              onClick={() => navigateTo('add-prompt', 'prompts')}
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>
        )}

        {/* 6. Add Prompt Page (Child of Saved Prompts) */}
        {page === 'add-prompt' && (
          <div id="persona-page-add-prompt" className="persona-page active" data-page="add-prompt">
            <div className="page-header">
              <button className="back-nav-btn" onClick={() => navigateTo('prompts', 'my-personas')} title="Back to Prompts">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Add Prompt</h3>
            </div>

            <div className="create-page-content">
              <div className="create-form">
                <div className="form-group">
                  <label className="form-label">Prompt Title</label>
                  <input
                    type="text"
                    id="add-prompt-title"
                    className="form-input"
                    placeholder="e.g. Clean Architecture Review"
                    value={newPromptTitle}
                    onChange={e => setNewPromptTitle(e.target.value)}
                  />
                </div>

                <label className="form-label">Prompt Content</label>
                <p className="help-text">Paste a prompt template (use {'{{variable}}'} for dynamic placeholders).</p>
                <ExpandableTextarea
                  id="add-prompt-content"
                  className="persona-textarea"
                  placeholder="Paste your prompt template here..."
                  rows={8}
                  value={newPromptContent}
                  onChange={e => setNewPromptContent(e.target.value)}
                  title="Expand Prompt Content"
                />

                <div className="divider-or">
                  <span>or</span>
                </div>

                <label
                  id="btn-import-prompt"
                  className="btn btn-secondary btn-full"
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  <span className="material-symbols-outlined">upload</span>
                  <span>Import from File</span>
                  <input
                    type="file"
                    id="import-prompt-file"
                    accept=".json,.txt,.xml,.md"
                    onChange={handleImportPromptFile}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 7. Persona Detail Page (Child of Browse or My Personas) */}
        {page === 'detail' && selectedPersonaId && personas[selectedPersonaId] && (
          <div id="persona-page-detail" className="persona-page active" data-page="detail">
            <div className="page-header">
              <button className="back-nav-btn" onClick={handlePopPage} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3 id="detail-persona-name">
                {personas[selectedPersonaId]?.metadata?.suggested_name || selectedPersonaId}
              </h3>
            </div>

            <div id="persona-detail-content" className="persona-detail-content" style={{ padding: '16px 0', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                <span className="status-chip private">{personas[selectedPersonaId]?.metadata?.domain?.toUpperCase() || 'TECH'}</span>
                <span className="version-badge">v{personas[selectedPersonaId]?.metadata?.version || '1.0.0'}</span>
              </div>

              <div className="detail-section" style={{ marginBottom: 16 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Core Role & Background</h4>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-primary)', lineHeight: '1.4' }}>
                  {personas[selectedPersonaId]?.persona?.instruction || 'No persona instruction set.'}
                </p>
              </div>

              {personas[selectedPersonaId]?.context?.instruction && (
                <div className="detail-section" style={{ marginBottom: 16 }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Domain Context</h4>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: '1.4' }}>
                    {personas[selectedPersonaId]?.context?.instruction}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    onSelectActive(selectedPersonaId);
                    navigateTo('browse');
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
                    setPublishStatus(res.mode === 'cloud' ? '✓ Published to Community!' : '✓ Saved as Local Draft');
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
                  <span>Report Persona</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ color: 'var(--color-error)' }}
                  onClick={() => {
                    onDeletePersona(selectedPersonaId);
                    navigateTo('browse');
                  }}
                >
                  <span className="material-symbols-outlined">delete</span>
                  <span>Delete Persona</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 8. Version History Page (Author-Only, Child of Extracted) */}
        {page === 'version-history' && (
          <div id="persona-page-version-history" className="persona-page active" data-page="version-history">
            <div className="page-header">
              <button className="back-nav-btn" onClick={handlePopPage} title="Back">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h3>Version History</h3>
              <button
                id="btn-export-persona"
                className="btn-icon"
                title="Export JSON"
                onClick={() => handleExportJson(editingPersonaId || activeId)}
              >
                <span className="material-symbols-outlined">download</span>
              </button>
            </div>

            <div className="version-history-content" style={{ padding: '16px 0', overflowY: 'auto' }}>
              <div className="version-persona-name" id="version-persona-name" style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
                {createdName || personas[editingPersonaId || activeId]?.metadata?.suggested_name || 'Persona'}
              </div>

              <div id="version-list" className="version-list" role="list">
                {versions.map((ver, idx) => (
                  <div key={idx} className="persona-item" style={{ marginBottom: 8, flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                      <span className="version-badge" style={{ fontWeight: 600 }}>{ver.version}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{ver.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{ver.changes}</div>
                    <button
                      className="btn btn-secondary btn-small"
                      style={{ marginTop: 6 }}
                      onClick={() => alert(`Rolled back to ${ver.version}`)}
                    >
                      Restore this version
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Action Button (FAB) matching legacy #persona-fab */}
      {showFab && (
        <button
          id="persona-fab"
          className="fab"
          title="Create new persona"
          onClick={handleStartCreate}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      )}

      {/* Persona Footer - Fixed panel at bottom matching legacy #persona-footer */}
      {showFooter && (
        <footer id="persona-footer" className="panel-footer">
          {page === 'browse' && (
            <button
              id="my-personas-btn"
              className="btn btn-primary btn-large btn-with-spinner footer-btn-browse"
              onClick={() => navigateTo('my-personas', 'browse')}
            >
              <span className="btn-content">
                <span className="material-symbols-outlined">emoji_people</span> My Personas
              </span>
            </button>
          )}
          {page === 'create' && (
            <button
              id="extract-btn"
              className="btn btn-primary btn-large btn-full btn-with-spinner footer-btn-create"
              onClick={handleExtractFromPrompt}
            >
              <span className="btn-content">
                <span className="material-symbols-outlined">chip_extraction</span> Extract Persona
              </span>
            </button>
          )}
          {page === 'extracted' && (
            <button
              id="ext-publish-btn"
              className="btn btn-primary btn-large btn-full btn-with-spinner footer-btn-extracted"
              onClick={handleCreate}
            >
              <span className="btn-content">
                <span className="material-symbols-outlined">publish</span> Publish
              </span>
            </button>
          )}
          {page === 'my-personas' && (
            <button
              id="prompts-btn"
              className="btn btn-primary btn-large btn-full footer-btn-my-personas"
              onClick={() => navigateTo('prompts', 'my-personas')}
            >
              <span className="material-symbols-outlined">description</span> Prompts
            </button>
          )}
          {page === 'add-prompt' && (
            <button
              id="save-prompt-btn"
              className="btn btn-primary btn-large btn-full btn-with-spinner footer-btn-add-prompt"
              onClick={handleSaveNewPrompt}
            >
              <span className="btn-content">
                <span className="material-symbols-outlined">save</span> Save Prompt
              </span>
            </button>
          )}
        </footer>
      )}

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

      {/* Source Prompt Modal */}
      {showSourceModal && (
        <div className="dialog-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dialog-container" style={{ background: 'var(--color-surface, #1e1f20)', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%', border: '1px solid var(--color-outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-accent)', fontSize: 24 }}>person</span>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-text-primary)' }}>Original Source Prompt</h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: '1.4', maxHeight: 240, overflowY: 'auto', background: 'var(--color-surface-container)', padding: 12, borderRadius: 8 }}>
              {extractPromptInput || 'No prompt was pasted.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary btn-small" onClick={() => setShowSourceModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedModal && (
        <div className="dialog-overlay" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="dialog-container" style={{ background: 'var(--color-surface, #1e1f20)', borderRadius: 16, padding: 24, maxWidth: 360, width: '90%', border: '1px solid var(--color-outline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ color: '#F9A825', fontSize: 28 }}>warning</span>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>Unsaved Changes</h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
              You have unsaved changes in this persona. What would you like to do?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                id="btn-unsaved-save"
                className="btn btn-primary"
                onClick={() => {
                  handleCreate();
                  setShowUnsavedModal(false);
                }}
              >
                Save & Leave
              </button>
              <button
                id="btn-unsaved-discard"
                className="btn btn-secondary"
                onClick={() => {
                  resetFormDirty();
                  setShowUnsavedModal(false);
                  navigateTo('browse');
                }}
              >
                Discard Changes
              </button>
              <button
                id="btn-unsaved-cancel"
                className="btn btn-secondary"
                onClick={() => setShowUnsavedModal(false)}
              >
                Keep Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="dialog-overlay active"
          onClick={() => setDeleteConfirmId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            className="dialog-container"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--color-surface, #1e1f20)',
              color: 'var(--color-text-primary, #fff)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 360,
              width: '100%',
              border: '1px solid var(--color-outline, #333)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-error, #ea4335)', fontSize: 28 }}>warning</span>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--color-text-primary)' }}>Delete Persona</h3>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
              Are you sure you want to delete <strong>{personas[deleteConfirmId]?.metadata?.suggested_name || deleteConfirmId}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: 'var(--color-error, #ea4335)', borderColor: 'var(--color-error, #ea4335)' }}
                onClick={() => {
                  onDeletePersona(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
