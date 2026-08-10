-- ============================================================================
-- SAVED PROMPTS TABLE
-- User-saved prompts for later persona extraction
-- ============================================================================

CREATE TABLE IF NOT EXISTS saved_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Prompt',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON saved_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_created_at ON saved_prompts(created_at DESC);

-- Row Level Security
ALTER TABLE saved_prompts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own prompts
CREATE POLICY "Users can view own prompts"
    ON saved_prompts FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own prompts
CREATE POLICY "Users can insert own prompts"
    ON saved_prompts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own prompts
CREATE POLICY "Users can delete own prompts"
    ON saved_prompts FOR DELETE
    USING (auth.uid() = user_id);

-- Users can update their own prompts
CREATE POLICY "Users can update own prompts"
    ON saved_prompts FOR UPDATE
    USING (auth.uid() = user_id);

-- Auto-update updated_at on modification
CREATE OR REPLACE FUNCTION update_saved_prompts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_prompts_updated_at
    BEFORE UPDATE ON saved_prompts
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_prompts_updated_at();
