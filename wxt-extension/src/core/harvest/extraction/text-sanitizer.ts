/**
 * Text Sanitizer and Code Fence Normalizer for Harvester extraction.
 * Ports Clio's HTML sanitization, code-fence preservation, and filename sanitization.
 */

export class TextSanitizer {
  /**
   * Sanitizes an HTML element into clean text/markdown.
   * Strips scripts/styles/UI buttons, converts KaTeX/MathJax math to LaTeX,
   * and turns code blocks into markdown fences.
   */
  static extractTextContent(element: HTMLElement | Element | null): string {
    if (!element) return '';

    // Clone element so live DOM is never mutated
    const cloned = typeof element.cloneNode === 'function'
      ? (element.cloneNode(true) as HTMLElement)
      : element;

    // 1. Strip script, style, noscript, and interactive UI chrome (buttons, icons, action bars)
    if (typeof cloned.querySelectorAll === 'function') {
      const junk = cloned.querySelectorAll(
        'script, style, noscript, button, svg, [role="button"], .message-actions, message-actions, .response-actions, .action-bar, .inactive-draft, [data-is-hidden="true"]'
      );
      junk.forEach(node => node.remove());
    }

    // 2. Synthesize mathematical equations (KaTeX / MathJax / MathML) to pristine LaTeX
    this.formatMath(cloned);

    // 3. Format code blocks before reading textContent
    this.formatCodeBlocks(cloned);

    // 4. Extract textContent or formatted text
    let text = cloned.textContent || '';

    // 5. Normalize lines: preserve intentional code indentation and list hierarchy
    // while stripping common HTML indentation, trailing spaces, and collapsing excess blank lines
    const parts = text.split(/(```[\s\S]*?```)/g);
    text = parts
      .map((part, idx) => {
        // Odd indices are code fence blocks: leave verbatim
        if (idx % 2 === 1) return part;
        const lines = part.split('\n');
        const nonEmpty = lines.filter(l => l.trim().length > 0);
        let minIndent = Infinity;
        for (const line of nonEmpty) {
          const match = line.match(/^[ \t]*/);
          const indent = match ? match[0].length : 0;
          if (indent < minIndent) minIndent = indent;
        }
        if (minIndent === Infinity) minIndent = 0;

        return lines
          .map(line => {
            if (!line.trim()) return '';
            return line.slice(minIndent).trimEnd();
          })
          .join('\n');
      })
      .join('')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return text;
  }

  /**
   * Synthesizes KaTeX / MathJax MathML equations into markdown LaTeX syntax ($...$ or $$...$$).
   */
  static formatMath(root: HTMLElement | Element): void {
    if (typeof root.querySelectorAll !== 'function') return;

    const mathElements = Array.from(root.querySelectorAll('.katex, [data-mathml], .math-display, math'));

    for (const el of mathElements) {
      if (!el.parentNode || (typeof root.contains === 'function' && !root.contains(el))) continue;

      // Extract LaTeX representation from KaTeX annotation or data attributes
      let formula = '';
      const annotation = el.querySelector('annotation[encoding*="tex" i], annotation[encoding*="latex" i]');
      if (annotation && annotation.textContent?.trim()) {
        formula = annotation.textContent.trim();
      } else {
        formula = el.getAttribute('data-tex') || el.getAttribute('data-formula') || el.getAttribute('data-math') || '';
      }

      if (formula) {
        const isDisplay =
          el.classList?.contains('katex-display') ||
          el.classList?.contains('math-display') ||
          el.closest?.('.katex-display') !== null ||
          el.parentElement?.classList?.contains('katex-display');

        const replacement = isDisplay
          ? `\n$$\n${formula}\n$$\n`
          : `$${formula}$`;

        if (typeof root.ownerDocument?.createTextNode === 'function') {
          const textNode = root.ownerDocument.createTextNode(replacement);
          el.parentNode.replaceChild(textNode, el);
        } else {
          try {
            (el as HTMLElement).textContent = replacement;
          } catch {
            // Ignore
          }
        }
      }
    }
  }

  /**
   * Replaces <pre><code> blocks and code-blocks with markdown code fences:
   * ```[lang]
   * [code]
   * ```
   */
  static formatCodeBlocks(root: HTMLElement | Element): void {
    if (typeof root.querySelectorAll !== 'function') return;

    // Find pre elements containing code, or standalone code-block elements
    const codeBlocks = Array.from(root.querySelectorAll('pre, code-block, .code-block, .cm-content'));

    for (const block of codeBlocks) {
      // Avoid processing nested blocks that have already been detached/replaced
      if (!block.parentNode || (typeof root.contains === 'function' && !root.contains(block))) continue;

      // If block is .cm-content and its parent/ancestor is already a pre being processed, skip to avoid double fencing
      if (block.classList?.contains('cm-content') && block.closest?.('pre')) continue;

      const codeEl = block.querySelector('code, .cm-content') || block;
      const lang = this.detectLanguage(block, codeEl);

      // Preserve CodeMirror 6 line breaks when code is structured as .cm-line block elements
      let codeText = '';
      const cmLines = Array.from(codeEl.querySelectorAll?.('.cm-line') || []);
      if (cmLines.length > 0) {
        codeText = cmLines.map(line => line.textContent || '').join('\n');
      } else {
        codeText = codeEl.textContent || '';
      }

      const fenced = `\n\`\`\`${lang}\n${codeText.trimEnd()}\n\`\`\`\n`;

      if (typeof root.ownerDocument?.createTextNode === 'function') {
        const textNode = root.ownerDocument.createTextNode(fenced);
        block.parentNode.replaceChild(textNode, block);
      } else {
        // Fallback for mock environments
        try {
          (block as HTMLElement).textContent = fenced;
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Detects the programming language of a code block element.
   */
  static detectLanguage(block: Element, codeEl: Element): string {
    // 1. Check data-language attribute on block, codeEl, or parent container
    const dataLang =
      block.getAttribute('data-language') ||
      codeEl.getAttribute('data-language') ||
      block.getAttribute('data-lang') ||
      codeEl.getAttribute('data-lang') ||
      block.closest?.('[data-language]')?.getAttribute('data-language') ||
      block.closest?.('[data-lang]')?.getAttribute('data-lang') ||
      block.parentElement?.getAttribute('data-language') ||
      block.parentElement?.getAttribute('data-lang');
    if (dataLang) return dataLang.toLowerCase().trim();

    // 2. Check inner language labels (e.g. .code-language, .language-label)
    const labelEl =
      block.querySelector('.code-language, .language-label, [class*="language-"]') ||
      block.closest?.('.code-block, [class*="code-block"]')?.querySelector('.code-language, .language-label, [class*="language-"]') ||
      block.parentElement?.querySelector('.code-language, .language-label');
    if (labelEl && labelEl !== codeEl && labelEl.textContent) {
      const labelText = labelEl.textContent.trim().toLowerCase();
      if (labelText && labelText.length < 25 && !labelText.includes(' ')) {
        return labelText;
      }
    }

    // 3. Check class names (e.g. class="language-python", class="lang-typescript")
    const containerClasses = block.closest?.('.code-block, [class*="code-block"]')?.className || '';
    const classes = `${block.className || ''} ${codeEl.className || ''} ${containerClasses}`;
    const match = classes.match(/(?:language|lang)-([a-zA-Z0-9_+-]+)/i);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }

    return '';
  }

  /**
   * Sanitizes a filename to prevent invalid filesystem characters.
   * Clio compliant: replaces [/\\:*?"<>|] and control chars with '_'.
   * Strips trailing dots and whitespace for Windows NTFS safety.
   */
  static sanitizeFilename(filename: string, maxLen = 200): string {
    if (!filename || !filename.trim()) return 'untitled';

    const cleaned = filename
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/[\x00-\x1f\x7f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .trim();

    const truncated = cleaned.slice(0, maxLen).replace(/^_+|_+$/g, '').replace(/[\s._]+$/g, '');
    return truncated || 'untitled';
  }

  /**
   * Cleans a conversation or page title:
   * - Collapses double-rendered text only when safely separated by words (preserves valid words like "Murmur", "Bonbon")
   * - Strips provider branding suffix (e.g. "- Gemini", "- Claude")
   * - Normalizes bare provider app names to "Untitled Conversation"
   * - Normalizes whitespace
   */
  static cleanTitle(text: string): string {
    if (!text) return 'Untitled Conversation';

    let title = text
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*(?:Gemini|Claude|ChatGPT|DeepSeek|Grok|Meta AI).*$/i, '')
      .trim();

    // Bare provider app names are not conversation titles
    const lower = title.toLowerCase();
    if (lower === 'gemini' || lower === 'google gemini' || lower === 'claude' || lower === 'chatgpt') {
      return 'Untitled Conversation';
    }

    // Detect double-rendering: "ABCABC" where len is even and first half == second half.
    // Guard: only collapse if title contains spaces (multi-word phrase) or half >= 10,
    // so valid single words like "Murmur", "Bonbon", "Beriberi", "Couscous", "EchoEcho" are not damaged.
    if (title.length > 2 && title.length % 2 === 0) {
      const half = title.length / 2;
      if ((title.includes(' ') || half >= 10) && title.slice(0, half) === title.slice(half)) {
        title = title.slice(0, half);
      }
    }

    return title || 'Untitled Conversation';
  }

  /**
   * Formats a timestamp suitable for ISO-like filename paths: YYYY-MM-DDTHH-mm-ss.
   */
  static getTimestamp(d = new Date()): string {
    return d.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  }
}
