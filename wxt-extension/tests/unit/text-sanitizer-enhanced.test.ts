import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDom } from '../fixtures/mock-dom';
import { TextSanitizer } from '@/core/harvest/extraction/text-sanitizer';

setupMockDom();

describe('Phase 1: Enhanced TextSanitizer & Hygiene Pipeline', () => {
  beforeEach(() => {
    setupMockDom();
    document.body.innerHTML = '';
  });

  describe('HTML Table to Markdown Conversion', () => {
    it('converts a standard HTML table with thead/tbody into a GFM pipe table', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Before table</p>
        <table>
          <thead>
            <tr>
              <th>Responsibility</th>
              <th>Tool</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Original post + comments</td>
              <td>Jina Reader</td>
            </tr>
            <tr>
              <td>Cross-platform research</td>
              <td>AgentReach</td>
            </tr>
          </tbody>
        </table>
        <p>After table</p>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('| Responsibility | Tool |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Original post + comments | Jina Reader |');
      expect(result).toContain('| Cross-platform research | AgentReach |');
      expect(result).not.toContain('ResponsibilityToolOriginal');
    });

    it('handles tables without thead (using first row as header)', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <table>
          <tr>
            <td>Col A</td>
            <td>Col B</td>
          </tr>
          <tr>
            <td>Val 1</td>
            <td>Val 2</td>
          </tr>
        </table>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('| Col A | Col B |');
      expect(result).toContain('| --- | --- |');
      expect(result).toContain('| Val 1 | Val 2 |');
    });

    it('escapes existing pipe characters in table cell content', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <table>
          <tr>
            <th>Pattern</th>
            <th>Description</th>
          </tr>
          <tr>
            <td>a | b</td>
            <td>either a or b</td>
          </tr>
        </table>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).toContain('a \\| b');
    });
  });

  describe('A11y & Screen Reader Stripping', () => {
    it('strips "You said" and "Gemini said" prefixes from turns', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <div class="sr-only">You said</div>
        <p>How do I configure nginx?</p>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('You said');
      expect(result).toBe('How do I configure nginx?');
    });

    it('strips text prefixes if rendered as plain text at message boundary', () => {
      const container = document.createElement('div');
      container.innerHTML = `You said\n\nHow do I configure nginx?`;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('You said');
      expect(result).toBe('How do I configure nginx?');
    });

    it('strips [aria-hidden="true"] and [role="status"] elements', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <span aria-hidden="true">Hidden icon</span>
        <p>Main message content</p>
        <div role="status">Status update</div>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('Hidden icon');
      expect(result).not.toContain('Status update');
      expect(result).toBe('Main message content');
    });
  });

  describe('Citation Chip & Badge Normalization', () => {
    it('removes +1 count badges from citation links and formats as markdown link', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Provided the platform is supported. <a class="citation" href="https://github.com/Panniantong/Agent-Reach">GitHub<span class="badge">+1</span></a> What AgentReach can do.</p>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('+1');
      expect(result).toContain('[GitHub](https://github.com/Panniantong/Agent-Reach)');
      expect(result).not.toContain('GitHub+1');
    });

    it('normalizes bracketed footnote numbers like [1] in citations', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>According to recent benchmarks <a class="citation" href="https://example.com/bench"><span class="citation-index">[1]</span> example.com</a> it runs fast.</p>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('[1]');
      expect(result).toContain('[example.com](https://example.com/bench)');
    });
  });

  describe('Private Unicode Glyphs & UI Control Stripping', () => {
    it('strips private-use unicode ligatures like Claude \\ue02a glyph', () => {
      const container = document.createElement('div');
      container.innerHTML = `Thought for 1m 14s\ue02a`;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('\ue02a');
    });

    it('strips "Show more" and "Show less" expander buttons', () => {
      const container = document.createElement('div');
      container.innerHTML = `
        <p>Long user prompt content...</p>
        <button data-testid="expand-button">Show more</button>
        <button data-testid="collapse-button">Show less</button>
      `;

      const result = TextSanitizer.extractTextContent(container);
      expect(result).not.toContain('Show more');
      expect(result).not.toContain('Show less');
      expect(result).toBe('Long user prompt content...');
    });
  });
});
