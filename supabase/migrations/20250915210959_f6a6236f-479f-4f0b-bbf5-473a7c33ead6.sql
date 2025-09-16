-- Update handle_new_user to support subusers created by admins
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If created with metadata is_subuser=true, create as team user linked to master
  IF COALESCE((NEW.raw_user_meta_data->>'is_subuser')::boolean, false) THEN
    INSERT INTO public.profiles (user_id, name, email, role, master_account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'user',
      COALESCE((NEW.raw_user_meta_data->>'master_account_id')::uuid, NULL)
    );
  ELSE
    -- Default behavior: owner account
    INSERT INTO public.profiles (user_id, name, email, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'master'
    );
  END IF;
  RETURN NEW;
END;
$$;