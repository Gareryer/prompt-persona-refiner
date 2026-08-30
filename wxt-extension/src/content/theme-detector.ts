/**
 * @fileoverview Theme Detector for Chatbot Web Applications
 * Ported from content/observer.js (lines 48-82)
 * @module content/theme-detector
 */

export type PageTheme = 'dark' | 'light';

export function detectPageTheme(): PageTheme {
  if (typeof document === 'undefined' || !document.body) return 'dark';

  const body = document.body;
  const bodyClasses = body.className || '';

  // 1. Gemini / OpenAI explicit theme classes
  if (bodyClasses.includes('dark-theme') || bodyClasses.includes('dark')) return 'dark';
  if (bodyClasses.includes('light-theme') || bodyClasses.includes('light')) return 'light';

  // 2. HTML dataset / class checks (Claude, ChatGPT, DeepSeek)
  const html = document.documentElement;
  if (html.classList.contains('dark') || html.getAttribute('data-theme') === 'dark') return 'dark';
  if (html.classList.contains('light') || html.getAttribute('data-theme') === 'light') return 'light';

  // 3. Fallback: Check computed background color brightness
  try {
    const bgColor = window.getComputedStyle(body).backgroundColor;
    const rgb = bgColor.match(/\d+/g);
    if (rgb && rgb.length >= 3) {
      const r = parseInt(rgb[0]!, 10);
      const g = parseInt(rgb[1]!, 10);
      const b = parseInt(rgb[2]!, 10);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness < 128 ? 'dark' : 'light';
    }
  } catch {
    // Fallback default
  }

  return 'dark';
}

export function observeThemeChanges(onChange: (theme: PageTheme) => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let currentTheme = detectPageTheme();
  const observer = new MutationObserver(() => {
    const newTheme = detectPageTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      onChange(newTheme);
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme', 'style']
  });

  if (document.body) {
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  return () => observer.disconnect();
}
