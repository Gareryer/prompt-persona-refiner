import React, { useState, useRef, useEffect } from 'react';
import { ClaudeTooltip } from './ClaudeTooltip';

export interface ScraperToolbarProps {
  hasActivePersona?: boolean;
  onSettingsClick?: () => void;
  onExportClick?: () => Promise<void> | void;
  onSyncClick?: () => Promise<void> | void;
  initialExpanded?: boolean;
}

export const ScraperToolbar: React.FC<ScraperToolbarProps> = ({
  hasActivePersona = false,
  onSettingsClick,
  onExportClick,
  onSyncClick,
  initialExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Remain open when clicked until the user clicks outside the toolbar
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onSettingsClick) {
      onSettingsClick();
    } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      try {
        const res = chrome.runtime.sendMessage({ type: 'TOGGLE_SIDEPANEL' });
        if (res && typeof (res as any).catch === 'function') {
          (res as any).catch(() => {
            try { chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }); } catch {}
          });
        }
      } catch {
        try { chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }); } catch {}
      }
    }
  };

  const handleExportClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isExporting) return;
    setIsExporting(true);
    setExportSuccess(false);
    try {
      if (onExportClick) {
        await onExportClick();
      } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'HARVEST_EXPORT_ACTIVE_TAB' }, (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (res?.error) reject(new Error(res.error));
            else resolve();
          });
        });
      }
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.warn('[Allie Claude Toolbar] Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSyncClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      if (onSyncClick) {
        await onSyncClick();
      } else if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        await new Promise<void>((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'HARVEST_SYNC_ACTIVE_TAB' }, (res) => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else if (res?.error) reject(new Error(res.error));
            else resolve();
          });
        });
      }
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2500);
    } catch (err) {
      console.warn('[Allie Claude Toolbar] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const settingsTooltip = hasActivePersona
    ? 'Allie Settings & Personas (Active persona loaded)'
    : 'Allie Settings & Personas';

  return (
    <div
      ref={containerRef}
      className={`allie-scraper-toolbar-wrapper ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      data-allie="scraper-toolbar"
    >
      {!isExpanded ? (
        /* Collapsed State: Single Style 4 Standard Icon Button */
        <ClaudeTooltip text="Allie Harvester & Settings" position="top">
          <button
            type="button"
            className="allie-toolbar-btn allie-toolbar-trigger"
            onClick={handleTriggerClick}
            aria-label="Open Allie Toolbar"
            tabIndex={0}
          >
            <span className="allie-button-state-layer" />
            {/* More Vert 3 dots icon */}
            <svg
              className="allie-toolbar-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="18"
              height="18"
            >
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            <span className="allie-focus-indicator" />
            <span className="allie-touch-target" />
          </button>
        </ClaudeTooltip>
      ) : (
        /* Expanded State: Elevated Stadium Pill Capsule */
        <div className="allie-toolbar-pill" role="toolbar" aria-label="Allie Scraper Actions">
          {/* 1. Settings Button */}
          <ClaudeTooltip text={settingsTooltip} position="top">
            <button
              type="button"
              className="allie-toolbar-btn allie-settings-btn"
              onClick={handleSettingsClick}
              aria-label={settingsTooltip}
              data-allie="settings-button"
              tabIndex={0}
            >
              <span className="allie-button-state-layer" />
              {/* Gear SVG */}
              <svg
                className="allie-toolbar-icon allie-gear-icon"
                viewBox="0 0 256 256"
                fill="currentColor"
                width="18"
                height="18"
              >
                <path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,1.74,5.48l14.19,17.73a91.57,91.57,0,0,1-6.23,15L187,173.11a8,8,0,0,0-5.1,2.64,74.11,74.11,0,0,1-6.14,6.14,8,8,0,0,0-2.64,5.1l-2.51,22.58a91.32,91.32,0,0,1-15,6.23l-17.74-14.19a8,8,0,0,0-5-1.75h-.48a73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-5.48,1.74L100.45,215.8a91.57,91.57,0,0,1-15-6.23L82.89,187a8,8,0,0,0-2.64-5.1,74.11,74.11,0,0,1-6.14-6.14,8,8,0,0,0-5.1-2.64L46.43,170.6a91.32,91.32,0,0,1-6.23-15l14.19-17.74a8,8,0,0,0,1.74-5.48,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-1.74-5.48L40.2,100.45a91.57,91.57,0,0,1,6.23-15L69,82.89a8,8,0,0,0,5.1-2.64,74.11,74.11,0,0,1,6.14-6.14A8,8,0,0,0,82.89,69L85.4,46.43a91.32,91.32,0,0,1,15-6.23l17.74,14.19a8,8,0,0,0,5.48,1.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,5.48-1.74L155.55,40.2a91.57,91.57,0,0,1,15,6.23L173.11,69a8,8,0,0,0,2.64,5.1,74.11,74.11,0,0,1,6.14,6.14,8,8,0,0,0,5.1,2.64l22.58,2.51a91.32,91.32,0,0,1,6.23,15l-14.19,17.74A8,8,0,0,0,199.87,123.66Z" />
              </svg>
              {/* Active persona status indicator dot */}
              <span
                className={`allie-status-dot ${hasActivePersona ? 'active' : 'inactive'}`}
                aria-label={hasActivePersona ? 'Active persona loaded' : 'No persona loaded'}
              />
              <span className="allie-focus-indicator" />
              <span className="allie-touch-target" />
            </button>
          </ClaudeTooltip>

          {/* 2. Export / Download Button */}
          <ClaudeTooltip text={exportSuccess ? 'Export Complete!' : 'Export Chat (ZIP Archive)'} position="top">
            <button
              type="button"
              className={`allie-toolbar-btn allie-export-btn ${isExporting ? 'loading' : ''} ${exportSuccess ? 'success' : ''}`}
              onClick={handleExportClick}
              aria-label="Export Chat as ZIP Archive"
              data-allie="export-button"
              tabIndex={0}
              disabled={isExporting}
            >
              <span className="allie-button-state-layer" />
              {isExporting ? (
                <svg className="allie-toolbar-icon allie-spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : exportSuccess ? (
                <svg className="allie-toolbar-icon allie-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                /* Download Cloud / Arrow SVG */
                <svg className="allie-toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              <span className="allie-focus-indicator" />
              <span className="allie-touch-target" />
            </button>
          </ClaudeTooltip>

          {/* 3. Sync / Re-scrape Button */}
          <ClaudeTooltip text={syncSuccess ? 'Sync Complete!' : 'Sync & Re-scrape Chat to IndexedDB'} position="top">
            <button
              type="button"
              className={`allie-toolbar-btn allie-sync-btn ${isSyncing ? 'spinning' : ''} ${syncSuccess ? 'success' : ''}`}
              onClick={handleSyncClick}
              aria-label="Sync Chat to IndexedDB"
              data-allie="sync-button"
              tabIndex={0}
              disabled={isSyncing}
            >
              <span className="allie-button-state-layer" />
              {isSyncing ? (
                <svg className="allie-toolbar-icon allie-spinner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="32" strokeDashoffset="12" opacity="0.3"/>
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : syncSuccess ? (
                <svg className="allie-toolbar-icon allie-success-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                /* Sync Circular Arrows SVG */
                <svg className="allie-toolbar-icon allie-sync-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              )}
              <span className="allie-focus-indicator" />
              <span className="allie-touch-target" />
            </button>
          </ClaudeTooltip>

          {/* 4. Collapse Toggle Button */}
          <ClaudeTooltip text="Collapse Toolbar" position="top">
            <button
              type="button"
              className="allie-toolbar-btn allie-collapse-btn"
              onClick={handleTriggerClick}
              aria-label="Collapse Toolbar"
              tabIndex={0}
            >
              <span className="allie-button-state-layer" />
              <svg className="allie-toolbar-icon" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              <span className="allie-focus-indicator" />
              <span className="allie-touch-target" />
            </button>
          </ClaudeTooltip>
        </div>
      )}
    </div>
  );
};
