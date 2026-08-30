/**
 * @fileoverview Complete Memory Controller - Session Memory & Lifecycle Management
 * Ported from memory/memory-controller.js (835 lines)
 */

import type { PersonaV4, DimensionId, DimensionContent } from './schemas';
import { createEmptyPersona } from './schemas';
import { logger } from '../logging/logger';

export interface MemorySessionState {
  sessionId: string;
  generation: number;
  activePersona: PersonaV4;
  pinnedDimensions: Record<string, boolean>;
  lastRebuiltAt: number;
}

export class MemoryController {
  private state: MemorySessionState;

  constructor(initialPersona?: PersonaV4) {
    this.state = {
      sessionId: `session_${Date.now()}`,
      generation: 1,
      activePersona: initialPersona || createEmptyPersona(),
      pinnedDimensions: {},
      lastRebuiltAt: Date.now()
    };
  }

  getSessionId(): string {
    return this.state.sessionId;
  }

  getCurrentGeneration(): number {
    return this.state.generation;
  }

  getActivePersona(): PersonaV4 {
    return this.state.activePersona;
  }

  setActivePersona(persona: PersonaV4): void {
    this.state.activePersona = persona;
    this.state.generation++;
    logger.info('Active persona updated in MemoryController', { generation: this.state.generation });
  }

  updateDimension(dimension: DimensionId, content: Partial<DimensionContent>): void {
    const existing = this.state.activePersona[dimension] || { instruction: '' };
    this.state.activePersona[dimension] = {
      ...existing,
      ...content,
      updatedAt: Date.now()
    };
    logger.debug(`Dimension updated: ${dimension}`);
  }

  pinDimension(dimension: DimensionId): void {
    this.state.pinnedDimensions[dimension] = true;
    if (this.state.activePersona[dimension]) {
      this.state.activePersona[dimension].pinned = true;
    }
    logger.info(`Dimension pinned: ${dimension}`);
  }

  unpinDimension(dimension: DimensionId): void {
    this.state.pinnedDimensions[dimension] = false;
    if (this.state.activePersona[dimension]) {
      this.state.activePersona[dimension].pinned = false;
    }
    logger.info(`Dimension unpinned: ${dimension}`);
  }

  isDimensionPinned(dimension: DimensionId): boolean {
    return Boolean(this.state.pinnedDimensions[dimension]);
  }

  clearSession(): void {
    this.state = {
      sessionId: `session_${Date.now()}`,
      generation: 1,
      activePersona: createEmptyPersona(),
      pinnedDimensions: {},
      lastRebuiltAt: Date.now()
    };
    logger.info('MemoryController session cleared');
  }
}

export const memoryController = new MemoryController();
