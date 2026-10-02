INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.clients(id, user_id, name) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Client A'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Client B'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'Other account')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.entries(id, user_id, client_id, date, start_time, end_time, duration_minutes, description, hourly_rate) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '09:00', '09:30', 30, 'Work A', 100),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '10:00', '10:30', 30, 'Work B', 200),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', CURRENT_DATE, '11:00', '11:30', 30, 'Other client', 100),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', CURRENT_DATE, '12:00', '12:30', 30, 'Other account', 100),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '13:00', '13:01', 1, 'One minute', 850),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, '14:00', '14:01', 1, 'Invalid rate', 'NaN')
ON CONFLICT (id) DO NOTHING;

SET ROLE authenticated;
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

DO $$
DECLARE
  created public.invoices;
  again public.invoices;
  item_total numeric;
  item_count integer;
BEGIN
  SELECT * INTO created FROM public.create_linked_invoice(jsonb_build_object(
    'client_id', '10000000-0000-0000-0000-000000000001',
    'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
    'group_by', 'day', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14, 'tax_rate', 0
  ));
  IF created.user_id <> auth.uid() OR created.subtotal <> 150 OR created.total_amount <> 150 THEN
    RAISE EXCEPTION 'linked invoice ownership or total mismatch';
  END IF;
  IF created.invoice_number <> to_char(CURRENT_DATE, 'YYYY') || '-0001' THEN
    RAISE EXCEPTION 'first number mismatch: %', created.invoice_number;
  END IF;
  SELECT COUNT(*), SUM(total_price) INTO item_count, item_total FROM public.invoice_items WHERE invoice_id = created.id;
  IF item_count <> 2 OR item_total <> created.subtotal THEN
    RAISE EXCEPTION 'mixed-rate lines do not reconcile';
  END IF;
  SELECT * INTO again FROM public.create_linked_invoice(jsonb_build_object(
    'client_id', '10000000-0000-0000-0000-000000000001',
    'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000005'),
    'group_by', 'entry', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14
  ));
  IF again.subtotal <> 14.17 OR NOT EXISTS (
    SELECT 1 FROM public.invoice_items
    WHERE invoice_id = again.id AND description = 'One minute'
      AND quantity = 1 AND unit = 'položka'
      AND unit_price = 14.17 AND total_price = 14.17
  ) THEN
    RAISE EXCEPTION 'one-minute line changes the work description or exact total';
  END IF;
  PERFORM public.delete_invoice(again.id);
  BEGIN
    PERFORM public.create_linked_invoice(jsonb_build_object(
      'client_id', '10000000-0000-0000-0000-000000000001',
      'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000006'),
      'group_by', 'entry', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14
    ));
    RAISE EXCEPTION 'expected NaN entry rate rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected NaN entry rate rejection' THEN RAISE; END IF;
  END;
  IF (SELECT COUNT(*) FROM public.entries WHERE invoice_id = created.id AND billing_status = 'billed') <> 2 THEN
    RAISE EXCEPTION 'linked entries not billed';
  END IF;

  BEGIN
    PERFORM public.create_linked_invoice(jsonb_build_object(
      'client_id', '10000000-0000-0000-0000-000000000001',
      'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000001'),
      'group_by', 'entry', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14
    ));
    RAISE EXCEPTION 'expected already-billed rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected already-billed rejection' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_linked_invoice(jsonb_build_object(
      'client_id', '10000000-0000-0000-0000-000000000001',
      'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000003'),
      'group_by', 'entry', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14
    ));
    RAISE EXCEPTION 'expected cross-client rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected cross-client rejection' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_linked_invoice(jsonb_build_object(
      'client_id', '10000000-0000-0000-0000-000000000001',
      'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000004'),
      'group_by', 'entry', 'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14
    ));
    RAISE EXCEPTION 'expected cross-account rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected cross-account rejection' THEN RAISE; END IF;
  END;

  SELECT * INTO again FROM public.update_invoice_status(created.id, 'paid');
  IF again.status <> 'paid' OR (SELECT COUNT(*) FROM public.entries WHERE invoice_id = created.id AND billing_status = 'paid') <> 2 THEN
    RAISE EXCEPTION 'paid transition mismatch';
  END IF;
  SELECT * INTO again FROM public.update_invoice_status(created.id, 'issued');
  IF again.status <> 'issued' OR (SELECT COUNT(*) FROM public.entries WHERE invoice_id = created.id AND billing_status = 'billed') <> 2 THEN
    RAISE EXCEPTION 'paid reversal mismatch';
  END IF;
  BEGIN
    UPDATE public.entries SET hourly_rate = 999
    WHERE id = '20000000-0000-0000-0000-000000000001';
    RAISE EXCEPTION 'expected billed entry edit rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected billed entry edit rejection' THEN RAISE; END IF;
  END;
  PERFORM public.delete_invoice(created.id);
  IF EXISTS (SELECT 1 FROM public.invoices WHERE id = created.id) OR
     (SELECT COUNT(*) FROM public.entries WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002') AND billing_status = 'unbilled' AND invoice_id IS NULL) <> 2 THEN
    RAISE EXCEPTION 'delete did not release entries';
  END IF;

  BEGIN
    PERFORM public.create_standalone_invoice(jsonb_build_object(
      'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14,
      'items', jsonb_build_array(jsonb_build_object('description', 'Invalid', 'quantity', 0, 'unit', 'ks', 'unit_price', 10))
    ));
    RAISE EXCEPTION 'expected zero-quantity rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected zero-quantity rejection' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.create_standalone_invoice(jsonb_build_object(
      'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14,
      'items', jsonb_build_array(jsonb_build_object('description', 'Invalid', 'quantity', 'NaN', 'unit', 'ks', 'unit_price', 10))
    ));
    RAISE EXCEPTION 'expected NaN quantity rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected NaN quantity rejection' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_standalone_invoice(jsonb_build_object(
      'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14,
      'items', jsonb_build_array(jsonb_build_object('description', 'Invalid', 'quantity', 1, 'unit', 'ks', 'unit_price', 'NaN'))
    ));
    RAISE EXCEPTION 'expected NaN price rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected NaN price rejection' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE subtotal = 'NaN'::numeric) THEN
    RAISE EXCEPTION 'NaN invoice persisted after a rejected input';
  END IF;

  SELECT * INTO again FROM public.create_standalone_invoice(jsonb_build_object(
    'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14, 'tax_rate', 21,
    'items', jsonb_build_array(jsonb_build_object('description', 'Service', 'quantity', 2, 'unit', 'ks', 'unit_price', 50.25))
  ));
  IF again.invoice_number <> to_char(CURRENT_DATE, 'YYYY') || '-0003' OR
     again.subtotal <> 100.50 OR again.tax_amount <> 21.11 OR again.total_amount <> 121.61 THEN
    RAISE EXCEPTION 'standalone totals or monotonic number mismatch';
  END IF;
  SELECT * INTO again FROM public.create_standalone_invoice(jsonb_build_object(
    'issue_date', CURRENT_DATE, 'due_date', CURRENT_DATE + 14, 'tax_rate', 21.005,
    'items', jsonb_build_array(jsonb_build_object('description', 'Large service', 'quantity', 1, 'unit', 'ks', 'unit_price', 10000))
  ));
  IF again.tax_rate <> 21.01 OR again.tax_amount <> 2101.00 THEN
    RAISE EXCEPTION 'tax amount does not match persisted tax rate';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', false);
  BEGIN
    PERFORM public.update_invoice_status(again.id, 'paid');
    RAISE EXCEPTION 'expected cross-account status rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected cross-account status rejection' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.delete_invoice(again.id);
    RAISE EXCEPTION 'expected cross-account delete rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected cross-account delete rejection' THEN RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', false);

  BEGIN
    INSERT INTO public.invoices(user_id, invoice_number, due_date)
    VALUES (auth.uid(), 'FORGED', CURRENT_DATE + 14);
    RAISE EXCEPTION 'expected direct invoice write rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected direct invoice write rejection' THEN RAISE; END IF;
  END;

  BEGIN
    INSERT INTO public.invoice_items(invoice_id, description, quantity, unit_price, total_price)
    VALUES (again.id, 'Forged', 1, 1, 1);
    RAISE EXCEPTION 'expected direct item write rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected direct item write rejection' THEN RAISE; END IF;
  END;

  BEGIN
    UPDATE public.entries SET billing_status = 'paid' WHERE id = '20000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'expected direct entry billing change rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected direct entry billing change rejection' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE public.entries SET billing_status = NULL WHERE id = '20000000-0000-0000-0000-000000000003';
    RAISE EXCEPTION 'expected null billing change rejection';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'expected null billing change rejection' THEN RAISE; END IF;
  END;
END $$;

SELECT 'invoice security checks passed' AS result;
