/**
 * @fileoverview Word-Level Diff Utility for Prompt Comparison
 * 
 * Provides word-level diff functionality to show additions, removals,
 * and unchanged text between original and refined prompts.
 * 
 * Uses a simple LCS-based algorithm with look-ahead for efficient
 * word matching without heavy computational overhead.
 * 
 * @module content/diff
 */

/**
 * @typedef {Object} DiffFragment
 * @property {string} text - The text content of this fragment
 * @property {'added'|'removed'|'unchanged'} type - The diff type
 */

/**
 * Compute word-level diff between original and modified text
 * 
 * Algorithm:
 * 1. Split both texts into words (preserving whitespace)
 * 2. Walk through both arrays comparing words
 * 3. Use look-ahead to find best matches for mismatched words
 * 4. Classify each word as added, removed, or unchanged
 * 5. Merge consecutive fragments of the same type
 * 
 * @param {string} original - Original text to compare
 * @param {string} modified - Modified text to compare against
 * @returns {DiffFragment[]} Array of diff fragments
 * 
 * @example
 * const fragments = diffWords("Hello world", "Hello there world");
 * // Returns: [
 * //   { text: "Hello ", type: "unchanged" },
 * //   { text: "there ", type: "added" },
 * //   { text: "world", type: "unchanged" }
 * // ]
 */
function diffWords(original, modified) {
    // Split by whitespace but preserve whitespace in output
    const originalWords = original.split(/(\s+)/);
    const modifiedWords = modified.split(/(\s+)/);

    const fragments = [];
    let i = 0, j = 0;

    // Walk through both word arrays simultaneously
    while (i < originalWords.length || j < modifiedWords.length) {
        if (i >= originalWords.length) {
            // Remaining modified words are additions
            fragments.push({ text: modifiedWords[j], type: 'added' });
            j++;
        } else if (j >= modifiedWords.length) {
            // Remaining original words are removals
            fragments.push({ text: originalWords[i], type: 'removed' });
            i++;
        } else if (originalWords[i] === modifiedWords[j]) {
            // Exact match - unchanged
            fragments.push({ text: originalWords[i], type: 'unchanged' });
            i++;
            j++;
        } else {
            // Mismatch - use look-ahead to find best alignment
            const lookAhead = 5;
            let foundInOriginal = -1;
            let foundInModified = -1;

            // Check if current modified word appears soon in original
            for (let k = i; k < Math.min(i + lookAhead, originalWords.length); k++) {
                if (originalWords[k] === modifiedWords[j]) {
                    foundInOriginal = k;
                    break;
                }
            }

            // Check if current original word appears soon in modified
            for (let k = j; k < Math.min(j + lookAhead, modifiedWords.length); k++) {
                if (modifiedWords[k] === originalWords[i]) {
                    foundInModified = k;
                    break;
                }
            }

            // Choose the closer match to minimize diff noise
            if (foundInOriginal !== -1 && (foundInModified === -1 || foundInOriginal - i <= foundInModified - j)) {
                // Mark original words as removed until we reach the match
                for (let k = i; k < foundInOriginal; k++) {
                    fragments.push({ text: originalWords[k], type: 'removed' });
                }
                i = foundInOriginal;
            } else if (foundInModified !== -1) {
                // Mark modified words as added until we reach the match
                for (let k = j; k < foundInModified; k++) {
                    fragments.push({ text: modifiedWords[k], type: 'added' });
                }
                j = foundInModified;
            } else {
                // No match found - mark as removal followed by addition
                fragments.push({ text: originalWords[i], type: 'removed' });
                fragments.push({ text: modifiedWords[j], type: 'added' });
                i++;
                j++;
            }
        }
    }

    // Merge consecutive fragments of the same type for cleaner output
    const merged = [];
    for (const frag of fragments) {
        if (merged.length > 0 && merged[merged.length - 1].type === frag.type) {
            merged[merged.length - 1].text += frag.text;
        } else {
            merged.push({ ...frag });
        }
    }

    return merged;
}

/**
 * Render diff fragments as HTML with styling classes
 * 
 * Applies CSS classes for visual differentiation:
 * - .diff-added: Green background for new text
 * - .diff-removed: Red background with strikethrough
 * - Unchanged text: No styling
 * 
 * @param {string} original - Original text
 * @param {string} modified - Modified text
 * @returns {string} HTML string with diff highlighting
 */
function renderDiffHtml(original, modified) {
    const fragments = diffWords(original, modified);
    return fragments.map(frag => {
        if (frag.type === 'added') {
            return `<span class="diff-added">${escapeHtml(frag.text)}</span>`;
        } else if (frag.type === 'removed') {
            return `<span class="diff-removed">${escapeHtml(frag.text)}</span>`;
        } else {
            return escapeHtml(frag.text);
        }
    }).join('');
}

/**
 * Escape HTML special characters to prevent XSS
 * 
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe string
 */
function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

window.GeminiDiff = {
    diffWords,
    renderDiffHtml,
    escapeHtml
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { diffWords, renderDiffHtml, escapeHtml };
}
