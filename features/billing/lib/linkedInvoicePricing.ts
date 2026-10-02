import type { EntryWithRelations } from '@/features/time-tracking/types/entry.types'

export function calculateCustomInvoiceSubtotal(
  entries: Pick<EntryWithRelations, 'duration_minutes' | 'hourly_rate'>[]
): number {
  // Rates are stored to two decimals. Sum rounded integer cents like the RPC.
  return entries.reduce((sum, entry) => sum + Math.round(
    entry.duration_minutes * Math.round(entry.hourly_rate * 100) / 60
  ), 0) / 100
}
