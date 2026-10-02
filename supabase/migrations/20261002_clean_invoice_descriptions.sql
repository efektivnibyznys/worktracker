-- Remove the generated duration/rate suffix from new linked invoice items.
-- Historical invoice rows and all financial calculations remain unchanged.
-- Apply after 20260928_secure_invoices.sql.

BEGIN;

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

  -- Keep work descriptions clean. Fixed-price amounts still use exact minutes
  -- and separate hourly-rate groups to preserve fractional-hour totals.
  IF v_group_by = 'entry' THEN
    INSERT INTO public.invoice_items(
      invoice_id, entry_id, phase_id, project_id, description, quantity,
      unit, unit_price, total_price, sort_order
    )
    SELECT v_invoice.id, e.id, e.phase_id, e.project_id,
           COALESCE(NULLIF(e.description, ''), 'Práce ' || e.date::text),
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
           COALESCE(p.name, 'Bez fáze'),
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
           COALESCE(p.name, 'Bez projektu'),
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
    SELECT v_invoice.id, 'Práce dne ' || e.date::text,
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

COMMIT;
