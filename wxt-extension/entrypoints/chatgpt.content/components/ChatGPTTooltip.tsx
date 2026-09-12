import React, { useState, useRef, useEffect } from 'react';

export interface ChatGPTTooltipProps {
  text: string;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  useFixed?: boolean;
}

export const ChatGPTTooltip: React.FC<ChatGPTTooltipProps> = ({
  text,
  children,
  position = 'top',
  delayMs = 200,
  useFixed = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [fixedCoords, setFixedCoords] = useState<{ top: number; left?: number; right?: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const updateCoordinates = () => {
    if (!useFixed || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const isNearRightEdge = rect.left + rect.width / 2 + 160 > windowWidth;

    if (position === 'bottom') {
      setFixedCoords({
        top: rect.bottom + 8,
        right: isNearRightEdge ? Math.max(8, windowWidth - rect.right) : undefined,
        left: !isNearRightEdge ? Math.max(12, rect.left + rect.width / 2) : undefined
      });
    } else {
      setFixedCoords({
        top: rect.top - 8,
        right: isNearRightEdge ? Math.max(8, windowWidth - rect.right) : undefined,
        left: !isNearRightEdge ? Math.max(12, rect.left + rect.width / 2) : undefined
      });
    }
  };

  const handleShow = () => {
    clearTimer();
    updateCoordinates();
    if (delayMs <= 0) {
      setIsVisible(true);
    } else {
      timerRef.current = setTimeout(() => {
        updateCoordinates();
        setIsVisible(true);
      }, delayMs);
    }
  };

  const handleHide = () => {
    clearTimer();
    setIsVisible(false);
  };

  if (!text || !children) {
    return <>{children}</>;
  }

  const fixedStyle: React.CSSProperties | undefined = useFixed && fixedCoords ? {
    position: 'fixed',
    top: `${fixedCoords.top}px`,
    ...(fixedCoords.right !== undefined ? { right: `${fixedCoords.right}px`, left: 'auto', transform: 'none' } : {}),
    ...(fixedCoords.left !== undefined ? { left: `${fixedCoords.left}px`, right: 'auto', transform: position === 'bottom' ? 'translateX(-50%)' : 'translate(-50%, -100%)' } : {}),
    maxWidth: 'min(360px, calc(100vw - 24px))',
    whiteSpace: 'normal',
    lineHeight: '1.3',
    zIndex: 999999
  } : undefined;

  return (
    <div
      ref={containerRef}
      className="allie-tooltip-container"
      onMouseEnter={handleShow}
      onMouseLeave={handleHide}
      onFocus={handleShow}
      onBlur={handleHide}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`allie-tooltip-bubble allie-tooltip-${position} ${useFixed ? 'allie-tooltip-fixed' : ''}`}
          style={fixedStyle}
          data-allie="tooltip"
        >
          {text}
        </div>
      )}
    </div>
  );
};
