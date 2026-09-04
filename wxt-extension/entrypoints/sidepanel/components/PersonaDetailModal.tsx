import React from 'react';
import type { PersonaV4 } from '../../../src/core/memory/schemas';

export interface PersonaDetailModalProps {
  isOpen: boolean;
  persona: PersonaV4 | null;
  personaId: string | null;
  onClose: () => void;
  onImport?: (id: string, persona: PersonaV4) => void;
  onReport?: (id: string, name: string) => void;
  onExport?: (id: string) => void;
}

export const PersonaDetailModal: React.FC<PersonaDetailModalProps> = ({
  isOpen,
  persona,
  personaId,
  onClose,
  onImport,
  onReport,
  onExport
}) => {
  if (!isOpen || !persona || !personaId) return null;

  const metadata = persona.metadata || {};
  const name = metadata.suggested_name || personaId;
  const rating = metadata.rating ?? 4.8;
  const raterCount = metadata.rating_count ?? 12;
  const downloads = metadata.downloads ?? 45;
  const domain = metadata.domain || 'Tech';
  const author = metadata.author || 'Community Member';
  const targetModel = metadata.target_model || 'Gemini 2.0 Flash / Pro';

  return (
    <div className="persona-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2>{name}</h2>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: -12, marginBottom: 16 }}>
          By {author} · ID: {personaId}
        </div>

        {/* Content */}
        <div style={{ padding: '0 0 16px 0', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stats Bar */}
          <div className="modal-stats">
            <div className="stat">
              <div className="stat-value">
                {rating} <span className="material-symbols-outlined">star</span>
              </div>
              <div className="stat-label">{raterCount} ratings</div>
            </div>
            <div className="stat">
              <div className="stat-value">{downloads}</div>
              <div className="stat-label">Imports</div>
            </div>
            <div className="stat">
              <div className="stat-value">v{metadata.version || '1.0'}</div>
              <div className="stat-label">{domain.toUpperCase()}</div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-secondary, #aaa)' }}>
            Optimized for: <strong style={{ color: 'var(--color-text-primary, #fff)' }}>{targetModel}</strong>
          </div>

          {/* Dimension Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Persona Role */}
            <div className="card" style={{ padding: 10, background: 'var(--color-surface-container-low, #222)', borderRadius: 6, border: '1px solid var(--color-outline, #333)' }}>
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent, #8ab4f8)', marginBottom: 4 }}>Role & Identity</div>
              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                {persona.persona?.instruction || 'No instruction defined.'}
              </p>
            </div>

            {/* Context & Scope */}
            {persona.context?.instruction && (
              <div className="card" style={{ padding: 10, background: 'var(--color-surface-container-low, #222)', borderRadius: 6, border: '1px solid var(--color-outline, #333)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent, #8ab4f8)', marginBottom: 4 }}>Domain Knowledge & Scope</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{persona.context.instruction}</p>
                {persona.context.metadata?.scope_tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {persona.context.metadata.scope_tags.map((t: string) => (
                      <span key={t} className="badge" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tone & Style */}
            {persona.tone?.instruction && (
              <div className="card" style={{ padding: 10, background: 'var(--color-surface-container-low, #222)', borderRadius: 6, border: '1px solid var(--color-outline, #333)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent, #8ab4f8)', marginBottom: 4 }}>Tone & Communication Style</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{persona.tone.instruction}</p>
                {persona.tone.metadata?.style_tags && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {persona.tone.metadata.style_tags.map((st: string) => (
                      <span key={st} className="badge" style={{ fontSize: 10 }}>{st}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Framework */}
            {persona.framework?.instruction && (
              <div className="card" style={{ padding: 10, background: 'var(--color-surface-container-low, #222)', borderRadius: 6, border: '1px solid var(--color-outline, #333)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent, #8ab4f8)', marginBottom: 4 }}>Reasoning Framework</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{persona.framework.instruction}</p>
              </div>
            )}

            {/* Constraints */}
            {persona.constraints?.instruction && (
              <div className="card" style={{ padding: 10, background: 'var(--color-surface-container-low, #222)', borderRadius: 6, border: '1px solid var(--color-outline, #333)' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--color-accent, #8ab4f8)', marginBottom: 4 }}>Invariants & Constraints</div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{persona.constraints.instruction}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-outline, #333)' }}>
          <div>
            {onReport && (
              <button
                className="btn-icon"
                title="Report this community persona"
                onClick={() => onReport(personaId, name)}
                style={{ color: 'var(--color-error, #ea4335)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>flag</span>
              </button>
            )}
            {onExport && (
              <button
                className="btn-icon"
                title="Export persona JSON"
                onClick={() => onExport(personaId)}
                style={{ marginLeft: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            {onImport && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  onImport(personaId, persona);
                  onClose();
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                <span>Import to My Personas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
