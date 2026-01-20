'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LinkedInvoiceForm } from './LinkedInvoiceForm'
import { StandaloneInvoiceForm } from './StandaloneInvoiceForm'
import { useInvoices } from '../hooks/useInvoices'
import type { CreateLinkedInvoiceInput, CreateStandaloneInvoiceInput } from '../types/invoice.types'
import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

type TabType = 'linked' | 'standalone'

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedEntryIds?: string[]
  preselectedEntries?: EntryWithRelations[]
  onSuccess?: () => void
}

/**
 * Dialog for creating a new invoice (linked or standalone)
 */
export function CreateInvoiceDialog({
  open,
  onOpenChange,
  preselectedEntryIds = [],
  preselectedEntries = [],
  onSuccess
}: CreateInvoiceDialogProps) {
  // Default to linked if entries are preselected
  const [activeTab, setActiveTab] = useState<TabType>(
    preselectedEntryIds.length > 0 ? 'linked' : 'linked'
  )

  const { createLinkedInvoice, createStandaloneInvoice } = useInvoices()

  const handleLinkedSubmit = async (input: CreateLinkedInvoiceInput) => {
    await createLinkedInvoice.mutateAsync(input)
    onOpenChange(false)
    onSuccess?.()
  }

  const handleStandaloneSubmit = async (input: CreateStandaloneInvoiceInput) => {
    await createStandaloneInvoice.mutateAsync(input)
    onOpenChange(false)
    onSuccess?.()
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[90vw] md:w-[75vw] md:max-w-[75vw] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Nová faktura
          </DialogTitle>
          <DialogDescription className="text-sm">
            Vytvořte fakturu z odpracovaných záznamů nebo s vlastními položkami
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex flex-col sm:flex-row gap-2 border-b pb-4">
          <Button
            type="button"
            variant={activeTab === 'linked' ? 'default' : 'outline'}
            onClick={() => setActiveTab('linked')}
            className="flex-1 text-sm sm:text-base"
          >
            Ze záznamů
          </Button>
          <Button
            type="button"
            variant={activeTab === 'standalone' ? 'default' : 'outline'}
            onClick={() => setActiveTab('standalone')}
            className="flex-1 text-sm sm:text-base"
          >
            Vlastní položky
          </Button>
        </div>

        {/* Tab content */}
        <div className="mt-4">
          {activeTab === 'linked' ? (
            <LinkedInvoiceForm
              onSubmit={handleLinkedSubmit}
              onCancel={handleCancel}
              isLoading={createLinkedInvoice.isPending}
              preselectedEntryIds={preselectedEntryIds}
              preselectedEntries={preselectedEntries}
            />
          ) : (
            <StandaloneInvoiceForm
              onSubmit={handleStandaloneSubmit}
              onCancel={handleCancel}
              isLoading={createStandaloneInvoice.isPending}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
