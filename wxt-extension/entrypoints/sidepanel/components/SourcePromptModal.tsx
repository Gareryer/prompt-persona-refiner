import React, { useState, useEffect } from 'react';

export interface SourcePromptModalProps {
  isOpen: boolean;
  sourcePrompt: string;
  onClose: () => void;
  onRebuildFromSource?: () => Promise<void>;
}

export const SourcePromptModal: React.FC<SourcePromptModalProps> = ({
  isOpen,
  sourcePrompt,
  onClose,
  onRebuildFromSource
}) => {
  const [copied, setCopied] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sourcePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRebuild = async () => {
    if (!onRebuildFromSource) return;
    setIsRebuilding(true);
    try {
      await onRebuildFromSource();
      onClose();
    } finally {
      setIsRebuilding(false);
    }
  };

  const lineCount = (sourcePrompt.match(/\n/g) || []).length + 1;

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
          maxWidth: 600,
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
            <span className="material-symbols-outlined" style={{ color: 'var(--color-accent, #8ab4f8)' }}>data_object</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Original Source Conversation</h3>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close (Esc)">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #aaa)' }}>
              Raw text extracted from Gemini chat turn ({sourcePrompt.length} chars, {lineCount} lines):
            </span>
          </div>
          <textarea
            readOnly
            rows={14}
            value={sourcePrompt}
            style={{
              width: '100%',
              padding: 10,
              fontSize: 12,
              fontFamily: 'monospace',
              borderRadius: 8,
              border: '1px solid var(--color-outline, #444)',
              background: 'var(--color-surface-container, #141414)',
              color: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
              lineHeight: 1.5
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--color-outline, #333)' }}>
          <button
            className="btn btn-secondary"
            onClick={handleCopy}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
            <span>{copied ? 'Copied' : 'Copy Source'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isRebuilding}>
              Close
            </button>
            {onRebuildFromSource && (
              <button
                className={`btn btn-primary btn-with-spinner ${isRebuilding ? 'loading' : ''}`}
                onClick={handleRebuild}
                disabled={isRebuilding}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                <span>{isRebuilding ? 'Rebuilding...' : 'Rebuild from Source'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
