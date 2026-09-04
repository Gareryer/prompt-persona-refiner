import React, { useState, useEffect, useRef } from 'react';

export interface ExpandableTextareaProps {
  id?: string;
  className?: string;
  placeholder?: string;
  value: string;
  rows?: number;
  readOnly?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  title?: string;
}

/**
 * ExpandableTextarea: In-place fullscreen expansion matching Gemini & legacy extension.
 * When expanded, the container takes `.is-fullscreen` with fixed full-screen bounds,
 * the expand-btn moves to bottom: 40px, right: 36px, and the icon toggles to collapse_content.
 */
export const ExpandableTextarea: React.FC<ExpandableTextareaProps> = ({
  id,
  className = 'persona-textarea',
  placeholder,
  value,
  rows = 3,
  readOnly = false,
  onChange,
  onBlur,
  title = 'Expand Fullscreen'
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFullscreen(prev => {
      const next = !prev;
      if (next) {
        setTimeout(() => textareaRef.current?.focus(), 50);
      }
      return next;
    });
  };

  return (
    <div className={`textarea-container ${isFullscreen ? 'is-fullscreen' : ''}`}>
      <textarea
        ref={textareaRef}
        id={id}
        className={className}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
      />
      <button
        type="button"
        className="expand-btn"
        title={isFullscreen ? 'Collapse' : title}
        onClick={toggleFullscreen}
      >
        <span className="material-symbols-outlined">
          {isFullscreen ? 'collapse_content' : 'expand_content'}
        </span>
      </button>
    </div>
  );
};
