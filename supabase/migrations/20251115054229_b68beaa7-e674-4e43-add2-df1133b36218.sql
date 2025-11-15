-- Ensure get_pending_share_details returns ONLY pending (unconfirmed) shares
CREATE OR REPLACE FUNCTION public.get_pending_share_details(_user_id uuid)
RETURNS TABLE (
  folder_id uuid,
  folder_name text,
  owner_name text,
  usuario_criador_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fs.folder_id,
    f.descricao AS folder_name,
    p.full_name AS owner_name,
    fs.usuario_criador_id
  FROM public.folder_share fs
  JOIN public.folder f ON f.id = fs.folder_id
  JOIN public.profiles p ON p.id = fs.usuario_criador_id
  WHERE fs.user_guest_id = _user_id
    AND fs.confirmed IS NULL
  ORDER BY fs.created_at ASC
  LIMIT 1;
END;
$$;

-- Optional: restrict default privileges if needed (Supabase usually handles function exec perms)
-- GRANT EXECUTE ON FUNCTION public.get_pending_share_details(uuid) TO anon, authenticated, service_role;