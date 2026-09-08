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

export const CODE_HEADER_NOISE = new Set([
  'copy', 'copied', 'edit', 'run', 'share', 'download', 'expand', 'collapse',
  'wrap', 'unwrap', 'preview', 'code', 'copy code', 'ask chatgpt', 'always show details'
]);

export const LANGUAGE_ALIASES: Record<string, string> = {
  py: 'python', python3: 'python',
  js: 'javascript', node: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript',
  sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash',
  ps: 'powershell', ps1: 'powershell', pwsh: 'powershell',
  yml: 'yaml', md: 'markdown', rb: 'ruby', 'c++': 'cpp', 'c#': 'csharp'
};

export const SHEBANG_LANGUAGES: Record<string, string> = {
  python: 'python', bash: 'bash', sh: 'bash', zsh: 'bash', dash: 'bash',
  node: 'javascript', deno: 'javascript', ruby: 'ruby', perl: 'perl',
  pwsh: 'powershell'
};

  /**
   * The OUTERMOST <pre> around an element.
   * Ascends above nested CodeMirror pre.cm-content to outer pre.overflow-visible (Clio #263).
   */
  static outermostPre(el: Element | null | undefined): Element | null {
    if (!el || typeof (el as any).closest !== 'function') return null;
    let outer = el.closest('pre');
    if (!outer) return null;
    while (outer.parentElement) {
      const above = outer.parentElement.closest('pre');
      if (!above) break;
      outer = above;
    }
    return outer;
  }

  /**
   * Normalizes a raw language label or token to a canonical language identifier.
   */
  static normaliseLanguage(raw: string): string {
    const cleaned = String(raw || '').trim().toLowerCase();
    if (!cleaned || CODE_HEADER_NOISE.has(cleaned)) return '';
    if (/\s/.test(cleaned)) return '';
    if (!/^[a-z0-9+#._-]{1,20}$/.test(cleaned)) return '';
    return LANGUAGE_ALIASES[cleaned] || cleaned;
  }

  /**
   * Extracts a language from a code block's header strip, filtering out button captions.
   */
  static headerLabel(pre: Element): string {
    if (!pre || typeof pre.querySelector !== 'function') return '';
    const header = pre.querySelector('[class*="sticky"], header, [class*="header"]');
    if (!header) return '';

    // Prefer leaf element that reduces to a single non-control word
    const leaves = Array.from(header.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && (el.textContent || '').trim());
    for (const leaf of leaves) {
      const token = this.normaliseLanguage(leaf.textContent || '');
      if (token) return token;
    }

    // Otherwise test full header text tokens
    const tokens = (header.textContent || '')
      .trim()
      .split(/[\s\n\r\t]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t && !CODE_HEADER_NOISE.has(t));
    return tokens.length === 1 ? this.normaliseLanguage(tokens[0]) : '';
  }

  /**
   * Infers code language from text content directly when markup lacks headers/attributes (Clio #263).
   * Deliberately narrow to avoid false positive labeling.
   */
  static sniffCodeLanguage(text: string): string {
    const body = String(text || '');
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    const first = lines[0];

    // Shebang
    const shebang = first.match(/^#!\s*(?:\S*\/env\s+)?(\S+)/);
    if (shebang) {
      const interp = shebang[1].split(/[\\/]/).pop()?.replace(/[0-9.]+$/, '').toLowerCase() || '';
      if (SHEBANG_LANGUAGES[interp]) return SHEBANG_LANGUAGES[interp];
    }

    // JSON parsing check
    if (/^[{[]/.test(first) && /[}\]]$/.test(lines[lines.length - 1])) {
      try {
        JSON.parse(body);
        return 'json';
      } catch { /* not JSON */ }
    }

    // Git / Unified Diff
    if (/^(diff --git |index [0-9a-f]{7,}|--- |\+\+\+ )/.test(first) ||
        lines.some(l => /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/.test(l))) {
      return 'diff';
    }

    // HTML
    if (/^<(!doctype\s+html|html[\s>])/i.test(first)) return 'html';

    // SQL
    if (/^\s*select\b[\s\S]*\bfrom\b/i.test(body) && /;\s*$/.test(body.trim())) {
      return 'sql';
    }

    // Python structural markers
    if (lines.some(l => /^(def|class)\s+[A-Za-z_]\w*\s*[(:]/.test(l)) ||
        lines.some(l => /^from\s+[\w.]+\s+import\s+/.test(l)) ||
        lines.some(l => /^import\s+[\w.]+$/.test(l) && !/;/.test(l))) {
      return 'python';
    }

    // PowerShell
    const cmdlets = body.match(/\b(?:Get|Set|New|Remove|Write|Test|Start|Stop|Add|Select|Where|ForEach|Invoke|Import|Export|Register|Unregister|Copy|Move|Join|Split|Convert|Out)-[A-Z][A-Za-z]+\b/g) || [];
    if (/^param\s*\(/im.test(body) || cmdlets.length >= 2) return 'powershell';

    return '';
  }

  /**
   * Replaces <pre><code> blocks and code-blocks with markdown code fences:
   * ```[lang]
   * [code]
   * ```
   * Replaces the outermost <pre> container to strip button chrome (Clio #263).
   */
  static formatCodeBlocks(root: HTMLElement | Element): void {
    if (typeof root.querySelectorAll !== 'function') return;

    // Find pre elements containing code, or standalone code-block elements
    const codeBlocks = Array.from(root.querySelectorAll('pre, code-block, .code-block, .cm-content'));

    for (const block of codeBlocks) {
      // Avoid processing nested blocks that have already been detached/replaced
      if (!block.parentNode || (typeof root.contains === 'function' && !root.contains(block))) continue;

      const scope = this.outermostPre(block) || block;
      if (!scope.parentNode || (typeof root.contains === 'function' && !root.contains(scope))) continue;

      const codeEl = scope.querySelector('code, .cm-content') || block.querySelector('code, .cm-content') || block;

      // Preserve CodeMirror 6 line breaks when code is structured as .cm-line block elements
      let codeText = '';
      const cmLines = Array.from(codeEl.querySelectorAll?.('.cm-line') || []);
      if (cmLines.length > 0) {
        codeText = cmLines.map(line => line.textContent || '').join('\n');
      } else {
        codeText = codeEl.textContent || '';
      }

      const lang = this.detectLanguage(scope, codeEl, codeText);
      const fenced = `\n\`\`\`${lang}\n${codeText.trimEnd()}\n\`\`\`\n`;

      if (typeof root.ownerDocument?.createTextNode === 'function') {
        const textNode = root.ownerDocument.createTextNode(fenced);
        scope.parentNode.replaceChild(textNode, scope);
      } else {
        // Fallback for mock environments
        try {
          (scope as HTMLElement).textContent = fenced;
        } catch {
          // Ignore
        }
      }
    }
  }

  /**
   * Detects the programming language of a code block element using class, attributes,
   * outer header labels, and unambiguous content sniffing.
   */
  static detectLanguage(block: Element, codeEl: Element, codeText: string = ''): string {
    const scope = this.outermostPre(codeEl) || this.outermostPre(block) || block;

    const fromClass = (el: Element | null | undefined): string => {
      if (!el || !el.classList) return '';
      for (const cls of Array.from(el.classList)) {
        const m = cls.match(/^(?:language|lang|highlight)[-_](.+)$/i);
        if (m && m[1]) return m[1];
      }
      return '';
    };

    const attr = (el: Element | null | undefined, name: string): string | null => {
      return el && typeof el.getAttribute === 'function' ? el.getAttribute(name) : null;
    };

    const firstText = (el: Element | null | undefined, sel: string): string => {
      const hit = el && typeof el.querySelector === 'function' ? el.querySelector(sel) : null;
      return hit ? (attr(hit, 'data-language') || hit.textContent || '') : '';
    };

    const declared =
      fromClass(codeEl) ||
      fromClass(block) ||
      fromClass(scope) ||
      attr(codeEl, 'data-language') ||
      attr(block, 'data-language') ||
      attr(scope, 'data-language') ||
      attr(codeEl, 'data-lang') ||
      attr(block, 'data-lang') ||
      attr(scope, 'data-lang') ||
      firstText(scope, '[data-language]') ||
      firstText(scope, '.language-label') ||
      this.headerLabel(scope) ||
      '';

    const cleaned = this.normaliseLanguage(declared);
    if (cleaned) return cleaned;

    return this.sniffCodeLanguage(codeText || codeEl.textContent || '');
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
