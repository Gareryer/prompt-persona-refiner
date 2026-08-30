import React, { useState } from 'react';

export interface RefinerBadgeProps {
  onRefine: () => Promise<void>;
  shortcutKey?: string;
}

export const RefinerBadge: React.FC<RefinerBadgeProps> = ({
  onRefine,
  shortcutKey = 'Ctrl+Shift+R'
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setStatus('idle');
    try {
      await onRefine();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`refiner-badge-container ${loading ? 'loading' : ''}`}
      onClick={handleClick}
      title={`Refine prompt with active persona (${shortcutKey})`}
    >
      <span>✨</span>
      <span>{loading ? 'Refining...' : status === 'success' ? 'Refined!' : status === 'error' ? 'Failed' : 'Refine'}</span>
    </div>
  );
};
