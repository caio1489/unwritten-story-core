-- Fix infinite recursion in profiles table RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Master users can view their team profiles" ON public.profiles;

-- Recreate the policy without recursion using a safer approach
CREATE POLICY "Master users can view their team profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    -- User can see their own profile
    auth.uid() = user_id 
    OR 
    -- Master can see team members (avoid recursion by using direct auth.uid() check)
    (
      master_account_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.profiles p2 
        WHERE p2.user_id = auth.uid() 
        AND p2.role = 'master'
        AND master_account_id = p2.id
      )
    )
  );

-- Also fix the insert policy to avoid recursion
DROP POLICY IF EXISTS "Master users can insert team member profiles" ON public.profiles;

CREATE POLICY "Master users can insert team member profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can insert their own profile
    auth.uid() = user_id 
    OR 
    -- Only masters can insert profiles for team members
    has_role(auth.uid(), 'master'::app_role)
  );