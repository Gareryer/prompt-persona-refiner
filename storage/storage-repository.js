/**
 * @fileoverview Unified Partitioned Storage Repository
 * @module storage/storage-repository
 * 
 * Provides a type-safe, resilient abstraction over chrome.storage partitions:
 * - local: Persistent data (models, prompt history, encrypted keys, cache)
 * - session: Ephemeral per-tab/lifecycle state (active sessions, locks, ring buffer logs)
 * - sync: User preferences & global settings (theme, active global persona)
 */

class StoragePartition {
    /**
     * @param {'local' | 'session' | 'sync'} areaName
     */
    constructor(areaName) {
        this.areaName = areaName;
    }

    get _area() {
        if (typeof chrome !== 'undefined' && chrome?.storage?.[this.areaName]) {
            return chrome.storage[this.areaName];
        }
        return null;
    }

    /**
     * Get a single item by key
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {Promise<*>}
     */
    async get(key, defaultValue = null) {
        if (!key || typeof key !== 'string') return defaultValue;
        const area = this._area;
        if (!area) return defaultValue;

        try {
            const result = await area.get(key);
            return result && result[key] !== undefined ? result[key] : defaultValue;
        } catch (error) {
            console.warn(`[StorageRepository:${this.areaName}] get failed for '${key}':`, error.message);
            return defaultValue;
        }
    }

    /**
     * Get multiple items by keys
     * @param {string[]} keys
     * @returns {Promise<Record<string, *>>}
     */
    async getMultiple(keys) {
        if (!Array.isArray(keys) || keys.length === 0) return {};
        const area = this._area;
        if (!area) return {};

        try {
            return (await area.get(keys)) || {};
        } catch (error) {
            console.warn(`[StorageRepository:${this.areaName}] getMultiple failed:`, error.message);
            return {};
        }
    }

    /**
     * Set a single key/value pair
     * @param {string} key
     * @param {*} value
     * @returns {Promise<boolean>}
     */
    async set(key, value) {
        if (!key || typeof key !== 'string') return false;
        const area = this._area;
        if (!area) return false;

        try {
            await area.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`[StorageRepository:${this.areaName}] set failed for '${key}':`, error.message);
            return false;
        }
    }

    /**
     * Set multiple key/value pairs in one atomic batch
     * @param {Record<string, *>} items
     * @returns {Promise<boolean>}
     */
    async setMultiple(items) {
        if (!items || typeof items !== 'object') return false;
        const area = this._area;
        if (!area) return false;

        try {
            await area.set(items);
            return true;
        } catch (error) {
            console.error(`[StorageRepository:${this.areaName}] setMultiple failed:`, error.message);
            return false;
        }
    }

    /**
     * Remove one or more keys
     * @param {string | string[]} keys
     * @returns {Promise<boolean>}
     */
    async remove(keys) {
        const area = this._area;
        if (!area) return false;

        try {
            await area.remove(keys);
            return true;
        } catch (error) {
            console.error(`[StorageRepository:${this.areaName}] remove failed:`, error.message);
            return false;
        }
    }

    /**
     * Clear all items in this partition
     * @returns {Promise<boolean>}
     */
    async clear() {
        const area = this._area;
        if (!area) return false;

        try {
            await area.clear();
            return true;
        } catch (error) {
            console.error(`[StorageRepository:${this.areaName}] clear failed:`, error.message);
            return false;
        }
    }
}

export const StorageRepository = {
    local: new StoragePartition('local'),
    session: new StoragePartition('session'),
    sync: new StoragePartition('sync')
};

if (typeof window !== 'undefined') {
    window.StorageRepository = StorageRepository;
}
