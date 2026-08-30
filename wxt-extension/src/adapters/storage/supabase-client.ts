import type { PersonaV4 } from '../../core/memory/schemas';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://nwqxnwcoabfwsypwwzbu.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXhud2NvYWJmd3N5cHd3emJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDQ5MTUsImV4cCI6MjA4MjYyMDkxNX0.bWtiovsbHu0mTvAz2WUOBLzGQb0WMn8QybCA7jTIw0E'
};

export class SupabaseClientAdapter {
  constructor(private config: SupabaseConfig = DEFAULT_SUPABASE_CONFIG) {}

  /**
   * Publishes a persona to the Supabase community hub.
   */
  async publishPersona(persona: PersonaV4, authorId?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // In web extension context, uses standard REST endpoint
      const response = await fetch(`${this.config.url}/rest/v1/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.config.anonKey,
          'Authorization': `Bearer ${this.config.anonKey}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          name: persona.metadata?.suggested_name || 'Unnamed Persona',
          title: persona.metadata?.suggested_title || 'AI Assistant',
          domain: persona.metadata?.domain || 'tech',
          memory_layer: persona,
          metadata: persona.metadata,
          author_id: authorId || null,
          created_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, id: data[0]?.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }
}
