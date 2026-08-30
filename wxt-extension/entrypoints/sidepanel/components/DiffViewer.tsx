import React from 'react';

interface DiffViewerProps {
  original: string;
  refined: string;
  diffHtml: string;
  onInject: () => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  original,
  refined,
  diffHtml,
  onInject
}) => {
  return (
    <div className="card" style={{ marginTop: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span className="dimension-title" style={{ margin: 0 }}>Visual Diff & Refinement</span>
        <button
          className="btn btn-primary btn-small"
          onClick={onInject}
          title="Inject into active chatbot composer"
          style={{ padding: '4px 10px', fontSize: 12 }}
        >
          Inject to Chat ➔
        </button>
      </div>

      <div
        className="diff-preview"
        style={{
          background: 'var(--color-surface-container, #0e0e0e)',
          border: '1px solid var(--color-outline-variant, #3c4043)',
          borderRadius: 6,
          padding: 10,
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--color-text-primary)',
          maxHeight: 220,
          overflowY: 'auto'
        }}
        dangerouslySetInnerHTML={{ __html: diffHtml }}
      />
    </div>
  );
};
