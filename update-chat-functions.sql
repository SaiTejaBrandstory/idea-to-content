-- Update chat functions to include user data
-- Run this in your Supabase SQL editor

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_chat_session_with_messages(uuid, uuid);

-- Create the updated function without user data (API will handle user data separately)
CREATE OR REPLACE FUNCTION get_chat_session_with_messages(session_uuid UUID, user_uuid UUID)
RETURNS TABLE(
    session_id UUID,
    session_title VARCHAR(255),
    session_created_at TIMESTAMP WITH TIME ZONE,
    session_updated_at TIMESTAMP WITH TIME ZONE,
    session_total_messages INTEGER,
    session_total_cost_usd DECIMAL(10,6),
    session_total_cost_inr DECIMAL(10,2),
    session_total_tokens INTEGER,
    session_user_id UUID,
    message_id UUID,
    message_role VARCHAR(20),
    message_content TEXT,
    message_model_id VARCHAR(100),
    message_model_name VARCHAR(100),
    message_api_provider VARCHAR(20),
    message_input_tokens INTEGER,
    message_output_tokens INTEGER,
    message_total_tokens INTEGER,
    message_total_cost_usd DECIMAL(10,6),
    message_total_cost_inr DECIMAL(10,2),
    message_created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id as session_id,
        cs.title as session_title,
        cs.created_at as session_created_at,
        cs.updated_at as session_updated_at,
        cs.total_messages as session_total_messages,
        cs.total_cost_usd as session_total_cost_usd,
        cs.total_cost_inr as session_total_cost_inr,
        cs.total_tokens as session_total_tokens,
        cs.user_id as session_user_id,
        cm.id as message_id,
        cm.role as message_role,
        cm.content as message_content,
        cm.model_id as message_model_id,
        cm.model_name as message_model_name,
        cm.api_provider as message_api_provider,
        cm.input_tokens as message_input_tokens,
        cm.output_tokens as message_output_tokens,
        cm.total_tokens as message_total_tokens,
        cm.total_cost_usd as message_total_cost_usd,
        cm.total_cost_inr as message_total_cost_inr,
        cm.created_at as message_created_at
    FROM chat_sessions cs
    LEFT JOIN chat_messages cm ON cs.id = cm.session_id
    WHERE cs.id = session_uuid AND (user_uuid IS NULL OR cs.user_id = user_uuid)
    ORDER BY cm.created_at ASC;
END;
$$ LANGUAGE plpgsql; 