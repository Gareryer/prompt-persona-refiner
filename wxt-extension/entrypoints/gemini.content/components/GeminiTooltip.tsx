import React, { useState, useRef, useEffect } from 'react';

export interface GeminiTooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

export const GeminiTooltip: React.FC<GeminiTooltipProps> = ({
  text,
  children,
  position = 'top',
  delayMs = 250
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  const handleShow = () => {
    clearTimer();
    if (delayMs <= 0) {
      setIsVisible(true);
    } else {
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delayMs);
    }
  };

  const handleHide = () => {
    clearTimer();
    setIsVisible(false);
  };

  const handleFocus = (e: React.FocusEvent) => {
    const el = e.target as HTMLElement;
    if (el && typeof el.matches === 'function') {
      try {
        if (el.matches(':focus-visible')) {
          handleShow();
          return;
        }
      } catch {}
    }
  };

  const handleDismiss = () => {
    handleHide();
  };

  if (!text || !children) {
    return <>{children}</>;
  }

  return (
    <div
      className="allie-tooltip-container"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleFocus}
      onBlur={handleHide}
      onClick={handleDismiss}
      onPointerDown={handleDismiss}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`allie-tooltip-bubble allie-tooltip-${position}`}
          data-allie="tooltip"
        >
          {text}
        </div>
      )}
    </div>
  );
};
