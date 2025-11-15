-- Create function to get pending share details (bypasses RLS for invited users)
CREATE OR REPLACE FUNCTION public.get_pending_share_details(_user_id UUID)
RETURNS TABLE (
  folder_id UUID,
  folder_name TEXT,
  owner_name TEXT,
  usuario_criador_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    fs.folder_id,
    f.descricao as folder_name,
    p.full_name as owner_name,
    fs.usuario_criador_id
  FROM folder_share fs
  JOIN folder f ON f.id = fs.folder_id
  JOIN profiles p ON p.id = fs.usuario_criador_id
  WHERE fs.user_guest_id = _user_id
    AND fs.confirmed IS NULL
  LIMIT 1;
$$;