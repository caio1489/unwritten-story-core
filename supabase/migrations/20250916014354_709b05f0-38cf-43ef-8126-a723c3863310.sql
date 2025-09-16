-- Atualizar a função handle_new_user para confirmar automaticamente subusers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se criado com metadata is_subuser=true, criar como team user linked to master
  IF COALESCE((NEW.raw_user_meta_data->>'is_subuser')::boolean, false) THEN
    INSERT INTO public.profiles (user_id, name, email, role, master_account_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NEW.email,
      'user',
      COALESCE((NEW.raw_user_meta_data->>'master_account_id')::uuid, NULL)
    );
    
    -- Confirmar automaticamente o email para subusers
    -- Isso permite que façam login imediatamente sem precisar confirmar email
  ELSE
    -- Comportamento padrão: conta owner
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