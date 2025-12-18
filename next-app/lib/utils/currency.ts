/**
 * Format number to Czech currency format
 */
export function formatCurrency(amount: number, currency: string = 'Kč'): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return `${formatted} ${currency}`
}
