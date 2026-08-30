import React from 'react';

interface ExpandModalProps {
  isOpen: boolean;
  title: string;
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
}

export const ExpandModal: React.FC<ExpandModalProps> = ({
  isOpen,
  title,
  value,
  onChange,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16
    }}>
      <div className="modal-content" style={{
        background: 'var(--color-surface, #1e1f20)',
        border: '1px solid var(--color-outline, #444746)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 600,
        height: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        padding: 16
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 16 }}>{title}</h3>
          <button className="btn-icon" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <textarea
          style={{
            flex: 1,
            width: '100%',
            boxSizing: 'border-box',
            background: 'var(--color-surface-container, #0e0e0e)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-outline-variant, #3c4043)',
            borderRadius: 8,
            padding: 12,
            fontFamily: 'inherit',
            fontSize: 14,
            lineHeight: 1.5,
            resize: 'none'
          }}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, gap: 8 }}>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
