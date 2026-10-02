import test from 'node:test'
import assert from 'node:assert/strict'
import { formatInvoiceItemDescription } from './invoiceItemDescription.ts'

const item = {
  description: 'Úprava webu (159 min při sazbě 850.00 Kč/h)',
  quantity: 1,
  unit: 'položka',
}

test('historical linked invoice displays its work description without the generated billing suffix', () => {
  assert.equal(formatInvoiceItemDescription(item, 'linked'), 'Úprava webu')
})

test('standalone invoices retain manually entered duration and rate descriptions', () => {
  assert.equal(formatInvoiceItemDescription(item, 'standalone'), item.description)
})

test('hour-based legacy invoice items retain their original descriptions', () => {
  assert.equal(formatInvoiceItemDescription({ ...item, unit: 'hod' }, 'linked'), item.description)
})

test('work description parentheses and billing details inside the text stay intact', () => {
  assert.equal(formatInvoiceItemDescription({
    ...item,
    description: 'Úprava webu (mobilní verze) (159 min při sazbě 850.00 Kč/h)',
  }, 'linked'), 'Úprava webu (mobilní verze)')
  const description = 'Konzultace (60 min při sazbě 0.00 Kč/h) a úprava webu'
  assert.equal(formatInvoiceItemDescription({ ...item, description }, 'linked'), description)
})

test('new clean descriptions remain unchanged', () => {
  assert.equal(formatInvoiceItemDescription({ ...item, description: 'Realizace webu' }, 'linked'), 'Realizace webu')
})

test('custom summary descriptions retain text resembling the historical generated suffix', () => {
  assert.equal(formatInvoiceItemDescription({ ...item, unit: 'ks' }, 'linked'), item.description)
})
