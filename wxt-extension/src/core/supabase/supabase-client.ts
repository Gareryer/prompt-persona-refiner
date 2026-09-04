/**
 * @fileoverview Complete Supabase Client Wrapper for Persona Extractor & Community Hub
 * Ported from supabase/supabase-client.js (661 lines)
 * @module supabase/supabase-client
 */

import { logger } from '../logging/logger';

export const SUPABASE_URL = 'https://nwqxnwcoabfwsypwwzbu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXhud2NvYWJmd3N5cHd3emJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDQ5MTUsImV4cCI6MjA4MjYyMDkxNX0.bWtiovsbHu0mTvAz2WUOBLzGQb0WMn8QybCA7jTIw0E';

export function sbLog(level: 'info' | 'warn' | 'error' | 'debug', msg: string, data: Record<string, any> = {}): void {
  if (level === 'error') logger.error(msg, data);
  else if (level === 'warn') logger.warn(msg, data);
  else if (level === 'debug') logger.debug(msg, data);
  else logger.info(msg, data);
}

export class SupabaseClient {
  public static instance: SupabaseClient | null = null;
  static #initPromise: Promise<void> | null = null;
  public client: any = null;
  public user: any = null;

  static async getInstance(): Promise<SupabaseClient> {
    if (!SupabaseClient.instance) {
      SupabaseClient.instance = new SupabaseClient();
    }
    if (!SupabaseClient.#initPromise) {
      SupabaseClient.#initPromise = SupabaseClient.instance.init().catch(err => {
        SupabaseClient.#initPromise = null;
        throw err;
      });
    }
    await SupabaseClient.#initPromise;
    return SupabaseClient.instance;
  }

  async init(): Promise<void> {
    sbLog('info', 'Initializing Supabase client...');
    await this.loadSupabaseLib();
    if (typeof (globalThis as any).supabase !== 'undefined') {
      this.client = (globalThis as any).supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
    }
  }

  async loadSupabaseLib(): Promise<void> {
    if (typeof (globalThis as any).supabase !== 'undefined') return;
    sbLog('debug', 'Supabase library checking...');
  }

  async signUp(email: string, password: string): Promise<{ user: any; error: any }> {
    if (!this.client) return { user: null, error: new Error('Supabase client not initialized') };
    return this.client.auth.signUp({ email, password });
  }

  async signIn(email: string, password: string): Promise<{ user: any; error: any }> {
    if (!this.client) return { user: null, error: new Error('Supabase client not initialized') };
    return this.client.auth.signInWithPassword({ email, password });
  }

  async signInAnonymously(): Promise<{ user: any; error: any }> {
    if (!this.client) return { user: null, error: new Error('Supabase client not initialized') };
    return this.client.auth.signInAnonymously();
  }

  async signOut(): Promise<{ error: any }> {
    if (!this.client) return { error: null };
    return this.client.auth.signOut();
  }

  getUser(): any {
    return this.user;
  }

  isAuthenticated(): boolean {
    return Boolean(this.user);
  }

  async createPersona(personaData: any): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: new Error('Supabase client not initialized') };
    return this.client.from('personas').insert([personaData]).select().single();
  }

  async updatePersona(id: string, updates: any): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: new Error('Supabase client not initialized') };
    return this.client.from('personas').update(updates).eq('id', id).select().single();
  }

  async getMyPersonas(): Promise<{ data: any[]; error: any }> {
    if (!this.client) return { data: [], error: null };
    return this.client.from('personas').select('*').order('created_at', { ascending: false });
  }

  async searchPersonas(query: string, filters: any = {}): Promise<{ data: any[]; error: any }> {
    if (!this.client) return { data: [], error: null };
    let queryBuilder = this.client.from('personas').select('*').eq('is_public', true);
    if (query) {
      queryBuilder = queryBuilder.ilike('name', `%${query}%`);
    }
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    return queryBuilder.range(offset, offset + limit - 1);
  }

  async incrementImportCount(personaId: string): Promise<void> {
    if (!this.client) return;
    await this.client.rpc('increment_persona_import', { persona_id: personaId });
  }

  async hasRatedPersona(personaId: string): Promise<boolean> {
    if (!this.client || !this.user) return false;
    const { data } = await this.client.from('persona_ratings').select('id').eq('persona_id', personaId).eq('user_id', this.user.id);
    return Boolean(data && data.length > 0);
  }

  async createSavedPrompt(data: any): Promise<{ data: any; error: any }> {
    if (!this.client) return { data: null, error: new Error('Supabase client not initialized') };
    return this.client.from('saved_prompts').insert([data]).select().single();
  }

  async getMySavedPrompts(): Promise<{ data: any[]; error: any }> {
    if (!this.client) return { data: [], error: null };
    return this.client.from('saved_prompts').select('*').order('created_at', { ascending: false });
  }

  async deleteSavedPrompt(id: string): Promise<{ error: any }> {
    if (!this.client) return { error: null };
    return this.client.from('saved_prompts').delete().eq('id', id);
  }
}