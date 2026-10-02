-- Run after all invoice migrations on a disposable PostgreSQL database.
BEGIN;

INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000010');
INSERT INTO public.clients(id, user_id, name) VALUES (
  '10000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010', 'Description test'
);
INSERT INTO public.phases(id, user_id, client_id, name) VALUES (
  '50000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010', 'Realizace (web)'
);
INSERT INTO public.projects(id, user_id, client_id, name) VALUES (
  '60000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000010', 'Web (mobilní verze)'
);
INSERT INTO public.entries(
  id, user_id, client_id, phase_id, project_id, date, start_time, end_time,
  duration_minutes, description, hourly_rate
)
SELECT id::uuid, '00000000-0000-0000-0000-000000000010',
       '10000000-0000-0000-0000-000000000010',
       '50000000-0000-0000-0000-000000000010',
       '60000000-0000-0000-0000-000000000010',
       '2026-10-02', start_time::time, end_time::time, minutes, description, rate
FROM (VALUES
  ('20000000-0000-0000-0000-000000000010', '09:00', '11:39', 159, 'Úprava webu (mobilní verze)', 850),
  ('20000000-0000-0000-0000-000000000011', '12:00', '12:01', 1, '', 900),
  ('20000000-0000-0000-0000-000000000012', '13:00', '13:01', 1, 'Short work 1', 850),
  ('20000000-0000-0000-0000-000000000013', '14:00', '14:01', 1, 'Short work 2', 850),
  ('20000000-0000-0000-0000-000000000014', '15:00', '15:01', 1, 'Short work 3', 850)
) AS fixture(id, start_time, end_time, minutes, description, rate);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000010';

DO $$
DECLARE
  grouping text;
  created public.invoices;
BEGIN
  FOREACH grouping IN ARRAY ARRAY['entry', 'phase', 'project', 'day'] LOOP
    SELECT * INTO created FROM public.create_linked_invoice(jsonb_build_object(
      'client_id', '10000000-0000-0000-0000-000000000010',
      'entry_ids', jsonb_build_array(
        '20000000-0000-0000-0000-000000000010',
        '20000000-0000-0000-0000-000000000011'
      ),
      'group_by', grouping, 'issue_date', '2026-10-02', 'due_date', '2026-10-16'
    ));
    IF created.subtotal <> 2267.50 OR created.total_amount <> 2267.50
       OR (SELECT COUNT(*) FROM public.invoice_items WHERE invoice_id = created.id) <> 2
       OR EXISTS (
         SELECT 1 FROM public.invoice_items
         WHERE invoice_id = created.id AND (
           quantity <> 1 OR unit <> 'položka' OR unit_price <> total_price
           OR total_price NOT IN (2252.50, 15.00)
           OR description NOT IN (
             CASE grouping
               WHEN 'entry' THEN 'Úprava webu (mobilní verze)'
               WHEN 'phase' THEN 'Realizace (web)'
               WHEN 'project' THEN 'Web (mobilní verze)'
               ELSE 'Práce dne 2026-10-02'
             END,
             CASE grouping WHEN 'entry' THEN 'Práce 2026-10-02' ELSE '' END
           )
         )
       ) THEN
      RAISE EXCEPTION 'Grouping % changes work descriptions or exact mixed-rate totals', grouping;
    END IF;
    PERFORM public.delete_invoice(created.id);
  END LOOP;

  SELECT * INTO created FROM public.create_linked_invoice(jsonb_build_object(
    'client_id', '10000000-0000-0000-0000-000000000010',
    'entry_ids', jsonb_build_array(
      '20000000-0000-0000-0000-000000000010',
      '20000000-0000-0000-0000-000000000011'
    ),
    'group_by', 'custom', 'custom_description', E'  Vývoj webu\nMobilní verze  ',
    'issue_date', '2026-10-02', 'due_date', '2026-10-16', 'tax_rate', 21
  ));
  IF created.subtotal <> 2267.50 OR created.tax_amount <> 476.18
     OR created.total_amount <> 2743.68
     OR (SELECT COUNT(*) FROM public.invoice_items WHERE invoice_id = created.id) <> 1
     OR NOT EXISTS (
       SELECT 1 FROM public.invoice_items WHERE invoice_id = created.id
         AND description = E'Vývoj webu\nMobilní verze' AND quantity = 1 AND unit = 'ks'
         AND unit_price = 2267.50 AND total_price = 2267.50
     )
     OR (SELECT COUNT(*) FROM public.entries WHERE invoice_id = created.id AND billing_status = 'billed') <> 2 THEN
    RAISE EXCEPTION 'custom grouping does not preserve its text, mixed-rate total or entry links';
  END IF;
  PERFORM public.delete_invoice(created.id);

  SELECT * INTO created FROM public.create_linked_invoice(jsonb_build_object(
    'client_id', '10000000-0000-0000-0000-000000000010',
    'entry_ids', jsonb_build_array(
      '20000000-0000-0000-0000-000000000012',
      '20000000-0000-0000-0000-000000000013',
      '20000000-0000-0000-0000-000000000014'
    ),
    'group_by', 'custom', 'custom_description', 'Konzultace (1 min při sazbě 850.00 Kč/h)',
    'issue_date', '2026-10-02', 'due_date', '2026-10-16'
  ));
  IF created.subtotal <> 42.51 OR NOT EXISTS (
    SELECT 1 FROM public.invoice_items WHERE invoice_id = created.id
      AND description = 'Konzultace (1 min při sazbě 850.00 Kč/h)'
      AND unit_price = 42.51 AND total_price = 42.51
  ) THEN
    RAISE EXCEPTION 'custom grouping changes explicit user text or rounded short-entry amounts';
  END IF;
  PERFORM public.delete_invoice(created.id);

  FOREACH grouping IN ARRAY ARRAY[NULL, '', E' \n\t ', repeat('a', 1001)] LOOP
    BEGIN
      PERFORM public.create_linked_invoice(jsonb_build_object(
        'client_id', '10000000-0000-0000-0000-000000000010',
        'entry_ids', jsonb_build_array('20000000-0000-0000-0000-000000000010'),
        'group_by', 'custom', 'custom_description', grouping,
        'issue_date', '2026-10-02', 'due_date', '2026-10-16'
      ));
      RAISE EXCEPTION 'expected custom description validation';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'Vlastní popis položky musí obsahovat 1 až 1000 znaků.' THEN RAISE; END IF;
    END;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.invoices WHERE user_id = auth.uid())
     OR EXISTS (SELECT 1 FROM public.entries WHERE user_id = auth.uid() AND billing_status <> 'unbilled') THEN
    RAISE EXCEPTION 'invalid custom descriptions left an invoice or billed entries';
  END IF;
END $$;

ROLLBACK;
SELECT 'clean invoice descriptions and exact totals passed' AS result;
