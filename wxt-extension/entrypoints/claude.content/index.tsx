import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClaudeAdapter } from '../../src/adapters/chatbots/claude/adapter';
import { CLAUDE_SELECTORS, findElement } from '../../src/adapters/chatbots/claude/selectors';
import { contentObserver } from '../../src/content/observer';
import { RefineToggle, SettingsButton, ScraperToolbar } from './components';
import {
  getActiveComposerContainer as resolveActiveComposerContainer,
  getTrailingActionsContainer as resolveTrailingActionsContainer,
  appendRefineToggleToAnchor
} from './composer-dom';

import tokensCss from './theme/tokens.css?inline';
import claudeCss from './claude.css?inline';
import refineToggleCss from './components/RefineToggle.css?inline';
import settingsButtonCss from './components/SettingsButton.css?inline';
import scraperToolbarCss from './components/ScraperToolbar.css?inline';
import claudeTooltipCss from './components/ClaudeTooltip.css?inline';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  cssInjectionMode: 'ui',
  runAt: 'document_idle',
  async main(ctx) {
    console.log('[Allie] Initializing Claude Modular Platform Content Script');

    // 1. Inject host layout style fix
    const hostStyleId = 'allie-claude-host-styles';
    let hostStyleEl = document.getElementById(hostStyleId) as HTMLStyleElement | null;
    if (!hostStyleEl) {
      hostStyleEl = document.createElement('style');
      hostStyleEl.id = hostStyleId;
      hostStyleEl.textContent = `
        fieldset:has(.ProseMirror),
        div:has(> .ProseMirror),
        div[contenteditable="true"] {
          overflow: visible !important;
          position: relative !important;
        }
      `;
      (document.head || document.documentElement).appendChild(hostStyleEl);
    }

    // Initialize content script observer
    contentObserver.init();

    const adapter = new ClaudeAdapter();
    let isRefineActive = true;
    let unregisterSubmit: (() => void) | null = null;

    // Resilient element waiter supporting dynamic React SPA rendering
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

    // Resolves active Claude ProseMirror input pill container, strictly EXCLUDING the disclaimer chin
    function getActiveComposerContainer(): HTMLElement | null {
      return resolveActiveComposerContainer(adapter.getActiveInput());
    }

    // Resolves trailing action buttons container in Claude composer (send button when typing, mic/audio when empty)
    function getTrailingActionsContainer(): HTMLElement | null {
      return resolveTrailingActionsContainer(getActiveComposerContainer(), adapter.getSubmitButton());
    }

    // Dynamic theme synchronizer matching Claude's html[data-theme] or html.dark
    function syncThemeToHost(host: HTMLElement | null | undefined) {
      if (!host || typeof document === 'undefined') return;
      const html = document.documentElement;
      let isDark = html.classList.contains('dark') ||
                   document.body.classList.contains('dark') ||
                   html.getAttribute('data-theme') === 'dark';

      if (!isDark && !html.classList.contains('light') && html.getAttribute('data-theme') !== 'light') {
        const bgColor = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bgColor.match(/\d+/g);
        if (rgb && rgb[0] && rgb[1] && rgb[2]) {
          const r = parseInt(rgb[0], 10) || 0;
          const g = parseInt(rgb[1], 10) || 0;
          const b = parseInt(rgb[2], 10) || 0;
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          isDark = brightness < 128;
        }
      }

      if (isDark) {
        host.classList.add('dark-theme');
        host.classList.remove('light-theme');
      } else {
        host.classList.add('light-theme');
        host.classList.remove('dark-theme');
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
      const inputContainer = getActiveComposerContainer();
      if (!inputContainer) return;
      const rect = inputContainer.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const targetLeft = `${rect.right + 12}px`;

      // Bottom-anchored positioning: align with bottom action bar / trailing buttons, excluding the disclaimer chin
      const trailingEl = adapter.getSubmitButton() || getTrailingActionsContainer();
      let topNum: number;
      if (trailingEl && trailingEl.isConnected) {
        const btnRect = trailingEl.getBoundingClientRect();
        if (btnRect.height > 0 && btnRect.bottom > 0) {
          topNum = btnRect.top + btnRect.height / 2 - 20;
        } else {
          topNum = rect.bottom - 44;
        }
      } else {
        topNum = rect.bottom - 44;
      }

      if (typeof window !== 'undefined') {
        const maxTop = window.innerHeight - 48;
        topNum = Math.min(topNum, maxTop);
        topNum = Math.max(8, topNum);
      }

      const targetTop = `${topNum}px`;

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
    function startDynamicTracking(durationMs = 2000) {
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
                console.warn('[Allie Claude] Failed to toggle sidepanel:', err);
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

          if (typeof window !== 'undefined' && window.location) {
            const match = window.location.pathname.match(/\/chat\/([a-zA-Z0-9_-]+)/);
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
        console.debug('[Allie Claude] Error checking active persona:', err);
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

    // Observe theme alterations on documentElement & body
    const themeObserver = new MutationObserver(() => {
      syncAllHosts();
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'style']
    });

    function setupSubmitInterception() {
      unregisterSubmit?.();
      unregisterSubmit = adapter.interceptSubmit(async (_rawPrompt: string) => {
        startDynamicTracking(2000);

        if (!isRefineActive) {
          return true;
        }

        try {
          const res = await contentObserver.executeRefinement();
          if (res.success && res.refinedPrompt) {
            startDynamicTracking(2000);
            return true;
          }
        } catch (err) {
          console.warn('[Allie Claude] Prompt refinement error during submit:', err);
        }

        startDynamicTracking(2000);
        return true;
      });
    }

    async function mountInjections() {
      if (isMounting) return;
      isMounting = true;

      try {
        const trailingAnchor = await waitForElement(
          () => getTrailingActionsContainer(),
          15000
        );
        const inputAreaAnchor = await waitForElement(
          () => getActiveComposerContainer(),
          15000
        );

        // Mount RefineToggle into trailing actions bar
        if (trailingAnchor && (!toggleUi || !toggleUi.shadowHost.isConnected)) {
          if (toggleUi) {
            toggleUi.remove();
            toggleUi = null;
          }
          document.querySelectorAll('allie-refine-toggle, allie-claude-refine-toggle')
            .forEach((el) => el.remove());

          toggleUi = await createShadowRootUi(ctx, {
            name: 'allie-claude-refine-toggle',
            position: 'inline',
            anchor: trailingAnchor,
            append: (anchor, ui) => {
              appendRefineToggleToAnchor(anchor, ui, adapter.getSubmitButton());
            },
            css: [tokensCss, claudeCss, refineToggleCss, claudeTooltipCss].join('\n'),
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
          document.querySelectorAll('allie-settings-button, allie-gemini-settings-button, allie-chatgpt-settings-button, allie-claude-settings-button')
            .forEach((el) => el.remove());

          resizeObserver?.disconnect();
          resizeObserver = new ResizeObserver(() => {
            updateSettingsPosition();
          });
          resizeObserver.observe(inputAreaAnchor);

          settingsUi = await createShadowRootUi(ctx, {
            name: 'allie-claude-settings-button',
            position: 'inline',
            anchor: 'body',
            append: 'last',
            css: [tokensCss, claudeCss, settingsButtonCss, scraperToolbarCss, claudeTooltipCss].join('\n'),
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

        setupSubmitInterception();
      } catch (err) {
        console.warn('[Allie Claude] Error mounting Shadow DOM UIs:', err);
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
      } else {
        updateSettingsPosition();
      }
    });

    if (document.body) {
      domObserver.observe(document.body, { childList: true, subtree: true });
    }

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
