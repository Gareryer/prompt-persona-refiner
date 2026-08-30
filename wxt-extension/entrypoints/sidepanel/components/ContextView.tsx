import React, { useState } from 'react';
import type { PersonaV4, DimensionId } from '../../../src/core/memory/schemas';

export interface ContextViewProps {
  activePersona: PersonaV4 | null;
  onUpdatePersona: (persona: PersonaV4) => void;
  onRebuild: () => Promise<void>;
  isRebuilding: boolean;
  lastUpdated: string;
  onOpenExpand: (title: string, value: string, onSave: (val: string) => void) => void;
}

const DIMENSION_DEFS: Array<{
  id: DimensionId;
  title: string;
  icon: string;
  placeholder: string;
  emptyText: string;
  tags?: string[];
}> = [
  {
    id: 'persona',
    title: 'Persona',
    icon: 'person',
    placeholder: 'Core role definition, background, and identity...',
    emptyText: 'No persona synthesized yet.',
    tags: ['Role: Senior Architect', 'Purpose: Code Quality']
  },
  {
    id: 'context',
    title: 'Domain Context',
    icon: 'domain',
    placeholder: 'Technical background, library versions, constraints...',
    emptyText: 'No domain context yet.',
    tags: ['WXT Framework', 'React 19', 'TypeScript 5.9']
  },
  {
    id: 'tone',
    title: 'Tone & Style',
    icon: 'record_voice_over',
    placeholder: 'Communication style, conciseness, formatting preferences...',
    emptyText: 'No tone profile yet.',
    tags: ['Concise', 'Technical', 'Structured']
  },
  {
    id: 'framework',
    title: 'Framework & Methods',
    icon: 'account_tree',
    placeholder: 'Engineering paradigms, design patterns, testing strategies...',
    emptyText: 'No methodology defined.',
    tags: ['Strangler Fig', 'TDD', '5-Gate Verification']
  },
  {
    id: 'constraints',
    title: 'Constraints & Rules',
    icon: 'gavel',
    placeholder: 'Non-negotiable architectural invariants and safety rules...',
    emptyText: 'No constraints defined.',
    tags: ['Strict Typing', 'Zero CSS Bleed', 'Legacy Parity']
  },
  {
    id: 'format',
    title: 'Output Format',
    icon: 'code_blocks',
    placeholder: 'Output structure, code blocks, diff formats...',
    emptyText: 'No format preferences.',
    tags: ['Markdown', 'File Links', 'Clean Diff']
  },
  {
    id: 'exemplar',
    title: 'Examples & Patterns',
    icon: 'lightbulb',
    placeholder: 'Few-shot reference examples and golden snippets...',
    emptyText: 'No examples captured.',
    tags: ['Before/After Refactor', 'Unit Test Fixture']
  }
];

export const ContextView: React.FC<ContextViewProps> = ({
  activePersona,
  onUpdatePersona,
  onRebuild,
  isRebuilding,
  lastUpdated,
  onOpenExpand
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

  const [pinnedMap, setPinnedMap] = useState<Record<string, boolean>>({});
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

  const toggleExpand = (id: string) => {
    setExpandedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePinned = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPinnedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnabledMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleInstructionChange = (dim: DimensionId, text: string) => {
    if (!activePersona) return;
    const updated: PersonaV4 = {
      ...activePersona,
      [dim]: { ...activePersona[dim], instruction: text }
    };
    onUpdatePersona(updated);
  };

  return (
    <div id="tab-content-context" className="tab-content active">
      <div className="memory-sections">
        {/* Active Persona Header */}
        <section className="accordion accordion-static" data-section="active_persona_name">
          <div className="accordion-header-wrapper">
            <div className="accordion-header static">
              <span className="accordion-icon material-symbols-outlined">person</span>
              <span className="persona-name-text">
                {activePersona?.metadata?.suggested_name || 'Active Persona (Global)'}
              </span>
              <span className="badge" style={{ marginLeft: 'auto', fontSize: 10 }}>
                {activePersona?.metadata?.domain?.toUpperCase() || 'CORE V4'}
              </span>
            </div>
          </div>
        </section>

        {/* 7-Dimension Accordion Cards */}
        {DIMENSION_DEFS.map(dim => {
          const isExpanded = Boolean(expandedMap[dim.id]);
          const isPinned = Boolean(pinnedMap[dim.id]);
          const isEnabled = enabledMap[dim.id] !== false;
          const val = activePersona?.[dim.id]?.instruction || '';

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
                    title="Pin Dimension"
                    onClick={(e) => togglePinned(dim.id, e)}
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
                  <div className="textarea-container">
                    <textarea
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

                  {dim.tags && (
                    <div className="synthesis-metadata" style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {dim.tags.map((tag, idx) => (
                        <span key={idx} className="badge" style={{ fontSize: 10, opacity: 0.85 }}>{tag}</span>
                      ))}
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
            <span className="accordion-title">Custom Context</span>
          </button>
          {expandedMap['injected_context'] && (
            <div className="accordion-content">
              <p className="help-text">Inject session-specific rules or parameters:</p>
              <div className="textarea-container">
                <textarea
                  className="context-textarea"
                  placeholder="e.g. 'Never write comments explaining obvious syntax'"
                  rows={3}
                  value={injectedText}
                  onChange={e => setInjectedText(e.target.value)}
                />
                <button
                  className="expand-btn"
                  title="Expand"
                  onClick={() => onOpenExpand('Custom Context', injectedText, setInjectedText)}
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
