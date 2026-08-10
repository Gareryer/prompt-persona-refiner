/**
 * @fileoverview Supabase Client Wrapper for Persona Extractor
 * 
 * @description
 * Provides a unified interface for all Supabase operations including:
 * - Authentication (anonymous and email-based)
 * - Persona CRUD operations
 * - Rating submissions
 * - Full-text search
 * 
 * @module supabase/supabase-client
 * @requires @supabase/supabase-js (loaded via CDN)
 * 
 * @example
 * const client = await SupabaseClient.getInstance();
 * const personas = await client.searchPersonas('coding assistant');
 */

// ============================================================================
// SECTION 1: Configuration
// ============================================================================

const SUPABASE_URL = 'https://nwqxnwcoabfwsypwwzbu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53cXhud2NvYWJmd3N5cHd3emJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDQ5MTUsImV4cCI6MjA4MjYyMDkxNX0.bWtiovsbHu0mTvAz2WUOBLzGQb0WMn8QybCA7jTIw0E';

// ============================================================================
// SECTION 2: Supabase Client Singleton
// ============================================================================

/**
 * Structured logger for Supabase operations
 * @param {'info'|'warn'|'error'|'debug'} level - Log level
 * @param {string} msg - Log message
 * @param {Object} [data={}] - Additional context data
 */
function sbLog(level, msg, data = {}) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
    const prefix = `[${timestamp}] [Supabase]`;
    const hasData = Object.keys(data).length > 0;

    if (level === 'error') {
        console[level](`${prefix} ${msg}`, hasData ? data : '');
    } else if (level === 'warn') {
        console[level](`${prefix} ${msg}`, hasData ? data : '');
    } else {
        console.log(`${prefix} ${msg}`, hasData ? data : '');
    }
}

/**
 * SupabaseClient - Singleton wrapper for Supabase operations
 * 
 * @class
 * @description
 * Manages Supabase connection, authentication, and provides
 * type-safe methods for persona and rating operations.
 */
class SupabaseClient {
    static instance = null;

    /**
     * Get the singleton instance
     * @returns {Promise<SupabaseClient>}
     */
    static async getInstance() {
        if (!SupabaseClient.instance) {
            SupabaseClient.instance = new SupabaseClient();
            await SupabaseClient.instance.init();
        }
        return SupabaseClient.instance;
    }

    constructor() {
        this.client = null;
        this.user = null;
    }

    /**
     * Initialize Supabase client and restore session
     * @returns {Promise<void>}
     */
    async init() {
        sbLog('info', 'Initializing Supabase client...');

        // Load Supabase from CDN if not already loaded
        if (typeof supabase === 'undefined') {
            await this.loadSupabaseLib();
        }

        // Create client
        this.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false
            }
        });

        // Restore existing session
        const { data: { session } } = await this.client.auth.getSession();
        if (session) {
            this.user = session.user;
            sbLog('info', 'Session restored', { userId: this.user.id.slice(0, 8) });
        } else {
            sbLog('info', 'No existing session');
        }

        // Listen for auth changes
        this.client.auth.onAuthStateChange((event, session) => {
            this.user = session?.user || null;
            sbLog('info', 'Auth state changed', { event, userId: this.user?.id?.slice(0, 8) });
        });
    }

    /**
     * Check if Supabase library is loaded
     * Library is now bundled locally via script tag in HTML
     * @returns {Promise<void>}
     */
    async loadSupabaseLib() {
        // Supabase is now loaded via local bundle (supabase.min.js)
        // Check if it's available
        if (typeof supabase !== 'undefined') {
            sbLog('info', 'Supabase library already loaded');
            return;
        }

        // If not loaded, wait a bit and check again (script loading timing)
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof supabase === 'undefined') {
            sbLog('error', 'Supabase library not found - ensure supabase.min.js is loaded');
            throw new Error('Supabase library not loaded');
        }

        sbLog('info', 'Supabase library ready');
    }

    // ========================================================================
    // SECTION 3: Authentication
    // ========================================================================

    /**
     * Sign up with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user: Object|null, error: Error|null}>}
     */
    async signUp(email, password) {
        sbLog('info', 'Signing up...', { email });
        const { data, error } = await this.client.auth.signUp({
            email,
            password
        });

        if (error) {
            sbLog('error', 'Sign up failed', { error: error.message });
            return { user: null, error };
        }

        this.user = data.user;
        sbLog('info', 'Sign up successful', { userId: this.user?.id?.slice(0, 8) });
        return { user: data.user, error: null };
    }

    /**
     * Sign in with email and password
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{user: Object|null, error: Error|null}>}
     */
    async signIn(email, password) {
        sbLog('info', 'Signing in...', { email });
        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            sbLog('error', 'Sign in failed', { error: error.message });
            return { user: null, error };
        }

        this.user = data.user;
        sbLog('info', 'Sign in successful', { userId: this.user?.id?.slice(0, 8) });
        return { user: data.user, error: null };
    }

    /**
     * Sign in anonymously (creates temporary account)
     * @returns {Promise<{user: Object|null, error: Error|null}>}
     */
    async signInAnonymously() {
        sbLog('info', 'Signing in anonymously...');
        const { data, error } = await this.client.auth.signInAnonymously();

        if (error) {
            sbLog('error', 'Anonymous sign in failed', { error: error.message });
            return { user: null, error };
        }

        this.user = data.user;
        sbLog('info', 'Anonymous sign in successful', { userId: this.user?.id?.slice(0, 8) });
        return { user: data.user, error: null };
    }

    /**
     * Sign out current user
     * @returns {Promise<void>}
     */
    async signOut() {
        sbLog('info', 'Signing out...');
        await this.client.auth.signOut();
        this.user = null;
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getUser() {
        return this.user;
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return this.user !== null;
    }

    // ========================================================================
    // SECTION 4: Persona Operations
    // ========================================================================

    /**
     * @typedef {Object} PersonaData
     * @property {string} name - Persona name
     * @property {Object} memory_layer - Full memory layer data
     * @property {string} source_prompt - Original prompt used for extraction
     * @property {string} provider - LLM provider (Gemini, OpenAI, etc.)
     * @property {string} llm_model - Exact model used
     * @property {string[]} use_case_keywords - Keywords for search
     * @property {Object} metadata - Additional metadata from LLM
     * @property {boolean} is_public - Whether publicly visible
     */

    /**
     * Create a new persona
     * @param {PersonaData} personaData
     * @returns {Promise<{data: Object|null, error: Error|null}>}
     */
    async createPersona(personaData) {
        if (!this.user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        sbLog('info', 'Creating persona...', { name: personaData.name });

        const { data, error } = await this.client
            .from('personas')
            .insert({
                author_id: this.user.id,
                name: personaData.name,
                memory_layer: personaData.memory_layer,
                source_prompt: personaData.source_prompt,
                provider: personaData.provider,
                llm_model: personaData.llm_model,
                use_case_keywords: personaData.use_case_keywords,
                metadata: personaData.metadata,
                is_public: personaData.is_public || false,
                version: 1
            })
            .select()
            .single();

        if (error) {
            sbLog('error', 'Create persona failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Persona created', { id: data.id.slice(0, 8) });
        return { data, error: null };
    }

    /**
     * Update an existing persona (increments version and saves history)
     * @param {string} personaId
     * @param {Partial<PersonaData>} updates
     * @param {string} [changeNotes=''] - Optional change notes for this version
     * @returns {Promise<{data: Object|null, error: Error|null}>}
     */
    async updatePersona(personaId, updates, changeNotes = '') {
        if (!this.user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        sbLog('info', 'Updating persona...', { id: personaId.slice(0, 8) });

        // First get full current state for history snapshot
        const { data: current, error: fetchError } = await this.client
            .from('personas')
            .select('*')
            .eq('id', personaId)
            .eq('author_id', this.user.id)
            .single();

        if (fetchError || !current) {
            sbLog('error', 'Failed to fetch persona for update', { error: fetchError?.message });
            return { data: null, error: fetchError || new Error('Persona not found') };
        }

        const newVersion = (current.version || 0) + 1;

        // Create snapshot of current state (before update)
        const snapshot = {
            version: current.version || 1,
            created_at: current.updated_at || current.created_at,
            change_notes: changeNotes || null,  // Author's notes about what changed
            data: {
                name: current.name,
                is_public: current.is_public,
                metadata: current.metadata,
                memory_layer: current.memory_layer,
                source_prompt: current.source_prompt || ''
            }
        };

        // Append to version_history (keep last 10 versions)
        const existingHistory = current.version_history || [];
        const versionHistory = [snapshot, ...existingHistory].slice(0, 10);

        const { data, error } = await this.client
            .from('personas')
            .update({
                ...updates,
                version: newVersion,
                version_history: versionHistory,
                updated_at: new Date().toISOString()
            })
            .eq('id', personaId)
            .eq('author_id', this.user.id)
            .select()
            .single();

        if (error) {
            sbLog('error', 'Update persona failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Persona updated with history', { id: data.id.slice(0, 8), version: newVersion, historyCount: versionHistory.length });
        return { data, error: null };
    }


    /**
     * Delete a persona
     * @param {string} personaId
     * @returns {Promise<{error: Error|null}>}
     */
    async deletePersona(personaId) {
        if (!this.user) {
            return { error: new Error('Not authenticated') };
        }

        sbLog('info', 'Deleting persona...', { id: personaId.slice(0, 8) });

        const { error } = await this.client
            .from('personas')
            .delete()
            .eq('id', personaId)
            .eq('author_id', this.user.id);

        if (error) {
            sbLog('error', 'Delete persona failed', { error: error.message });
            return { error };
        }

        sbLog('info', 'Persona deleted');
        return { error: null };
    }

    /**
     * Get author's personas
     * @returns {Promise<{data: Object[]|null, error: Error|null}>}
     */
    async getMyPersonas() {
        if (!this.user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        sbLog('info', 'Fetching my personas...');

        const { data, error } = await this.client
            .from('personas')
            .select('*')
            .eq('author_id', this.user.id)
            .order('updated_at', { ascending: false });

        if (error) {
            sbLog('error', 'Fetch my personas failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Fetched my personas', { count: data.length });
        return { data, error: null };
    }

    /**
     * Search public personas
     * @param {string} query - Search query
     * @param {Object} [filters={}] - Optional filters
     * @param {string} [filters.provider] - Filter by provider
     * @param {number} [filters.minRating] - Minimum average rating
     * @param {number} [filters.limit=20] - Results limit
     * @param {number} [filters.offset=0] - Pagination offset
     * @returns {Promise<{data: Object[]|null, error: Error|null}>}
     */
    async searchPersonas(query, filters = {}) {
        sbLog('info', 'Searching personas...', { query, filters });

        let queryBuilder = this.client
            .from('personas')
            .select('*')
            .eq('is_public', true);

        // Full-text search on name and keywords
        if (query) {
            queryBuilder = queryBuilder.or(
                `name.ilike.%${query}%,use_case_keywords.cs.{${query}}`
            );
        }

        // Apply filters
        if (filters.provider) {
            queryBuilder = queryBuilder.eq('provider', filters.provider);
        }

        if (filters.minRating) {
            queryBuilder = queryBuilder.gte('avg_rating', filters.minRating);
        }

        // Pagination
        const limit = filters.limit || 20;
        const offset = filters.offset || 0;
        queryBuilder = queryBuilder
            .order('import_count', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error } = await queryBuilder;

        if (error) {
            sbLog('error', 'Search personas failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Search complete', { count: data.length });
        return { data, error: null };
    }

    /**
     * Get a single persona by ID
     * @param {string} personaId
     * @returns {Promise<{data: Object|null, error: Error|null}>}
     */
    async getPersona(personaId) {
        sbLog('info', 'Fetching persona...', { id: personaId.slice(0, 8) });

        const { data, error } = await this.client
            .from('personas')
            .select('*')
            .eq('id', personaId)
            .single();

        if (error) {
            sbLog('error', 'Fetch persona failed', { error: error.message });
            return { data: null, error };
        }

        return { data, error: null };
    }

    /**
     * Increment import count for a persona
     * @param {string} personaId
     * @returns {Promise<void>}
     */
    async incrementImportCount(personaId) {
        await this.client.rpc('increment_import_count', { persona_id: personaId });
    }

    // ========================================================================
    // SECTION 5: Rating Operations
    // ========================================================================

    /**
     * Submit a rating for a persona
     * @param {string} personaId
     * @param {number} rating - 1-5 stars
     * @param {string} sessionId - Chat session ID
     * @returns {Promise<{error: Error|null}>}
     */
    async submitRating(personaId, rating, sessionId) {
        if (!this.user) {
            return { error: new Error('Not authenticated') };
        }

        if (rating < 1 || rating > 5) {
            return { error: new Error('Rating must be between 1 and 5') };
        }

        sbLog('info', 'Submitting rating...', { personaId: personaId.slice(0, 8), rating });

        const { error } = await this.client
            .from('ratings')
            .upsert({
                persona_id: personaId,
                rater_id: this.user.id,
                rating,
                session_id: sessionId
            }, {
                onConflict: 'persona_id,rater_id'
            });

        if (error) {
            sbLog('error', 'Submit rating failed', { error: error.message });
            return { error };
        }

        // Update persona average rating
        await this.client.rpc('update_persona_rating', { persona_id: personaId });

        sbLog('info', 'Rating submitted');
        return { error: null };
    }

    /**
     * Check if user has already rated a persona
     * @param {string} personaId
     * @returns {Promise<{hasRated: boolean, rating: number|null}>}
     */
    async hasRatedPersona(personaId) {
        if (!this.user) {
            return { hasRated: false, rating: null };
        }

        const { data } = await this.client
            .from('ratings')
            .select('rating')
            .eq('persona_id', personaId)
            .eq('rater_id', this.user.id)
            .single();

        return {
            hasRated: !!data,
            rating: data?.rating || null
        };
    }

    // ========================================================================
    // SECTION 6: Saved Prompt Operations
    // ========================================================================

    /**
     * Create a saved prompt
     * @param {Object} promptData - { title, content }
     * @returns {Promise<{data: Object|null, error: Error|null}>}
     */
    async createSavedPrompt(promptData) {
        if (!this.user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        sbLog('info', 'Creating saved prompt...', { title: promptData.title });

        const { data, error } = await this.client
            .from('saved_prompts')
            .insert({
                user_id: this.user.id,
                title: promptData.title || 'Untitled Prompt',
                content: promptData.content
            })
            .select()
            .single();

        if (error) {
            sbLog('error', 'Create saved prompt failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Saved prompt created', { id: data.id.slice(0, 8) });
        return { data, error: null };
    }

    /**
     * Get user's saved prompts
     * @returns {Promise<{data: Object[]|null, error: Error|null}>}
     */
    async getMySavedPrompts() {
        if (!this.user) {
            return { data: null, error: new Error('Not authenticated') };
        }

        sbLog('info', 'Fetching saved prompts...');

        const { data, error } = await this.client
            .from('saved_prompts')
            .select('*')
            .eq('user_id', this.user.id)
            .order('created_at', { ascending: false });

        if (error) {
            sbLog('error', 'Fetch saved prompts failed', { error: error.message });
            return { data: null, error };
        }

        sbLog('info', 'Fetched saved prompts', { count: data.length });
        return { data, error: null };
    }

    /**
     * Delete a saved prompt
     * @param {string} promptId
     * @returns {Promise<{error: Error|null}>}
     */
    async deleteSavedPrompt(promptId) {
        if (!this.user) {
            return { error: new Error('Not authenticated') };
        }

        sbLog('info', 'Deleting saved prompt...', { id: promptId.slice(0, 8) });

        const { error } = await this.client
            .from('saved_prompts')
            .delete()
            .eq('id', promptId)
            .eq('user_id', this.user.id);

        if (error) {
            sbLog('error', 'Delete saved prompt failed', { error: error.message });
            return { error };
        }

        sbLog('info', 'Saved prompt deleted');
        return { error: null };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SupabaseClient = SupabaseClient;
}
