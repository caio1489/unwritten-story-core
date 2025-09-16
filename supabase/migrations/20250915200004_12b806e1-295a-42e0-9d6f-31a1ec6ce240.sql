-- Fix RLS recursion on profiles and set sane access rules
-- Enable Row Level Security (safe if already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on profiles to remove recursive ones
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT polname AS name
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.name);
  END LOOP;
END
$$;

-- Allow users to read their own profile and, if master, the sub-users (by master_account_id)
CREATE POLICY "profiles_select_self_or_subusers"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id
  OR master_account_id = auth.uid()
);

-- Allow users to insert their own profile (used on first login if profile is missing)
CREATE POLICY "profiles_insert_self"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile or master to update their sub-users
CREATE POLICY "profiles_update_self_or_master"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR master_account_id = auth.uid())
WITH CHECK (auth.uid() = user_id OR master_account_id = auth.uid());

-- Keep things strict: no deletes by default (omit DELETE policy)

-- Ensure updated_at is maintained automatically
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;