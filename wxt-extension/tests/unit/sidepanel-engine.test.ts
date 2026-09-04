import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockElements = new Map<string, any>();

(globalThis as any).document = {
  body: {
    appendChild: vi.fn(),
    querySelectorAll: vi.fn().mockReturnValue([])
  },
  createElement: (tag: string) => {
    const el: any = {
      tagName: tag.toUpperCase(),
      className: '',
      dataset: {},
      textContent: '',
      children: [] as any[],
      type: 'button',
      value: '',
      setAttribute: vi.fn(),
      classList: {
        add: vi.fn((cls: string) => { el.className += ' ' + cls; }),
        remove: vi.fn((cls: string) => { el.className = el.className.replace(cls, ''); }),
        toggle: vi.fn((cls: string, force?: boolean) => {
          if (force !== undefined) {
            if (force) el.className += ' ' + cls;
            else el.className = el.className.replace(cls, '');
          } else {
            if (el.className.includes(cls)) el.className = el.className.replace(cls, '');
            else el.className += ' ' + cls;
          }
        }),
        contains: (cls: string) => el.className.includes(cls)
      },
      appendChild: vi.fn((c: any) => { el.children.push(c); }),
      querySelectorAll: vi.fn(() => el.children),
      querySelector: vi.fn(() => null),
      addEventListener: vi.fn((evt: string, cb: Function) => {
        el['on_' + evt] = cb;
      }),
      remove: vi.fn()
    };
    return el;
  },
  getElementById: (id: string) => mockElements.get(id) || null,
  querySelectorAll: vi.fn().mockReturnValue([])
};

(globalThis as any).window = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

(globalThis as any).chrome = {
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 42, url: 'https://gemini.google.com/app/session-test-42' }])
  },
  runtime: {
    sendMessage: vi.fn((msg: any, cb?: Function) => {
      if (typeof cb === 'function') {
        if (msg.type === 'GET_MEMORY') cb({ persona: { instruction: 'test' } });
        else if (msg.type === 'GET_MODEL_CONFIG') cb({ provider: 'gemini', model: 'gemini-2.0-flash' });
        else cb({ success: true });
      }
    })
  },
  storage: {
    local: {
      set: vi.fn(),
      get: vi.fn()
    }
  }
};

import {
  SidepanelController,
  spLog,
  capitalizeFirst,
  handleAddTag,
  handleRemoveTag,
  handleEditTag,
  validateExtractionResponse,
  parseExtractionResult,
  renderExtTopicSummary,
  renderExtIntent,
  renderExtEntities,
  setupFormDirtyTracking,
  showNotification,
  showAlertDialog,
  showConfirmDialog,
  showPromptDialog,
  setupM3Dropdown
} from '../../src/core/sidepanel';

describe('Phase 4 Sidepanel Core Subsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElements.clear();
  });

  describe('Tag & Chip Management', () => {
    it('adds new non-duplicate tags safely', () => {
      const initial = ['react', 'wxt'];
      const next = handleAddTag('typescript', initial);
      expect(next).toEqual(['react', 'wxt', 'typescript']);
      expect(handleAddTag('react', next)).toEqual(next);
      expect(handleAddTag('   ', next)).toEqual(next);
    });

    it('removes tags accurately', () => {
      const initial = ['alpha', 'beta', 'gamma'];
      expect(handleRemoveTag('beta', initial)).toEqual(['alpha', 'gamma']);
    });

    it('edits tags or removes if emptied', () => {
      const initial = ['foo', 'bar'];
      expect(handleEditTag('foo', 'baz', initial)).toEqual(['baz', 'bar']);
      expect(handleEditTag('foo', '   ', initial)).toEqual(['bar']);
    });
  });

  describe('Extraction Processing Helpers', () => {
    it('validates extraction payloads', () => {
      expect(validateExtractionResponse(null)).toBe(false);
      expect(validateExtractionResponse({ persona: {} })).toBe(true);
      expect(validateExtractionResponse({ memory_layer: { context: {} } })).toBe(true);
    });

    it('parses JSON string and object extraction results', () => {
      const valid = JSON.stringify({ memory_layer: { persona: { instruction: 'test' } }, metadata: { domain: 'tech' } });
      const result = parseExtractionResult(valid);
      expect(result).not.toBeNull();
      expect(result?.metadata?.domain).toBe('tech');
      expect(parseExtractionResult('invalid-json')).toBeNull();
    });

    it('renders extraction summaries into HTML structures', () => {
      expect(renderExtTopicSummary(['AI', 'Prompt'])).toContain('ext-topics');
      expect(renderExtIntent('Write tests')).toContain('Write tests');
      expect(renderExtEntities(['Entity1'])).toContain('entity-chip');
    });

    it('tracks dirty states', () => {
      const tracker = setupFormDirtyTracking();
      expect(tracker.isDirty).toBe(false);
      tracker.setDirty(true);
      expect(tracker.isDirty).toBe(true);
    });
  });

  describe('SidepanelController', () => {
    it('initializes and manages tab session lifecycle', async () => {
      const sp = new SidepanelController();
      await sp.init();
      expect(sp.currentSessionId).toBe('session-test-42');
      expect(sp.activeTabId).toBe(42);
      expect(sp.activePersona).toBeDefined();
    });

    it('handles tab activated and tab updated events', async () => {
      const sp = new SidepanelController();
      sp.handleTabActivated({ tabId: 42, windowId: 1 });
      sp.handleTabUpdated(42, { status: 'complete' }, { id: 42, url: 'https://gemini.google.com/app/new-session' });
      expect(sp.currentSessionId).toBe('new-session');
    });

    it('triggers memory component updates and rebuilds', async () => {
      const sp = new SidepanelController();
      await sp.saveComponent('tone', { instruction: 'concise' });
      await sp.rebuildMemory();
      expect((globalThis as any).chrome.runtime.sendMessage).toHaveBeenCalled();
    });

    it('formats string capitalization properly', () => {
      expect(capitalizeFirst('persona')).toBe('Persona');
      expect(capitalizeFirst('')).toBe('');
    });
  });

  describe('Dialogs & Dropdowns', () => {
    it('renders notifications and executes dialog functions without error', async () => {
      expect(() => showNotification('Test message', 'info')).not.toThrow();
      expect(() => showAlertDialog({ title: 'Alert' })).not.toThrow();

      const dropdownEl = (globalThis as any).document.createElement('div');
      const m3 = setupM3Dropdown(dropdownEl);
      expect(m3).toBeDefined();
      m3.toggleDropdown();
      m3.selectItem('choice-1');
      expect(dropdownEl.dataset.value).toBe('choice-1');
    });
  });
});