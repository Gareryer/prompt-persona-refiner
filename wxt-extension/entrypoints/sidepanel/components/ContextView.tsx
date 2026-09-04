import React, { useState } from 'react';
import type { PersonaV4, DimensionId } from '../../../src/core/memory/schemas';
import { ComponentSchemas } from '../../../src/core/memory/component-schemas';
import { handleAddTag, handleRemoveTag } from '../../../src/core/sidepanel/tag-editor';

export interface ContextViewProps {
  activePersona: PersonaV4 | null;
  onUpdatePersona: (persona: PersonaV4) => void;
  onRebuild: () => Promise<void>;
  isRebuilding: boolean;
  lastUpdated: string;
  onOpenExpand: (title: string, value: string, onSave: (val: string) => void) => void;
  onOpenSourcePrompt?: () => void;
  onPinComponent?: (componentId: string, pinned: boolean) => void;
}

const DIMENSION_DEFS: Array<{
  id: DimensionId;
  title: string;
  icon: string;
  placeholder: string;
  emptyText: string;
}> = [
  {
    id: 'persona',
    title: 'Persona',
    icon: 'person',
    placeholder: 'Core role definition, background, and identity...',
    emptyText: 'No persona synthesized yet.'
  },
  {
    id: 'context',
    title: 'Domain Context',
    icon: 'domain',
    placeholder: 'Technical background, library versions, constraints...',
    emptyText: 'No domain context yet.'
  },
  {
    id: 'tone',
    title: 'Tone & Style',
    icon: 'record_voice_over',
    placeholder: 'Communication style, conciseness, formatting preferences...',
    emptyText: 'No tone profile yet.'
  },
  {
    id: 'framework',
    title: 'Framework & Methods',
    icon: 'account_tree',
    placeholder: 'Engineering paradigms, design patterns, testing strategies...',
    emptyText: 'No methodology defined.'
  },
  {
    id: 'constraints',
    title: 'Constraints & Rules',
    icon: 'gavel',
    placeholder: 'Non-negotiable architectural invariants and safety rules...',
    emptyText: 'No constraints defined.'
  },
  {
    id: 'format',
    title: 'Output Format',
    icon: 'code_blocks',
    placeholder: 'Output structure, code blocks, diff formats...',
    emptyText: 'No format preferences.'
  },
  {
    id: 'exemplar',
    title: 'Examples & Patterns',
    icon: 'lightbulb',
    placeholder: 'Few-shot reference examples and golden snippets...',
    emptyText: 'No examples captured.'
  }
];

export const ContextView: React.FC<ContextViewProps> = ({
  activePersona,
  onUpdatePersona,
  onRebuild,
  isRebuilding,
  lastUpdated,
  onOpenExpand,
  onOpenSourcePrompt,
  onPinComponent
}) => {
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({
    persona: true,
    context: false,
    tone: false,
    framework: false,
    constraints: false,
    format: false,
    exemplar: false,
    injected_context: false
  });

  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({
    persona: true,
    context: true,
    tone: true,
    framework: true,
    constraints: true,
    format: true,
    exemplar: true
  });

  const [injectedText, setInjectedText] = useState('');

  // Local inputs for custom tag fields
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  const toggleExpand = (id: string) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnabledMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleTogglePin = (dimId: DimensionId, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const nextPinned = !currentDim.pinned;
    const updated: PersonaV4 = {
      ...activePersona,
      [dimId]: {
        ...currentDim,
        pinned: nextPinned,
        pinnedData: nextPinned ? { ...currentDim } : undefined
      }
    };
    onUpdatePersona(updated);
    if (onPinComponent) {
      onPinComponent(dimId, nextPinned);
    }
  };

  const handleInstructionChange = (dimId: DimensionId, text: string) => {
    if (!activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const shouldAutoPin = !currentDim.pinned;
    const updated: PersonaV4 = {
      ...activePersona,
      [dimId]: {
        ...currentDim,
        instruction: text,
        pinned: shouldAutoPin ? true : currentDim.pinned,
        pinnedData: shouldAutoPin ? { ...currentDim, instruction: text } : currentDim.pinnedData
      }
    };
    onUpdatePersona(updated);
    if (shouldAutoPin && onPinComponent) {
      onPinComponent(dimId, true);
    }
  };

  const handleMetadataChange = (dimId: DimensionId, field: string, value: any) => {
    if (!activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const currentMeta = currentDim.metadata || {};
    const updated: PersonaV4 = {
      ...activePersona,
      [dimId]: {
        ...currentDim,
        metadata: {
          ...currentMeta,
          [field]: value
        }
      }
    };
    onUpdatePersona(updated);
  };

  const handleAddCustomTag = (dimId: DimensionId, field: string, inputKey: string) => {
    const text = (tagInputs[inputKey] || '').trim();
    if (!text || !activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const currentList: string[] = (currentDim.metadata?.[field] as string[]) || [];
    const nextList = handleAddTag(text, currentList);
    handleMetadataChange(dimId, field, nextList);
    setTagInputs(prev => ({ ...prev, [inputKey]: '' }));
  };

  const handleRemoveCustomTag = (dimId: DimensionId, field: string, tagToRemove: string) => {
    if (!activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const currentList: string[] = (currentDim.metadata?.[field] as string[]) || [];
    const nextList = handleRemoveTag(tagToRemove, currentList);
    handleMetadataChange(dimId, field, nextList);
  };

  const handleToggleMultiSelect = (dimId: DimensionId, field: string, option: string) => {
    if (!activePersona) return;
    const currentDim = activePersona[dimId] || { instruction: '' };
    const currentList: string[] = (currentDim.metadata?.[field] as string[]) || [];
    const nextList = currentList.includes(option)
      ? currentList.filter(item => item !== option)
      : [...currentList, option];
    handleMetadataChange(dimId, field, nextList);
  };

  return (
    <div id="tab-content-context" className="tab-content active">
      <div className="memory-sections">
        {/* Active Persona Header */}
        <section className="accordion accordion-static" data-section="active_persona_name">
          <div className="accordion-header-wrapper">
            <div className="accordion-header static" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="accordion-icon material-symbols-outlined">person</span>
              <span className="persona-name-text">
                {activePersona?.metadata?.suggested_name || 'Active Persona (Global)'}
              </span>
              <span className="badge" style={{ marginLeft: 'auto', fontSize: 10 }}>
                {activePersona?.metadata?.domain?.toUpperCase() || 'CORE V4'}
              </span>
              {onOpenSourcePrompt && (
                <button
                  className="btn btn-secondary btn-small"
                  title="View Original Source Prompt & Rebuild"
                  onClick={onOpenSourcePrompt}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', fontSize: 11 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>code</span>
                  <span>Source</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* 7-Dimension Accordion Cards */}
        {DIMENSION_DEFS.map(dim => {
          const isExpanded = Boolean(expandedMap[dim.id]);
          const isEnabled = enabledMap[dim.id] !== false;
          const currentDim = activePersona?.[dim.id];
          const val = currentDim?.instruction || '';
          const isPinned = Boolean(currentDim?.pinned);
          const metadata = currentDim?.metadata || {};

          return (
            <section key={dim.id} className={`accordion ${isExpanded ? 'expanded' : ''}`} data-section={dim.id}>
              <button
                className="accordion-header"
                aria-expanded={isExpanded}
                onClick={() => toggleExpand(dim.id)}
              >
                <span
                  className="accordion-icon material-symbols-outlined"
                  style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  chevron_right
                </span>
                <span className="accordion-title">{dim.title}</span>
                <div className="header-controls">
                  <span
                    className={`pin-toggle ${isPinned ? 'active' : ''}`}
                    title={isPinned ? 'Dimension locked as verbatim' : 'Pin dimension'}
                    onClick={(e) => handleTogglePin(dim.id, e)}
                  >
                    <span className="material-symbols-outlined">push_pin</span>
                  </span>
                </div>
                <label className="toggle-switch" onClick={(e) => toggleEnabled(dim.id, e)}>
                  <input type="checkbox" checked={isEnabled} readOnly />
                  <span className="toggle-slider"></span>
                </label>
              </button>

              {isExpanded && (
                <div className="accordion-content">
                  {/* Textarea Container */}
                  <div className="textarea-container">
                    <textarea
                      id={`v4-${dim.id}-textarea`}
                      className="persona-textarea"
                      placeholder={dim.placeholder}
                      rows={3}
                      value={val}
                      onChange={e => handleInstructionChange(dim.id, e.target.value)}
                    />
                    <button
                      className="expand-btn"
                      title="Expand Fullscreen"
                      onClick={() => onOpenExpand(dim.title, val, (newVal) => handleInstructionChange(dim.id, newVal))}
                    >
                      <span className="material-symbols-outlined">expand_content</span>
                    </button>
                  </div>

                  {/* Verbatim In-Section Controls */}
                  <div className="verbatim-controls">
                    <span
                      className={`badge verbatim ${isPinned ? '' : 'hidden'}`}
                      id={`verbatim-badge-${dim.id}`}
                      title="Locked as verbatim: protected from automated extraction overrides"
                      onClick={() => handleTogglePin(dim.id)}
                    >
                      <span className="material-symbols-outlined badge-pin-icon">push_pin</span>
                      VERBATIM
                    </span>
                    <label className="toggle-switch verbatim-switch" title="Toggle verbatim protection">
                      <input
                        type="checkbox"
                        checked={isPinned}
                        onChange={() => handleTogglePin(dim.id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  {/* Dimension-Specific Interactive Metadata Controls */}
                  {dim.id === 'context' && (
                    <div className="dimension-metadata-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {/* Domain: Single-Select Chips */}
                      <div className="v4-chip-group single-select">
                        <label className="chip-group-label">Domain</label>
                        <div className="chips-container">
                          {ComponentSchemas.enums.domain.map(d => {
                            const isSelected = metadata.domain === d;
                            return (
                              <button
                                key={d}
                                type="button"
                                className={`v4-chip preset ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleMetadataChange('context', 'domain', d)}
                              >
                                {d}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Scope Tags: Multi-Select with Custom Entry */}
                      <div className="v4-chip-group multi-select">
                        <label className="chip-group-label">Scope Boundaries</label>
                        <div className="chips-container">
                          {((metadata.scope_tags as string[]) || []).map(tag => (
                            <span key={tag} className="v4-chip custom selected">
                              {tag}
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={() => handleRemoveCustomTag('context', 'scope_tags', tag)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              className="chip-input"
                              placeholder="+ Add scope tag"
                              value={tagInputs['scope_tags'] || ''}
                              onChange={e => setTagInputs({ ...tagInputs, scope_tags: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleAddCustomTag('context', 'scope_tags', 'scope_tags')}
                            />
                            <button
                              type="button"
                              className="chip-add-btn"
                              title="Add tag"
                              onClick={() => handleAddCustomTag('context', 'scope_tags', 'scope_tags')}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dim.id === 'tone' && (
                    <div className="dimension-metadata-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {/* Style Tags: Multi-Select from Enums */}
                      <div className="v4-chip-group multi-select">
                        <label className="chip-group-label">Style Descriptors</label>
                        <div className="chips-container">
                          {ComponentSchemas.enums.style.map(st => {
                            const isSelected = ((metadata.style_tags as string[]) || []).includes(st);
                            return (
                              <button
                                key={st}
                                type="button"
                                className={`v4-chip preset ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleToggleMultiSelect('tone', 'style_tags', st)}
                              >
                                {st}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Banned Phrases: Custom Tags */}
                      <div className="v4-chip-group multi-select">
                        <label className="chip-group-label">Banned Phrases</label>
                        <div className="chips-container">
                          {((metadata.banned_phrases as string[]) || []).map(phrase => (
                            <span key={phrase} className="v4-chip custom selected" style={{ background: 'var(--color-error-container, #fce8e6)', color: 'var(--color-error, #d93025)' }}>
                              {phrase}
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={() => handleRemoveCustomTag('tone', 'banned_phrases', phrase)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              className="chip-input"
                              placeholder="+ Add banned phrase"
                              value={tagInputs['banned_phrases'] || ''}
                              onChange={e => setTagInputs({ ...tagInputs, banned_phrases: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleAddCustomTag('tone', 'banned_phrases', 'banned_phrases')}
                            />
                            <button
                              type="button"
                              className="chip-add-btn"
                              title="Add phrase"
                              onClick={() => handleAddCustomTag('tone', 'banned_phrases', 'banned_phrases')}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {dim.id === 'framework' && (
                    <div className="dimension-metadata-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {/* Reasoning Type: Single-Select Chips */}
                      <div className="v4-chip-group single-select">
                        <label className="chip-group-label">Reasoning Methodology</label>
                        <div className="chips-container">
                          {ComponentSchemas.enums.reasoning.map(r => {
                            const isSelected = metadata.reasoning_type === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                className={`v4-chip preset ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleMetadataChange('framework', 'reasoning_type', r)}
                              >
                                {r}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {dim.id === 'constraints' && (
                    <div className="dimension-metadata-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {/* Prohibitions: Custom Tags */}
                      <div className="v4-chip-group multi-select">
                        <label className="chip-group-label">Strict Prohibitions</label>
                        <div className="chips-container">
                          {((metadata.prohibitions as string[]) || []).map(p => (
                            <span key={p} className="v4-chip custom selected">
                              {p}
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={() => handleRemoveCustomTag('constraints', 'prohibitions', p)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              className="chip-input"
                              placeholder="+ Add prohibition"
                              value={tagInputs['prohibitions'] || ''}
                              onChange={e => setTagInputs({ ...tagInputs, prohibitions: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleAddCustomTag('constraints', 'prohibitions', 'prohibitions')}
                            />
                            <button
                              type="button"
                              className="chip-add-btn"
                              title="Add prohibition"
                              onClick={() => handleAddCustomTag('constraints', 'prohibitions', 'prohibitions')}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Requirements: Custom Tags */}
                      <div className="v4-chip-group multi-select">
                        <label className="chip-group-label">Mandatory Requirements</label>
                        <div className="chips-container">
                          {((metadata.requirements as string[]) || []).map(req => (
                            <span key={req} className="v4-chip custom selected">
                              {req}
                              <button
                                type="button"
                                className="chip-remove"
                                onClick={() => handleRemoveCustomTag('constraints', 'requirements', req)}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="text"
                              className="chip-input"
                              placeholder="+ Add requirement"
                              value={tagInputs['requirements'] || ''}
                              onChange={e => setTagInputs({ ...tagInputs, requirements: e.target.value })}
                              onKeyDown={e => e.key === 'Enter' && handleAddCustomTag('constraints', 'requirements', 'requirements')}
                            />
                            <button
                              type="button"
                              className="chip-add-btn"
                              title="Add requirement"
                              onClick={() => handleAddCustomTag('constraints', 'requirements', 'requirements')}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Response Length Input */}
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label className="chip-group-label">Response Length Limit</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="e.g. Max 500 words, Under 3 paragraphs"
                          value={(metadata.response_length as string) || ''}
                          onChange={e => handleMetadataChange('constraints', 'response_length', e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {dim.id === 'format' && (
                    <div className="dimension-metadata-group" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                      {/* Output Type: Single-Select Chips */}
                      <div className="v4-chip-group single-select">
                        <label className="chip-group-label">Target Output Format</label>
                        <div className="chips-container">
                          {ComponentSchemas.enums.outputType.map(ot => {
                            const isSelected = metadata.output_type === ot;
                            return (
                              <button
                                key={ot}
                                type="button"
                                className={`v4-chip preset ${isSelected ? 'selected' : ''}`}
                                onClick={() => handleMetadataChange('format', 'output_type', ot)}
                              >
                                {ot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {/* Custom Context Section */}
        <section className={`accordion ${expandedMap['injected_context'] ? 'expanded' : ''}`} data-section="injected_context">
          <button className="accordion-header" onClick={() => toggleExpand('injected_context')}>
            <span
              className="accordion-icon material-symbols-outlined"
              style={{ transform: expandedMap['injected_context'] ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            >
              chevron_right
            </span>
            <span className="accordion-title">Custom Injected Context</span>
          </button>
          {expandedMap['injected_context'] && (
            <div className="accordion-content">
              <p className="help-text" style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Inject session-specific parameters, active project paths, or execution instructions:
              </p>
              <div className="textarea-container">
                <textarea
                  className="context-textarea"
                  placeholder="e.g. 'Never write comments explaining obvious syntax. Always run 4-gate verification.'"
                  rows={3}
                  value={injectedText}
                  onChange={e => setInjectedText(e.target.value)}
                />
                <button
                  className="expand-btn"
                  title="Expand Fullscreen"
                  onClick={() => onOpenExpand('Custom Injected Context', injectedText, setInjectedText)}
                >
                  <span className="material-symbols-outlined">expand_content</span>
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Footer with Rebuild Button */}
      <footer id="context-footer" className="panel-footer">
        <button
          id="rebuild-memory"
          className={`btn btn-primary btn-large btn-with-spinner ${isRebuilding ? 'loading' : ''}`}
          onClick={onRebuild}
          disabled={isRebuilding}
        >
          <span className="btn-content">
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>{isRebuilding ? 'Rebuilding Memory...' : 'Rebuild Memory'}</span>
          </span>
        </button>
        <div className="footer-info">
          <span id="last-updated">Updated: {lastUpdated}</span>
          <span>v2.0.0</span>
        </div>
      </footer>
    </div>
  );
};
