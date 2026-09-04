import type { PersonaV4 } from '../../core/memory/schemas';
import type { UserSettings } from '../storage/items';

export interface ProtocolMap {
  CHECK_API_KEY: {
    request: void;
    response: { hasKey: boolean; canOpenOptions?: boolean; error?: string };
  };
  OPEN_OPTIONS_PAGE: {
    request: void;
    response: { success: boolean };
  };
  EXTRACT_PERSONA: {
    request: { prompt: string; provider?: string; model?: string };
    response: { success: boolean; data?: PersonaV4; error?: string };
  };
  REFINE_PROMPT: {
    request: { rawPrompt: string; personaId?: string; activeDimensions?: string[] };
    response: { success: boolean; refinedPrompt?: string; diffHtml?: string; error?: string };
  };
  INJECT_PROMPT_TO_ACTIVE_TAB: {
    request: { text: string };
    response: { success: boolean; error?: string };
  };
  GET_SETTINGS: {
    request: void;
    response: UserSettings;
  };
  UPDATE_SETTINGS: {
    request: Partial<UserSettings>;
    response: UserSettings;
  };
  GET_PERSONAS: {
    request: void;
    response: Record<string, PersonaV4>;
  };
  SAVE_PERSONA: {
    request: { id: string; persona: PersonaV4 };
    response: { success: boolean };
  };
  DELETE_PERSONA: {
    request: { id: string };
    response: { success: boolean };
  };
  PUBLISH_PERSONA: {
    request: { id: string };
    response: { success: boolean; publicId?: string; error?: string };
  };
  SET_THEME: {
    request: { theme: 'dark' | 'light' };
    response: { success: boolean };
  };
  PIN_COMPONENT: {
    request: { sessionId: string; componentId: string };
    response: { success: boolean };
  };
  UNPIN_COMPONENT: {
    request: { sessionId: string; componentId: string };
    response: { success: boolean };
  };
  REPORT_PERSONA: {
    request: { personaId: string; reason: string; details?: string };
    response: { success: boolean };
  };
  CHECK_RATING_ELIGIBILITY: {
    request: void;
    response: { eligible: boolean };
  };
  SAVE_DRAFT: {
    request: { draft: any };
    response: { success: boolean; draftId?: string };
  };
}

export type MessageType = keyof ProtocolMap;
