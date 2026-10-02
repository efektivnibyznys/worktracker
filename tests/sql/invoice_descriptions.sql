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
  ('20000000-0000-0000-0000-000000000011', '12:00', '12:01', 1, '', 900)
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
END $$;

ROLLBACK;
SELECT 'clean invoice descriptions and exact totals passed' AS result;
