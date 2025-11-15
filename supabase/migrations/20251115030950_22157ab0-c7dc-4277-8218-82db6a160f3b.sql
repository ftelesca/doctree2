-- Função que vincula folder_share pendentes ao novo usuário
CREATE OR REPLACE FUNCTION public.link_pending_shares()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Buscar o email do novo usuário
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.id;

  -- Atualizar folder_share para vincular ao user_guest_id
  UPDATE public.folder_share
  SET user_guest_id = NEW.id
  WHERE LOWER(guest_email) = LOWER(user_email)
    AND user_guest_id IS NULL;

  RETURN NEW;
END;
$$;

-- Trigger que executa após inserir um novo profile
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_pending_shares();