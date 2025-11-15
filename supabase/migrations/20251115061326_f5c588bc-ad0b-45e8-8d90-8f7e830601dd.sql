-- Allow users to view files in shared folders
CREATE POLICY "Users can view files in shared folders"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1
    FROM doc_file df
    JOIN doc d ON d.id = df.doc_id
    JOIN folder_share fs ON fs.folder_id = d.folder_id
    WHERE df.storage_path = storage.objects.name
      AND fs.user_guest_id = auth.uid()
      AND fs.confirmed = true
  )
);