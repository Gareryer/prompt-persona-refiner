export interface DiffFragment {
  text: string;
  type: 'added' | 'removed' | 'unchanged';
}

/**
 * Escapes HTML special characters.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Computes word-level diff between original and modified text.
 */
export function diffWords(original: string, modified: string): DiffFragment[] {
  const origStr = typeof original === 'string' ? original : (original != null ? String(original) : '');
  const modStr = typeof modified === 'string' ? modified : (modified != null ? String(modified) : '');

  const originalWords = origStr.split(/(\s+)/);
  const modifiedWords = modStr.split(/(\s+)/);

  const fragments: DiffFragment[] = [];
  let i = 0;
  let j = 0;

  while (i < originalWords.length || j < modifiedWords.length) {
    if (i >= originalWords.length) {
      fragments.push({ text: modifiedWords[j]!, type: 'added' });
      j++;
    } else if (j >= modifiedWords.length) {
      fragments.push({ text: originalWords[i]!, type: 'removed' });
      i++;
    } else if (originalWords[i] === modifiedWords[j]) {
      fragments.push({ text: originalWords[i]!, type: 'unchanged' });
      i++;
      j++;
    } else {
      const lookAhead = 5;
      let foundInOriginal = -1;
      let foundInModified = -1;

      for (let k = i; k < Math.min(i + lookAhead, originalWords.length); k++) {
        if (originalWords[k] === modifiedWords[j]) {
          foundInOriginal = k;
          break;
        }
      }

      for (let k = j; k < Math.min(j + lookAhead, modifiedWords.length); k++) {
        if (modifiedWords[k] === originalWords[i]) {
          foundInModified = k;
          break;
        }
      }

      if (foundInOriginal !== -1 && (foundInModified === -1 || foundInOriginal - i <= foundInModified - j)) {
        for (let k = i; k < foundInOriginal; k++) {
          fragments.push({ text: originalWords[k]!, type: 'removed' });
        }
        i = foundInOriginal;
      } else if (foundInModified !== -1) {
        for (let k = j; k < foundInModified; k++) {
          fragments.push({ text: modifiedWords[k]!, type: 'added' });
        }
        j = foundInModified;
      } else {
        fragments.push({ text: originalWords[i]!, type: 'removed' });
        fragments.push({ text: modifiedWords[j]!, type: 'added' });
        i++;
        j++;
      }
    }
  }

  const merged: DiffFragment[] = [];
  for (const frag of fragments) {
    if (merged.length > 0 && merged[merged.length - 1]!.type === frag.type) {
      merged[merged.length - 1]!.text += frag.text;
    } else {
      merged.push({ ...frag });
    }
  }

  return merged;
}

/**
 * Renders diff fragments as styled HTML.
 */
export function renderDiffHtml(original: string, modified: string): string {
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
