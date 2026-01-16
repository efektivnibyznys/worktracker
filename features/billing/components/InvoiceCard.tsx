'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InvoiceStatusBadge } from './InvoiceStatusBadge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import type { InvoiceWithRelations, InvoiceStatus } from '../types/invoice.types'

interface InvoiceCardProps {
  invoice: InvoiceWithRelations
  onView: (invoice: InvoiceWithRelations) => void
  onStatusChange: (id: string, status: InvoiceStatus) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
  isUpdating?: boolean
}

/**
 * Card component for displaying invoice in list view
 */
export function InvoiceCard({
  invoice,
  onView,
  onStatusChange,
  onDelete,
  isDeleting,
  isUpdating
}: InvoiceCardProps) {
  const isOverdue = invoice.status !== 'paid' &&
    invoice.status !== 'cancelled' &&
    new Date(invoice.due_date) < new Date()

  return (
    <Card className="bg-white p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="p-0 mb-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold mb-1">
              {invoice.invoice_number}
            </CardTitle>
            <CardDescription>
              {invoice.client?.name || 'Bez klienta'}
            </CardDescription>
          </div>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Vystaveno:</span>
            <span>{formatDate(invoice.issue_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Splatnost:</span>
            <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
              {formatDate(invoice.due_date)}
              {isOverdue && ' (po splatnosti)'}
            </span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t mt-2">
            <span className="text-gray-600">Celkem:</span>
            <span className="text-2xl font-bold">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>

          {/* Tags */}
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary">
              {invoice.invoice_type === 'linked' ? 'Ze záznamů' : 'Vlastní'}
            </Badge>
            {invoice.tax_rate > 0 && (
              <Badge variant="secondary">DPH {invoice.tax_rate}%</Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(invoice)}
          >
            Detail
          </Button>

          {/* Status transitions */}
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(invoice.id, 'issued')}
              disabled={isUpdating}
            >
              Vystavit
            </Button>
          )}

          {invoice.status === 'issued' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(invoice.id, 'sent')}
              disabled={isUpdating}
            >
              Odesláno
            </Button>
          )}

          {(invoice.status === 'issued' || invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 hover:text-green-700"
              onClick={() => onStatusChange(invoice.id, 'paid')}
              disabled={isUpdating}
            >
              Zaplaceno
            </Button>
          )}

          {/* Delete only for drafts */}
          {invoice.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => onDelete(invoice.id)}
              disabled={isDeleting}
            >
              {isDeleting ? 'Mazání...' : 'Smazat'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
