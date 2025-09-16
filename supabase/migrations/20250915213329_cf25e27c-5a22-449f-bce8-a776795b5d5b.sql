-- Fix profiles foreign key and add signup trigger for automatic profile creation

-- 1) Ensure proper foreign keys on profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_master_account_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_master_account_id_fkey
  FOREIGN KEY (master_account_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- 2) Attach trigger to create profiles automatically after a new auth user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
