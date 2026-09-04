/**
 * @fileoverview Memory Engine Module Exports
 * Ported from memory/index.js (44 symbols)
 * @module memory
 */

export {
  PersonaV4Schema,
  DimensionContentSchema,
  createEmptyPersona,
  type PersonaV4,
  type DimensionId,
  type DimensionContent
} from './schemas';
export * from './component-schemas';
export * from './context-assembler';
export * from './memory-controller';
export * from './analyzer-registry';
export * from './presets';
export * from './analyzers/recent-focus';
export * from './analyzers/unified-analyzer';

import { logger } from '../logging/logger';
import { MemoryController } from './memory-controller';
import { ContextAssembler } from './context-assembler';
import { llmConfigManager } from '../llm/llm-client';

export function memLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  logger[level](`[Memory] ${msg}`, data);
}

export async function isLLMConfigured(): Promise<boolean> {
  return llmConfigManager.isConfigured();
}

export function getCurrentSessionId(): string | null {
  if (typeof window !== 'undefined' && window.location) {
    return MemoryController.extractSessionId(window.location.href);
  }
  return null;
}

export async function analyzeSession(url: string, options: any = {}): Promise<{ memory: MemoryController; context: ContextAssembler; results: any }> {
  const sessionId = MemoryController.extractSessionId(url);
  if (!sessionId) {
    throw new Error('Could not extract session ID from URL');
  }
  memLog('info', `Analyzing session: ${sessionId}`);
  const memory = new MemoryController(sessionId);
  await memory.load();
  const context = new ContextAssembler(memory);
  return {
    memory,
    context,
    results: { success: [], failed: [], completedAt: Date.now() }
  };
}
