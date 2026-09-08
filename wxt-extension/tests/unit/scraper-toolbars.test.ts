import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScraperToolbar as GeminiScraperToolbar } from '../../entrypoints/gemini.content/components/ScraperToolbar';
import { ScraperToolbar as ChatGPTScraperToolbar } from '../../entrypoints/chatgpt.content/components/ScraperToolbar';
import { ScraperToolbar as ClaudeScraperToolbar } from '../../entrypoints/claude.content/components/ScraperToolbar';

/**
 * Lightweight React Hook test harness for node/SSR environments.
 */
function createHookHarness() {
  const clientInternals = (React as any).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const states = new Map<number, any>();
  const refs = new Map<number, any>();
  let hookIndex = 0;

  const dispatcher = {
    useState: (initial: any) => {
      const id = hookIndex++;
      if (!states.has(id)) {
        states.set(id, typeof initial === 'function' ? initial() : initial);
      }
      const setState = (newVal: any) => {
        const val = typeof newVal === 'function' ? newVal(states.get(id)) : newVal;
        states.set(id, val);
      };
      return [states.get(id), setState];
    },
    useRef: (initial: any) => {
      const id = hookIndex++;
      if (!refs.has(id)) {
        refs.set(id, { current: initial });
      }
      return refs.get(id);
    },
    useEffect: (_fn: () => void | (() => void)) => {
      // noop in static render harness
    }
  };

  const prev = clientInternals?.H;

  function render<P>(component: React.FC<P>, props: P) {
    hookIndex = 0;
    if (clientInternals) {
      clientInternals.H = dispatcher;
    }
    try {
      return component(props);
    } finally {
      if (clientInternals) {
        clientInternals.H = prev;
      }
    }
  }

  return { render };
}

describe('Platform-Specific M3 ScraperToolbars (WXT Modular Architecture)', () => {
  const toolbars = [
    { name: 'Gemini ScraperToolbar', component: GeminiScraperToolbar, platform: 'gemini' },
    { name: 'ChatGPT ScraperToolbar', component: ChatGPTScraperToolbar, platform: 'chatgpt' },
    { name: 'Claude ScraperToolbar', component: ClaudeScraperToolbar, platform: 'claude' }
  ];

  beforeEach(() => {
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: null
      }
    };
  });

  toolbars.forEach(({ name, component: Toolbar }) => {
    describe(name, () => {
      it('renders in collapsed state by default with ONLY the trigger icon', () => {
        const harness = createHookHarness();
        const element = harness.render(Toolbar, {});
        const html = renderToStaticMarkup(element as any);

        // Must show trigger button
        expect(html).toContain('allie-toolbar-trigger');
        expect(html).toContain('data-allie="scraper-toolbar"');
        expect(html).toContain('is-collapsed');

        // Must NOT show settings, export, or sync buttons while collapsed
        expect(html).not.toContain('allie-settings-btn');
        expect(html).not.toContain('allie-export-btn');
        expect(html).not.toContain('allie-sync-btn');
        expect(html).not.toContain('allie-toolbar-pill');
      });

      it('renders all action buttons when initialExpanded is true', () => {
        const harness = createHookHarness();
        const element = harness.render(Toolbar, { initialExpanded: true });
        const html = renderToStaticMarkup(element as any);

        // Must show elevated stadium pill container
        expect(html).toContain('allie-toolbar-pill');
        expect(html).toContain('is-expanded');

        // Must house all 3 actions plus collapse button
        expect(html).toContain('allie-settings-btn');
        expect(html).toContain('data-allie="settings-button"');
        expect(html).toContain('allie-export-btn');
        expect(html).toContain('data-allie="export-button"');
        expect(html).toContain('allie-sync-btn');
        expect(html).toContain('data-allie="sync-button"');
        expect(html).toContain('allie-collapse-btn');
      });

      it('renders green pulsing status dot when hasActivePersona is true in expanded state', () => {
        const harness = createHookHarness();
        const element = harness.render(Toolbar, { initialExpanded: true, hasActivePersona: true });
        const html = renderToStaticMarkup(element as any);

        expect(html).toContain('allie-status-dot active');
        expect(html).toContain('Active persona loaded');
      });

      it('renders red status dot when hasActivePersona is false in expanded state', () => {
        const harness = createHookHarness();
        const element = harness.render(Toolbar, { initialExpanded: true, hasActivePersona: false });
        const html = renderToStaticMarkup(element as any);

        expect(html).toContain('allie-status-dot inactive');
        expect(html).toContain('No persona loaded');
      });

      it('invokes custom onSettingsClick callback when settings button is clicked', () => {
        const onSettingsClick = vi.fn();
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {
          initialExpanded: true,
          onSettingsClick
        });

        // Find settings button in pill children
        const pill = element.props.children;
        const settingsTooltip = pill.props.children[0];
        const settingsBtn = settingsTooltip.props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        settingsBtn.props.onClick(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(onSettingsClick).toHaveBeenCalledTimes(1);
      });

      it('invokes custom onExportClick callback when export button is clicked', async () => {
        const onExportClick = vi.fn().mockResolvedValue(undefined);
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {
          initialExpanded: true,
          onExportClick
        });

        const pill = element.props.children;
        const exportTooltip = pill.props.children[1];
        const exportBtn = exportTooltip.props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        await exportBtn.props.onClick(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(onExportClick).toHaveBeenCalledTimes(1);
      });

      it('invokes custom onSyncClick callback when sync button is clicked', async () => {
        const onSyncClick = vi.fn().mockResolvedValue(undefined);
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {
          initialExpanded: true,
          onSyncClick
        });

        const pill = element.props.children;
        const syncTooltip = pill.props.children[2];
        const syncBtn = syncTooltip.props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        await syncBtn.props.onClick(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();
        expect(onSyncClick).toHaveBeenCalledTimes(1);
      });

      it('falls back to chrome.runtime.sendMessage for default actions', async () => {
        const sendMessageMock = vi.fn((_msg: any, cb?: (res: any) => void) => {
          if (cb) cb({ success: true });
          return Promise.resolve({ success: true });
        });
        (globalThis as any).chrome.runtime.sendMessage = sendMessageMock;

        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, { initialExpanded: true });

        const pill = element.props.children;
        const settingsBtn = pill.props.children[0].props.children;
        const exportBtn = pill.props.children[1].props.children;
        const syncBtn = pill.props.children[2].props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

        // Test settings fallback
        settingsBtn.props.onClick(mockEvent);
        expect(sendMessageMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'TOGGLE_SIDEPANEL' })
        );

        // Test export fallback
        await exportBtn.props.onClick(mockEvent);
        expect(sendMessageMock).toHaveBeenCalledWith(
          { type: 'HARVEST_EXPORT_ACTIVE_TAB' },
          expect.any(Function)
        );

        // Test sync fallback
        await syncBtn.props.onClick(mockEvent);
        expect(sendMessageMock).toHaveBeenCalledWith(
          { type: 'HARVEST_SYNC_ACTIVE_TAB' },
          expect.any(Function)
        );
      });
    });
  });
});
