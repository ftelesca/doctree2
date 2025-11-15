-- Add RLS policies to allow users to view entities and files in shared folders

-- Allow viewing doc_entity records for docs in shared folders
CREATE POLICY "Users can view doc entities in shared folders"
ON public.doc_entity
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM doc d
    JOIN folder_share fs ON fs.folder_id = d.folder_id
    WHERE d.id = doc_entity.doc_id
      AND fs.user_guest_id = auth.uid()
      AND fs.confirmed = true
  )
);

-- Allow viewing entities linked to docs in shared folders
CREATE POLICY "Users can view entities in shared folders"
ON public.entity
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM doc_entity de
    JOIN doc d ON d.id = de.doc_id
    JOIN folder_share fs ON fs.folder_id = d.folder_id
    WHERE de.entity_id = entity.id
      AND fs.user_guest_id = auth.uid()
      AND fs.confirmed = true
  )
);

-- Allow viewing doc_file records for docs in shared folders
CREATE POLICY "Users can view doc files in shared folders"
ON public.doc_file
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM doc d
    JOIN folder_share fs ON fs.folder_id = d.folder_id
    WHERE d.id = doc_file.doc_id
      AND fs.user_guest_id = auth.uid()
      AND fs.confirmed = true
  )
);