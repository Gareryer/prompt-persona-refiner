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

  // Extract variables enclosed in {{varName}} or {varName}
  const variableMatches = Array.from(new Set(
    Array.from(prompt.content.matchAll(/\{\{?([a-zA-Z0-9_]+)\}?\}/g)).map(m => m[1]!)
  ));
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Compute interpolated prompt text
  let interpolated = prompt.content;
  for (const v of variableMatches) {
    const val = varValues[v] !== undefined && varValues[v] !== '' ? varValues[v] : `{{${v}}}`;
    interpolated = interpolated.replaceAll(`{{${v}}}`, val).replaceAll(`{${v}}`, val);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(interpolated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy(interpolated);
  };

  const tokenEstimate = Math.ceil(interpolated.length / 4);

  return (
    <div className="persona-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2>{prompt.title}</h2>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: -12, marginBottom: 16 }}>
          Category: <span className="version-badge">{prompt.category}</span>
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
                      {`{{${v}}}`}:
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
                Formatted Output ({interpolated.length} chars · ~{tokenEstimate} tokens)
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
