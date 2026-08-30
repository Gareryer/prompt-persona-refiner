import { describe, it, expect } from 'vitest';
import { CryptoService } from '@/core/crypto/crypto-service';
import { ModelManager } from '@/core/model/model-manager';
import { MODEL_REGISTRY } from '@/core/model/model-registry';
import { UnifiedAnalyzer } from '@/core/memory/analyzers/unified-analyzer';
import { ThemeController } from '@/core/theme/theme-controller';

describe('Modular Architecture Services', () => {
  it('encrypts and decrypts API keys round-trip', async () => {
    const rawKey = 'sk-proj-1234567890abcdef';
    const encrypted = await CryptoService.encrypt(rawKey);
    expect(encrypted).not.toBe(rawKey);

    const decrypted = await CryptoService.decrypt(encrypted);
    expect(decrypted).toBe(rawKey);
  });

  it('manages model catalog and active selection', () => {
    const manager = new ModelManager();
    expect(manager.getActiveModel().id).toBe('gemini-2.0-flash');

    manager.setActiveModel('claude-3-5-sonnet');
    expect(manager.getActiveModel().name).toBe('Anthropic Claude 3.5 Sonnet');
  });

  it('runs unified analyzer heuristic on conversation turns', async () => {
    const analyzer = new UnifiedAnalyzer();
    const result = await analyzer.analyzeConversation([
      { id: '1', role: 'user', content: 'How do I build a Chrome extension?', timestamp: Date.now() },
      { id: '2', role: 'assistant', content: 'Use WXT with React 19 and TypeScript.', timestamp: Date.now() }
    ]);

    expect(result).not.toBeNull();
    expect(result?.persona?.instruction).toContain('AI Assistant');
  });

  it('initializes and switches theme modes', () => {
    const theme = new ThemeController();
    theme.init('dark');
    expect(theme.getMode()).toBe('dark');

    theme.setMode('light');
    expect(theme.getMode()).toBe('light');
  });
});
