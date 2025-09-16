-- Add is_active to profiles and indexes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Ensure updated_at trigger exists for profiles via existing function
-- (Assumes update_updated_at_column() and trigger already created elsewhere)
-- If trigger doesn't exist, create it defensively
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Optional: index for filtering by master and active
CREATE INDEX IF NOT EXISTS idx_profiles_master_active 
ON public.profiles (master_account_id, is_active);
