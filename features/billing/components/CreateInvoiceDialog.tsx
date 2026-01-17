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

type TabType = 'linked' | 'standalone'

interface CreateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedEntryIds?: string[]
  onSuccess?: () => void
}

/**
 * Dialog for creating a new invoice (linked or standalone)
 */
export function CreateInvoiceDialog({
  open,
  onOpenChange,
  preselectedEntryIds = [],
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
      <DialogContent className="!max-w-[95vw] md:!max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Nová faktura
          </DialogTitle>
          <DialogDescription>
            Vytvořte fakturu z odpracovaných záznamů nebo s vlastními položkami
          </DialogDescription>
        </DialogHeader>

        {/* Tab buttons */}
        <div className="flex gap-2 border-b pb-4">
          <Button
            type="button"
            variant={activeTab === 'linked' ? 'default' : 'outline'}
            onClick={() => setActiveTab('linked')}
            className="flex-1"
          >
            Ze záznamů
          </Button>
          <Button
            type="button"
            variant={activeTab === 'standalone' ? 'default' : 'outline'}
            onClick={() => setActiveTab('standalone')}
            className="flex-1"
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
