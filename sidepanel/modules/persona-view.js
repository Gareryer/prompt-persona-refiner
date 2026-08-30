/**
 * @fileoverview Persona View Module for SidePanel UI
 * @module sidepanel/modules/persona-view
 */

/**
 * Format persona instruction for display/editing
 * @param {Object} persona
 * @returns {string}
 */
export function formatPersonaText(persona) {
    if (!persona) return '';
    if (typeof persona === 'string') return persona;
    if (persona.instruction) return persona.instruction;
    if (persona.role_definition) {
        return `${persona.role_definition}\n\n${persona.system_instructions || ''}`.trim();
    }
    return JSON.stringify(persona, null, 2);
}

/**
 * Validate persona extraction payload
 * @param {Object} data
 * @returns {boolean}
 */
export function isValidPersonaData(data) {
    if (!data || typeof data !== 'object') return false;
    return Boolean(data.instruction || data.role_definition || data.name);
}

if (typeof window !== 'undefined') {
    window.PersonaViewModule = {
        formatPersonaText,
        isValidPersonaData
    };
}
