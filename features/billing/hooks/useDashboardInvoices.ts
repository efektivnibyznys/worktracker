'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { InvoiceService } from '../services/invoiceService'
import type { DashboardInvoice } from '../lib/dashboardIncome'

const EMPTY_INVOICES: DashboardInvoice[] = []

export function useDashboardInvoices() {
  const supabase = useMemo(() => createClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])
  const query = useQuery({
    queryKey: ['invoices', 'dashboard'],
    queryFn: () => invoiceService.getDashboardInvoices(),
  })

  return { ...query, invoices: query.data ?? EMPTY_INVOICES }
}
