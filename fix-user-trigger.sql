-- Fix user trigger to properly capture full_name from auth.users
-- Run this in your Supabase SQL editor

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create improved function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, is_admin, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), -- Try to get name from metadata
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''), -- Try to get avatar from metadata
    false,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing users with empty full_name to use email as fallback
UPDATE public.users 
SET full_name = COALESCE(
  full_name, 
  CASE 
    WHEN full_name = '' OR full_name IS NULL THEN email
    ELSE full_name 
  END
)
WHERE full_name = '' OR full_name IS NULL;

-- Verify the trigger is working
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'; 