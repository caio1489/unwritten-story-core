-- Remove recursive policies and add safe, non-recursive RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on profiles
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname AS name
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.name);
  END LOOP;
END
$$;

-- Read own profile or rows where you are the master (no self-references)
CREATE POLICY "profiles_select_self_or_master_of_row"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR master_account_id = auth.uid()
);

-- Insert only your own profile
CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Update your own profile, or if you're the master of that row
CREATE POLICY "profiles_update_self_or_master"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR master_account_id = auth.uid())
WITH CHECK (auth.uid() = user_id OR master_account_id = auth.uid());

-- No delete policy (kept strict)