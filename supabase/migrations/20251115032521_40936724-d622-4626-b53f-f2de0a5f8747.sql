-- Remove o constraint conflitante que impede user_guest_id e guest_email coexistirem
ALTER TABLE public.folder_share 
DROP CONSTRAINT IF EXISTS folder_share_guest_check;