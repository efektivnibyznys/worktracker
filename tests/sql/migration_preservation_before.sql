-- Run after the existing schema and logo migration, before the security migrations.
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000041');
INSERT INTO public.clients(id, user_id, name, address, ico) VALUES (
  '10000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000041',
  'Historical client', 'Old address', '12345678'
);
UPDATE public.settings
SET company_name = 'Historical supplier', company_address = 'Supplier address',
    company_ico = '87654321', bank_account = '123456789/0100',
    logo_url = 'https://source.supabase.co/storage/v1/object/public/logos/00000000-0000-0000-0000-000000000041/old-logo.png'
WHERE user_id = '00000000-0000-0000-0000-000000000041';
INSERT INTO public.invoices(
  id, user_id, client_id, invoice_number, issue_date, due_date,
  invoice_type, status, subtotal, tax_rate, tax_amount, total_amount,
  client_name, client_address, client_ico, bank_account
) VALUES (
  '30000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000041',
  '10000000-0000-0000-0000-000000000041',
  to_char(CURRENT_DATE, 'YYYY') || '-0042', CURRENT_DATE, CURRENT_DATE + 14,
  'linked', 'issued', 100, 21, 21, 121,
  'Historical client', 'Old address', '12345678', '123456789/0100'
);
INSERT INTO public.entries(
  id, user_id, client_id, date, start_time, end_time, duration_minutes,
  description, hourly_rate, billing_status, invoice_id
) VALUES (
  '20000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000041',
  '10000000-0000-0000-0000-000000000041',
  CURRENT_DATE, '09:00', '10:00', 60, 'Historical work', 100,
  'billed', '30000000-0000-0000-0000-000000000041'
);
INSERT INTO public.invoice_items(
  id, invoice_id, entry_id, description, quantity, unit, unit_price, total_price
) VALUES (
  '40000000-0000-0000-0000-000000000041',
  '30000000-0000-0000-0000-000000000041',
  '20000000-0000-0000-0000-000000000041',
  'Historical work', 1, 'hod', 100, 100
);
INSERT INTO storage.objects(bucket_id, name) VALUES (
  'logos', '00000000-0000-0000-0000-000000000041/old-logo.png'
);

CREATE FUNCTION public.test_preservation_snapshot()
RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object(
    'users', (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM auth.users u),
    'clients', (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM public.clients c),
    'settings', (SELECT jsonb_agg(to_jsonb(s) ORDER BY user_id) FROM public.settings s),
    'invoices', (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.invoices i),
    'items', (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM public.invoice_items i),
    'entries', (SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM public.entries e),
    'logos', (SELECT jsonb_agg(to_jsonb(o) ORDER BY name) FROM storage.objects o)
  )
$$;
CREATE TABLE public.test_preservation_before (snapshot jsonb NOT NULL);
INSERT INTO public.test_preservation_before SELECT public.test_preservation_snapshot();
