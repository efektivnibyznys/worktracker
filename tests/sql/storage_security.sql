DO $$
DECLARE
  bucket storage.buckets;
BEGIN
  SELECT * INTO bucket FROM storage.buckets WHERE id = 'logos';
  IF bucket.file_size_limit <> 2097152 OR
     bucket.allowed_mime_types IS DISTINCT FROM ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']::text[] THEN
    RAISE EXCEPTION 'logo bucket limits are not enforced';
  END IF;
END $$;

SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

INSERT INTO storage.objects(bucket_id, name)
VALUES ('logos', '00000000-0000-0000-0000-000000000001/logo');

DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects(bucket_id, name)
    VALUES ('logos', '00000000-0000-0000-0000-000000000001/another.png');
    RAISE EXCEPTION 'expected arbitrary path rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected arbitrary path rejection' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE storage.objects
    SET name = '00000000-0000-0000-0000-000000000001/another.png'
    WHERE bucket_id = 'logos' AND name = '00000000-0000-0000-0000-000000000001/logo';
    RAISE EXCEPTION 'expected rename rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected rename rejection' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO storage.objects(bucket_id, name)
    VALUES ('logos', '00000000-0000-0000-0000-000000000002/logo');
    RAISE EXCEPTION 'expected cross-account rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected cross-account rejection' THEN RAISE; END IF;
  END;
END $$;

SELECT 'storage security checks passed' AS result;
