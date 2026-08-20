/**
 * @fileoverview LLM API Proxy & Refinement Orchestration Service
 * @module background/services/api-proxy
 */

import { bgLog } from './logger.js';
import { decryptApiKey, isEncrypted } from './crypto.js';
import {
  activeRefinements,
  activeExtractions,
  RECENT_FOCUS_REFRESH_INTERVAL,
  incrementRefinementCounter,
  resetRefinementCounter
} from './session-state.js';
import {
  getCurrentTabSessionId,
  getSessionMemory,
  buildV4RefinementContext
} from './memory-orchestrator.js';

export function getUserFriendlyError(status, rawError, provider) {
  const providerName = {
    'google': 'Gemini',
    'gemini': 'Gemini',
    'openai': 'OpenAI',
    'openrouter': 'OpenRouter',
    'anthropic': 'Anthropic'
  }[provider] || provider;

  // Handle specific HTTP status codes
  switch (status) {
    case 429:
      return `Rate limit exceeded. ${providerName} API is temporarily overloaded. Please wait a moment and try again.`;
    case 401:
      return `Invalid API key. Please check your ${providerName} API key in Extension Options.`;
    case 403:
      return `Access denied. Your ${providerName} API key may not have permission for this model. Check your API access.`;
    case 400:
      return `Invalid request. The prompt may be too long or contain unsupported content.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${providerName} server error (${status}). The service is temporarily unavailable. Please try again later.`;
    case 0:
      // Network error - no response received
      return `Network error. Check your internet connection and try again.`;
    default:
      // Fall back to raw error with provider context
      if (rawError) {
        return `${providerName}: ${rawError}`;
      }
      return `${providerName} API error (${status}). Please try again.`;
  }
}

// Industry-Level Prompt Refinement System Prompt
// This is the ENGINE of the extension - all extraction/synthesis serves this purpose
const REFINEMENT_SYSTEM_PROMPT = `You are an elite prompt engineer with 20+ years of expertise in human-AI communication optimization.

## YOUR CORE MISSION
Transform raw user prompts into precision-crafted instructions that unlock AI's full potential. You don't just improve prompts - you EMBODY the expert persona provided and craft requests as that expert would.

## THE REFINEMENT PROTOCOL

### PHASE 1: EMBODY THE PERSONA
You ARE the expert described in the PERSONA section. Not "acting as" - you ARE this person with their exact credentials, methodology, and 20+ years of domain expertise. Every word of your refined prompt flows from this identity.

### PHASE 2: APPLY THE 7 DIMENSIONS
Using the EXPERT CONTEXT provided, ensure the refined prompt:

1. **PERSONA-ALIGNED**: Speaks with the authority and specificity of the embedded expert
2. **DOMAIN-SCOPED**: Uses terminology and concepts from the specified scope_tags
3. **TONE-MATCHED**: Maintains the specified voice, style, and avoids banned phrases
4. **FRAMEWORK-DRIVEN**: Structures the request using the specified reasoning methodology
5. **CONSTRAINT-COMPLIANT**: Respects all MUST/NEVER rules and response length requirements
6. **FORMAT-SPECIFIC**: Requests output in the EXACT specified format type (verbatim)
7. **EXEMPLAR-INFORMED**: Applies patterns learned from exemplar if provided

### PHASE 3: CRAFT WITH PRECISION
Transform the prompt by:
- **Preserving Intent**: The user's core goal remains paramount
- **Injecting Expertise**: Add domain-specific precision only an expert would know
- **Matching Complexity**: Simple questions stay simple; complex tasks get appropriate structure
- **Natural Flow**: The result reads like a skilled professional wrote it

### PHASE 4: DELIVER THE OUTPUT
The refined prompt MUST:
- Match the OUTPUT FORMAT specified (Markdown, JSON, Code, etc.)
- Respect the TONE specified (formal, casual, technical, etc.)
- Stay within CONSTRAINTS (length, prohibitions, requirements)
- Apply the FRAMEWORK reasoning approach specified

## CRITICAL RULES (MANDATORY)

1. **INSTRUCTION ONLY (DO NOT ANSWER)**: You are writing the INSTRUCTION to the target AI, NOT answering or fulfilling the request yourself. If the user says "Debug this code" or "Calculate X", your refined prompt instructs the target AI how to debug or calculate — you do NOT output the debugged code or the answer.
2. **PROPORTIONALITY**: A 1-sentence question → 1-2 sentence refined prompt. Never over-engineer simple requests.
3. **NO META-COMMENTARY**: Return ONLY the refined prompt text. No "Here is your improved prompt:", no greetings, and no explanations.
4. **PRESERVE VARIABLES & CODE BLOCKS**: Preserve all user code snippets, URLs, equations, and template tags (e.g. {{variable}}, {{clipboard}}, {{selection}}) verbatim without stripping backticks or syntax.
5. **PERSONA DEPTH**: Weave the persona's credentials, methodology, and domain mastery directly into the prompt's framing, technical criteria, and depth.
6. **CONSTRAINT COMPLIANCE**: If NEVER says "avoid jargon", the refined prompt explicitly directs the target AI to use plain language.
7. **EXEMPLAR LEARNING**: If exemplar patterns are provided, mirror their effective structural patterns.
8. **TAIL FORMAT ANCHORING**: When OUTPUT FORMAT is specified, anchor the explicit format request at the very END of the refined prompt (e.g., end with "Respond in valid JSON format." or "Provide working code with inline comments.").

---`;


// Model Configurations - Support multiple AI providers
export const MODEL_CONFIGS = {
  'gemini-2.0-flash': {
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    apiKeyField: 'geminiApiKey',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  },
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    apiKeyField: 'geminiApiKey',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'
  },
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    apiKeyField: 'openaiApiKey',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    apiKeyField: 'openaiApiKey',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  }
};

// ============================================================================
// Multi-Provider LLM Transport Adapters & Unified Runner
// ============================================================================

export const LLM_TRANSPORTS = {
  gemini: {
    buildUrl: (model, apiKey, endpoint) => endpoint ? `${endpoint}?key=${apiKey}` : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (prompt, params = {}) => JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: params.temperature ?? 0.7,
        maxOutputTokens: params.maxOutputTokens ?? params.max_tokens ?? 8192
      }
    }),
    extractText: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text
  },
  openai: {
    buildUrl: (model, apiKey, endpoint) => endpoint || 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    buildBody: (prompt, params = {}, model) => JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? params.maxOutputTokens ?? 4096
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content
  },
  openrouter: {
    buildUrl: (model, apiKey, endpoint) => endpoint || 'https://openrouter.ai/api/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://gemini.google.com',
      'X-Title': 'Prompt Assistant'
    }),
    buildBody: (prompt, params = {}, model) => JSON.stringify({
      model: model || 'openai/gpt-oss-120b:free',
      messages: [{ role: 'user', content: prompt }],
      temperature: params.temperature ?? 0.7,
      max_tokens: params.max_tokens ?? params.maxOutputTokens ?? 4096
    }),
    extractText: (data) => data?.choices?.[0]?.message?.content
  },
  anthropic: {
    buildUrl: (model, apiKey, endpoint) => endpoint || 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    buildBody: (prompt, params = {}, model) => JSON.stringify({
      model: model || 'claude-3-5-sonnet-latest',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: params.max_tokens ?? params.maxOutputTokens ?? 4096
    }),
    extractText: (data) => data?.content?.[0]?.text
  }
};

// ============================================================================
// Retry Configuration for Transient API Errors
// ============================================================================
const RETRY_CONFIG_BG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  retryableStatuses: [429, 500, 502, 503, 504]
};

/**
 * Calculate exponential backoff delay with jitter
 * @param {number} attempt - Current attempt number (0-based)
 * @returns {number} Delay in milliseconds
 */
function calculateRetryDelay(attempt) {
  const exponentialDelay = RETRY_CONFIG_BG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG_BG.maxDelayMs);
  // Add ±25% jitter to prevent thundering herd
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.round(jitter);
}

/**
 * Unified execution runner for LLM requests across all supported providers
 */
export async function executeLlmRequest(prompt, modelConfig, signal = null) {
  if (!modelConfig?.apiKey) {
    return {
      success: false,
      error: `No API key configured for ${modelConfig?.name || 'selected model'}. Set it in Extension Options.`
    };
  }

  let provider = (modelConfig.provider || 'gemini').toLowerCase();
  if (provider === 'google') provider = 'gemini';

  const adapter = LLM_TRANSPORTS[provider];
  if (!adapter) {
    return { success: false, error: `Unsupported provider: ${provider}` };
  }

  let apiKey = modelConfig.apiKey;
  if (isEncrypted(apiKey)) {
    apiKey = await decryptApiKey(apiKey);
  }

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG_BG.maxRetries; attempt++) {
    // Check abort signal before each attempt
    if (signal?.aborted) {
      bgLog('info', 'LLM request aborted by user before attempt', { attempt });
      return { success: false, aborted: true, error: 'Request aborted by user' };
    }

    try {
      // Wait before retry (skip on first attempt)
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1);
        bgLog('info', `LLM retry ${attempt}/${RETRY_CONFIG_BG.maxRetries}`, {
          provider, delayMs: delay
        });
        // Interruptible delay — abort signal can cancel the wait
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          if (signal) {
            signal.addEventListener('abort', () => {
              clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          }
        });
      }

      const model = modelConfig.modelId || modelConfig.model;
      const url = adapter.buildUrl(model, apiKey, modelConfig.endpoint);
      const headers = adapter.buildHeaders(apiKey);
      const body = adapter.buildBody(prompt, modelConfig.parameters || {}, model);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        const rawError = data?.error?.message || data?.error;
        const errMsg = getUserFriendlyError(response.status, rawError, provider);

        // Retry on transient errors
        if (RETRY_CONFIG_BG.retryableStatuses.includes(response.status) &&
            attempt < RETRY_CONFIG_BG.maxRetries) {
          bgLog('warn', `Transient ${provider} API error (${response.status}), will retry`, {
            attempt, status: response.status
          });
          lastError = { success: false, error: errMsg, status: response.status };
          continue; // Retry
        }

        bgLog('error', `${provider} API error`, { status: response.status, error: errMsg, attempt });
        return { success: false, error: errMsg, status: response.status };
      }

      const text = adapter.extractText(data);
      if (!text) {
        return { success: false, error: `${modelConfig.name || provider} returned empty response. Try again.` };
      }

      if (attempt > 0) {
        bgLog('info', `LLM request succeeded after ${attempt} retries`, { provider });
      }
      return { success: true, text: text.trim() };
    } catch (e) {
      if (e.name === 'AbortError') {
        bgLog('info', 'LLM request aborted by user');
        return { success: false, aborted: true, error: 'Request aborted by user' };
      }

      // Retry on network errors (TypeError from fetch)
      if (e instanceof TypeError && attempt < RETRY_CONFIG_BG.maxRetries) {
        bgLog('warn', `Network error on ${provider} API call, will retry`, {
          attempt, message: e.message
        });
        lastError = { success: false, error: e.message };
        continue;
      }

      console.error('LLM API call failed', e);
      return { success: false, error: e.message };
    }
  }

  // All retries exhausted
  bgLog('error', 'All LLM retries exhausted', { provider, maxRetries: RETRY_CONFIG_BG.maxRetries });
  return lastError || { success: false, error: 'Request failed after multiple retries. Please try again later.' };
}

/**
 * Call LLM for persona extraction
 * @param {string} prompt - The full extraction prompt
 * @param {Object} modelConfig - Model configuration with provider, model, apiKey
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
export async function callLLMForExtraction(prompt, modelConfig, signal = null) {
  bgLog('info', 'callLLMForExtraction: Calling LLM', {
    provider: modelConfig?.provider,
    model: modelConfig?.model || modelConfig?.modelId
  });
  return await executeLlmRequest(prompt, modelConfig, signal);
}

// AI Refinement Logic
export async function handleRefinement({ text, persona, context, previousPrompts, templateId, modelId }, tabId) {
  // Create AbortController for this refinement request
  const abortController = new AbortController();
  if (tabId) {
    // Cancel any existing refinement for this tab
    if (activeRefinements.has(tabId)) {
      activeRefinements.get(tabId).abort();
    }
    activeRefinements.set(tabId, abortController);
  }
  const signal = abortController.signal;

  try {
    const syncStorage = await chrome.storage.sync.get([
      'globalPersona', 'selectedTemplate', 'contextVariables'
    ]);

    // Get model config from model-manager storage pattern
    // Priority: explicit modelId > pa_active_model > default
    const localStorage = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
    const paModels = localStorage.pa_models || {};
    const activeModelId = localStorage.pa_active_model?.activeModelId;

    const effectiveModelId = modelId || activeModelId || 'gemini-2.0-flash';
    let modelConfig = paModels[effectiveModelId];

    // Fallback to legacy MODEL_CONFIGS if not in pa_models
    if (!modelConfig) {
      modelConfig = MODEL_CONFIGS[effectiveModelId] || MODEL_CONFIGS['gemini-2.0-flash'];
    }

    bgLog('info', 'Refinement: Using model', {
      effectiveModelId,
      hasModelConfig: !!modelConfig,
      hasApiKey: !!modelConfig?.apiKey,
      provider: modelConfig?.provider
    });

    // Get persona: Synthesized Persona is primary, globalPersona is fallback
    let effectivePersona = 'Helpful Assistant'; // Default fallback
    let sessionId = null;
    let memoryData = null;

    try {
      sessionId = await getCurrentTabSessionId(tabId);
      if (sessionId) {
        memoryData = await getSessionMemory(sessionId);

        // Use pinned persona if available, otherwise use current/synthesized persona
        const personaComponent = memoryData?.components?.persona || memoryData?.components?.persona_synthesizer;
        let synthesizedPersona = null;

        if (personaComponent?.pinned && personaComponent?.pinnedData) {
          synthesizedPersona = personaComponent.pinnedData.instruction || personaComponent.pinnedData.synthesizedPersona;
          bgLog('debug', 'Refinement: Using pinned persona');
        } else if (personaComponent?.current) {
          synthesizedPersona = personaComponent.current.instruction || personaComponent.current.synthesizedPersona;
        }

        if (synthesizedPersona) {
          effectivePersona = synthesizedPersona;
        } else if (syncStorage.globalPersona) {
          // Fallback to globalPersona only if no synthesized persona exists
          effectivePersona = syncStorage.globalPersona;
        }
      } else if (syncStorage.globalPersona) {
        // No session, use globalPersona
        effectivePersona = syncStorage.globalPersona;
      }
    } catch (e) {
      console.warn('[Refinement] Could not get persona:', e);
      if (syncStorage.globalPersona) {
        effectivePersona = syncStorage.globalPersona;
      }
    }

    // ========================================================================
    // Recent Focus Auto-Refresh: Run every N refinements to keep context fresh
    // ========================================================================
    const counter = await incrementRefinementCounter();
    if (counter >= RECENT_FOCUS_REFRESH_INTERVAL && sessionId) {
      bgLog('info', 'Auto-refreshing Recent Focus', { counter });
      try {
        // Request content script to refresh Recent Focus
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'REFRESH_RECENT_FOCUS',
            sessionId
          });
          await resetRefinementCounter();
          bgLog('info', 'Recent Focus refresh requested');
        }
      } catch (e) {
        console.warn('[Refinement] Recent Focus auto-refresh failed:', e);
      }
    }

    // Replace context variables in the input text (with regex escaping for safety)
    let processedText = text;
    if (syncStorage.contextVariables) {
      try {
        const variables = JSON.parse(syncStorage.contextVariables);
        for (const [key, value] of Object.entries(variables)) {
          const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');
          processedText = processedText.replace(regex, value);
        }
      } catch (e) {
        // Invalid JSON - skip variable replacement
        console.warn('Invalid context variables JSON:', e);
      }
    }

    // Build context string from chat history
    let contextStr = '';
    if (context && context.length > 0) {
      contextStr = `\nRECENT CHAT HISTORY:\n${context.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n')}\n`;
    }

    // Build previous prompts section with ratings
    let previousPromptsStr = '';
    if (previousPrompts && previousPrompts.length > 0) {
      previousPromptsStr = `
PROMPT HISTORY WITH USER SATISFACTION:
(The rating shows how satisfied the user was with the AI's response to each prompt. High ratings = the response style/approach worked well for this user)
${previousPrompts.map((p, i) => {
        const ratingLabel = p.rating
          ? `User rated AI response: ★${p.rating}/5`
          : 'Response not yet rated';
        return `${i + 1}. "${p.prompt}"
   → ${ratingLabel}`;
      }).join('\n')}
`;
    }

    // Fetch disabled facts for this session
    let disabledFacts = {};
    if (sessionId) {
      const disabledKey = `session_${sessionId}_disabled`;
      const disabledResult = await chrome.storage.local.get(disabledKey);
      disabledFacts = disabledResult[disabledKey] || {};
    }

    // =========================================================================
    // BUILD V4 REFINEMENT CONTEXT - All 7 dimensions (respecting disabled state)
    // =========================================================================
    const v4Context = memoryData ? buildV4RefinementContext(memoryData, disabledFacts) : { formatted: '', dimensions: {} };

    // Check if persona is explicitly disabled
    const isPersonaDisabled = disabledFacts['component.persona'] === true || disabledFacts['persona'] === true;

    // Use persona from V4 context if available, otherwise use effectivePersona ONLY if persona is not disabled
    const personaToUse = isPersonaDisabled ? null : (v4Context.dimensions.persona || effectivePersona);

    // Fallback: If persona is not disabled and V4 context didn't format a persona section, inject effectivePersona if available
    if (!isPersonaDisabled && !v4Context.dimensions.persona && personaToUse && personaToUse !== 'Helpful Assistant') {
      v4Context.dimensions.persona = personaToUse;
      const personaSection = `## 🎭 PERSONA (EMBODY THIS EXPERT)\n${personaToUse}`;
      v4Context.formatted = v4Context.formatted
        ? `${personaSection}\n\n${v4Context.formatted}`
        : personaSection;
      v4Context.hasDimensions = true;
    }

    bgLog('info', 'Refinement: Context assembled', {
      hasDimensions: v4Context.hasDimensions,
      dimensionCount: Object.keys(v4Context.dimensions).length,
      dimensionKeys: Object.keys(v4Context.dimensions)
    });

    // =========================================================================
    // CONSTRUCT THE INDUSTRY-LEVEL REFINEMENT PROMPT
    // =========================================================================
    const promptText = `${REFINEMENT_SYSTEM_PROMPT}

## EXPERT CONTEXT (Your accumulated knowledge for this session)

${v4Context.formatted || '(No specific context available - use general expertise)'}

---

## CONVERSATION HISTORY
${contextStr || '(No recent conversation history)'}

---

## PROMPT HISTORY WITH RATINGS
${previousPromptsStr || '(No previous prompts with ratings)'}

---

## RAW PROMPT TO REFINE

"${processedText}"

---

## YOUR REFINED PROMPT:`;

    const llmResponse = await executeLlmRequest(promptText, modelConfig, signal);

    if (llmResponse.aborted) {
      return { refined: null, aborted: true };
    }

    if (!llmResponse.success) {
      return { refined: null, error: llmResponse.error };
    }

    return { refined: llmResponse.text.replace(/^"|"$/g, '') };
  } finally {
    if (tabId && activeRefinements.get(tabId) === abortController) {
      activeRefinements.delete(tabId);
    }
  }
}