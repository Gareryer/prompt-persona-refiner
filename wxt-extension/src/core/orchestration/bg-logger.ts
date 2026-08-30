/**
 * @fileoverview Structured Logger for Background Service Worker with PII Redaction
 * Ported from background/services/logger.js
 * @module orchestration/bg-logger
 */

export function sanitizeData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    const json = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'string') {
        if (/api[_-]?key|token|secret|authorization|password/i.test(key)) {
          return '[REDACTED]';
        }
        return value
          .replace(/AIza[0-9A-Za-z-_]{30,}/g, 'AIza[REDACTED]')
          .replace(/sk-[0-9A-Za-z-_]{30,}/g, 'sk-[REDACTED]')
          .replace(/enc:v1:[A-Za-z0-9+/=]+/g, 'enc:v1:[REDACTED]');
      }
      return value;
    });
    return JSON.parse(json);
  } catch {
    return { sanitized: true };
  }
}

export interface BgLogEntry {
  timestamp: number;
  level: string;
  message: string;
  component: string;
  [key: string]: any;
}

export const bgLog = (level: 'error' | 'warn' | 'info' | 'debug', msg: string, data: Record<string, any> = {}): void => {
  const cleanData = sanitizeData(data);
  const entry: BgLogEntry = {
    timestamp: Date.now(),
    level,
    message: msg,
    component: 'Background',
    ...cleanData
  };

  const dataStr = Object.keys(cleanData).length > 0 ? ' ' + JSON.stringify(cleanData) : '';
  const prefix = '[' + new Date().toISOString().slice(11, 23) + '] [' + level.toUpperCase() + '] [Background] ';
  
  if (level === 'error') {
    console.error(prefix + msg + dataStr);
  } else if (level === 'warn') {
    console.warn(prefix + msg + dataStr);
  } else {
    console.log(prefix + msg + dataStr);
  }

  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    chrome.storage.session.get('_bgLogs', (result) => {
      if (!result) return;
      const logs = (result._bgLogs as BgLogEntry[]) || [];
      logs.push(entry);
      if (logs.length > 500) logs.shift();
      chrome.storage.session.set({ _bgLogs: logs }).catch?.(() => {});
    });
  }
};
