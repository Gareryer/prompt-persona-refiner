import React, { useState } from 'react';

export interface ReportModalProps {
  isOpen: boolean;
  personaId: string | null;
  personaName: string;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => Promise<void>;
}

const REPORT_REASONS = [
  { id: 'spam', label: 'Spam or Advertising', desc: 'Promotional content, affiliate links, or deceptive descriptions' },
  { id: 'inappropriate', label: 'Inappropriate Content', desc: 'Sexually explicit, hateful, or abusive material' },
  { id: 'harmful', label: 'Harmful or Dangerous', desc: 'Malicious instructions, security bypasses, or safety violations' },
  { id: 'broken', label: 'Broken or Low Quality', desc: 'Fails to synthesize, invalid JSON schema, or corrupt prompts' },
  { id: 'other', label: 'Other Issue', desc: 'Any other policy or quality concern' }
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  personaId,
  personaName,
  onClose,
  onSubmit
}) => {
  const [selectedReason, setSelectedReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !personaId) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmit(selectedReason, details);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="persona-modal" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2>Report Persona</h2>

        {/* Content */}
        <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--color-surface-container, #282828)', padding: 10, borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary, #aaa)' }}>Reporting:</span>
            <div style={{ fontWeight: 600, fontSize: 14, marginTop: 2 }}>{personaName}</div>
            <div style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}>ID: {personaId}</div>
          </div>

          {errorMsg && (
            <div style={{ background: 'var(--color-error-container, #fce8e6)', color: 'var(--color-error, #d93025)', padding: 8, borderRadius: 6, fontSize: 12 }}>
              {errorMsg}
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, textTransform: 'uppercase', color: 'var(--color-text-secondary, #aaa)' }}>
              Reason for Report
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REPORT_REASONS.map(r => (
                <label
                  key={r.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: 8,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: selectedReason === r.id ? 'var(--color-surface-container-high, #333)' : 'transparent',
                    border: '1px solid',
                    borderColor: selectedReason === r.id ? 'var(--color-accent, #8ab4f8)' : 'var(--color-outline, #444)'
                  }}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r.id}
                    checked={selectedReason === r.id}
                    onChange={() => setSelectedReason(r.id)}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary, #aaa)', marginTop: 2 }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', color: 'var(--color-text-secondary, #aaa)' }}>
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide additional context or links..."
              value={details}
              onChange={e => setDetails(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid var(--color-outline, #444)',
                background: 'var(--color-surface-container, #181818)',
                color: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid var(--color-outline, #333)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{ background: 'var(--color-error, #ea4335)', borderColor: 'var(--color-error, #ea4335)' }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
};
