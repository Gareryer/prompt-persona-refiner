/**
 * @fileoverview LLM API Proxy & Refinement Orchestration Service
 * Ported from background/services/api-proxy.js
 * @module orchestration/api-proxy
 */

import { bgLog } from './bg-logger';
import { decryptApiKey, isEncrypted } from '../crypto/crypto-service';
import {
  activeRefinements,
  activeExtractions,
  RECENT_FOCUS_REFRESH_INTERVAL,
  incrementRefinementCounter,
  resetRefinementCounter
} from './session-state';
import {
  getCurrentTabSessionId,
  getSessionMemory,
  buildV4RefinementContext
} from './memory-orchestrator';

export function getUserFriendlyError(
  status: number,
  rawError: string | Record<string, any> | Error | null,
  provider: string
): string {
  const providerName = ({
    'google': 'Gemini',
    'gemini': 'Gemini',
    'openai': 'OpenAI',
    'openrouter': 'OpenRouter',
    'anthropic': 'Anthropic'
  } as Record<string, string>)[provider] || provider;

  const rawStr = typeof rawError === 'string'
    ? rawError
    : ((rawError as any)?.message || (rawError ? JSON.stringify(rawError) : ''));

  switch (status) {
    case 429:
      return `Rate limit exceeded. ${providerName} API is temporarily overloaded. Please wait a moment and try again.`;
    case 401:
      return `Invalid API key. Please check your ${providerName} API key in Extension Options.`;
    case 403:
      return `Access denied. Your ${providerName} API key may not have permission for this model. Check your API access.`;
    case 404:
      return `Model not found (${rawStr || status}). Please check your selected model in Extension Options.`;
    case 400:
      if (/API key not valid|API_KEY_INVALID|API key expired/i.test(rawStr)) {
        return `Invalid API key. Please check your ${providerName} API key in Extension Options.`;
      }
      return `Invalid request (${rawStr || status}). The prompt may be too long or model parameters invalid.`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `${providerName} server error (${status}). The service is temporarily unavailable. Please try again later.`;
    case 0:
      return `Network error. Check your internet connection and try again.`;
    default:
      if (rawStr) {
        return `${providerName}: ${rawStr}`;
      }
      return `${providerName} API error (${status}). Please try again.`;
  }
}

export const REFINEMENT_SYSTEM_PROMPT = `You are an elite prompt engineer with 20+ years of expertise in human-AI communication optimization.

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

export const MODEL_CONFIGS: Record<string, any> = {
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

export interface LLMTransport {
  buildUrl: (model: string, apiKey: string, endpoint?: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (prompt: string, params?: Record<string, any>, model?: string) => string;
  extractText: (data: any) => string | undefined;
}

export const LLM_TRANSPORTS: Record<string, LLMTransport> = {
  gemini: {
    buildUrl: (model, _apiKey, endpoint) => {
      const raw = (model || '').trim();
      const effective = (!raw || raw.toLowerCase() === 'gemini' || raw.toLowerCase() === 'google')
        ? 'gemini-2.0-flash'
        : raw;
      return endpoint || `https://generativelanguage.googleapis.com/v1beta/models/${effective}:generateContent`;
    },
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }),
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
    buildUrl: (_model, _apiKey, endpoint) => endpoint || 'https://api.openai.com/v1/chat/completions',
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
    buildUrl: (_model, _apiKey, endpoint) => endpoint || 'https://openrouter.ai/api/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://gemini.google.com',
      'X-Title': 'Allie Persona & Prompt Refiner'
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
    buildUrl: (_model, _apiKey, endpoint) => endpoint || 'https://api.anthropic.com/v1/messages',
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

export const RETRY_CONFIG_BG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  retryableStatuses: [429, 500, 502, 503, 504]
};

export function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG_BG.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, RETRY_CONFIG_BG.maxDelayMs);
  const jitter = cappedDelay * (0.75 + Math.random() * 0.5);
  return Math.round(jitter);
}

export async function executeLlmRequest(
  prompt: string,
  modelConfig: any,
  signal: AbortSignal | null = null
): Promise<{ success: boolean; text?: string; error?: string; aborted?: boolean; status?: number }> {
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
    const decrypted = await decryptApiKey(apiKey);
    if (decrypted) apiKey = decrypted;
  }

  let lastError: any = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG_BG.maxRetries; attempt++) {
    if (signal?.aborted) {
      bgLog('info', 'LLM request aborted by user before attempt', { attempt });
      return { success: false, aborted: true, error: 'Request aborted by user' };
    }

    try {
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1);
        bgLog('info', `LLM retry ${attempt}/${RETRY_CONFIG_BG.maxRetries}`, { provider, delayMs: delay });
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

      let rawModel = (modelConfig.model || modelConfig.modelId || modelConfig.id || '').trim();
      if (!rawModel || rawModel.toLowerCase() === 'gemini' || rawModel.toLowerCase() === 'google') {
        rawModel = 'gemini-2.0-flash';
      } else if (rawModel.toLowerCase() === 'openai') {
        rawModel = 'gpt-4o-mini';
      } else if (rawModel.toLowerCase() === 'anthropic') {
        rawModel = 'claude-3-5-sonnet-20241022';
      } else if (rawModel.toLowerCase() === 'openrouter') {
        rawModel = 'google/gemini-2.0-flash-exp:free';
      }
      const model = rawModel;
      const url = adapter.buildUrl(model, apiKey, modelConfig.endpoint);
      const headers = adapter.buildHeaders(apiKey);
      const body = adapter.buildBody(prompt, modelConfig.parameters || {}, model);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: signal || undefined
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.error) {
        const rawError = typeof data?.error === 'string'
          ? data.error
          : (data?.error?.message || (data?.error ? JSON.stringify(data.error) : (data?.message || response.statusText)));
        const errMsg = getUserFriendlyError(response.status, rawError, provider);

        if (RETRY_CONFIG_BG.retryableStatuses.includes(response.status) &&
            attempt < RETRY_CONFIG_BG.maxRetries) {
          bgLog('warn', `Transient ${provider} API error (${response.status}), will retry`, {
            attempt, status: response.status, model, error: errMsg
          });
          lastError = { success: false, error: errMsg, status: response.status };
          continue;
        }

        bgLog('error', `${provider} API error (${response.status}): ${errMsg}`, { status: response.status, model, error: errMsg, rawError, attempt });
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
    } catch (e: any) {
      if (e.name === 'AbortError') {
        bgLog('info', 'LLM request aborted by user');
        return { success: false, aborted: true, error: 'Request aborted by user' };
      }

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

  bgLog('error', 'All LLM retries exhausted', { provider, maxRetries: RETRY_CONFIG_BG.maxRetries });
  return lastError || { success: false, error: 'Request failed after multiple retries. Please try again later.' };
}

export async function callLLMForExtraction(
  prompt: string,
  modelConfig: any,
  signal: AbortSignal | null = null
): Promise<{ success: boolean; text?: string; error?: string; aborted?: boolean }> {
  const safeConfig = { ...modelConfig };
  let rawModel = (safeConfig.model || safeConfig.modelId || safeConfig.id || '').trim();
  if (!rawModel || rawModel.toLowerCase() === 'gemini' || rawModel.toLowerCase() === 'google') {
    rawModel = 'gemini-2.0-flash';
  }
  safeConfig.model = rawModel;

  bgLog('info', 'callLLMForExtraction: Calling LLM', {
    provider: safeConfig?.provider,
    model: safeConfig?.model
  });
  return await executeLlmRequest(prompt, safeConfig, signal);
}

export interface RefinementPayload {
  text: string;
  persona?: any;
  context?: Array<{ role: string; text: string }>;
  previousPrompts?: Array<{ prompt: string; rating?: number }>;
  templateId?: string;
  modelId?: string;
}

export async function handleRefinement(
  payload: RefinementPayload,
  tabId?: number
): Promise<{ refined: string | null; error?: string; aborted?: boolean }> {
  const { text, context, previousPrompts, modelId } = payload;
  const abortController = new AbortController();
  if (tabId) {
    if (activeRefinements.has(tabId)) {
      activeRefinements.get(tabId)?.abort();
    }
    activeRefinements.set(tabId, abortController);
  }
  const signal = abortController.signal;

  try {
    const syncStorage = await chrome.storage.sync.get([
      'globalPersona', 'selectedTemplate', 'contextVariables'
    ]);

    const localStorage = await chrome.storage.local.get(['allie_models', 'allie_active_model', 'pa_models', 'pa_active_model']);
    const allieModels = ((localStorage.allie_models || localStorage.pa_models) as Record<string, any>) || {};
    const activeModelId = (localStorage.allie_active_model as any)?.activeModelId || (localStorage.pa_active_model as any)?.activeModelId;

    const effectiveModelId = modelId || activeModelId || 'gemini-2.0-flash';
    let modelConfig = allieModels[effectiveModelId];

    if (!modelConfig) {
      modelConfig = MODEL_CONFIGS[effectiveModelId] || MODEL_CONFIGS['gemini-2.0-flash'];
    }

    modelConfig = { ...modelConfig };
    let rawModel = (modelConfig.model || modelConfig.modelId || effectiveModelId || '').trim();
    if (!rawModel || rawModel.toLowerCase() === 'gemini' || rawModel.toLowerCase() === 'google') {
      rawModel = 'gemini-2.0-flash';
    }
    modelConfig.model = rawModel;

    let effectivePersona = 'Helpful Assistant';
    let sessionId: string | null = null;
    let memoryData: any = null;

    try {
      sessionId = await getCurrentTabSessionId(tabId || null);
      if (sessionId) {
        memoryData = await getSessionMemory(sessionId);
        const personaComponent = memoryData?.components?.persona || memoryData?.components?.persona_synthesizer;
        let synthesizedPersona: string | null = null;

        if (personaComponent?.pinned && personaComponent?.pinnedData) {
          synthesizedPersona = personaComponent.pinnedData.instruction || personaComponent.pinnedData.synthesizedPersona;
        } else if (personaComponent?.current) {
          synthesizedPersona = personaComponent.current.instruction || personaComponent.current.synthesizedPersona;
        }

        if (synthesizedPersona) {
          effectivePersona = synthesizedPersona;
        } else if (syncStorage.globalPersona) {
          effectivePersona = syncStorage.globalPersona;
        }
      } else if (syncStorage.globalPersona) {
        effectivePersona = syncStorage.globalPersona;
      }
    } catch (e) {
      console.warn('[Refinement] Could not get persona:', e);
      if (syncStorage.globalPersona) {
        effectivePersona = syncStorage.globalPersona;
      }
    }

    const counter = await incrementRefinementCounter();
    if (counter >= RECENT_FOCUS_REFRESH_INTERVAL && sessionId) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'REFRESH_RECENT_FOCUS',
            sessionId
          });
          await resetRefinementCounter();
        }
      } catch (e) {
        console.warn('[Refinement] Recent Focus auto-refresh failed:', e);
      }
    }

    let processedText = text;
    if (syncStorage.contextVariables) {
      try {
        const variables = JSON.parse(syncStorage.contextVariables);
        for (const [key, value] of Object.entries(variables)) {
          const escapedKey = String(key).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp('\\{\\{' + escapedKey + '\\}\\}', 'g');
          processedText = processedText.replace(regex, value as string);
        }
      } catch (e) {
        console.warn('Invalid context variables JSON:', e);
      }
    }

    let contextStr = '';
    if (context && context.length > 0) {
      contextStr = `\nRECENT CHAT HISTORY:\n${context.map(m => `[${m.role.toUpperCase()}]: ${m.text}`).join('\n')}\n`;
    }

    let previousPromptsStr = '';
    if (previousPrompts && previousPrompts.length > 0) {
      previousPromptsStr = `\nPROMPT HISTORY WITH USER SATISFACTION:\n${previousPrompts.map((p, i) => {
        const ratingLabel = p.rating ? `User rated AI response: ★${p.rating}/5` : 'Response not yet rated';
        return `${i + 1}. "${p.prompt}"\n   → ${ratingLabel}`;
      }).join('\n')}\n`;
    }

    let disabledFacts: Record<string, any> = {};
    if (sessionId) {
      const disabledKey = `session_${sessionId}_disabled`;
      const disabledResult = await chrome.storage.local.get(disabledKey);
      disabledFacts = disabledResult[disabledKey] || {};
    }

    const v4Context = memoryData ? buildV4RefinementContext(memoryData, disabledFacts) : { formatted: '', dimensions: {}, hasDimensions: false };
    const isPersonaDisabled = disabledFacts['component.persona'] === true || disabledFacts['persona'] === true;
    const personaToUse = isPersonaDisabled ? null : (v4Context.dimensions.persona || effectivePersona);

    if (!isPersonaDisabled && !v4Context.dimensions.persona && personaToUse && personaToUse !== 'Helpful Assistant') {
      v4Context.dimensions.persona = personaToUse;
      const personaSection = `## 🎭 PERSONA (EMBODY THIS EXPERT)\n${personaToUse}`;
      v4Context.formatted = v4Context.formatted
        ? `${personaSection}\n\n${v4Context.formatted}`
        : personaSection;
      v4Context.hasDimensions = true;
    }

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

    return { refined: (llmResponse.text || '').replace(/^"|"$/g, '') };
  } finally {
    if (tabId && activeRefinements.get(tabId) === abortController) {
      activeRefinements.delete(tabId);
    }
  }
}
