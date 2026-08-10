-- =============================================================================
-- Persona Extractor Database Schema
-- =============================================================================
-- Run this SQL in your Supabase SQL Editor to create all required tables
-- and enable Row Level Security policies.
-- =============================================================================

-- =============================================================================
-- SECTION 1: Profiles Table (extends auth.users)
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- SECTION 2: Personas Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Core content
    name TEXT NOT NULL,
    memory_layer JSONB NOT NULL,
    source_prompt TEXT,
    
    -- LLM info
    provider TEXT NOT NULL,
    llm_model TEXT NOT NULL,
    
    -- Metadata (from LLM extraction)
    use_case_keywords TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Status
    is_public BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    
    -- Stats (auto-updated)
    import_count INTEGER DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    rating_sum INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Indexes for search performance
CREATE INDEX IF NOT EXISTS idx_personas_author ON personas(author_id);
CREATE INDEX IF NOT EXISTS idx_personas_public ON personas(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_personas_keywords ON personas USING GIN(use_case_keywords);
CREATE INDEX IF NOT EXISTS idx_personas_name ON personas USING GIN(to_tsvector('english', name));

-- Personas policies
CREATE POLICY "Public personas are viewable by everyone"
    ON personas FOR SELECT
    USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Users can create their own personas"
    ON personas FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own personas"
    ON personas FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own personas"
    ON personas FOR DELETE
    USING (auth.uid() = author_id);

-- =============================================================================
-- SECTION 3: Ratings Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one rating per user per persona
    UNIQUE(persona_id, rater_id)
);

-- Enable RLS
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ratings_persona ON ratings(persona_id);

-- Ratings policies
CREATE POLICY "Anyone can view ratings"
    ON ratings FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can rate"
    ON ratings FOR INSERT
    WITH CHECK (auth.uid() = rater_id);

CREATE POLICY "Users can update their own ratings"
    ON ratings FOR UPDATE
    USING (auth.uid() = rater_id);

-- =============================================================================
-- SECTION 4: Helper Functions
-- =============================================================================

-- Function to increment import count (called via RPC)
CREATE OR REPLACE FUNCTION increment_import_count(persona_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE personas
    SET import_count = import_count + 1
    WHERE id = persona_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update persona rating average (called via RPC after rating)
CREATE OR REPLACE FUNCTION update_persona_rating(persona_id UUID)
RETURNS VOID AS $$
DECLARE
    total_ratings INTEGER;
    sum_ratings INTEGER;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(rating), 0)
    INTO total_ratings, sum_ratings
    FROM ratings
    WHERE ratings.persona_id = update_persona_rating.persona_id;
    
    UPDATE personas
    SET 
        rating_count = total_ratings,
        rating_sum = sum_ratings,
        avg_rating = CASE 
            WHEN total_ratings > 0 THEN ROUND(sum_ratings::NUMERIC / total_ratings, 2)
            ELSE 0
        END
    WHERE id = update_persona_rating.persona_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- SECTION 5: Enable Anonymous Auth (run in Supabase Dashboard)
-- =============================================================================
-- Go to Authentication > Providers > Anonymous and enable it
-- This allows users to start using the app without signing up

-- =============================================================================
-- DONE! Your database is now ready for the Persona Extractor.
-- =============================================================================
