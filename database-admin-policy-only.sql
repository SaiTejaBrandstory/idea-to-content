-- Add admin policy for viewing all user history
-- Run this in your Supabase SQL editor

-- Add policy for admins to view all usage history (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'usage_history' 
        AND policyname = 'Admins can view all usage history'
    ) THEN
        CREATE POLICY "Admins can view all usage history" ON usage_history
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM users 
                    WHERE users.id = auth.uid() 
                    AND users.is_admin = true
                )
            );
    END IF;
END $$;

-- Verify the policy was created
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
WHERE tablename = 'usage_history' 
AND policyname = 'Admins can view all usage history'; 