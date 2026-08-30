/**
 * @fileoverview Memory Orchestrator for Session Memory Management & V4 Refinement Context
 * @module background/services/memory-orchestrator
 */

import { bgLog } from './logger.js';

export async function getCurrentTabSessionId(targetTabId = null) {
  let tab = null;
  if (targetTabId) {
    try {
      tab = await chrome.tabs.get(targetTabId);
    } catch {
      // tab query fallback if get fails
    }
  }

  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  }

  if (!tab?.url?.includes('gemini.google.com')) return null;

  try {
    const url = new URL(tab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'app') {
      return pathParts[1];
    } else if (pathParts.length === 1 && pathParts[0] === 'app') {
      return 'new_chat';
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get memory data for a session
 */
export async function getSessionMemory(sessionId) {
  if (!sessionId) return null;

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] || null;
}

/**
 * Update a memory component
 */
export async function updateMemoryComponent(sessionId, componentId, data) {
  if (!sessionId || !componentId) return { success: false };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey] || { sessionId, components: {} };

  if (!memory.components[componentId]) {
    memory.components[componentId] = { history: [] };
  }

  // Add current to history if exists
  if (memory.components[componentId].current) {
    memory.components[componentId].history.push(memory.components[componentId].current);
  }

  // Set new current
  memory.components[componentId].current = data;
  memory.lastUpdated = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  return { success: true };
}

/**
 * Pin persona to prevent automatic updates
 */
export async function pinPersona(sessionId) {
  if (!sessionId) return { success: false, error: 'No session ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  let memory = result[storageKey];

  if (!memory) {
    memory = { sessionId, components: {}, currentGeneration: 0 };
  }
  if (!memory.components) {
    memory.components = {};
  }
  if (!memory.components.persona && !memory.components.persona_synthesizer) {
    memory.components.persona = { current: { instruction: '' } };
  }

  // Support both V4 'persona' and legacy 'persona_synthesizer' component names
  const personaComponent = memory.components.persona || memory.components.persona_synthesizer;
  if (!personaComponent.current) {
    personaComponent.current = { instruction: '' };
  }

  personaComponent.pinned = true;
  personaComponent.pinnedData = { ...personaComponent.current };
  personaComponent.pinnedAt = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', 'Persona pinned', { sessionId });
  return { success: true };
}

/**
 * Unpin persona to allow automatic updates
 */
export async function unpinPersona(sessionId) {
  if (!sessionId) return { success: false, error: 'No session ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  // Support both V4 'persona' and legacy 'persona_synthesizer' component names
  const personaComponent = memory?.components?.persona || memory?.components?.persona_synthesizer;
  if (!personaComponent) {
    return { success: false, error: 'No persona component' };
  }

  personaComponent.pinned = false;
  delete personaComponent.pinnedData;
  delete personaComponent.pinnedAt;

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', 'Persona unpinned', { sessionId });
  return { success: true };
}

// ============================================================================
// SECTION: Generic Component Pinning
// ============================================================================

/**
 * Pin any component to prevent automatic updates during Rebuild Memory
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} componentId - Component ID (context, tone, constraints, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function pinComponent(sessionId, componentId) {
  if (!sessionId) return { success: false, error: 'No session ID' };
  if (!componentId) return { success: false, error: 'No component ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  let memory = result[storageKey];

  if (!memory) {
    memory = { sessionId, components: {}, currentGeneration: 0 };
  }
  if (!memory.components) {
    memory.components = {};
  }
  if (!memory.components[componentId]) {
    memory.components[componentId] = { current: { instruction: '' } };
  }

  const component = memory.components[componentId];
  if (!component.current) {
    component.current = { instruction: '' };
  }

  component.pinned = true;
  component.pinnedData = { ...component.current };
  component.pinnedAt = Date.now();

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', `Component pinned: ${componentId}`, { sessionId });
  return { success: true };
}

/**
 * Unpin a component to allow automatic updates
 * 
 * @param {string} sessionId - Session identifier
 * @param {string} componentId - Component ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unpinComponent(sessionId, componentId) {
  if (!sessionId) return { success: false, error: 'No session ID' };
  if (!componentId) return { success: false, error: 'No component ID' };

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  const memory = result[storageKey];

  const component = memory?.components?.[componentId];
  if (!component) {
    return { success: false, error: `No ${componentId} component` };
  }

  component.pinned = false;
  delete component.pinnedData;
  delete component.pinnedAt;

  await chrome.storage.local.set({ [storageKey]: memory });
  bgLog('info', `Component unpinned: ${componentId}`, { sessionId });
  return { success: true };
}

export async function toggleFact(sessionId, factPath, enabled) {
  if (!sessionId || !factPath) return { success: false };

  const storageKey = `session_${sessionId}_disabled`;
  const result = await chrome.storage.local.get(storageKey);
  const disabled = result[storageKey] || {};

  if (enabled) {
    delete disabled[factPath];
  } else {
    disabled[factPath] = true;
  }

  await chrome.storage.local.set({ [storageKey]: disabled });
  return { success: true };
}

/**
 * Build formatted refinement context from V4 memory components
 * Supports 7-dimension V4 schema with legacy fallback and disabled-fact filtering
 * @param {Object} memoryData - Session memory data
 * @param {Object} [disabledFacts={}] - Map of disabled facts/components
 * @returns {Object} Structured context with all dimensions
 */
export function buildV4RefinementContext(memoryData, disabledFacts = {}) {
  if (!memoryData?.components) return { formatted: '', dimensions: {} };

  const components = memoryData.components;
  const dimensions = {};
  const sections = [];

  const isFactDisabled = (dim) => {
    return disabledFacts[`component.${dim}`] === true || disabledFacts[dim] === true;
  };

  // Helper to extract active data, prioritizing pinned data over current data
  const getActiveData = (comp) => {
    if (!comp) return null;
    if (comp.pinned && comp.pinnedData) {
      return comp.pinnedData;
    }
    return comp.current || null;
  };

  // =========================================================================
  // PERSONA - The expert identity the LLM must BECOME (not just act as)
  // =========================================================================
  if (!isFactDisabled('persona')) {
    const personaV4 = components.persona;
    const personaLegacy = components.persona_synthesizer;

    const personaData = getActiveData(personaV4) || getActiveData(personaLegacy);
    let personaText = null;
    if (personaData?.instruction) {
      personaText = personaData.instruction;
    } else if (personaData?.synthesizedPersona) {
      personaText = personaData.synthesizedPersona;
    }

    if (personaText) {
      dimensions.persona = personaText;
      sections.push(`## 🎭 PERSONA (EMBODY THIS EXPERT)
${personaText}`);
    }
  }

  // =========================================================================
  // CONTEXT - Domain expertise and scope boundaries
  // =========================================================================
  if (!isFactDisabled('context')) {
    const contextV4 = components.context;
    const contextLegacy = components.topic_summarizer;

    const contextData = getActiveData(contextV4);
    const contextLegacyData = getActiveData(contextLegacy);

    if (contextData) {
      const domain = contextData.metadata?.domain || 'General';
      const scopeTags = contextData.metadata?.scope_tags || [];
      const instruction = contextData.instruction || '';

      dimensions.context = { domain, scopeTags, instruction };
      sections.push(`## 🌐 DOMAIN & SCOPE
- **Domain**: ${domain}
- **Scope**: ${scopeTags.join(', ') || 'General'}
- **Expertise**: ${instruction || 'Apply domain knowledge as appropriate'}`);
    } else if (contextLegacyData) {
      dimensions.context = {
        domain: contextLegacyData.primaryTopic || 'General',
        scopeTags: contextLegacyData.keywords || [],
        instruction: contextLegacyData.summary || ''
      };
      sections.push(`## 🌐 DOMAIN & SCOPE
- **Domain**: ${contextLegacyData.primaryTopic || 'General'}
- **Scope**: ${contextLegacyData.keywords?.join(', ') || 'General'}
- **Summary**: ${contextLegacyData.summary || 'No summary available'}`);
    }
  }

  // =========================================================================
  // TONE - Communication style and voice
  // =========================================================================
  if (!isFactDisabled('tone')) {
    const toneV4 = components.tone;
    const toneLegacy = components.style_profiler;

    const toneData = getActiveData(toneV4);
    const toneLegacyData = getActiveData(toneLegacy);

    if (toneData) {
      const styleTags = toneData.metadata?.style_tags || [];
      const bannedPhrases = toneData.metadata?.banned_phrases || [];

      dimensions.tone = { instruction: toneData.instruction, styleTags, bannedPhrases };
      let toneSection = `## 🎨 TONE & STYLE
- **Voice**: ${toneData.instruction || 'Professional and clear'}
- **Style Tags**: ${styleTags.join(', ') || 'Professional'}`;
      if (bannedPhrases.length > 0) {
        toneSection += `\n- **AVOID**: "${bannedPhrases.join('", "')}"`;
      }
      sections.push(toneSection);
    } else if (toneLegacyData) {
      dimensions.tone = {
        instruction: toneLegacyData.tone || 'Professional',
        styleTags: toneLegacyData.traits || [],
        bannedPhrases: []
      };
      sections.push(`## 🎨 TONE & STYLE
- **Tone**: ${toneLegacyData.tone || 'Professional'}
- **Verbosity**: ${toneLegacyData.verbosity || 'Moderate'}
- **Technical Level**: ${toneLegacyData.technicalLevel || 'Intermediate'}
- **Directness**: ${toneLegacyData.directness || 'Direct'}`);
    }
  }

  // =========================================================================
  // FRAMEWORK - Reasoning methodology
  // =========================================================================
  if (!isFactDisabled('framework')) {
    const frameworkV4 = components.framework;
    const fw = getActiveData(frameworkV4);

    if (fw) {
      const reasoningType = fw.metadata?.reasoning_type || 'Step-by-Step';

      dimensions.framework = { instruction: fw.instruction, reasoningType };
      sections.push(`## 🔧 METHODOLOGY
- **Reasoning Approach**: ${reasoningType}
- **Methodology**: ${fw.instruction || 'Apply structured thinking'}`);
    }
  }

  // =========================================================================
  // CONSTRAINTS - Rules, prohibitions, requirements
  // =========================================================================
  if (!isFactDisabled('constraints')) {
    const constraintsV4 = components.constraints;
    const c = getActiveData(constraintsV4);

    if (c) {
      const prohibitions = c.metadata?.prohibitions || [];
      const requirements = c.metadata?.requirements || [];
      const responseLength = c.metadata?.response_length || 'appropriate';

      dimensions.constraints = { prohibitions, requirements, responseLength, instruction: c.instruction };
      let constraintSection = `## ⚠️ CONSTRAINTS`;
      if (requirements.length > 0) {
        constraintSection += `\n- **MUST**: ${requirements.join('; ')}`;
      }
      if (prohibitions.length > 0) {
        constraintSection += `\n- **NEVER**: ${prohibitions.join('; ')}`;
      }
      constraintSection += `\n- **Response Length**: ${responseLength}`;
      if (c.instruction) {
        constraintSection += `\n- **Notes**: ${c.instruction}`;
      }
      sections.push(constraintSection);
    }
  }

  // =========================================================================
  // FORMAT - Output structure preferences
  // =========================================================================
  if (!isFactDisabled('format')) {
    const formatV4 = components.format;
    const fmt = getActiveData(formatV4);

    if (fmt) {
      const outputType = fmt.metadata?.output_type || 'Markdown';

      dimensions.format = { outputType, instruction: fmt.instruction };
      sections.push(`## 📋 OUTPUT FORMAT
- **Type**: ${outputType}
- **Structure**: ${fmt.instruction || 'Format appropriately for the task'}`);
    }
  }

  // =========================================================================
  // EXEMPLAR - Example patterns to learn from
  // =========================================================================
  if (!isFactDisabled('exemplar')) {
    const exemplarV4 = components.exemplar;
    const ex = getActiveData(exemplarV4);

    if (ex) {
      dimensions.exemplar = { instruction: ex.instruction };
      if (ex.instruction) {
        sections.push(`## 📚 EXEMPLAR PATTERNS
${ex.instruction}`);
      }
    }
  }

  // =========================================================================
  // RECENT FOCUS - Current conversation momentum (legacy support)
  // =========================================================================
  if (!isFactDisabled('recent_focus')) {
    const recentFocus = getActiveData(components.recent_focus);
    if (recentFocus) {
      dimensions.recentFocus = recentFocus;
      let recentSection = `## 🎯 CURRENT FOCUS
- **Working On**: ${recentFocus.currentTopic || recentFocus.currentFocus || 'General task'}
- **Active Task**: ${recentFocus.activeTask || 'None specified'}
- **Momentum**: ${typeof recentFocus.momentum === 'object' ? recentFocus.momentum.direction : recentFocus.momentum || 'Steady'}`;
      if (recentFocus.openItems?.length) {
        recentSection += `\n- **Open Items**: ${recentFocus.openItems.join(', ')}`;
      }
      sections.push(recentSection);
    }
  }

  return {
    formatted: sections.join('\n\n'),
    dimensions,
    hasDimensions: sections.length > 0
  };
}

/**
 * Rebuild memory for a session (requires content script to do actual scraping)
 * @param {string} sessionId - Session ID
 * @param {Object} options - Rebuild options
 * @param {string[]} options.enabledAnalyzers - List of analyzer IDs to run (null = run all)
 */
export async function rebuildSessionMemory(sessionId, options = {}) {
  bgLog('debug', '[rebuildSessionMemory] START', { sessionId, hasEnabledAnalyzers: !!options.enabledAnalyzers });
  console.log('[Background] rebuildSessionMemory START:', sessionId);

  if (!sessionId) {
    bgLog('warn', '[rebuildSessionMemory] No session ID');
    console.warn('[Background] rebuildSessionMemory: No session ID');
    return { success: false, error: 'No session ID' };
  }

  try {
    // Step 1: Get current tab for session
    bgLog('debug', '[rebuildSessionMemory] Querying tab for session');
    console.log('[Background] rebuildSessionMemory: Querying tab for session...');
    
    let targetTab = null;
    const matchingTabs = await chrome.tabs.query({ url: `https://gemini.google.com/app/${sessionId}*` });
    if (matchingTabs && matchingTabs.length > 0) {
      targetTab = matchingTabs[0];
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = activeTab;
    }

    if (!targetTab?.id) {
      bgLog('warn', '[rebuildSessionMemory] No active tab found');
      console.warn('[Background] rebuildSessionMemory: No active tab found');
      return { success: false, error: 'No active Gemini tab found' };
    }
    bgLog('debug', '[rebuildSessionMemory] Tab found', { tabId: targetTab.id });
    console.log('[Background] rebuildSessionMemory: Tab found:', targetTab.id);

    // Step 2: Clear decision
    if (!options.enabledAnalyzers) {
      bgLog('debug', '[rebuildSessionMemory] Full rebuild - clearing storage');
      console.log('[Background] rebuildSessionMemory: Full rebuild, clearing existing memory...');
      const storageKey = `session_${sessionId}`;
      await chrome.storage.local.remove(storageKey);
      bgLog('debug', '[rebuildSessionMemory] Storage cleared');
      console.log('[Background] rebuildSessionMemory: Storage cleared');
    } else {
      bgLog('debug', '[rebuildSessionMemory] Running selected analyzers', {
        analyzers: options.enabledAnalyzers,
        count: options.enabledAnalyzers.length
      });
      console.log('[Background] rebuildSessionMemory: Running', options.enabledAnalyzers.length, 'selected analyzers:', options.enabledAnalyzers);
    }

    // Step 3: Send message to content script
    bgLog('debug', '[rebuildSessionMemory] Sending REBUILD_MEMORY_REQUEST to content script');
    console.log('[Background] rebuildSessionMemory: Sending message to content script...');
    const result = await chrome.tabs.sendMessage(targetTab.id, {
      type: 'REBUILD_MEMORY_REQUEST',
      sessionId,
      enabledAnalyzers: options.enabledAnalyzers
    });
    bgLog('debug', '[rebuildSessionMemory] Response received', { success: result?.success });
    console.log('[Background] rebuildSessionMemory: Response received:', result?.success);

    bgLog('info', '[rebuildSessionMemory] COMPLETE');
    console.log('[Background] rebuildSessionMemory COMPLETE');
    return result || { success: true };
  } catch (error) {
    bgLog('error', '[rebuildSessionMemory] Exception', { error: error.message });
    console.error('[Background] Rebuild failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Concurrency Control: Tab Session Mutex
// ============================================================================

const _sessionLocks = new Map();

/**
 * Acquire an exclusive session lock for a tab
 * @param {string} sessionId
 * @param {number} [timeoutMs=30000]
 * @returns {Promise<boolean>}
 */
export async function acquireSessionLock(sessionId, timeoutMs = 30000) {
  if (!sessionId) return false;
  const now = Date.now();
  const existingLock = _sessionLocks.get(sessionId);

  if (existingLock && (now - existingLock.timestamp < existingLock.timeoutMs)) {
    bgLog('warn', 'Session lock already held', { sessionId, holder: existingLock.holder });
    return false;
  }

  _sessionLocks.set(sessionId, {
    timestamp: now,
    timeoutMs,
    holder: `lock_${now}`
  });
  return true;
}

/**
 * Release an exclusive session lock
 * @param {string} sessionId
 */
export function releaseSessionLock(sessionId) {
  if (sessionId) {
    _sessionLocks.delete(sessionId);
  }
}

// ============================================================================
// B3 FIX: User-Friendly Error Messages for API Errors
// ============================================================================

/**
 * Convert HTTP status codes and raw API errors into user-friendly messages
 * @param {number} status - HTTP status code
 * @param {string} rawError - Raw error message from API
 * @param {string} provider - API provider name (gemini, openai, openrouter, anthropic)
 * @returns {string} User-friendly error message
 */
