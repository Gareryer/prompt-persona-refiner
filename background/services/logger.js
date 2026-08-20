/**
 * @fileoverview Structured Logger for Background Service Worker
 * @module background/services/logger
 */

export const bgLog = (level, msg, data = {}) => {
  const entry = { timestamp: Date.now(), level, message: msg, component: 'Background', ...data };
  console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
    '[' + new Date().toISOString().slice(11, 23) + '] [' + level.toUpperCase() + '] [Background] ' + msg,
    Object.keys(data).length > 0 ? data : ''
  );
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    chrome.storage.session.get('_bgLogs', (result) => {
      if (!result) return;
      const logs = result._bgLogs || [];
      logs.push(entry);
      if (logs.length > 500) logs.shift();
      chrome.storage.session.set({ _bgLogs: logs });
    });
  }
};
