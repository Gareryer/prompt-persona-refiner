/**
 * @fileoverview Complete Memory Controller - Session Memory & Lifecycle Management
 * Ported from memory/memory-controller.js (835 lines)
 * @module memory/memory-controller
 */

import type { PersonaV4, DimensionId, DimensionContent } from './schemas';
import { createEmptyPersona } from './schemas';
import { ComponentSchemas } from './component-schemas';
import { logger } from '../logging/logger';

export const MEMORY_SCHEMA_VERSION = 2;
export const DIMENSION_NAMES = ['persona', 'context', 'exemplar', 'format', 'tone', 'framework', 'constraints'] as const;
export const SESSION_KEY_PREFIX = 'session_';

export const MEMORY_SIZE_LIMITS = {
  maxSessionSize: 500 * 1024,
  maxComponentSize: 50 * 1024,
  maxStringFieldSize: 10 * 1024,
  warningThreshold: 0.8
};

export interface SessionMemoryStructure {
  version: number;
  sessionId: string;
  createdAt: number;
  lastUpdated: number;
  currentGeneration: number;
  components: Record<string, any>;
  [key: string]: any;
}

export class MemoryController {
  public sessionId: string;
  public storageKey: string;
  public _cache: SessionMemoryStructure | null = null;
  private state: {
    sessionId: string;
    generation: number;
    activePersona: PersonaV4;
    pinnedDimensions: Record<string, boolean>;
    lastRebuiltAt: number;
  };

  static _bridgeRequestId: number = 0;
  static _bridgeRequests: Map<string | number, { resolve: (res: any) => void; reject: (err: any) => void }> = new Map();
  static _bridgeInitialized: boolean = false;

  constructor(sessionIdOrPersona?: string | PersonaV4) {
    if (typeof sessionIdOrPersona === 'string') {
      this.sessionId = sessionIdOrPersona;
    } else {
      this.sessionId = `session_${Date.now()}`;
    }

    this.storageKey = `${SESSION_KEY_PREFIX}${this.sessionId}`;
    this._cache = null;

    const initialPersona = typeof sessionIdOrPersona === 'object' ? sessionIdOrPersona : createEmptyPersona();
    this.state = {
      sessionId: this.sessionId,
      generation: 1,
      activePersona: initialPersona,
      pinnedDimensions: {},
      lastRebuiltAt: Date.now()
    };
  }

  static extractSessionId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0] === 'app') {
        return pathParts[1] || null;
      }
      if (pathParts.length > 0) {
        return pathParts[pathParts.length - 1] || null;
      }
      return null;
    } catch {
      return null;
    }
  }

  static isExtensionContext(): boolean {
    return true;
  }

  static _initBridgeListener(): void {
    if (MemoryController._bridgeInitialized || typeof window === 'undefined') return;
    MemoryController._bridgeInitialized = true;

    window.addEventListener('pa-storage-response', (event: any) => {
      const { requestId, success, data, error } = event.detail || {};
      if (requestId === undefined || requestId === null) return;
      const pending = MemoryController._bridgeRequests.get(requestId);
      if (pending) {
        MemoryController._bridgeRequests.delete(requestId);
        if (success) {
          pending.resolve(data);
        } else {
          pending.reject(new Error(error || 'Bridge request failed'));
        }
      }
    });
  }

  static _makeBridgeRequest(action: string, key: string, data: any = null): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      if (action === 'get') {
        return chrome.storage.local.get(key).then(res => res[key] || null);
      }
      if (action === 'set') {
        return chrome.storage.local.set({ [key]: data });
      }
      if (action === 'remove') {
        return chrome.storage.local.remove(key);
      }
    }

    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    MemoryController._initBridgeListener();

    return new Promise((resolve, reject) => {
      const requestId = `mc_${Date.now()}_${++MemoryController._bridgeRequestId}`;
      const timeout = setTimeout(() => {
        MemoryController._bridgeRequests.delete(requestId);
        reject(new Error('Bridge request timeout'));
      }, 5000);

      MemoryController._bridgeRequests.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      window.dispatchEvent(new CustomEvent('pa-storage-request', {
        detail: { action, key, data, requestId }
      }));
    });
  }

  async _ensureCache(): Promise<SessionMemoryStructure> {
    if (!this._cache || !this._cache.components) {
      await this.load();
    }
    if (!this._cache || !this._cache.components) {
      this._cache = this._getEmptyMemory();
    }
    return this._cache!;
  }

  _getEmptyMemory(): SessionMemoryStructure {
    return {
      version: MEMORY_SCHEMA_VERSION,
      sessionId: this.sessionId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      currentGeneration: 0,
      components: {}
    };
  }

  async load(): Promise<SessionMemoryStructure> {
    try {
      const result = await MemoryController._makeBridgeRequest('get', this.storageKey);
      if (result && typeof result === 'object' && result.components) {
        this._cache = result as SessionMemoryStructure;
        return this._cache;
      }
      this._cache = this._getEmptyMemory();
      await this.save();
      return this._cache;
    } catch {
      this._cache = this._getEmptyMemory();
      return this._cache;
    }
  }

  async save(): Promise<void> {
    if (!this._cache) return;
    try {
      this._cache.lastUpdated = Date.now();
      await MemoryController._makeBridgeRequest('set', this.storageKey, this._cache);
    } catch (e) {
      console.error('[MemoryController] Save failed:', e);
    }
  }

  async getComponent(analyzerId: string): Promise<any> {
    await this._ensureCache();
    return this._cache?.components?.[analyzerId] || null;
  }

  async setComponent(analyzerId: string, data: any, options: { generation?: number } = {}): Promise<void> {
    await this._ensureCache();
    const sanitizedData = this._sanitizeComponentData(data);
    const existing = this._cache!.components[analyzerId];
    const generation = options.generation ?? this._cache!.currentGeneration ?? 0;

    if (existing) {
      this._cache!.components[analyzerId] = {
        ...existing,
        current: sanitizedData,
        history: [
          ...(existing.history || []),
          { data: existing.current, timestamp: existing.updatedAt }
        ].slice(-5),
        confidence: Math.min(1, (existing.confidence || 0.5) + 0.1),
        updatedAt: Date.now(),
        generation
      };
    } else {
      this._cache!.components[analyzerId] = {
        current: sanitizedData,
        history: [],
        confidence: 0.5,
        updatedAt: Date.now(),
        generation
      };
    }

    await this.save();
  }

  async incrementGeneration(): Promise<number> {
    await this._ensureCache();
    this._cache!.currentGeneration = (this._cache!.currentGeneration || 0) + 1;
    await this.save();
    return this._cache!.currentGeneration;
  }

  async getCurrentGeneration(): Promise<number> {
    await this._ensureCache();
    return this._cache?.currentGeneration ?? (await this._ensureCache()).currentGeneration;
  }

  async getComponentGeneration(analyzerId: string): Promise<number | null> {
    await this._ensureCache();
    const component = this._cache?.components?.[analyzerId];
    return component?.generation ?? null;
  }

  async isComponentCurrent(analyzerId: string): Promise<boolean> {
    await this._ensureCache();
    const component = this._cache?.components?.[analyzerId];
    if (!component) return false;
    return component.generation === this._cache!.currentGeneration;
  }

  async pinPersona(): Promise<void> {
    await this._ensureCache();
    const personaComponent = this._cache!.components.persona;
    if (!personaComponent?.current) return;
    personaComponent.pinned = true;
    personaComponent.pinnedData = { ...personaComponent.current };
    personaComponent.pinnedAt = Date.now();
    await this.save();
  }

  async unpinPersona(): Promise<void> {
    await this._ensureCache();
    const personaComponent = this._cache!.components.persona;
    if (personaComponent) {
      personaComponent.pinned = false;
      delete personaComponent.pinnedData;
      delete personaComponent.pinnedAt;
      await this.save();
    }
  }

  async isPersonaPinned(): Promise<boolean> {
    await this._ensureCache();
    return Boolean(this._cache?.components?.persona?.pinned);
  }

  async getEffectivePersona(): Promise<any> {
    await this._ensureCache();
    const personaComponent = this._cache?.components?.persona;
    if (!personaComponent) return null;
    if (personaComponent.pinned && personaComponent.pinnedData) {
      return personaComponent.pinnedData;
    }
    return personaComponent.current || null;
  }

  async updatePinnedPersona(data: any): Promise<void> {
    await this._ensureCache();
    const personaComponent = this._cache!.components.persona;
    if (!personaComponent?.pinned) return;
    personaComponent.pinnedData = {
      ...personaComponent.pinnedData,
      ...data,
      updatedAt: Date.now()
    };
    await this.save();
  }

  async pinComponent(componentId: string): Promise<boolean> {
    await this._ensureCache();
    const component = this._cache!.components[componentId];
    if (!component?.current) return false;
    component.pinned = true;
    component.pinnedData = { ...component.current };
    component.pinnedAt = Date.now();
    await this.save();
    return true;
  }

  async unpinComponent(componentId: string): Promise<boolean> {
    await this._ensureCache();
    const component = this._cache!.components[componentId];
    if (!component) return false;
    component.pinned = false;
    delete component.pinnedData;
    delete component.pinnedAt;
    await this.save();
    return true;
  }

  async isComponentPinned(componentId: string): Promise<boolean> {
    await this._ensureCache();
    return this._cache?.components?.[componentId]?.pinned === true;
  }

  async getEffectiveComponent(componentId: string): Promise<any> {
    await this._ensureCache();
    const component = this._cache?.components?.[componentId];
    if (!component) return null;
    if (component.pinned && component.pinnedData) {
      return component.pinnedData;
    }
    return component.current || null;
  }

  async getUnifiedContext(): Promise<{ sessionId: string; retrievedAt: number; components: Record<string, any> }> {
    await this._ensureCache();
    const context: { sessionId: string; retrievedAt: number; components: Record<string, any> } = {
      sessionId: this.sessionId,
      retrievedAt: Date.now(),
      components: {}
    };

    for (const [analyzerId, componentData] of Object.entries(this._cache!.components)) {
      context.components[analyzerId] = {
        ...componentData,
        current: componentData.current,
        data: componentData.current,
        confidence: componentData.confidence,
        updatedAt: componentData.updatedAt,
        generation: componentData.generation
      };
    }

    return context;
  }

  async hasContext(): Promise<boolean> {
    await this._ensureCache();
    return Object.keys(this._cache?.components || {}).length > 0;
  }

  async clear(): Promise<void> {
    try {
      await MemoryController._makeBridgeRequest('remove', this.storageKey);
      this._cache = null;
    } catch (e) {
      console.error('[MemoryController] Clear failed:', e);
    }
  }

  _estimateSize(obj: any): number {
    try {
      return new Blob([JSON.stringify(obj)]).size;
    } catch {
      return JSON.stringify(obj).length * 2;
    }
  }

  _truncateString(str: string, maxBytes: number): string {
    if (!str || typeof str !== 'string') return str;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    if (bytes.length <= maxBytes) return str;
    return str.slice(0, Math.floor(maxBytes / 2)) + '...';
  }

  _sanitizeComponentData(data: any): any {
    if (!data || typeof data !== 'object') return data;
    if (this._isCharArray(data)) {
      return Object.values(data).join('');
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = this._truncateString(value, MEMORY_SIZE_LIMITS.maxStringFieldSize);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.slice(0, 50).map(item =>
          typeof item === 'string'
            ? this._truncateString(item, MEMORY_SIZE_LIMITS.maxStringFieldSize / 10)
            : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this._sanitizeComponentData(value);
      } else {
        sanitized[key] = value;
      }
    }

    const size = this._estimateSize(sanitized);
    if (size > MEMORY_SIZE_LIMITS.maxComponentSize) {
      delete sanitized.history;
      delete sanitized.metadata;
    }

    return sanitized;
  }

  _isCharArray(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
    const keys = Object.keys(obj);
    if (keys.length === 0) return false;
    const isNumericKeys = keys.every(k => /^\d+$/.test(k));
    if (!isNumericKeys) return false;
    const values = Object.values(obj);
    return values.every(v => typeof v === 'string' && v.length === 1);
  }

  async getStorageUsage(): Promise<{ used: number; total: number; percentage: number }> {
    try {
      const data = await MemoryController._makeBridgeRequest('get', this.storageKey);
      let usage = 0;
      if (data) usage = JSON.stringify(data).length;
      const total = 5 * 1024 * 1024;
      return { used: usage, total, percentage: (usage / total) * 100 };
    } catch {
      return { used: 0, total: 0, percentage: 0 };
    }
  }

  // Memory Controller methods for backwards compatibility
  getSessionId(): string {
    return this.sessionId || this.state.sessionId;
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
