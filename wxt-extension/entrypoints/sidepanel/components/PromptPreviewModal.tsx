import React, { useState } from 'react';

export interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface PromptPreviewModalProps {
  isOpen: boolean;
  prompt: PromptTemplate | null;
  onClose: () => void;
  onCopy?: (interpolated: string) => void;
}

export const PromptPreviewModal: React.FC<PromptPreviewModalProps> = ({
  isOpen,
  prompt,
  onClose,
  onCopy
}) => {
  if (!isOpen || !prompt) return null;

  // Extract variables enclosed in {varName}
  const variableMatches = Array.from(new Set((prompt.content.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map(v => v.slice(1, -1))));
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Compute interpolated prompt text
  let interpolated = prompt.content;
  for (const v of variableMatches) {
    const val = varValues[v] ?? `{${v}}`;
    interpolated = interpolated.replaceAll(`{${v}}`, val);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(interpolated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy(interpolated);
  };

  return (
    <div
      className="modal-scrim active"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.65)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="modal-dialog"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-surface, #1e1e1e)',
          color: 'var(--color-text-primary, #ffffff)',
          borderRadius: 12,
          maxWidth: 480,
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--color-outline, #333)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent, #8ab4f8)' }}>preview</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{prompt.title}</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Variable substitution inputs */}
          {variableMatches.length > 0 && (
            <div style={{ background: 'var(--color-surface-container, #282828)', padding: 10, borderRadius: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary, #aaa)', display: 'block', marginBottom: 6 }}>
                Template Variables
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {variableMatches.map(v => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontFamily: 'monospace', minWidth: 80, color: 'var(--color-accent, #8ab4f8)' }}>
                      {`{${v}}`}:
                    </span>
                    <input
                      type="text"
                      placeholder={`Enter ${v}...`}
                      value={varValues[v] || ''}
                      onChange={e => setVarValues({ ...varValues, [v]: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1px solid var(--color-outline, #444)',
                        background: 'transparent',
                        color: 'inherit'
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interpolated Preview Area */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-secondary, #aaa)' }}>
                Formatted Output ({interpolated.length} chars)
              </label>
            </div>
            <textarea
              readOnly
              rows={8}
              value={interpolated}
              style={{
                width: '100%',
                padding: 10,
                fontSize: 12,
                fontFamily: 'monospace',
                borderRadius: 8,
                border: '1px solid var(--color-outline, #444)',
                background: 'var(--color-surface-container, #181818)',
                color: 'inherit',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-outline, #333)' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleCopy} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
