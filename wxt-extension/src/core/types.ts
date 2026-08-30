export * from './memory/schemas';

export type ChatbotPlatform =
  | 'gemini'
  | 'chatgpt'
  | 'claude'
  | 'deepseek'
  | 'grok'
  | 'meta';

export interface ScrapedTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  element?: HTMLElement | null;
}

export interface PromptRefinementRequest {
  rawPrompt: string;
  activeDimensions: string[];
  persona: import('./memory/schemas').PersonaV4;
  platform: ChatbotPlatform;
}

export interface PromptRefinementResponse {
  refinedPrompt: string;
  appliedDimensions: string[];
  diffHtml?: string;
}
