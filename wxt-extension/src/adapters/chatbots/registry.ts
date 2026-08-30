import type { IChatbotAdapter } from './types';
import { GeminiAdapter } from './gemini.adapter';
import { ChatGPTAdapter } from './chatgpt.adapter';
import { ClaudeAdapter } from './claude.adapter';
import { DeepSeekAdapter } from './deepseek.adapter';
import { GrokAdapter } from './grok.adapter';
import { MetaAIAdapter } from './meta.adapter';

export const ALL_ADAPTERS: IChatbotAdapter[] = [
  new GeminiAdapter(),
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new DeepSeekAdapter(),
  new GrokAdapter(),
  new MetaAIAdapter()
];

/**
 * Resolves the appropriate chatbot adapter for the current hostname.
 */
export function resolveChatbotAdapter(hostname?: string): IChatbotAdapter | null {
  const targetHost = hostname || (typeof location !== 'undefined' ? location.hostname : '');
  return ALL_ADAPTERS.find(adapter => adapter.matches(targetHost)) || null;
}
