import type { InvoiceItem, InvoiceType } from '../types/invoice.types'

export function formatInvoiceItemDescription(
  item: Pick<InvoiceItem, 'description' | 'quantity' | 'unit'>,
  invoiceType: InvoiceType
): string {
  if (invoiceType !== 'linked' || item.unit !== 'položka' || item.quantity !== 1) {
    return item.description
  }

  // The September 2026 RPC appended this suffix to fixed-price work lines.
  // Hide it on historical invoices without rewriting their stored data.
  return item.description.replace(/ \(\d+ min při sazbě \d+(?:\.\d+)? Kč\/h\)$/, '')
}
