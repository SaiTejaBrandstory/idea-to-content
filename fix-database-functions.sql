-- Fix database functions with ambiguous column references
-- Run this in your Supabase SQL editor

-- Drop and recreate the total usage function with proper table aliases
DROP FUNCTION IF EXISTS get_user_total_usage(UUID);

CREATE OR REPLACE FUNCTION get_user_total_usage(user_uuid UUID)
RETURNS TABLE(
    total_operations BIGINT,
    total_input_tokens BIGINT,
    total_output_tokens BIGINT,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    openai_operations BIGINT,
    together_operations BIGINT,
    rephrasy_operations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_operations,
        COALESCE(SUM(uh.input_tokens), 0) as total_input_tokens,
        COALESCE(SUM(uh.output_tokens), 0) as total_output_tokens,
        COALESCE(SUM(uh.total_cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(uh.total_cost_inr), 0) as total_cost_inr,
        COUNT(*) FILTER (WHERE uh.api_provider = 'openai') as openai_operations,
        COUNT(*) FILTER (WHERE uh.api_provider = 'together') as together_operations,
        COUNT(*) FILTER (WHERE uh.api_provider = 'rephrasy') as rephrasy_operations
    FROM usage_history uh
    WHERE uh.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the monthly usage function with proper table aliases
DROP FUNCTION IF EXISTS get_user_monthly_usage(UUID, DATE);

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
        COALESCE(SUM(uh.total_cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(uh.total_cost_inr), 0) as total_cost_inr
    FROM usage_history uh
    WHERE uh.user_id = user_uuid 
    AND DATE_TRUNC('month', uh.created_at) = DATE_TRUNC('month', year_month)
    GROUP BY uh.operation_type, uh.api_provider
    ORDER BY uh.operation_type, uh.api_provider;
END;
$$ LANGUAGE plpgsql;

-- Test the functions
SELECT 'Functions updated successfully' as status; 