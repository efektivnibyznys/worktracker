import test from 'node:test'
import assert from 'node:assert/strict'
import { linkedInvoiceSchema } from './linkedInvoiceSchema.ts'

const form = { group_by: 'custom', issue_date: '2026-10-02', due_date: '2026-10-16' }

test('custom grouping accepts a multiline description for preselected entries without a form client', () => {
  const result = linkedInvoiceSchema.safeParse({
    ...form, custom_description: '  Vývoj webu\nÚpravy mobilní verze  ',
  })
  assert.equal(result.success, true)
  assert.equal(result.data.custom_description, 'Vývoj webu\nÚpravy mobilní verze')
})

test('custom grouping rejects missing or whitespace-only descriptions at the custom field', () => {
  for (const custom_description of [undefined, '', ' \n\t ']) {
    const result = linkedInvoiceSchema.safeParse({ ...form, custom_description })
    assert.equal(result.success, false)
    assert.ok(result.error.issues.some(issue => issue.path[0] === 'custom_description'))
  }
})

test('custom descriptions accept 1000 characters and reject longer text', () => {
  assert.equal(linkedInvoiceSchema.safeParse({ ...form, custom_description: 'a'.repeat(1000) }).success, true)
  assert.equal(linkedInvoiceSchema.safeParse({ ...form, custom_description: 'a'.repeat(1001) }).success, false)
})

test('existing grouping choices do not require a custom description', () => {
  for (const group_by of ['entry', 'phase', 'project', 'day']) {
    assert.equal(linkedInvoiceSchema.safeParse({ ...form, group_by }).success, true)
  }
})
