import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefineToggle } from '../../entrypoints/gemini.content/components/RefineToggle';
import { SettingsButton } from '../../entrypoints/gemini.content/components/SettingsButton';
import { GeminiTooltip } from '../../entrypoints/gemini.content/components/GeminiTooltip';

/**
 * Lightweight React Hook test harness for node/SSR environments.
 * Enables testing functional components with useState, useRef, and useEffect.
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
    useEffect: (fn: () => void | (() => void)) => {
      // In synchronous tests, run effect immediately
      fn();
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

describe('Phase 4: Gemini Content Injected Components Polish & Refinement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('RefineToggle', () => {
    it('instantiates RefineToggle with default props without crashing', () => {
      const element = React.createElement(RefineToggle, {});
      expect(element.type).toBe(RefineToggle);
      const html = renderToStaticMarkup(element);
      expect(html).toContain('allie-toggle-button');
      expect(html).toContain('data-allie="refine-toggle"');
      expect(html).toContain('role="switch"');
    });

    it('handles click toggle in controlled mode', () => {
      const onToggle = vi.fn();
      const harness = createHookHarness();

      const vnode = harness.render(RefineToggle, { enabled: true, onToggle });
      // Structure: wrapper -> GeminiTooltip -> button
      const button = (vnode as any).props.children.props.children;
      expect(button.props['aria-checked']).toBe(true);

      const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
      button.props.onClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith(false);
    });

    it('handles click toggle in uncontrolled mode and updates state', () => {
      const onToggle = vi.fn();
      const harness = createHookHarness();

      let vnode = harness.render(RefineToggle, { onToggle });
      let button = (vnode as any).props.children.props.children;
      expect(button.props['aria-checked']).toBe(true);

      const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };
      button.props.onClick(mockEvent);

      expect(onToggle).toHaveBeenLastCalledWith(false);

      // Re-render to observe state update
      vnode = harness.render(RefineToggle, { onToggle });
      button = (vnode as any).props.children.props.children;
      expect(button.props['aria-checked']).toBe(false);

      button.props.onClick(mockEvent);
      expect(onToggle).toHaveBeenLastCalledWith(true);
    });

    it('handles keyboard toggle via Space and Enter keys', () => {
      const onToggle = vi.fn();
      const harness = createHookHarness();

      const vnode = harness.render(RefineToggle, { enabled: true, onToggle });
      const button = (vnode as any).props.children.props.children;
      const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn(), key: ' ' };

      // Space key
      button.props.onKeyDown(mockEvent);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(onToggle).toHaveBeenCalledWith(false);

      // Enter key
      mockEvent.key = 'Enter';
      button.props.onKeyDown(mockEvent);
      expect(onToggle).toHaveBeenCalledWith(false);

      // Other keys should NOT trigger toggle
      onToggle.mockClear();
      mockEvent.key = 'Tab';
      button.props.onKeyDown(mockEvent);
      expect(onToggle).not.toHaveBeenCalled();
    });

    it('renders status styling for idle, loading, success, and error', () => {
      // Idle status
      const idleHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'idle' }));
      expect(idleHtml).toContain('Refine');
      expect(idleHtml).not.toContain('status-loading');

      // Loading status
      const loadingHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'loading' }));
      expect(loadingHtml).toContain('status-loading');
      expect(loadingHtml).toContain('Refining...');

      // Success status
      const successHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'success' }));
      expect(successHtml).toContain('status-success');
      expect(successHtml).toContain('Refined');

      // Error status
      const errorHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'error' }));
      expect(errorHtml).toContain('status-error');
      expect(errorHtml).toContain('Refine');

      // Custom label override
      const customHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'loading', label: 'Custom Processing...' }));
      expect(customHtml).toContain('Custom Processing...');
    });
  });

  describe('SettingsButton', () => {
    it('instantiates SettingsButton with default props', () => {
      const element = React.createElement(SettingsButton, {});
      expect(element.type).toBe(SettingsButton);
      const html = renderToStaticMarkup(element);
      expect(html).toContain('allie-settings-btn');
      expect(html).toContain('data-allie="settings-button"');
      expect(html).toContain('aria-label="Open Allie Settings"');
    });

    it('invokes chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" }) by default on click', () => {
      const sendMessageMock = vi.fn();
      (globalThis as any).chrome = {
        runtime: {
          sendMessage: sendMessageMock
        }
      };

      const element = SettingsButton({});
      // Structure: wrapper -> GeminiTooltip -> button
      const button = (element as any).props.children.props.children;
      const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

      button.props.onClick(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(sendMessageMock).toHaveBeenCalledWith({ type: 'OPEN_SIDEPANEL' });
    });

    it('prioritizes custom onClick handler over default sendMessage', () => {
      const customOnClick = vi.fn();
      const sendMessageMock = vi.fn();
      (globalThis as any).chrome = {
        runtime: {
          sendMessage: sendMessageMock
        }
      };

      const element = SettingsButton({ onClick: customOnClick });
      const button = (element as any).props.children.props.children;
      const mockEvent = { preventDefault: vi.fn(), stopPropagation: vi.fn() };

      button.props.onClick(mockEvent);

      expect(customOnClick).toHaveBeenCalledTimes(1);
      expect(sendMessageMock).not.toHaveBeenCalled();
    });

    it('renders green status dot and accessible label when hasActivePersona is true', () => {
      const htmlWithDot = renderToStaticMarkup(React.createElement(SettingsButton, { hasActivePersona: true }));
      expect(htmlWithDot).toContain('allie-status-dot active');
      expect(htmlWithDot).toContain('aria-label="Active persona loaded"');
      expect(htmlWithDot).toContain('Open Allie Settings (Active persona loaded)');

      const htmlWithoutDot = renderToStaticMarkup(React.createElement(SettingsButton, { hasActivePersona: false }));
      expect(htmlWithoutDot).toContain('allie-status-dot inactive');
      expect(htmlWithoutDot).toContain('aria-label="No persona loaded"');
    });

    it('applies active class when active prop is true', () => {
      const htmlActive = renderToStaticMarkup(React.createElement(SettingsButton, { active: true }));
      expect(htmlActive).toContain('allie-settings-btn active');

      const htmlInactive = renderToStaticMarkup(React.createElement(SettingsButton, { active: false }));
      expect(htmlInactive).not.toContain('allie-settings-btn active');
    });
  });

  describe('GeminiTooltip', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders children with tooltip container and hides bubble initially', () => {
      const child = React.createElement('span', null, 'Target Button');
      const html = renderToStaticMarkup(React.createElement(GeminiTooltip, { text: 'Help text', position: 'top' }, child));
      expect(html).toContain('allie-tooltip-container');
      expect(html).toContain('Target Button');
      // Tooltip bubble is not visible initially
      expect(html).not.toContain('allie-tooltip-bubble');
    });

    it('returns only children if text is empty', () => {
      const child = React.createElement('span', null, 'Target Button');
      const html = renderToStaticMarkup(React.createElement(GeminiTooltip, { text: '', position: 'top' }, child));
      expect(html).toBe('<span>Target Button</span>');
      expect(html).not.toContain('allie-tooltip-container');
    });

    it('shows tooltip after delay on mouse enter and hides on mouse leave', () => {
      const harness = createHookHarness();

      let vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });

      // Initially tooltip is hidden (children[1] is false)
      expect((vnode as any).props.children[1]).toBe(false);

      // Trigger mouse enter
      (vnode as any).props.onMouseEnter();

      // Before delayMs (e.g. 100ms), tooltip should still be hidden
      vi.advanceTimersByTime(100);
      vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);

      // Advance by remaining delayMs (150ms more -> 250ms total)
      vi.advanceTimersByTime(150);
      vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });

      const tooltipBubble = (vnode as any).props.children[1];
      expect(tooltipBubble).toBeTruthy();
      expect(tooltipBubble.props.role).toBe('tooltip');
      expect(tooltipBubble.props.className).toContain('allie-tooltip-bubble');
      expect(tooltipBubble.props.className).toContain('allie-tooltip-top');
      expect(tooltipBubble.props.children).toBe('Tooltip Info');

      // Trigger mouse leave
      (vnode as any).props.onMouseLeave();
      vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);
    });

    it('cancels scheduled tooltip show if mouse leaves before delayMs expires', () => {
      const harness = createHookHarness();

      let vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });

      // Mouse enter starts timer
      (vnode as any).props.onMouseEnter();
      vi.advanceTimersByTime(100);

      // Mouse leave before 250ms expires
      (vnode as any).props.onMouseLeave();

      // Advance beyond 250ms
      vi.advanceTimersByTime(200);

      vnode = harness.render(GeminiTooltip, {
        text: 'Tooltip Info',
        delayMs: 250,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);
    });

    it('shows tooltip immediately when delayMs is 0', () => {
      const harness = createHookHarness();

      let vnode = harness.render(GeminiTooltip, {
        text: 'Immediate Tooltip',
        delayMs: 0,
        children: React.createElement('span', null, 'Target')
      });

      (vnode as any).props.onMouseEnter();

      vnode = harness.render(GeminiTooltip, {
        text: 'Immediate Tooltip',
        delayMs: 0,
        children: React.createElement('span', null, 'Target')
      });
      const tooltipBubble = (vnode as any).props.children[1];
      expect(tooltipBubble).toBeTruthy();
      expect(tooltipBubble.props.children).toBe('Immediate Tooltip');
    });
  });
});
