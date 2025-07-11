-- Fix for existing chat triggers and functions
-- Run this if you get trigger already exists errors

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS chat_messages_update_session_stats ON chat_messages;

-- Recreate the trigger
CREATE TRIGGER chat_messages_update_session_stats
    AFTER INSERT OR UPDATE OR DELETE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_chat_session_stats();

-- Verify the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'chat_messages_update_session_stats'; 