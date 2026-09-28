CREATE SCHEMA storage;
CREATE FUNCTION storage.foldername(path text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(path, '/'))[1:array_length(string_to_array(path, '/'), 1) - 1]
$$;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  bucket_id text NOT NULL REFERENCES storage.buckets(id),
  name text NOT NULL,
  PRIMARY KEY (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
