import React from 'react';
import ReactDOM from 'react-dom/client';
import { GeminiAdapter } from '../../src/adapters/chatbots/gemini/adapter';
import { GEMINI_SELECTORS, findElement } from '../../src/adapters/chatbots/gemini/selectors';
import { contentObserver } from '../../src/content/observer';
import { RefineToggle, SettingsButton, ScraperToolbar } from './components';

import tokensCss from './theme/tokens.css?inline';
import geminiCss from './gemini.css?inline';
import refineToggleCss from './components/RefineToggle.css?inline';
import settingsButtonCss from './components/SettingsButton.css?inline';
import scraperToolbarCss from './components/ScraperToolbar.css?inline';
import geminiTooltipCss from './components/GeminiTooltip.css?inline';

export default defineContentScript({
  matches: ['*://gemini.google.com/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    console.log('[Allie] Initializing Gemini Modular Platform Content Script');

    // 1. Inject host layout fix: allow protrusion of external settings button
    const hostStyleId = 'allie-gemini-host-styles';
    let hostStyleEl = document.getElementById(hostStyleId) as HTMLStyleElement | null;
    if (!hostStyleEl) {
      hostStyleEl = document.createElement('style');
      hostStyleEl.id = hostStyleId;
      hostStyleEl.textContent = `
        .text-input-field {
          overflow: visible !important;
          position: relative !important;
        }
      `;
      (document.head || document.documentElement).appendChild(hostStyleEl);
    }

    // Initialize content script observer (listeners, theme, shortcuts)
    contentObserver.init();

    const adapter = new GeminiAdapter();
    let isRefineActive = true;
    let unregisterSubmit: (() => void) | null = null;

    // Resilient element waiter supporting dynamic Angular SPA rendering
    function waitForElement<T extends Element = HTMLElement>(
      resolver: () => T | null,
      timeoutMs = 15000
    ): Promise<T | null> {
      const el = resolver();
      if (el) return Promise.resolve(el);

      return new Promise((resolve) => {
        let timer: any = null;
        const observer = new MutationObserver(() => {
          const found = resolver();
          if (found) {
            observer.disconnect();
            clearTimeout(timer);
            resolve(found);
          }
        });

        timer = setTimeout(() => {
          observer.disconnect();
          resolve(resolver());
        }, timeoutMs);

        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      });
    }

    // Dynamic theme synchronizer matching Gemini's document.body class & color scheme
    function syncThemeToHost(host: HTMLElement | null | undefined) {
      if (!host || typeof document === 'undefined') return;
      let isLight = document.body.classList.contains('light-theme');
      if (!isLight && !document.body.classList.contains('dark-theme')) {
        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb[0] && rgb[1] && rgb[2]) {
          const r = parseInt(rgb[0], 10) || 0;
          const g = parseInt(rgb[1], 10) || 0;
          const b = parseInt(rgb[2], 10) || 0;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          isLight = brightness >= 128;
        }
      }
      if (isLight) {
        host.classList.add('light-theme');
        host.classList.remove('dark-theme');
      } else {
        host.classList.add('dark-theme');
        host.classList.remove('light-theme');
      }
    }

    let toggleUi: Awaited<ReturnType<typeof createShadowRootUi<ReactDOM.Root>>> | null = null;
    let toggleRoot: ReactDOM.Root | null = null;
    let settingsUi: Awaited<ReturnType<typeof createShadowRootUi<ReactDOM.Root>>> | null = null;
    let settingsRoot: ReactDOM.Root | null = null;
    let hasActivePersona = false;
    let isMounting = false;
    let resizeObserver: ResizeObserver | null = null;

    function renderRefineToggle() {
      if (!toggleRoot) return;
      toggleRoot.render(
        <RefineToggle
          enabled={isRefineActive}
          onToggle={(active) => {
            isRefineActive = active;
            renderRefineToggle();
            if (settingsUi?.shadowHost) {
              settingsUi.shadowHost.classList.toggle('allie-hidden', !active);
              settingsUi.shadowHost.style.setProperty('display', active ? 'inline-flex' : 'none', 'important');
            }
          }}
        />
      );
    }

    // Resolves the currently active, visible composer input container in Gemini
    function getActiveComposerContainer(): HTMLElement | null {
      const inputField = document.querySelector<HTMLElement>('.text-input-field');
      if (inputField && inputField.offsetParent !== null) {
        return inputField;
      }
      const inputAreaV2 = document.querySelector<HTMLElement>('input-area-v2');
      if (inputAreaV2 && inputAreaV2.offsetParent !== null) {
        return inputAreaV2;
      }
      const inputContainer = document.querySelector<HTMLElement>('input-container');
      if (inputContainer && inputContainer.offsetParent !== null) {
        return inputContainer;
      }
      return findElement<HTMLElement>(GEMINI_SELECTORS.inputArea) ||
             findElement<HTMLElement>(GEMINI_SELECTORS.textInputField)?.parentElement || null;
    }

    // Position updater for fixed SettingsButton outside composer
    function updateSettingsPosition() {
      if (!settingsUi?.shadowHost || !settingsUi.shadowHost.isConnected) return;
      const inputContainer = getActiveComposerContainer();
      if (!inputContainer) return;
      const rect = inputContainer.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const targetLeft = `${rect.right + 12}px`;

      // Bottom-anchored positioning: align with bottom action bar / submit button
      const submitBtn = findElement<HTMLElement>(GEMINI_SELECTORS.submitButton) ||
                        findElement<HTMLElement>(GEMINI_SELECTORS.trailingActions);
      let targetTop: string;
      if (submitBtn && submitBtn.isConnected) {
        const btnRect = submitBtn.getBoundingClientRect();
        if (btnRect.height > 0 && btnRect.bottom > 0) {
          targetTop = `${btnRect.top + btnRect.height / 2 - 20}px`;
        } else {
          targetTop = `${rect.bottom - 44}px`;
        }
      } else {
        targetTop = `${rect.bottom - 44}px`;
      }

      settingsUi.shadowHost.style.setProperty('--allie-settings-left', targetLeft);
      settingsUi.shadowHost.style.setProperty('--allie-settings-top', targetTop);
      settingsUi.shadowHost.style.setProperty('position', 'fixed', 'important');
      settingsUi.shadowHost.style.setProperty('left', targetLeft, 'important');
      settingsUi.shadowHost.style.setProperty('top', targetTop, 'important');
      settingsUi.shadowHost.style.setProperty('z-index', '10000', 'important');
      settingsUi.shadowHost.style.setProperty('pointer-events', 'auto', 'important');
      settingsUi.shadowHost.classList.toggle('allie-hidden', !isRefineActive);
      settingsUi.shadowHost.style.setProperty('display', isRefineActive ? 'inline-flex' : 'none', 'important');
    }

    let dynamicTrackingRaf: number | null = null;
    function startDynamicTracking(durationMs = 2500) {
      if (dynamicTrackingRaf) cancelAnimationFrame(dynamicTrackingRaf);
      const start = performance.now();
      function step(now: number) {
        updateSettingsPosition();
        if (now - start < durationMs) {
          dynamicTrackingRaf = requestAnimationFrame(step);
        } else {
          dynamicTrackingRaf = null;
        }
      }
      dynamicTrackingRaf = requestAnimationFrame(step);
    }

    const onScrollOrResize = () => {
      updateSettingsPosition();
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true, capture: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    function renderSettingsButton() {
      if (!settingsRoot) return;
      settingsRoot.render(
        <ScraperToolbar
          hasActivePersona={hasActivePersona}
          onSettingsClick={() => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: 'TOGGLE_SIDEPANEL' }).catch((err) => {
                console.warn('[Allie Gemini] Failed to toggle sidepanel:', err);
              });
            }
          }}
          onExportClick={async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              await new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'HARVEST_EXPORT_ACTIVE_TAB' }, (res) => {
                  if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                  else if (res?.error) reject(new Error(res.error));
                  else resolve();
                });
              });
            }
          }}
          onSyncClick={async () => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              await new Promise<void>((resolve, reject) => {
                chrome.runtime.sendMessage({ type: 'HARVEST_SYNC_ACTIVE_TAB' }, (res) => {
                  if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                  else if (res?.error) reject(new Error(res.error));
                  else resolve();
                });
              });
            }
          }}
        />
      );
    }

    async function checkActivePersona(): Promise<boolean> {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          const res = await chrome.storage.local.get([
            'activePersona',
            'currentPersona',
            'allie_active_persona'
          ]);
          if (res.activePersona || res.currentPersona || res.allie_active_persona) {
            return true;
          }

          // Check URL-based session
          if (typeof window !== 'undefined' && window.location) {
            const match = window.location.pathname.match(/\/app\/([a-zA-Z0-9_-]+)/);
            if (match) {
              const sessionKey = `session_${match[1]}`;
              const sessionRes = await chrome.storage.local.get(sessionKey);
              const comp = sessionRes[sessionKey]?.components?.persona?.current;
              if (comp?.instruction && comp.instruction.trim().length > 0) {
                return true;
              }
            }
          }
        }

        // Messaging fallback if available
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          const res: any = await new Promise((resolve) => {
            try {
              chrome.runtime.sendMessage({ type: 'GET_ACTIVE_PERSONA' }, (response) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(response);
              });
            } catch {
              resolve(null);
            }
          });
          if (res?.persona || res?.hasActivePersona) {
            return true;
          }
        }
      } catch (err) {
        console.debug('[Allie Gemini] Error checking active persona:', err);
      }
      return false;
    }

    async function updateActivePersonaState() {
      const active = await checkActivePersona();
      if (active !== hasActivePersona) {
        hasActivePersona = active;
        renderSettingsButton();
      }
    }

    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === 'local') {
        const relevantKeys = ['activePersona', 'currentPersona', 'allie_active_persona'];
        const hasRelevant = Object.keys(changes).some(
          k => relevantKeys.includes(k) || k.startsWith('session_')
        );
        if (hasRelevant) {
          updateActivePersonaState();
        }
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
    }

    const personaMessageListener = (msg: any) => {
      if (
        msg?.type === 'PERSONA_UPDATED' ||
        msg?.type === 'PERSONA_LOADED' ||
        msg?.type === 'ACTIVE_PERSONA_CHANGED'
      ) {
        updateActivePersonaState();
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(personaMessageListener);
    }

    function syncAllHosts() {
      if (toggleUi?.shadowHost) syncThemeToHost(toggleUi.shadowHost);
      if (settingsUi?.shadowHost) syncThemeToHost(settingsUi.shadowHost);
    }

    // Observe theme alterations on document.body
    const themeObserver = new MutationObserver(() => {
      syncAllHosts();
    });

    if (document.body) {
      themeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    function setupSubmitInterception() {
      unregisterSubmit?.();
      unregisterSubmit = adapter.interceptSubmit(async (rawPrompt: string) => {
        // Trigger smooth 60fps tracking as Angular moves composer to the bottom
        startDynamicTracking(2500);

        if (!isRefineActive) {
          // Refine toggle disabled: bypass Allie and proceed with native submit
          return true;
        }

        try {
          const res = await contentObserver.executeRefinement();
          if (res.success && res.refinedPrompt) {
            // Refinement succeeded and prompt updated: proceed with native submit
            startDynamicTracking(2500);
            return true;
          }
        } catch (err) {
          console.warn('[Allie Gemini] Prompt refinement error during submit:', err);
        }

        // On refinement failure or fallback, allow native send to prevent blocking the user
        startDynamicTracking(2500);
        return true;
      });
    }

    async function mountInjections() {
      if (isMounting) return;
      isMounting = true;

      try {
        const trailingAnchor = await waitForElement(
          () => findElement<HTMLElement>(GEMINI_SELECTORS.trailingActions),
          15000
        );
        const inputAreaAnchor = await waitForElement(
          () => findElement<HTMLElement>(GEMINI_SELECTORS.inputArea) || findElement<HTMLElement>(GEMINI_SELECTORS.textInputField),
          15000
        );

        // Mount RefineToggle into trailing actions bar
        if (trailingAnchor && (!toggleUi || !toggleUi.shadowHost.isConnected)) {
          if (toggleUi) {
            toggleUi.remove();
            toggleUi = null;
          }

          toggleUi = await createShadowRootUi(ctx, {
            name: 'allie-refine-toggle',
            position: 'inline',
            anchor: trailingAnchor,
            append: (anchor, ui) => {
              const buttonsWrapper = anchor.querySelector('.input-buttons-wrapper-bottom');
              if (buttonsWrapper) {
                anchor.insertBefore(ui, buttonsWrapper);
              } else {
                const modeSwitcher = anchor.querySelector('bard-mode-switcher, .model-picker-container');
                if (modeSwitcher && modeSwitcher.nextSibling) {
                  anchor.insertBefore(ui, modeSwitcher.nextSibling);
                } else {
                  anchor.appendChild(ui);
                }
              }
            },
            css: [tokensCss, geminiCss, refineToggleCss, geminiTooltipCss].join('\n'),
            onMount(container, _shadow, shadowHost) {
              shadowHost.classList.add('allie-toggle-host');
              shadowHost.style.display = 'inline-flex';
              shadowHost.style.alignItems = 'center';
              shadowHost.style.margin = '0 4px';
              shadowHost.style.verticalAlign = 'middle';
              syncThemeToHost(shadowHost);
              toggleRoot = ReactDOM.createRoot(container);
              renderRefineToggle();
              return toggleRoot;
            },
            onRemove(root) {
              root?.unmount();
              toggleRoot = null;
            }
          });

          toggleUi.mount();
        }

        // Mount SettingsButton to document.body (fixed layout tracking input container)
        if (inputAreaAnchor && (!settingsUi || !settingsUi.shadowHost.isConnected)) {
          if (settingsUi) {
            settingsUi.remove();
            settingsUi = null;
          }

          resizeObserver?.disconnect();
          resizeObserver = new ResizeObserver(() => {
            updateSettingsPosition();
          });
          resizeObserver.observe(inputAreaAnchor);

          settingsUi = await createShadowRootUi(ctx, {
            name: 'allie-settings-button',
            position: 'inline',
            anchor: 'body',
            append: 'last',
            css: [tokensCss, geminiCss, settingsButtonCss, scraperToolbarCss, geminiTooltipCss].join('\n'),
            onMount(container, _shadow, shadowHost) {
              shadowHost.classList.add('allie-settings-host');
              shadowHost.classList.toggle('allie-hidden', !isRefineActive);
              shadowHost.style.setProperty('position', 'fixed', 'important');
              shadowHost.style.setProperty('z-index', '10000', 'important');
              shadowHost.style.setProperty('pointer-events', 'auto', 'important');
              shadowHost.style.setProperty('display', isRefineActive ? 'inline-flex' : 'none', 'important');
              syncThemeToHost(shadowHost);
              settingsRoot = ReactDOM.createRoot(container);
              renderSettingsButton();
              updateActivePersonaState();
              updateSettingsPosition();
              return settingsRoot;
            },
            onRemove(root) {
              root?.unmount();
              settingsRoot = null;
            }
          });

          settingsUi.mount();
          updateSettingsPosition();
        }

        // Intercept enter key / send button
        setupSubmitInterception();
      } catch (err) {
        console.warn('[Allie Gemini] Error mounting Shadow DOM UIs:', err);
      } finally {
        isMounting = false;
      }
    }

    // Initial mount
    await mountInjections();

    // Observe SPA navigation, Angular Web Component swap (<pending-request> -> <model-response>), and DOM re-anchoring
    let debouncedMountTimer: any = null;
    const domObserver = new MutationObserver((mutations) => {
      // Re-verify host layout style is connected in case Angular cleared document.head
      if (hostStyleEl && !hostStyleEl.isConnected) {
        (document.head || document.documentElement).appendChild(hostStyleEl);
      }

      // ChatWait insight: Detect Angular Web Component swap from pending-request to permanent model-response
      let hasAngularSwap = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (let i = 0; i < mutation.addedNodes.length; i++) {
            const node = mutation.addedNodes[i];
            if (node && node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              if (
                el.tagName === 'MODEL-RESPONSE' ||
                el.classList?.contains('model-response') ||
                el.querySelector?.('model-response')
              ) {
                hasAngularSwap = true;
                break;
              }
            }
          }
        }
        if (hasAngularSwap) break;
      }

      if (hasAngularSwap) {
        startDynamicTracking(1500);
      }

      if (
        (!toggleUi || !toggleUi.shadowHost.isConnected) ||
        (!settingsUi || !settingsUi.shadowHost.isConnected)
      ) {
        clearTimeout(debouncedMountTimer);
        debouncedMountTimer = setTimeout(() => {
          mountInjections();
        }, 200);
      } else {
        // Continuous tracking for internal DOM alterations & Angular view changes
        updateSettingsPosition();
      }
    });

    if (document.body) {
      domObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Periodic watchdog interval ensuring alignment never drifts
    const positionWatchdogInterval = setInterval(() => {
      updateSettingsPosition();
    }, 400);

    // Full cleanup when content script context is invalidated
    ctx.onInvalidated(() => {
      clearTimeout(debouncedMountTimer);
      clearInterval(positionWatchdogInterval);
      if (dynamicTrackingRaf) {
        cancelAnimationFrame(dynamicTrackingRaf);
        dynamicTrackingRaf = null;
      }
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      resizeObserver?.disconnect();
      if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(storageListener);
      }
      if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(personaMessageListener);
      }
      themeObserver.disconnect();
      domObserver.disconnect();
      unregisterSubmit?.();
      contentObserver.destroy();
      hostStyleEl?.remove();
      toggleUi?.remove();
      settingsUi?.remove();
      toggleUi = null;
      settingsUi = null;
      toggleRoot = null;
      settingsRoot = null;
    });
  }
});
