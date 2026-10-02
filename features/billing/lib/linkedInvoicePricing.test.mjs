import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateCustomInvoiceSubtotal } from './linkedInvoicePricing.ts'

test('custom subtotal sums rounded entry amounts without losing cents on short entries', () => {
  assert.equal(calculateCustomInvoiceSubtotal([
    { duration_minutes: 1, hourly_rate: 850 },
    { duration_minutes: 1, hourly_rate: 850 },
    { duration_minutes: 1, hourly_rate: 850 },
  ]), 42.51)
})

test('custom subtotal preserves different rates including a free entry', () => {
  assert.equal(calculateCustomInvoiceSubtotal([
    { duration_minutes: 159, hourly_rate: 850 },
    { duration_minutes: 1, hourly_rate: 900 },
    { duration_minutes: 30, hourly_rate: 0 },
  ]), 2267.50)
})
