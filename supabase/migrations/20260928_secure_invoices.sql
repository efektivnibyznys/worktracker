-- Apply with the application release that switches invoice writes to these RPCs.
-- Abort on existing duplicate invoice numbers; issued invoices must never be silently renumbered.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.invoices
    GROUP BY user_id, invoice_number
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate invoice numbers exist; resolve them manually before this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_number_unique
  ON public.invoices (user_id, invoice_number);

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.invoice_number_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_year integer NOT NULL,
  last_number integer NOT NULL CHECK (last_number >= 0),
  PRIMARY KEY (user_id, invoice_year)
);
REVOKE ALL ON private.invoice_number_counters FROM PUBLIC, anon, authenticated;

-- Preserve the largest historical number even if a later invoice was deleted.
INSERT INTO private.invoice_number_counters (user_id, invoice_year, last_number)
SELECT user_id,
       substring(invoice_number FROM '^([0-9]{4})-')::integer,
       MAX(substring(invoice_number FROM '^[0-9]{4}-([0-9]+)$')::integer)
FROM public.invoices
WHERE invoice_number ~ '^[0-9]{4}-[0-9]+$'
GROUP BY user_id, substring(invoice_number FROM '^([0-9]{4})-')::integer
ON CONFLICT (user_id, invoice_year) DO UPDATE
SET last_number = GREATEST(private.invoice_number_counters.last_number, EXCLUDED.last_number);

CREATE OR REPLACE FUNCTION private.next_invoice_number(p_user_id uuid, p_year integer)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_number integer;
BEGIN
  INSERT INTO private.invoice_number_counters(user_id, invoice_year, last_number)
  VALUES (p_user_id, p_year, 1)
  ON CONFLICT (user_id, invoice_year) DO UPDATE
  SET last_number = private.invoice_number_counters.last_number + 1
  RETURNING last_number INTO v_number;
  RETURN p_year::text || '-' || lpad(v_number::text, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION private.next_invoice_number(uuid, integer) FROM PUBLIC, anon, authenticated;

-- A browser cannot change billing links directly, including by deleting a billed entry.
CREATE OR REPLACE FUNCTION public.protect_entry_billing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.invoice_id IS NOT NULL OR NEW.billing_status IS DISTINCT FROM 'unbilled' THEN
        RAISE EXCEPTION 'Invoice links can only be changed through invoice operations';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id
         OR NEW.billing_status IS DISTINCT FROM OLD.billing_status THEN
        RAISE EXCEPTION 'Invoice links can only be changed through invoice operations';
      END IF;
      IF (OLD.invoice_id IS NOT NULL OR OLD.billing_status IS DISTINCT FROM 'unbilled')
         AND ROW(NEW.user_id, NEW.client_id, NEW.phase_id, NEW.project_id,
                 NEW.date, NEW.start_time, NEW.end_time, NEW.duration_minutes,
                 NEW.description, NEW.hourly_rate)
             IS DISTINCT FROM
             ROW(OLD.user_id, OLD.client_id, OLD.phase_id, OLD.project_id,
                 OLD.date, OLD.start_time, OLD.end_time, OLD.duration_minutes,
                 OLD.description, OLD.hourly_rate) THEN
        RAISE EXCEPTION 'Delete the invoice before editing a billed entry';
      END IF;
    ELSIF TG_OP = 'DELETE' THEN
      IF OLD.invoice_id IS NOT NULL OR OLD.billing_status <> 'unbilled' THEN
        RAISE EXCEPTION 'Delete the invoice before deleting a billed entry';
      END IF;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_entry_billing ON public.entries;
CREATE TRIGGER protect_entry_billing
BEFORE INSERT OR UPDATE OR DELETE ON public.entries
FOR EACH ROW EXECUTE FUNCTION public.protect_entry_billing();
REVOKE ALL ON FUNCTION public.protect_entry_billing() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_linked_invoice(p_input jsonb)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_client_id uuid;
  v_entry_ids uuid[];
  v_requested integer;
  v_locked integer;
  v_changed integer;
  v_group_by text;
  v_issue_date date;
  v_due_date date;
  v_tax_rate numeric;
  v_client_name text;
  v_client_address text;
  v_client_ico text;
  v_bank_account text;
  v_invoice public.invoices;
  v_subtotal numeric;
  v_tax_amount numeric;
BEGIN
  IF v_user_id IS NULL OR p_input IS NULL OR jsonb_typeof(p_input) <> 'object' THEN
    RAISE EXCEPTION 'Authenticated invoice input is required';
  END IF;
  v_client_id := (p_input->>'client_id')::uuid;
  v_group_by := p_input->>'group_by';
  v_issue_date := (p_input->>'issue_date')::date;
  v_due_date := (p_input->>'due_date')::date;
  v_tax_rate := round(COALESCE((p_input->>'tax_rate')::numeric, 0), 2);
  IF v_client_id IS NULL OR v_group_by NOT IN ('entry', 'phase', 'project', 'day')
     OR v_group_by IS NULL OR v_issue_date IS NULL OR v_due_date IS NULL
     OR v_due_date < v_issue_date OR v_tax_rate < 0 OR v_tax_rate > 100 THEN
    RAISE EXCEPTION 'Invalid invoice details';
  END IF;
  IF jsonb_typeof(p_input->'entry_ids') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Entry IDs must be an array';
  END IF;
  v_requested := jsonb_array_length(p_input->'entry_ids');
  IF v_requested < 1 OR v_requested > 500 THEN
    RAISE EXCEPTION 'Select between 1 and 500 entries';
  END IF;
  SELECT array_agg(DISTINCT value::uuid ORDER BY value::uuid)
  INTO v_entry_ids
  FROM jsonb_array_elements_text(p_input->'entry_ids') AS value;
  IF cardinality(v_entry_ids) <> v_requested THEN
    RAISE EXCEPTION 'Entry IDs must be unique';
  END IF;

  SELECT c.name, c.address, c.ico
  INTO v_client_name, v_client_address, v_client_ico
  FROM public.clients c
  WHERE c.id = v_client_id AND c.user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;
  SELECT COALESCE(NULLIF(btrim(p_input->>'bank_account'), ''), NULLIF(btrim(s.bank_account), ''))
  INTO v_bank_account
  FROM public.settings s WHERE s.user_id = v_user_id;

  -- The locks last until commit. A second invoice cannot claim the same entries.
  SELECT COUNT(*) INTO v_locked FROM (
    SELECT e.id
    FROM public.entries e
    WHERE e.id = ANY(v_entry_ids)
      AND e.user_id = v_user_id
      AND e.client_id = v_client_id
      AND e.billing_status = 'unbilled'
      AND e.invoice_id IS NULL
    ORDER BY e.id
    FOR UPDATE OF e
  ) locked_entries;
  IF v_locked <> v_requested THEN
    RAISE EXCEPTION 'Some entries are missing, billed, or belong to another client';
  END IF;
  -- PostgreSQL numeric can hold NaN, which passes a simple nonnegative CHECK.
  IF EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = ANY(v_entry_ids)
      AND (e.hourly_rate < 0 OR e.hourly_rate > 99999999.99)
  ) THEN
    RAISE EXCEPTION 'An entry has an invalid hourly rate';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.entries e
    WHERE e.id = ANY(v_entry_ids)
      AND (
        (e.phase_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.phases p
          WHERE p.id = e.phase_id AND p.user_id = v_user_id AND p.client_id = v_client_id
        ))
        OR (e.project_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = e.project_id AND p.user_id = v_user_id AND p.client_id = v_client_id
        ))
      )
  ) THEN
    RAISE EXCEPTION 'An entry has a phase or project outside this client';
  END IF;

  INSERT INTO public.invoices(
    user_id, client_id, client_name, client_address, client_ico, invoice_number,
    issue_date, due_date, invoice_type, status, subtotal, tax_rate, tax_amount,
    total_amount, notes, variable_symbol, bank_account
  ) VALUES (
    v_user_id, v_client_id, v_client_name, v_client_address, v_client_ico,
    private.next_invoice_number(v_user_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    v_issue_date, v_due_date, 'linked', 'draft', 0, v_tax_rate, 0, 0,
    p_input->>'notes', p_input->>'variable_symbol', v_bank_account
  ) RETURNING * INTO v_invoice;

  -- Linked lines are fixed-price lines with exact minutes and the hourly rate
  -- in the description. This keeps cents exact for fractional hours.
  IF v_group_by = 'entry' THEN
    INSERT INTO public.invoice_items(
      invoice_id, entry_id, phase_id, project_id, description, quantity,
      unit, unit_price, total_price, sort_order
    )
    SELECT v_invoice.id, e.id, e.phase_id, e.project_id,
           COALESCE(NULLIF(e.description, ''), 'Práce ' || e.date::text) ||
             ' (' || e.duration_minutes::text ||
             ' min při sazbě ' || e.hourly_rate::text || ' Kč/h)',
           1, 'položka',
           round(e.duration_minutes::numeric * e.hourly_rate / 60, 2),
           round(e.duration_minutes::numeric * e.hourly_rate / 60, 2),
           row_number() OVER (ORDER BY e.date, e.start_time, e.id) - 1
    FROM public.entries e WHERE e.id = ANY(v_entry_ids);
  ELSIF v_group_by = 'phase' THEN
    INSERT INTO public.invoice_items(
      invoice_id, phase_id, description, quantity, unit, unit_price, total_price, sort_order
    )
    SELECT v_invoice.id, e.phase_id,
           COALESCE(p.name, 'Bez fáze') || ' (' ||
             SUM(e.duration_minutes)::text ||
             ' min při sazbě ' || e.hourly_rate::text || ' Kč/h)',
           1, 'položka',
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           row_number() OVER (ORDER BY COALESCE(p.name, 'Bez fáze'), e.hourly_rate) - 1
    FROM public.entries e
    LEFT JOIN public.phases p ON p.id = e.phase_id AND p.user_id = v_user_id
    WHERE e.id = ANY(v_entry_ids)
    GROUP BY e.phase_id, p.name, e.hourly_rate;
  ELSIF v_group_by = 'project' THEN
    INSERT INTO public.invoice_items(
      invoice_id, project_id, description, quantity, unit, unit_price, total_price, sort_order
    )
    SELECT v_invoice.id, e.project_id,
           COALESCE(p.name, 'Bez projektu') || ' (' ||
             SUM(e.duration_minutes)::text ||
             ' min při sazbě ' || e.hourly_rate::text || ' Kč/h)',
           1, 'položka',
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           row_number() OVER (ORDER BY COALESCE(p.name, 'Bez projektu'), e.hourly_rate) - 1
    FROM public.entries e
    LEFT JOIN public.projects p ON p.id = e.project_id AND p.user_id = v_user_id
    WHERE e.id = ANY(v_entry_ids)
    GROUP BY e.project_id, p.name, e.hourly_rate;
  ELSE
    INSERT INTO public.invoice_items(
      invoice_id, description, quantity, unit, unit_price, total_price, sort_order
    )
    SELECT v_invoice.id, 'Práce dne ' || e.date::text || ' (' ||
             SUM(e.duration_minutes)::text ||
             ' min při sazbě ' || e.hourly_rate::text || ' Kč/h)',
           1, 'položka',
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           round(SUM(e.duration_minutes)::numeric * e.hourly_rate / 60, 2),
           row_number() OVER (ORDER BY e.date, e.hourly_rate) - 1
    FROM public.entries e WHERE e.id = ANY(v_entry_ids)
    GROUP BY e.date, e.hourly_rate;
  END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM public.invoice_items WHERE invoice_id = v_invoice.id;
  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  UPDATE public.invoices
  SET subtotal = v_subtotal, tax_amount = v_tax_amount,
      total_amount = v_subtotal + v_tax_amount
  WHERE id = v_invoice.id RETURNING * INTO v_invoice;
  UPDATE public.entries
  SET billing_status = 'billed', invoice_id = v_invoice.id
  WHERE id = ANY(v_entry_ids) AND user_id = v_user_id
    AND billing_status = 'unbilled' AND invoice_id IS NULL;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> v_requested THEN
    RAISE EXCEPTION 'Entry claim changed during invoice creation';
  END IF;
  RETURN v_invoice;
END;
$$;
REVOKE ALL ON FUNCTION public.create_linked_invoice(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_linked_invoice(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_standalone_invoice(p_input jsonb)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_client_id uuid;
  v_client_name text;
  v_client_address text;
  v_client_ico text;
  v_bank_account text;
  v_issue_date date;
  v_due_date date;
  v_tax_rate numeric;
  v_items jsonb;
  v_invoice public.invoices;
  v_subtotal numeric;
  v_tax_amount numeric;
BEGIN
  IF v_user_id IS NULL OR p_input IS NULL OR jsonb_typeof(p_input) <> 'object' THEN
    RAISE EXCEPTION 'Authenticated invoice input is required';
  END IF;
  v_client_id := NULLIF(p_input->>'client_id', '')::uuid;
  v_issue_date := (p_input->>'issue_date')::date;
  v_due_date := (p_input->>'due_date')::date;
  v_tax_rate := round(COALESCE((p_input->>'tax_rate')::numeric, 0), 2);
  v_items := p_input->'items';
  IF v_issue_date IS NULL OR v_due_date IS NULL OR v_due_date < v_issue_date
     OR v_tax_rate < 0 OR v_tax_rate > 100
     OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid invoice details';
  END IF;
  IF jsonb_array_length(v_items) < 1 OR jsonb_array_length(v_items) > 200 THEN
    RAISE EXCEPTION 'Select between 1 and 200 invoice items';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_items) AS item
    WHERE jsonb_typeof(item) <> 'object'
       OR NULLIF(btrim(item->>'description'), '') IS NULL
       OR NULLIF(btrim(item->>'unit'), '') IS NULL
       OR (item->>'quantity') IS NULL
       OR (item->>'quantity')::numeric <= 0
       OR (item->>'quantity')::numeric > 99999999.99
       OR (item->>'unit_price') IS NULL
       OR (item->>'unit_price')::numeric < 0
       OR (item->>'unit_price')::numeric > 9999999999.99
  ) THEN
    RAISE EXCEPTION 'Invalid invoice item';
  END IF;
  IF v_client_id IS NOT NULL THEN
    SELECT c.name, c.address, c.ico
    INTO v_client_name, v_client_address, v_client_ico
    FROM public.clients c
    WHERE c.id = v_client_id AND c.user_id = v_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Client not found'; END IF;
  END IF;
  SELECT COALESCE(NULLIF(btrim(p_input->>'bank_account'), ''), NULLIF(btrim(s.bank_account), ''))
  INTO v_bank_account
  FROM public.settings s WHERE s.user_id = v_user_id;

  INSERT INTO public.invoices(
    user_id, client_id, client_name, client_address, client_ico, invoice_number,
    issue_date, due_date, invoice_type, status, subtotal, tax_rate, tax_amount,
    total_amount, notes, variable_symbol, bank_account
  ) VALUES (
    v_user_id, v_client_id, v_client_name, v_client_address, v_client_ico,
    private.next_invoice_number(v_user_id, EXTRACT(YEAR FROM CURRENT_DATE)::integer),
    v_issue_date, v_due_date, 'standalone', 'draft', 0, v_tax_rate, 0, 0,
    p_input->>'notes', p_input->>'variable_symbol', v_bank_account
  ) RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_items(
    invoice_id, description, quantity, unit, unit_price, total_price, sort_order
  )
  SELECT v_invoice.id, btrim(item->>'description'),
         round((item->>'quantity')::numeric, 2), btrim(item->>'unit'),
         round((item->>'unit_price')::numeric, 2),
         round(round((item->>'quantity')::numeric, 2) *
               round((item->>'unit_price')::numeric, 2), 2),
         ordinal - 1
  FROM jsonb_array_elements(v_items) WITH ORDINALITY AS lines(item, ordinal);
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM public.invoice_items WHERE invoice_id = v_invoice.id;
  v_tax_amount := round(v_subtotal * v_tax_rate / 100, 2);
  UPDATE public.invoices
  SET subtotal = v_subtotal, tax_amount = v_tax_amount,
      total_amount = v_subtotal + v_tax_amount
  WHERE id = v_invoice.id RETURNING * INTO v_invoice;
  RETURN v_invoice;
END;
$$;
REVOKE ALL ON FUNCTION public.create_standalone_invoice(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_standalone_invoice(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_invoice_status(p_invoice_id uuid, p_status text)
RETURNS public.invoices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice public.invoices;
BEGIN
  IF auth.uid() IS NULL OR p_status NOT IN ('draft', 'issued', 'sent', 'paid', 'cancelled', 'overdue')
     OR p_status IS NULL THEN
    RAISE EXCEPTION 'Invalid invoice status';
  END IF;
  SELECT * INTO v_invoice FROM public.invoices
  WHERE id = p_invoice_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  UPDATE public.invoices
  SET status = p_status,
      paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE NULL END
  WHERE id = p_invoice_id RETURNING * INTO v_invoice;
  UPDATE public.entries
  SET billing_status = CASE WHEN p_status = 'paid' THEN 'paid' ELSE 'billed' END
  WHERE invoice_id = p_invoice_id AND user_id = auth.uid();
  RETURN v_invoice;
END;
$$;
REVOKE ALL ON FUNCTION public.update_invoice_status(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_invoice_status(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_invoice(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invoice public.invoices;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT * INTO v_invoice FROM public.invoices
  WHERE id = p_invoice_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
  UPDATE public.entries
  SET billing_status = 'unbilled', invoice_id = NULL
  WHERE invoice_id = p_invoice_id AND user_id = auth.uid();
  DELETE FROM public.invoices WHERE id = p_invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_invoice(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_invoice(uuid) TO authenticated;

-- Only the transactional functions may mutate invoice headers and lines.
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can insert own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can update own invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice items" ON public.invoice_items;
REVOKE INSERT, UPDATE, DELETE ON public.invoices, public.invoice_items
FROM PUBLIC, anon, authenticated;

COMMIT;
