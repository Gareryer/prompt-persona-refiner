import React, { useState } from 'react';
import { GeminiTooltip } from './GeminiTooltip';

export interface RefineToggleProps {
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  status?: 'idle' | 'loading' | 'success' | 'error';
  label?: string;
  tooltipText?: string;
}

export const RefineToggle: React.FC<RefineToggleProps> = ({
  enabled: controlledEnabled,
  onToggle,
  status = 'idle',
  label,
  tooltipText
}) => {
  const [internalEnabled, setInternalEnabled] = useState(true);
  const isControlled = controlledEnabled !== undefined;
  const isEnabled = isControlled ? controlledEnabled : internalEnabled;

  const performToggle = () => {
    const nextState = !isEnabled;
    if (!isControlled) {
      setInternalEnabled(nextState);
    }
    onToggle?.(nextState);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    performToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter' || e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      performToggle();
    }
  };

  const currentLabel = label || (status === 'loading' ? 'Refining...' : status === 'success' ? 'Refined' : 'Refine');
  const defaultTooltip = isEnabled
    ? 'Allie prompt refinement is active (Intercepts Enter / Send)'
    : 'Allie prompt refinement is disabled (Native send)';

  return (
    <div className="allie-toggle-wrapper">
      <GeminiTooltip text={tooltipText || defaultTooltip} position="top">
        <button
          type="button"
          className={`allie-toggle-button ${isEnabled ? 'active' : ''} ${status !== 'idle' ? `status-${status}` : ''}`}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          role="switch"
          aria-checked={isEnabled}
          aria-label="Toggle Allie prompt refinement"
          data-allie="refine-toggle"
        >
          <span className="allie-toggle-icon">✨</span>
          <span className="allie-toggle-label">{currentLabel}</span>
          <span className="allie-toggle-switch">
            <span className="allie-toggle-track">
              <span className="allie-toggle-knob" />
            </span>
          </span>
        </button>
      </GeminiTooltip>
    </div>
  );
};
