-- Add RLS policy to allow users to view documents in shared folders
CREATE POLICY "Users can view docs in shared folders"
ON public.doc
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM folder_share fs
    WHERE fs.folder_id = doc.folder_id
      AND fs.user_guest_id = auth.uid()
      AND fs.confirmed = true
  )
);