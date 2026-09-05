import React from 'react';
import ReactDOM from 'react-dom/client';
import { GeminiAdapter } from '../../src/adapters/chatbots/gemini/adapter';
import { GEMINI_SELECTORS, findElement } from '../../src/adapters/chatbots/gemini/selectors';
import { contentObserver } from '../../src/content/observer';
import { splitViewController } from '../../src/content/split-view';
import { RefineToggle, SettingsButton } from './components';

import tokensCss from './theme/tokens.css?inline';
import geminiCss from './gemini.css?inline';
import refineToggleCss from './components/RefineToggle.css?inline';
import settingsButtonCss from './components/SettingsButton.css?inline';
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

    // Position updater for fixed SettingsButton outside composer
    function updateSettingsPosition() {
      if (!settingsUi?.shadowHost || !settingsUi.shadowHost.isConnected) return;
      const inputContainer = findElement<HTMLElement>(GEMINI_SELECTORS.inputArea) ||
                             findElement<HTMLElement>(GEMINI_SELECTORS.textInputField)?.parentElement;
      if (!inputContainer) return;
      const rect = inputContainer.getBoundingClientRect();
      settingsUi.shadowHost.style.setProperty('--allie-settings-left', `${rect.right + 12}px`);
      settingsUi.shadowHost.style.setProperty('--allie-settings-top', `${rect.top + rect.height / 2 - 20}px`);
      settingsUi.shadowHost.style.setProperty('position', 'fixed', 'important');
      settingsUi.shadowHost.style.setProperty('left', `${rect.right + 12}px`, 'important');
      settingsUi.shadowHost.style.setProperty('top', `${rect.top + rect.height / 2 - 20}px`, 'important');
      settingsUi.shadowHost.style.setProperty('z-index', '10000', 'important');
      settingsUi.shadowHost.style.setProperty('pointer-events', 'auto', 'important');
      settingsUi.shadowHost.classList.toggle('allie-hidden', !isRefineActive);
      settingsUi.shadowHost.style.setProperty('display', isRefineActive ? 'inline-flex' : 'none', 'important');
    }

    const onScrollOrResize = () => {
      updateSettingsPosition();
    };

    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });

    function renderSettingsButton() {
      if (!settingsRoot) return;
      settingsRoot.render(
        <SettingsButton
          active={splitViewController.isSplitViewActive()}
          hasActivePersona={hasActivePersona}
          onClick={() => {
            splitViewController.toggleSplitView();
            renderSettingsButton();
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
        if (!isRefineActive) {
          // Refine toggle disabled: bypass Allie and proceed with native submit
          return true;
        }

        try {
          const res = await contentObserver.executeRefinement();
          if (res.success && res.refinedPrompt) {
            // Refinement succeeded and prompt updated: proceed with native submit
            return true;
          }
        } catch (err) {
          console.warn('[Allie Gemini] Prompt refinement error during submit:', err);
        }

        // On refinement failure or fallback, allow native send to prevent blocking the user
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
            css: [tokensCss, geminiCss, settingsButtonCss, geminiTooltipCss].join('\n'),
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

    // Observe SPA navigation and DOM re-anchoring
    let debouncedMountTimer: any = null;
    const domObserver = new MutationObserver(() => {
      if (
        (!toggleUi || !toggleUi.shadowHost.isConnected) ||
        (!settingsUi || !settingsUi.shadowHost.isConnected)
      ) {
        clearTimeout(debouncedMountTimer);
        debouncedMountTimer = setTimeout(() => {
          mountInjections();
        }, 200);
      }
    });

    if (document.body) {
      domObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Full cleanup when content script context is invalidated
    ctx.onInvalidated(() => {
      clearTimeout(debouncedMountTimer);
      window.removeEventListener('scroll', onScrollOrResize);
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
