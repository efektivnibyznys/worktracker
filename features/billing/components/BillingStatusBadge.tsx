'use client'

import { Badge } from '@/components/ui/badge'
import { BILLING_STATUS_CONFIG, type BillingStatus } from '../types/invoice.types'

interface BillingStatusBadgeProps {
  status: BillingStatus
  className?: string
}

/**
 * Badge component displaying entry billing status
 */
export function BillingStatusBadge({ status, className = '' }: BillingStatusBadgeProps) {
  const config = BILLING_STATUS_CONFIG[status]

  return (
    <Badge className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  )
}
