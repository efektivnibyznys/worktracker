-- Run after both security migrations. All preexisting business and logo rows stay byte-for-byte equivalent as JSON.
DO $$
BEGIN
  IF (SELECT snapshot FROM public.test_preservation_before)
     IS DISTINCT FROM public.test_preservation_snapshot() THEN
    RAISE EXCEPTION 'An existing business or logo row changed during migration';
  END IF;
  IF (SELECT last_number FROM private.invoice_number_counters
      WHERE user_id = '00000000-0000-0000-0000-000000000041'
        AND invoice_year = EXTRACT(YEAR FROM CURRENT_DATE)::integer) <> 42 THEN
    RAISE EXCEPTION 'Historical invoice number was not preserved in the counter';
  END IF;
END $$;
SELECT 'existing invoices, work entries and logo metadata preserved' AS result;
