import { describe, it, expect } from 'vitest';
import { resolveChatbotAdapter, ALL_ADAPTERS } from '@/adapters/chatbots/registry';

describe('Batch 5: Multi-Chatbot Platform Adapters', () => {
  it('registers all 6 major chatbot platforms', () => {
    expect(ALL_ADAPTERS.length).toBe(6);
    const platforms = ALL_ADAPTERS.map(a => a.platform);
    expect(platforms).toEqual(['gemini', 'chatgpt', 'claude', 'deepseek', 'grok', 'meta']);
  });

  it('resolves Gemini adapter for gemini.google.com', () => {
    const adapter = resolveChatbotAdapter('gemini.google.com');
    expect(adapter).not.toBeNull();
    expect(adapter?.platform).toBe('gemini');
  });

  it('resolves ChatGPT adapter for chatgpt.com and chat.openai.com', () => {
    expect(resolveChatbotAdapter('chatgpt.com')?.platform).toBe('chatgpt');
    expect(resolveChatbotAdapter('chat.openai.com')?.platform).toBe('chatgpt');
  });

  it('resolves Claude adapter for claude.ai', () => {
    expect(resolveChatbotAdapter('claude.ai')?.platform).toBe('claude');
  });

  it('resolves DeepSeek adapter for chat.deepseek.com', () => {
    expect(resolveChatbotAdapter('chat.deepseek.com')?.platform).toBe('deepseek');
  });

  it('resolves Grok adapter for grok.com', () => {
    expect(resolveChatbotAdapter('grok.com')?.platform).toBe('grok');
  });

  it('resolves Meta AI adapter for meta.ai', () => {
    expect(resolveChatbotAdapter('meta.ai')?.platform).toBe('meta');
  });

  it('returns null for unsupported domains', () => {
    expect(resolveChatbotAdapter('example.com')).toBeNull();
  });
});
