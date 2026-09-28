-- Compare all existing business and Storage metadata rows around a migration rehearsal.
SELECT md5(jsonb_build_object(
  'clients', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.clients t),
  'phases', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.phases t),
  'projects', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.projects t),
  'entries', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.entries t),
  'settings', (SELECT jsonb_agg(to_jsonb(t) ORDER BY user_id) FROM public.settings t),
  'invoices', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.invoices t),
  'invoice_items', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM public.invoice_items t),
  'storage_objects', (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM storage.objects t)
)::text) AS existing_row_digest;
