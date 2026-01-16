'use client'

import { Badge } from '@/components/ui/badge'
import { INVOICE_STATUS_CONFIG, type InvoiceStatus } from '../types/invoice.types'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

/**
 * Badge component displaying invoice status with appropriate styling
 */
export function InvoiceStatusBadge({ status, className = '' }: InvoiceStatusBadgeProps) {
  const config = INVOICE_STATUS_CONFIG[status]

  return (
    <Badge className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
