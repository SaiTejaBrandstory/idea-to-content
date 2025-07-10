-- Simple migration to add missing columns to usage_history table
-- Run this in your Supabase SQL editor

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