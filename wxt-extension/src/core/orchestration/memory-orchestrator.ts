/**
 * @fileoverview Memory Orchestrator for Session Memory Management & V4 Refinement Context
 * Ported from background/services/memory-orchestrator.js
 * @module orchestration/memory-orchestrator
 */

import { bgLog } from './bg-logger';

export interface V4RefinementContext {
  formatted: string;
  dimensions: Record<string, any>;
  hasDimensions: boolean;
}

export async function getCurrentTabSessionId(targetTabId: number | null = null): Promise<string | null> {
  let tab: chrome.tabs.Tab | null = null;
  if (targetTabId) {
    try {
      tab = await chrome.tabs.get(targetTabId);
    } catch {
      // tab query fallback if get fails
    }
  }

  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab || null;
  }

  if (!tab?.url?.includes('gemini.google.com')) return null;

  try {
    const url = new URL(tab.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    if (pathParts.length >= 2 && pathParts[0] === 'app') {
      return pathParts[1] || null;
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
export async function getSessionMemory(sessionId: string): Promise<Record<string, any> | null> {
  if (!sessionId) return null;

  const storageKey = `session_${sessionId}`;
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] || null;
}

/**
 * Update a memory component
 */
export async function updateMemoryComponent(
  sessionId: string,
  componentId: string,
  data: any
): Promise<{ success: boolean }> {
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
export async function pinPersona(sessionId: string): Promise<{ success: boolean; error?: string }> {
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
export async function unpinPersona(sessionId: string): Promise<{ success: boolean; error?: string }> {
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

/**
 * Pin any component to prevent automatic updates during Rebuild Memory
 */
export async function pinComponent(
  sessionId: string,
  componentId: string
): Promise<{ success: boolean; error?: string }> {
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
 */
export async function unpinComponent(
  sessionId: string,
  componentId: string
): Promise<{ success: boolean; error?: string }> {
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

export async function toggleFact(
  sessionId: string,
  factPath: string,
  enabled: boolean
): Promise<{ success: boolean }> {
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
 */
export function buildV4RefinementContext(
  memoryData: Record<string, any> | null,
  disabledFacts: Record<string, any> = {}
): V4RefinementContext {
  if (!memoryData?.components) return { formatted: '', dimensions: {}, hasDimensions: false };

  const components = memoryData.components;
  const dimensions: Record<string, any> = {};
  const sections: string[] = [];

  const isFactDisabled = (dim: string) => {
    return disabledFacts[`component.${dim}`] === true || disabledFacts[dim] === true;
  };

  const getActiveData = (comp: any) => {
    if (!comp) return null;
    if (comp.pinned && comp.pinnedData) {
      return comp.pinnedData;
    }
    return comp.current || null;
  };

  // 1. PERSONA
  if (!isFactDisabled('persona')) {
    const personaV4 = components.persona;
    const personaLegacy = components.persona_synthesizer;
    const personaData = getActiveData(personaV4) || getActiveData(personaLegacy);
    let personaText: string | null = null;
    if (personaData?.instruction) {
      personaText = personaData.instruction;
    } else if (personaData?.synthesizedPersona) {
      personaText = personaData.synthesizedPersona;
    }

    if (personaText) {
      dimensions.persona = personaText;
      sections.push(`## 🎭 PERSONA (EMBODY THIS EXPERT)\n${personaText}`);
    }
  }

  // 2. CONTEXT
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
      sections.push(`## 🌐 DOMAIN & SCOPE\n- **Domain**: ${domain}\n- **Scope**: ${scopeTags.join(', ') || 'General'}\n- **Expertise**: ${instruction || 'Apply domain knowledge as appropriate'}`);
    } else if (contextLegacyData) {
      dimensions.context = {
        domain: contextLegacyData.primaryTopic || 'General',
        scopeTags: contextLegacyData.keywords || [],
        instruction: contextLegacyData.summary || ''
      };
      sections.push(`## 🌐 DOMAIN & SCOPE\n- **Domain**: ${contextLegacyData.primaryTopic || 'General'}\n- **Scope**: ${contextLegacyData.keywords?.join(', ') || 'General'}\n- **Summary**: ${contextLegacyData.summary || 'No summary available'}`);
    }
  }

  // 3. TONE
  if (!isFactDisabled('tone')) {
    const toneV4 = components.tone;
    const toneLegacy = components.style_profiler;
    const toneData = getActiveData(toneV4);
    const toneLegacyData = getActiveData(toneLegacy);

    if (toneData) {
      const styleTags = toneData.metadata?.style_tags || [];
      const bannedPhrases = toneData.metadata?.banned_phrases || [];

      dimensions.tone = { instruction: toneData.instruction, styleTags, bannedPhrases };
      let toneSection = `## 🎨 TONE & STYLE\n- **Voice**: ${toneData.instruction || 'Professional and clear'}\n- **Style Tags**: ${styleTags.join(', ') || 'Professional'}`;
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
      sections.push(`## 🎨 TONE & STYLE\n- **Tone**: ${toneLegacyData.tone || 'Professional'}\n- **Verbosity**: ${toneLegacyData.verbosity || 'Moderate'}\n- **Technical Level**: ${toneLegacyData.technicalLevel || 'Intermediate'}\n- **Directness**: ${toneLegacyData.directness || 'Direct'}`);
    }
  }

  // 4. FRAMEWORK
  if (!isFactDisabled('framework')) {
    const frameworkV4 = components.framework;
    const fw = getActiveData(frameworkV4);
    if (fw) {
      const reasoningType = fw.metadata?.reasoning_type || 'Step-by-Step';
      dimensions.framework = { instruction: fw.instruction, reasoningType };
      sections.push(`## 🔧 METHODOLOGY\n- **Reasoning Approach**: ${reasoningType}\n- **Methodology**: ${fw.instruction || 'Apply structured thinking'}`);
    }
  }

  // 5. CONSTRAINTS
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

  // 6. FORMAT
  if (!isFactDisabled('format')) {
    const formatV4 = components.format;
    const fmt = getActiveData(formatV4);
    if (fmt) {
      const outputType = fmt.metadata?.output_type || 'Markdown';
      dimensions.format = { outputType, instruction: fmt.instruction };
      sections.push(`## 📋 OUTPUT FORMAT\n- **Type**: ${outputType}\n- **Structure**: ${fmt.instruction || 'Format appropriately for the task'}`);
    }
  }

  // 7. EXEMPLAR
  if (!isFactDisabled('exemplar')) {
    const exemplarV4 = components.exemplar;
    const ex = getActiveData(exemplarV4);
    if (ex) {
      dimensions.exemplar = { instruction: ex.instruction };
      if (ex.instruction) {
        sections.push(`## 📚 EXEMPLAR PATTERNS\n${ex.instruction}`);
      }
    }
  }

  // 8. RECENT FOCUS (legacy support)
  if (!isFactDisabled('recent_focus')) {
    const recentFocus = getActiveData(components.recent_focus);
    if (recentFocus) {
      dimensions.recentFocus = recentFocus;
      let recentSection = `## 🎯 CURRENT FOCUS\n- **Working On**: ${recentFocus.currentTopic || recentFocus.currentFocus || 'General task'}\n- **Active Task**: ${recentFocus.activeTask || 'None specified'}\n- **Momentum**: ${typeof recentFocus.momentum === 'object' ? recentFocus.momentum.direction : recentFocus.momentum || 'Steady'}`;
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
 * Rebuild memory for a session
 */
export async function rebuildSessionMemory(
  sessionId: string,
  options: { enabledAnalyzers?: string[] } = {}
): Promise<{ success: boolean; error?: string }> {
  bgLog('debug', '[rebuildSessionMemory] START', { sessionId, hasEnabledAnalyzers: !!options.enabledAnalyzers });
  console.log('[Background] rebuildSessionMemory START:', sessionId);

  if (!sessionId) {
    bgLog('warn', '[rebuildSessionMemory] No session ID');
    return { success: false, error: 'No session ID' };
  }

  try {
    let targetTab: chrome.tabs.Tab | null = null;
    const matchingTabs = await chrome.tabs.query({ url: `https://gemini.google.com/app/${sessionId}*` });
    if (matchingTabs && matchingTabs.length > 0) {
      targetTab = matchingTabs[0] || null;
    } else {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      targetTab = activeTab || null;
    }

    if (!targetTab?.id) {
      bgLog('warn', '[rebuildSessionMemory] No active tab found');
      return { success: false, error: 'No active Gemini tab found' };
    }

    // Clear decision
    if (!options.enabledAnalyzers) {
      const storageKey = `session_${sessionId}`;
      await chrome.storage.local.remove(storageKey);
      bgLog('debug', '[rebuildSessionMemory] Storage cleared');
    }

    const result = await chrome.tabs.sendMessage(targetTab.id, {
      type: 'REBUILD_MEMORY_REQUEST',
      sessionId,
      enabledAnalyzers: options.enabledAnalyzers
    });

    bgLog('info', '[rebuildSessionMemory] COMPLETE');
    return result || { success: true };
  } catch (error: any) {
    bgLog('error', '[rebuildSessionMemory] Exception', { error: error.message });
    return { success: false, error: error.message };
  }
}

// Concurrency Control: Tab Session Mutex
export const _sessionLocks = new Map<string, { timestamp: number; timeoutMs: number; holder: string }>();

export async function acquireSessionLock(sessionId: string, timeoutMs: number = 30000): Promise<boolean> {
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

export function releaseSessionLock(sessionId: string): void {
  if (sessionId) {
    _sessionLocks.delete(sessionId);
  }
}
