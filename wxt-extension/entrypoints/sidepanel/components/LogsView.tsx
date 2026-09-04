import React, { useState } from 'react';

export interface LogItem {
  time: string;
  level: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component?: string;
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
      <div className="logs-page">
        <div className="log-page-header">
          <h2>System Logs ({filteredLogs.length})</h2>
          <div className="log-controls">
            <select
              className="log-level-select"
              value={filterLevel}
              onChange={e => setFilterLevel(e.target.value)}
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

        <div className="log-viewer">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((l, i) => (
              <div key={i} className="log-entry">
                <span className="log-time">[{l.time}]</span>
                <span className={`log-level log-level-${l.level}`}>{l.level}</span>
                {l.component && <span className="log-component">[{l.component}]</span>}
                <span className="log-message" title={l.msg}>{l.msg}</span>
              </div>
            ))
          ) : (
            <div className="log-empty">
              No logs recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
