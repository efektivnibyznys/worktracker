import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveInvoiceSupplier } from './invoiceSupplier.ts'

const settings = {
  company_name: 'Example s.r.o.',
  company_address: 'Ulice 1, Praha',
  company_ico: '12345678',
  bank_account: '123456789/0100',
}

test('payment details use the invoice account snapshot when present', () => {
  const result = resolveInvoiceSupplier({ bank_account: '987654321/0800' }, settings)
  assert.equal(result.bankAccount, '987654321/0800')
  assert.equal(result.companyName, 'Example s.r.o.')
})

test('legacy invoices use the configured account without substituting another person', () => {
  const result = resolveInvoiceSupplier({ bank_account: null }, settings)
  assert.equal(result.bankAccount, '123456789/0100')
})

test('missing issuer or bank details block a payable PDF', () => {
  for (const missing of ['company_name', 'company_address', 'company_ico', 'bank_account']) {
    const incomplete = { ...settings, [missing]: '   ' }
    assert.throws(() => resolveInvoiceSupplier({ bank_account: null }, incomplete), /Nastavení/)
  }
})
