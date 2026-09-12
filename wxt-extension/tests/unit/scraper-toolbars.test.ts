import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  const refs: Array<{ current: any }> = [];
  const effectCleanups: Array<() => void> = [];
  let stateIndex = 0;
  let refIndex = 0;

  const dispatcher = {
    useState: (initial: any) => {
      const id = stateIndex++;
      if (!states.has(id)) {
        states.set(id, typeof initial === 'function' ? initial() : initial);
      }
      const setState = (newVal: any) => {
        const currentVal = states.get(id);
        const val = typeof newVal === 'function' ? newVal(currentVal) : newVal;
        states.set(id, val);
      };
      return [states.get(id), setState];
    },
    useRef: (initial: any) => {
      const id = refIndex++;
      if (id >= refs.length) {
        refs.push({ current: initial });
      }
      return refs[id];
    },
    useEffect: (fn: () => void | (() => void)) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') {
        effectCleanups.push(cleanup);
      }
    }
  };

  const prev = clientInternals?.H;

  function render<P>(component: React.FC<P>, props: P) {
    stateIndex = 0;
    refIndex = 0;
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

  function cleanup() {
    effectCleanups.forEach(c => c());
  }

  return { render, cleanup, refs, states };
}

describe('Platform-Specific M3 ScraperToolbars (WXT Modular Architecture)', () => {
  const toolbars = [
    { name: 'Gemini ScraperToolbar', component: GeminiScraperToolbar, platform: 'gemini' },
    { name: 'ChatGPT ScraperToolbar', component: ChatGPTScraperToolbar, platform: 'chatgpt' },
    { name: 'Claude ScraperToolbar', component: ClaudeScraperToolbar, platform: 'claude' }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as any).window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      innerWidth: 1024
    };
    (globalThis as any).document = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: null
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
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

      it('does not attach onMouseEnter or onMouseLeave to the root wrapper (no hover expansion)', () => {
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {});

        expect(element.props.onMouseEnter).toBeUndefined();
        expect(element.props.onMouseLeave).toBeUndefined();
        expect(element.props.className).toContain('is-collapsed');
      });

      it('wraps collapsed trigger in platform tooltip for hover display', () => {
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {});

        const tooltip = element.props.children;
        expect(tooltip.props.text).toBe('Allie Harvester & Settings');
        expect(tooltip.props.position).toBe('top');

        const triggerBtn = tooltip.props.children;
        expect(triggerBtn.props.className).toContain('allie-toolbar-trigger');
        expect(triggerBtn.props['aria-label']).toBe('Open Allie Toolbar');
      });

      it('toggles to expanded state when the trigger button is clicked and remains open', () => {
        const harness = createHookHarness();
        let element: any = harness.render(Toolbar, {});
        expect(element.props.className).toContain('is-collapsed');

        const tooltip = element.props.children;
        const triggerBtn = tooltip.props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        triggerBtn.props.onClick(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();

        element = harness.render(Toolbar, {});
        expect(element.props.className).toContain('is-expanded');
        const html = renderToStaticMarkup(element);
        expect(html).toContain('allie-toolbar-pill');
        expect(html).toContain('allie-collapse-btn');
      });

      it('toggles back to collapsed state when the collapse button is clicked', () => {
        const harness = createHookHarness();
        let element: any = harness.render(Toolbar, { initialExpanded: true });
        expect(element.props.className).toContain('is-expanded');

        const pill = element.props.children;
        const collapseTooltip = pill.props.children[3];
        const collapseBtn = collapseTooltip.props.children;

        const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
        collapseBtn.props.onClick(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockEvent.stopPropagation).toHaveBeenCalled();

        element = harness.render(Toolbar, {});
        expect(element.props.className).toContain('is-collapsed');
        const html = renderToStaticMarkup(element);
        expect(html).toContain('allie-toolbar-trigger');
      });

      it('collapses on document pointerdown outside the toolbar container', () => {
        let pointerdownHandler: ((e: any) => void) | null = null;
        (globalThis as any).document.addEventListener = vi.fn((event: string, handler: any) => {
          if (event === 'pointerdown') pointerdownHandler = handler;
        });

        const harness = createHookHarness();
        let element: any = harness.render(Toolbar, { initialExpanded: true });
        expect(element.props.className).toContain('is-expanded');

        // Fast-forward setTimeout(..., 0)
        vi.runAllTimers();

        // Mock containerRef
        const mockContainer = {
          contains: vi.fn((target: any) => target === 'inside-target')
        };
        harness.refs[0]!.current = mockContainer;

        expect(pointerdownHandler).toBeDefined();

        // Click inside via composedPath -> stays open
        pointerdownHandler!({
          target: 'inside-target',
          composedPath: () => [mockContainer]
        });
        element = harness.render(Toolbar, {});
        expect(element.props.className).toContain('is-expanded');

        // Click outside via composedPath -> collapses
        pointerdownHandler!({
          target: 'outside-target',
          composedPath: () => ['outside-host']
        });
        element = harness.render(Toolbar, {});
        expect(element.props.className).toContain('is-collapsed');
      });

      it('supports initialOrientation="vertical" with is-vertical class and left tooltips', () => {
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {
          initialExpanded: true,
          initialOrientation: 'vertical'
        });
        expect(element.props.className).toContain('is-vertical');

        const pill = element.props.children;
        expect(pill.props.className).toContain('is-vertical');

        // In vertical orientation, tooltips use position="left"
        const settingsTooltip = pill.props.children[0];
        expect(settingsTooltip.props.position).toBe('left');
      });

      it('supports initialOrientation="horizontal" with is-horizontal class and top tooltips', () => {
        const harness = createHookHarness();
        const element: any = harness.render(Toolbar, {
          initialExpanded: true,
          initialOrientation: 'horizontal'
        });
        expect(element.props.className).toContain('is-horizontal');

        const pill = element.props.children;
        expect(pill.props.className).toContain('is-horizontal');

        // In horizontal orientation, tooltips use position="top"
        const settingsTooltip = pill.props.children[0];
        expect(settingsTooltip.props.position).toBe('top');
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
