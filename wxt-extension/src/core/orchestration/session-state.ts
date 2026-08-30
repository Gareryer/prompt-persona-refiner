/**
 * @fileoverview Session State & Lifecycle Resilience Manager
 * Ported from background/services/session-state.js
 * @module orchestration/session-state
 */

export const activeRefinements = new Map<number, AbortController>();
export const activeExtractions = new Map<string, AbortController>();
export const RECENT_FOCUS_REFRESH_INTERVAL = 5;

/**
 * Retrieves the current refinement counter stored in session storage.
 */
export async function getRefinementCounter(): Promise<number> {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    try {
      const res = await chrome.storage.session.get('refinementCounter');
      return (res.refinementCounter as number) || 0;
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Increments the refinement counter by 1 in session storage and returns the new value.
 */
export async function incrementRefinementCounter(): Promise<number> {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    try {
      const current = await getRefinementCounter();
      const next = current + 1;
      await chrome.storage.session.set({ refinementCounter: next });
      return next;
    } catch {
      return 1;
    }
  }
  return 1;
}

/**
 * Resets the refinement counter to 0 in session storage.
 */
export async function resetRefinementCounter(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
    try {
      await chrome.storage.session.set({ refinementCounter: 0 });
    } catch {
      // Ignore session storage errors
    }
  }
}
