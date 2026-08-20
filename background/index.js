/**
 * @fileoverview Main Background Service Worker Entry Point
 * @module background/index
 */

import { bgLog } from './services/logger.js';
import { decryptApiKey, isEncrypted } from './services/crypto.js';
import {
  activeRefinements,
  activeExtractions
} from './services/session-state.js';
import {
  handleSidepanelConnect,
  toggleSidepanel,
  toggleSplitView
} from './services/sidepanel-manager.js';
import {
  getCurrentTabSessionId,
  getSessionMemory,
  updateMemoryComponent,
  pinPersona,
  unpinPersona,
  pinComponent,
  unpinComponent,
  toggleFact,
  rebuildSessionMemory
} from './services/memory-orchestrator.js';
import {
  handleRefinement,
  callLLMForExtraction
} from './services/api-proxy.js';

bgLog('info', 'Background service worker starting (Modular ES Engine)...');

// Open options page on first install if no API key configured
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    bgLog('info', 'Extension installed - checking for API key');
    const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
    if (!geminiApiKey) {
      bgLog('info', 'No API key found - opening options page');
      chrome.runtime.openOptionsPage();
    }
  }
});

// Action Click Handler
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('gemini.google.com')) {
    const openOptions = tab.windowId ? { windowId: tab.windowId } : { tabId: tab.id };
    try {
      await chrome.sidePanel.open(openOptions);
    } catch (err) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } else {
    chrome.runtime.openOptionsPage();
  }
});

// Sidepanel connections
chrome.runtime.onConnect.addListener(handleSidepanelConnect);

// Clean up session storage when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  const key = 'persona_' + tabId;
  if (chrome?.storage?.session) {
    chrome.storage.session.remove(key);
  }
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (command === 'trigger-refine') {
    if (tab?.id && tab.url?.includes('gemini.google.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_REFINE_SHORTCUT' }).catch((err) => {
        console.warn('[Background] Failed to send trigger-refine shortcut:', err.message);
      });
    }
  }

  if (command === 'open-sidepanel') {
    if (tab?.id && tab.url?.includes('gemini.google.com')) {
      const openOptions = tab.windowId ? { windowId: tab.windowId } : { tabId: tab.id };
      try {
        await chrome.sidePanel.open(openOptions);
      } catch (err) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    }
  }
});

// Main Message Router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check API key presence
  if (message.type === 'CHECK_API_KEY') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['geminiApiKey', 'pa_models', 'pa_active_model']);
        if (result.geminiApiKey && result.geminiApiKey.length > 10) {
          sendResponse({ hasKey: true, canOpenOptions: true });
          return;
        }
        if (result.pa_models) {
          const hasEnabledModelWithKey = Object.values(result.pa_models).some(
            model => model.enabled && model.apiKey && model.apiKey.length > 10
          );
          if (hasEnabledModelWithKey) {
            sendResponse({ hasKey: true, canOpenOptions: true });
            return;
          }
        }
        sendResponse({ hasKey: false, canOpenOptions: true });
      } catch (error) {
        sendResponse({ hasKey: false, error: error.message });
      }
    })();
    return true;
  }

  // Open options page
  if (message.type === 'OPEN_OPTIONS_PAGE') {
    chrome.runtime.openOptionsPage();
    return false;
  }

  // Download file
  if (message.type === 'DOWNLOAD_FILE') {
    try {
      const { jsonData, filename } = message.payload || {};
      if (!jsonData || !filename) {
        sendResponse({ success: false, error: 'Missing jsonData or filename' });
        return true;
      }
      const filenameListener = (downloadItem, suggest) => {
        chrome.downloads.onDeterminingFilename.removeListener(filenameListener);
        suggest({ filename: filename });
        return true;
      };
      chrome.downloads.onDeterminingFilename.addListener(filenameListener);
      const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
      const dataUrl = `data:application/json;base64,${base64Data}`;
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: true,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          chrome.downloads.onDeterminingFilename.removeListener(filenameListener);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.type === 'GET_TAB_ID') {
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }

  // Toggle sidepanel open/close from settings icon
  if (message.type === 'TOGGLE_SIDEPANEL') {
    toggleSidepanel(sender, sendResponse);
    return true;
  }

  // Toggle Split View Mode
  // B1 FIX: Now sends acknowledgment response
  if (message.type === 'TOGGLE_SPLIT_VIEW') {
    toggleSplitView(message, sender, sendResponse);
    return true;
  }

  if (message.type === 'REFINE_PROMPT') {
    handleRefinement(message.payload, sender.tab?.id).then(sendResponse);
    return true;
  }

  // Stop/Abort an ongoing refinement request
  if (message.type === 'STOP_REFINEMENT') {
    const tabId = sender.tab?.id;
    if (tabId && activeRefinements.has(tabId)) {
      activeRefinements.get(tabId).abort();
      activeRefinements.delete(tabId);
      bgLog('info', 'Refinement aborted by user', { tabId });
      sendResponse({ success: true, aborted: true });
    } else {
      sendResponse({ success: true, aborted: false, reason: 'No active refinement' });
    }
    return true;
  }

  // Stop/Abort an ongoing persona extraction request
  if (message.type === 'STOP_EXTRACTION') {
    if (activeExtractions.has('persona')) {
      activeExtractions.get('persona').abort();
      activeExtractions.delete('persona');
      bgLog('info', 'Persona extraction aborted by user');
      sendResponse({ success: true, aborted: true });
    } else {
      sendResponse({ success: true, aborted: false, reason: 'No active extraction' });
    }
    return true;
  }

  // Sidepanel message handlers
  if (message.type === 'GET_SESSION_ID') {
    getCurrentTabSessionId().then(sendResponse);
    return true;
  }

  if (message.type === 'GET_MEMORY') {
    getSessionMemory(message.sessionId).then(sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_COMPONENT') {
    updateMemoryComponent(message.sessionId, message.componentId, message.data).then(sendResponse);
    return true;
  }

  if (message.type === 'TOGGLE_FACT') {
    toggleFact(message.sessionId, message.factPath, message.enabled).then(sendResponse);
    return true;
  }

  if (message.type === 'REBUILD_MEMORY') {
    rebuildSessionMemory(message.sessionId, {
      enabledAnalyzers: message.enabledAnalyzers
    }).then(sendResponse);
    return true;
  }

  if (message.type === 'PIN_PERSONA') {
    pinPersona(message.sessionId).then(sendResponse);
    return true;
  }

  if (message.type === 'UNPIN_PERSONA') {
    unpinPersona(message.sessionId).then(sendResponse);
    return true;
  }

  // === GENERIC COMPONENT PIN/UNPIN ===
  // Used for pinning any section (context, tone, constraints, etc.)
  if (message.type === 'PIN_COMPONENT') {
    pinComponent(message.sessionId, message.componentId).then(sendResponse);
    return true;
  }

  if (message.type === 'UNPIN_COMPONENT') {
    unpinComponent(message.sessionId, message.componentId).then(sendResponse);
    return true;
  }

  if (message.type === 'GET_DISABLED_FACTS') {
    const disabledKey = `session_${message.sessionId}_disabled`;
    chrome.storage.local.get(disabledKey).then(result => {
      sendResponse({ success: true, disabledFacts: result[disabledKey] || {} });
    }).catch(err => {
      sendResponse({ success: false, error: err.message, disabledFacts: {} });
    });
    return true;
  }

  // Relay LLM_CONFIG_SAVED to Gemini tabs for SmartAutoRun detection
  // Only broadcast to tabs that don't already have memory (aggressive guard)
  if (message.type === 'LLM_CONFIG_SAVED') {
    console.log(`[Background] LLM_CONFIG_SAVED received from Model Manager`, {
      configured: message.configured,
      modelId: message.modelId
    });
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
        console.log(`[Background] LLM_CONFIG_SAVED: Found ${tabs.length} Gemini tabs to check`);
        let sentCount = 0;
        let skippedCount = 0;

        for (const tab of tabs) {
          if (!tab.id || !tab.url) continue;

          // Extract session ID from tab URL (format: /app/{sessionId})
          const urlMatch = tab.url.match(/\/app\/([a-zA-Z0-9]+)/);
          const sessionId = urlMatch ? urlMatch[1] : null;

          if (!sessionId) {
            // No session ID in URL (e.g., gemini.google.com/app) - skip
            skippedCount++;
            continue;
          }

          // Check if memory already exists for this session
          const sessionKey = `session_${sessionId}`;
          const stored = await chrome.storage.local.get([sessionKey]);

          if (stored[sessionKey]?.components && Object.keys(stored[sessionKey].components).length > 0) {
            // Memory already exists - skip this tab
            skippedCount++;
            continue;
          }

          // No memory - send the message
          chrome.tabs.sendMessage(tab.id, {
            type: 'LLM_CONFIG_SAVED',
            configured: message.configured,
            modelId: message.modelId
          }).catch(err => {
            console.log(`[Background] Could not send to tab ${tab.id}:`, err.message);
          });
          sentCount++;
        }

        console.log(`[Background] LLM_CONFIG_SAVED: sent to ${sentCount} tabs, skipped ${skippedCount} (already have memory)`);
      } catch (error) {
        console.error('[Background] LLM_CONFIG_SAVED broadcast error:', error);
      }
    })();
    return false; // No response needed
  }

  // API Proxy Handler - Forward fetch requests from MAIN world content scripts
  // MAIN world cannot make cross-origin requests, so we proxy through background
  if (message.type === 'API_PROXY_REQUEST') {
    (async () => {
      let keepAliveInterval = null;
      try {
        bgLog('debug', 'API Proxy: Processing request', {
          url: message.url?.substring(0, 50) + '...',
          method: message.options?.method || 'GET'
        });

        // Keep service worker active during long LLM API calls in MV3
        keepAliveInterval = setInterval(() => {
          chrome.runtime.getPlatformInfo(() => {});
        }, 5000);

        const response = await fetch(message.url, message.options);
        const contentType = response.headers.get('content-type') || '';

        let data;
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: data
        });
      } catch (error) {
        bgLog('error', 'API Proxy: Request failed', { error: error.message });
        sendResponse({
          ok: false,
          status: 0,
          error: error.message
        });
      } finally {
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
        }
      }
    })();
    return true; // Keep channel open for async response
  }

  // ========================================================================
  // Persona Extractor Message Handlers
  // ========================================================================

  /**
   * GET_MODEL_CONFIG - Return current active model configuration
   * Used by PersonaExtractor to know which LLM to use for extraction
   */
  if (message.type === 'GET_MODEL_CONFIG') {
    (async () => {
      try {
        const result = await chrome.storage.local.get(['pa_models', 'pa_active_model']);
        const models = result.pa_models || {};
        const activeId = result.pa_active_model;

        // Find active model
        const activeModel = activeId ? models[activeId] : null;

        if (activeModel && activeModel.enabled) {
          // Decrypt API key if needed
          let apiKey = activeModel.apiKey;
          if (isEncrypted(apiKey)) {
            apiKey = await decryptApiKey(apiKey);
          }

          sendResponse({
            provider: activeModel.provider,
            model: activeModel.model,
            apiKey: apiKey,
            modelId: activeId
          });
        } else {
          // Try to find any enabled model
          const enabledModel = Object.entries(models).find(([id, m]) => m.enabled);
          if (enabledModel) {
            let apiKey = enabledModel[1].apiKey;
            if (isEncrypted(apiKey)) {
              apiKey = await decryptApiKey(apiKey);
            }
            sendResponse({
              provider: enabledModel[1].provider,
              model: enabledModel[1].model,
              apiKey: apiKey,
              modelId: enabledModel[0]
            });
          } else {
            sendResponse({ error: 'No model configured' });
          }
        }
      } catch (error) {
        bgLog('error', 'GET_MODEL_CONFIG failed', { error: error.message });
        sendResponse({ error: error.message });
      }
    })();
    return true;
  }

  /**
   * EXTRACT_PERSONA - Use LLM to extract persona from external prompt
   * Called by PersonaExtractor.extractFromPrompt()
   */
  if (message.type === 'EXTRACT_PERSONA') {
    (async () => {
      const { prompt, modelConfig } = message.payload;
      bgLog('info', 'EXTRACT_PERSONA: Starting extraction', {
        provider: modelConfig?.provider,
        promptLength: prompt?.length
      });

      // Create AbortController for this extraction
      const abortController = new AbortController();

      // Cancel any existing extraction
      if (activeExtractions.has('persona')) {
        activeExtractions.get('persona').abort();
      }
      activeExtractions.set('persona', abortController);

      try {
        // Build the full extraction prompt using Structured Expert Prompting (SEP)
        // Based on MIT/Harvard research: 87% higher accuracy, eliminates persona ambiguity        // Build the full extraction prompt using Rigid-Flexible Mapping Strategy
        const extractionPrompt = `You are the "PERSONA ARCHITECT" - an expert Context-Aware Engineer specializing in Structured Expert Prompting (SEP).

## THE PERSONA DEPTH GAP (CRITICAL)
- Standard extraction "compresses" structured prompts, losing 80% of the value.
- Your mission is ZERO INFORMATION LOSS.
- You must Preservation VERBATIM the specific XML sections from the source prompt.

## XML MAPPING STRATEGY (RIGID-FLEXIBLE)
Start by scanning the input for XML tags (e.g., <role>, <context>, <constraints>).
If found, map them DIRECTLY and VERBATIM to the V4 Schema fields below.

| Source Tag (Regex Match) | Target V4 Dimension | Extraction Rule |
|-------------------------|---------------------|-----------------|
| <role>, <task>, <role_definition> | persona.instruction | VERBATIM / NO SUMMARIZATION |
| <context>, <expertise>, <knowledge> | context.instruction | VERBATIM |
| <tone>, <style>, <voice> | tone.instruction | VERBATIM |
| <constraints>, <task_criteria>, <rules>, <prohibitions> | constraints.instruction | VERBATIM (Critical!) |
| <example>, <output_format>, <response_format> | exemplar.instruction / format.instruction | VERBATIM |
| <response_guidelines>, <structure>, <methodology> | framework.instruction | VERBATIM |

## UNKNOWN TAG LOGIC (AUTO-DETECT)
If you find XML tags NOT listed above (e.g., <neuroplasticity_principles>):
1. Analyze its semantic meaning.
2. Place it VERBATIM into the most relevant dimension (likely framework.instruction or context.instruction).
3. Preserve the original tag name and content exactly.

## PROSE/MARKDOWN LOGIC (FALLBACK)
If NO XML tags are found:
1. Parse the text line-by-line for implicit sections (Headers like "# Goal", "**Constraints**").
2. Map these sections to the appropriate dimensions.
3. Extract content VERBATIM.

## V4 SCHEMA STRUCTURE
{
  "instruction": "REQUIRED - comprehensive expert-level text (NEVER empty or generic)",
  "version": 4,
  "source": "extraction",
  "metadata": { /* Structured fields for UI */ }
}

Given the user/system prompt, extract a Structured Expert Persona.
Return JSON with keys: "memory_layer" and "metadata"

## memory_layer (7-Dimension V4 Schema)

### 1. persona (Identity & Credentials)
SOURCE: <role>, <task>, <role_definition> (or implied role)
RULE: Output MUST be a FLOWING PARAGRAPH, NOT a structured list
{
  "instruction": "Write as a CONCRETE PARAGRAPH (not bullet points or labels): 'You are [Full Name], a [Title] with [X years] of experience in [domain]. You hold [specific credentials: PhD, CFA, PMP, etc.]. Your purpose is [specific mission]. Your methodology involves [specific approach].' Include ALL: name, title, years of experience, specific certifications, purpose, and methodology. NEVER use 'Role:', 'Purpose:', 'Credentials:' labels.",
  "version": 4,
  "source": "extraction"
}

### 2. context (Domain & Knowledge)
SOURCE: <context>, <expertise>, <knowledge>
RULE: MUST return domain + AT LEAST 2 scope_tags
{
  "instruction": "Complete domain knowledge: expertise area, terminology, knowledge boundaries, tools/technologies mentioned. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "domain": REQUIRED - One of: "Tech", "Creative", "Business", "Education", "Health", "Lifestyle", "Other",
    "scope_tags": REQUIRED MINIMUM 2 - Array of specific scope keywords (not generic, e.g., "Tax Policy 2026", "Chrome Extensions")
  }
}

### 3. tone (Voice & Style)
SOURCE: <tone>, <style>, <voice>
RULE: Auto-adopt style that MATCHES the output format requirements
{
  "instruction": "Voice characteristics, personality, banned phrases (VERBATIM), required phrases (VERBATIM). If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "style_tags": REQUIRED - Must align with output format (e.g., if JSON output → ["Technical", "Precise"]; if creative → ["Engaging", "Expressive"]),
    "banned_phrases": Array of VERBATIM phrases to avoid
  }
}

### 4. framework (Methodology & Workflow)  
SOURCE: <response_guidelines>, <structure>, <methodology> (or unknown tags)
RULE: Auto-adopt reasoning type matching task complexity
{
  "instruction": "ALL workflow steps (VERBATIM), methodology, operational modes, thinking patterns. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "reasoning_type": REQUIRED - Choose based on task: 
      - Data analysis → "Deductive" or "Step-by-Step"
      - Problem solving → "First-Principles" or "Tree-of-Thought"
      - Creative → "Analogical" or "Creative"
      - Complex multi-step → "Chain-of-Thought"
  }
}

### 5. constraints (Rules & Limits)
SOURCE: <constraints>, <task_criteria>, <rules>, <prohibitions>
RULE: NEVER GENERIC - Extract ALL rules VERBATIM or adopt top-tier for domain
{
  "instruction": "VERBATIM ONLY: Copy EXACT text of all NEVER/DON'T/MUST/ALWAYS rules. Include numeric limits, word counts, format requirements. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "prohibitions": Array of EXACT prohibition phrases from prompt (if none found, adopt 3+ domain-standard prohibitions),
    "requirements": Array of EXACT requirement phrases from prompt (if none found, adopt 3+ domain-standard requirements),
    "response_length": Extract VERBATIM if specified, otherwise adopt appropriate ("Concise", "500 words max", "Detailed")
  }
}

### 6. format (Output Structure)
SOURCE: <output_format>, <response_format>
RULE: Extract ALL output rules/guidelines VERBATIM
{
  "instruction": "VERBATIM: All output structure rules, header requirements, list formats, code block usage, special syntax patterns, wrapper tags. If not specified, infer expert-level credentials matching detected domain by searching your training data for the absolute top-tier.",
  "version": 4,
  "source": "extraction",
  "metadata": {
    "output_type": REQUIRED - One of: "Markdown", "Plaintext", "JSON", "Code", "HTML", "Structured", "Custom"
  }
}

### 7. exemplar (Examples)
SOURCE: <example>, <examples>
RULE: Extract ALL examples VERBATIM, or adopt top-tier examples for domain
{
  "instruction": "VERBATIM: All examples from prompt (good examples, bad examples, edge cases). If NO examples in prompt, generate 2+ TOP-TIER examples that perfectly align with detected domain and persona.",
  "version": 4,
  "source": "extraction"
}

## metadata
- suggested_name: 2-4 words, memorable
- use_case_keywords: Exactly 5 keywords
- primary_intent: One sentence
- target_audience: Who benefits
- complexity_level: "beginner" | "intermediate" | "advanced"
- domain: "tech" | "creative" | "business" | "education" | "health" | "lifestyle" | "other"
- tone: "formal" | "casual" | "friendly" | "professional" | "academic"
- source_type: "external_prompt"

## VALIDATION CHECKLIST (MANDATORY)
Before output, verify:
1. ✓ All XML tags from source are mapped to a dimension
2. ✓ constraints has ACTUAL rules (VERBATIM from <constraints>)
3. ✓ NO summarization of structured sections
4. ✓ All NEVER/MUST/ALWAYS phrases are VERBATIM
5. ✓ NO empty instruction fields

CRITICAL: Return ONLY valid JSON. No markdown, no code blocks.

---
INPUT PROMPT TO ANALYZE:
${prompt}
---

JSON OUTPUT:`;


        // Call LLM with the full extraction prompt (pass abort signal)
        const result = await callLLMForExtraction(extractionPrompt, modelConfig, abortController.signal);

        // Clean up on success
        activeExtractions.delete('persona');
        sendResponse({ ...result, source_prompt: prompt });
      } catch (error) {
        bgLog('error', 'EXTRACT_PERSONA failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * IMPORT_PERSONA_MEMORY - Import a persona's memory layer into current session
   * Called when user imports a persona from Browse view
   */
  if (message.type === 'IMPORT_PERSONA_MEMORY') {
    (async () => {
      const { memoryLayer, personaId, personaName } = message.payload;
      bgLog('info', 'IMPORT_PERSONA_MEMORY: Importing', { hasPersonaId: !!personaId, personaName });

      try {
        // Get current session ID
        const sessionId = await getCurrentTabSessionId();
        if (!sessionId) {
          sendResponse({ success: false, error: 'No active Gemini session' });
          return;
        }

        // Store imported memory layer
        const storageKey = `session_${sessionId}`;
        const result = await chrome.storage.local.get(storageKey);
        const memory = result[storageKey] || { sessionId, components: {} };

        // Merge imported memory layer into session memory
        // Schema v3: 7-dimension industry standard (persona, context, exemplar, format, tone, framework, constraints)
        // Also supports legacy format for backwards compatibility

        const dimensionNames = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'];

        // Import new 7-dimension schema
        for (const dim of dimensionNames) {
          if (memoryLayer[dim]) {
            memory.components[dim] = {
              current: memoryLayer[dim],
              history: [],
              ...(dim === 'persona' ? {
                imported: true,
                importedAt: Date.now(),
                importedPersonaId: personaId,
                personaName: personaName || 'Imported Persona'
              } : {})
            };
          }
        }

        // Backwards compatibility: map old schema to new dimensions
        // Only if new schema fields are empty
        if (!memory.components.persona && memoryLayer.persona_synthesizer) {
          memory.components.persona = {
            current: {
              role: memoryLayer.persona_synthesizer.synthesizedPersona || '',
              purpose: memoryLayer.persona_synthesizer.primaryDomain || '',
              name: memoryLayer.persona_synthesizer.personaName || null,
              title: null,
              creator: null,
              credentials: null
            },
            history: [],
            imported: true,
            importedAt: Date.now(),
            importedPersonaId: personaId,
            personaName: personaName || 'Imported Persona',
            _legacyMigrated: true
          };
        }
        if (!memory.components.context && memoryLayer.topic_summarizer) {
          memory.components.context = {
            current: {
              domain: memoryLayer.topic_summarizer.primaryTopic || '',
              terminology: (memoryLayer.custom_context?.domainTerminology || []).map(t => ({ term: t, definition: '' })),
              knowledge_boundaries: null,
              environment: null
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.tone && memoryLayer.style_profiler) {
          memory.components.tone = {
            current: {
              voice: memoryLayer.style_profiler.tone || '',
              style: memoryLayer.style_profiler.directness === 'direct' ? 'direct' : 'professional',
              verbosity: { level: memoryLayer.style_profiler.verbosity || 'moderate', max_length: null },
              banned_phrases: [],
              required_phrases: [],
              anti_priorities: []
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.constraints && memoryLayer.custom_context) {
          memory.components.constraints = {
            current: {
              prohibitions: (memoryLayer.custom_context.constraints || []).map(c => ({ rule: c, severity: 'hard', context: null })),
              requirements: (memoryLayer.custom_context.requirements || []).map(r => ({ rule: r, context: null })),
              thresholds: Object.entries(memoryLayer.custom_context.numericalLimits || {}).map(([k, v]) => ({ metric: k, limit: String(v), action: '' })),
              safety_rules: []
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.exemplar && memoryLayer.custom_context?.examplesFromPrompt) {
          memory.components.exemplar = {
            current: {
              good_examples: memoryLayer.custom_context.examplesFromPrompt.map(e => ({ scenario: '', input: e, output: '', explanation: null })),
              bad_examples: [],
              edge_cases: (memoryLayer.custom_context.edgeCases || []).map(e => ({ situation: e, handling: '' }))
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.framework && memoryLayer.custom_context?.workflowSteps) {
          memory.components.framework = {
            current: {
              methodology: null,
              reasoning_pattern: null,
              modes: [],
              workflow: memoryLayer.custom_context.workflowSteps.map((s, i) => ({ step: i + 1, action: s, condition: null }))
            },
            history: [],
            _legacyMigrated: true
          };
        }
        if (!memory.components.format && memoryLayer.custom_context?.formatInstructions) {
          memory.components.format = {
            current: {
              output_type: 'markdown',
              structure: { use_headers: true, use_lists: true, use_code_blocks: true, use_tables: false },
              citations: null,
              special_syntax: memoryLayer.custom_context.formatInstructions,
              wrapper_tags: []
            },
            history: [],
            _legacyMigrated: true
          };
        }

        memory.lastUpdated = Date.now();
        memory.importedPersona = personaId || null;

        await chrome.storage.local.set({ [storageKey]: memory });
        bgLog('info', 'IMPORT_PERSONA_MEMORY: Success', { sessionId });
        sendResponse({ success: true });
      } catch (error) {
        bgLog('error', 'IMPORT_PERSONA_MEMORY failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * CHECK_RATING_ELIGIBILITY - Check if user should see rating prompt
   * Shows rating UI after 3+ prompt/response pairs with imported persona
   */
  if (message.type === 'CHECK_RATING_ELIGIBILITY') {
    (async () => {
      try {
        const sessionId = await getCurrentTabSessionId();
        if (!sessionId) {
          sendResponse({ eligible: false });
          return;
        }

        const storageKey = `session_${sessionId}`;
        const result = await chrome.storage.local.get(storageKey);
        const memory = result[storageKey];

        // Check if persona was imported
        if (!memory?.importedPersona) {
          sendResponse({ eligible: false });
          return;
        }

        // Check if already rated
        const ratingKey = `rating_${memory.importedPersona}`;
        const ratingResult = await chrome.storage.local.get(ratingKey);
        if (ratingResult[ratingKey]?.submitted) {
          sendResponse({ eligible: false, alreadyRated: true });
          return;
        }

        // Check exchange count (from topic_summarizer history as proxy)
        const exchangeCount = memory.components?.topic_summarizer?.history?.length || 0;
        const MIN_EXCHANGES = 3;

        if (exchangeCount >= MIN_EXCHANGES) {
          sendResponse({
            eligible: true,
            personaId: memory.importedPersona,
            exchangeCount
          });
        } else {
          sendResponse({
            eligible: false,
            personaId: memory.importedPersona,
            exchangeCount,
            remaining: MIN_EXCHANGES - exchangeCount
          });
        }
      } catch (error) {
        bgLog('error', 'CHECK_RATING_ELIGIBILITY failed', { error: error.message });
        sendResponse({ eligible: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * SUBMIT_RATING - Submit a rating for an imported persona
   */
  if (message.type === 'SUBMIT_RATING') {
    (async () => {
      const { personaId, rating } = message.payload;
      bgLog('info', 'SUBMIT_RATING', { personaId, rating });

      try {
        // Validate rating
        if (!personaId || rating < 1 || rating > 5) {
          sendResponse({ success: false, error: 'Invalid rating' });
          return;
        }

        // Store rating locally
        const ratingKey = `rating_${personaId}`;
        await chrome.storage.local.set({
          [ratingKey]: {
            personaId,
            rating,
            submittedAt: Date.now(),
            submitted: true
          }
        });

        // TODO: Submit to Supabase when connected
        // Try to submit to Supabase if available
        bgLog('info', 'Rating stored locally', { personaId, rating });

        sendResponse({ success: true });
      } catch (error) {
        bgLog('error', 'SUBMIT_RATING failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * SCAN_CONTENT - Pre-publish content moderation scan
   * Uses keyword matching to detect potentially problematic content
   */
  if (message.type === 'SCAN_CONTENT') {
    (async () => {
      const { content, personaName } = message.payload;
      bgLog('info', 'SCAN_CONTENT: Starting scan', { personaName });

      try {
        // Moderation word lists
        const severeTerms = [
          'kill', 'murder', 'suicide', 'terrorist', 'bomb', 'weapon',
          'child abuse', 'sexual', 'explicit', 'nude', 'porn',
          'racist', 'nazi', 'hate crime', 'assault'
        ];

        const warningTerms = [
          'hack', 'crack', 'pirate', 'illegal', 'drug', 'addict',
          'violence', 'fight', 'attack', 'hate', 'abuse',
          'password', 'steal', 'scam', 'fraud'
        ];

        const contentLower = content.toLowerCase();

        // Check for severe terms (block)
        const severeFound = severeTerms.filter(term =>
          contentLower.includes(term.toLowerCase())
        );

        if (severeFound.length > 0) {
          sendResponse({
            passed: false,
            severity: 'blocked',
            message: 'Content contains prohibited terms and cannot be published.',
            flaggedTerms: severeFound
          });
          return;
        }

        // Check for warning terms (allow with review)
        const warningFound = warningTerms.filter(term =>
          contentLower.includes(term.toLowerCase())
        );

        if (warningFound.length > 0) {
          sendResponse({
            passed: true,
            severity: 'warning',
            message: 'Content may need review. Proceed with caution.',
            flaggedTerms: warningFound
          });
          return;
        }

        // All clear
        sendResponse({
          passed: true,
          severity: 'clean',
          message: 'Content passed moderation checks.'
        });

      } catch (error) {
        bgLog('error', 'SCAN_CONTENT failed', { error: error.message });
        sendResponse({ passed: false, error: error.message });
      }
    })();
    return true;
  }

  /**
   * REPORT_PERSONA - Submit a report for a persona
   */
  if (message.type === 'REPORT_PERSONA') {
    (async () => {
      const { personaId, reason, details } = message.payload;
      bgLog('info', 'REPORT_PERSONA', { personaId, reason });

      try {
        // Store report locally
        const reportKey = `report_${personaId}_${Date.now()}`;
        await chrome.storage.local.set({
          [reportKey]: {
            personaId,
            reason,
            details,
            reportedAt: Date.now(),
            status: 'pending'
          }
        });

        // Also add to reports list
        const result = await chrome.storage.local.get('persona_reports');
        const reports = result.persona_reports || [];
        reports.push({
          id: reportKey,
          personaId,
          reason,
          details,
          reportedAt: Date.now()
        });
        await chrome.storage.local.set({ persona_reports: reports });

        bgLog('info', 'Report submitted', { personaId });
        sendResponse({ success: true });

      } catch (error) {
        bgLog('error', 'REPORT_PERSONA failed', { error: error.message });
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// ============================================================================
// Sidepanel Helper Functions
// ============================================================================

/**
/**
 * Get session ID from current active tab or specified tabId
 * @param {number} [targetTabId] - Optional specific tab ID to query
 * @returns {Promise<string|null>}
 */
