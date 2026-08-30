import type { PersonaV4 } from '../../core/memory/schemas';

export interface PersonaDraft {
  id: string;
  source_prompt: string;
  persona: PersonaV4;
  provider: string;
  llm_model: string;
  created_at: string;
  is_public: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  activeModelProvider: string;
  activeModelName: string;
  autoRefineOnEnter: boolean;
  cloudSyncEnabled: boolean;
}

export interface RatingRecord {
  id: string;
  rating: number;
  feedback?: string;
  personaId?: string;
  createdAt: string;
}

export interface SyncAction {
  id: string;
  action: 'create' | 'update' | 'delete';
  entity: 'persona' | 'rating';
  payload: any;
  timestamp: number;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  theme: 'system',
  activeModelProvider: 'gemini',
  activeModelName: 'gemini-2.0-flash',
  autoRefineOnEnter: false,
  cloudSyncEnabled: false
};
