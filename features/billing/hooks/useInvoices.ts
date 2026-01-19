import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { InvoiceService } from '../services/invoiceService'
import type {
  InvoiceFilters,
  InvoiceStatus,
  CreateLinkedInvoiceInput,
  CreateStandaloneInvoiceInput,
  InvoiceWithRelations
} from '../types/invoice.types'
import { toast } from 'sonner'

const INVOICES_KEY = 'invoices'
const ENTRIES_KEY = 'entries'

function createSupabaseClient() {
  return createClient()
}

/**
 * Hook for managing invoices - list, create, update, delete
 */
export function useInvoices(filters?: InvoiceFilters) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])
  const queryClient = useQueryClient()

  // Fetch invoices with filters
  const {
    data: invoices = [],
    isLoading,
    error
  } = useQuery({
    queryKey: [INVOICES_KEY, filters],
    queryFn: () => invoiceService.getAllWithFilters(filters)
  })

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: [INVOICES_KEY, 'stats'],
    queryFn: () => invoiceService.getStats()
  })

  // Create linked invoice mutation
  const createLinkedInvoice = useMutation({
    mutationFn: (input: CreateLinkedInvoiceInput) =>
      invoiceService.createLinkedInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
      toast.success('Faktura byla vytvořena')
    },
    onError: (error: Error) => {
      toast.error(`Chyba při vytváření faktury: ${error.message}`)
    }
  })

  // Create standalone invoice mutation
  const createStandaloneInvoice = useMutation({
    mutationFn: (input: CreateStandaloneInvoiceInput) =>
      invoiceService.createStandaloneInvoice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      toast.success('Faktura byla vytvořena')
    },
    onError: (error: Error) => {
      toast.error(`Chyba při vytváření faktury: ${error.message}`)
    }
  })

  // Update status mutation
  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      invoiceService.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })

      const statusLabels: Record<InvoiceStatus, string> = {
        draft: 'Koncept',
        issued: 'Vystavena',
        sent: 'Odeslána',
        paid: 'Zaplacena',
        cancelled: 'Stornována',
        overdue: 'Po splatnosti'
      }
      toast.success(`Faktura označena jako: ${statusLabels[variables.status]}`)
    },
    onError: (error: Error) => {
      toast.error(`Chyba: ${error.message}`)
    }
  })

  // Delete mutation
  const deleteInvoice = useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INVOICES_KEY] })
      queryClient.invalidateQueries({ queryKey: [ENTRIES_KEY] })
      toast.success('Faktura byla smazána')
    },
    onError: (error: Error) => {
      toast.error(`Chyba při mazání: ${error.message}`)
    }
  })

  return {
    invoices,
    stats,
    isLoading,
    error,
    createLinkedInvoice,
    createStandaloneInvoice,
    updateStatus,
    deleteInvoice
  }
}

/**
 * Hook for fetching single invoice with items
 */
export function useInvoice(id: string) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])

  return useQuery({
    queryKey: [INVOICES_KEY, id],
    queryFn: () => invoiceService.getByIdWithItems(id),
    enabled: !!id
  })
}

/**
 * Hook for fetching unbilled entries
 */
export function useUnbilledEntries(clientId?: string) {
  const supabase = useMemo(() => createSupabaseClient(), [])
  const invoiceService = useMemo(() => new InvoiceService(supabase), [supabase])

  return useQuery({
    queryKey: [ENTRIES_KEY, 'unbilled', clientId],
    queryFn: () => invoiceService.getUnbilledEntries(clientId)
  })
}
