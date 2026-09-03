/*
# Storage policies for issue-photos bucket

## Purpose
Allow authenticated users to upload photos for their issue reports, and allow
public read access since the bucket is public (photos are displayed in the app).

## Security
- SELECT (read): public — anyone can view issue photos (they're public civic data).
- INSERT: authenticated only — users must be signed in to upload.
- UPDATE/DELETE: authenticated users can manage their own uploads (path starts with their user id).
*/

DROP POLICY IF EXISTS "public_read_issue_photos" ON storage.objects;
CREATE POLICY "public_read_issue_photos" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'issue-photos');

DROP POLICY IF EXISTS "auth_insert_issue_photos" ON storage.objects;
CREATE POLICY "auth_insert_issue_photos" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'issue-photos');

DROP POLICY IF EXISTS "auth_update_own_issue_photos" ON storage.objects;
CREATE POLICY "auth_update_own_issue_photos" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'issue-photos');

DROP POLICY IF EXISTS "auth_delete_own_issue_photos" ON storage.objects;
CREATE POLICY "auth_delete_own_issue_photos" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'issue-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
