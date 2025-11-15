-- Create policy for shared folder visibility (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'folder'
      AND policyname = 'Guests can view shared folders they are invited to'
  ) THEN
    CREATE POLICY "Guests can view shared folders they are invited to"
    ON public.folder
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.folder_share fs
        WHERE fs.folder_id = folder.id
          AND fs.user_guest_id = auth.uid()
          AND (fs.confirmed IS NULL OR fs.confirmed = TRUE)
      )
    );
  END IF;
END$$;

-- Create policy for viewing owner profiles (only if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Guests can view profiles of owners who shared with them'
  ) THEN
    CREATE POLICY "Guests can view profiles of owners who shared with them"
    ON public.profiles
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.folder_share fs
        WHERE fs.usuario_criador_id = profiles.id
          AND fs.user_guest_id = auth.uid()
          AND (fs.confirmed IS NULL OR fs.confirmed = TRUE)
      )
    );
  END IF;
END$$;