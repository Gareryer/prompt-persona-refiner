import type { ModelDefinition } from '../model/model-registry';

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  systemPrompt?: string;
}

export interface LLMResponse {
  text: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
  raw?: any;
}

export class LLMClient {
  constructor(private provider: string, private apiKey: string) {}

  async generate(prompt: string, options: LLMRequestOptions = {}): Promise<LLMResponse> {
    if (this.provider === 'gemini') {
      return this.callGemini(prompt, options);
    }
    return this.callOpenAICompatible(prompt, options);
  }

  private async callGemini(prompt: string, options: LLMRequestOptions): Promise<LLMResponse> {
    const model = options.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 8192
      }
    };

    if (options.jsonMode) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    if (options.systemPrompt) {
      body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`Gemini API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { text, raw: data };
  }

  private async callOpenAICompatible(prompt: string, options: LLMRequestOptions): Promise<LLMResponse> {
    const url = this.provider === 'deepseek'
      ? 'https://api.deepseek.com/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const messages = [];
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: options.model || (this.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini'),
      messages,
      temperature: options.temperature ?? 0.7
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      throw new Error(`${this.provider.toUpperCase()} API Error: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return { text, raw: data };
  }
}
