/**
 * @fileoverview Main Background Service Worker Entry Point (WXT MV3)
 * Ported from background/index.js (1,025 lines)
 */

import { bgLog } from '../src/core/orchestration/bg-logger';
import { handleSidepanelConnect, toggleSidepanel, toggleSplitView } from '../src/core/orchestration/sidepanel-manager';
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
} from '../src/core/orchestration/memory-orchestrator';
import { handleRefinement, callLLMForExtraction } from '../src/core/orchestration/api-proxy';
import { activeRefinements, activeExtractions } from '../src/core/orchestration/session-state';
import { decryptApiKey, isEncrypted } from '../src/core/crypto/crypto-service';

export default defineBackground(() => {
  bgLog('info', 'Background service worker starting (WXT Modular Engine)...');

  // 1. Session storage access level for content script bridge access
  if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
    (chrome.storage.session as any).setAccessLevel({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    }).catch((err: any) => {
      bgLog('warn', 'Failed to set session storage access level', { error: err?.message });
    });
  }

  // 2. Install / Update Lifecycle
  chrome.runtime.onInstalled.addListener(async (details) => {
    if (typeof chrome !== 'undefined' && (chrome?.storage?.session as any)?.setAccessLevel) {
      (chrome.storage.session as any).setAccessLevel({
        accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
      }).catch(() => {});
    }
    if (details.reason === 'install') {
      bgLog('info', 'Extension installed - checking for API key');
      const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
      if (!geminiApiKey) {
        bgLog('info', 'No API key found - opening options page');
        chrome.runtime.openOptionsPage();
      }
    }
  });

  // 3. Action Click Handler (Universal Sidepanel / Options Router)
  chrome.action.onClicked.addListener(async (tab) => {
    if (tab.url && (
      tab.url.includes('gemini.google.com') ||
      tab.url.includes('chatgpt.com') ||
      tab.url.includes('chat.openai.com') ||
      tab.url.includes('claude.ai') ||
      tab.url.includes('chat.deepseek.com') ||
      tab.url.includes('grok.com') ||
      tab.url.includes('x.com/i/grok') ||
      tab.url.includes('meta.ai')
    )) {
      const openOptions = tab.windowId ? { windowId: tab.windowId } : { tabId: tab.id };
      try {
        await (chrome.sidePanel as any).open(openOptions);
      } catch {
        if (tab.id) {
          await (chrome.sidePanel as any).open({ tabId: tab.id });
        }
      }
    } else {
      chrome.runtime.openOptionsPage();
    }
  });

  // 4. Port Connections (Sidepanel & Keep-Alive)
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'keep-alive') {
      bgLog('debug', 'Keep-alive port connected');
      port.onDisconnect.addListener(() => {
        bgLog('debug', 'Keep-alive port disconnected');
      });
      return;
    }
    handleSidepanelConnect(port);
  });

  // 5. Clean up session storage when tab is closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    const key = 'persona_' + tabId;
    if (typeof chrome !== 'undefined' && chrome?.storage?.session) {
      chrome.storage.session.remove(key);
    }
  });

  // 6. Keyboard Shortcuts (Commands)
  chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (command === 'trigger-refine' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'TRIGGER_REFINE_SHORTCUT' }).catch(() => {});
    }

    if (command === 'open-sidepanel' && tab?.id) {
      const openOptions = tab.windowId ? { windowId: tab.windowId } : { tabId: tab.id };
      try {
        await (chrome.sidePanel as any).open(openOptions);
      } catch {
        await (chrome.sidePanel as any).open({ tabId: tab.id });
      }
    }
  });

  // 7. Comprehensive Top-Level Message Dispatcher (MV3 Invariant)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    // CHECK_API_KEY
    if (message.type === 'CHECK_API_KEY') {
      (async () => {
        try {
          const result = await chrome.storage.local.get(['geminiApiKey', 'allie_models', 'allie_active_model', 'pa_models', 'pa_active_model']);
          if (result.geminiApiKey && (result.geminiApiKey as string).length > 10) {
            sendResponse({ hasKey: true, canOpenOptions: true });
            return;
          }
          const models = (result.allie_models || result.pa_models) as Record<string, any> | undefined;
          if (models) {
            const hasEnabledModelWithKey = Object.values(models).some(
              model => model.enabled && model.apiKey && model.apiKey.length > 10
            );
            if (hasEnabledModelWithKey) {
              sendResponse({ hasKey: true, canOpenOptions: true });
              return;
            }
          }
          sendResponse({ hasKey: false, canOpenOptions: true });
        } catch (error: any) {
          sendResponse({ hasKey: false, error: error.message });
        }
      })();
      return true;
    }

    // OPEN_OPTIONS_PAGE
    if (message.type === 'OPEN_OPTIONS_PAGE') {
      chrome.runtime.openOptionsPage();
      return false;
    }

    // DOWNLOAD_FILE
    if (message.type === 'DOWNLOAD_FILE') {
      try {
        const { jsonData, filename } = message.payload || {};
        if (!jsonData || !filename) {
          sendResponse({ success: false, error: 'Missing jsonData or filename' });
          return true;
        }
        const filenameListener = (_downloadItem: any, suggest: any) => {
          chrome.downloads.onDeterminingFilename.removeListener(filenameListener);
          suggest({ filename });
          return true;
        };
        chrome.downloads.onDeterminingFilename.addListener(filenameListener);
        const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
        const dataUrl = `data:application/json;base64,${base64Data}`;
        chrome.downloads.download({
          url: dataUrl,
          filename,
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
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
      return true;
    }

    // GET_TAB_ID
    if (message.type === 'GET_TAB_ID') {
      sendResponse({ tabId: sender.tab?.id });
      return true;
    }

    // TOGGLE_SIDEPANEL
    if (message.type === 'TOGGLE_SIDEPANEL') {
      toggleSidepanel(sender, sendResponse);
      return true;
    }

    // TOGGLE_SPLIT_VIEW
    if (message.type === 'TOGGLE_SPLIT_VIEW') {
      toggleSplitView(message.payload || message, sender, sendResponse);
      return true;
    }

    // REFINE_PROMPT
    if (message.type === 'REFINE_PROMPT') {
      handleRefinement(message.payload || message, sender.tab?.id).then(sendResponse);
      return true;
    }

    // STOP_REFINEMENT
    if (message.type === 'STOP_REFINEMENT') {
      const tabId = sender.tab?.id;
      if (tabId && activeRefinements.has(tabId)) {
        activeRefinements.get(tabId)?.abort();
        activeRefinements.delete(tabId);
        bgLog('info', 'Refinement aborted by user', { tabId });
        sendResponse({ success: true, aborted: true });
      } else {
        sendResponse({ success: true, aborted: false, reason: 'No active refinement' });
      }
      return true;
    }

    // STOP_EXTRACTION
    if (message.type === 'STOP_EXTRACTION') {
      if (activeExtractions.has('persona')) {
        activeExtractions.get('persona')?.abort();
        activeExtractions.delete('persona');
        bgLog('info', 'Persona extraction aborted by user');
        sendResponse({ success: true, aborted: true });
      } else {
        sendResponse({ success: true, aborted: false, reason: 'No active extraction' });
      }
      return true;
    }

    // Session Memory Handlers
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

    if (message.type === 'PIN_COMPONENT') {
      pinComponent(message.sessionId, message.componentId).then(sendResponse);
      return true;
    }

    if (message.type === 'UNPIN_COMPONENT') {
      unpinComponent(message.sessionId, message.componentId).then(sendResponse);
      return true;
    }

    if (message.type === 'TOGGLE_SPLIT_VIEW') {
      (async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SPLIT_VIEW', fromIframe: message.fromIframe });
          }
          sendResponse({ success: true });
        } catch (err: any) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    if (message.type === 'SAVE_INJECTED_CONTEXT') {
      (async () => {
        try {
          if (chrome.storage?.session) {
            await chrome.storage.session.set({
              user_injected_context: { text: message.text, injectedAt: Date.now() }
            });
          }
          sendResponse({ success: true });
        } catch (err: any) {
          sendResponse({ success: false, error: err.message });
        }
      })();
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

    // Broadcast LLM_CONFIG_SAVED
    if (message.type === 'LLM_CONFIG_SAVED') {
      (async () => {
        try {
          const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
          for (const tab of tabs) {
            if (!tab.id || !tab.url) continue;
            const urlMatch = tab.url.match(/\/app\/([a-zA-Z0-9]+)/);
            const sessionId = urlMatch ? urlMatch[1] : null;
            if (!sessionId) continue;

            const sessionKey = `session_${sessionId}`;
            const stored = await chrome.storage.local.get([sessionKey]);
            if (stored[sessionKey]?.components && Object.keys(stored[sessionKey].components).length > 0) {
              continue;
            }

            chrome.tabs.sendMessage(tab.id, {
              type: 'LLM_CONFIG_SAVED',
              configured: message.configured,
              modelId: message.modelId
            }).catch(() => {});
          }
        } catch (error) {
          console.error('[Background] LLM_CONFIG_SAVED broadcast error:', error);
        }
      })();
      return false;
    }

    // API_PROXY_REQUEST
    if (message.type === 'API_PROXY_REQUEST') {
      (async () => {
        try {
          const ALLOWED_PROXY_HOSTS = [
            'generativelanguage.googleapis.com',
            'api.openai.com',
            'api.anthropic.com',
            'openrouter.ai'
          ];

          let targetUrl: URL;
          try {
            targetUrl = new URL(message.url);
          } catch {
            sendResponse({ ok: false, status: 400, error: 'Invalid URL supplied to API proxy' });
            return;
          }

          if (targetUrl.protocol !== 'https:' || !ALLOWED_PROXY_HOSTS.includes(targetUrl.hostname)) {
            bgLog('warn', 'API Proxy: Blocked unauthorized host', { host: targetUrl.hostname });
            sendResponse({ ok: false, status: 403, error: `Host '${targetUrl.hostname}' not permitted by extension security policy` });
            return;
          }

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
            data
          });
        } catch (error: any) {
          bgLog('error', 'API Proxy: Request failed', { error: error.message });
          sendResponse({ ok: false, status: 0, error: error.message });
        }
      })();
      return true;
    }

    // GET_MODEL_CONFIG
    if (message.type === 'GET_MODEL_CONFIG') {
      (async () => {
        try {
          const result = await chrome.storage.local.get(['allie_models', 'allie_active_model', 'pa_models', 'pa_active_model']);
          const models = ((result.allie_models || result.pa_models) as Record<string, any>) || {};
          const rawActive = result.allie_active_model || result.pa_active_model;
          const activeId = (rawActive as any)?.activeModelId || rawActive;
          const activeModel = activeId ? models[activeId] : null;

          if (activeModel && activeModel.enabled) {
            let apiKey = activeModel.apiKey;
            if (isEncrypted(apiKey)) {
              const dec = await decryptApiKey(apiKey);
              if (dec) apiKey = dec;
            }
            sendResponse({
              provider: activeModel.provider,
              model: activeModel.model,
              apiKey,
              modelId: activeId
            });
          } else {
            const enabledModel = Object.entries(models).find(([_, m]) => m.enabled);
            if (enabledModel) {
              let apiKey = enabledModel[1].apiKey;
              if (isEncrypted(apiKey)) {
                const dec = await decryptApiKey(apiKey);
                if (dec) apiKey = dec;
              }
              sendResponse({
                provider: enabledModel[1].provider,
                model: enabledModel[1].model,
                apiKey,
                modelId: enabledModel[0]
              });
            } else {
              sendResponse({ error: 'No model configured' });
            }
          }
        } catch (error: any) {
          bgLog('error', 'GET_MODEL_CONFIG failed', { error: error.message });
          sendResponse({ error: error.message });
        }
      })();
      return true;
    }

    // EXTRACT_PERSONA
    if (message.type === 'EXTRACT_PERSONA') {
      (async () => {
        const { prompt, modelConfig } = message.payload || {};
        const abortController = new AbortController();
        if (activeExtractions.has('persona')) {
          activeExtractions.get('persona')?.abort();
        }
        activeExtractions.set('persona', abortController);

        try {
          const result = await callLLMForExtraction(prompt, modelConfig, abortController.signal);
          activeExtractions.delete('persona');
          sendResponse({ ...result, source_prompt: prompt });
        } catch (error: any) {
          bgLog('error', 'EXTRACT_PERSONA failed', { error: error.message });
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    // IMPORT_PERSONA_MEMORY
    if (message.type === 'IMPORT_PERSONA_MEMORY') {
      (async () => {
        const { memoryLayer, personaId, personaName } = message.payload || {};
        try {
          const sessionId = await getCurrentTabSessionId();
          if (!sessionId) {
            sendResponse({ success: false, error: 'No active Gemini session' });
            return;
          }

          const storageKey = `session_${sessionId}`;
          const result = await chrome.storage.local.get(storageKey);
          const memory = result[storageKey] || { sessionId, components: {} };

          const dimensionNames = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'];
          for (const dim of dimensionNames) {
            if (memoryLayer && memoryLayer[dim]) {
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

          memory.lastUpdated = Date.now();
          memory.importedPersona = personaId || null;
          await chrome.storage.local.set({ [storageKey]: memory });
          sendResponse({ success: true });
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    // CHECK_RATING_ELIGIBILITY
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

          if (!memory?.importedPersona) {
            sendResponse({ eligible: false });
            return;
          }

          const ratingKey = `rating_${memory.importedPersona}`;
          const ratingResult = await chrome.storage.local.get(ratingKey);
          if (ratingResult[ratingKey]?.submitted) {
            sendResponse({ eligible: false, alreadyRated: true });
            return;
          }

          const exchangeCount = memory.components?.topic_summarizer?.history?.length || 0;
          const MIN_EXCHANGES = 3;

          if (exchangeCount >= MIN_EXCHANGES) {
            sendResponse({ eligible: true, personaId: memory.importedPersona, exchangeCount });
          } else {
            sendResponse({ eligible: false, personaId: memory.importedPersona, exchangeCount, remaining: MIN_EXCHANGES - exchangeCount });
          }
        } catch (error: any) {
          sendResponse({ eligible: false, error: error.message });
        }
      })();
      return true;
    }

    // SUBMIT_RATING
    if (message.type === 'SUBMIT_RATING') {
      (async () => {
        const { personaId, rating } = message.payload || {};
        try {
          if (!personaId || rating < 1 || rating > 5) {
            sendResponse({ success: false, error: 'Invalid rating' });
            return;
          }

          const ratingKey = `rating_${personaId}`;
          await chrome.storage.local.set({
            [ratingKey]: {
              personaId,
              rating,
              submittedAt: Date.now(),
              submitted: true
            }
          });
          sendResponse({ success: true });
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    // SCAN_CONTENT
    if (message.type === 'SCAN_CONTENT') {
      (async () => {
        const { content } = message.payload || {};
        try {
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

          const contentLower = (content || '').toLowerCase();
          const severeFound = severeTerms.filter(term => contentLower.includes(term.toLowerCase()));

          if (severeFound.length > 0) {
            sendResponse({
              passed: false,
              severity: 'blocked',
              message: 'Content contains prohibited terms and cannot be published.',
              flaggedTerms: severeFound
            });
            return;
          }

          const warningFound = warningTerms.filter(term => contentLower.includes(term.toLowerCase()));
          if (warningFound.length > 0) {
            sendResponse({
              passed: true,
              severity: 'warning',
              message: 'Content may need review. Proceed with caution.',
              flaggedTerms: warningFound
            });
            return;
          }

          sendResponse({
            passed: true,
            severity: 'clean',
            message: 'Content passed moderation checks.'
          });
        } catch (error: any) {
          sendResponse({ passed: false, error: error.message });
        }
      })();
      return true;
    }

    // REPORT_PERSONA
    if (message.type === 'REPORT_PERSONA') {
      (async () => {
        const { personaId, reason, details } = message.payload || {};
        try {
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

          const result = await chrome.storage.local.get('persona_reports');
          const reports = (result.persona_reports as any[]) || [];
          reports.push({
            id: reportKey,
            personaId,
            reason,
            details,
            reportedAt: Date.now()
          });
          await chrome.storage.local.set({ persona_reports: reports });
          sendResponse({ success: true });
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    // CHECK_RATING_ELIGIBILITY
    if (message.type === 'CHECK_RATING_ELIGIBILITY') {
      sendResponse({ eligible: false, message: 'Rating eligibility check completed.' });
      return true;
    }

    // SAVE_DRAFT (Dual-envelope support for both RPC and legacy sendMessage)
    if (message.type === 'SAVE_DRAFT') {
      (async () => {
        try {
          const draftPayload = message.payload !== undefined ? message.payload : (message.data ?? message);
          const result = await chrome.storage.local.get('persona_drafts');
          const drafts = (result.persona_drafts as any[]) || [];
          drafts.push(draftPayload);
          await chrome.storage.local.set({ persona_drafts: drafts });
          bgLog('info', 'Persona draft saved', { id: draftPayload?.id });
          sendResponse({ success: true, draftId: draftPayload?.id });
        } catch (error: any) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    return false;
  });
});
