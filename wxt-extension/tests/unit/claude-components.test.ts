import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RefineToggle } from '../../entrypoints/claude.content/components/RefineToggle';
import { SettingsButton } from '../../entrypoints/claude.content/components/SettingsButton';
import { ClaudeTooltip } from '../../entrypoints/claude.content/components/ClaudeTooltip';
import { CLAUDE_TOKENS, getAllieCssVariables } from '../../src/adapters/chatbots/claude/tokens';
import { setupMockDom } from '../fixtures/mock-dom';
import {
  getActiveComposerContainer,
  getTrailingActionsContainer,
  appendRefineToggleToAnchor
} from '../../entrypoints/claude.content/composer-dom';

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

describe('Claude Content Injected Components & Design Tokens', () => {
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
      const idleHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'idle' }));
      expect(idleHtml).toContain('Refine');
      expect(idleHtml).not.toContain('status-loading');

      const loadingHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'loading' }));
      expect(loadingHtml).toContain('status-loading');
      expect(loadingHtml).toContain('Refining...');

      const successHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'success' }));
      expect(successHtml).toContain('status-success');
      expect(successHtml).toContain('Refined');

      const errorHtml = renderToStaticMarkup(React.createElement(RefineToggle, { status: 'error' }));
      expect(errorHtml).toContain('status-error');
      expect(errorHtml).toContain('Refine');

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

    it('renders terracotta status dot and accessible label when hasActivePersona is true', () => {
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

  describe('ClaudeTooltip', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('renders children with tooltip container and hides bubble initially', () => {
      const child = React.createElement('span', null, 'Target Button');
      const html = renderToStaticMarkup(React.createElement(ClaudeTooltip, { text: 'Help text', position: 'top' }, child));
      expect(html).toContain('allie-tooltip-container');
      expect(html).toContain('Target Button');
      expect(html).not.toContain('allie-tooltip-bubble');
    });

    it('returns only children if text is empty', () => {
      const child = React.createElement('span', null, 'Target Button');
      const html = renderToStaticMarkup(React.createElement(ClaudeTooltip, { text: '', position: 'top' }, child));
      expect(html).toBe('<span>Target Button</span>');
      expect(html).not.toContain('allie-tooltip-container');
    });

    it('shows tooltip after delay on mouse enter and hides on mouse leave', () => {
      const harness = createHookHarness();

      let vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });

      expect((vnode as any).props.children[1]).toBe(false);

      (vnode as any).props.onMouseEnter();

      vi.advanceTimersByTime(100);
      vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);

      vi.advanceTimersByTime(100);
      vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });

      const tooltipBubble = (vnode as any).props.children[1];
      expect(tooltipBubble).toBeTruthy();
      expect(tooltipBubble.props.role).toBe('tooltip');
      expect(tooltipBubble.props.className).toContain('allie-tooltip-bubble');
      expect(tooltipBubble.props.className).toContain('allie-tooltip-top');
      expect(tooltipBubble.props.children).toBe('Tooltip Info');

      (vnode as any).props.onMouseLeave();
      vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        position: 'top',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);
    });

    it('cancels scheduled tooltip show if mouse leaves before delayMs expires', () => {
      const harness = createHookHarness();

      let vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });

      (vnode as any).props.onMouseEnter();
      vi.advanceTimersByTime(80);

      (vnode as any).props.onMouseLeave();
      vi.advanceTimersByTime(200);

      vnode = harness.render(ClaudeTooltip, {
        text: 'Tooltip Info',
        delayMs: 200,
        children: React.createElement('span', null, 'Target')
      });
      expect((vnode as any).props.children[1]).toBe(false);
    });

    it('shows tooltip immediately when delayMs is 0', () => {
      const harness = createHookHarness();

      let vnode = harness.render(ClaudeTooltip, {
        text: 'Immediate Tooltip',
        delayMs: 0,
        children: React.createElement('span', null, 'Target')
      });

      (vnode as any).props.onMouseEnter();

      vnode = harness.render(ClaudeTooltip, {
        text: 'Immediate Tooltip',
        delayMs: 0,
        children: React.createElement('span', null, 'Target')
      });
      const tooltipBubble = (vnode as any).props.children[1];
      expect(tooltipBubble).toBeTruthy();
      expect(tooltipBubble.props.children).toBe('Immediate Tooltip');
    });
  });

  describe('CLAUDE_TOKENS & CSS Variables', () => {
    it('defines Anthropic Tipperary typography and Terracotta accent', () => {
      expect(CLAUDE_TOKENS.typography.fontFamily).toContain('Tipperary');
      expect(CLAUDE_TOKENS.dark.accent).toBe('#da7756');
      expect(CLAUDE_TOKENS.light.accent).toBe('#cc785c');
    });

    it('generates complete CSS variables for dark and light themes', () => {
      const darkVars = getAllieCssVariables('dark');
      expect(darkVars['--allie-accent']).toBe('#da7756');
      expect(darkVars['--allie-bg-primary']).toBe('#1f1e1d');
      expect(darkVars['--allie-font-family']).toContain('Tipperary');

      const lightVars = getAllieCssVariables('light');
      expect(lightVars['--allie-accent']).toBe('#cc785c');
      expect(lightVars['--allie-bg-primary']).toBe('#faf9f5');
      expect(lightVars['--allie-text-primary']).toBe('#141312');
    });
  });

  describe('Claude Empty-State Mounting & Chin Exclusion', () => {
    beforeEach(() => {
      setupMockDom();
      if (typeof document !== 'undefined' && document.body) {
        document.body.innerHTML = '';
      }
    });

    it('excludes Claude disclaimer chin when resolving active composer container', () => {
      document.body.innerHTML = `
        <fieldset class="composer-fieldset">
          <div class="input-pill">
            <div class="ProseMirror" contenteditable="true"></div>
          </div>
          <div class="group/chin-trail">
            <div data-disclaimer="true">
              <a href="https://support.anthropic.com/en/articles/8525154-claude-is-providing-incorrect-or-misleading-responses-what-s-going-on">Claude is AI</a>
            </div>
            <button data-testid="model-selector-dropdown">Claude 3.7 Sonnet</button>
          </div>
        </fieldset>
      `;

      const input = document.querySelector<HTMLElement>('.ProseMirror');
      expect(input).toBeTruthy();

      const container = getActiveComposerContainer(input);
      expect(container).toBeTruthy();
      expect(container!.classList.contains('input-pill')).toBe(true);
      expect(container!.classList.contains('composer-fieldset')).toBe(false);
      expect(container!.querySelector('[data-disclaimer="true"]')).toBeNull();
    });

    it('resolves trailing actions container in empty state via mic/voice button parent', () => {
      document.body.innerHTML = `
        <div class="input-pill">
          <div class="ProseMirror" contenteditable="true"></div>
          <div class="trailing-actions">
            <button aria-label="Voice input">mic</button>
          </div>
        </div>
      `;

      const inputContainer = document.querySelector<HTMLElement>('.input-pill');
      const trailing = getTrailingActionsContainer(inputContainer, null);
      expect(trailing).toBeTruthy();
      expect(trailing!.classList.contains('trailing-actions')).toBe(true);
    });

    it('resolves trailing actions container in empty state filtering out leading attach button', () => {
      document.body.innerHTML = `
        <div class="input-pill">
          <div class="leading-actions">
            <button aria-label="Add content (+)">plus</button>
          </div>
          <div class="ProseMirror" contenteditable="true"></div>
          <div class="trailing-actions">
            <button aria-label="Speech mode">speech</button>
          </div>
        </div>
      `;

      const inputContainer = document.querySelector<HTMLElement>('.input-pill');
      const trailing = getTrailingActionsContainer(inputContainer, null);
      expect(trailing).toBeTruthy();
      expect(trailing!.classList.contains('trailing-actions')).toBe(true);
    });

    it('resolves trailing actions container via flex fallback when no buttons exist', () => {
      document.body.innerHTML = `
        <div class="input-pill">
          <div class="ProseMirror" contenteditable="true"></div>
          <div class="flex items-center gap-1"></div>
        </div>
      `;

      const inputContainer = document.querySelector<HTMLElement>('.input-pill');
      const trailing = getTrailingActionsContainer(inputContainer, null);
      expect(trailing).toBeTruthy();
      expect(trailing!.classList.contains('gap-1')).toBe(true);
    });

    it('prioritizes submit button parent over mic button when text is present', () => {
      document.body.innerHTML = `
        <div class="input-pill">
          <div class="ProseMirror" contenteditable="true">Hello Claude</div>
          <div class="mic-parent">
            <button aria-label="Voice input">mic</button>
          </div>
          <div class="submit-parent">
            <button aria-label="Send message" data-testid="send-button">send</button>
          </div>
        </div>
      `;

      const inputContainer = document.querySelector<HTMLElement>('.input-pill');
      const submitBtn = document.querySelector<HTMLElement>('button[data-testid="send-button"]');
      const trailing = getTrailingActionsContainer(inputContainer, submitBtn);
      expect(trailing).toBeTruthy();
      expect(trailing!.classList.contains('submit-parent')).toBe(true);
    });

    it('inserts RefineToggle before first button in anchor in empty state', () => {
      document.body.innerHTML = `
        <div class="trailing-actions">
          <button id="mic-btn" aria-label="Voice input">mic</button>
        </div>
      `;

      const anchor = document.querySelector<HTMLElement>('.trailing-actions')!;
      const ui = document.createElement('div');
      ui.id = 'refine-toggle-host';

      appendRefineToggleToAnchor(anchor, ui, null);

      const childElements = Array.from(anchor.children).filter(c => c.nodeType === 1);
      expect(childElements.length).toBe(2);
      expect(childElements[0]!.id).toBe('refine-toggle-host');
      expect(childElements[1]!.id).toBe('mic-btn');
    });

    it('inserts RefineToggle before submit button when submit button is present in anchor', () => {
      document.body.innerHTML = `
        <div class="trailing-actions">
          <button id="other-btn">other</button>
          <button id="send-btn" aria-label="Send">send</button>
        </div>
      `;

      const anchor = document.querySelector<HTMLElement>('.trailing-actions')!;
      const submitBtn = document.querySelector<HTMLElement>('#send-btn')!;
      const ui = document.createElement('div');
      ui.id = 'refine-toggle-host';

      appendRefineToggleToAnchor(anchor, ui, submitBtn);

      const childElements = Array.from(anchor.children).filter(c => c.nodeType === 1);
      expect(childElements.length).toBe(3);
      expect(childElements[0]!.id).toBe('other-btn');
      expect(childElements[1]!.id).toBe('refine-toggle-host');
      expect(childElements[2]!.id).toBe('send-btn');
    });

    it('appends RefineToggle to anchor when no buttons are inside anchor', () => {
      document.body.innerHTML = `<div class="trailing-actions"></div>`;

      const anchor = document.querySelector<HTMLElement>('.trailing-actions')!;
      const ui = document.createElement('div');
      ui.id = 'refine-toggle-host';

      appendRefineToggleToAnchor(anchor, ui, null);

      const childElements = Array.from(anchor.children).filter(c => c.nodeType === 1);
      expect(childElements.length).toBe(1);
      expect(childElements[0]!.id).toBe('refine-toggle-host');
    });
  });
});
