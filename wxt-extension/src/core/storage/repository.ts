import type { PersonaV4 } from '../memory/schemas';
import {
  DEFAULT_USER_SETTINGS,
  type PersonaDraft,
  type UserSettings,
  type RatingRecord,
  type SyncAction
} from '../../lib/storage/items';

export interface IStorageBackend {
  get<T>(key: string, defaultValue: T): Promise<T>;
  set<T>(key: string, value: T): Promise<boolean>;
  remove(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

/**
 * In-memory / Mock storage backend for testing or SSR.
 */
export class InMemoryStorageBackend implements IStorageBackend {
  private store = new Map<string, any>();

  async get<T>(key: string, defaultValue: T): Promise<T> {
    if (this.store.has(key)) {
      return JSON.parse(JSON.stringify(this.store.get(key)));
    }
    return defaultValue;
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    this.store.set(key, JSON.parse(JSON.stringify(value)));
    return true;
  }

  async remove(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<boolean> {
    this.store.clear();
    return true;
  }
}

/**
 * Browser Extension Storage Backend (chrome.storage.local / browser.storage.local)
 */
export class ExtensionStorageBackend implements IStorageBackend {
  private get area() {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return chrome.storage.local;
    }
    return null;
  }

  async get<T>(key: string, defaultValue: T): Promise<T> {
    const area = this.area;
    if (!area) return defaultValue;
    return new Promise(resolve => {
      area.get(key, res => {
        if (res && res[key] !== undefined) {
          resolve(res[key]);
        } else {
          resolve(defaultValue);
        }
      });
    });
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    const area = this.area;
    if (!area) return false;
    return new Promise(resolve => {
      area.set({ [key]: value }, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async remove(key: string): Promise<boolean> {
    const area = this.area;
    if (!area) return false;
    return new Promise(resolve => {
      area.remove(key, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async clear(): Promise<boolean> {
    const area = this.area;
    if (!area) return false;
    return new Promise(resolve => {
      area.clear(() => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }
}

/**
 * Main Persona & Settings Storage Repository
 */
/**
 * StoragePartition for multi-area browser storage operations.
 * Ported from legacy storage/storage-repository.js
 */
export class StoragePartition {
  constructor(public areaName: 'local' | 'session' | 'sync') {}

  private get _area(): chrome.storage.StorageArea | null {
    if (typeof chrome !== 'undefined' && chrome.storage && (chrome.storage as any)[this.areaName]) {
      return (chrome.storage as any)[this.areaName];
    }
    return null;
  }

  async get<T = any>(key: string, defaultValue: T | null = null): Promise<T | null> {
    if (!key || typeof key !== 'string') return defaultValue;
    const area = this._area;
    if (!area) return defaultValue;
    return new Promise((resolve) => {
      area.get(key, (result) => {
        if (chrome.runtime.lastError || !result || result[key] === undefined) {
          resolve(defaultValue);
        } else {
          resolve(result[key]);
        }
      });
    });
  }

  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    if (!Array.isArray(keys) || keys.length === 0) return {};
    const area = this._area;
    if (!area) return {};
    return new Promise((resolve) => {
      area.get(keys, (result) => {
        if (chrome.runtime.lastError || !result) {
          resolve({});
        } else {
          resolve(result);
        }
      });
    });
  }

  async set(key: string, value: any): Promise<boolean> {
    if (!key || typeof key !== 'string') return false;
    const area = this._area;
    if (!area) return false;
    return new Promise((resolve) => {
      area.set({ [key]: value }, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async setMultiple(items: Record<string, any>): Promise<boolean> {
    if (!items || typeof items !== 'object') return false;
    const area = this._area;
    if (!area) return false;
    return new Promise((resolve) => {
      area.set(items, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async remove(keys: string | string[]): Promise<boolean> {
    const area = this._area;
    if (!area) return false;
    return new Promise((resolve) => {
      area.remove(keys as any, () => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }

  async clear(): Promise<boolean> {
    const area = this._area;
    if (!area) return false;
    return new Promise((resolve) => {
      area.clear(() => {
        resolve(!chrome.runtime.lastError);
      });
    });
  }
}




export class StorageRepository {
  public static readonly local = new StoragePartition('local');
  public static readonly session = new StoragePartition('session');
  public static readonly sync = new StoragePartition('sync');
  constructor(private backend: IStorageBackend = new ExtensionStorageBackend()) {}

  // Personas CRUD
  async getPersonas(): Promise<Record<string, PersonaV4>> {
    return this.backend.get('personas', {});
  }

  async getPersona(id: string): Promise<PersonaV4 | null> {
    const personas = await this.getPersonas();
    return personas[id] || null;
  }

  async savePersona(id: string, persona: PersonaV4): Promise<boolean> {
    const personas = await this.getPersonas();
    personas[id] = persona;
    return this.backend.set('personas', personas);
  }

  async deletePersona(id: string): Promise<boolean> {
    const personas = await this.getPersonas();
    delete personas[id];
    return this.backend.set('personas', personas);
  }

  // Active Persona Selection
  async getActivePersonaId(): Promise<string | null> {
    return this.backend.get('active_persona_id', null);
  }

  async setActivePersonaId(id: string | null): Promise<boolean> {
    return this.backend.set('active_persona_id', id);
  }

  // Drafts
  async getDrafts(): Promise<PersonaDraft[]> {
    return this.backend.get('persona_drafts', []);
  }

  async saveDraft(draft: PersonaDraft): Promise<boolean> {
    const drafts = await this.getDrafts();
    const existingIndex = drafts.findIndex(d => d.id === draft.id);
    if (existingIndex >= 0) {
      drafts[existingIndex] = draft;
    } else {
      drafts.unshift(draft);
    }
    return this.backend.set('persona_drafts', drafts);
  }

  async deleteDraft(draftId: string): Promise<boolean> {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);
    return this.backend.set('persona_drafts', filtered);
  }

  // User Settings
  async getSettings(): Promise<UserSettings> {
    return this.backend.get('user_settings', DEFAULT_USER_SETTINGS);
  }

  async updateSettings(partial: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...partial };
    await this.backend.set('user_settings', updated);
    return updated;
  }

  // Sync Queue
  async getSyncQueue(): Promise<SyncAction[]> {
    return this.backend.get('sync_queue', []);
  }

  async enqueueSyncAction(action: SyncAction): Promise<boolean> {
    const queue = await this.getSyncQueue();
    queue.push(action);
    return this.backend.set('sync_queue', queue);
  }

  async clearSyncQueue(): Promise<boolean> {
    return this.backend.set('sync_queue', []);
  }
}


