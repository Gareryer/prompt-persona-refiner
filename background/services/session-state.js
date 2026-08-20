/**
 * @fileoverview Session State & Lifecycle Resilience Manager
 * @module background/services/session-state
 */

export const activeRefinements = new Map();
export const activeExtractions = new Map();
export const RECENT_FOCUS_REFRESH_INTERVAL = 5;

export async function getRefinementCounter() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    const res = await chrome.storage.session.get('refinementCounter');
    return res.refinementCounter || 0;
  }
  return 0;
}

export async function incrementRefinementCounter() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    const current = await getRefinementCounter();
    const next = current + 1;
    await chrome.storage.session.set({ refinementCounter: next });
    return next;
  }
  return 1;
}

export async function resetRefinementCounter() {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    await chrome.storage.session.set({ refinementCounter: 0 });
  }
}
