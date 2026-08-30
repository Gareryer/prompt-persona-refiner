/**
 * @fileoverview Dimension View Module for 7-Dimension V4 UI
 * @module sidepanel/modules/dimension-view
 */

export const V4_DIMENSION_KEYS = [
    'persona',
    'context',
    'tone',
    'framework',
    'constraints',
    'format',
    'exemplar'
];

/**
 * Format raw dimension data into human-readable text
 * @param {string} dimensionId
 * @param {*} data
 * @returns {string}
 */
export function formatDimensionText(dimensionId, data) {
    if (!data) return '';
    if (typeof data === 'string') return data;

    switch (dimensionId) {
        case 'tone':
            if (data.style_tags && Array.isArray(data.style_tags)) {
                return `Style: ${data.style_tags.join(', ')}\nBanned: ${(data.banned_phrases || []).join(', ')}`;
            }
            break;
        case 'constraints':
            if (data.hard_rules || data.soft_rules) {
                const hard = (data.hard_rules || []).map(r => `- MUST: ${r}`).join('\n');
                const soft = (data.soft_rules || []).map(r => `- PREFER: ${r}`).join('\n');
                return [hard, soft].filter(Boolean).join('\n\n');
            }
            break;
        case 'format':
            if (data.output_type || data.schema) {
                return `Type: ${data.output_type || 'Custom'}\n\n${data.schema || data.template || ''}`.trim();
            }
            break;
        case 'exemplar':
            if (data.patterns && Array.isArray(data.patterns)) {
                return data.patterns.map(p => `Example: ${p.input || ''}\nResponse: ${p.output || ''}`).join('\n\n');
            }
            break;
    }

    if (typeof data === 'object') {
        return JSON.stringify(data, null, 2);
    }
    return String(data);
}

if (typeof window !== 'undefined') {
    window.DimensionViewModule = {
        V4_DIMENSION_KEYS,
        formatDimensionText
    };
}
