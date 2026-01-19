'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { usePageMetadata } from '@/lib/hooks/usePageMetadata'
import { useInvoices } from '@/features/billing/hooks/useInvoices'
import { useClients } from '@/features/time-tracking/hooks/useClients'
import {
  InvoiceStatsCards,
  InvoiceFiltersCard,
  InvoiceCard,
  CreateInvoiceDialog
} from '@/features/billing/components'
import type { InvoiceFilters, InvoiceStatus, InvoiceWithRelations } from '@/features/billing/types/invoice.types'

export default function InvoicesPage() {
  usePageMetadata({
    title: 'Faktury | Work Tracker',
    description: 'Správa a přehled faktur'
  })

  const router = useRouter()
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Data fetching
  const {
    invoices,
    stats,
    isLoading,
    updateStatus,
    deleteInvoice
  } = useInvoices(filters)
  const { clients } = useClients()

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof InvoiceFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  // Invoice actions
  const handleView = useCallback((invoice: InvoiceWithRelations) => {
    router.push(`/invoices/${invoice.id}`)
  }, [router])

  const handleStatusChange = useCallback(async (id: string, status: InvoiceStatus) => {
    await updateStatus.mutateAsync({ id, status })
  }, [updateStatus])

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id)
    try {
      await deleteInvoice.mutateAsync(id)
    } finally {
      setDeletingId(null)
    }
  }, [deleteInvoice])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold mb-2">Faktury</h2>
          <p className="text-lg text-gray-700">
            Správa a přehled vašich faktur
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          + Nová faktura
        </Button>
      </div>

      {/* Stats */}
      <InvoiceStatsCards stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <InvoiceFiltersCard
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        clients={clients}
      />

      {/* Invoice List */}
      {isLoading ? (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white p-6 shadow-md animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-20 mt-4" />
            </Card>
          ))}
        </div>
      ) : invoices.length === 0 ? (
        <Card className="bg-white p-8 shadow-md text-center">
          <p className="text-gray-600 mb-4">
            {Object.keys(filters).some(k => filters[k as keyof InvoiceFilters])
              ? 'Žádné faktury neodpovídají vybraným filtrům'
              : 'Zatím nemáte žádné faktury'
            }
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Vytvořit první fakturu
          </Button>
        </Card>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onView={handleView}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              isDeleting={deletingId === invoice.id}
              isUpdating={updateStatus.isPending}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <CreateInvoiceDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
