-- RLS Policies for usage_history table
-- Run this in your Supabase SQL editor

-- Enable RLS on the usage_history table
ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own history
CREATE POLICY "Users can view their own usage history" ON usage_history
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy for users to insert their own history
CREATE POLICY "Users can insert their own usage history" ON usage_history
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own history
CREATE POLICY "Users can update their own usage history" ON usage_history
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy for users to delete their own history
CREATE POLICY "Users can delete their own usage history" ON usage_history
    FOR DELETE
    USING (auth.uid() = user_id);

-- NEW: Policy for admins to view all user history
CREATE POLICY "Admins can view all usage history" ON usage_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.is_admin = true
        )
    );

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON usage_history TO authenticated;

-- Grant usage on the sequence
GRANT USAGE ON SEQUENCE usage_history_id_seq TO authenticated;

-- Test the policies
-- This should work for authenticated users:
-- SELECT * FROM usage_history WHERE user_id = auth.uid();

-- Verify the policies are in place
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'usage_history'; 