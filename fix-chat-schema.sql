-- Simplified chat schema for Supabase
-- Run this to fix the foreign key issues

-- Drop existing tables if they exist
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_sessions;

-- Create chat_sessions table without foreign key constraints
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(255) DEFAULT 'New Chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_messages INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,6) DEFAULT 0,
    total_cost_inr DECIMAL(10,2) DEFAULT 0,
    total_tokens INTEGER DEFAULT 0
);

-- Create chat_messages table without foreign key constraints
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    model_id VARCHAR(100),
    model_name VARCHAR(100),
    api_provider VARCHAR(20), -- 'openai', 'together'
    
    -- Token and cost tracking
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    input_price_per_token DECIMAL(10,8),
    output_price_per_token DECIMAL(10,8),
    input_cost_usd DECIMAL(10,6),
    output_cost_usd DECIMAL(10,6),
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON chat_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Create function to update session statistics
CREATE OR REPLACE FUNCTION update_chat_session_stats(session_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE chat_sessions 
    SET 
        total_messages = (
            SELECT COUNT(*) 
            FROM chat_messages 
            WHERE session_id = session_uuid
        ),
        total_cost_usd = (
            SELECT COALESCE(SUM(total_cost_usd), 0) 
            FROM chat_messages 
            WHERE session_id = session_uuid
        ),
        total_cost_inr = (
            SELECT COALESCE(SUM(total_cost_inr), 0) 
            FROM chat_messages 
            WHERE session_id = session_uuid
        ),
        total_tokens = (
            SELECT COALESCE(SUM(total_tokens), 0) 
            FROM chat_messages 
            WHERE session_id = session_uuid
        ),
        updated_at = NOW()
    WHERE id = session_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function
CREATE OR REPLACE FUNCTION trigger_update_chat_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM update_chat_session_stats(NEW.session_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM update_chat_session_stats(NEW.session_id);
        IF OLD.session_id != NEW.session_id THEN
            PERFORM update_chat_session_stats(OLD.session_id);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_chat_session_stats(OLD.session_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS chat_messages_update_session_stats ON chat_messages;

-- Create trigger
CREATE TRIGGER chat_messages_update_session_stats
    AFTER INSERT OR UPDATE OR DELETE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_chat_session_stats();

-- Create function to get user's chat statistics
CREATE OR REPLACE FUNCTION get_user_chat_stats(user_uuid UUID)
RETURNS TABLE(
    total_sessions BIGINT,
    total_messages BIGINT,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    total_tokens BIGINT,
    openai_operations BIGINT,
    together_operations BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(cm.id) as total_messages,
        COALESCE(SUM(cm.total_cost_usd), 0) as total_cost_usd,
        COALESCE(SUM(cm.total_cost_inr), 0) as total_cost_inr,
        COALESCE(SUM(cm.total_tokens), 0) as total_tokens,
        COUNT(*) FILTER (WHERE cm.api_provider = 'openai') as openai_operations,
        COUNT(*) FILTER (WHERE cm.api_provider = 'together') as together_operations
    FROM chat_sessions cs
    LEFT JOIN chat_messages cm ON cs.id = cm.session_id
    WHERE cs.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to get chat session with messages
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

-- Create function to get user's chat sessions list
CREATE OR REPLACE FUNCTION get_user_chat_sessions(user_uuid UUID, limit_count INTEGER DEFAULT 50)
RETURNS TABLE(
    id UUID,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    total_messages INTEGER,
    total_cost_usd DECIMAL(10,6),
    total_cost_inr DECIMAL(10,2),
    total_tokens INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.created_at,
        cs.updated_at,
        cs.total_messages,
        cs.total_cost_usd,
        cs.total_cost_inr,
        cs.total_tokens
    FROM chat_sessions cs
    WHERE cs.user_id = user_uuid
    ORDER BY cs.updated_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql; 