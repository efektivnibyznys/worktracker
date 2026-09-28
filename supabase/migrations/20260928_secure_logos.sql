-- Storage enforces upload limits even when a caller bypasses the browser UI.
BEGIN;

UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']::text[]
WHERE id = 'logos';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'logos') THEN
    RAISE EXCEPTION 'logos Storage bucket is missing';
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can upload own logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own logo" ON storage.objects;

-- One stable object key per account prevents unbounded object creation.
-- Historical paths remain publicly readable and removable by their owner.
CREATE POLICY "Users can upload own logo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND name = auth.uid()::text || '/logo'
);

CREATE POLICY "Users can update own logo"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos'
  AND name = auth.uid()::text || '/logo'
)
WITH CHECK (
  bucket_id = 'logos'
  AND name = auth.uid()::text || '/logo'
);

COMMIT;
