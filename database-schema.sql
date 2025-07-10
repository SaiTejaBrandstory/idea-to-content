-- History tracking schema for idea-to-content application
-- Run this in your SQL editor to create the necessary tables

-- Create history table to track all user interactions
CREATE TABLE IF NOT EXISTS usage_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    operation_type VARCHAR(50) NOT NULL, -- 'title_generation', 'blog_generation', 'humanize'
    api_provider VARCHAR(20) NOT NULL, -- 'openai', 'together'
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
    
    -- Generated content (first 500 chars for preview)
    generated_content_preview TEXT,
    content_length INTEGER,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Indexes for performance
    CONSTRAINT idx_usage_history_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id),
    CONSTRAINT idx_usage_history_created_at_idx ON usage_history(created_at),
    CONSTRAINT idx_usage_history_operation_type_idx ON usage_history(operation_type),
    CONSTRAINT idx_usage_history_api_provider_idx ON usage_history(api_provider)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_usage_history_user_created ON usage_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_history_session ON usage_history(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_history_operation_api ON usage_history(operation_type, api_provider);

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

-- Create function to get user's total usage
CREATE OR REPLACE FUNCTION get_user_total_usage(user_uuid UUID)
RETURNS TABLE(
    total_operations BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    openai_operations BIGINT,
    together_operations BIGINT
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
        COUNT(*) FILTER (WHERE api_provider = 'together') as together_operations
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

-- Insert sample data for testing (optional)
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