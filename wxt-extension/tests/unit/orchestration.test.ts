import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  activeRefinements,
  activeExtractions,
  RECENT_FOCUS_REFRESH_INTERVAL,
  getRefinementCounter,
  incrementRefinementCounter,
  resetRefinementCounter
} from '../../src/core/orchestration/session-state';
import {
  isSidepanelOpen,
  handleSidepanelConnect,
  openSidepanelPorts,
  sidepanelWindowPorts
} from '../../src/core/orchestration/sidepanel-manager';
import {
  buildV4RefinementContext,
  acquireSessionLock,
  releaseSessionLock,
  _sessionLocks
} from '../../src/core/orchestration/memory-orchestrator';
import {
  getUserFriendlyError,
  calculateRetryDelay,
  RETRY_CONFIG_BG,
  LLM_TRANSPORTS,
  REFINEMENT_SYSTEM_PROMPT
} from '../../src/core/orchestration/api-proxy';
import { sanitizeData, bgLog } from '../../src/core/orchestration/bg-logger';
import {
  encryptApiKey,
  decryptApiKey,
  isEncrypted,
  getEncryptionKey,
  CryptoService
} from '../../src/core/crypto/crypto-service';

describe('Phase 1 Orchestration Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session State Manager', () => {
    it('initializes maps and constants', () => {
      expect(activeRefinements).toBeInstanceOf(Map);
      expect(activeExtractions).toBeInstanceOf(Map);
      expect(RECENT_FOCUS_REFRESH_INTERVAL).toBe(5);
    });

    it('manages refinement counter fallback', async () => {
      const initial = await getRefinementCounter();
      expect(typeof initial).toBe('number');
      const inc = await incrementRefinementCounter();
      expect(typeof inc).toBe('number');
      await resetRefinementCounter();
    });
  });

  describe('Sidepanel Connection Manager', () => {
    it('tracks port lifecycle', () => {
      const mockPort: any = {
        name: 'sidepanel',
        sender: { tab: { windowId: 99 } },
        onDisconnect: {
          addListener: vi.fn()
        },
        postMessage: vi.fn()
      };

      handleSidepanelConnect(mockPort);
      expect(openSidepanelPorts.has(mockPort)).toBe(true);
      expect(sidepanelWindowPorts.get(99)).toBe(mockPort);
      expect(isSidepanelOpen(99)).toBe(true);

      // Clean up
      openSidepanelPorts.delete(mockPort);
      sidepanelWindowPorts.delete(99);
      expect(isSidepanelOpen(99)).toBe(false);
    });
  });

  describe('Memory Orchestrator & V4 Context Builder', () => {
    it('manages concurrency session locks', async () => {
      const sessionId = 'test_session_lock_123';
      releaseSessionLock(sessionId);

      const acquired = await acquireSessionLock(sessionId, 5000);
      expect(acquired).toBe(true);

      const secondAcquire = await acquireSessionLock(sessionId, 5000);
      expect(secondAcquire).toBe(false);

      releaseSessionLock(sessionId);
      expect(_sessionLocks.has(sessionId)).toBe(false);
    });

    it('builds full 7-dimension V4 refinement context', () => {
      const memoryData = {
        components: {
          persona: {
            current: { instruction: 'You are a Senior Principal Engineer with 25 years of experience.' }
          },
          context: {
            current: {
              instruction: 'Full-stack TypeScript and React ecosystem.',
              metadata: { domain: 'Tech', scope_tags: ['WXT', 'TypeScript', 'Vitest'] }
            }
          },
          tone: {
            current: {
              instruction: 'Direct, clear, and uncompromising precision.',
              metadata: { style_tags: ['Technical', 'Concise'], banned_phrases: ['synergy', 'leverage'] }
            }
          },
          framework: {
            current: {
              instruction: 'Apply first-principles reasoning.',
              metadata: { reasoning_type: 'First-Principles' }
            }
          },
          constraints: {
            current: {
              instruction: 'Zero guess work.',
              metadata: {
                requirements: ['TypeScript 5.9', 'Pass all tests'],
                prohibitions: ['Do not use any'],
                response_length: 'Detailed'
              }
            }
          },
          format: {
            current: {
              instruction: 'Clean Markdown tables and code snippets.',
              metadata: { output_type: 'Markdown' }
            }
          },
          exemplar: {
            current: { instruction: 'Pattern: Red -> Green -> Refactor.' }
          }
        }
      };

      const result = buildV4RefinementContext(memoryData);
      expect(result.hasDimensions).toBe(true);
      expect(result.dimensions.persona).toContain('Senior Principal Engineer');
      expect(result.dimensions.context.domain).toBe('Tech');
      expect(result.dimensions.tone.bannedPhrases).toContain('synergy');
      expect(result.dimensions.framework.reasoningType).toBe('First-Principles');
      expect(result.dimensions.constraints.requirements).toContain('Pass all tests');
      expect(result.formatted).toContain('## 🎭 PERSONA');
      expect(result.formatted).toContain('## 🌐 DOMAIN & SCOPE');
      expect(result.formatted).toContain('## 🎨 TONE & STYLE');
      expect(result.formatted).toContain('## 🔧 METHODOLOGY');
      expect(result.formatted).toContain('## ⚠️ CONSTRAINTS');
      expect(result.formatted).toContain('## 📋 OUTPUT FORMAT');
      expect(result.formatted).toContain('## 📚 EXEMPLAR PATTERNS');
    });

    it('respects disabled dimensions in context assembly', () => {
      const memoryData = {
        components: {
          persona: { current: { instruction: 'Persona text' } },
          tone: { current: { instruction: 'Tone text', metadata: {} } }
        }
      };

      const disabledFacts = {
        'component.persona': true
      };

      const result = buildV4RefinementContext(memoryData, disabledFacts);
      expect(result.dimensions.persona).toBeUndefined();
      expect(result.formatted).not.toContain('## 🎭 PERSONA');
      expect(result.dimensions.tone).toBeDefined();
    });
  });

  describe('API Proxy & Error Classification', () => {
    it('maps HTTP error codes to user-friendly messages', () => {
      expect(getUserFriendlyError(429, 'Rate limit', 'gemini')).toContain('Rate limit exceeded');
      expect(getUserFriendlyError(401, 'Unauthorized', 'openai')).toContain('Invalid API key');
      expect(getUserFriendlyError(403, 'Forbidden', 'anthropic')).toContain('Access denied');
      expect(getUserFriendlyError(404, 'Not found', 'openrouter')).toContain('Model not found');
      expect(getUserFriendlyError(500, 'Internal error', 'gemini')).toContain('server error');
      expect(getUserFriendlyError(0, 'Network fail', 'openai')).toContain('Network error');
    });

    it('calculates exponential backoff delay with jitter', () => {
      const delay0 = calculateRetryDelay(0);
      expect(delay0).toBeGreaterThanOrEqual(RETRY_CONFIG_BG.baseDelayMs * 0.75);
      expect(delay0).toBeLessThanOrEqual(RETRY_CONFIG_BG.baseDelayMs * 1.25);

      const delay1 = calculateRetryDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(RETRY_CONFIG_BG.baseDelayMs * 2 * 0.75);
    });

    it('exposes transport adapters and system prompt', () => {
      expect(LLM_TRANSPORTS.gemini).toBeDefined();
      expect(LLM_TRANSPORTS.openai).toBeDefined();
      expect(LLM_TRANSPORTS.anthropic).toBeDefined();
      expect(LLM_TRANSPORTS.openrouter).toBeDefined();
      expect(REFINEMENT_SYSTEM_PROMPT).toContain('REFINEMENT PROTOCOL');
    });
  });

  describe('Background Logger with Secret Redaction', () => {
    it('sanitizes API keys and tokens from logs', () => {
      const payload = {
        apiKey: 'secret-key-12345',
        rawContent: 'Using Gemini key AIzaSyD-1234567890123456789012345678901 and OpenAI sk-1234567890123456789012345678901234',
        nested: {
          password: 'mypassword',
          encToken: 'enc:v1:YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo='
        }
      };

      const sanitized = sanitizeData(payload);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.rawContent).toContain('AIza[REDACTED]');
      expect(sanitized.rawContent).toContain('sk-[REDACTED]');
      expect(sanitized.nested.password).toBe('[REDACTED]');
      expect(sanitized.nested.encToken).toBe('[REDACTED]');
    });

    it('executes bgLog safely', () => {
      expect(() => {
        bgLog('info', 'Test log message', { key: 'value' });
      }).not.toThrow();
    });
  });

  describe('Crypto Service for At-Rest Key Protection', () => {
    it('identifies encrypted strings', () => {
      expect(isEncrypted('enc:v1:abc12345')).toBe(true);
      expect(isEncrypted('plain-api-key')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
    });

    it('encrypts and decrypts round-trip correctly', async () => {
      const plaintext = 'sk-proj-test-api-key-value-999';
      const encrypted = await encryptApiKey(plaintext);

      expect(encrypted).toMatch(/^enc:v1:/);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = await decryptApiKey(encrypted);
      expect(decrypted).toBe(plaintext);

      // CryptoService class static methods
      const classEncrypted = await CryptoService.encrypt(plaintext);
      const classDecrypted = await CryptoService.decrypt(classEncrypted);
      expect(classDecrypted).toBe(plaintext);
    });
  });
});
