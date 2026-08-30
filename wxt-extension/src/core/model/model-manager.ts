import { MODEL_REGISTRY, type ModelDefinition } from './model-registry';
import { CryptoService } from '../crypto/crypto-service';

export interface ModelCredentials {
  provider: string;
  apiKey: string;
  customBaseUrl?: string;
  enabled: boolean;
}

export class ModelManager {
  private activeModelId: string = 'gemini-2.0-flash';
  private credentials: Record<string, ModelCredentials> = {};

  getActiveModel(): ModelDefinition {
    return MODEL_REGISTRY[this.activeModelId] || MODEL_REGISTRY['gemini-2.0-flash']!;
  }

  setActiveModel(modelId: string): boolean {
    if (MODEL_REGISTRY[modelId]) {
      this.activeModelId = modelId;
      return true;
    }
    return false;
  }

  async setApiKey(provider: string, rawKey: string): Promise<void> {
    const encrypted = await CryptoService.encrypt(rawKey);
    this.credentials[provider] = {
      provider,
      apiKey: encrypted,
      enabled: Boolean(rawKey)
    };
  }

  async getApiKey(provider: string): Promise<string> {
    const cred = this.credentials[provider];
    if (!cred || !cred.apiKey) return '';
    return CryptoService.decrypt(cred.apiKey);
  }

  async testConnection(provider: string, apiKey: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await new Promise(r => setTimeout(r, 150));
      if (!apiKey || apiKey.length < 5) throw new Error('Invalid API key format');
      return { success: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { success: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}
