import React, { useState } from 'react';

export interface LogItem {
  time: string;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  msg: string;
}

export interface LogsViewProps {
  logs: LogItem[];
  onClear: () => void;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onClear }) => {
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const filteredLogs = logs.filter(l => {
    if (filterLevel === 'ALL') return true;
    return l.level === filterLevel;
  });

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompt-assistant-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="tab-content-logs" className="tab-content active">
      <div className="logs-page-content">
        <div className="log-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, margin: 0 }}>System Logs ({filteredLogs.length})</h2>
          <div className="log-controls" style={{ display: 'flex', gap: 6 }}>
            <select
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
              style={{
                background: 'var(--color-surface, #1e1f20)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-outline)',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 12
              }}
            >
              <option value="ALL">ALL</option>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>
            <button className="btn btn-secondary btn-small" onClick={onClear}>Clear</button>
            <button className="btn btn-secondary btn-small" onClick={handleExport}>Export</button>
          </div>
        </div>

        <div className="log-viewer" style={{ minHeight: 320, maxHeight: 500, overflowY: 'auto' }}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((l, i) => (
              <div key={i} className="log-entry" style={{ padding: '6px 8px', borderBottom: '1px solid var(--color-divider)' }}>
                <span className="log-time" style={{ color: 'var(--color-text-tertiary)', marginRight: 6 }}>[{l.time}]</span>
                <span className={`badge badge-${l.level.toLowerCase()}`} style={{ marginRight: 6 }}>{l.level}</span>
                <span className="log-msg" style={{ color: 'var(--color-text-primary)', fontSize: 12 }}>{l.msg}</span>
              </div>
            ))
          ) : (
            <div className="log-empty" style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-tertiary)' }}>
              No logs recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
