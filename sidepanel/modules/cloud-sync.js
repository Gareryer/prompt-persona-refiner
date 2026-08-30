/**
 * @fileoverview Cloud Sync Module for Supabase Integration
 * @module sidepanel/modules/cloud-sync
 */

/**
 * Check if Supabase client is initialized and authenticated
 * @returns {boolean}
 */
export function isCloudSyncAvailable() {
    return typeof window !== 'undefined' &&
        typeof window.supabase !== 'undefined' &&
        Boolean(window.__SUPABASE_CONNECTED__);
}

/**
 * Format cloud persona for local sync
 * @param {Object} cloudPersona
 * @returns {Object}
 */
export function mapCloudPersonaToLocal(cloudPersona) {
    if (!cloudPersona) return null;
    return {
        id: cloudPersona.id,
        name: cloudPersona.name || 'Untitled Persona',
        role_definition: cloudPersona.role_definition || '',
        system_instructions: cloudPersona.system_instructions || '',
        domain_focus: cloudPersona.domain_focus || [],
        interaction_style: cloudPersona.interaction_style || {},
        updated_at: cloudPersona.updated_at || new Date().toISOString(),
        synced_at: Date.now()
    };
}

if (typeof window !== 'undefined') {
    window.CloudSyncModule = {
        isCloudSyncAvailable,
        mapCloudPersonaToLocal
    };
}
