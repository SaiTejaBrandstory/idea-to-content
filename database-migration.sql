-- Migration: Add usage history tracking
-- Run this in your SQL editor to create the history tracking system

-- Add missing columns to usage_history table
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS generated_content_full TEXT;
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS all_generated_titles TEXT[];
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS references_files TEXT[];
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS references_urls TEXT[];
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS references_custom_text TEXT;
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS setup_step VARCHAR(50);
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS step_number INTEGER;
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS word_count VARCHAR(20);
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS paragraphs VARCHAR(20);
ALTER TABLE usage_history ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2);

-- Update the table structure to ensure all columns exist
CREATE TABLE IF NOT EXISTS usage_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    operation_type VARCHAR(50) NOT NULL, -- 'title_generation', 'blog_generation', 'humanize'
    api_provider VARCHAR(20) NOT NULL, -- 'openai', 'together', 'rephrasy'
    model_id VARCHAR(100) NOT NULL,
    model_name VARCHAR(100),
    
    -- User inputs
    keywords TEXT[],
    blog_type VARCHAR(50),
    selected_title TEXT,
    word_count VARCHAR(20),
    tone_type VARCHAR(50),
    tone_subtype VARCHAR(50),
    temperature DECIMAL(3,2),
    paragraphs VARCHAR(20),
    
    -- API response data
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Pricing data
    input_price_per_token DECIMAL(10,8),
    output_price_per_token DECIMAL(10,8),
    pricing_units VARCHAR(20), -- 'per_1K_tokens', 'per_1M_tokens'
    
    -- Cost calculations
    input_cost_usd DECIMAL(10,6),
    output_cost_usd DECIMAL(10,6),
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    
    -- Generated content (full content and preview)
    generated_content_full TEXT,
    generated_content_preview TEXT,
    content_length INTEGER,
    all_generated_titles TEXT[],
    
    -- References
    references_files TEXT[],
    references_urls TEXT[],
    references_custom_text TEXT,
    
    -- Setup tracking
    setup_step VARCHAR(50),
    step_number INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_usage_history_user_created ON usage_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_session ON usage_history(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_operation_api ON usage_history(operation_type, api_provider);
CREATE INDEX IF NOT EXISTS idx_usage_history_created_at ON usage_history(created_at);

-- Enable RLS
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their own usage history" ON usage_history;
DROP POLICY IF EXISTS "Users can insert their own usage history" ON usage_history;
DROP POLICY IF EXISTS "Users can update their own usage history" ON usage_history;
DROP POLICY IF EXISTS "Users can delete their own usage history" ON usage_history;

CREATE POLICY "Users can view their own usage history" ON usage_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage history" ON usage_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage history" ON usage_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own usage history" ON usage_history
    FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_history TO authenticated;
GRANT USAGE ON SEQUENCE usage_history_id_seq TO authenticated;

-- Create view for aggregated usage statistics
CREATE OR REPLACE VIEW usage_statistics AS
SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as usage_date,
    operation_type,
    api_provider,
    COUNT(*) as total_operations,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost_usd) as total_cost_usd,
    SUM(total_cost_inr) as total_cost_inr,
    AVG(total_cost_usd) as avg_cost_usd
FROM usage_history 
WHERE user_id IS NOT NULL
GROUP BY user_id, DATE_TRUNC('day', created_at), operation_type, api_provider;

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_user_total_usage(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_monthly_usage(UUID, DATE) CASCADE;

-- Create function to get user's total usage
CREATE OR REPLACE FUNCTION get_user_total_usage(user_uuid UUID)
RETURNS TABLE(
    total_operations BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    openai_operations BIGINT,
    together_operations BIGINT,
    rephrasy_operations BIGINT,
    humanize_operations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_operations,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        SUM(total_cost_usd) as total_cost_usd,
        SUM(total_cost_inr) as total_cost_inr,
        COUNT(*) FILTER (WHERE api_provider = 'openai') as openai_operations,
        COUNT(*) FILTER (WHERE api_provider = 'together') as together_operations,
        COUNT(*) FILTER (WHERE api_provider = 'rephrasy') as rephrasy_operations,
        COUNT(*) FILTER (WHERE operation_type = 'humanize') as humanize_operations
    FROM usage_history 
    WHERE user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's monthly usage
CREATE OR REPLACE FUNCTION get_user_monthly_usage(user_uuid UUID, year_month DATE)
RETURNS TABLE(
    operation_type VARCHAR(50),
    api_provider VARCHAR(20),
    total_operations BIGINT,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uh.operation_type,
        uh.api_provider,
        COUNT(*) as total_operations,
        SUM(uh.total_cost_usd) as total_cost_usd,
        SUM(uh.total_cost_inr) as total_cost_inr
    FROM usage_history uh
    WHERE uh.user_id = user_uuid 
    AND DATE_TRUNC('month', uh.created_at) = DATE_TRUNC('month', year_month)
    GROUP BY uh.operation_type, uh.api_provider
    ORDER BY uh.operation_type, uh.api_provider;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional - remove in production)
-- INSERT INTO usage_history (
--     user_id, session_id, operation_type, api_provider, model_id, model_name,
--     keywords, blog_type, selected_title, word_count, tone_type, tone_subtype,
--     input_tokens, output_tokens, total_tokens,
--     input_price_per_token, output_price_per_token, pricing_units,
--     input_cost_usd, output_cost_usd, total_cost_usd, total_cost_inr,
--     generated_content_preview, content_length
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--     'test-session-1',
--     'title_generation',
--     'together',
--     'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
--     'Llama 3.1 8B Turbo',
--     ARRAY['AI', 'content', 'generation'],
--     'Informative',
--     'How AI is Revolutionizing Content Creation',
--     '500-800',
--     'Professional',
--     'Friendly',
--     150,
--     200,
--     350,
--     0.00000014,
--     0.00000028,
--     'per_1M_tokens',
--     0.000021,
--     0.000056,
--     0.000077,
--     0.01,
--     'Generated 5 engaging blog titles focused on AI content creation...',
--     500
-- );

-- Verify the setup
SELECT 'Migration completed successfully' as status; 